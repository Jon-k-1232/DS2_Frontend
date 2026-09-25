const { assertLocalUI } = require('./scenario-safety');
assertLocalUI();
const { expect } = require('@playwright/test');
const { rows, literal } = require('./db');
const { openForm, choose, routes } = require('./ui');
const types = {
  payment: { route: routes.payments, button: 'New Payment', endpoint: '/payments/createPayment/', table: 'customer_payments', amount: 'payment_amount', field: 'Payment Amount', value: '5' },
  writeoff: { route: routes.writeoffs, button: 'New Write Off', endpoint: '/writeOffs/createWriteOffs/', table: 'customer_writeoffs', amount: 'writeoff_amount', field: 'Write Off Amount', value: '2' },
  retainer: { route: routes.retainers, button: 'New Retainer', endpoint: '/retainers/create', table: 'customer_retainers_and_prepayments', amount: 'current_amount', field: 'Payment Amount', value: '25' },
  charge: { route: routes.transactions, button: 'New Charge', endpoint: '/transactions/createTransaction/', table: 'customer_transactions', amount: 'total_transaction', field: 'Unit Cost', value: '10' },
  time: { route: routes.transactions, button: 'Add Time', endpoint: '/transactions/createTransaction/', table: 'customer_transactions', amount: 'total_transaction', field: 'Time (hours)', value: '0.25' }
};
function saved(type, customer) {
  assertLocalUI();
  if (!types[type] || !Number.isInteger(customer.id)) throw Error('Invalid UI fixture');
  const t = types[type];
  return rows(`SELECT * FROM ${t.table} WHERE account_id=9001 AND customer_id=${customer.id} ORDER BY created_at`);
}
function financial(customer) {
  assertLocalUI();
  return Object.fromEntries(['customer_transactions','customer_payments','customer_writeoffs','customer_retainers_and_prepayments','customer_invoices'].map(t=>[t, rows(`SELECT * FROM ${t} WHERE account_id=9001 AND customer_id=${Number(customer.id)} ORDER BY created_at`)]));
}
async function prepare(page, c, type, value = types[type].value) {
  const t = types[type];
  const d = await openForm(page, t.route, t.button);
  await choose(page, d, 'Select Customer', c.name);
  if (type === 'charge' || type === 'time') {
    await choose(page, d, 'Select Job', '1040 Individual Return');
    await choose(page, d, 'Select Team Member', 'Eliza Smith');
    await choose(page, d, 'General Work Description', 'Tax Return Preparation');
    await d.getByLabel('Work Completed On Job').fill(c.prefix);
    if (type === 'charge') await d.getByLabel('Quantity', { exact: true }).fill('2');
  } else {
    await choose(page, d, 'Select Team Member', 'Admin Person');
    if (type === 'payment' || type === 'writeoff') {
      const [invoice] = rows(`SELECT invoice_number FROM customer_invoices WHERE account_id=9001 AND customer_id=${c.id} AND parent_invoice_id IS NULL ORDER BY customer_invoice_id DESC LIMIT 1`);
      const label = type === 'payment' ? 'Select Invoice For Invoice Payment' : 'Select Prior Invoice';
      await d.getByRole('combobox', { name: label, exact: true }).fill(invoice.invoice_number);
      await page.getByRole('option').filter({ hasText: invoice.invoice_number }).click();
    }
    if (type === 'writeoff') await d.getByLabel('Reason For Write Off').fill(`${c.prefix} courtesy`);
    else {
      await choose(page, d, 'Form Of Payment', 'Check');
      await d.getByLabel('Payment Reference Number').fill(c.prefix);
      if (type === 'retainer') {
        await d.getByLabel('Label of Retainer Or Payment').fill(c.prefix);
        await choose(page, d, 'Type of Hold', 'Retainer');
        await d.getByLabel('Note', { exact: true }).fill(c.prefix);
      }
    }
  }
  await d.getByLabel(t.field, { exact: true }).fill(value);
  return d;
}
// Delays a real request; neither fabricates a response nor bypasses the API.
async function doubleSubmit(page, scope, endpoint, name = 'Submit') {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let requests = 0;
  const pattern = `**${endpoint}**`;
  await page.route(pattern, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    requests++;
    await held;
    await route.fallback();
  });
  const response = page.waitForResponse(r => r.url().includes(endpoint) && r.request().method() === 'POST');
  try {
    await scope.getByRole('button', { name, exact: true }).dblclick();
    await expect.poll(() => requests).toBeGreaterThan(0);
    expect(requests, 'A rapid double click must create one request').toBe(1);
    await expect(scope.getByRole('button', { name: /Submitting|Submit|Confirm/, exact: false }).first()).toBeDisabled();
  } finally { release(); }
  const r = await response;
  const body = await r.json();
  expect(r.ok(), JSON.stringify(body)).toBeTruthy();
  expect(body.status).toBe(200);
  await page.unroute(pattern);
  return body;
}
module.exports = { types, saved, financial, prepare, doubleSubmit, literal };
