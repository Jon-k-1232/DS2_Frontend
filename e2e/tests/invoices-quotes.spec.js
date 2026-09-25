const { test, expect } = require('../lib/fixtures');
const { billedCustomer, finalize, openForm, closeForm, choose, submit, routes } = require('../lib/ui');
const { rows } = require('../lib/db');

test.describe('Invoice detail', () => {
  test('an issued statement stays frozen while later receipts change its separately displayed current balance', async ({ page, prefix }) => {
    const customer = await billedCustomer(page, prefix);
    await finalize(page, customer);
    const [invoice] = rows(`SELECT customer_invoice_id,invoice_number FROM customer_invoices WHERE account_id=9001 AND customer_id=${customer.id} AND parent_invoice_id IS NULL`);

    let d = await openForm(page, routes.payments, 'New Payment');
    await choose(page, d, 'Select Customer', customer.name);
    await d.getByRole('combobox', { name: 'Select Invoice For Invoice Payment', exact: true }).fill(invoice.invoice_number);
    await page.getByRole('option').filter({ hasText: invoice.invoice_number }).click();
    await choose(page, d, 'Select Team Member', 'Admin Person');
    await choose(page, d, 'Form Of Payment', 'Check');
    await d.getByLabel('Payment Reference Number').fill(prefix);
    await d.getByLabel('Payment Amount', { exact: true }).fill('5');
    await submit(page, d, '/payments/createPayment/');
    await closeForm(page);

    d = await openForm(page, routes.writeoffs, 'New Write Off');
    await choose(page, d, 'Select Customer', customer.name);
    await d.getByRole('combobox', { name: 'Select Prior Invoice' }).fill(invoice.invoice_number);
    await page.getByRole('option').filter({ hasText: invoice.invoice_number }).click();
    await choose(page, d, 'Select Team Member', 'Admin Person');
    await d.getByLabel('Reason For Write Off').fill(`${prefix} courtesy`);
    await d.getByLabel('Write Off Amount').fill('2');
    await submit(page, d, '/writeOffs/createWriteOffs/');
    await closeForm(page);

    await page.goto(routes.invoices);
    await page.getByPlaceholder('Search invoices').fill(invoice.invoice_number);
    await page.locator(`[role="row"][data-id="${invoice.customer_invoice_id}"]`).click();
    await expect(page).toHaveURL(/invoiceDetail\/invoiceTransactions$/);
    // InvoiceDetails.js renders three side-by-side <table>s: contact info
    // (customer name/address), invoice identity (invoice number/dates), and
    // totals (beginning balance..amount due) — the invoice number is in the
    // second one.
    await expect(page.getByRole('table').nth(1)).toContainText(invoice.invoice_number);
    // These receipts arrived after finalize. They change current debt but
    // cannot rewrite the original issued totals or its frozen membership.
    const totals = page.getByRole('table').nth(2);
    await expect(totals).toContainText('Total Amount Due:22.50');
    await expect(totals).toContainText('Total Payments:0.00');
    await expect(totals).toContainText('Total Write Offs:0.00');
    await expect(totals).toContainText('Current balance:15.5');

    await page.getByRole('tab', { name: 'Payments', exact: true }).click();
    await expect(page).toHaveURL(/invoiceDetail\/invoicePayments$/);
    await expect(page.getByRole('grid').locator('[role="row"][data-id]')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Write Offs', exact: true }).click();
    await expect(page).toHaveURL(/invoiceDetail\/invoiceWriteOffs$/);
    await expect(page.getByRole('grid').locator('[role="row"][data-id]')).toHaveCount(0);
    expect(rows(`SELECT payment_amount FROM customer_payments WHERE account_id=9001 AND customer_id=${customer.id}`).map(r=>Number(r.payment_amount))).toEqual([-5]);
    expect(rows(`SELECT writeoff_amount FROM customer_writeoffs WHERE account_id=9001 AND customer_id=${customer.id}`).map(r=>Number(r.writeoff_amount))).toEqual([-2]);
  });
});

// /invoices/quotes has no sidebar link (SidebarRoutes.js comments out the
// Quotes entry) and no create/delete UI at all: QuotesGrid.js passes no
// arrayOfButtons, no enableSingleRowClick and no routeToPass — a pure
// read-only display. The backend's POST /quotes/createQuote, PUT
// /quotes/updateQuote and DELETE /quotes/deleteQuote (quotes-router.js) are
// never called from anywhere in the frontend (grepped PostCalls.js/PutCalls.
// js/DeleteCalls.js — no reference at all), and the one place that once
// linked to a create-quote view is commented out in InvoiceRoutes.js pointing
// at the wrong component (`<WriteOff .../>` for a route named createQuote)
// even in its dead state. Per the task's own instructions this is a
// genuinely unsupported UI path (not fabricated here) — create/delete stay
// uncovered; only the "renders, doesn't hang" defect below was fixed.
//
// FIXED: QuotesGrid.js gated its render on `customerData.quotesList` being
// truthy, but getInitialAppData (FetchCalls.js) never fetched or set a
// quotesList key at all — confirmed by grep (no "quotesList" anywhere near
// getInitialAppData) and by DOM (the page body never advanced past
// "Loading..."). Fixed with a dedicated fetch on this page (QuotesGrid.js
// now calls the existing GET /quotes/getActiveQuotes/:accountID/:userID via
// a new FetchCalls.fetchQuotesList and merges the result into customerData)
// rather than touching the shared initial-app-data blob — account 9001 has
// zero quotes today, so this also exercises the grid's empty state (MUI's
// built-in "No rows" overlay inside a still-present grid, not a permanent
// Loading screen).
test.describe('Quotes', () => {
  test('the quotes list renders its real content, not permanent Loading', async ({ page }) => {
    await page.goto('/invoices/quotes');
    await expect(page.getByRole('grid')).toBeVisible();
    await expect(page.getByText('Loading...', { exact: true })).toHaveCount(0);
  });
});

test.describe('Accounts Receivable (account 9001)', () => {
  test('age-filter chips narrow the AR table for a real 9001 balance', async ({ page, prefix }) => {
    const customer = await billedCustomer(page, prefix);
    await finalize(page, customer);

    await page.goto('/invoices/accountsReceivable');
    await expect(page.getByRole('heading', { name: 'Accounts Receivable', exact: true })).toBeVisible();
    // A brand-new invoice is 0 days old — must show under "All ages" and
    // under "0–30 days", and disappear from the older buckets.
    for (const label of ['All ages', '0–30 days']) {
      await page.getByRole('button', { name: label, exact: true }).first().click();
      await expect(page.getByRole('row').filter({ hasText: customer.name })).toBeVisible();
    }
    for (const label of ['31–60 days', '61–90 days', '> 90 days']) {
      await page.getByRole('button', { name: label, exact: true }).first().click();
      await expect(page.getByRole('row').filter({ hasText: customer.name })).toHaveCount(0);
    }
  });
});

test.describe('Account Audit (super-admin gate)', () => {
  // Same root cause as Account Users (see account-users.spec.js): canAccess
  // AccountAudit requires accessLevel === 'super admin' exactly, and account
  // 9001 has no super-admin fixture user — only account 1's user 21, which is
  // read-only. The chips/toggles this page offers (All/Billing Ready/Needs
  // Audit/Matched/Mismatched, "Hide $0 app balance") cannot be exercised
  // against account 9001 data for the same reason Account Users' CRUD can't.
  test('admin identity is refused the Account Audit page', async ({ page }) => {
    await page.goto('/invoices/accountAudit');
    await expect(page.getByRole('heading', { name: 'Unauthorized', exact: true })).toBeVisible();
    await expect(page.getByText('You are not authorized to access the Account Audit module.', { exact: true })).toBeVisible();
  });
});
