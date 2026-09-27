const {test,expect}=require('../lib/fixtures');
const {billedCustomer,createCustomer,createJob}=require('../lib/ui');
const {financial,saved}=require('../lib/mistakes');
const {rows}=require('../lib/db');

test('remote inline billing review changes client with scoped jobs and preserves money on lookup and save failures',async({page,prefix})=>{
 const source=await billedCustomer(page,prefix+'_Source');
 const target=await createCustomer(page,prefix+'_Target');await createJob(page,target);
 const [work]=saved('time',source),before=[financial(source),financial(target)];
 await page.route('**/initialData/initialBlob/**',async route=>{
  const response=await route.fetch(),json=await response.json();
  Object.assign(json.customersList.activeCustomerData,{activeCustomers:[],remote:true,totalCount:1001});
  await route.fulfill({response,json});
 });
 let failLookup=true,failedReads=0;
 await page.route('**/customer/lookup/9001/90013?**',route=>{
  if(failLookup && new URL(route.request().url()).searchParams.get('search')===target.name){failedReads++;return route.fulfill({status:500,json:{status:500,message:'Synthetic client search failure'}});}
  return route.fallback();
 });
 await page.goto('/work/review');await page.getByRole('tab',{name:'Processed & not billed',exact:true}).click();
 await page.getByRole('checkbox',{name:'AI auto-inserted only (hide everything else)',exact:true}).uncheck();
 const filter=page.getByRole('combobox',{name:'Customer',exact:true});await filter.fill(source.name);
 await page.getByRole('option',{name:source.name,exact:true}).click();
 const row=page.getByRole('row').filter({hasText:source.name}).filter({has:page.getByRole('button',{name:'Edit',exact:true})});
 await expect(row).toHaveCount(1);await row.getByRole('button',{name:'Edit',exact:true}).click();
 const client=page.getByRole('combobox',{name:'Client for transaction',exact:true}),job=page.getByRole('combobox',{name:'Select Job',exact:true});
 await expect(client).toHaveValue(source.name);await client.fill(target.name);
 await expect(page.getByRole('cell').filter({has:client}).getByText('Synthetic client search failure',{exact:true})).toBeVisible();expect(failedReads).toBeGreaterThan(0);
 expect([financial(source),financial(target)]).toEqual(before);
 failLookup=false;await client.fill(target.prefix);await client.fill(target.name);
 const jobs=page.waitForResponse(r=>r.url().includes(`/jobs/getActiveCustomerJobs/9001/90013/${target.id}?`));
 await page.getByRole('option',{name:target.name,exact:true}).click();
 const jobRead=await jobs;expect(new URL(jobRead.url()).searchParams.get('entityId')).toBe(String(work.billing_entity_id));expect(new URL(jobRead.url()).searchParams.get('search')).toBe('');
 await expect(job).toHaveValue('');await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Select a job for this transaction before saving.');
 expect([financial(source),financial(target)]).toEqual(before);
 await job.fill('1040 Individual Return');await page.getByRole('option',{name:'1040 Individual Return',exact:true}).click();
 let failSave=true,attempts=0;
 const update=`**/billing-review/transaction/${work.transaction_id}/9001/90013`;
 await page.route(update,route=>{attempts++;return failSave?route.abort('failed'):route.fallback();});
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText(/Network Error/i);expect(attempts).toBe(1);
 expect([financial(source),financial(target)]).toEqual(before);await expect(client).toHaveValue(target.name);
 failSave=false;const savedResponse=page.waitForResponse(r=>r.request().method()==='PUT' && r.url().includes(`/billing-review/transaction/${work.transaction_id}/`));
 await page.getByRole('button',{name:'Save',exact:true}).click();expect((await savedResponse).status()).toBe(200);expect(attempts).toBe(2);
 const changed=rows(`SELECT customer_id,total_transaction,billing_entity_id,customer_job_id FROM customer_transactions WHERE account_id=9001 AND transaction_id=${work.transaction_id}`)[0];
 expect(changed.customer_id).toBe(target.id);expect(Number(changed.total_transaction)).toBe(22.5);expect(changed.billing_entity_id).toBe(work.billing_entity_id);expect(changed.customer_job_id).not.toBe(work.customer_job_id);
 expect(saved('time',source)).toHaveLength(0);expect(saved('time',target)).toHaveLength(1);
});
