const { test, expect } = require('../lib/fixtures');
const { authenticate } = require('../lib/auth');

// analytics/* is wrapped in SuperAdminProtectedAccessRoute at the router level
// (PrimaryRouter.js) — same gate as Account Users and Account Audit. Account
// 9001's admin fixture (90013) is 'admin', not 'super admin', so every
// Analytics page is unreachable for the identity this suite writes with; only
// account 1's user 21 (readonly, per the suite's hard rules) can view them,
// which is exactly what read-only-pages.spec.js already does for all five
// pages' data-rendering. The one piece that spec doesn't cover yet is CSV
// export, which only two of the five pages actually have (grepped: Client
// Rates and Time Allocation; WIP/Unbilled Aging, Job Budgets and Tax Season
// Capacity have no export at all).
test.use({ identity: 'readonly' });

test.describe('Analytics CSV export (account 1, read-only)', () => {
  test('admin identity cannot reach any Analytics page', async ({ browser }) => {
    // Documented once here rather than in every read-only test above: confirm
    // the gate itself with the write-capable identity, matching the pattern
    // already established for Account Users / Account Audit.
    const context = await browser.newContext();
    try {
      await authenticate(context, 'admin');
      const page = await context.newPage();
      await page.goto('http://localhost:3003/analytics/clientRates');
      await expect(page.getByRole('heading', { name: 'Unauthorized', exact: true })).toBeVisible();
      await expect(page.getByText('This page is restricted to super admins.', { exact: true })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('Client Rates CSV button downloads a file', async ({ page }) => {
    await page.goto('/analytics/clientRates');
    await expect(page.getByRole('heading', { name: 'Client Rates', exact: true })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    expect(await download.failure()).toBeNull();
  });

  test('Time Allocation CSV button downloads a file', async ({ page }) => {
    await page.goto('/analytics/timeAllocation');
    await expect(page.getByRole('heading', { name: 'Time Allocation', exact: true })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    expect(await download.failure()).toBeNull();
  });
});
