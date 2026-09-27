const {test,expect}=require('../lib/workspace-fixtures');
const {choose,submit,closeForm,fillQuickFilter}=require('../lib/ui');
const {rows,sql,literal}=require('../lib/db');

test('super admin manages a synthetic user through stable editor URLs, refresh and deletion',async({page,prefix})=>{
 const name=prefix+'_Staff',email=prefix.toLowerCase()+'@example.com';
 try {
  await page.goto('/settings/users');await page.getByRole('button',{name:'Add New User',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'New user',exact:true});
  await dialog.getByLabel('First Name',{exact:true}).fill(prefix);await dialog.getByLabel('Last Name',{exact:true}).fill('Staff');
  await dialog.getByLabel('Display Name',{exact:true}).fill(name);await dialog.getByLabel('Email',{exact:true}).fill(email);
  await dialog.getByLabel('Role',{exact:true}).fill('Test employee');await choose(page,dialog,'Access Level','User');
  await submit(page,dialog,'/user/createUser/');await closeForm(page);
  const user=rows(`SELECT * FROM users WHERE account_id=9001 AND email=${literal(email)}`)[0];expect(user.display_name).toBe(name);
  await fillQuickFilter(page,name);await page.getByRole('row').filter({hasText:name}).click();
  await expect(page).toHaveURL(`/settings/users/${user.user_id}/delete`);await page.getByRole('tab',{name:'Edit User',exact:true}).click();
  await page.reload();await expect(page.getByLabel('Display Name',{exact:true})).toHaveValue(name);
  await page.getByLabel('Display Name',{exact:true}).fill(name+'_Updated');await submit(page,page,'/user/updateUser/');
  await expect(page).toHaveURL('/settings/users');expect(rows(`SELECT display_name FROM users WHERE account_id=9001 AND user_id=${user.user_id}`)[0].display_name).toBe(name+'_Updated');
  await page.goto(`/settings/users/${user.user_id}/delete`);await page.reload();await expect(page.getByRole('cell',{name:name+'_Updated',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Delete User',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  expect(rows(`SELECT user_id FROM users WHERE account_id=9001 AND user_id=${user.user_id}`)).toHaveLength(1);
  // Keep the global safety guard intact. Only this owned, history-free synthetic
  // user's exact local DELETE can bypass its actor-ID-shaped URL allowlist.
  let failOnce=true;
  await page.route(`http://localhost:8003/user/deleteUser/9001/${user.user_id}`,route=>{
   if(route.request().method()!=='DELETE')return route.fallback();
   const owned=rows(`SELECT user_id FROM users WHERE account_id=9001 AND user_id=${user.user_id} AND email=${literal(email)}`);expect(owned).toHaveLength(1);
   if(failOnce){failOnce=false;return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({status:500,message:'Synthetic delete failure'})});}
   return route.continue();
  });
  await page.getByRole('button',{name:'Delete User',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();
  await expect(page.getByText('Synthetic delete failure',{exact:true})).toBeVisible();expect(rows(`SELECT user_id FROM users WHERE account_id=9001 AND user_id=${user.user_id}`)).toHaveLength(1);
  await page.getByRole('button',{name:'Delete User',exact:true}).click();await submit(page,page.getByRole('dialog'),'/user/deleteUser/','Delete');
  await expect(page).toHaveURL('/settings/users');expect(rows(`SELECT user_id FROM users WHERE account_id=9001 AND user_id=${user.user_id}`)).toEqual([]);
  const events=rows(`SELECT action,actor_user_id FROM audit_events WHERE account_id=9001 AND entity='users' AND entity_id=${literal(String(user.user_id))} ORDER BY event_id`);expect(events.map(e=>e.action)).toEqual(['insert','update','delete']);expect(events.every(e=>e.actor_user_id===90013)).toBe(true);
  await page.goto(`/settings/users/${user.user_id}/edit`);await expect(page.locator('[role="alert"].MuiAlert-standardError')).toBeVisible();await expect(page.getByRole('button',{name:'Submit',exact:true})).toHaveCount(0);
 } finally {
  // This exact synthetic user has no work; retain the append-only audit events.
  sql(`DELETE FROM users WHERE account_id=9001 AND email=${literal(email)} AND display_name LIKE ${literal(prefix+'%')}`);
 }
});
