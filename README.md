# CivicFix

CivicFix is a civic issue lifecycle platform: report, verify, detect duplicates, aggregate community support, prioritize, assign, resolve, and verify resolution.

## Repository layout

- `backend/` - Express 5 + TypeScript API with MongoDB-backed authentication and `GET /api/health`.
- `admin/` - React + Vite + TypeScript authority dashboard foundation.
- `mobile/` - Expo SDK 57 + React Native + TypeScript citizen app foundation.

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

The mobile app uses `EXPO_PUBLIC_API_URL` for the API base URL. Android emulators default to `http://10.0.2.2:4000/api`; physical devices should use the development computer's LAN IP, for example `http://192.168.1.20:4000/api`.

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

`UNDER_REVIEW -> REJECTED` is also supported. `ASSIGNED` must be reached through the admin assignment endpoint; `IN_PROGRESS` can be set by the assigned active authority or an admin. Resolution and citizen verification are not implemented yet.

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

## Phase 4B authority resolution

Phase 4B extends the authority workflow:

`IN_PROGRESS -> RESOLVED -> VERIFICATION_PENDING`

`RESOLVED` means an authority has submitted a resolution description and evidence. It does not mean the civic issue is permanently closed. Original citizen evidence is preserved as BEFORE media, while authority uploads are stored separately as AFTER media in the `Resolution` collection.

Resolution APIs:

- `POST /api/issues/:id/resolution` - assigned authority or admin, multipart description plus `afterPhotos`/optional `afterVideos`.
- `GET /api/issues/:id/resolution` - resolution details and evidence.
- `GET /api/issues/:id` - includes safe resolution information when available.

Authorities can resolve only their own active `IN_PROGRESS` issues. Admins may resolve active in-progress issues. Citizens cannot submit or modify resolutions. Citizen verification controls, `CLOSED`, reopening, verification thresholds, and automatic reopening are Phase 4C and are not implemented.
