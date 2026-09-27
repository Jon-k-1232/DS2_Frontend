# DS2 Frontend

DS2 Frontend is the React single-page application for the DS2 time, billing, and invoicing platform. It provides dashboards, customer management, job tracking, time tracker ingestion, and invoicing workflows for admins, managers, and staff.

Current package version: `0.1.0.32` (mirrors `package.json`). For backend details refer to [DS2_Backend/README.md](../DS2_Backend/README.md).

## Stack Overview
- React 18 with React Router v6.
- Material UI (including X Data Grid) and Emotion/styled-components for theming and layout.
- Axios-based API services in `src/Services`.
- Context-based state (`src/App.js`) with JWT handling via `TokenService`.
- Jest + React Testing Library for automated tests.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` with the variables below (all `REACT_APP_*` values are injected at build time).
3. Start the development server:
   ```bash
   npm run start:dev
   ```
   This runs on port `3003` by default and calls the backend using `REACT_APP_API_ENDPOINT`.
4. Production-like start:
   ```bash
   npm start
   ```
5. Build static assets:
   ```bash
   npm run build
   ```
6. Run tests:
   ```bash
   npm test
   ```

## Environment Variables

| Variable | Type | Purpose |
| --- | --- | --- |
| `REACT_APP_API_ENDPOINT` | URL | Base URL for the backend API used by the SPA. |

## Project Structure
- `src/App.js` – Initializes theme, global context, and router.
- `src/Routes/PrimaryRouter.js` – Public sign-in, session recovery and protected workspace shell.
- `src/Routes/WorkspaceRoutes.js`, `navigation.json` – Canonical routes and eight role-filtered navigation categories.
- `src/Routes/legacyRoutes.json`, `routePaths.js` – Old bookmark redirects and stable client, invoice and editor URLs.
- `src/Routes/RecordPage.js`, `useWorkspaceData.js` – Scoped record/reference loading, retry and stale-response protection.
- `src/Pages/*` – Feature-specific pages (Customers, Jobs, Invoices, Transactions, Time Tracking, Account, etc.).
- `src/Routes/GroupedRoutes/*` – Retained client/invoice tabs, dashboard and tracker administration. Category-level routes now live in `WorkspaceRoutes.js`.
- `src/Layouts` – Dashboard and authentication layouts.
- `src/Services/ApiCalls` – Axios wrappers for backend endpoints plus initial data loading.
- `src/Theme` – Material UI theme configuration and global styles.

## Docker & Deployment
- `Dockerfile` installs dependencies, builds the production bundle, and runs `npm start`.
- `docker-compose.frontend.yml` runs the container on port `3003`, mounts the repository into `/app`, and joins the shared Docker network `ds2_network`.
- The GitHub Actions workflow (`.github/workflows/docker-image.yml`) runs `npm test` before building, tags releases using the version from `package.json`, builds/pushes Docker images (`marine1232/ds2-frontend`), and a self-hosted runner restarts the compose service with a generated production `.env`.

## Operational Notes
- JWTs are stored in `sessionStorage` and refreshed via `/auth/renew`; ensure the backend CORS config aligns with `FRONT_END_URL_*`.
- Time tracking administration routes require manager/admin roles and mirror the backend `/time-tracking` and `/time-tracker-staff` APIs.
- Update `public/version.txt` if you want the UI to display a new number, but release tagging now reads the version from `package.json` during CI.
- The drawer's server-status widget polls `/health/status` every 60 seconds; adjust `src/Layouts/Drawer/ServerStatus.js` if you need a different cadence.

See the standalone repository at [github.com/Jon-k-1232/DS2_Frontend](https://github.com/Jon-k-1232/DS2_Frontend) for issue tracking and history.

## Workspace navigation (H6)

Clients, Time & Work, Billing, Payments & Credits, Receivables, Reports, Time Tracking and Settings group all H1–H5 screens. The shell supplies breadcrumbs, task shortcuts, a keyboard skip link and responsive navigation. Old links redirect with their IDs, query and fragment; editors load from the URL and recover explicitly when a link lacks its record. Permissions stay with the action: any admin can apply adjustments alone; catalog management still permits managers.

See the [route and interaction contract](../DS2_Backend/docs/platform/workspace-navigation.md), [before/after maps and acceptance](../DS2_Backend/docs/decisions/2026-09-26-run-H6-results.md) and [browser suite](e2e/README.md). H6 has no backend API rename or migration.

## H9 bounded loading

Workspace routes and individual record forms load through React.lazy/Suspense. Idle prefetch covers Transactions/Enter time and Create invoices. Jobs and retainers use independent server-paged registers; pickers request only the selected client's jobs. Customer identities stay local through1000 active clients and switch to debounced server search above that threshold.

`Services/listViews.js` derives local grid views and patches changed customer identities. Register GET responses must never replace shared reference data. Committed save warnings mean saved: reload without resubmitting. Deploy this frontend with the H9 backend and migration047. See the [loading contract](../DS2_Backend/docs/platform/performance.md), [results](../DS2_Backend/docs/decisions/2026-09-26-run-H9-results.md), Jest lookup/state tests and Playwright performance/lookup scenarios.
