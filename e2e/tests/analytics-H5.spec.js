const {test,expect}=require('../lib/fixtures');
const {billedCustomer,finalize,addTransaction,routes,choose}=require('../lib/ui');
const {rows,sql,literal}=require('../lib/db');
const {saveDownload}=require('../lib/download');
const {randomUUID}=require('crypto');
const fs=require('fs');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Phoenix',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const entity=()=>rows('SELECT billing_entity_id FROM billing_entities WHERE account_id=9001 AND is_default')[0].billing_entity_id;
async function superAdmin(page,run){const old=rows('SELECT access_level FROM users WHERE account_id=9001 AND user_id=90013')[0].access_level;try{sql("UPDATE users SET access_level='super admin' WHERE account_id=9001 AND user_id=90013");await page.evaluate(()=>sessionStorage.setItem('accessLevel','super admin'));await run();}finally{sql(`UPDATE users SET access_level=${literal(old)} WHERE account_id=9001 AND user_id=90013`);}}
async function api(page,path,body){const r=body===undefined?await page.request.get('http://localhost:8003'+path):await page.request.post('http://localhost:8003'+path,{data:body,headers:{'Idempotency-Key':randomUUID()}});expect(r.status(),await r.text()).toBe(200);return r.json();}
async function business(page,prefix){return (await api(page,'/billing-entities',{name:prefix+' No data',legal_name:prefix+' No data',invoice_prefix:'HFIVE',reason:'Synthetic analytics filter coverage'})).entity.billing_entity_id;}
async function select(page,id){await page.getByRole('combobox',{name:/Billing business/}).selectOption(id?String(id):'');}
async function capture(page,action){const response=page.waitForResponse(r=>r.url().includes('/analytics/billingPerformance/') && !r.url().includes('/export'));await action();const r=await response;expect(r.status()).toBe(200);return (await r.json()).billingPerformance;}
test('issued amounts, WIP, applied receipts, writeoffs and memo credits stay distinct in the screen and downloads',async({page,prefix},info)=>{
 const c=await billedCustomer(page,prefix);await finalize(page,c);await addTransaction(page,c);const e=entity(),invoice=rows(`SELECT customer_invoice_id FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL`)[0].customer_invoice_id;
 const state=await api(page,`/payments/open-obligations?customerId=${c.id}&entityId=${e}`);await api(page,'/payments/receipts',{customerId:c.id,entityId:e,amount:15,date:today(),method:'check',reference:prefix,ledgerFingerprint:state.ledgerFingerprint,allocations:[{obligationId:state.obligations[0].obligation_id,amount:15}]});
 await api(page,'/writeOffs/createWriteOffs/9001/90013',{writeOff:{customerID:c.id,entityId:e,customerInvoiceID:invoice,unitCost:2,selectedDate:today(),writeoffReason:'Synthetic bad debt'}});
 const preview=await api(page,`/invoices/${invoice}/corrections`);await api(page,`/invoices/${invoice}/credit-memos`,{entityId:e,amount:3,date:today(),reason:'Synthetic price correction',allowCreditExcess:true,ledgerFingerprint:preview.ledgerFingerprint});
 const before=rows(`SELECT transaction_id,total_transaction,cost_rate_snapshot FROM customer_transactions WHERE account_id=9001 AND customer_id=${c.id} ORDER BY transaction_id`);
 await superAdmin(page,async()=>{
  const report=await capture(page,()=>page.goto('/reports/billing-performance'));await expect(page).toHaveURL(/\/reports\/billing-performance$/);const cohort=report.cohorts.find(r=>r.invoice_id===invoice);expect(cohort).toMatchObject({net_billed:19.5,collected:15,writeoffs:2,cost_status:'recorded'});
  await expect(page.getByRole('heading',{name:'Billing performance',exact:true})).toBeVisible();for(const label of ['Work entered','Unbilled WIP','Net billed','Applied receipts','Cohort margin'])await expect(page.getByText(label,{exact:true}).first()).toBeVisible();
  const row=page.locator(`[role="row"][data-id="${invoice}"]`).filter({has:page.locator('[data-field="invoice_number"]')}).first();await expect(row).toContainText('$19.50');await expect(row).toContainText('$15.00');await expect(page.getByText('Cost basis: '+report.totals.cost_status,{exact:true})).toBeVisible();
  for(const format of ['CSV','PDF']){const promise=page.waitForEvent('download');await page.getByRole('button',{name:format,exact:true}).click();const file=await saveDownload(await promise);expect(fs.statSync(file).size).toBeGreaterThan(500);if(format==='CSV'){const text=fs.readFileSync(file,'utf8');expect(text).toContain('Applied receipts net of reversals');expect(text).toContain('Worked for / billed by attribution');expect(text).toContain(String(cohort.invoice_number));}else expect(fs.readFileSync(file).subarray(0,4).toString()).toBe('%PDF');}
  await page.screenshot({path:info.outputPath('billing-performance.png'),fullPage:true});
 });expect(rows(`SELECT transaction_id,total_transaction,cost_rate_snapshot FROM customer_transactions WHERE account_id=9001 AND customer_id=${c.id} ORDER BY transaction_id`)).toEqual(before);
});
test('all six analytics pages accept a no-data business and return to totals, including an inactive business',async({page,prefix})=>{
 await page.goto('/');const e=await business(page,prefix);sql(`UPDATE billing_entities SET active=false WHERE account_id=9001 AND billing_entity_id=${e}`);
 await superAdmin(page,async()=>{for(const path of ['billingPerformance','clientRates','timeAllocation','wipAging','jobBudgets','taxSeasonCapacity']){
  await page.goto(require('../../src/Routes/legacyRoutes.json')['/analytics/'+path]);await expect(page.getByRole('combobox',{name:/Billing business/})).toBeEnabled();const response=page.waitForResponse(r=>r.url().includes('/analytics/'+path+'/') && new URL(r.url()).searchParams.get('entityId')===String(e));await select(page,e);const r=await response;expect(r.status()).toBe(200);await expect(page.locator('[role="alert"].MuiAlert-standardError')).toHaveCount(0);if(path==='billingPerformance'){expect((await r.json()).billingPerformance.totals.net_billed).toBe(0);await expect(page.getByText('No activity in this period.',{exact:true})).toBeVisible();}
  const all=page.waitForResponse(r=>r.url().includes('/analytics/'+path+'/') && !new URL(r.url()).searchParams.has('entityId'));await select(page,null);expect((await all).status()).toBe(200);
 }});
});
test('invalid dates, an empty period and a failed report or export are recoverable without ledger writes',async({page,prefix})=>{
 const c=await billedCustomer(page,prefix),before=rows(`SELECT * FROM customer_transactions WHERE account_id=9001 AND customer_id=${c.id}`);
 await superAdmin(page,async()=>{
  await capture(page,()=>page.goto('/reports/billing-performance'));await page.getByLabel('Start date',{exact:true}).fill('2099-01-01');await expect(page.getByText('Choose valid dates with start on or before end.')).toBeVisible();await expect(page.getByRole('button',{name:'CSV',exact:true})).toBeDisabled();
  await page.getByLabel('Start date',{exact:true}).fill('1999-01-01');await page.getByLabel('End date',{exact:true}).fill('1999-12-31');await capture(page,()=>page.getByLabel('As of',{exact:true}).fill('1999-12-31'));await expect(page.getByText('No activity in this period.',{exact:true})).toBeVisible();
  await page.route('**/analytics/billingPerformance/**',r=>r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({status:500,message:'Synthetic report failure'})}),{times:1});await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByText('Synthetic report failure',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'CSV',exact:true})).toBeDisabled();await capture(page,()=>page.getByRole('button',{name:'Refresh',exact:true}).click());
  await page.route('**/analytics/billingPerformance/**/export?*',r=>r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({status:500,message:'Synthetic export failure'})}),{times:1});await page.getByRole('button',{name:'CSV',exact:true}).click();await expect(page.locator('[role="alert"].MuiAlert-standardError')).toBeVisible();await expect(page.getByRole('button',{name:'CSV',exact:true})).toBeEnabled();
 });expect(rows(`SELECT * FROM customer_transactions WHERE account_id=9001 AND customer_id=${c.id}`)).toEqual(before);
});
test('the year-end packet contains the reconciled report, PDF and explicit basis',async({page})=>{
 await page.goto('/');await superAdmin(page,async()=>{await page.goto('/reports/time-allocation');await expect(page.getByText('Work entered value',{exact:true})).toBeVisible();const promise=page.waitForEvent('download');await page.getByRole('button',{name:'Year-End Packet',exact:true}).click();const file=await saveDownload(await promise),zip=await require('../../../DS2_Backend/node_modules/unzipper').Open.file(file);expect(zip.files.map(f=>f.path)).toEqual(expect.arrayContaining([`billing_performance_${Number(today().slice(0,4))-1}.csv`,`billing_performance_${Number(today().slice(0,4))-1}.pdf`,'reporting_basis.json']));const basis=JSON.parse((await zip.files.find(f=>f.path==='reporting_basis.json').buffer()).toString());expect(basis.version).toBe(2);});
});
test('changing the employee requires a reason and captures the replacement rate before issue',async({page,prefix})=>{
 const c=await billedCustomer(page,prefix),w=rows(`SELECT * FROM customer_transactions WHERE account_id=9001 AND customer_id=${c.id}`)[0];
 await page.goto(routes.transactions);await page.getByPlaceholder('Search transactions').fill(prefix);await page.locator(`[role="row"][data-id="${w.transaction_id}"]`).click();
 // Transaction details expose editing through their normal Edit action.
 if(!page.url().endsWith('editTransaction'))await page.getByRole('tab',{name:'Edit Transaction',exact:true}).click();
 await choose(page,page,'Select Team Member','Admin Person');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByText('Enter a reason for changing the employee.')).toBeVisible();expect(rows(`SELECT logged_for_user_id FROM customer_transactions WHERE account_id=9001 AND transaction_id=${w.transaction_id}`)[0].logged_for_user_id).toBe(w.logged_for_user_id);
 await page.getByLabel('Reason for employee change').fill('Correct employee attribution');const response=page.waitForResponse(r=>r.url().includes('/transactions/updateTransaction/'));await page.getByRole('button',{name:'Submit',exact:true}).click();expect((await response).status()).toBe(200);const changed=rows(`SELECT logged_for_user_id,cost_rate_snapshot FROM customer_transactions WHERE account_id=9001 AND transaction_id=${w.transaction_id}`)[0];expect(changed.logged_for_user_id).toBe(90013);expect(Number(changed.cost_rate_snapshot)).toBe(Number(rows('SELECT cost_rate FROM users WHERE account_id=9001 AND user_id=90013')[0].cost_rate));
});

test('analytics exclusions persist for the fixture account without adopting another account choice',async({page})=>{
 await page.goto('/');await superAdmin(page,async()=>{
  await page.evaluate(()=>{sessionStorage.setItem('ds2_analytics_exclude','[900101]');sessionStorage.setItem('ds2_analytics_exclude_700','[900101]');sessionStorage.setItem('ds2_analytics_exclude_9001','[]');});
  const result=await capture(page,()=>page.goto('/reports/billing-performance'));expect(result.version).toBe(2);
  const field=page.getByRole('combobox',{name:'Filter out (exclude)'});await field.fill('Acme');await field.hover();await expect(page.getByRole('tooltip').filter({hasText:'Customers excluded from every analytics page.'})).toBeVisible();await page.getByRole('option').filter({hasText:'Acme Corp'}).click();await page.keyboard.press('Escape');
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('ds2_analytics_exclude_9001'))).toBe('[900101]');
  const next=page.waitForResponse(r=>r.url().includes('/analytics/timeAllocation/') && new URL(r.url()).searchParams.get('exclude')==='900101');await page.goto('/reports/time-allocation');expect((await next).status()).toBe(200);expect(await page.evaluate(()=>sessionStorage.getItem('ds2_analytics_exclude_700'))).toBe('[900101]');
 });
});

test('held-work corrections require a reason and use corrected actual minutes and employee cost',async({page,prefix})=>{
 const c=await billedCustomer(page,prefix),e=entity();
 const staff=rows('SELECT user_id,display_name,cost_rate FROM users WHERE account_id=9001 AND user_id IN (90011,90012) ORDER BY user_id'),target=staff[1];
 try{
  sql('UPDATE users SET cost_rate=CASE user_id WHEN 90011 THEN 30 ELSE 40 END WHERE account_id=9001 AND user_id IN (90011,90012)');
  const trackerId=Number(sql(`INSERT INTO timesheet_entries(account_id,user_id,matched_user_id,employee_name,timesheet_name,time_tracker_start_date,time_tracker_end_date,date,duration,notes,category,company_name,entity,billing_entity_id,suggested_customer_id,hold_reason,is_processed,is_deleted) SELECT 9001,90013,90011,${literal(staff[0].display_name)},${literal(prefix+'.xlsx')},CURRENT_DATE,CURRENT_DATE,CURRENT_DATE,120,${literal(prefix+' corrected work')},'Tax Return Preparation',${literal(c.name)},name,billing_entity_id,${c.id},'low_ai_confidence',false,false FROM billing_entities WHERE account_id=9001 AND billing_entity_id=${e} RETURNING timesheet_entry_id`));
  const tracker={timesheet_entry_id:trackerId};
  await page.goto('/work/review');await page.getByLabel('Notes contains',{exact:true}).fill(prefix);await page.getByRole('row').filter({hasText:prefix+' corrected work'}).getByRole('button',{name:'Edit',exact:true}).click();
  const d=page.getByRole('dialog');await expect(d.getByText('Review held entry',{exact:true})).toBeVisible();await choose(page,d,'Select Customer',c.name);await choose(page,d,'Select Job','1040 Individual Return');await choose(page,d,'Select Team Member',target.display_name);await choose(page,d,'General Work Description','Tax Return Preparation');await d.getByLabel('Time (hours)',{exact:true}).fill('1.5');
  const before=rows(`SELECT * FROM timesheet_entries WHERE account_id=9001 AND timesheet_entry_id=${tracker.timesheet_entry_id}`);
  await d.getByRole('button',{name:'Manual Submission',exact:true}).click();await expect(d.getByText('Enter a reason for changing the employee.',{exact:true})).toBeVisible();expect(rows(`SELECT * FROM timesheet_entries WHERE account_id=9001 AND timesheet_entry_id=${tracker.timesheet_entry_id}`)).toEqual(before);expect(rows(`SELECT * FROM customer_transactions WHERE account_id=9001 AND source_timesheet_entry_id=${tracker.timesheet_entry_id}`)).toHaveLength(0);
  await d.getByLabel(/Reason for employee change/).fill('Correct original tracker employee and time');const done=page.waitForResponse(r=>r.url().includes(`/billing-review/${tracker.timesheet_entry_id}/`) && r.request().method()==='PUT');await d.getByRole('button',{name:'Manual Submission',exact:true}).click();expect((await done).status()).toBe(200);await expect(d).toHaveCount(0);
  const row=rows(`SELECT actual_duration_minutes,cost_rate_snapshot,logged_for_user_id FROM customer_transactions WHERE account_id=9001 AND source_timesheet_entry_id=${tracker.timesheet_entry_id}`)[0];expect(Number(row.actual_duration_minutes)).toBe(90);expect(Number(row.cost_rate_snapshot)).toBe(40);expect(row.logged_for_user_id).toBe(target.user_id);
  const audit=rows(`SELECT reason,actor_user_id FROM audit_events WHERE account_id=9001 AND entity='timesheet_entries' AND entity_id=${literal(String(tracker.timesheet_entry_id))} ORDER BY event_id DESC LIMIT 1`)[0];expect(audit).toEqual({reason:'Correct original tracker employee and time',actor_user_id:90013});
 }finally{for(const u of staff)sql(`UPDATE users SET cost_rate=${u.cost_rate===null?'NULL':Number(u.cost_rate)} WHERE account_id=9001 AND user_id=${u.user_id}`);}
});
