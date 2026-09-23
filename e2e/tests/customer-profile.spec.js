const { test, expect } = require('../lib/fixtures');
const { billedCustomer, finalize, openForm, closeForm, choose, submit, routes, expectGridValueInRow } = require('../lib/ui');
const { rows } = require('../lib/db');

// Each of these sub-tab grids is server-filtered to this one fresh customer
// (customer-router.js's customerByID does per-customer joins), so with a
// single job/transaction/payment/retainer created there is exactly one data
// row — no client-side text filter needed to pick "the right one" out of a
// crowd. That matters here because several of these grids' identifying text
// (a note, the customer name column) sits in a column that's virtualized out
// of the DOM at this viewport width; asserting on the one present data row
// and reading specific fields through the scroll-aware expectGridValueInRow
// (below) is robust to that the way a raw hasText filter isn't.
async function onlyDataRow(page) {
  const row = page.getByRole('grid').locator('[role="row"][data-id]');
  await expect(row).toHaveCount(1);
  return row;
}

test.describe('Customer profile', () => {
  test('every real sub-tab renders the right rows for a customer with invoices, payments and a retainer', async ({ page, prefix }) => {
    const customer = await billedCustomer(page, prefix);
    await finalize(page, customer);
    const [invoice] = rows(`SELECT invoice_number FROM customer_invoices WHERE account_id=9001 AND customer_id=${customer.id} AND parent_invoice_id IS NULL`);

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

    d = await openForm(page, routes.retainers, 'New Retainer');
    await choose(page, d, 'Select Customer', customer.name);
    await choose(page, d, 'Select Team Member', 'Admin Person');
    await choose(page, d, 'Form Of Payment', 'Cash');
    await d.getByLabel('Payment Amount', { exact: true }).fill('15');
    await d.getByLabel('Label of Retainer Or Payment').fill(prefix);
    await choose(page, d, 'Type of Hold', 'Retainer');
    await d.getByLabel('Note', { exact: true }).fill(prefix);
    await submit(page, d, '/retainers/create');
    await closeForm(page);

    // Clicking a customer row (CustomerGrid's routeToPass) lands directly on
    // the Invoices sub-tab.
    await page.goto(routes.customers);
    await page.getByPlaceholder('Search customers').fill(prefix);
    await page.getByRole('row').filter({ hasText: customer.name }).click();
    await expect(page).toHaveURL(new RegExp(`customerProfile/${customer.id}/customerInvoices`));
    await expect(page.getByRole('heading', { name: customer.name, exact: true })).toBeVisible();
    let row = await onlyDataRow(page);
    await expectGridValueInRow(page, row, 'invoice_number', invoice.invoice_number);

    await page.getByRole('tab', { name: 'Transactions', exact: true }).click();
    await expect(page).toHaveURL(/customerTransactions$/);
    row = await onlyDataRow(page);
    await expectGridValueInRow(page, row, 'transaction_type', 'Time');
    await expectGridValueInRow(page, row, 'total_transaction', '22.50');

    await page.getByRole('tab', { name: 'Jobs', exact: true }).click();
    await expect(page).toHaveURL(/customerJobs$/);
    row = await onlyDataRow(page);
    await expectGridValueInRow(page, row, 'job_description', '1040 Individual Return');

    await page.getByRole('tab', { name: 'Payments', exact: true }).click();
    await expect(page).toHaveURL(/customerPayments$/);
    row = await onlyDataRow(page);
    await expectGridValueInRow(page, row, 'payment_amount', '-5.00');

    await page.getByRole('tab', { name: 'Retainers and PrePayments', exact: true }).click();
    await expect(page).toHaveURL(/retainersAndPrePayments$/);
    row = await onlyDataRow(page);
    await expectGridValueInRow(page, row, 'current_amount', '-15.00');

    await page.getByRole('tab', { name: 'Edit Customer Profile', exact: true }).click();
    await expect(page).toHaveURL(/editCustomerProfile$/);
    // Not First/Last Name here — see the dedicated DEFECT test below for why.
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(`${prefix.toLowerCase()}@example.com`);
    await expect(page.getByLabel('City', { exact: true })).toHaveValue('Phoenix');
  });
});

test.describe('Customer profile: multi-word first name', () => {
  // FIXED: EditCustomerProfile.js's setInitialState used to split
  // customer_name on the first space only (`names[0]` -> First Name,
  // `names.slice(1).join(' ')` -> Last Name) — the fix already applied for a
  // multi-word LAST name (single-word first, multi-word last) was never
  // applied for the mirror-image multi-word FIRST name case. Now splits on
  // the LAST space instead: everything before it is the First Name.
  //
  // lib/ui.js's own createCustomer() fixture ("<prefix> Mary Ann" Van
  // Buren") is multi-word on BOTH sides at once, which no single-space-split
  // heuristic (first OR last space) can round-trip unambiguously — it isn't
  // used here for that reason (see its own call sites elsewhere in this
  // file, which deliberately don't assert First/Last Name). This test
  // instead creates a customer with a two-word first name and a one-word
  // last name directly, which unambiguously exercises the fixed "split on
  // the last space" behavior end to end.
  test('a two-word first name splits into the correct First/Last Name fields', async ({ page, prefix }) => {
    const firstName = `${prefix} Mary Ann`;
    const lastName = 'Smith';
    const name = `${firstName} ${lastName}`;
    const dialog = await openForm(page, routes.customers, 'Add Customer');
    await dialog.getByLabel('First Name', { exact: true }).fill(firstName);
    await dialog.getByLabel('Last Name', { exact: true }).fill(lastName);
    for (const [label, value] of Object.entries({ 'Street Address': '123 Sandbox Lane', City: 'Phoenix', State: 'AZ', Zip: '85001', Phone: '6025550100', Email: `${prefix.toLowerCase()}@example.com` })) {
      await dialog.getByLabel(label, { exact: true }).fill(value);
    }
    await submit(page, dialog, '/customer/createCustomer/');
    await closeForm(page);
    await page.getByPlaceholder('Search customers').fill(prefix);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await row.click();
    await page.getByRole('tab', { name: 'Edit Customer Profile', exact: true }).click();
    await expect(page.getByLabel('First Name', { exact: true })).toHaveValue(firstName);
    await expect(page.getByLabel('Last Name', { exact: true })).toHaveValue(lastName);
  });
});

test.describe('Customer profile: nonexistent customer id', () => {
  // ALREADY FIXED in this checkout (verified by reading the source, not a
  // change made this session): FetchCalls.js's fetchCustomerProfileInformation
  // now catches its own axios error for a 404 (customer-router.js's
  // /customer/activeCustomers/customerByID correctly returns
  // {status:404,message:'Customer not found.'}) and returns that
  // {status,message} shape instead of swallowing it into `[]`.
  // CustomerProfileSubRoutes.js gates its ENTIRE <Routes> block (customerJobs,
  // customerTransactions, customerPayments, retainersAndPrePayments,
  // customerInvoices, editCustomerProfile) behind `profileData.status === 200
  // && profileData.customerData?.customerData` and renders an `<Alert
  // severity='error'>{profileData.message}</Alert>` otherwise — so
  // CustomerProfileJobs.js/CustomerRetainers.js/CustomerProfileInvoices.js's
  // own internal "Loading..." guards are unreachable dead code in the failure
  // path; the parent route never mounts them at all for a bad id.
  test('customer profile shows an error state, not infinite Loading, for a nonexistent customer id', async ({ page }) => {
    await page.goto('/customers/customersList/customerProfile/999999999/customerJobs');
    await expect(page.getByText(/not found|no such customer|unknown customer/i)).toBeVisible();
    await expect(page.getByText('Loading...', { exact: true })).toHaveCount(0);
  });
});
