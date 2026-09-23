const { expect } = require('@playwright/test');
const { rows, literal } = require('./db');
const { rememberObject } = require('./storage');
const routes = { customers: '/customers/customersList', jobs: '/jobs/jobsList', transactions: '/transactions/customerTransactions', payments: '/transactions/customerPayments', writeoffs: '/transactions/customerWriteOffs', retainers: '/transactions/customerRetainers', createInvoice: '/invoices/createInvoice', invoices: '/invoices/invoices' };
async function choose(page, scope, label, text) {
  const input = scope.getByRole('combobox', { name: label, exact: true });
  await input.fill(text);
  // .first(): this is a shared sandbox DB — a concurrent process can insert a
  // same-named fixture (observed live: a second "Eliza Smith", user_id 90047,
  // alongside the real fixture 90011) that makes an exact-text option match
  // resolve to more than one <li>. Every value this suite ever passes here is
  // either a fixed, known-unique catalog entry or a freshly E2E_-prefixed
  // name, so a real duplicate among THIS suite's own data would be a genuine
  // bug — but one from someone else's concurrently-inserted row is noise, not
  // a defect to chase, and the first (lowest option-order, i.e. lowest id)
  // match is always this suite's own canonical fixture.
  await page.getByRole('option', { name: text, exact: true }).first().click();
}
async function submit(page, scope, endpoint, button = 'Submit') {
  const response = page.waitForResponse(r => r.url().includes(endpoint) && ['POST','PUT','PATCH','DELETE'].includes(r.request().method()));
  await scope.getByRole('button', { name: button, exact: true }).click();
  const r = await response;
  const body = await r.json();
  expect(r.ok(), JSON.stringify(body)).toBeTruthy();
  expect(body.status, JSON.stringify(body)).toBe(200);
  return body;
}
async function openForm(page, route, button) {
  await page.goto(route);
  await page.getByRole('button', { name: button, exact: true }).click();
  return page.getByRole('dialog');
}
// A successful submit updates the shared context data that the grid's toolbar
// buttons close over. Components/DataGrids/DataGrid.js still rebuilds its
// DataGrid Toolbar slot as a fresh inline component reference on every parent
// render, so a mutation there remounts the toolbar and its dialog-open state
// resets to closed on its own — no Cancel click needed.
// PaginationGrid.js and ExpandableGrid.js (both edited 2026-09-23, same
// session) were fixed to pass CustomToolbar a STABLE component reference
// instead (componentsProps carries the per-render data), specifically so an
// unrelated parent re-render no longer nukes an open dialog's state or
// in-progress quick-filter typing — see PaginationGrid.js's own comment. One
// side effect: on those two grids the dialog now stays open (reset to a
// blank form) after a successful submit and needs an explicit close. Handle
// both: try a short, race-safe Cancel click (harmless/no-op if the dialog
// already closed itself the old way), then wait for it to be gone either way.
async function closeForm(page) {
  try { await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 3000 }); } catch {}
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
// Jobs/Retainers use the grid's default MUI quick filter (an <input type="search">,
// ARIA role "searchbox" — GridToolbarQuickFilter's aria-label="Search" also lands on
// the outer MuiFormControl wrapper, not the input, so no role/name query finds it).
// Its wrapper's emotion-generated class is a single hashed token like
// "css-11rtsvk-MuiFormControl-root-MuiTextField-root-MuiDataGrid-toolbarQuickFilter"
// — "MuiDataGrid-toolbarQuickFilter" is a suffix of that one long class, not its own
// space-separated class, so a plain ".MuiDataGrid-toolbarQuickFilter" selector (an
// exact-class match) never matches; an attribute-contains selector is required.
async function fillQuickFilter(page, value) {
  await page.locator('[class*="MuiDataGrid-toolbarQuickFilter"] input').fill(value);
}
async function createCustomer(page, prefix) {
  const name = `${prefix} Mary Ann Van Buren`;
  const dialog = await openForm(page, routes.customers, 'Add Customer');
  await dialog.getByLabel('First Name', { exact: true }).fill(`${prefix} Mary Ann`);
  await dialog.getByLabel('Last Name', { exact: true }).fill('Van Buren');
  for (const [label, value] of Object.entries({ 'Street Address':'123 Sandbox Lane', City:'Phoenix', State:'AZ', Zip:'85001', Phone:'6025550100', Email:`${prefix.toLowerCase()}@example.com` })) await dialog.getByLabel(label, {exact:true}).fill(value);
  await submit(page, dialog, '/customer/createCustomer/');
  await closeForm(page);
  await page.getByPlaceholder('Search customers').fill(prefix);
  await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
  const [customer] = rows(`SELECT customer_id FROM customers WHERE account_id=9001 AND display_name=${literal(name)}`);
  expect(customer).toBeTruthy();
  return { name, id: customer.customer_id, prefix };
}
async function createJob(page, customer) {
  const d = await openForm(page, routes.jobs, 'Add New Customer Job');
  await choose(page,d,'Select Customer',customer.name);
  await choose(page,d,'Filter Job Types By Category','Tax Compliance');
  await choose(page,d,'Type Of Job','1040 Individual Return');
  await d.getByLabel('Job Notes').fill(customer.prefix);
  await submit(page,d,'/jobs/create');
  await closeForm(page);
}
async function addTransaction(page, customer, type='Time') {
  const d = await openForm(page, routes.transactions, type === 'Time' ? 'Add Time' : 'New Charge');
  await choose(page,d,'Select Customer',customer.name);
  await choose(page,d,'Select Job','1040 Individual Return');
  await choose(page,d,'Select Team Member','Eliza Smith');
  await choose(page,d,'General Work Description','Tax Return Preparation');
  await d.getByLabel('Work Completed On Job').fill(`${customer.prefix} ${type}`);
  // 0.3h is an exact 6-minute increment: TimeOptions/handleTimeCalculation
  // rounds logged time UP to the next 0.1h (6-minute) increment (see the
  // "Time (hours)" field's own helper text), so a value that isn't already on
  // a 6-minute boundary would silently bill a different quantity than typed
  // (e.g. 0.25h -> rounds up to 0.3h). Use 0.3h to keep quantity/total exact.
  if (type === 'Time') await d.getByLabel('Time (hours)').fill('0.3');
  else { await d.getByLabel('Quantity',{exact:true}).fill('2'); await d.getByLabel('Unit Cost').fill('10'); }
  await expect(d.getByText(type === 'Time' ? /Total:\s*22\.50/ : /Total:\s*20\.00/)).toBeVisible();
  await submit(page,d,'/transactions/createTransaction/');
  await closeForm(page);
  await page.getByPlaceholder('Search transactions').fill(customer.prefix);
  const [transaction] = rows(`SELECT transaction_id FROM customer_transactions WHERE account_id=9001 AND customer_id=${customer.id} AND detailed_work_description=${literal(`${customer.prefix} ${type}`)} ORDER BY transaction_id DESC LIMIT 1`);
  expect(transaction).toBeTruthy();
  const row = page.locator(`[role="row"][data-id="${transaction.transaction_id}"]`);
  await expect(row).toBeVisible();
  await expectGridValue(page,row,'total_transaction',type === 'Time' ? '22.50' : '20.00');
  return row;
}
async function billedCustomer(page, prefix) {
  const customer = await createCustomer(page,prefix);
  await createJob(page,customer);
  await addTransaction(page,customer);
  return customer;
}
// Root cause (found via diagnosis, not a flake): CreateInvoiceGrid.js now
// uses MUI X DataGrid's own default checkboxSelection column instead of a
// custom-rendered one. MUI's built-in row checkbox has a STATE-DEPENDENT
// accessible name — localeTextConstants.js: checkboxSelectionSelectRow
// ('Select row') while unchecked, checkboxSelectionUnselectRow ('Unselect
// row') once checked. A locator built with {name:'Select row'} stops
// resolving to anything the instant the click succeeds, so Playwright's own
// post-click re-verification (or a later re-query, e.g. .check()'s internal
// state check, or this helper's own isChecked()) finds zero elements and
// reports "Clicking the checkbox did not change its state" or hangs waiting
// for a name that will never come back — even though the click landed and
// the row really is selected (confirmed live: grid footer showed "1 row
// selected" while the name-based locator had already gone stale). Target the
// checkbox by MUI's stable cellCheckbox class instead, which does not depend
// on the accessible name / selection state.
async function selectInvoiceRow(page, row) {
  await expect(row).toBeVisible();
  const checkbox = row.locator('.MuiDataGrid-cellCheckbox input[type="checkbox"]');
  if (!(await checkbox.isChecked())) await checkbox.click();
  await expect(checkbox).toBeChecked();
}
// CreateNewInvoices.js fetches the outstanding-balance list ONCE per mount
// (a plain useEffect on []), computed server-side across every customer with
// a nonzero balance. Under the load this shared sandbox is under from
// concurrent activity, that computation can occasionally not yet reflect a
// transaction this same test committed moments earlier (observed live:
// "8 rows hidden" from other customers, zero rows for a search on a brand
// new, already-committed-and-verified-in-the-DB customer) — a fresh mount
// (re-navigate) picks up a fresh fetch. Retry the whole
// navigate+search+wait-for-row cycle rather than trusting one mount's fetch.
async function findInvoiceRow(page, customer) {
  const row = page.getByRole('row').filter({hasText:customer.name});
  await expect(async () => {
    await page.goto(routes.createInvoice);
    await page.getByPlaceholder('Search by name or business').fill(customer.prefix);
    await expect(row).toBeVisible({timeout:5000});
  }).toPass({timeout:60000});
  return row;
}
async function finalize(page, customer, { duplicate=false, testInfo } = {}) {
  const row = await findInvoiceRow(page, customer);
  if (!duplicate) await expectGridValue(page,customer.name,'invoice_total','22.50');
  await selectInvoiceRow(page, row);
  await page.getByLabel('Create CSV Only').uncheck();
  await page.getByLabel('Lock And Finalize Selected Invoices').check();
  await page.getByRole('button',{name:'Submit',exact:true}).click();
  const responsePromise = page.waitForResponse(r => r.url().includes('/invoices/create') && r.request().method() === 'POST');
  const downloadPromise = duplicate ? null : page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();
  const response = await responsePromise;
  const body = await response.json();
  if (body.fileLocation) rememberObject(customer.prefix,body.fileLocation);
  if (testInfo) await testInfo.attach(duplicate ? 'duplicate-result' : 'finalize-result',{body:JSON.stringify({status:body.status,message:body.message,skippedCustomers:body.skippedCustomers,fileLocation:body.fileLocation},null,2),contentType:'application/json'});
  expect(body.status,JSON.stringify(body)).toBe(200);
  if (downloadPromise) {
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
    expect(await download.failure()).toBeNull();
    const file = await download.path();
    const entries = require('child_process').execFileSync('unzip',['-Z1',file],{encoding:'utf8'});
    expect(entries).toMatch(/\.pdf(?:\r?\n|$)/i);
    if (testInfo) await testInfo.attach('finalized-invoice.zip',{path:file,contentType:'application/zip'});
  }
  return body;
}
module.exports = { expectGridValue, expectGridValueInRow, invoicePreview, deleteCustomer, routes, choose, submit, openForm, closeForm, fillQuickFilter, createCustomer, createJob, addTransaction, billedCustomer, finalize };

// Scroll the real MUI grid horizontally to materialize a virtualized column.
// data-field is the public MUI grid column identifier, not a generated class.
// Re-derives the cell through a fresh grid-wide "[data-id=X] [data-field=Y]"
// lookup (rather than searching only inside the already-resolved row locator)
// because grids with a pinned checkbox-selection column render that column in
// a DOM section separate from the scrollable data columns; only a query from
// the grid root reaches both. Safe to key by data-id here because every grid
// this is used against (Customers, Transactions, Payments, WriteOffs,
// Retainers, Jobs, CreateInvoiceGrid) passes a real getRowId/idField.
async function expectGridValue(page, rowText, field, value) {
  const grid = page.getByRole('grid');
  const scroller = grid.locator('.MuiDataGrid-virtualScroller');
  const row = typeof rowText === 'string' ? page.getByRole('row').filter({hasText:rowText}) : rowText;
  const id = await row.getAttribute('data-id');
  const cell = grid.locator(`[role="row"][data-id="${id}"] [data-field="${field}"]`);
  await expectCellValue(page, scroller, cell, value);
}
// Same scroll-until-materialized wait as expectGridValue, but reads the cell
// directly off an already-unique row locator instead of re-deriving it by
// data-id. The Invoices grid is the one exception to the getRowId note above
// — DS2_Frontend's InvoicesGrid.js never passes a getRowId to PaginationGrid,
// so every one of its rows renders with the literal id "undefined-undefined"
// (a product defect: see CustomerGrid.js's working getRowId for comparison),
// which makes a data-id re-lookup ambiguous whenever more than one row is on
// screen. Only use this for a row locator you've already made unique some
// other way (e.g. filtering out child invoice snapshot rows structurally).
async function expectGridValueInRow(page, row, field, value) {
  const grid = page.getByRole('grid');
  const scroller = grid.locator('.MuiDataGrid-virtualScroller');
  const cell = row.locator(`[data-field="${field}"]`);
  await expectCellValue(page, scroller, cell, value);
}
async function expectCellValue(page, scroller, cell, value) {
  const width = await scroller.evaluate(el => el.scrollWidth);
  for (let left=0; left<=width; left+=500) {
    await scroller.evaluate((el,x) => { el.scrollLeft=x; },left);
    if (await cell.count()) break;
    await page.waitForTimeout(50); // allow MUI's virtual window to paint
  }
  await expect(cell).toContainText(value);
  await scroller.evaluate(el => { el.scrollLeft=0; });
}
async function invoicePreview(page, customer, testInfo) {
  const row = await findInvoiceRow(page, customer);
  await expectGridValue(page,customer.name,'invoice_total','22.50');
  await selectInvoiceRow(page, row);
  await expect(page.getByLabel('Create CSV Only')).toBeChecked();
  const downloadPromise = page.waitForEvent('download');
  const body = await submit(page,page,'/invoices/createInvoice/');
  rememberObject(customer.prefix,body.fileLocation);
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  expect(await download.failure()).toBeNull();
  const file = await download.path();
  const entries = require('child_process').execFileSync('unzip',['-Z1',file],{encoding:'utf8'}).trim().split('\n');
  expect(entries.some(name => name.endsWith('.csv'))).toBe(true);
  if (testInfo) await testInfo.attach('csv-preview.zip',{path:file,contentType:'application/zip'});
}
async function deleteCustomer(page, customer) {
  await page.goto(routes.customers);
  await page.getByPlaceholder('Search customers').fill(customer.prefix);
  await page.getByRole('row').filter({hasText:customer.name}).click();
  await page.getByRole('tab',{name:'Edit Customer Profile'}).click();
  await expect(page.getByLabel('First Name',{exact:true})).not.toHaveValue('');
  await submit(page,page,'/customer/deleteCustomer/','Delete Customer');
  await expect(page).toHaveURL(/customersList$/);
  await page.getByPlaceholder('Search customers').fill(customer.prefix);
  await expect(page.getByRole('row').filter({hasText:customer.name})).toHaveCount(0);
}
