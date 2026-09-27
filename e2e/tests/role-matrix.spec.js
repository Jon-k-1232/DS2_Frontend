const { test, expect } = require('../lib/fixtures');

// Ordinary financial pages keep their existing employee restrictions.
// H1 transfer history remains readable; H3's correction suite independently
// covers manager, employee and both admin action permissions.
test.describe('Employee role gating', () => {
  test.use({ identity: 'employee' });

  test('employee navigation retains transfer history while guarded financial pages stay protected', async ({ page }) => {
    await page.goto('/time-tracking/upload');
    const nav=page.getByRole('navigation',{name:'Primary navigation'});
    for(const group of ['Clients','Time & Work','Billing','Receivables','Reports','Settings'])await expect(nav.getByRole('button',{name:group,exact:true})).toHaveCount(0);
    await expect(nav.getByRole('link',{name:'Upload time tracker',exact:true})).toBeVisible();
    await expect(nav.getByRole('link',{name:'Your trackers',exact:true})).toBeVisible();
    const payments=nav.getByRole('button',{name:'Payments & Credits',exact:true});await payments.click();await expect(nav.getByRole('link',{name:'Credit transfers',exact:true})).toBeVisible();await expect(nav.getByRole('link',{name:'Receive payment',exact:true})).toHaveCount(0);
    for (const path of ['/clients','/work/entries','/billing/invoices','/work/jobs','/customers/customersList','/transactions/customerTransactions','/jobs/jobsList','/invoices/invoices']) {
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

    await page.getByRole('button',{name:'Account menu',exact:true}).click();await page.getByRole('menuitem',{name:'Home',exact:true}).click();await expect(page).toHaveURL('/time-tracking/upload');

    // Settings and Transaction Review ARE manager/admin-gated (unlike upload/
    // history), and Employee Trackers administration is a separate top-level
    // route also gated the same way — all three should refuse an employee.
    for (const path of ['/settings/tracker', '/work/review', '/time-tracking/trackingAdministration']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Unauthorized', exact: true })).toBeVisible();
    }
  });
});
