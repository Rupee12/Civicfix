# CivicFix

CivicFix is a responsive civic issue operations demonstration built with React, TypeScript, Vite, React Router, and Tailwind CSS v4.

## Run locally

Requirements are defined in `.mise.toml`.

```bash
pnpm install
pnpm dev
```

Create a production bundle with:

```bash
pnpm build
```

## Demonstration mode

Choose **Enter demonstration** on `/login`. The application uses fictional Alder Bay issues and does not connect to real citizens, geographic intelligence, authentication, storage, or AI services.

Issue workflow changes are persisted in browser `localStorage`. Use **Settings → Reset demonstration data** to restore the original records. Password fields are validation-only and are never persisted. Profile photo previews remain in the current session.

Implemented locally:

- Responsive application shell and all documented routes
- Search, status/category filters, sorting, selection, and issue navigation
- Centralized valid issue-status transitions
- Department and authority assignment
- Evidence and citizen-verification simulations with explicit demonstration labels
- Shared issue state across dashboard, map, details, notifications, SLA, analytics, and exports
- Interactive illustrative Alder Bay map and hotspot exploration
- Administrator profile editing and validated photo previews
- Password requirement validation without simulated password changes
- Real, formula-injection-protected CSV downloads
- Browser print / save-to-PDF report flow
- Preferences and reset controls
- Keyboard focus treatments and reduced-motion support

## Connected mode

A connected backend adapter is not included in this build. There is deliberately no silent fallback or simulated success for sign-in, password reset, password changes, citizen intake, file storage, map tiles, or AI inference.

To add connected mode, provide a server-backed adapter that enforces:

- Authentication, session expiry, and role-based authorization
- Issue transition rules and immutable audit history
- Input validation and storage access policies
- Citizen verification separation
- Department/authority assignment constraints
- Secure media storage and signed access
- Server-generated reports where required

Suggested environment variable names for a future adapter:

```text
VITE_CIVICFIX_MODE=connected
VITE_API_BASE_URL=
VITE_AUTH_PUBLIC_KEY=
VITE_MAP_STYLE_URL=
```

Do not place private keys or service secrets in `VITE_` variables; Vite exposes them to the browser.

## Known limitations

- Alder Bay, all people, places, issues, metrics, and insights are fictional.
- The map is an accessible illustrative fallback, not a live map.
- AI insights are static preview examples, not model output.
- Email delivery, authentication, cloud uploads, and live geographic services require external integrations.
- The current app is bundled as a single client chunk; Vite reports a non-blocking size warning. Route-level lazy loading is a suitable next optimization.

## Deployment

Deploy the output of `pnpm build` from `dist/` to a static host configured to serve `index.html` for client-side routes. Configure any future connected API and authentication origins separately, and never include service secrets in exported source.
