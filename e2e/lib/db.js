const { execFileSync } = require('child_process');
function sql(query) {
  return execFileSync('psql', ['-X', '-h', '127.0.0.1', '-p', '5433', '-U', 'ds2', '-d', 'ds2_local', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query],
    { env: { ...process.env, PGPASSWORD: 'ds2local' }, encoding: 'utf8' }).trim();
}
function literal(value) { return "'" + String(value).replaceAll("'", "''") + "'"; }
function rows(query) { return JSON.parse(sql(`SELECT COALESCE(json_agg(t),'[]') FROM (${query}) t`)); }
function cleanup(prefix) {
  if (!/^E2E_[a-z0-9_]+$/i.test(prefix)) throw new Error('Unsafe cleanup prefix');
  // Capture IDs first; keep every DELETE tenant scoped. Do not reset shared sequences.
  sql(`BEGIN;
    CREATE TEMP TABLE e2e_customers ON COMMIT DROP AS SELECT customer_id FROM customers WHERE account_id=9001 AND display_name LIKE ${literal(prefix + '%')};
    DELETE FROM ai_time_tracker_transaction_suggestions WHERE account_id=9001 AND timesheet_entry_id IN (SELECT timesheet_entry_id FROM timesheet_entries WHERE account_id=9001 AND (timesheet_name LIKE ${literal(prefix + '%')} OR notes LIKE ${literal(prefix + '%')}));
    DELETE FROM timesheet_entries WHERE account_id=9001 AND (timesheet_name LIKE ${literal(prefix + '%')} OR notes LIKE ${literal(prefix + '%')});
    DELETE FROM timesheet_errors WHERE account_id=9001 AND timesheet_name LIKE ${literal(prefix + '%')};
    DELETE FROM invalid_timesheets WHERE account_id=9001 AND timesheet_name LIKE ${literal(prefix + '%')};
    ${['customer_payments','customer_writeoffs','customer_transactions','customer_quotes','customer_retainers_and_prepayments','customer_invoices','customer_jobs','recurring_customers','customer_information','customers'].map(t => `DELETE FROM ${t} WHERE account_id=9001 AND customer_id IN (SELECT customer_id FROM e2e_customers);`).join('\n')}
    DELETE FROM customer_job_types WHERE account_id=9001 AND job_description LIKE ${literal(prefix + '%')};
    DELETE FROM customer_job_categories WHERE account_id=9001 AND customer_job_category LIKE ${literal(prefix + '%')};
    DELETE FROM customer_general_work_descriptions WHERE account_id=9001 AND general_work_description LIKE ${literal(prefix + '%')};
    COMMIT;`);
}
module.exports = { sql, rows, literal, cleanup };
