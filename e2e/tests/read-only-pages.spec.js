const { test, expect } = require('../lib/fixtures');
const { rows } = require('../lib/db');
const { routes } = require('../lib/ui');
test.use({identity:'readonly'});

async function healthy(page, { progressBars = true } = {}) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[role="alert"].MuiAlert-standardError')).toHaveCount(0);
  // Some analytics pages render MUI LinearProgress bars as data (one per row),
  // not as a loading signal, so a nonzero count there does not mean "still
  // loading" — callers on those pages opt out with progressBars:false.
  if (progressBars) await expect(page.getByRole('progressbar')).toHaveCount(0);
}

// PaginationGrid rebuilds its DataGrid `components.Toolbar` (and therefore
// this custom-labeled search field, passed through renderToolbarContent) as a
// fresh inline reference on every render of the owning grid component — the
// same pattern documented on closeForm/fillQuickFilter in lib/ui.js. Right
// after a search response lands, the resulting state update reliably remounts
// the toolbar; occasionally that remount happens WHILE the next .fill() is in
// flight and wins the race, resetting the field back to empty and silently
// dropping the keystrokes — confirmed live: an unprompted, unfiltered
// getInvoicesPaginated request (no search param at all) was observed firing
// between "about to fill" and "filled" on the very search this guards.
// Retrying the whole fill+wait as one unit is robust to a remount landing at
// any point in that window.
async function searchAndWait(page, placeholder, endpointFragment, value) {
  await expect(async () => {
    const response = page.waitForResponse(r => r.url().includes(endpointFragment) && new URL(r.url()).searchParams.get('search') === value, {timeout:3000});
    await page.getByPlaceholder(placeholder).fill(value);
    await response;
  }).toPass({timeout:20000});
}

test('account 1 Accounts Receivable has aging rows, chips and CSV export', async ({page}) => {
  await page.goto('/invoices/accountsReceivable');
  await expect(page.getByRole('heading',{name:'Accounts Receivable',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Export CSV',exact:true})).toBeEnabled();
  // Each bucket label is also a sortable table column header (MuiTableSortLabel,
  // role=button, same accessible name) further down the page — the filter chip
  // is the first match in DOM order since the chip row renders above the table.
  for (const label of ['All ages','0–30 days','31–60 days','61–90 days','> 90 days']) await expect(page.getByRole('button',{name:label,exact:true}).first()).toBeVisible();
  await expect(page.locator('tbody tr').first()).toContainText(/\$[\d,]+\.\d{2}/);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export CSV'}).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  expect(await download.failure()).toBeNull();
  await healthy(page);
});

test('account 1 Account Audit list displays real customers without running an audit', async ({page}) => {
  await page.goto('/invoices/accountAudit');
  await expect(page.getByRole('heading',{name:'Account Audit',exact:true})).toBeVisible();
  await expect(page.locator('tbody tr').first()).toContainText(/\$[\d,]+\.\d{2}/);
  await healthy(page);
});

test('account 1 Customers grid searches real data', async ({page}) => {
  const [customer] = rows('SELECT display_name FROM customers WHERE account_id=1 AND is_customer_active=true ORDER BY customer_id LIMIT 1');
  await page.goto(routes.customers);
  // The grid fetches an unfiltered page 1 on mount, then a debounced, separate
  // fetch for the search term. Waiting for the specific search response (rather
  // than a fixed timeout or the row appearing) avoids the two requests racing.
  await searchAndWait(page, 'Search customers', '/customer/activeCustomers/', customer.display_name);
  await expect(page.getByRole('grid').getByRole('row').filter({hasText:customer.display_name}).first()).toBeVisible();
  await healthy(page);
});

test('account 1 Invoices grid search narrows results and handles no match', async ({page}) => {
  const [invoice] = rows("SELECT invoice_number FROM customer_invoices WHERE account_id=1 AND parent_invoice_id IS NULL AND invoice_number LIKE 'INV-%' ORDER BY customer_invoice_id DESC LIMIT 1");
  await page.goto(routes.invoices);
  // MUI DataGrid v6 data cells carry role="cell" here (not "gridcell" as in a
  // strict ARIA grid pattern) — confirmed against the rendered DOM; filtering
  // on "gridcell" always matched zero cells and made every row look absent.
  const dataRows = page.getByRole('grid').getByRole('row').filter({has:page.getByRole('cell')});

  await searchAndWait(page, 'Search invoices', '/invoices/getInvoicesPaginated/', invoice.invoice_number);
  await expect(dataRows.first()).toContainText(invoice.invoice_number);
  await expect(async () => {
    const texts = await dataRows.allTextContents();
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.every(text => text.includes(invoice.invoice_number))).toBe(true);
  }).toPass();

  await searchAndWait(page, 'Search invoices', '/invoices/getInvoicesPaginated/', 'E2E_NO_SUCH_INVOICE');
  await expect(dataRows).toHaveCount(0);

  await searchAndWait(page, 'Search invoices', '/invoices/getInvoicesPaginated/', invoice.invoice_number);
  await expect(dataRows.first()).toContainText(invoice.invoice_number);
  await healthy(page);
});

for (const [route, heading, metric] of [
  ['clientRates','Client Rates',/Firm median rate/],
  ['timeAllocation','Time Allocation','Total Hours'],
  ['wipAging','WIP / Unbilled Aging','Total Unbilled'],
  ['jobBudgets','Job Budgets','Jobs Tracked'],
  ['taxSeasonCapacity','Tax Season Capacity',`Total Hours ${new Date().getFullYear()}`]
]) {
  // Time Allocation, Job Budgets and Tax Season Capacity render an MUI
  // LinearProgress per row as an actual data visualization (percent consumed /
  // percent of capacity), not a loading spinner — a nonzero progressbar count
  // on those pages is normal and permanent, so the shared "healthy" check must
  // not treat it as still-loading.
  const rendersProgressBarsAsData = ['timeAllocation','jobBudgets','taxSeasonCapacity'].includes(route);

  test(`account 1 Analytics / ${heading} shows numeric data`, async ({page}) => {
    const api = page.waitForResponse(r => r.url().includes(`/analytics/${route}/1/21`) && r.request().method()==='GET');
    await page.goto(`/analytics/${route}`);
    expect((await api).ok()).toBe(true);
    await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
    if (route === 'jobBudgets') {
      // account 1 has zero customer_jobs with an agreed_job_amount on this
      // dataset, so the "Jobs Tracked" summary card legitimately never renders
      // (confirmed via GET /analytics/jobBudgets/1/21 -> {"jobBudgets":[]});
      // assert the page rendered its real empty state instead of the metric.
      await expect(page.getByText(/No jobs have an agreed amount yet\./)).toBeVisible();
    } else {
      const label = page.getByText(metric,{exact:typeof metric==='string'});
      await expect(label.first()).toBeVisible();
      if (route === 'clientRates') await expect(label).toContainText(/\$\d/);
      else await expect(label.first().locator('..')).toContainText(/\d/);
    }
    await healthy(page, {progressBars: !rendersProgressBarsAsData});
  });
}
