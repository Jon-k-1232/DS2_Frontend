const { test, expect } = require('../lib/fixtures');
const { choose } = require('../lib/ui');
const { rows, sql, literal } = require('../lib/db');

// UpdateAccount and UpdateAccountAddress render side by side on the same
// page (AccountSettings.js) with no dialog/container to scope by, so each
// has its own "Submit" button and lib/ui.js's submit() helper (which looks
// up a uniquely-named button) can't disambiguate them. Same wait+click+
// assert shape, keyed by position instead of uniqueness.
async function submitNth(page, endpoint, index) {
   const response = page.waitForResponse(r => r.url().includes(endpoint) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.request().method()));
   await page.getByRole('button', { name: 'Submit', exact: true }).nth(index).click();
   const r = await response;
   const body = await r.json();
   expect(r.ok(), JSON.stringify(body)).toBeTruthy();
   expect(body.status, JSON.stringify(body)).toBe(200);
   return body;
}

// Account Users (/account/accountUsers) is gated by SuperAdminProtectedAccessRoute
// at the route level (AccountRoutes.js:22-29 wraps AccountUsersGrid, and
// SuperAdminAccess.js's isSuperAdmin() requires accessLevel === 'super admin'
// exactly). The fixture "admin" identity (90013) has access_level 'admin' in
// the database (confirmed: SELECT access_level FROM users WHERE user_id=90013
// -> 'admin'), not 'super admin' — and account 9001 has no super-admin user at
// all (only 90011/90012 employee, 90013 admin, 90014 inactive employee). The
// only 'super admin' fixture is user 21 on account 1, which is read-only
// production-copy data per the suite's hard rules — writing a new user through
// it is out of bounds, and the auth.js request guard hard-blocks every
// non-GET/HEAD/OPTIONS request for the 'readonly' identity regardless of what
// the UI does. So add/edit/deactivate/delete-a-user cannot be exercised
// through the real UI with any identity this suite is allowed to write with.
// This test instead documents the real, previously-untested (in_e2e: false)
// behavior for the admin identity: the route refuses it, and the sidebar
// correctly hides the link.
test.describe('Account Users', () => {
  test('admin identity is refused the Account Users page, and the sidebar hides its link', async ({ page }) => {
    await page.goto('/account/accountUsers');
    await expect(page.getByRole('heading', { name: 'Unauthorized', exact: true })).toBeVisible();
    await expect(page.getByText('This page is restricted to super admins.', { exact: true })).toBeVisible();

    await page.goto('/account/accountSettings');
    await expect(page.getByRole('heading', { name: 'Account Settings', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Account Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Automations', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Account Users', exact: true })).toHaveCount(0);
  });
});

// account_id=9001's own accounts + account_information rows are shared,
// permanent fixture rows (not E2E_-prefixed, not touched by the prefix
// fixture's teardown) — snapshot and restore them by hand around this test,
// per the task's explicit instruction.
test.describe('Account Settings', () => {
  // Was previously conditionally failing against the deployed backend: PUT
  // /account/updateAccount 500'd on a business-only submit ("invalid input
  // syntax for type integer: \"NaN\"" while unconditionally touching
  // account_information with no address fields present) and rewrote
  // accounts.created_at to now() on every save — the exact pre-fix,
  // unconditional-object-literal behavior accountObjects.js's own comment
  // describes, confirmed live via both the browser network response and an
  // isolated curl PUT bypassing the browser entirely. Confirmed fixed after
  // the backend was restarted with current code (hasField() guards in
  // restoreDataTypesAccountOnUpdate/restoreDataTypesAccountInformationOnUpdate
  // + the db.transaction(...) wrap in account-router.js): both submits now
  // return 200 and is_account_active survives both. Active test.
  test('business and address saves do not change is_account_active', async ({ page }) => {
    const [accountBefore] = rows('SELECT * FROM accounts WHERE account_id=9001');
    const [addressBefore] = rows('SELECT * FROM account_information WHERE account_id=9001');
    expect(accountBefore.is_account_active).toBe(true);

    try {
      await page.goto('/account/accountSettings');

      // Business settings form (UpdateAccount.js) never pre-loads the current
      // account, so every submit resends all of its fields regardless of what
      // the user touched — reproduce the current real values so this save is
      // a faithful resave rather than a blanking write, then restore the row
      // unconditionally below regardless (account_type's stored 'business' is
      // lowercase; the Autocomplete only offers 'Business'/'Individual', and
      // account_invoice_template_option is blank with only one possible
      // non-blank option ('Template One') — restoring afterward is required
      // either way, exactly as the task anticipates).
      await page.getByLabel('Business Name', { exact: true }).fill(accountBefore.account_name);
      await choose(page, page, 'Account Type', accountBefore.account_type.toLowerCase() === 'business' ? 'Business' : 'Individual');
      await page.getByLabel('Statement To Appear On Invoices', { exact: true }).fill(accountBefore.account_statement || '');
      await page.getByLabel('Interest Statement To Appear On Invoices', { exact: true }).fill(accountBefore.account_interest_statement || '');
      await page.getByLabel('Interest Rate On Unpaid Invoices', { exact: true }).fill(String(accountBefore.account_invoice_interest_rate ?? ''));
      const businessResult = await submitNth(page, '/account/updateAccount', 0);
      expect(businessResult.status).toBe(200);

      let [accountAfterBusiness] = rows('SELECT is_account_active FROM accounts WHERE account_id=9001');
      // DEFECT-if-observed: business settings save must not touch
      // is_account_active. See accountObjects.js's restoreDataTypesAccountOnUpdate
      // (hasField() guard) and UpdateAccount.js's formObjectForUpdateAccountPost
      // (which never includes is_account_active at all).
      expect(accountAfterBusiness.is_account_active, 'business settings save changed is_account_active').toBe(true);

      // Address form (UpdateAccountAddress.js) pre-loads the current address —
      // wait for that fetch before submitting untouched, a true no-op resave.
      await expect(page.getByLabel('Street Address', { exact: true })).toHaveValue(addressBefore.account_street);
      const addressResult = await submitNth(page, '/account/updateAccount', 1);
      expect(addressResult.status).toBe(200);

      const [accountAfterAddress] = rows('SELECT is_account_active FROM accounts WHERE account_id=9001');
      expect(accountAfterAddress.is_account_active, 'address settings save changed is_account_active').toBe(true);
    } finally {
      // Full restore, including created_at: the backend process this suite is
      // currently pointed at still runs a pre-fix build of this endpoint (see
      // the DEFECT note above) that rewrites created_at to now() on every save
      // regardless of what was submitted — confirmed independently with a
      // direct curl PUT outside the browser entirely. Restoring it here keeps
      // the fixture row byte-for-byte identical to how this test found it no
      // matter which backend build is live.
      sql(`UPDATE accounts SET account_name=${literal(accountBefore.account_name)}, account_type=${literal(accountBefore.account_type)}, is_account_active=${accountBefore.is_account_active}, account_statement=${literal(accountBefore.account_statement || '')}, account_interest_statement=${literal(accountBefore.account_interest_statement || '')}, account_invoice_interest_rate=${accountBefore.account_invoice_interest_rate}, account_invoice_template_option=${accountBefore.account_invoice_template_option ? literal(accountBefore.account_invoice_template_option) : 'NULL'}, created_at=${literal(accountBefore.created_at)} WHERE account_id=9001`);
      sql(`UPDATE account_information SET account_street=${literal(addressBefore.account_street)}, account_city=${literal(addressBefore.account_city)}, account_state=${literal(addressBefore.account_state)}, account_zip=${literal(addressBefore.account_zip)}, account_email=${literal(addressBefore.account_email)}, account_phone=${literal(addressBefore.account_phone)}, is_this_address_active=${addressBefore.is_this_address_active}, is_account_physical_address=${addressBefore.is_account_physical_address}, is_account_billing_address=${addressBefore.is_account_billing_address}, is_account_mailing_address=${addressBefore.is_account_mailing_address}, created_at=${literal(addressBefore.created_at)} WHERE account_id=9001`);
      const [accountRestored] = rows('SELECT * FROM accounts WHERE account_id=9001');
      const [addressRestored] = rows('SELECT * FROM account_information WHERE account_id=9001');
      expect(accountRestored).toEqual(accountBefore);
      expect(addressRestored).toEqual(addressBefore);
    }
  });
});
