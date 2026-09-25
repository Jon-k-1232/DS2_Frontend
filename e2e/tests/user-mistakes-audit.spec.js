require('../lib/scenario-safety').assertLocalUI();
const { test, expect } = require('../lib/fixtures');
const { billedCustomer, createCustomer, finalize, routes } = require('../lib/ui');
const { financial } = require('../lib/mistakes');
const { rows } = require('../lib/db');
const { authenticate } = require('../lib/auth');
const { saveDownload } = require('../lib/download');
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const url = c => `/customers/customersList/customerProfile/${c.id}/auditRecord`;
const api = c => `http://localhost:8003/auditRecord/customer/${c.id}/9001/90013`;

test('client and full evidence: print, list, reopen, verify; plain language and one invoice archive summary', async ({page,prefix},info) => {
  test.setTimeout(180000);
  const c = await billedCustomer(page,prefix); await finalize(page,c);
  const before = financial(c);
  await page.goto(url(c));
  const history = page.getByRole('table',{name:'Account history',exact:true});
  await expect(history).toBeVisible();
  for (const details of await history.locator('details').all()) await details.locator('summary').click();
  const text = await history.innerText();
  expect(text).not.toMatch(/customer_transactions|customer_invoices|invoice_statement_members|"before"\s*:|"after"\s*:|\{\s*"/);
  expect(text).toMatch(/archiv|statement cop/i);
  await expect(page.getByLabel('Print option',{exact:true})).toHaveValue('client');
  for (const [value,label] of [['client','Client record'],['full_evidence','Full evidence record']]) {
    await page.getByLabel('Print option',{exact:true}).selectOption(value);
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button',{name:'Print record',exact:true}).click();
    const file = await saveDownload(await downloaded);
    const pdf = execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
    expect(pdf).toMatch(value === 'client' ? /CLIENT RECORD/i : /FULL EVIDENCE RECORD/i);
    expect(pdf).toMatch(/finaliz[ei].*sent.*locked/i);
    if (value === 'client') {
      expect(pdf).not.toMatch(/\/auditRecord\/|customer_transactions|invoice_statement_members|"before"\s*:/);
      expect(pdf).toMatch(/give the firm.*record ID/i);
      expect(pdf).toMatch(/recomputes.*SHA-256/i);
      const summaries = pdf.split('\n').filter(line=>/statement items archived/i.test(line));
      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toMatch(/2 statement items archived - 1 invoice balance, 1 work item/);
    } else {
      expect(pdf).toMatch(/\/auditRecord\/customer\//);
      expect(pdf).toMatch(/JSON Pointer|\/entries\//i);
    }
    const [record] = rows(`SELECT record_id,record_type,document_sha256 FROM audit_records WHERE account_id=9001 AND customer_id=${c.id} AND record_type='${value}' ORDER BY generated_at DESC`);
    expect(record.record_type).toBe(value); expect(record.document_sha256).toBe(digest(file));
    const recordRow = page.getByRole('table',{name:'Printed audit records',exact:true}).getByRole('row').filter({hasText:record.record_id});
    await expect(recordRow).toContainText(label);
    const reopen = page.waitForEvent('download');
    await recordRow.getByRole('button',{name:'Reopen exact PDF',exact:true}).click();
    expect(digest(await saveDownload(await reopen))).toBe(digest(file));
    await recordRow.getByRole('button',{name:'Verify',exact:true}).click();
    await expect(page.getByText('Verified',{exact:true})).toBeVisible();
    await info.attach(`${value}-record.pdf`,{path:file,contentType:'application/pdf'});
  }
  expect(financial(c)).toEqual(before);
  expect(rows(`SELECT record_type FROM audit_records WHERE account_id=9001 AND customer_id=${c.id}`)).toHaveLength(2);
  await page.reload();
  await expect(page.getByRole('table',{name:'Printed audit records',exact:true}).getByRole('button',{name:'Reopen exact PDF',exact:true})).toHaveCount(2);
});

test('Audit Record date filters: reversed range refuses; empty month and reset preserve balances',async({page,prefix})=>{
  const c=await billedCustomer(page,prefix); const before=financial(c);
  await page.goto(url(c)); await expect(page.getByRole('table',{name:'Account history'})).toBeVisible();
  await page.getByLabel('From',{exact:true}).fill('2026-09-01');
  await page.getByLabel('Through',{exact:true}).fill('2026-08-31');
  await page.getByRole('button',{name:'Apply dates',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Start date must not be after end date.');
  await page.getByLabel('From',{exact:true}).fill('1999-08-31');
  await page.getByLabel('Through',{exact:true}).fill('1999-09-01');
  await page.getByRole('button',{name:'Apply dates',exact:true}).click();
  await expect(page.getByText('No history in this date range.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Previous history',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Next history',exact:true})).toBeDisabled();
  await page.getByLabel('From',{exact:true}).fill(''); await page.getByLabel('Through',{exact:true}).fill('');
  await page.getByRole('button',{name:'Apply dates',exact:true}).click();
  await expect(page.getByText('No history in this date range.',{exact:true})).toHaveCount(0);
  expect(financial(c)).toEqual(before);
  expect(rows(`SELECT record_id FROM audit_records WHERE account_id=9001 AND customer_id=${c.id}`)).toEqual([]);
});

test('Audit Record validates API inputs and refuses missing/foreign data and unsupported tampering routes',async({page,context,prefix})=>{
  const c=await createCustomer(page,prefix); const before=financial(c);
  await page.goto(url(c)); await expect(page.getByRole('table',{name:'Account history'})).toBeVisible();
  for(const suffix of ['?limit=0','?limit=101','?offset=-1','?startDate=2026-02-30','?startDate=2026-09-01&endDate=2026-08-31','/records/not-a-uuid/pdf','/records/not-a-uuid/verify']) {
    const r=await context.request.get(api(c)+suffix); expect(r.status(),suffix).toBe(400); expect((await r.json()).message).toBeTruthy();
  }
  for(const body of [{recordType:'garbage'},{startDate:'2026-02-30'},{startDate:'2026-09-01',endDate:'2026-08-31'}]) {
    const r=await context.request.post(api(c)+'/records',{data:body}); expect(r.status()).toBe(400); expect((await r.json()).message).toBeTruthy();
  }
  for(const method of ['put','delete']) {
    const r=await context.request[method](api(c)+'/records/00000000-0000-4000-8000-000000000000',{data:{recordType:'client'}}); expect(r.status()).toBe(404);
  }
  const missing=await context.request.get(api(c)+'/records/00000000-0000-4000-8000-000000000000/pdf'); expect(missing.status()).toBe(404);
  const foreign=await context.request.get(`http://localhost:8003/auditRecord/customer/${c.id}/1/90013`); expect(foreign.status()).toBe(403);
  const absent=await context.request.get('http://localhost:8003/auditRecord/customer/2147483000/9001/90013'); expect(absent.status()).toBe(404);
  expect(financial(c)).toEqual(before); expect(rows(`SELECT record_id FROM audit_records WHERE account_id=9001 AND customer_id=${c.id}`)).toEqual([]);
});

test('Audit Record network failures are visible and do not claim a printed record was saved',async({page,prefix})=>{
  const c=await createCustomer(page,prefix); const before=financial(c);
  await page.goto(url(c)); await expect(page.getByRole('table',{name:'Account history'})).toBeVisible();
  await page.route('**/auditRecord/**/records',route=>route.request().method()==='POST'?route.abort('failed'):route.fallback());
  await page.getByRole('button',{name:'Print record',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText(/network|unable|error/i);
  await expect(page.getByRole('button',{name:'Print record',exact:true})).toBeEnabled();
  expect(rows(`SELECT record_id FROM audit_records WHERE account_id=9001 AND customer_id=${c.id}`)).toEqual([]);
  expect(financial(c)).toEqual(before);
});

test('employee refused all manager pages and every Audit Record operation without ledger changes',async({page,browser,prefix})=>{
  const c=await createCustomer(page,prefix); const before=financial(c);
  const employee=await browser.newContext(); await authenticate(employee,'employee'); const p=await employee.newPage();
  try {
    for(const route of [routes.customers,routes.transactions,routes.payments,routes.writeoffs,routes.retainers,routes.createInvoice,'/transactions/possibleDuplicates',url(c)]) {
      await p.goto('http://localhost:3003'+route); await expect(p.getByRole('heading',{name:'Unauthorized',exact:true})).toBeVisible();
    }
    const base=api(c).replace('/90013','/90011');
    for(const suffix of ['','/verify','/records','/records/00000000-0000-4000-8000-000000000000/pdf','/records/00000000-0000-4000-8000-000000000000/verify','/records/00000000-0000-4000-8000-000000000000/evidence']) {
      const r=await employee.request.get(base+suffix); expect(r.status(),suffix).toBe(403); expect((await r.json()).message).toMatch(/Unauthorized/);
    }
    expect((await employee.request.post(base+'/records',{data:{recordType:'client'}})).status()).toBe(403);
  } finally {await employee.close();}
  expect(financial(c)).toEqual(before);
});

test.describe('read-only super admin Audit Record access',()=>{
 test.use({identity:'readonly'});
 test('super admin sees the tab and readable history in the own tenant without printing',async({page})=>{
  const [c]=rows('SELECT customer_id AS id FROM customers WHERE account_id=1 ORDER BY customer_id LIMIT 1');
  await page.goto(url(c));
  await expect(page.getByRole('tab',{name:'Audit Record',exact:true})).toBeVisible();
  await expect(page.getByRole('table',{name:'Account history',exact:true})).toBeVisible();
  await expect(page.getByLabel('Print option',{exact:true})).toHaveValue('client');
 });
});
