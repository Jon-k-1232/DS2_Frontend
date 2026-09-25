const { test, expect } = require('../lib/fixtures');
const { billedCustomer, finalize, routes } = require('../lib/ui');
const { rows } = require('../lib/db');

// Finalize is the sent/lock boundary. A fresh detail view prevents ordinary
// deletion; the two-session scenario separately proves the backend refuses
// a delete already open before another session finalizes.
test.describe('Billed transaction delete refusal', () => {
  test('finalizing an invoice locks the billed time entry and directs the user to invoice history', async ({ page, prefix }) => {
    const customer = await billedCustomer(page, prefix);
    const [transaction] = rows(`SELECT transaction_id FROM customer_transactions WHERE account_id=9001 AND customer_id=${customer.id}`);
    await finalize(page, customer);
    await page.goto(routes.transactions);
    await page.getByPlaceholder('Search transactions').fill(prefix);
    await page.locator(`[role="row"][data-id="${transaction.transaction_id}"]`).click();
    await expect(page).toHaveURL(/deleteTimeOrCharge$/);
    await expect(page.getByRole('alert')).toContainText('Sent — locked');
    await expect(page.getByRole('button', { name: 'Delete Transaction', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open invoice history', exact: true })).toBeVisible();
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
