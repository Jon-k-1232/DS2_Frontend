const { rows } = require('./db');
module.exports = async function () {
  const fs = require('fs');
  const path = require('path');
  const { BACKEND_DIR: backendDir } = require('./paths');
  const env = require(path.join(backendDir,'node_modules/dotenv')).parse(fs.readFileSync(path.join(backendDir,'.env.local')));
  if ((env.TIME_TRACKER_AI_FEATURE_FLAG || 'off') !== 'off') throw new Error('Upload tests require TIME_TRACKER_AI_FEATURE_FLAG=off');
  if (!['http://localhost:9000','http://127.0.0.1:9000'].includes(env.S3_ENDPOINT) || env.S3_BUCKET_NAME !== 'ds2-local') throw new Error('Expected local MinIO configuration');
  const backend = await fetch('http://127.0.0.1:8003/healthz');
  if (!backend.ok || (await backend.json()).status !== 'ok') throw new Error('Local backend unhealthy');
  const deadline = Date.now() + 300000;
  while (true) {
    try { if ((await fetch('http://localhost:3003', { signal: AbortSignal.timeout(5000) })).ok) break; } catch {}
    if (Date.now() >= deadline) throw new Error('Frontend did not start within 5 minutes');
    await new Promise(r => setTimeout(r, 2000));
  }
  const users = rows('SELECT user_id, account_id, email FROM users WHERE user_id IN (90013,21) ORDER BY user_id');
  if (users.length !== 2 || users[1].account_id !== 9001 || users[1].email !== 'admin+test@example.com' || users[0].account_id !== 1 || users[0].email !== 'admin@jimkimmel.com') throw new Error('Sandbox identities do not match');
};
