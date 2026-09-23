const fs = require('fs');
const path = require('path');
const { BACKEND_DIR: backend } = require('./paths');
const {rows,literal} = require('./db');
const pending = new Map();
function rememberObject(prefix,key) {
  if (!key || typeof key !== 'string') return;
  const keys = pending.get(prefix) || new Set(); keys.add(key); pending.set(prefix,keys);
}
// timeTracking-router.js's sanitizeSegment(): whitespace -> "_", then strip
// anything outside [a-zA-Z0-9_-]. Mirrored here (not imported — the router
// doesn't export it) to reconstruct the same account-folder segment.
function sanitizeSegment(value) {
  return String(value).trim().replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_-]/g,'');
}
async function cleanupObjects(prefix) {
  const keys = pending.get(prefix) || new Set();
  const invoices = rows(`SELECT invoice_file_location FROM customer_invoices WHERE account_id=9001 AND customer_id IN (SELECT customer_id FROM customers WHERE account_id=9001 AND display_name LIKE ${literal(prefix+'%')})`);
  for (const row of invoices) if (row.invoice_file_location) keys.add(row.invoice_file_location);
  const [{account_name}] = rows('SELECT account_name FROM accounts WHERE account_id=9001');
  const accountFolder = `${sanitizeSegment(account_name)}_9001`;
  // timesheet_entries.timesheet_name IS the bare stored file name (no
  // directory, no .gz) — timeTracking-router.js's upload handler sets
  // entry.timesheet_name = storedFileName before insert. New uploads write
  // under primaryPrefix (account-AND-owner-scoped by numeric user id:
  // .../processed/<account_slug>_<accountID>/user_<id>/) rather than the
  // former flat .../processed/Person_Admin/ layout (buildProcessedPrefixes'
  // now-legacy accountLegacyPrefix/legacyPrefix) — reconstruct the CURRENT
  // primary path; rememberObject() below (fed by the real upload response's
  // storedKey) is the source of truth during a live test run regardless, so
  // this reconstruction only matters for the standalone `node lib/cleanup.js
  // <prefix>` recovery path, which has no in-memory pending map to draw on.
  const uploads = rows(`SELECT DISTINCT timesheet_name FROM timesheet_entries WHERE account_id=9001 AND user_id=90013 AND notes LIKE ${literal(prefix+'%')}`);
  for (const upload of uploads) keys.add(`James_F__Kimmel___Associates/time_tracking/processed/${accountFolder}/user_90013/${upload.timesheet_name}.gz`);
  if (!keys.size) return;
  const env = require(path.join(backend,'node_modules/dotenv')).parse(fs.readFileSync(path.join(backend,'.env.local')));
  if (!['http://127.0.0.1:9000','http://localhost:9000'].includes(env.S3_ENDPOINT) || env.S3_BUCKET_NAME !== 'ds2-local') throw new Error('Refusing nonlocal object cleanup');
  const invoicePrefix = account_name.replace(/[^a-zA-Z0-9]/g,'_') + '/invoicing/';
  // Both upload layouts recognized: the current account/owner-scoped primary
  // prefix (new uploads) and the former flat Person_Admin/ layout (in case a
  // pre-existing object from before this suite session is ever swept up).
  const uploadPrefixes = [
    `James_F__Kimmel___Associates/time_tracking/processed/${accountFolder}/user_90013/`,
    'James_F__Kimmel___Associates/time_tracking/processed/Person_Admin/'
  ];
  const {S3Client,DeleteObjectCommand} = require(path.join(backend,'node_modules/@aws-sdk/client-s3'));
  const client = new S3Client({endpoint:env.S3_ENDPOINT,region:env.S3_REGION || 'us-east-1',forcePathStyle:true,credentials:{accessKeyId:env.S3_ACCESS_KEY_ID,secretAccessKey:env.S3_SECRET_ACCESS_KEY}});
  try {
    for (const key of keys) {
      if ((!key.startsWith(invoicePrefix) && !uploadPrefixes.some(p => key.startsWith(p))) || key.includes('..')) throw new Error(`Refusing unexpected cleanup key: ${key}`);
      await client.send(new DeleteObjectCommand({Bucket:'ds2-local',Key:key}));
    }
    pending.delete(prefix);
  } finally { client.destroy(); }
}
module.exports = {rememberObject,cleanupObjects};
