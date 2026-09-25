require('../lib/scenario-safety').assertLocalUI();
const { test, expect } = require('../lib/fixtures');
const { createCustomer, createJob, billedCustomer, finalize, closeForm, openForm, routes, submit } = require('../lib/ui');
const { types, saved, financial, prepare, doubleSubmit } = require('../lib/mistakes');
const { rows } = require('../lib/db');

async function customerFor(page, prefix, type) {
  if (['payment','writeoff'].includes(type)) { const c = await billedCustomer(page,prefix); await finalize(page,c); return c; }
  const c = await createCustomer(page,prefix);
  if (type !== 'retainer') await createJob(page,c);
  return c;
}

for (const type of Object.keys(types)) {
  test(`${type}: rapid double submit saves once with exact arithmetic`, async ({page,prefix}) => {
    const c = await customerFor(page,prefix,type);
    const d = await prepare(page,c,type);
    await doubleSubmit(page,d,types[type].endpoint);
    await expect(d.getByRole('alert')).toContainText(/success|created|added|saved/i);
    const data = saved(type,c);
    expect(data).toHaveLength(1);
    expect(Number(data[0][types[type].amount])).toBe({payment:-5,writeoff:-2,retainer:-25,charge:20,time:22.5}[type]);
    if (['payment','writeoff'].includes(type)) {
      const invoices = rows(`SELECT remaining_balance_on_invoice FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} ORDER BY customer_invoice_id`);
      expect(Number(invoices[0].remaining_balance_on_invoice)).toBe(22.5);
      expect(Number(invoices.at(-1).remaining_balance_on_invoice)).toBe(type === 'payment' ? 17.5 : 20.5);
    }
    await closeForm(page);
    await page.goto(routes.customers); await page.goBack();
    expect(saved(type,c)).toEqual(data);
  });

  test(`${type}: empty form, malformed amount and abandoned edits save nothing`, async ({page,prefix}) => {
    const t = types[type];
    const c = await customerFor(page,prefix,type);
    let d = await openForm(page,t.route,t.button);
    await d.getByRole('button',{name:'Submit',exact:true}).click();
    await expect(d.getByRole('alert')).toContainText(/select|customer|required|invalid/i);
    expect(saved(type,c)).toHaveLength(0);
    await closeForm(page);
    d = await prepare(page,c,type);
    const before = financial(c);
    for (const value of type === 'charge' ? ['', '-1'] : type === 'time' ? ['', '-1'] : ['', '0', '100000000']) {
      await d.getByLabel(t.field,{exact:true}).fill(value);
      await d.getByRole('button',{name:'Submit',exact:true}).click();
      await expect(d.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();
      await expect(d.getByRole('alert').last()).toContainText(/amount|quantity|cost|duration|time|valid|range|required|finite|positive|zero|maximum/i);
      expect(financial(c)).toEqual(before);
    }
    // A number input rejects garbage keystrokes; blank must remain invalid.
    await d.getByLabel(t.field,{exact:true}).fill('');
    await d.getByLabel(t.field,{exact:true}).pressSequentially('garbage');
    await d.getByRole('button',{name:'Submit',exact:true}).click();
    await expect(d.getByRole('alert')).toBeVisible();
    expect(financial(c)).toEqual(before);
    await d.getByLabel(t.field,{exact:true}).fill(t.value);
    await closeForm(page);
    await page.goto(routes.customers); await page.goBack();
    expect(financial(c)).toEqual(before);
  });

  test(`${type}: failed network submit gives an error and leaves the entered form retryable`, async ({page,prefix}) => {
    const c = await customerFor(page,prefix,type);
    const d = await prepare(page,c,type);
    const before = financial(c);
    const pattern = `**${types[type].endpoint}**`;
    await page.route(pattern,route=>route.abort('failed'));
    await d.getByRole('button',{name:'Submit',exact:true}).click();
    await expect(d.getByRole('alert')).toContainText(/error|failed|unable|network/i);
    await expect(d.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();
    expect(financial(c)).toEqual(before);
    await page.unroute(pattern);
    await submit(page,d,types[type].endpoint);
    expect(saved(type,c)).toHaveLength(1);
  });
}

for (const type of ['payment','writeoff','retainer']) {
  test(`${type}: negative entry is one credit, never a reversal`, async ({page,prefix}) => {
    const c = await customerFor(page,prefix,type);
    const d = await prepare(page,c,type,'-5');
    await submit(page,d,types[type].endpoint);
    await expect(d.getByRole('alert')).toContainText(/success|created|added|saved/i);
    expect(saved(type,c)).toHaveLength(1);
    expect(Number(saved(type,c)[0][types[type].amount])).toBe(-5);
  });
}

test('very long work notes survive exactly and a month-end picker keeps the selected calendar date', async ({page,prefix}) => {
  const c = await customerFor(page,prefix,'charge');
  const d = await prepare(page,c,'charge');
  const note = `${prefix} ${'Detailed client work; '.repeat(300)}`;
  await d.getByLabel('Work Completed On Job').fill(note);
  const date = d.getByRole('textbox',{name:'Select Transaction Date',exact:true});
  await date.fill('08/31/2026 11:59 PM'); await date.press('Tab');
  await submit(page,d,types.charge.endpoint);
  await expect(d.getByRole('alert')).toContainText(/success|created|added|saved/i);
  const [row] = saved('charge',c);
  expect(row.detailed_work_description).toBe(note);
  expect(row.transaction_date).toBe('2026-08-31');
  expect(Number(row.total_transaction)).toBe(20);
});
