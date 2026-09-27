const {test,expect}=require('../lib/workspace-fixtures');
const {createCustomer,billedCustomer,finalize}=require('../lib/ui');
const {rows}=require('../lib/db');
for(const [name,path,endpoint,buttons] of [
 ['Create invoices','/billing/create','**/invoices/createInvoice/AccountsWithBalance/9001/90013**',['Submit']],
 ['Accounts receivable','/receivables/aging','**/accountsReceivable/aging/9001/90013**',['Export CSV']],
 ['Billing performance','/reports/billing-performance','**/analytics/billingPerformance/9001/90013**',['CSV','PDF']]
])test(`${name} waits for its data before enabling money or export controls`,async({page,prefix})=>{
 const c=await billedCustomer(page,prefix);if(name==='Accounts receivable')await finalize(page,c);
 let release,entered;const gate=new Promise(resolve=>release=resolve),seen=new Promise(resolve=>entered=resolve);
 await page.route(endpoint,async route=>{entered();await gate;await route.continue();});
 try{
  await page.goto(path);await seen;
  for(const label of buttons)await expect(page.getByRole('button',{name:label,exact:true})).toBeDisabled();
  release();await page.waitForLoadState('networkidle');
  for(const label of buttons)await expect(page.getByRole('button',{name:label,exact:true})).toBeEnabled();
 }finally{release();}
});
test('Account Audit cannot run an old selection during loading or after an error',async({page,prefix})=>{
 const c=await createCustomer(page,prefix),events=()=>rows(`SELECT event_id,event_hash FROM audit_events WHERE account_id=9001 AND customer_id=${c.id} ORDER BY event_id`);
 const before=events();let release;
 await page.route('**/accountAudit/customers/9001/90013**',route=>route.fulfill({json:{customers:[{customer_id:c.id,display_name:c.name,last_app_invoice_total:100}],pagination:{totalCount:1,totalPages:1}}}),{times:1});
 await page.goto('/reports/account-audit');await expect(page.getByText(c.name,{exact:true})).toBeVisible();
 await page.getByRole('row').filter({hasText:c.name}).getByRole('checkbox').check();
 const run=page.getByRole('button',{name:'Audit selected (1)',exact:true});await expect(run).toBeEnabled();
 const gate=new Promise(resolve=>release=resolve);
 await page.route('**/accountAudit/customers/9001/90013**',async route=>{await gate;await route.fulfill({status:500,json:{message:'Cannot load current balances'}});},{times:1});
 try{
  await page.getByPlaceholder(/Search/).fill('Another client');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(run).toBeDisabled();
  release();await expect(page.getByText('Cannot load current balances')).toBeVisible();await expect(run).toBeDisabled();await expect(page.getByRole('button',{name:'Audit',exact:true})).toHaveCount(0);expect(events()).toEqual(before);
 }finally{release();}
});
for(const [path,endpoint] of [
 ['/clients','**/customer/activeCustomers/9001/90013?**'],
 ['/billing/invoices','**/invoices/getInvoicesPaginated/9001/90013?**']
])test(`late grid data on ${path} respects keyboard focus on page help`,async({page})=>{
 let release,entered;const gate=new Promise(resolve=>release=resolve),seen=new Promise(resolve=>entered=resolve);
 await page.route(endpoint,async route=>{entered();await gate;await route.continue();});
 try{
  await page.goto(path);await seen;const help=page.getByRole('button',{name:'About this page'});await help.focus();
  release();await page.waitForLoadState('networkidle');await expect(help).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(help).toBeFocused();
 }finally{release();}
});
