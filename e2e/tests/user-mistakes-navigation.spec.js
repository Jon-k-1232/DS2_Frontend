require('../lib/scenario-safety').assertLocalUI();
const { test,expect }=require('../lib/fixtures');
const { createCustomer,createJob,choose,submit,closeForm,routes }=require('../lib/ui');
const { prepare,financial,types,saved }=require('../lib/mistakes');
const { rows }=require('../lib/db');
const { authenticate }=require('../lib/auth');

test('pagination and no-match filters reset correctly; audit history pages preserve the $520 balance',async({page,prefix})=>{
 test.setTimeout(240000);
 const c=await createCustomer(page,prefix);await createJob(page,c);
 for(let n=0;n<26;n++){
  const d=await prepare(page,c,'charge');await d.getByLabel('Work Completed On Job').fill(`${prefix} entry ${n+1}`);
  await submit(page,d,types.charge.endpoint);await closeForm(page);
 }
 expect(saved('charge',c)).toHaveLength(26);expect(saved('charge',c).reduce((n,r)=>n+Number(r.total_transaction),0)).toBe(520);
 const before=financial(c);
 await page.getByPlaceholder('Search transactions').fill(prefix);
 await expect(page.getByText('1–20 of 26',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Go to next page',exact:true}).click();
 await expect(page.getByText('21–26 of 26',{exact:true})).toBeVisible();
 await page.getByPlaceholder('Search transactions').fill(`${prefix} no-such-entry`);
 await expect(page.getByText('No rows',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Go to previous page',exact:true})).toBeDisabled();
 await page.getByPlaceholder('Search transactions').fill(prefix);
 await expect(page.getByText('1–20 of 26',{exact:true})).toBeVisible();
 await page.goto(`/customers/customersList/customerProfile/${c.id}/auditRecord`);
 await expect(page.getByRole('table',{name:'Account history'})).toBeVisible();
 await expect(page.getByText(/Current \$520.00/)).toBeVisible();
 await page.getByRole('button',{name:'Next history',exact:true}).click();
 await expect(page.getByRole('button',{name:'Previous history',exact:true})).toBeEnabled();
 await expect(page.getByText(/Current \$520.00/)).toBeVisible();
 await page.getByLabel('From',{exact:true}).fill('1999-08-31');await page.getByLabel('Through',{exact:true}).fill('1999-09-01');await page.getByRole('button',{name:'Apply dates',exact:true}).click();
 await expect(page.getByText('No history in this date range.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Previous history',exact:true})).toBeDisabled();
 expect(financial(c)).toEqual(before);
});

test('retainer adjustments and stale refunds: $25 + $5 - $10 = $20; a stale $25 refund refuses',async({page,browser,prefix})=>{
 const c=await createCustomer(page,prefix);const d=await prepare(page,c,'retainer');await submit(page,d,types.retainer.endpoint);await closeForm(page);
 const route=`http://localhost:3003/customers/customersList/customerProfile/${c.id}/retainersAndPrePayments`;
 await page.goto(route);await expect(page.getByText('Available credit: $25.00',{exact:true})).toBeVisible();
 const amount=page.getByLabel('Amount',{exact:true});const reason=page.getByRole('textbox',{name:/^Reason/});
 for(const value of ['garbage','-1','0','1.001']){
  await amount.fill(value);await expect(page.getByRole('button',{name:'Review event',exact:true})).toBeDisabled();
  await expect(page.getByText(/\$NaN/)).toHaveCount(0);
 }
 await amount.fill('25');await page.getByRole('textbox',{name:/^Method/}).fill('Check');await page.getByRole('textbox',{name:/^Reference/}).fill(prefix);await reason.fill('Refund stale available amount');
 const other=await browser.newContext();await authenticate(other,'admin');const p=await other.newPage();
 try{
  await p.goto(route);await expect(p.getByText('Available credit: $25.00',{exact:true})).toBeVisible();
  await p.getByLabel('Event type',{exact:true}).click();await p.getByRole('option',{name:'Adjustment',exact:true}).click();
  await p.getByLabel('Direction',{exact:true}).click();await p.getByRole('option',{name:'Increase credit',exact:true}).click();
  await p.getByLabel('Amount',{exact:true}).fill('5');await p.getByRole('textbox',{name:/^Reason/}).fill('Correct local receipt');
  await p.getByRole('button',{name:'Review event',exact:true}).click();await p.getByRole('button',{name:'Confirm record event',exact:true}).click();await expect(p.getByText('Available credit: $30.00',{exact:true})).toBeVisible();
  // The refreshed profile starts a fresh event form after a saved event.
  await p.getByLabel('Event type',{exact:true}).click();await p.getByRole('option',{name:'Adjustment',exact:true}).click();
  await p.getByLabel('Direction',{exact:true}).click();await p.getByRole('option',{name:'Decrease credit',exact:true}).click();
  await p.getByLabel('Amount',{exact:true}).fill('10');await p.getByRole('textbox',{name:/^Reason/}).fill('Correct receipt downward');
  await p.getByRole('button',{name:'Review event',exact:true}).click();await p.getByRole('button',{name:'Confirm record event',exact:true}).click();await expect(p.getByText('Available credit: $20.00',{exact:true})).toBeVisible();
 }finally{await other.close();}
 const before=financial(c);
 await page.getByRole('button',{name:'Review event',exact:true}).click();await page.getByRole('button',{name:'Confirm record event',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText(/available|funds|exceed/i);
 expect(financial(c)).toEqual(before);
 expect(rows(`SELECT amount,available_after FROM retainer_events WHERE account_id=9001 AND customer_id=${c.id} ORDER BY event_id`).map(r=>[Number(r.amount),Number(r.available_after)])).toEqual([[5,30],[10,20]]);
});
