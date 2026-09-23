const fs = require('fs');
const path = require('path');
const { BACKEND_DIR: backend } = require('./paths');
const jwt = require(path.join(backend, 'node_modules/jsonwebtoken'));
const dotenv = require(path.join(backend, 'node_modules/dotenv'));
const identities = {
  admin: { userID: 90013, accountID: 9001, email: 'admin+test@example.com', accessLevel: 'admin', displayName: 'Admin Person', role: 'Admin' },
  readonly: { userID: 21, accountID: 1, email: 'admin@jimkimmel.com', accessLevel: 'super admin', displayName: 'Jim Kimmel', role: 'Admin' },
  // For the role-matrix suite. access_level is the real DB value for user
  // 90011 (SELECT access_level FROM users WHERE user_id=90011 -> 'employee'),
  // not the generic 'user' the task text paraphrased it as — the frontend's
  // ManagerAndAdminProtectedAccessRoute/AdminProtectedAccessRoute guards only
  // special-case 'admin'/'manager'/'super admin', so any other real string
  // (including 'employee') is equivalent to the lowest tier for them.
  employee: { userID: 90011, accountID: 9001, email: 'eliza+test@example.com', accessLevel: 'employee', displayName: 'Eliza Smith', role: 'Employee' }
};
async function authenticate(context, identity = 'admin', expired = false) {
  const user = identities[identity];
  const { JWT_SECRET } = dotenv.parse(fs.readFileSync(path.join(backend, '.env.local')));
  if (!JWT_SECRET) throw new Error('Missing local JWT_SECRET');
  const token = jwt.sign({ user_id: user.userID }, JWT_SECRET, { subject: user.email, algorithm: 'HS256', expiresIn: '11h' });
  await context.addCookies([{ name: 'ds2_auth', value: token, domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Strict' }]);
  await context.addInitScript(({ user, expired }) => {
    if (location.origin !== 'http://localhost:3003' || sessionStorage.getItem('e2eSeeded')) return;
    for (const key of ['userID','accountID','accessLevel','displayName','role']) sessionStorage.setItem(key, String(user[key]));
    sessionStorage.setItem('authExpiresAt', String(Date.now() + (expired ? -1000 : 11 * 3600000)));
    sessionStorage.setItem('e2eSeeded', 'true');
  }, { user, expired });
  // No account-1 mutation can leave this browser. Unexpected API origins fail closed.
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['xhr', 'fetch'].includes(request.resourceType()) && !['localhost','127.0.0.1'].includes(url.hostname)) return route.abort('blockedbyclient');
    if (!['GET','HEAD','OPTIONS'].includes(request.method())) {
      // Every write route this suite otherwise touches embeds /:accountID/:userID
      // in its path — scope the allowlist to THIS identity's own ids (never
      // hardcoded to admin/90013) so a non-admin identity's own writes, e.g. an
      // employee's time-tracker upload, aren't blocked by an admin-shaped path.
      // One deliberate, narrow exception: PUT /account/updateAccount takes no
      // :accountID/:userID in its path at all — account-router.js scopes it to
      // the caller's own account from the verified session (req.user.account_id)
      // instead, by design. It is still admin-only server-side (requireAdmin)
      // and still fully blocked for the readonly identity below regardless.
      const ownScope = new RegExp(`/${user.accountID}/${user.userID}(?:/|$)`);
      if (identity === 'readonly' || !['http://localhost:8003','http://127.0.0.1:8003'].includes(url.origin) || !(ownScope.test(url.pathname) || url.pathname === '/account/updateAccount')) return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}
module.exports = { authenticate, identities };
