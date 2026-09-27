const {test,expect}=require('@playwright/test');
const {authenticate}=require('../lib/auth');
const api='http://localhost:8003';
async function remoteDirectory(page){
 await page.route('**/initialData/initialBlob/**',async route=>{
  const response=await route.fetch();const json=await response.json();
  // Exercise the >1000 directory mode with real account-scale lookup data.
  // No account-1 data is inserted or changed; every mutation is blocked.
  Object.assign(json.customersList.activeCustomerData,{activeCustomers:[],remote:true,totalCount:1001});
  await route.fulfill({response,json});
 });
}
test('remote client and job type-ahead selects real identities and clears stale client jobs',async({page,context})=>{
 await authenticate(context,'readonly');await remoteDirectory(page);
 const getClient=async id=>(await (await page.request.get(`${api}/customer/lookup/1/21?customerId=${id}`)).json()).customers[0];
 const first=await getClient(6),second=await getClient(5);
 await page.goto('/work/entries?entry=time');const form=page.getByRole('dialog');
 const client=form.getByRole('combobox',{name:'Select Customer',exact:true});
 const job=form.getByRole('combobox',{name:'Select Job',exact:true});
 await client.fill(first.display_name);
 const loaded=page.waitForResponse(r=>r.url().includes('/jobs/getActiveCustomerJobs/1/21/6?'));
 await page.getByRole('option',{name:first.display_name,exact:true}).click();
 const choices=(await (await loaded).json()).activeCustomerJobData.activeCustomerJobs;
 expect(choices.length).toBeGreaterThan(0);expect(choices.length).toBeLessThanOrEqual(100);
 const choice=choices[0];const searched=page.waitForResponse(r=>r.url().includes('/jobs/getActiveCustomerJobs/1/21/6?')&&new URL(r.url()).searchParams.get('search')===choice.job_description);
 await job.fill(choice.job_description);await searched;
 await page.getByRole('option',{name:choice.job_description,exact:true}).first().click();await expect(job).toHaveValue(choice.job_description);
 await client.fill(second.display_name);
 const switched=page.waitForResponse(r=>r.url().includes('/jobs/getActiveCustomerJobs/1/21/5?'));
 await page.getByRole('option',{name:second.display_name,exact:true}).click();expect(new URL((await switched).url()).searchParams.get('search')).toBe('');await expect(job).toHaveValue('');
 await page.goto('/payments/receive');
 const picker=page.getByRole('combobox',{name:'Client',exact:true});await picker.fill(first.display_name);
 await page.getByRole('option',{name:first.display_name,exact:true}).click();await expect(picker).toHaveValue(first.display_name);
});
test('Jobs pages and searches on the server, and recovers from a failed read',async({page,context})=>{
 await authenticate(context,'readonly');let fail=true;const queries=[];
 await page.route('**/jobs/getJobs/**',async route=>{
  queries.push(new URL(route.request().url()).searchParams.toString());
  if(fail){return route.fulfill({status:500,json:{status:500,message:'Temporary lookup failure'}});}
  return route.continue();
 });
 await page.goto('/work/jobs');await page.waitForLoadState('networkidle');await expect(page.getByRole('alert')).toContainText('Temporary lookup failure');
 fail=false;const recovered=page.waitForResponse(r=>r.url().includes('/jobs/getJobs/')&&r.status()===200);await page.getByRole('button',{name:'Try again'}).click();
 const term=(await (await recovered).json()).accountJobsList.activeJobData.activeJobs[0].job_description;
 await expect(page.getByRole('grid').locator('[data-id]').first()).toBeVisible();
 const next=page.waitForResponse(r=>r.url().includes('/jobs/getJobs/')&&new URL(r.url()).searchParams.get('page')==='2');
 await page.getByRole('button',{name:'Go to next page'}).click();await next;
 const search=page.waitForResponse(r=>r.url().includes('/jobs/getJobs/')&&new URL(r.url()).searchParams.get('search')===term);
 await page.getByRole('textbox',{name:'Search jobs'}).fill(term);const body=await (await search).json();
 expect(body.accountJobsList.activeJobData.pagination.page).toBe(1);expect(body.accountJobsList.activeJobData.activeJobs.length).toBeGreaterThan(0);expect(body.accountJobsList.activeJobData.activeJobs.length).toBeLessThanOrEqual(20);
 expect(queries.some(q=>q.includes('page=2'))).toBeTruthy();
 await page.getByRole('button',{name:'Export',exact:true}).click();
 await expect(page.getByRole('menuitem',{name:'Print this page',exact:true})).toBeVisible();
 const saved=page.waitForEvent('download');await page.getByRole('menuitem',{name:'Export this page',exact:true}).click();
 const download=await saved;expect(await download.failure()).toBeNull();const stream=await download.createReadStream();let csv='';for await(const chunk of stream)csv+=chunk.toString();
 expect(csv).toContain(body.accountJobsList.activeJobData.activeJobs[0].job_description);
});
