const {cleanup} = require('./db');
const {cleanupObjects} = require('./storage');
const prefix = process.argv[2];
if (!/^E2E_\d{13}_[a-z0-9]{6}$/.test(prefix || '')) throw new Error('Usage: node lib/cleanup.js E2E_<13-digit timestamp>_<6-character suffix>');
(async () => { try { await cleanupObjects(prefix); } finally { cleanup(prefix); } console.log(`Cleaned account 9001 test prefix ${prefix}`); })().catch(error => {console.error(error); process.exitCode=1;});
