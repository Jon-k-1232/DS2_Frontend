const { test, expect } = require('../lib/fixtures');
const { billedCustomer, finalize, invoicePreview, routes } = require('../lib/ui');
const { rows } = require('../lib/db');
function parents(customer) { return rows(`SELECT customer_invoice_id,invoice_number,total_amount_due FROM customer_invoices WHERE account_id=9001 AND customer_id=${customer.id} AND parent_invoice_id IS NULL`); }

test('CSV preview, finalize ZIP, invoice number and same-day duplicate guard', async ({page,prefix},testInfo) => {
  const c = await billedCustomer(page,prefix);
  await invoicePreview(page,c,testInfo);
  expect(parents(c)).toHaveLength(0);
  await finalize(page,c,{testInfo});
  const first = parents(c);
  expect(first).toHaveLength(1);
  expect(first[0].invoice_number).toMatch(/^INV-\d{4}-\d+$/);
  expect(Number(first[0].total_amount_due)).toBe(22.5);
  await page.goto(routes.invoices);
  await page.getByPlaceholder('Search invoices').fill(first[0].invoice_number);
  await expect(page.getByRole('row').filter({hasText:first[0].invoice_number})).toBeVisible();
  const duplicate = await finalize(page,c,{duplicate:true,testInfo});
  // The specific "why" lives per-customer in skippedCustomers[].reason; the
  // top-level message is a generic "N customer(s) skipped (see details)"
  // summary (invoice-router.js's isFinalized-guard branch), not the reason text.
  expect(duplicate.skippedCustomers).toEqual(expect.arrayContaining([expect.objectContaining({customer_id:c.id,invoice_number:first[0].invoice_number,reason:expect.stringMatching(/already finalized today/i)})]));
  expect(duplicate.message).toMatch(/no invoices created.*1 customer\(s\) skipped/i);
  expect(duplicate.invoicesWithDetail).toEqual([]);
  expect(parents(c)).toEqual(first);
});

test.describe('same-day skip feedback', () => {
  // Was previously conditionally test.fixme'd pending a concurrent frontend
  // fix (see git history) — confirmed landed in the current source
  // (CreateNewInvoices.js): no setTimeout auto-clear of postStatus (comment
  // there: "has to stay on screen until the user has actually read it and
  // dismissed it themselves"), the Alert takes a real onClose handler, and
  // each skipped-customer <li> appends `(${skipped.invoice_number})` when
  // present. Active test, with the close-button and invoice-number pieces
  // the task specifically asked for added below.
  test('same-day skip stays visible, shows the existing invoice number, and can be dismissed', async ({page,prefix}) => {
    const c = await billedCustomer(page,prefix);
    await finalize(page,c);
    const [invoice] = parents(c);
    await finalize(page,c,{duplicate:true});
    const skipAlert = page.getByRole('alert').filter({hasText:/skipped 1 customer/i});
    await expect(skipAlert).toBeVisible();
    await expect(skipAlert).toContainText(invoice.invoice_number);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.getByRole('alert').filter({hasText:/file download failure/i})).toHaveCount(0);
    // The top-level result Alert (distinct from the warning list above) has a
    // real close button and dismisses on click rather than a timer.
    const resultAlert = page.getByRole('alert').filter({hasText:/no invoices created/i});
    await expect(resultAlert).toBeVisible();
    await resultAlert.getByRole('button', {name:/close/i}).click();
    await expect(resultAlert).toHaveCount(0);
  });
});
