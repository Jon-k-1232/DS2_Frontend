const { test: base, expect } = require('@playwright/test');
const { authenticate } = require('./auth');
const { cleanup } = require('./db');
const { cleanupObjects } = require('./storage');
const prefixes = new Set();
const test = base.extend({
  identity: ['admin', { option: true }],
  prefix: async ({}, use, testInfo) => {
    const prefix = `E2E_${Date.now()}_${require('crypto').randomBytes(3).toString('hex')}`;
    testInfo.annotations.push({type: 'sandbox-data', description: prefix});
    prefixes.add(prefix);
    try { await use(prefix); } finally {
      try { await cleanupObjects(prefix); } finally { cleanup(prefix); }
      prefixes.delete(prefix);
    }
  },
  context: async ({ context, identity, prefix }, use) => { await authenticate(context, identity); await use(context); }
});
// Retry cleanup after failures; never delete another run's prefix.
test.afterAll(async () => {
  for (const prefix of prefixes) { try { await cleanupObjects(prefix); } finally { cleanup(prefix); } }
});
module.exports = { test, expect };
