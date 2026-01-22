# CLAUDE — Concise Summary

Project: Seamless Events — Beta Frontend (frontend-only repository)

Status: Active development. Focus next: Speaker Module migration from local prototype.

Recent highlights
- Event dashboard, event settings, breadcrumbs, and event routing fixed.
- Design system migrated (Slate Blue #4E5BA6, Inter font, tokens in `src/index.css`).
- Login redesign preserved auth flows (email/password, Google, Microsoft).
- API gaps tracked in `API_GAPS.md` (e.g., `from_name` field).

Goals (next session)
- Migrate speaker list, speaker portal, intake forms, embeds, and related UI.

How we work (critical rules)
- Frontend-only: never change backend. Document missing backend items in `API_GAPS.md`.
- If backend is required, ask user; with approval use mock data and add `// TODO` comments.
- Keep dev notes concise; use `// TODO:` sparingly.
- Follow design system strictly; prefer incremental, one-task-at-a-time changes.

Architecture & tooling (brief)
- Roles: `organizer` and `speaker`; mode persisted via `localStorage` and `DashboardLayout` prop.
- Routing: routes organized under `/organizer`, `/speaker`, and public embed/intake paths.
- Auth: Firebase auth; tokens exchanged and stored as `accessToken`; `ProtectedRoute` enforces auth.
- API client: `src/lib/api.ts` with `VITE_API_URL`; responses converted from snake_case → camelCase via `deepCamel()`.
- State: TanStack Query for data fetching and mutations.
- Styling: Tailwind + design tokens; no custom colors or spacing outside the system.

Design rules (short)
- Primary color: Slate Blue (#4E5BA6). Use outline buttons (1.5px) by default.
- No gradients (except module badges), no heavy animations, no emoji icons, no extra fonts.
- Use design tokens, type scale, and base spacing (8px increments).

Deployment & env
- Deploys to Firebase Hosting. Use `npm run build` and `npm run deploy`.
- Required env vars: `VITE_API_URL`, Firebase keys (see `.env` example in CLAUDE.md).

Key files & references
- Prototype: Local demo at `C:\Users\james\OneDrive\Documents\Seamless\Local Prototype\Seamless Demo\` (open `index.html`).
- Core files: `openapi.json`, `API_GAPS.md`, `CLAUDE.md`, `src/index.css`, `src/lib/api.ts`, `src/components/layout/DashboardLayout.tsx`.

Quick dev commands
```
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview build
npm run lint     # lint
npm run deploy   # deploy to Firebase
```

Working preferences
- Incremental work, ask before design decisions, preserve functionality, document mock data needs.
