const {test:base,expect}=require('./fixtures');
const {rows,sql,literal}=require('./db');
// Synthetic account only. Restore the fixture's actual role even on assertion failure.
const test=base.extend({
 page:async({page},use)=>{
  const original=rows('SELECT access_level FROM users WHERE account_id=9001 AND user_id=90013')[0].access_level;
  try {
   sql("UPDATE users SET access_level='super admin' WHERE account_id=9001 AND user_id=90013");
   await page.goto('/clients');
   await page.evaluate(()=>sessionStorage.setItem('accessLevel','super admin'));
   await page.reload();
   await use(page);
  } finally { sql(`UPDATE users SET access_level=${literal(original)} WHERE account_id=9001 AND user_id=90013`); }
 }
});
module.exports={test,expect};
