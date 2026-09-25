const fs = require('fs');
const path = require('path');
const { BACKEND_DIR } = require('./paths');
function assertLocalUI() {
  const env = require(path.join(BACKEND_DIR, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(BACKEND_DIR, '.env.local')));
  if (!['127.0.0.1', 'localhost'].includes(env.DB_DEV_HOST) || Number(env.DB_DEV_PORT) !== 5433 || env.DATABASE_NAME !== 'ds2_local' || env.DATABASE_USER !== 'ds2') throw Error('UI scenarios require local ds2_local fixture account 9001 on PostgreSQL :5433');
  if (!['http://localhost:9000', 'http://127.0.0.1:9000'].includes(env.S3_ENDPOINT) || env.S3_BUCKET_NAME !== 'ds2-local') throw Error('UI scenarios require local MinIO :9000');
  return env;
}
assertLocalUI();
module.exports = { assertLocalUI };
