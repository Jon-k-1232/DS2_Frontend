const {test,expect}=require('../lib/fixtures');
const {billedCustomer,createCustomer,finalize}=require('../lib/ui');
const {rows}=require('../lib/db');
const {randomUUID}=require('crypto');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Phoenix',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const entity=()=>rows('SELECT billing_entity_id FROM billing_entities WHERE account_id=9001 AND is_default')[0].billing_entity_id;
const evidence=c=>rows(`SELECT event_id,event_hash FROM audit_events WHERE account_id=9001 AND customer_id=${c.id} ORDER BY event_id`);
test('quote register shows the client, service and creator instead of raw identifiers',async({page,prefix})=>{
 const c=await billedCustomer(page,prefix),j=rows(`SELECT customer_job_id FROM customer_jobs WHERE account_id=9001 AND customer_id=${c.id} AND parent_job_id IS NULL`)[0];
 const posted=await page.request.post('http://localhost:8003/quotes/createQuote',{data:{entityId:entity(),quote:{customer_id:c.id,customer_job_id:j.customer_job_id,amount_quoted:125,is_quote_active:true,notes:prefix}}});
 expect((await posted.json()).status).toBe(200);const before=evidence(c);
 await page.goto('/billing/quotes');const row=page.getByRole('row').filter({hasText:c.name});await expect(row).toBeVisible();await expect(row).toContainText('1040 Individual Return');await expect(row).toContainText('Admin Person');
 await expect(page.getByRole('columnheader').filter({hasText:/\bId\b|\bID\b/})).toHaveCount(0);expect(evidence(c)).toEqual(before);
});
async function received(page,c,amount=10){
 const e=entity(),state=await (await page.request.get(`http://localhost:8003/payments/open-obligations?customerId=${c.id}&entityId=${e}`)).json();
 const r=await page.request.post('http://localhost:8003/payments/receipts',{data:{customerId:c.id,entityId:e,amount,date:today(),method:'check',reference:'H8-'+c.id,allocations:[],reason:'Hold for future work',ledgerFingerprint:state.ledgerFingerprint},headers:{'Idempotency-Key':randomUUID()}});expect(r.ok(),await r.text()).toBe(true);return r.json();
}
async function receiveForm(page,c){
 await page.goto(`/payments/receive?customerId=${c.id}&entityId=${entity()}`);await expect(page.getByText('No open invoices. The payment will remain as credit.')).toBeVisible();
 await page.getByLabel('Amount received').fill('50');await page.getByLabel('Check / payment reference').fill('H8-NETWORK-'+c.id);
 await page.getByRole('button',{name:'Review payment',exact:true}).click();
}
for(const failure of ['network','server'])test(`Receive payment survives a ${failure} failure without writing and retry posts once`,async({page,prefix})=>{
 const c=await createCustomer(page,prefix);await receiveForm(page,c);const before=evidence(c);
 const fail=route=>failure==='network'?route.abort('failed'):route.fulfill({status:500,json:{message:'Temporary receipt service failure'}});
 await page.route('**/payments/receipts',fail,{times:1});await page.getByRole('button',{name:'Record payment',exact:true}).click();
 await expect(page.locator('[role="alert"].MuiAlert-standardError')).toBeVisible();await expect(page.getByLabel('Amount received')).toHaveValue('50');expect(evidence(c)).toEqual(before);
 await expect(page.getByLabel('Check / payment reference')).toHaveValue('H8-NETWORK-'+c.id);
 // Reviewing again keeps the same request key until its outcome is known.
 if(await page.getByRole('button',{name:'Review payment',exact:true}).count())await page.getByRole('button',{name:'Review payment',exact:true}).click();
 await page.getByRole('button',{name:'Record payment',exact:true}).click();await expect(page.getByRole('link',{name:'View receipt'})).toBeVisible();
 expect(rows(`SELECT amount FROM payment_receipts WHERE account_id=9001 AND customer_id=${c.id}`)).toEqual([{amount:50}]);
});
test('lost receipt response can be retried without recording a second check',async({page,prefix})=>{
 const c=await createCustomer(page,prefix);await receiveForm(page,c);
 await page.route('**/payments/receipts',async route=>{const response=await route.fetch();expect(response.ok()).toBe(true);await route.abort('failed');},{times:1});
 await page.getByRole('button',{name:'Record payment',exact:true}).click();await expect(page.locator('[role="alert"].MuiAlert-standardError')).toBeVisible();
 const committed=evidence(c);expect(rows(`SELECT receipt_id FROM payment_receipts WHERE account_id=9001 AND customer_id=${c.id}`)).toHaveLength(1);
 if(await page.getByRole('button',{name:'Review payment',exact:true}).count())await page.getByRole('button',{name:'Review payment',exact:true}).click();
 await page.getByRole('button',{name:'Record payment',exact:true}).click();await expect(page.getByRole('link',{name:'View receipt'})).toBeVisible();expect(evidence(c)).toEqual(committed);
});
test('receipt correction controls wait for open invoices and a read error can be retried safely',async({page,prefix})=>{
 const c=await createCustomer(page,prefix),r=await received(page,c),before=evidence(c);let release;
 const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/payments/open-obligations?**',async route=>{await gate;await route.fulfill({status:500,json:{message:'Open invoice service unavailable'}});},{times:1});
 await page.goto(`/payments/receipts/${r.receipt.receipt_id}`);await expect(page.getByRole('heading',{name:`Receipt #${r.receipt.receipt_id}`})).toBeVisible();
 await expect(page.getByRole('button',{name:'Flag complete receipt as bounced'})).toHaveCount(0);release();
 await expect(page.getByText('Open invoice service unavailable')).toBeVisible();await expect(page.getByRole('button',{name:'Flag complete receipt as bounced'})).toHaveCount(0);
 await page.getByRole('button',{name:'Refresh receipt'}).click();await expect(page.getByText('Receipt history',{exact:true})).toBeVisible();expect(evidence(c)).toEqual(before);
});
for(const kind of ['credit-memos','refunds'])test(`${kind} handles server and network read errors without stale actions`,async({page,prefix})=>{
 const c=await createCustomer(page,prefix),before=evidence(c);const url=kind==='credit-memos'?'/billing/credit-memos':'/payments/refunds';
 await page.route(`**/${kind}?**`,r=>r.fulfill({status:500,json:{message:'Records temporarily unavailable'}}),{times:1});
 await page.goto(url);await expect(page.getByText('Records temporarily unavailable')).toBeVisible();await expect(page.getByRole('button',{name:/Reverse memo/})).toHaveCount(0);
 await page.route(`**/${kind}?**`,r=>r.abort('failed'),{times:1});await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('[role="alert"].MuiAlert-standardError')).toBeVisible();
 await page.getByRole('button',{name:'Try again'}).click();await expect(page.getByText(kind==='credit-memos'?'No credit memos match this business. Open a finalized invoice to issue one.':'No refunds match this business. Open client credits to record money returned.')).toBeVisible();expect(evidence(c)).toEqual(before);
});
test('two tabs cannot finalize the same reviewed credit memo twice; back and refresh preserve the issued original',async({page,context,prefix})=>{
 const c=await billedCustomer(page,prefix);await finalize(page,c);const i=rows(`SELECT * FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL`)[0];
 const second=await context.newPage(),path=`/billing/invoices/${i.customer_invoice_id}/work`;
 try{
  for(const tab of [page,second]){await tab.goto(path);await tab.getByRole('button',{name:'Credit memo',exact:true}).click();await tab.getByLabel('Credit memo amount').fill('5');await tab.getByLabel('Correction reason').fill('Correct duplicate service');await tab.getByRole('button',{name:'Review correction'}).click();}
  await page.getByRole('button',{name:'Finalize correction',exact:true}).click();await expect(page.getByText('Credit memo finalized and locked. Original invoice preserved.')).toBeVisible();const after=evidence(c);
  const conflict=second.waitForResponse(r=>r.url().endsWith('/credit-memos') && r.request().method()==='POST');await second.getByRole('button',{name:'Finalize correction',exact:true}).click();expect((await conflict).status()).toBe(409);await expect(second.getByRole('button',{name:'Refresh correction'})).toBeVisible();expect(evidence(c)).toEqual(after);
  expect(rows(`SELECT * FROM customer_invoices WHERE account_id=9001 AND customer_invoice_id=${i.customer_invoice_id}`)).toEqual([i]);expect(rows(`SELECT memo_id FROM credit_memos WHERE account_id=9001 AND customer_id=${c.id}`)).toHaveLength(1);
  await page.getByRole('navigation',{name:'Breadcrumbs'}).getByRole('link',{name:'Invoices',exact:true}).click();await page.goBack();await page.reload();await expect(page.getByText(/Open debt \$17.50/)).toBeVisible();expect(evidence(c)).toEqual(after);
 }finally{await second.close();}
});
