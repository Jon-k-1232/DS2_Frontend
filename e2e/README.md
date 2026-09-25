# DS2 browser end-to-end suite

This Playwright project drives the running DS2 React UI against the local backend and Postgres sandbox. All creation, editing, finalization, reversal, deletion attempts, and uploads use real browser controls. There are no mocked successful API responses or API shortcuts for test setup. Pass 4 also sends direct refusal probes through the authenticated browser request context and aborts selected requests to test transport-error messages. Database/storage fault injection runs in the separate backend scenario suite.

It lives at `DS2_Frontend/e2e`, version-controlled as part of the frontend repo (moved there from a standalone `DS2/e2e` directory outside both repos). It remains logically independent of the frontend's own CRA/Jest unit tests — see "Relationship to the frontend's Jest suite" below — and still exercises both DS2_Backend and DS2_Frontend from that one location.

## Run

With the existing sandbox stack running (start the sandbox backend with `DISABLE_RATE_LIMIT=true` — a full run issues well over the API limiter's 300 requests a minute from one client and otherwise fails on 429s; the flag is honoured only when set explicitly and must never be set in a deployed environment):

The sandbox cannot launch Chromium directly. Use the existing external Playwright 1.63.0 browser server; do not start or stop it or either app server:

```sh
cd DS2_Frontend/e2e
export PLAYWRIGHT_BROWSERS_PATH=/Users/jonkimmel/Desktop/Code/JKA_stuff/DS2/DS2_Frontend/e2e/.browsers
export PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:3334/
npm test -- --reporter=list
```

Keep both variables set for every Playwright invocation, including the examples below. Dependencies are installed. The configuration uses one worker; the external browser accepts at most four concurrent clients. If port 3334 stops answering, report the browser run as OPEN rather than attempting a sandbox workaround.

Requires Node 20+, `psql`, `unzip`, and installed backend dependencies. The suite imports the backend's `jsonwebtoken`, `dotenv`, XLSX parser, and S3 SDK straight out of `DS2_Backend/node_modules`, and reads `DS2_Backend/.env.local` without printing the JWT secret. It never starts or edits either application. `lib/paths.js` first locates the suite's own frontend checkout (the nearest ancestor named `DS2_Frontend`) and then uses the `DS2_Backend` beside it (a nested worktree can therefore never borrow an unrelated outer checkout's backend, dependencies or `.env.local`; it fails with a clear error instead). `DS2_BACKEND_DIR=/path/to/DS2_Backend` selects another backend checkout explicitly and works even when no sibling backend exists; the override must contain `package.json`. `lib/auth.js`, `lib/storage.js`, `lib/tracker.js`, and `lib/preflight.js` (the modules that reach into the backend checkout) use it, rather than assuming a fixed relative depth.

## Relationship to the frontend's Jest suite

`DS2_Frontend`'s unit tests run via `react-scripts test` (Jest under Create React App), which is hardcoded to look only under `DS2_Frontend/src`. `e2e/` sits outside `src/`, so CRA's test runner never discovers these Playwright specs, and this suite's `npm test` (Playwright) is invoked separately from the frontend's `npm test` (Jest). The two do not share a runner, a config, or a `test`/`expect` global.

Endpoints are intentionally fixed:

- Frontend: `http://localhost:3003`
- Backend health: `http://127.0.0.1:8003/healthz`
- Postgres: `127.0.0.1:5433`, database `ds2_local`, user `ds2`, password `ds2local`
- MinIO: local port 9000, bucket `ds2-local`

The frontend API configuration must use `http://localhost:8003` so the `localhost` auth cookie is sent. Preflight checks backend health, waits up to five minutes for the frontend, verifies the two database identities, and requires local MinIO configuration and the configured time-tracker AI flag to be off.

```sh
npm test -- tests/month-end.spec.js
npm test -- --list
npm run report
```

One worker and no automatic retries are intentional: financial flows must not be silently replayed. Each test creates independent data, so specs can run individually or in any order. Avoid overlapping runs against the same stack; application download paths have second-level timestamps.

## Coverage

114 active tests, no `test.fixme`: the original 69, five owner-decision checks, and 40 Pass 4 mistake cases. The current hand-computed oracles, defects, backend refusal mapping and fresh execution counts are in [ui-mistakes.md](../../DS2_Backend/docs/scenarios/ui-mistakes.md) and [RESULTS-PASS4.md](../../DS2_Backend/docs/scenarios/RESULTS-PASS4.md). REVIEW_RESULTS.md retains the earlier 69-test execution history.

| Spec | Pass | Fixme | Browser coverage |
| --- | ---: | ---: | --- |
| `account-users.spec.js` | 2 | 0 | Admin identity refused `/account/accountUsers` (super-admin gate) + sidebar link hidden; Account Settings business + address save round-trip does not change `is_account_active` |
| `analytics-pages.spec.js` | 3 | 0 | Admin identity refused every Analytics page (super-admin gate); Client Rates and Time Allocation CSV export downloads (account 1, the only reachable identity) |
| `auth-and-navigation.spec.js` | 23 | 0 | Cookie/session restoration, reload, all 21 admin sidebar leaves, console/page errors, error Alerts, expired-marker redirect |
| `customer-profile.spec.js` | 3 | 0 | Invoices/Transactions/Jobs/Payments/Retainers and PrePayments/Edit Customer Profile sub-tabs all render the right rows for a customer created in-test; a two-word first name splits into the correct First/Last Name fields; a nonexistent customer id shows an error state instead of hanging on Loading |
| `customers.spec.js` | 1 | 0 | Create, profile, edit city while preserving a multi-word name, search, delete |
| `edit-flows.spec.js` | 2 | 0 | Sent time-entry lock notice and invoice-history link; Pending Payments' Processed/All Payments/Upload tabs |
| `invoices-quotes.spec.js` | 4 | 0 | Frozen invoice detail and membership, separately updated current balance; the Quotes list renders (not stuck on Loading) with an empty-state grid; Accounts Receivable age-filter chips for account 9001; Account Audit admin refusal (super-admin gate) |
| `jobs-and-transactions.spec.js` | 1 | 0 | Create job, 0.3 hours at Eliza Smith's $75 rate = $22.50, $20 charge, grid totals, charge/time/job/customer UI deletion |
| `jobs-list.spec.js` | 2 | 0 | Delete guard ("re-parent…") + disabled Delete Job while a transaction is linked, then a clean delete once cleared; edit a job (rename via Job Notes, mark complete) through the "Edit Job" tab |
| `master-data.spec.js` | 7 | 0 | Job Categories/Types/Work Descriptions add + delete through their dialogs (duplicate-name behavior documented — no refusal exists, see Coverage notes); each type's edit through its "Edit ..." tab; a failed Work Description submission shows its error Alert |
| `month-end.spec.js` | 2 | 0 | $22.50 Invoice Total, CSV preview ZIP, finalized PDF ZIP, new INV number, same-day skip stays visible with the existing invoice number and a real dismiss button |
| `payments-writeoffs-retainers.spec.js` | 2 | 0 | Finalize first; $5 payment, $2 write-off, positive $5 NSF reversal, original payment deletion refusal displayed in UI, remaining $20.50; separate $25 retainer create/delete |
| `read-only-pages.spec.js` | 9 | 0 | Account-1 AR rows/aging/CSV, Account Audit list, Customers search, Invoices search/no-match, all five Analytics pages with numeric data |
| `role-matrix.spec.js` | 3 | 0 | Employee identity: sidebar leaf links stay visible but Customers/Transactions/Invoices/Jobs are refused; backend independently 403s the same request; Time Tracking upload/history stay reachable while Settings/Transaction Review/Employee Trackers do not |
| `time-tracker-upload.spec.js` | 1 | 0 | XLSX browser upload for 90013, success message, history row, all entries unprocessed/pending with AI off |
| `time-tracking-admin.spec.js` | 4 | 0 | Update Master Tracker Template admin refusal (super-admin gate); customer AI Audit tab refusal + hidden tab; 404 page; Dashboard renders its "Welcome" heading exactly once |
| `path-matrix-owner-decisions.spec.js` | 5 | 0 | Draft versus sent boundary, refund limits, locked duplicate removal, immutable Audit Record and employee refusal |
| `user-mistakes-financial.spec.js` | 19 | 0 | Five financial forms: pending doubles, invalid/empty values, abandon/back, transport failure/retry; signed credit inputs, long note, month-boundary date |
| `user-mistakes-decisions.spec.js` | 7 | 0 | Double finalize; stale delete/payment; explicit credit; duplicate review; exception/revision preserving original bytes; all four sent detail screens |
| `user-mistakes-audit.spec.js` | 6 | 0 | Both PDF print/list/reopen/verify options; readable tab and collapsed client archive lines; dates; API validation/tamper/tenant/employee refusal; transport failure; read-only super-admin tab |
| `user-mistakes-navigation.spec.js` | 2 | 0 | 26-charge pagination/filter edges and audit balance; retainer adjustments and stale refund refusal |
| `user-mistakes-delete.spec.js` | 6 | 0 | Eligible financial deletion: cancel, transport failure and explicit retry; failed retainer linked-payment lookup keeps Delete unavailable; linked root disables Delete and used draw refuses |

The app makes CSV-only and finalization mutually exclusive. Month-end therefore downloads a CSV preview first, verifies it creates no invoice parent, then finalizes and checks the PDF archive. The same-day guard is tested using a second browser submission, not a fabricated HTTP request.

The upload helper copies `DS2_Backend/test/fixtures/timetrackers/clean.xlsx` in memory. It changes the employee to Admin Person and supplies unique, valid customer-name/note fields for its 50 rows. It preserves the source layout, dates, categories and durations. The original fixture is untouched. A null hold reason with `is_processed=false` is pending when AI is disabled; no suggestion row is required. Database checks supplement the visible UI assertions.

### Coverage notes and gaps

- **Account Users CRUD, Account Audit / Analytics chips for account 9001, `update-template`, customer AI Audit content**: all gated by `SuperAdminProtectedAccessRoute` / `AuditorProtectedAccessRoute`, which require `accessLevel === 'super admin'` exactly. Account 9001's only fixture identities are `admin` (90013) and two `employee` users — no super admin. The only super-admin fixture is account 1's user 21, which is read-only per the hard rules. These specs instead confirm the refusal itself (a real, previously-untested behavior) for the admin identity.
- **Manager role**: no manager-level fixture user exists under account 9001, and creating one through the UI is blocked by the same super-admin gate as Account Users. Not covered (`role-matrix.spec.js`'s header comment has the full reasoning).
- **Transaction/Payment/Retainer/Write-Off edit flows**: `TransactionSubRoutes.js`, `PaymentSubRoutes.js`, `RetainerSubRoutes.js` and `WriteOffSubRoutes.js` each comment out their `editX` route with an explicit "Edit ... is not implemented yet" — a deliberate, acknowledged gap, not a defect. Delete-refusal coverage exists for the transaction case (`edit-flows.spec.js`); payment's own refusal (superseded-by-reversal) is covered by `payments-writeoffs-retainers.spec.js`.
- **Quotes create/delete**: no UI path exists at all (`QuotesGrid.js` has no buttons, no row click); the backend's quote create/update/delete endpoints are never called from the frontend, and no form exists to build one from — genuinely unsupported in the UI today, not fabricated here. (The separate "stuck on permanent Loading" defect on `/invoices/quotes` itself was fixed this session — see REVIEW_RESULTS.md — so the read-only list now renders correctly; only create/delete remain uncovered.)
- **Pending Payments review dialog**: needs real pending-payment rows from a separate bank-feed/CSV subsystem this task didn't otherwise touch; not constructed. The page's other three tabs are confirmed reachable.
- **Used-retainer deletion**: now covered in `user-mistakes-delete.spec.js`: $25 funds $20 work, leaves $5 available, disables Delete on the linked root and refuses deleting the draw with originating-entry guidance. The backend suites separately cover child/reference/cancellation/event/sent refusals.

## Identity and cleanup

Writes always use account **9001**, user **90013**, `admin+test@example.com`, access `admin`. Time billing selects the existing Eliza Smith fixture user to exercise a nonzero rate. An `employee` identity (user **90011**, Eliza Smith's own login) is also available for role-matrix coverage. Account **1**, user **21**, `admin@jimkimmel.com`, access `super admin`, is used only by read-only specs. A browser request guard blocks every non-read request for the readonly identity and rejects writes outside the local backend / the current identity's own account+user route (one narrow exception: `PUT /account/updateAccount`, which is admin-only server-side and takes no account/user segment in its path by design).

Authentication mints an HS256 JWT with `{user_id}`, email subject, and 11-hour expiry. It sets the httpOnly, SameSite Strict `ds2_auth` cookie and seeds only the app's exact session keys (`userID`, `accountID`, `accessLevel`, `displayName`, `role`, `authExpiresAt`). Google Sign-In is bypassed.

Each test gets a unique `E2E_<timestamp>_<suffix>` prefix, recorded as a report annotation. Unbilled records are deleted through UI flows where available. Finalized ledgers and uploaded entries lack a supported full UI rollback, so fixture teardown removes only that prefix's account-9001 rows in FK-safe order using `psql`; `afterAll` retries failed teardown. The browser closes before fallback cleanup. Exact generated MinIO object keys are also removed, including invoice images and uploaded XLSX archives. No fixture users/catalogs or shared invoice sequences are reset. Cleanup failures fail the test.

After an interrupted process, use the exact prefix from the report:

```sh
node lib/cleanup.js E2E_1234567890123_abcdef
```

This recovers database-linked invoice images/revisions, Audit Record PDFs/evidence and uploads. Local teardown disables immutable-table triggers only inside its guarded account 9001 E2E-prefix transaction; audit_events and audit_chain_heads remain intact. A hard kill before a batch ZIP response is recorded can leave that unattached MinIO ZIP; normal teardown tracks and deletes response keys.

## Reports and product defects

- `test-results/results.json`: machine-readable results and data-prefix annotations.
- `playwright-report/index.html`: HTML report (`npm run report`).
- Failure traces/screenshots: `test-results/`.
- Invoice/upload response evidence and ZIPs: test attachments.
- Current execution evidence: [REVIEW_RESULTS.md](REVIEW_RESULTS.md).

Generated artifacts, traces, dependencies, cache and browser binaries are gitignored. Traces from a successful launch can contain the local session cookie and real account-1 read data; keep them local.

Any `test.fixme` in this suite must be a confirmed, currently-reproducing product defect: reproduced with real DOM/response evidence, cited to a product `file:line`, and re-verified (fixme temporarily disabled, run, re-enabled) before being added. There are currently none — the nine tracked as of the previous execution report were all fixed in the product this session and their `fixme`s removed; see REVIEW_RESULTS.md for the full list with evidence and what changed. `DS2_RUN_KNOWN_DEFECTS=1 npm test -- tests/month-end.spec.js` is no longer needed for that file — the frontend fix it worked around (no auto-clear of the same-day-skip result, a real close button, skipped rows showing their invoice number) has landed and the test asserts it directly. Never mark an unobserved selector failure as a product defect: if a test fails and you're not sure whether it's a flake or a defect, reproduce it a second time with the assertion temporarily un-skipped before adding `// DEFECT:` + `test.fixme`.

This is a shared sandbox: other concurrent work on the same DS2_Frontend/DS2_Backend checkout and the same Postgres/MinIO instances can and did change real behavior and data mid-session (a grid rewrite that changed a checkbox's accessible name on selection, an S3 key-naming change, extra rows and an extra same-named fixture user left by another process's own testing). None of that is a reason to weaken an assertion — `lib/ui.js`'s shared helpers were hardened to be robust to it instead (stable CSS-class selectors instead of state-dependent accessible names, a quick-filter narrow instead of assuming page 1, `.first()` for a same-text match, a retry around the outstanding-balance fetch). If a run fails, re-run it once before concluding a helper needs another look — and if it's the same failure twice, it almost always is.
