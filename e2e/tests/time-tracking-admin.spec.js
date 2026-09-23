const { test, expect } = require('../lib/fixtures');
const { createCustomer } = require('../lib/ui');

// Both routes below share the exact super-admin gate already established for
// Account Users / Account Audit / Analytics: account 9001's admin fixture
// (90013) is 'admin', not 'super admin', so these are hard refusals for the
// identity this suite writes with, not something to work around.
test.describe('Update Master Tracker Template (super-admin gate)', () => {
  test('admin identity is refused uploading a template', async ({ page }) => {
    await page.goto('/time-tracking/update-template');
    await expect(page.getByRole('heading', { name: 'Unauthorized', exact: true })).toBeVisible();
    await expect(page.getByText('This page is restricted to super admins.', { exact: true })).toBeVisible();
    await expect(page.locator('input[type=file]')).toHaveCount(0);
  });
});

test.describe('Customer AI Audit tab (super-admin gate)', () => {
  test('admin identity is refused a customer\'s AI Audit tab, and the tab is hidden', async ({ page, prefix }) => {
    const customer = await createCustomer(page, prefix);
    await page.getByRole('row').filter({ hasText: customer.name }).click();
    // canAccessAccountAudit gates both the AI Audit TAB (CustomerProfileSubRoutes.js's
    // fetchMenuOptions only adds it when showAudit is true) and the route itself
    // — confirm neither is reachable for admin.
    await expect(page.getByRole('tab', { name: 'AI Audit', exact: true })).toHaveCount(0);
    await page.goto(`/customers/customersList/customerProfile/${customer.id}/aiAudit`);
    await expect(page.getByRole('heading', { name: 'Unauthorized', exact: true })).toBeVisible();
    await expect(page.getByText('You are not authorized to access the Account Audit module.', { exact: true })).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('an unknown route shows the 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-e2e');
    await expect(page.getByText('Sorry, page not found!', { exact: true })).toBeVisible();
    // Page404.js's Button uses component={RouterLink}, which renders a plain
    // <a href> — MUI doesn't override its inherent ARIA role to "button".
    await expect(page.getByRole('link', { name: 'Go to Home', exact: true })).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  // FIXED: Dashboard.js:8 renders exactly one `<h1>Welcome</h1>` in source,
  // but visiting /dashboard used to render it TWICE (confirmed via DOM,
  // reproduced on two separate runs: getByRole('heading',{name:'Welcome'})
  // resolved to 2 identical <h1>Welcome</h1> elements, one above the other).
  // Root cause: Dashboard.js renders both its own <h1>Welcome</h1> AND
  // <EmployeeTimeWidget />, and EmployeeTimeWidget.js (a stub whose real
  // fetch logic is commented out) independently rendered its OWN
  // <h1>Welcome</h1> — neither the router (PrimaryRouter.js/
  // DashboardRoutes.js, which register the dashboard route exactly once) nor
  // index.js/App.js (exactly one <Router>) was the cause. Fixed by removing
  // the duplicate heading from EmployeeTimeWidget.js.
  test('dashboard renders its welcome heading once', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toHaveCount(1);
  });
});
