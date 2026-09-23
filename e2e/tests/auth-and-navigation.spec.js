const { test, expect } = require('../lib/fixtures');
const { authenticate } = require('../lib/auth');
const { routes } = require('../lib/ui');

// Each leaf currently available to account-9001 admin, from SidebarRoutes.js.
const groups = {
  Customers: [['Customers List',routes.customers],['Recurring Customers List','/customers/recurringCustomers']],
  Transactions: [['Transactions',routes.transactions],['Payments',routes.payments],['Pending Payments','/transactions/pendingPayments'],['Retainers and Deposits',routes.retainers],['Write Offs',routes.writeoffs]],
  Invoices: [['Invoices',routes.invoices],['Create Invoice',routes.createInvoice],['Accounts Receivable','/invoices/accountsReceivable']],
  Jobs: [['Customer Jobs',routes.jobs],['Job Types','/jobs/jobTypesList'],['Job Categories','/jobs/jobCategoriesList'],['Work Descriptions','/jobs/workDescriptionsList']],
  'Time Tracking': [['Upload Time Tracker','/time-tracking/upload'],['Your Trackers','/time-tracking/history'],['Employee Trackers','/time-tracking/trackingAdministration'],['Transaction Review','/time-tracking/billingReview'],['Time Tracking Settings','/time-tracking/settings']],
  Account: [['Account Settings','/account/accountSettings'],['Automations','/account/automations']]
};

test('cookie session loads the role default page and survives reload', async ({page,context}) => {
  await page.goto(routes.customers);
  await expect(page.getByPlaceholder('Search customers')).toBeVisible();
  await expect(page.getByRole('grid')).toBeVisible();
  const cookie = (await context.cookies()).find(c => c.name === 'ds2_auth');
  expect(cookie).toMatchObject({httpOnly:true,sameSite:'Strict',domain:'localhost'});
  expect(await page.evaluate(() => document.cookie.includes('ds2_auth'))).toBe(false);
  await page.reload();
  await expect(page.getByPlaceholder('Search customers')).toBeVisible();
  await expect(page).toHaveURL(/\/customers\/customersList$/);
});

for (const [group, leaves] of Object.entries(groups)) {
  for (const [label, path] of leaves) {
    test(`admin sidebar: ${group} / ${label}`, async ({page}) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(routes.customers);
      await expect(page.getByPlaceholder('Search customers')).toBeVisible();
      const link = page.getByRole('link',{name:label,exact:true});
      if (!(await link.isVisible())) await page.getByRole('button',{name:group,exact:true}).click();
      await link.click();
      await expect(page).toHaveURL(new RegExp(path.replaceAll('/','\\/') + '(?:/.*)?$'));
      await page.waitForLoadState('networkidle');
      const headings = {
        '/invoices/createInvoice':'Create New Invoices', '/invoices/accountsReceivable':'Accounts Receivable',
        '/time-tracking/upload':'Submit Your Time Tracker', '/time-tracking/history':'Time Tracker History',
        '/time-tracking/trackingAdministration':'Employee Time Trackers', '/time-tracking/billingReview':'Transaction Review',
        '/time-tracking/settings':'Time Tracker Staff', '/account/accountSettings':'Account Settings', '/account/automations':'Automations'
      };
      if (headings[path]) await expect(page.getByRole('heading',{name:headings[path],exact:true})).toBeVisible();
      else if (path === '/transactions/pendingPayments') await expect(page.getByRole('tab',{name:/New Payments/})).toBeVisible();
      else await expect(page.getByRole('grid')).toBeVisible();
      await expect(page.getByText(/Unauthorized|Something went wrong|Page Not Found/i)).toHaveCount(0);
      // MUI semantic role plus severity class distinguishes informational Alerts.
      await expect(page.locator('[role="alert"].MuiAlert-standardError')).toHaveCount(0);
      expect(errors, `Console/page errors on ${path}`).toEqual([]);
    });
  }
}

test('expired session marker redirects a protected request to login', async ({browser}) => {
  const context = await browser.newContext();
  try {
    await authenticate(context,'admin',true);
    const page = await context.newPage();
    await page.goto('http://localhost:3003/transactions/customerTransactions');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading',{name:'Sign in to DS2'})).toBeVisible();
  } finally { await context.close(); }
});
