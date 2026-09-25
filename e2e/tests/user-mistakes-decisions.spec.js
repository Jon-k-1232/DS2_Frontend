require('../lib/scenario-safety').assertLocalUI();
const { test, expect } = require('../lib/fixtures');
const { billedCustomer, createCustomer, createJob, addTransaction, finalize, openForm, closeForm, choose, submit, routes } = require('../lib/ui');
const { prepare, financial, saved, types } = require('../lib/mistakes');
const { rows } = require('../lib/db');
const { authenticate } = require('../lib/auth');
const { rememberObject } = require('../lib/storage');
const { saveDownload } = require('../lib/download');
const fs=require('fs'),crypto=require('crypto');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function openInvoice(page,c,invoice) {
  await page.goto(routes.invoices); await page.getByPlaceholder('Search invoices').fill(invoice.invoice_number);
  await page.getByRole('row').filter({hasText:invoice.invoice_number}).first().click();
  await expect(page.getByText(/Sent — locked ·/)).toBeVisible();
}
async function issue(page,c,{sameDay=false,credit=false,double=false}={}) {
  await page.goto(routes.createInvoice); await page.getByPlaceholder('Search by name or business').fill(c.prefix);
  const row=page.getByRole('row').filter({hasText:c.name}); await expect(row).toBeVisible();
  if(credit) {
    await expect(row).toContainText('Credit — no payment due');
    await expect(page.getByRole('checkbox',{name:/Select all/i})).toBeDisabled();
    await expect(row.locator('.MuiDataGrid-cellCheckbox input')).not.toBeChecked();
  }
  const selection=row.locator('.MuiDataGrid-cellCheckbox input');
  await selection.click();await expect(selection).toBeChecked();
  if(sameDay) await page.getByLabel(/Allow.*same.day|Include.*today|same.day.*rebill/i).check();
  await page.getByLabel('Create CSV Only').uncheck(); await page.getByLabel('Lock And Finalize Selected Invoices').check();
  await page.getByRole('button',{name:'Submit',exact:true}).click();
  let requests=0;
  await page.route('**/invoices/createInvoice/9001/90013',async route=>{requests++;await new Promise(r=>setTimeout(r,400));await route.fallback();});
  const response=page.waitForResponse(r=>r.request().method()==='POST' && r.url().includes('/invoices/createInvoice/'));
  const download=page.waitForEvent('download');
  const confirm=page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true});
  if(double) await confirm.dblclick(); else await confirm.click();
  const r=await response,body=await r.json(); expect(r.ok(),JSON.stringify(body)).toBeTruthy();expect(body.status,JSON.stringify(body)).toBe(200);
  rememberObject(c.prefix,body.fileLocation);await saveDownload(await download);
  expect(requests).toBe(1);
  await page.unroute('**/invoices/createInvoice/9001/90013');
  return body;
}

test('double finalization and browser Back create one sent invoice without replaying it',async({page,prefix})=>{
  const c=await billedCustomer(page,prefix);
  await issue(page,c,{double:true});
  await expect(page.getByText(/generated|created|finaliz|success/i).first()).toBeVisible();
  expect(rows(`SELECT invoice_id FROM invoice_issues WHERE account_id=9001 AND customer_id=${c.id}`)).toHaveLength(1);
  const before=financial(c);
  await page.goto(routes.customers);await page.goBack();expect(financial(c)).toEqual(before);
  expect(Number(before.customer_invoices[0].total_amount_due)).toBe(22.5);
});

test('stale delete page after another session finalizes refuses and preserves the entire sent record',async({page,browser,prefix})=>{
  const c=await billedCustomer(page,prefix);const [work]=saved('time',c);
  await page.goto(routes.transactions);await page.getByPlaceholder('Search transactions').fill(prefix);
  await page.locator(`[role=row][data-id="${work.transaction_id}"]`).click();
  await page.getByRole('button',{name:'Delete Transaction',exact:true}).click();
  const other=await browser.newContext();await authenticate(other,'admin');const p=await other.newPage();
  try {await finalize(p,c);} finally {await other.close();}
  const before=financial(c);
  await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText(/sent|locked|invoice/i);
  expect(financial(c)).toEqual(before);
  // Reload rereads this record's current sent metadata, even before the
  // shared lookup lists finish loading.
  await page.reload();
  await expect(page.getByRole('alert')).toContainText(/sent|locked/i);
  await expect(page.getByRole('button',{name:'Delete Transaction',exact:true})).toHaveCount(0);
});

test('stale payment after another session pays in full refuses without a second receipt',async({page,browser,prefix})=>{
  const c=await billedCustomer(page,prefix);await finalize(page,c);const d=await prepare(page,c,'payment','22.5');
  const other=await browser.newContext();await authenticate(other,'admin');const p=await other.newPage();
  try {const form=await prepare(p,c,'payment','22.5');await submit(p,form,types.payment.endpoint);} finally {await other.close();}
  const before=financial(c);
  await d.getByRole('button',{name:'Submit',exact:true}).click();
  await expect(d.getByRole('alert').last()).toContainText(/balance|paid|open invoice|outstanding|remaining|exceed/i);
  expect(financial(c)).toEqual(before);expect(saved('payment',c)).toHaveLength(1);
});

test('optional credit excludes bulk selection and explicitly issues -$27.50 without a second deduction',async({page,prefix})=>{
  const c=await billedCustomer(page,prefix);
  const d=await openForm(page,routes.writeoffs,'New Write Off');await choose(page,d,'Select Customer',c.name);
  await d.getByRole('combobox',{name:'Select Current Cycle Job',exact:true}).fill('1040');
  await page.getByRole('option').filter({hasText:'1040 Individual Return'}).click();
  await choose(page,d,'Select Team Member','Admin Person');await d.getByLabel('Reason For Write Off').fill('Courtesy credit');await d.getByLabel('Write Off Amount').fill('50');
  await submit(page,d,types.writeoff.endpoint);await closeForm(page);
  await issue(page,c,{credit:true});
  const [invoice]=rows(`SELECT total_amount_due FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL`);
  expect(Number(invoice.total_amount_due)).toBe(-27.5);
  expect(saved('writeoff',c)).toHaveLength(1);expect(saved('payment',c)).toHaveLength(0);
  expect(rows(`SELECT credit_selection_reason FROM invoice_issues WHERE account_id=9001 AND customer_id=${c.id}`)[0].credit_selection_reason).toMatch(/explicitly selected credit/);
});

test('duplicate flag rejects missing IDs, supports dismissal and removes only an unbilled duplicate',async({page,prefix})=>{
  const c=await billedCustomer(page,prefix);const [work]=saved('time',c);const before=financial(c);
  await page.goto('/transactions/possibleDuplicates');
  const reason=page.getByRole('textbox',{name:/^Reason/});
  await reason.fill('Manual review');await page.getByLabel('Record ID',{exact:true}).fill('2147483000');
  await page.getByRole('button',{name:'Flag possible duplicate',exact:true}).click();await expect(page.getByRole('alert')).toContainText(/not found|not.*exist|missing|unavailable/i);expect(financial(c)).toEqual(before);
  await page.getByLabel('Record ID',{exact:true}).fill(String(work.transaction_id));
  await page.getByRole('button',{name:'Flag possible duplicate',exact:true}).click();await expect(page.getByRole('alert')).toContainText(/flag/i);
  let [flag]=rows(`SELECT duplicate_id FROM duplicate_flags WHERE account_id=9001 AND customer_id=${c.id} ORDER BY duplicate_id DESC`);
  await page.getByRole('button',{name:`Review #${flag.duplicate_id}`,exact:true}).click();await reason.fill('Reviewed as distinct');
  await page.getByRole('button',{name:'Not a duplicate',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Marked not a duplicate.');expect(financial(c)).toEqual(before);
  await reason.fill('Confirmed duplicate');await page.getByRole('button',{name:'Flag possible duplicate',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('This pair already has a duplicate review. Open its existing history.');
  expect(financial(c)).toEqual(before);
  // The unchanged dismissed pair stays resolved. A separate unbilled charge
  // gives the permitted removal case without weakening that conflict rule.
  await addTransaction(page,c,'Charge');const candidate=saved('charge',c).find(r=>r.transaction_type==='Charge');
  await page.goto('/transactions/possibleDuplicates');await reason.fill('Confirmed extra charge');await page.getByLabel('Record ID',{exact:true}).fill(String(candidate.transaction_id));await page.getByRole('button',{name:'Flag possible duplicate',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText(/flag/i);
  [flag]=rows(`SELECT duplicate_id FROM duplicate_flags WHERE account_id=9001 AND customer_id=${c.id} ORDER BY duplicate_id DESC`);
  await page.getByRole('button',{name:`Review #${flag.duplicate_id}`,exact:true}).click();await reason.fill('Remove confirmed duplicate');
  await page.getByRole('button',{name:'Remove duplicate',exact:true}).click();
  const removed=page.waitForResponse(r=>r.request().method()==='POST' && r.url().includes(`/duplicates/${flag.duplicate_id}/resolve/`));
  await page.getByRole('button',{name:'Confirm removal',exact:true}).click();
  expect((await removed).status()).toBe(200);
  await expect(page.locator('[role=alert].MuiAlert-standardSuccess')).toContainText(/remov/i);expect(saved('time',c)).toHaveLength(1);expect(saved('time',c)[0].transaction_id).toBe(work.transaction_id);
});

test('sent receipt exception requires selection and reason; reversal and revision preserve original bytes',async({page,prefix},info)=>{
  test.setTimeout(180000);
  const c=await billedCustomer(page,prefix);await finalize(page,c);
  const d=await prepare(page,c,'payment','5');await submit(page,d,types.payment.endpoint);await closeForm(page);
  await issue(page,c,{sameDay:true});
  const [invoice]=rows(`SELECT * FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL ORDER BY customer_invoice_id DESC`);
  expect(Number(invoice.total_amount_due)).toBe(17.5);
  const [payment]=saved('payment',c);
  await openInvoice(page,c,invoice);
  const originalDownload=page.waitForEvent('download');await page.getByRole('button',{name:/Reprint original/}).click();const original=await saveDownload(await originalDownload);
  await page.getByRole('button',{name:'Flag exception',exact:true}).click();await expect(page.getByRole('button',{name:'Record exception',exact:true})).toBeDisabled();
  await page.getByLabel('Reason',{exact:true}).fill('Bank returned local check');await expect(page.getByRole('button',{name:'Record exception',exact:true})).toBeDisabled();
  await page.getByRole('checkbox',{name:new RegExp(`Payment #${payment.payment_id}:`)}).check();
  await page.getByRole('button',{name:'Record exception',exact:true}).click();
  await expect(page.getByText(/Exception #\d+: flagged/)).toBeVisible();
  await page.getByRole('button',{name:'Cancel flag',exact:true}).click();await expect(page.getByRole('button',{name:'Flag exception',exact:true})).toBeVisible();
  expect(saved('payment',c)).toHaveLength(1);
  await page.getByRole('button',{name:'Flag exception',exact:true}).click();await page.getByLabel('Reason',{exact:true}).fill('Bank confirmed check bounced');await page.getByRole('checkbox',{name:new RegExp(`Payment #${payment.payment_id}:`)}).check();await page.getByRole('button',{name:'Record exception',exact:true}).click();
  await page.getByRole('button',{name:'Reverse selected payments',exact:true}).click();await expect(page.getByText(/Exception #\d+: reversed/)).toBeVisible();
  expect(saved('payment',c).filter(r=>Number(r.payment_amount)>0).map(r=>Number(r.payment_amount))).toEqual([5]);
  await page.getByRole('button',{name:'Issue revision for reprint / resend',exact:true}).click();await expect(page.getByRole('button',{name:/Reprint revision 1/})).toBeVisible();
  const originalAgain=page.waitForEvent('download');await page.getByRole('button',{name:/Reprint original/}).click();expect(hash(await saveDownload(await originalAgain))).toBe(hash(original));
  const revisionDownload=page.waitForEvent('download');await page.getByRole('button',{name:/Reprint revision 1/}).click();const revision=await saveDownload(await revisionDownload);
  expect(rows(`SELECT issued_amount FROM invoice_revisions WHERE account_id=9001 AND invoice_id=${invoice.customer_invoice_id} ORDER BY revision`).map(r=>Number(r.issued_amount))).toEqual([17.5,22.5]);
  const [stillOriginal]=rows(`SELECT * FROM customer_invoices WHERE account_id=9001 AND customer_invoice_id=${invoice.customer_invoice_id}`);expect(stillOriginal).toEqual(invoice);
  await info.attach('revision.zip',{path:revision,contentType:'application/zip'});
});

test('finalize locks the work, payment, write-off and retainer screens and keeps $15.50 debt separate from $25 credit',async({page,prefix})=>{
  test.setTimeout(180000);
  const c=await billedCustomer(page,prefix);await finalize(page,c);
  for(const type of ['payment','writeoff','retainer']){const d=await prepare(page,c,type);await submit(page,d,types[type].endpoint);await closeForm(page);}
  await issue(page,c,{sameDay:true});
  const before=financial(c);
  const invoices=rows(`SELECT total_amount_due FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL ORDER BY customer_invoice_id`);
  expect(invoices.map(r=>Number(r.total_amount_due))).toEqual([22.5,15.5]);
  expect(Number(saved('retainer',c)[0].current_amount)).toBe(-25);
  for(const [type,idField,search] of [['time','transaction_id','Search transactions'],['payment','payment_id','Search payments'],['writeoff','writeoff_id','Search write-offs'],['retainer','retainer_id',null]]){
    const row=saved(type,c)[0];await page.goto(types[type].route);
    if(search)await page.getByPlaceholder(search).fill(prefix);else await require('../lib/ui').fillQuickFilter(page,prefix);
    await page.locator(`[role=row][data-id="${row[idField]}"]`).click();
    await expect(page.getByRole('alert')).toContainText(/Sent — locked/);
    await expect(page.getByRole('button',{name:/^Delete (Transaction|Payment|Write-off|Retainer)/})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Open invoice history',exact:true})).toBeVisible();
    expect(financial(c)).toEqual(before);
  }
});
