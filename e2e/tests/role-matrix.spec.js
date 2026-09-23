const { test, expect } = require('../lib/fixtures');

// Manager tier is not covered: account 9001 has no manager-level fixture user
// (only 90011/90012 employee, 90013 admin, 90014 inactive employee — verified
// via SELECT access_level FROM users WHERE account_id=9001), and the only way
// to create one through the UI (Account Users) is itself blocked by the
// super-admin gate documented in account-users.spec.js. Creating one by
// direct SQL insert into the `users` table would be fabricating a new login
// identity outside the task's enumerated fixture set — out of scope here.
// Admin's own full access is already exercised throughout every other spec
// in this suite (and explicitly, page by page, in auth-and-navigation.spec.js).
test.describe('Employee role gating', () => {
  test.use({ identity: 'employee' });

  // Correction to the task's assumption: buildSidebarRoutes (SidebarRoutes.js)
  // only filters entries flagged requiresAuditor/requiresSuperAdmin — none of
  // Customers/Transactions/Invoices/Jobs/Account Settings carry either flag,
  // and DashboardSidebar.js applies no further access-level filtering of its
  // own. So the sidebar leaf links themselves stay visible (and reachable by
  // expanding their group, same as any role) for every role; only the ROUTE
  // guard (ManagerAndAdminProtectedAccessRoute) refuses the page once you
  // click through. Both halves are verified below: the leaf link is there,
  // and using it lands on the Unauthorized page, not the real one.
  test('sidebar leaf links stay visible but Customers/Transactions/Invoices/Jobs pages are refused', async ({ page }) => {
    await page.goto('/time-tracking/upload');
    await expect(page.getByRole('heading', { name: 'Submit Your Time Tracker', exact: true })).toBeVisible();

    for (const [group, leaf] of [['Customers', 'Customers List'], ['Transactions', 'Transactions'], ['Invoices', 'Invoices'], ['Jobs', 'Customer Jobs']]) {
      const link = page.getByRole('link', { name: leaf, exact: true });
      if (!(await link.isVisible())) await page.getByRole('button', { name: group, exact: true }).click();
      await expect(link).toBeVisible();
    }

    for (const path of ['/customers/customersList', '/transactions/customerTransactions', '/invoices/invoices', '/jobs/jobsList']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Unauthorized', exact: true })).toBeVisible();
      await expect(page.getByText('You are not authorized to access this page.', { exact: true })).toBeVisible();
    }
  });

  test('the backend independently refuses a direct request, not just the frontend route guard', async ({ page }) => {
    // requireManagerOrAdmin (jwt-auth.js) returns 403 for any access_level
    // outside ['manager','admin','super admin','owner'] — 'employee' isn't
    // one of them. Hit the same endpoint the Customers list itself calls
    // (FetchCalls.js's fetchCustomers), bypassing the React page entirely, to
    // confirm the API enforces this on its own.
    const response = await page.request.get('http://127.0.0.1:8003/customer/activeCustomers/9001/90011', { headers: { Cookie: (await page.context().cookies()).map(c => `${c.name}=${c.value}`).join('; ') } });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/unauthorized/i);
  });

  test('Time Tracking upload and history stay reachable', async ({ page }) => {
    await page.goto('/time-tracking/upload');
    await expect(page.getByRole('heading', { name: 'Submit Your Time Tracker', exact: true })).toBeVisible();
    await expect(page.getByText('Unauthorized', { exact: true })).toHaveCount(0);

    await page.goto('/time-tracking/history');
    await expect(page.getByRole('heading', { name: 'Time Tracker History', exact: true })).toBeVisible();
    await expect(page.getByText('Unauthorized', { exact: true })).toHaveCount(0);

    // Settings and Transaction Review ARE manager/admin-gated (unlike upload/
    // history), and Employee Trackers administration is a separate top-level
    // route also gated the same way — all three should refuse an employee.
    for (const path of ['/time-tracking/settings', '/time-tracking/billingReview', '/time-tracking/trackingAdministration']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Unauthorized', exact: true })).toBeVisible();
    }
  });
});
