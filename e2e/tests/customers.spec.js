const { test, expect } = require('../lib/fixtures');
const { createCustomer, routes, submit } = require('../lib/ui');
test('create, open profile, edit and preserve a multi-word customer name', async ({page,prefix}) => {
  const c = await createCustomer(page,prefix);
  await page.getByRole('row').filter({hasText:c.name}).click();
  await expect(page).toHaveURL(new RegExp(`clients/${c.id}/`));
  await page.getByRole('tab', {name:'Edit client',exact:true}).click();
  await expect(page.getByLabel('City',{exact:true})).toHaveValue('Phoenix');
  await page.getByLabel('City',{exact:true}).fill('Scottsdale');
  await submit(page,page,'/customer/updateCustomer/', 'Submit Edit');
  await page.goto(routes.customers);
  await page.getByPlaceholder('Search customers').fill(prefix);
  await expect(page.getByRole('row').filter({hasText:c.name})).toContainText('Scottsdale');
  await require('../lib/ui').deleteCustomer(page,c);
});

test('a delayed customer-grid refresh preserves focus and text in the open customer form', async ({page,prefix}) => {
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/customer/activeCustomers/9001/*', async route=>{await gate;await route.continue();});
  await page.goto(routes.customers);
  await page.getByRole('button',{name:'Add Customer',exact:true}).click();
  const dialog=page.getByRole('dialog');const first=dialog.getByLabel('First Name',{exact:true});
  await first.fill(`${prefix} Mary Ann`);await expect(first).toBeFocused();
  const response=page.waitForResponse(r=>r.url().includes('/customer/activeCustomers/9001/'));
  release();await response;await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(first).toBeFocused();await expect(first).toHaveValue(`${prefix} Mary Ann`);
  await dialog.getByLabel('Last Name',{exact:true}).fill('Van Buren');
  for(const [label,value] of Object.entries({'Street Address':'123 Sandbox Lane',City:'Phoenix',State:'AZ',Zip:'85001',Phone:'6025550100',Email:`${prefix.toLowerCase()}@example.com`}))await dialog.getByLabel(label,{exact:true}).fill(value);
  await submit(page,dialog,'/customer/createCustomer/');await require('../lib/ui').closeForm(page);
  await page.getByPlaceholder('Search customers').fill(prefix);
  await expect(page.getByRole('row').filter({hasText:`${prefix} Mary Ann Van Buren`})).toBeVisible();
});

test('a customer transport failure keeps the draft and an explicit retry sends only once', async ({page,prefix}) => {
  const {rows,literal}=require('../lib/db');
  const count=()=>rows(`SELECT customer_id FROM customers WHERE account_id=9001 AND display_name=${literal(`${prefix} Mary Ann Van Buren`)}`).length;
  await page.goto(routes.customers);
  await page.getByRole('button',{name:'Add Customer',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('First Name',{exact:true}).fill(`${prefix} Mary Ann`);
  await dialog.getByLabel('Last Name',{exact:true}).fill('Van Buren');
  for(const [label,value] of Object.entries({'Street Address':'123 Sandbox Lane',City:'Phoenix',State:'AZ',Zip:'85001',Phone:'6025550100',Email:`${prefix.toLowerCase()}@example.com`}))await dialog.getByLabel(label,{exact:true}).fill(value);
  const pattern='**/customer/createCustomer/9001/90013';
  await page.route(pattern,route=>route.abort('failed'));
  await dialog.getByRole('button',{name:'Submit',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText(/check the client list/i);
  await expect(dialog.getByLabel('First Name',{exact:true})).toHaveValue(`${prefix} Mary Ann`);
  await expect(dialog.getByLabel('Last Name',{exact:true})).toHaveValue('Van Buren');
  expect(count()).toBe(0);
  await page.unroute(pattern);
  let release,requests=0;
  const gate=new Promise(resolve=>{release=resolve;});
  await page.route(pattern,async route=>{requests++;await gate;await route.continue();});
  const response=page.waitForResponse(r=>r.url().includes('/customer/createCustomer/') && r.request().method()==='POST');
  try {
    await dialog.getByRole('button',{name:'Submit',exact:true}).evaluate(button=>{button.click();button.click();});
    await expect(dialog.getByRole('button',{name:'Saving...',exact:true})).toBeDisabled();
    await expect.poll(()=>requests).toBe(1);
  } finally { release(); }
  const result=await response;
  expect(result.status()).toBe(200);expect((await result.json()).status).toBe(200);
  await expect(dialog.getByRole('alert')).toContainText(/success|created/i);
  await expect(dialog.getByLabel('First Name',{exact:true})).toHaveValue('');
  expect(count()).toBe(1);expect(requests).toBe(1);
});
