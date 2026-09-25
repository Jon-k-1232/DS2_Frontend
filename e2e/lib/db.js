const { execFileSync } = require('child_process');
const { assertLocalUI } = require('./scenario-safety');
function sql(query) {
  assertLocalUI();
  return execFileSync('psql', ['-X', '-h', '127.0.0.1', '-p', '5433', '-U', 'ds2', '-d', 'ds2_local', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query],
    { env: { ...process.env, PGPASSWORD: 'ds2local' }, encoding: 'utf8' }).trim();
}
function literal(value) { return "'" + String(value).replaceAll("'", "''") + "'"; }
function rows(query) { return JSON.parse(sql(`SELECT COALESCE(json_agg(t),'[]') FROM (${query}) t`)); }
function cleanup(prefix) {
  if (!/^E2E_[a-z0-9_]+$/i.test(prefix)) throw new Error('Unsafe cleanup prefix');
  // Capture IDs first; keep every DELETE tenant scoped. Do not reset shared sequences.
  // Local fixture teardown must remove issued synthetic records that normal
  // application writes correctly cannot remove. This transaction-scoped
  // trigger bypass is behind assertLocalUI and the exact E2E_/9001 scope.
  // Keep audit_events and audit_chain_heads intact so their chain stays valid.
  sql(`BEGIN;
    SELECT pg_advisory_xact_lock(260026, 9001);
    CREATE TEMP TABLE e2e_customers ON COMMIT DROP AS SELECT customer_id FROM customers WHERE account_id=9001 AND display_name LIKE ${literal(prefix + '%')};
    SET LOCAL session_replication_role = replica;
    DELETE FROM audit_actions WHERE account_id=9001 AND customer_id IN (SELECT customer_id FROM e2e_customers);
    DELETE FROM audit_records WHERE account_id=9001 AND customer_id IN (SELECT customer_id FROM e2e_customers);
    DELETE FROM duplicate_history WHERE account_id=9001 AND duplicate_id IN (SELECT duplicate_id FROM duplicate_flags WHERE account_id=9001 AND customer_id IN (SELECT customer_id FROM e2e_customers));
    DELETE FROM duplicate_flags WHERE account_id=9001 AND customer_id IN (SELECT customer_id FROM e2e_customers);
    DELETE FROM retainer_events WHERE account_id=9001 AND customer_id IN (SELECT customer_id FROM e2e_customers);
    ${['invoice_history','invoice_revisions','invoice_exception_payments','invoice_exceptions','invoice_statement_members','invoice_issues'].map(t => `DELETE FROM ${t} WHERE account_id=9001 AND invoice_id IN (SELECT customer_invoice_id FROM customer_invoices WHERE account_id=9001 AND customer_id IN (SELECT customer_id FROM e2e_customers));`).join('\n')}
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
