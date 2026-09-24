const { test, expect } = require('../lib/fixtures');
const { billedCustomer, createCustomer, finalize, routes, openForm, closeForm, choose, submit, expectGridValue, expectGridValueInRow, fillQuickFilter } = require('../lib/ui');
const { rows } = require('../lib/db');

test('payment, write-off, positive reversal and original-payment refusal refresh grids', async ({page,prefix}) => {
  const c = await billedCustomer(page,prefix);
  await finalize(page,c);
  const [invoice] = rows(`SELECT invoice_number FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL`);
  let d = await openForm(page,routes.payments,'New Payment');
  await choose(page,d,'Select Customer',c.name);
  await d.getByRole('combobox',{name:'Select Invoice For Invoice Payment',exact:true}).fill(invoice.invoice_number);
  await page.getByRole('option').filter({hasText:invoice.invoice_number}).click();
  await choose(page,d,'Select Team Member','Admin Person');
  await choose(page,d,'Form Of Payment','Check');
  await d.getByLabel('Payment Reference Number').fill(prefix);
  await d.getByLabel('Payment Amount',{exact:true}).fill('5');
  await submit(page,d,'/payments/createPayment/');
  await closeForm(page);
  // No reload: the mounted grid must refresh after the mutation.
  await page.getByPlaceholder('Search payments').fill(prefix);
  await expectGridValue(page,c.name,'payment_amount','-5.00');
  const [payment] = rows(`SELECT payment_id,payment_amount FROM customer_payments WHERE account_id=9001 AND customer_id=${c.id}`);
  expect(Number(payment.payment_amount)).toBe(-5);

  d = await openForm(page,routes.writeoffs,'New Write Off');
  await choose(page,d,'Select Customer',c.name);
  await d.getByRole('combobox',{name:'Select Prior Invoice'}).fill(invoice.invoice_number);
  await page.getByRole('option').filter({hasText:invoice.invoice_number}).click();
  await choose(page,d,'Select Team Member','Admin Person');
  await d.getByLabel('Reason For Write Off').fill(`${prefix} courtesy`);
  await d.getByLabel('Write Off Amount').fill('2');
  await submit(page,d,'/writeOffs/createWriteOffs/');
  await closeForm(page);
  await page.getByPlaceholder('Search write-offs').fill(prefix);
  await expectGridValue(page,c.name,'writeoff_amount','-2.00');

  await page.goto(routes.payments);
  await page.getByPlaceholder('Search payments').fill(prefix);
  await page.getByRole('row').filter({hasText:prefix}).click();
  await page.getByRole('tab',{name:'Reverse Payment (NSF)',exact:true}).click();
  await page.getByLabel('Reason',{exact:true}).fill(`${prefix} NSF returned check`);
  await submit(page,page,'/payments/reversePayment/','Reverse Payment');
  await expect(page).toHaveURL(/customerPayments$/);
  await page.getByPlaceholder('Search payments').fill(prefix);
  const reversal = rows(`SELECT payment_id,payment_amount FROM customer_payments WHERE account_id=9001 AND customer_id=${c.id} AND payment_amount>0`);
  expect(reversal).toHaveLength(1);
  expect(Number(reversal[0].payment_amount)).toBe(5);
  const reversalRow = page.locator(`[role="row"][data-id="${reversal[0].payment_id}"]`);
  await expect(reversalRow).toBeVisible();
  await expectGridValue(page,reversalRow,'payment_amount','5.00');
  const original = page.locator(`[role="row"][data-id="${payment.payment_id}"]`);
  await original.click();
  await page.getByRole('button',{name:'Delete Payment',exact:true}).click();
  const refusalPromise = page.waitForResponse(r => r.url().includes('/payments/deletePayment/') && r.request().method()==='DELETE');
  await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
  const refusal = await (await refusalPromise).json();
  expect(refusal.status).not.toBe(200);
  expect(refusal.message).toMatch(/newer|revers|billed|latest/i);
  await expect(page.getByRole('alert')).toContainText(refusal.message);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Delete Payment',exact:true})).toBeEnabled();
  expect(rows(`SELECT payment_id FROM customer_payments WHERE account_id=9001 AND payment_id=${payment.payment_id}`)).toHaveLength(1);
  // 22.50 invoice total - 5 payment - 2 write-off + 5 reversal (adds the
  // reversed payment back) = 20.50.
  const [parent] = rows(`SELECT remaining_balance_on_invoice FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL`);
  expect(Number(parent.remaining_balance_on_invoice)).toBe(20.5);
  await page.goto(routes.invoices);
  await page.getByPlaceholder('Search invoices').fill(invoice.invoice_number);
  // Payments/write-offs insert a child snapshot row per mutation, and every
  // child mirrors the SAME invoice_number as its parent (three mutations above
  // -> up to three extra rows here, two of which — the parent and the latest
  // child — both legitimately show the current 20.50) — a plain hasText
  // filter's .first() can land on an older snapshot instead. The parent row
  // is the one whose own Parent Invoice Id cell is empty. Resolve that while
  // the (early, always-materialized) Parent Invoice Id column is still on
  // screen, and key the later scroll-to-find-the-balance-column lookup off
  // data-rowindex (stable across horizontal scroll) rather than re-filtering
  // by Parent Invoice Id, which gets virtualized out of the DOM once the grid
  // scrolls right to materialize remaining_balance_on_invoice.
  // The quick filter re-renders the grid asynchronously; under load the rows
  // are not all on screen yet when the search value lands, so poll until the
  // parent row (empty Parent Invoice Id) is actually rendered instead of
  // reading whatever happens to be there on the first pass.
  const candidateRows = page.getByRole('grid').getByRole('row').filter({hasText:invoice.invoice_number});
  const findParentRowIndex = async () => {
    const n = await candidateRows.count();
    for (let i = 0; i < n; i++) {
      const cell = candidateRows.nth(i).locator('[data-field="parent_invoice_id"]');
      if ((await cell.count()) === 0) continue; // column not materialized for this row yet
      const content = cell.locator('.MuiDataGrid-cellContent');
      const text = (await content.count()) ? ((await content.first().textContent()) ?? '') : '';
      if (!text.trim()) return await candidateRows.nth(i).getAttribute('data-rowindex');
    }
    return null;
  };
  let parentRowIndex = null;
  await expect.poll(async () => { parentRowIndex = await findParentRowIndex(); return parentRowIndex; }, { message: 'expected one row with an empty Parent Invoice Id cell', timeout: 20_000 }).not.toBeNull();
  const parentRow = page.getByRole('grid').locator(`[role="row"][data-rowindex="${parentRowIndex}"]`);
  await expectGridValueInRow(page,parentRow,'remaining_balance_on_invoice','20.50');
});

test('create a negative retainer credit and delete it through the UI', async ({page,prefix}) => {
  const c = await createCustomer(page,prefix);
  const d = await openForm(page,routes.retainers,'New Retainer');
  await choose(page,d,'Select Customer',c.name);
  await choose(page,d,'Select Team Member','Admin Person');
  await choose(page,d,'Form Of Payment','Cash');
  await d.getByLabel('Payment Amount',{exact:true}).fill('25');
  await d.getByLabel('Label of Retainer Or Payment').fill(prefix);
  await choose(page,d,'Type of Hold','Retainer');
  await d.getByLabel('Note',{exact:true}).fill(prefix);
  await submit(page,d,'/retainers/create');
  await closeForm(page);
  await fillQuickFilter(page, prefix);
  const row = page.getByRole('row').filter({hasText:prefix});
  await expectGridValue(page,row,'current_amount','-25.00');
  const [retainer] = rows(`SELECT current_amount FROM customer_retainers_and_prepayments WHERE account_id=9001 AND customer_id=${c.id}`);
  expect(Number(retainer.current_amount)).toBe(-25);
  await row.click();
  await page.getByRole('button',{name:/Delete Retainer/i}).click();
  await submit(page,page.getByRole('dialog'),'/retainers/delete','Delete');
  await expect(page).toHaveURL(/customerRetainers$/);
  await fillQuickFilter(page, prefix);
  await expect(page.getByRole('row').filter({hasText:prefix})).toHaveCount(0);
  await require('../lib/ui').deleteCustomer(page,c);
});
