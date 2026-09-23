const { test, expect } = require('../lib/fixtures');
const { createCustomer, routes, submit } = require('../lib/ui');
test('create, open profile, edit and preserve a multi-word customer name', async ({page,prefix}) => {
  const c = await createCustomer(page,prefix);
  await page.getByRole('row').filter({hasText:c.name}).click();
  await expect(page).toHaveURL(new RegExp(`customerProfile/${c.id}/`));
  await page.getByText('Edit Customer Profile', {exact:true}).click();
  await expect(page.getByLabel('City',{exact:true})).toHaveValue('Phoenix');
  await page.getByLabel('City',{exact:true}).fill('Scottsdale');
  await submit(page,page,'/customer/updateCustomer/', 'Submit Edit');
  await page.goto(routes.customers);
  await page.getByPlaceholder('Search customers').fill(prefix);
  await expect(page.getByRole('row').filter({hasText:c.name})).toContainText('Scottsdale');
  await require('../lib/ui').deleteCustomer(page,c);
});
