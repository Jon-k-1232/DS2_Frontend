const {test,expect}=require('../lib/workspace-fixtures');
const {createCustomer,billedCustomer,finalize}=require('../lib/ui');
const {rows}=require('../lib/db');
const aliases=require('../../src/Routes/legacyRoutes.json');
for(const [old,target] of Object.entries(aliases)){
 if(old.includes('customerProfile') || old.includes('invoiceDetail'))continue;
 test(`bookmark redirects ${old}`,async({page})=>{
  await page.goto(old+'?keep=1#section');await expect(page).toHaveURL(target+'?keep=1#section');
  await expect(page.getByTestId('workspace-title')).not.toHaveText('');
  await expect(page.getByText(/Unauthorized|Page Not Found/)).toHaveCount(0);
  await page.reload();await expect(page).toHaveURL(target+'?keep=1#section');
 });
}
test('client bookmarks retain every tab, ID, query and fragment through refresh and back',async({page,prefix})=>{
 const c=await createCustomer(page,prefix);
 for(const [old,next] of Object.entries({customerInvoices:'statements',customerTransactions:'work',customerJobs:'jobs',customerPayments:'receipts',retainersAndPrePayments:'credits',editCustomerProfile:'edit',aiAudit:'aiAudit',auditRecord:'auditRecord'})){
  await page.goto(`/customers/customersList/customerProfile/${c.id}/${old}?keep=1#section`);
  await expect(page).toHaveURL(`/clients/${c.id}/${next}?keep=1#section`);await expect(page.locator('[role="alert"].MuiAlert-standardError')).toHaveCount(0);
 }
 await page.goto(`/clients/${c.id}/statements`);await page.getByRole('tab',{name:'Work',exact:true}).click();await page.reload();await expect(page).toHaveURL(`/clients/${c.id}/work`);await page.goBack();await expect(page).toHaveURL(`/clients/${c.id}/statements`);
});
test('invoice bookmark selects the original by ID; a link without an ID offers recovery',async({page,prefix})=>{
 const c=await billedCustomer(page,prefix);await finalize(page,c);
 const id=rows(`SELECT customer_invoice_id FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL`)[0].customer_invoice_id;
 for(const [old,next] of Object.entries({invoiceTransactions:'work',invoicePayments:'payments',invoiceWriteOffs:'write-offs',invoiceOutstandingInvoices:'balance-forward',invoiceRetainers:'retainers'})){
  await page.goto(`/invoices/invoices/invoiceDetail/${old}?invoiceId=${id}#details`);await expect(page).toHaveURL(`/billing/invoices/${id}/${next}?invoiceId=${id}#details`);await expect(page.getByText(c.name,{exact:false}).first()).toBeVisible();
 }
 await page.reload();await expect(page.getByRole('tab',{name:'Retainers',exact:true})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download Invoice',exact:true}).click();await download;
 await expect(page.getByRole('tab',{name:'Retainers',exact:true})).toBeVisible();await expect(page.getByText(c.name,{exact:false}).first()).toBeVisible();
 await page.goto('/invoices/invoices/invoiceDetail/invoiceTransactions');await expect(page).toHaveURL('/billing/invoices/selected');await expect(page.getByText('This link does not identify a record. Select it from the list to continue.')).toBeVisible();
 await page.getByRole('link',{name:'Open invoices',exact:true}).click();await expect(page).toHaveURL('/billing/invoices');
});
test('work editor refresh, invalid IDs and injected load failure never change money',async({page,prefix})=>{
 const c=await billedCustomer(page,prefix);const work=rows(`SELECT * FROM customer_transactions WHERE account_id=9001 AND customer_id=${c.id}`)[0];
 const path=`/work/entries/${c.id}/${work.transaction_id}/edit`;
 await page.goto(path);await expect(page.getByRole('tab',{name:'Edit Transaction',exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('Work Completed On Job')).toHaveValue(work.detailed_work_description);
 await page.route('**/transactions/getSingleTransaction/**',r=>r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Synthetic record load failure'})}),{times:1});
 await page.reload();await expect(page.getByText('Synthetic record load failure')).toBeVisible();await expect(page.getByRole('button',{name:'Submit',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByLabel('Work Completed On Job')).toHaveValue(work.detailed_work_description);
 await page.goto(`/work/entries/${c.id}/2147483646/edit`);await expect(page.locator('[role="alert"].MuiAlert-standardError')).toBeVisible();
 await page.goto(`/work/entries/${c.id}/bad/edit`);await expect(page.getByText(/does not identify a record/)).toBeVisible();
 expect(rows(`SELECT * FROM customer_transactions WHERE account_id=9001 AND customer_id=${c.id}`)).toEqual([work]);
});
test('keyboard category expansion stays put, skip link focuses content, and quick entry opens the form',async({page})=>{
 await page.goto('/clients');await expect(page.getByPlaceholder('Search customers')).toBeVisible();const nav=page.getByRole('navigation',{name:'Primary navigation'});const billing=nav.getByRole('button',{name:'Billing',exact:true});await billing.focus();await expect(billing).toBeFocused();await billing.press('Enter');await expect(billing).toHaveAttribute('aria-expanded','true');await expect(page).toHaveURL('/clients');
 await page.getByRole('link',{name:'Skip to content'}).focus();await page.keyboard.press('Enter');await expect(page.locator('#main-content')).toBeFocused();
 await page.getByRole('navigation',{name:'Quick actions'}).getByRole('link',{name:'Enter time',exact:true}).click();await expect(page.getByRole('dialog',{name:'Add Time',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Account menu',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('menuitem',{name:'Home',exact:true})).toHaveAttribute('href','/clients');await expect(page.getByRole('menuitem',{name:'Home',exact:true})).toBeFocused();await page.keyboard.press('ArrowDown');await expect(page.getByRole('menuitem',{name:'Log out',exact:true})).toBeFocused();await page.keyboard.press('ArrowUp');await expect(page.getByRole('menuitem',{name:'Home',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Account menu',exact:true})).toBeFocused();
});
test('expanded, collapsed and narrow navigation keep the header and content reachable',async({page},info)=>{
 await page.goto('/clients');const title=page.getByTestId('workspace-title');await expect(title).toBeVisible();expect((await title.boundingBox()).x).toBeGreaterThanOrEqual(290);
 await expect(page.getByRole('button',{name:'Account menu',exact:true})).toBeInViewport();await expect(page.getByRole('button',{name:'Notifications',exact:true})).toBeInViewport();
 const headerGeometry=await page.getByRole('button',{name:'Account menu',exact:true}).evaluate(node=>{
  const r=node.getBoundingClientRect();return {left:r.left,right:r.right,width:window.innerWidth,documentWidth:document.documentElement.scrollWidth,receivesPointer:node.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};
 });
 expect(headerGeometry.receivesPointer).toBe(true);await info.attach('expanded-header-layout',{body:JSON.stringify(headerGeometry),contentType:'application/json'});
 await page.getByRole('button',{name:'Account menu',exact:true}).click();await expect(page.getByRole('menuitem',{name:'Log out',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('menuitem')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('desktop-expanded-viewport.png')});
 await expect(page.getByText('Loading reference lists…',{exact:true})).toHaveCount(0);await page.screenshot({path:info.outputPath('desktop-expanded.png'),fullPage:true});
 await page.getByRole('button',{name:'Hide menu',exact:true}).click();await expect(page.getByRole('button',{name:'Show menu',exact:true})).toBeVisible();await expect.poll(async()=>(await title.boundingBox()).x).toBeLessThan(290);
 await expect(page.locator('.MuiDrawer-paper')).toBeHidden();await page.screenshot({path:info.outputPath('desktop-collapsed.png'),fullPage:true});
 await expect(page.getByRole('button',{name:'Account menu',exact:true})).toBeInViewport();await expect(page.getByRole('button',{name:'Notifications',exact:true})).toBeInViewport();
 await page.setViewportSize({width:390,height:844});await expect(title).toBeVisible();await page.getByRole('button',{name:'Toggle menu',exact:true}).click();const nav=page.getByRole('navigation',{name:'Primary navigation'});await nav.getByRole('button',{name:'Billing',exact:true}).click();await nav.locator('.MuiCollapse-entered').getByRole('link',{name:'Recurring plans',exact:true}).click();await expect(page).toHaveURL('/billing/recurring');await expect(nav).not.toBeVisible();await expect(title).toBeVisible();
 await expect(page.locator('.MuiModal-root.MuiDrawer-root')).toHaveCount(0);await page.screenshot({path:info.outputPath('mobile.png'),fullPage:true});
 await expect(page.getByRole('button',{name:'Account menu',exact:true})).toBeInViewport();await expect(page.getByRole('button',{name:'Notifications',exact:true})).toBeInViewport();
});

for(const [old,next] of [
 ['/transactions/customerTransactions/editTransaction','/work/entries/900101/2147483646/edit'],
 ['/transactions/customerTransactions/deleteTimeOrCharge','/work/entries/900101/2147483646/delete'],
 ['/transactions/customerPayments/deletePayment','/payments/receipts/legacy/2147483646/delete'],
 ['/transactions/customerPayments/reversePayment','/payments/receipts/legacy/2147483646/reverse'],
 ['/transactions/customerRetainers/deleteRetainer','/payments/retainers/2147483646/delete'],
 ['/transactions/customerWriteOffs/deleteWriteOff','/receivables/write-offs/2147483646/delete'],
 ['/jobs/jobsList/editJob','/work/jobs/2147483646/edit'],
 ['/jobs/jobsList/deleteJob','/work/jobs/2147483646/delete'],
 ['/jobs/jobTypesList/editJobType','/settings/job-types/2147483646/edit'],
 ['/jobs/jobTypesList/deleteJobType','/settings/job-types/2147483646/delete'],
 ['/jobs/jobCategoriesList/editJobCategory','/settings/job-categories/2147483646/edit'],
 ['/jobs/jobCategoriesList/deleteJobCategory','/settings/job-categories/2147483646/delete'],
 ['/jobs/workDescriptionsList/editWorkDescription','/settings/work-descriptions/2147483646/edit'],
 ['/jobs/workDescriptionsList/deleteWorkDescription','/settings/work-descriptions/2147483646/delete'],
 ['/account/accountUsers/editUser','/settings/users/2147483646/edit'],
 ['/account/accountUsers/deleteUser','/settings/users/2147483646/delete'],
])test(`record bookmark redirects ${old} and refuses a missing record`,async({page})=>{
 const writes=[];page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url());});
 await page.goto(old+'?id=2147483646&customerId=900101#record');await expect(page).toHaveURL(next+'?id=2147483646&customerId=900101#record');
 await expect(page.locator('[role="alert"].MuiAlert-standardError')).toBeVisible();await expect(page.getByRole('button',{name:'Submit',exact:true})).toHaveCount(0);expect(writes).toEqual([]);
});

test('reference-list failure is visible and retry restores client choices without a write',async({page})=>{
 await page.route('**/initialData/initialBlob/9001/90013',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Reference data unavailable'})}),{times:1});
 const writes=[];page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url());});
 await page.goto('/payments/receive');await expect(page.getByRole('button',{name:'Reload reference lists'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Review payment'})).toBeDisabled();await page.getByRole('button',{name:'Reload reference lists'}).click();
 await expect.poll(()=>page.getByRole('combobox',{name:'Client',exact:true}).locator('option').count()).toBeGreaterThan(1);await expect(page.getByRole('button',{name:'Reload reference lists'})).toHaveCount(0);expect(writes).toEqual([]);
});

test('client shortcuts carry the selected client and business into payment and credit workflows',async({page,prefix})=>{
 const c=await createCustomer(page,prefix);
 const entity=rows('SELECT billing_entity_id FROM billing_entities WHERE account_id=9001 AND active AND is_default')[0].billing_entity_id;
 await page.goto(`/clients/${c.id}/credits`);
 await page.getByRole('combobox',{name:'Billing business',exact:true}).selectOption(String(entity));
 const creditLink=page.getByRole('link',{name:'View client credits',exact:true});
 await expect(creditLink).toHaveAttribute('href',`/payments/credits?customerId=${c.id}&entityId=${entity}`);
 await creditLink.click();
 await expect(page.getByRole('combobox',{name:'Credit client',exact:true})).toHaveValue(String(c.id));
 await expect(page.getByRole('combobox',{name:'Credit business',exact:true})).toHaveValue(String(entity));
 await page.goto(`/clients/${c.id}/receipts`);
 await page.getByRole('combobox',{name:'Billing business',exact:true}).selectOption(String(entity));
 const paymentLink=page.getByRole('link',{name:'Receive payment for this client',exact:true});
 await expect(paymentLink).toHaveAttribute('href',`/payments/receive?customerId=${c.id}&entityId=${entity}`);
 await paymentLink.click();
 await expect(page.getByRole('combobox',{name:'Client',exact:true})).toHaveValue(String(c.id));
 await expect(page.getByRole('combobox',{name:'Billing business',exact:true})).toHaveValue(String(entity));
 await expect(page.getByText('No open invoices. The payment will remain as credit.')).toBeVisible();
 expect(rows(`SELECT receipt_id FROM payment_receipts WHERE account_id=9001 AND customer_id=${c.id}`)).toEqual([]);
});

for(const [old,target] of Object.entries({'/customers':'/clients','/transactions':'/work/entries','/invoices':'/billing/invoices','/jobs':'/work/jobs','/analytics':'/reports/billing-performance','/account':'/settings/account'}))test(`old category root ${old} redirects`,async({page})=>{
 await page.goto(old+'?keep=1#section');await expect(page).toHaveURL(target+'?keep=1#section');await expect(page.getByTestId('workspace-title')).not.toHaveText('');
});
