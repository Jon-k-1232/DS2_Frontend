const {test,expect}=require('../lib/workspace-fixtures');
const {billedCustomer,createCustomer,finalize}=require('../lib/ui');
const {rows}=require('../lib/db');
const {randomUUID}=require('crypto');
const navigation=require('../../src/Routes/navigation.json');
const fs=require('fs');
const path=require('path');
const evidence=path.resolve(__dirname,'../../../DS2_Backend/docs/decisions/evidence/run-H8/screenshots');
async function capture(page,info,name){
 const file=info.outputPath(name+'.png');await page.screenshot({path:file,fullPage:true});
 fs.mkdirSync(evidence,{recursive:true});fs.copyFileSync(file,path.join(evidence,`${process.env.H8_SCREENSHOT_PHASE || 'after'}-${name}.png`));
 await info.attach(name,{path:file,contentType:'image/png'});
}
test('AR uses plain labels and keeps report history collapsed at 1280px',async({page},info)=>{
 await page.setViewportSize({width:1280,height:900});
 await page.route('**/accountsReceivable/aging/**',r=>r.fulfill({json:{status:200,arAging:{customers:[{customer_id:900101,billing_entity_name:'Our tax business',business_name:'Example client company',customer_name:'Synthetic client',display_name:'Example client',total_outstanding:20,bucket_0_30:20,bucket_unknown:0,reconstructed:true}],pagination:{totalItems:1,totalPages:1}}}}));
 await page.goto('/receivables/aging');await expect(page.getByRole('cell').filter({hasText:/^Example client/}).last()).toBeVisible();
 await capture(page,info,'ar-1280');
 await expect(page.getByRole('columnheader',{name:'Our business',exact:true})).toBeVisible();
 await expect(page.getByRole('columnheader',{name:'Client company',exact:true})).toBeVisible();
 await expect(page.getByLabel('Include records saved through')).toBeHidden();
 await page.getByRole('button',{name:'Advanced: reproduce an earlier report'}).click();
 await expect(page.getByLabel('Include records saved through')).toBeVisible();
 await expect(page.getByText('Reconstructed legacy')).toHaveCount(0);
 const client=page.getByRole('row').filter({hasText:'Example client company'});
 await expect(client.getByRole('cell').nth(8)).not.toContainText('Estimated');
 await expect(page.getByLabel('Estimated from historical records')).toBeVisible();
 const total=page.getByRole('row').filter({hasText:'Page totals'}).getByRole('cell').nth(4);
 expect(await total.evaluate(n=>getComputedStyle(n).color)).not.toBe('rgb(255, 72, 66)');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('credit memo names, status, sentence case and document numbers are clear at 1280px',async({page,prefix},info)=>{
 const c=await billedCustomer(page,prefix);await finalize(page,c);
 const i=rows(`SELECT customer_invoice_id,billing_entity_id FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL`)[0];
 const s=await (await page.request.get(`http://localhost:8003/invoices/${i.customer_invoice_id}/corrections`)).json();
 const posted=await page.request.post(`http://localhost:8003/invoices/${i.customer_invoice_id}/credit-memos`,{data:{amount:10,reason:'Correct an overcharge',entityId:i.billing_entity_id,ledgerFingerprint:s.ledgerFingerprint},headers:{'Idempotency-Key':randomUUID()}});expect(posted.ok()).toBe(true);
 const [memo]=rows(`SELECT number FROM credit_memos WHERE account_id=9001 AND customer_id=${c.id}`);
 await page.setViewportSize({width:1280,height:900});await page.goto('/billing/credit-memos');
 const row=page.getByRole('row').filter({hasText:memo.number});await expect(row).toBeVisible();
 await capture(page,info,'credit-memos-1280');
 await expect(page.getByRole('columnheader',{name:'Status',exact:true})).toBeVisible();
 await expect(row).toContainText('Admin Person');await expect(row).not.toContainText('User #90013');await expect(row).toContainText('Issued');
 const number=row.getByRole('cell',{name:memo.number,exact:true});expect(await row.getByText(/^2026-\d{2}-\d{2}$/).evaluate(n=>getComputedStyle(n).whiteSpace)).toBe('nowrap');
 expect(await number.evaluate(n=>getComputedStyle(n).whiteSpace)).toBe('nowrap');
 expect(await page.getByRole('link',{name:'Open an invoice to issue a credit memo'}).evaluate(n=>getComputedStyle(n).textTransform)).toBe('none');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const entry of navigation.flatMap(g=>g.children))test(`page help covers ${entry.path}`,async({page},info)=>{
 await page.setViewportSize({width:1280,height:900});await page.goto(entry.path);
 await page.waitForLoadState('networkidle');await expect(page.locator('[role="alert"].MuiAlert-standardError')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(entry.path==='/work/review')await expect(page.getByText('Automated matching is unavailable for this account. Review held entries manually or ask an administrator for help.')).toBeVisible();
 if(entry.path==='/work/review/entities')await expect(page.getByText(/Showing 1–0/)).toHaveCount(0);
 if(['/clients','/billing/invoices','/billing/quotes','/receivables/write-offs'].includes(entry.path))await expect(page.getByRole('columnheader').filter({hasText:/\bId\b|\bID\b/})).toHaveCount(0);
 await capture(page,info,'page-'+entry.path.replaceAll('/','-').slice(1));
 const help=page.getByRole('button',{name:'About this page',exact:true});await expect(help).toBeVisible();
 await help.focus();await page.keyboard.press('Enter');
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('listitem')).toHaveCount(5);
 await expect(dialog).toContainText('Who:');await expect(dialog).toContainText('Correcting mistakes:');
 if(['/billing/create','/payments/receive','/billing/credit-memos','/receivables/write-offs','/payments/retainers','/billing/recurring','/receivables/aging','/settings/entities'].includes(entry.path)){
  const {helpForPath}=require('../../src/help/pageHelp');const content=helpForPath(entry.path);
  for(const bullet of content.bullets)await expect(dialog).toContainText(bullet);
  await capture(page,info,'help-'+entry.path.replaceAll('/','-').slice(1));
 }
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(help).toBeFocused();
});
test('every client tab has its own help and Audit Record explains immutable evidence',async({page,prefix},info)=>{
 const c=await createCustomer(page,prefix);
 const tabs=['','statements','work','jobs','receipts','credits','aiAudit','auditRecord','edit'];
 for(const tab of tabs){
  await page.goto(`/clients/${c.id}${tab?'/'+tab:''}`);await page.getByRole('button',{name:'About this page'}).click();
  const {helpForPath}=require('../../src/help/pageHelp');const help=helpForPath(`/clients/${c.id}${tab?'/'+tab:''}`);
  const dialog=page.getByRole('dialog');await expect(dialog).toHaveAccessibleName('About '+help.title);
  for(const bullet of help.bullets)await expect(dialog).toContainText(bullet);
  if(tab==='auditRecord')await capture(page,info,'help-audit-record');
  await page.getByRole('button',{name:'Close page help'}).click();await expect(dialog).toHaveCount(0);
 }
});
test('invoice help explains void and rebill without unlocking the original',async({page,prefix},info)=>{
 const c=await billedCustomer(page,prefix);await finalize(page,c);
 const id=rows(`SELECT customer_invoice_id FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL`)[0].customer_invoice_id;
 await page.goto(`/billing/invoices/${id}/work`);await page.getByRole('button',{name:'About this page'}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Void and rebill');await expect(dialog).toContainText('new invoice number');await expect(dialog).toContainText('Admins only');
 await capture(page,info,'help-void-and-rebill');
});
