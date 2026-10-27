# CivicFix

CivicFix is a civic issue lifecycle platform: report, verify, detect duplicates, aggregate community support, prioritize, assign, resolve, and verify resolution.

## Repository layout

- `backend/` - Express 5 + TypeScript API with MongoDB-backed authentication and `GET /api/health`.
- `admin/` - React + Vite + TypeScript authority dashboard foundation.
- `mobile/` - Expo SDK 57 + React Native + TypeScript citizen app.

## Prerequisites

- Node.js 24 or compatible LTS release
- npm 11 or compatible npm release
- MongoDB for backend data phases

## Run each project

```powershell
npm install --prefix backend
npm run dev --prefix backend

npm run dev --prefix admin

npm install --prefix mobile
npm run start --prefix mobile
```

The backend listens on `http://localhost:4000` and the admin app on `http://localhost:5173` by default.

## Configuration

Copy `backend/.env.example` to `backend/.env` for local backend configuration. Set a unique `JWT_SECRET` with at least 32 characters. Secrets and database credentials must remain outside source control.

For local mobile development, set `EXPO_PUBLIC_API_URL` in the ignored `mobile/.env.local` to the backend address reachable from your device, such as `http://<LAN_IP>:4000/api`; use the Render URL for devices that should use production. The production EAS profiles set `EXPO_PUBLIC_API_URL` to the deployed API in `mobile/eas.json`, and Expo compiles that public value into each app build. If Android maps are enabled, configure `GOOGLE_MAPS_API_KEY` in the EAS `production` environment as well as locally; do not commit the key.

## Phase 2 authentication API

- `POST /api/auth/register` - creates a citizen account; public requests cannot choose a privileged role.
- `POST /api/auth/login` - returns a JWT and public user profile.
- `GET /api/auth/me` - returns the authenticated public user profile and requires `Authorization: Bearer <token>`.

For development only, `npm run seed --prefix backend` creates these fictional accounts:

- `admin@civicfix.local` / `CivicFixAdmin123!`
- `authority@civicfix.local` / `CivicFixAuthority123!`
- `citizen.one@civicfix.local` / `CivicFixCitizen123!`
- `citizen.two@civicfix.local` / `CivicFixCitizen456!`

Do not use these credentials outside local development.

## Phase 3A issue reporting

Backend endpoints now include:

- `POST /api/issues` - authenticated multipart issue creation with up to 5 photos and 1 video.
- `GET /api/issues/:id` - public issue details.
- `GET /api/issues` - public bounded pagination and category/status/severity filters.
- `GET /api/issues/nearby` - MongoDB `$geoNear` lookup in meters, bounded to 5 km.
- `GET /api/issues/my` - authenticated reports for the current JWT user.

The mobile app uses `EXPO_PUBLIC_API_URL` for the API base URL and falls back to `https://civicfix-api-22p5.onrender.com/api`. For local development, set `EXPO_PUBLIC_API_URL` in `mobile/.env.local` to a backend address reachable from the phone/emulator (for example, a development computer's LAN IP); do not use that local override for a production build. EAS embeds this public URL in the app bundle at build time. The EAS `production` and `production-apk` profiles set the deployed URL explicitly; build an installable Android APK with `eas build --platform android --profile production-apk` from `mobile/`.

Issue success paths require MongoDB. When MongoDB is unavailable locally, the backend remains available for health and validation/auth guards but database-backed issue operations cannot be verified.

## Phase 3B duplicate detection and community aggregation

Phase 3B adds a separate `IssueReport` document for every citizen submission. A canonical `Issue` keeps references to its reports; reports are never deleted when they are associated with an issue. `IssueSupport` uses a unique `(issue, user)` index so one citizen can support an issue only once.

Duplicate scoring uses:

`duplicateScore = geoScore * 0.40 + categoryScore * 0.25 + textScore * 0.35`

Candidates are limited to 500 meters, ranked by score, and returned only at `POSSIBLE` (0.50-0.79) or `HIGH` (0.80+) confidence. Different categories and far-edge matches are kept below the suggestion threshold. No automatic merge occurs.

Additional endpoints:

- `POST /api/issues/check-duplicates`
- `POST /api/issues/:id/support`
- `DELETE /api/issues/:id/support`
- `GET /api/issues/:id/support`
- `GET /api/issues/:id/reports` - authority/admin only.

The local MongoDB service is required for these flows. The implementation uses compensating cleanup around multi-document writes because the local standalone MongoDB service does not provide replica-set transactions; counters are updated with atomic `$inc` operations and support uniqueness is enforced by MongoDB.

## Phase 3C priority intelligence

Priority is deterministic and server-generated. The score is the sum of:

- Severity: 25 points
- Community reports: 20 points
- Community support: 15 points
- Issue age: 15 points
- Affected people: 10 points
- Safety impact: 15 points

Scores map to `LOW` (0-24), `MEDIUM` (25-49), `HIGH` (50-74), and `CRITICAL` (75-100). Configuration lives in `backend/src/config/priorityConfig.ts`; explanations and component totals are returned by `GET /api/issues/:id/priority`.

Additional API support:

- `GET /api/issues/:id/priority`
- `GET /api/issues?sort=priority&priorityLevel=CRITICAL`
- `GET /api/admin/priority` - live priority metrics and ranked rows for authorities/admins.

Priority recalculates after canonical issue creation, support creation, and support removal. `CLOSED` and `REJECTED` issues retain their last stored score and are excluded from active priority rankings. Run `npm run backfill-priority --prefix backend` after deploying the schema changes to populate existing documents.

The admin dashboard reads `VITE_API_URL` and `VITE_ADMIN_TOKEN`; it shows a configuration notice rather than fabricated metrics when the token is absent.

## Phase 4A authority workflow

Phase 4A adds dynamic departments, authority officers, department membership, audited assignment, scoped authority queues, and centralized workflow transitions. The implemented transition path is:

`REPORTED -> UNDER_REVIEW -> VERIFIED -> ASSIGNED -> IN_PROGRESS`

`UNDER_REVIEW -> REJECTED` is also supported. `ASSIGNED` must be reached through the admin assignment endpoint; `IN_PROGRESS` can be set by the assigned active authority or an admin. Resolution and citizen verification are implemented by the resolution and verification APIs.

Workflow APIs include:

- `POST/GET/PATCH /api/admin/departments`
- `POST/GET/PATCH /api/admin/authorities`
- `GET /api/admin/workload`
- `PATCH /api/issues/:id/assignment` - admin only.
- `PATCH /api/issues/:id/status` - admin or assigned authority, subject to transition rules.
- `GET /api/issues/:id/status-history` - authenticated users.
- `GET /api/authority/issues` - current active authority only; identity comes from JWT.

Citizens cannot create departments or authorities, assign issues, or change workflow status. Authorities cannot assign issues or access another officer's queue. Assignment validates active department membership and records both assignment and status history.

The explicit `npm run seed --prefix backend` command creates fictional departments and a department-linked development authority. The standalone MongoDB limitation remains: multi-document workflow writes use compensating cleanup rather than transactions.

## Implementation phases

1. Project foundations and independent run checks
2. Backend foundation: persistence, authentication, roles, validation, and errors
3. Issue lifecycle, media, location, and pagination
4. Duplicate detection and merge/link preservation
5. Community support, comments, and priority scoring
6. Assignment, resolution evidence, citizen verification, and notifications
7. Mobile citizen workflows
8. Authority dashboard, maps, and analytics
9. Security hardening, seed data, tests, and production documentation

## Notifications, SLA, and reporting

Authenticated users can use `GET /api/notifications`, `PATCH /api/notifications/:id/read`, and `PATCH /api/notifications/read-all`. Notification records are owned by the recipient and use an idempotent workflow event key.

Issue SLAs are calculated in UTC from the persisted issue creation time using the priority targets in `backend/src/config/slaConfig.ts`: critical 24 hours, high 72 hours, medium 168 hours, and low 336 hours. Closed and rejected issues stop the clock; reopening preserves the original SLA record. `GET /api/sla/issues/:id` returns permitted SLA details and `POST /api/sla/process` (admin only) processes overdue issues idempotently. Deployments should invoke the process endpoint from an external scheduler (for example, a Render Cron Job or an approved scheduler) because the web process itself is not a durable job runner.

Administrators configure new SLA targets with `GET/PATCH /api/sla/configuration`. Values are persisted in the singleton `SlaConfiguration` MongoDB document, validated from 1 through 8,760 hours, and do not rewrite deadlines already stored on existing issues. The included Render blueprint defines a `civicfix-sla-processor` Cron Job running every 15 minutes. Set these variables in both the web service and Cron Job: `CIVICFIX_API_URL` (for example, `https://civicfix-api-22p5.onrender.com` without `/api`) and the same randomly generated `SLA_CRON_SECRET` (at least 32 characters). The Cron Job sends:

```powershell
node -e "fetch(process.env.CIVICFIX_API_URL + '/api/sla/process',{method:'POST',headers:{'x-sla-cron-secret':process.env.SLA_CRON_SECRET}}).then(async r=>{console.log(r.status,await r.text());if(!r.ok)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"
```

The endpoint accepts either an active admin JWT or the constant-time checked scheduler secret; requests without either credential are rejected. Repeated calls are safe because warning notifications use unique event keys and escalation claims use an atomic SLA-level update plus a unique `(issueId, level)` index.

Administrators can download filtered issue CSV data from `GET /api/admin/reports/export`. The export is authorization-protected, capped at 10,000 rows, escapes CSV values, and prefixes formula-like values to reduce spreadsheet injection risk.

## Administrator password recovery

The admin dashboard's **Settings** page includes a password-change form. `PATCH /api/admin/me/password` requires a valid admin JWT, verifies the current password, enforces the existing 8-128 character password limit and matching confirmation, and hashes the new password with the same bcrypt configuration used by login. Password changes do not revoke already-issued JWTs; there is no refresh-token or token-revocation store in the current authentication design.

For a forgotten password, use the backend's one-off interactive recovery script rather than the development seed. It updates only an existing active `ADMIN` matching the exact email; it never creates an account. Run it from an interactive terminal after verifying the intended `backend/.env` target:

```powershell
$env:ADMIN_RECOVERY_EMAIL = "the-existing-admin@example.com"
$env:ADMIN_RECOVERY_EXPECTED_HOST = "the-expected-mongodb-host"
$env:ADMIN_RECOVERY_EXPECTED_DATABASE = "the-expected-database-name"
npm run admin:recover --prefix backend
```

The script checks those exact target values against the configured MongoDB connection, displays the non-secret environment/host/database target, requires typing the full target confirmation, then prompts twice for the temporary password without echoing it. Use the temporary password supplied by the administrator and change it immediately after signing in. The script does not print passwords, hashes, or database connection errors containing credentials. Clear the `ADMIN_RECOVERY_*` variables after use.

Production recovery is disabled unless `ADMIN_RECOVERY_ALLOW_PRODUCTION=true` is explicitly set. Do not set that flag or point the script at production until the target account, host, database, exact command, and effect have been reviewed and the production reset explicitly approved. The reset changes only that existing administrator document's password hash; it does not alter other users or data. Do not run `npm run seed` for account recovery.

## Phase 4B authority resolution

Phase 4B extends the authority workflow:

`IN_PROGRESS -> RESOLVED -> VERIFICATION_PENDING`

`RESOLVED` means an authority has submitted a resolution description and evidence. It does not mean the civic issue is permanently closed. Original citizen evidence is preserved as BEFORE media, while authority uploads are stored separately as AFTER media in the `Resolution` collection.

Resolution APIs:

- `POST /api/issues/:id/resolution` - assigned authority or admin, multipart description plus `afterPhotos`/optional `afterVideos`.
- `GET /api/issues/:id/resolution` - resolution details and evidence.
- `GET /api/issues/:id` - includes safe resolution information when available.

Authorities can resolve only their own active `IN_PROGRESS` issues. Admins may resolve active in-progress issues. Citizens cannot submit or modify resolutions. Citizen verification is restricted to reporters and supporters, uses configured vote thresholds, and can close or reopen an issue.

## Production deployment

The repository includes [`render.yaml`](./render.yaml) as a deployment blueprint for a Render API service and static admin site. It does not contain credentials and cannot deploy by itself.

1. Create a MongoDB Atlas project and a dedicated application database user with read/write access only to the CivicFix database. Allow the selected hosting provider's outbound access in Atlas network access. Prefer the provider's documented static egress IPs; do not use `0.0.0.0/0` unless it is a temporary, explicitly accepted development trade-off.
2. Create a Cloudinary account and obtain the cloud name, API key, and API secret. Configure these only in the backend/hosting provider secret manager. Cloudinary stores issue and resolution media durably; the API secret must never be exposed to mobile or admin builds.
3. Create a Render Blueprint from `render.yaml`. Fill every `sync: false` value in Render's secret/environment interface:
   `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and the admin `VITE_API_URL`. Keep `MEDIA_STORAGE=cloudinary` in production; production startup rejects local storage.
4. Set `CORS_ORIGINS` to the exact HTTPS admin origin(s), comma-separated. Mobile requests do not send a browser Origin and do not require a mobile CORS entry.
5. After deployment, verify `https://<api-host>/api/health` returns HTTP 200 with `"database":"connected"`. A 503 response means the service is running but MongoDB is not ready.

### Mobile development and production builds

Copy [`mobile/.env.development.example`](./mobile/.env.development.example) to `mobile/.env.local` for local development. Use a reachable LAN address for a physical phone; never use `localhost` or `127.0.0.1`.

For a production build, copy [`mobile/.env.production.example`](./mobile/.env.production.example) to `mobile/.env.local`, replace the example host with the verified HTTPS API URL, and rebuild. Expo public variables are embedded at build time; restarting Metro does not update an installed app.

From `mobile/`, `npx eas login` and `npx eas build:configure` are required once an Expo account/project is available. `npx eas build --platform android --profile preview` creates an installable internal APK. `npx eas build --platform android --profile production` creates an Android App Bundle for Google Play. EAS manages the release keystore when the project owner approves it; do not commit signing credentials or keystores. Increment `android.versionCode` for every Android release and update `version` for user-visible releases.

No cloud deployment, public API URL, release APK, or second-device test has been claimed in this audit because provider accounts, Atlas credentials, Android SDK/ADB, and a physical test device were not available in this environment.
