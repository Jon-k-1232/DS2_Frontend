const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { BACKEND_DIR } = require('../lib/paths');
const { authenticate, identities } = require('../lib/auth');
const { billedCustomer, finalize, invoicePreview, openForm, closeForm, choose, submit, routes } = require('../lib/ui');
const { rows } = require('../lib/db');
const { saveDownload } = require('../lib/download');

// This is the explicitly allowed live UI exception to ds2_scenarios. Every
// mutation uses account 9001 through the already-running local servers.
function guard() {
  const env = require(path.join(BACKEND_DIR, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(BACKEND_DIR, '.env.local')));
  if (!['127.0.0.1', 'localhost'].includes(env.DB_DEV_HOST) || env.DATABASE_NAME !== 'ds2_local' || Number(env.DB_DEV_PORT) !== 5433 || identities.admin.accountID !== 9001 || identities.employee.accountID !== 9001) throw Error('UI path matrix requires local ds2_local fixture account 9001 on port 5433');
  if (!['http://localhost:9000', 'http://127.0.0.1:9000'].includes(env.S3_ENDPOINT)) throw Error('UI path matrix requires local MinIO');
}
guard();
const prefix = `E2E_pm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
let customer, invoice;
const financial = () => rows(`SELECT total_amount_due,remaining_balance_on_invoice FROM customer_invoices WHERE account_id=9001 AND customer_id=${customer.id} ORDER BY customer_invoice_id`);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test.describe.serial('Pass 3 owner decisions on the local screens', () => {
  test.afterAll(async () => {
    guard();
    try { await require('../lib/storage').cleanupObjects(prefix); }
    finally { require('../lib/db').cleanup(prefix); }
  });
  test.beforeEach(async ({ context }) => { guard(); await authenticate(context, 'admin'); });
  test('draft is editable and writes no postings; finalize is sent and locks exactly $22.50', async ({ page }, info) => {
    customer = await billedCustomer(page, prefix);
    const before = rows(`SELECT event_id,event_hash FROM audit_events WHERE account_id=9001 AND customer_id=${customer.id} ORDER BY event_id`);
    await invoicePreview(page, customer, info);
    expect(financial()).toEqual([]);
    expect(rows(`SELECT event_id,event_hash FROM audit_events WHERE account_id=9001 AND customer_id=${customer.id} ORDER BY event_id`)).toEqual(before);
    await finalize(page, customer, { testInfo: info });
    [invoice] = rows(`SELECT customer_invoice_id,invoice_number,total_amount_due FROM customer_invoices WHERE account_id=9001 AND customer_id=${customer.id} AND parent_invoice_id IS NULL`);
    expect(Number(invoice.total_amount_due)).toBe(22.5);
    expect(rows(`SELECT invoice_id FROM invoice_issues WHERE account_id=9001 AND customer_id=${customer.id}`)).toHaveLength(1);
    await page.goto(routes.invoices);
    await page.getByPlaceholder('Search invoices').fill(invoice.invoice_number);
    await page.getByRole('row').filter({ hasText: invoice.invoice_number }).first().click();
    await expect(page.getByText(/Sent — locked ·/)).toBeVisible();
    await page.getByRole('button', { name: 'Flag exception', exact: true }).click();
    await expect(page.getByText('No eligible receipts on this statement.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record exception', exact: true })).toBeDisabled();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /Reprint original/ }).click();
    expect(await (await download).failure()).toBeNull();
  });
  test('retainer refund requires complete fields, refuses overdraft and leaves $20 credit with debt unchanged', async ({ page }) => {
    const d = await openForm(page, routes.retainers, 'New Retainer');
    await choose(page, d, 'Select Customer', customer.name);
    await choose(page, d, 'Select Team Member', 'Admin Person');
    await choose(page, d, 'Form Of Payment', 'Cash');
    await d.getByLabel('Payment Amount', { exact: true }).fill('25');
    await d.getByLabel('Label of Retainer Or Payment').fill(prefix);
    await choose(page, d, 'Type of Hold', 'Retainer');
    await d.getByLabel('Note', { exact: true }).fill(prefix);
    await submit(page, d, '/retainers/create'); await closeForm(page);
    const before = financial();
    await page.goto(`/customers/customersList/customerProfile/${customer.id}/retainersAndPrePayments`);
    await expect(page.getByText('Available credit: $25.00', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review event', exact: true })).toBeDisabled();
    await page.getByLabel('Amount', { exact: true }).fill('26');
    await page.getByRole('textbox', { name: /^Method(?: \*)?$/ }).fill('Check');
    await page.getByRole('textbox', { name: /^Reference(?: \*)?$/ }).fill(prefix);
    await page.getByRole('textbox', { name: /^Reason(?: \*)?$/ }).fill('Return unused local test funds');
    await expect(page.getByText(/The amount exceeds available credit/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review event', exact: true })).toBeDisabled();
    await page.getByLabel('Amount', { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Review event', exact: true }).click();
    const response = page.waitForResponse(r => r.request().method() === 'POST' && /\/retainers\/\d+\/events\/9001\/90013/.test(r.url()));
    await page.getByRole('button', { name: 'Confirm record event', exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(page.getByText('Available credit: $20.00', { exact: true })).toBeVisible();
    expect(financial()).toEqual(before);
    expect(rows(`SELECT amount,available_after FROM retainer_events WHERE account_id=9001 AND customer_id=${customer.id}`).map(r => [Number(r.amount), Number(r.available_after)])).toEqual([[5, 20]]);
  });
  test('duplicate review requires a reason and refuses removal of the sent charge', async ({ page }) => {
    const [work] = rows(`SELECT transaction_id,total_transaction FROM customer_transactions WHERE account_id=9001 AND customer_id=${customer.id}`);
    const before = financial();
    await page.goto('/transactions/possibleDuplicates');
    await expect(page.getByRole('button', { name: 'Flag possible duplicate', exact: true })).toBeDisabled();
    await page.getByLabel('Record ID', { exact: true }).fill(String(work.transaction_id));
    await expect(page.getByRole('button', { name: 'Flag possible duplicate', exact: true })).toBeDisabled();
    await page.getByRole('textbox', { name: /^Reason(?: \*)?$/ }).fill('Local sent record review');
    const response = page.waitForResponse(r => r.request().method() === 'POST' && /\/duplicates\/9001\/90013/.test(r.url()));
    await page.getByRole('button', { name: 'Flag possible duplicate', exact: true }).click();
    expect((await response).status()).toBe(200);
    const [flag] = rows(`SELECT duplicate_id FROM duplicate_flags WHERE account_id=9001 AND customer_id=${customer.id} AND record_id=${work.transaction_id} ORDER BY duplicate_id DESC`);
    await page.getByRole('button', { name: `Review #${flag.duplicate_id}`, exact: true }).click();
    await expect(page.getByText(/Sent records cannot be removed/)).toBeVisible();
    await page.getByRole('textbox', { name: /^Reason(?: \*)?$/ }).fill('Review complete');
    await expect(page.getByRole('button', { name: 'Remove duplicate', exact: true })).toBeDisabled();
    expect(financial()).toEqual(before);
    expect(rows(`SELECT total_transaction FROM customer_transactions WHERE account_id=9001 AND transaction_id=${work.transaction_id}`)[0].total_transaction).toBe(work.total_transaction);
  });
  test('Audit Record rejects reversed dates, prints and reopens identical verified bytes without changing money', async ({ page }, info) => {
    const before = financial();
    await page.goto(`/customers/customersList/customerProfile/${customer.id}/auditRecord`);
    await expect(page.getByRole('table', { name: 'Account history', exact: true })).toBeVisible();
    await page.getByLabel('From', { exact: true }).fill('2026-09-25');
    await page.getByLabel('Through', { exact: true }).fill('2026-09-24');
    await page.getByRole('button', { name: 'Apply dates', exact: true }).click();
    await expect(page.getByText('Start date must not be after end date.', { exact: true })).toBeVisible();
    expect(rows(`SELECT record_id FROM audit_records WHERE account_id=9001 AND customer_id=${customer.id}`)).toEqual([]);
    await page.getByLabel('From', { exact: true }).fill(''); await page.getByLabel('Through', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Apply dates', exact: true }).click();
    const download1 = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Print record', exact: true }).click();
    const first = await download1; expect(await first.failure()).toBeNull(); const firstPath = await saveDownload(first);
    await expect(page.getByRole('button', { name: 'Reopen exact PDF', exact: true })).toBeVisible();
    const download2 = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Reopen exact PDF', exact: true }).click();
    const second = await download2; expect(await second.failure()).toBeNull(); expect(hash(await saveDownload(second))).toBe(hash(firstPath));
    await page.getByRole('button', { name: 'Verify', exact: true }).click(); await expect(page.getByText('Verified', { exact: true })).toBeVisible();
    expect(financial()).toEqual(before);
    await info.attach('immutable-audit-record.pdf', { path: firstPath, contentType: 'application/pdf' });
  });
  test('employee cannot reach Audit Record or its API', async ({ browser }) => {
    guard(); const context = await browser.newContext(); await authenticate(context, 'employee'); const page = await context.newPage();
    try {
      await page.goto(`http://localhost:3003/customers/customersList/customerProfile/${customer.id}/auditRecord`);
      await expect(page.getByRole('heading', { name: 'Unauthorized', exact: true })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Audit Record', exact: true })).toHaveCount(0);
      const response = await context.request.get(`http://localhost:8003/auditRecord/customer/${customer.id}/9001/90011`);
      expect(response.status()).toBe(403); expect((await response.json()).message).toMatch(/Unauthorized/);
    } finally { await context.close(); }
  });
});
