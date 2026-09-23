const { test, expect } = require('../lib/fixtures');
const { billedCustomer, finalize, routes } = require('../lib/ui');
const { rows } = require('../lib/db');

// Edit is explicitly, deliberately not built for any transaction-family type:
// TransactionSubRoutes.js, PaymentSubRoutes.js, RetainerSubRoutes.js and
// WriteOffSubRoutes.js each comment out their editX route with "Edit ... is
// not implemented yet" (not a wiring oversight like the Jobs/master-data
// areas — an explicit, acknowledged gap), and no grid ever links to one. So
// this file covers only what the task also asked for and IS live: the
// backend's billed-row delete refusal, surfaced through the UI.
//
// A time entry and a charge share the exact same guard (sharedTransaction
// Functions.js's deleteTransactionCore: `if (stored.customer_invoice_id)
// throw ruleError('Transaction is attached to an invoice and cannot be
// deleted.', 423)` — unconditional on transaction_type), so one covers both;
// Payment's own billed-row refusal (superseded-by-reversal, a different
// reason) is already covered by payments-writeoffs-retainers.spec.js.
test.describe('Billed transaction delete refusal', () => {
  test('finalizing an invoice, then trying to delete the billed time entry, shows the backend refusal', async ({ page, prefix }) => {
    const customer = await billedCustomer(page, prefix);
    const [transaction] = rows(`SELECT transaction_id FROM customer_transactions WHERE account_id=9001 AND customer_id=${customer.id}`);
    await finalize(page, customer);
    // DeleteTimeOrCharge.js's "Delete Transaction" button has no disabled
    // guard at all (unlike the Jobs delete view) — it always opens the
    // confirmation, and only the backend refuses.
    await page.goto(routes.transactions);
    await page.getByPlaceholder('Search transactions').fill(prefix);
    await page.locator(`[role="row"][data-id="${transaction.transaction_id}"]`).click();
    await expect(page).toHaveURL(/deleteTimeOrCharge$/);
    await page.getByRole('button', { name: 'Delete Transaction', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Are you sure you want to delete?');
    const refusalPromise = page.waitForResponse(r => r.url().includes('/transactions/deleteTransaction/') && r.request().method() === 'DELETE');
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    const refusal = await (await refusalPromise).json();
    expect(refusal.status).not.toBe(200);
    expect(refusal.message).toBe('Transaction is attached to an invoice and cannot be deleted.');
    await expect(page.getByRole('alert')).toContainText(refusal.message);
    // Nothing was actually deleted.
    expect(rows(`SELECT transaction_id FROM customer_transactions WHERE account_id=9001 AND transaction_id=${transaction.transaction_id}`)).toHaveLength(1);
  });
});

test.describe('Pending payments page', () => {
  // Full "review dialog" coverage needs real pending-payment rows, which come
  // from a separate bank-feed/CSV subsystem (PendingPaymentsCalls.js's
  // fetchPendingPayments + the Upload tab) this task didn't otherwise touch —
  // not constructed here (see final report). This confirms the page's other
  // three tabs are at least reachable and error-free, extending the existing
  // sidebar-navigation coverage of the New Payments tab alone.
  test('Processed, All Payments and Upload tabs render without error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/transactions/pendingPayments');
    await expect(page.getByRole('tab', { name: 'New Payments', exact: false })).toBeVisible();
    for (const tab of ['Processed', 'All Payments', 'Upload']) {
      await page.getByRole('tab', { name: tab, exact: false }).click();
      await expect(page.locator('[role="alert"].MuiAlert-standardError')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
});
