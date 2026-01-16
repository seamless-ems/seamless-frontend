# Seamless Events - Beta Frontend

A Vite + React + TypeScript frontend for Seamless Events, an operational event management system. Built with shadcn/ui component patterns and Tailwind CSS.

**Project Philosophy:** "The Trello of event operations" - stays in the background, operational not decorative, professional not flashy.

**Current Status:** Beta phase - actively migrating features from offline prototype to production-ready app.

## Quick start

Requirements:
- Node.js (v18+ recommended) or a compatible environment used by the team
- npm or an alternative package manager (this project uses npm scripts)

Clone the repo, install dependencies and run the dev server:

```bash
git clone <repo-url>
cd seamless-frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## What you'll find here

- Vite as the dev server & build tool (`vite`, `vite.config.ts`)
- React 18 + TypeScript (`react`, `react-dom`, `typescript`)
- Tailwind CSS for styling (`tailwind.config.ts`, `index.css`) and `tailwindcss-animate`
- A set of UI primitives built using Radix UI and shadcn-style components in `src/components/ui`
- React Router v6 for client-side routing
- TanStack Query (`@tanstack/react-query`) for server state and data fetching patterns
- Sonner/Toaster components used for notifications

### Notable folders

- `src/` — app source code
	- `components/` — re-usable UI components. Many are shadcn-style wrappers around Radix primitives and utility components (accordion, dialog, toast, table, etc.).
		- `dashboard/` — cards and small components used by the dashboard pages
		- `layout/` — layout components such as `DashboardLayout.tsx`
		- `ui/` — low-level UI building blocks (toaster, tooltip, input, button, etc.)
	- `hooks/` — small React hooks used across the app (e.g. `use-mobile.tsx`, `use-toast.ts`)
	- `lib/` — utilities (e.g. `utils.ts`)
	- `pages/` — route entry components (Index, Events, EventDashboard, CreateEvent, SpeakerModule, SpeakerPortal, SpeakerIntakeForm, Team, Subscription, Settings, NotFound)
	- `types/` — TypeScript type definitions (e.g. `event.ts`)

### Routing

Routes are defined in `src/App.tsx` using React Router. Key routes include:

- `/` — landing / index page
- `/events` — list of events
- `/events/new` — create event
- `/event/:id` — event dashboard
- `/event/:id/speakers` — speaker module for an event
- `/event/:id/speakers/:speakerId` — speaker portal
- `/speaker-intake/:eventId` — public speaker intake form
- `/team`, `/subscription`, `/settings` — other app pages

Add new routes in `App.tsx`. Place route components inside `src/pages` and import them into `App.tsx`.

## Scripts

Key npm scripts are defined in `package.json`:

- `npm run dev` — start Vite dev server (default port 5173)
- `npm run build` — build production assets to `dist`
- `npm run build:dev` — build with development mode
- `npm run preview` — preview production build locally
- `npm run lint` — run ESLint across the repo
- `npm run deploy` — (optional) deploy `dist` to GitHub Pages using `gh-pages` (configured by `predeploy` → `deploy`)

## Styling & Design System

### Design Tokens
**Primary Color:** Slate Blue `#4E5BA6` (HSL: `231 36% 48%`)
**Font:** Inter (with system fallback)
**Philosophy:** Operational, neutral, professional - "stays in the background"

### CSS Variables
All design tokens are defined in `src/index.css`:
- Colors: `--primary`, `--primary-hover`, `--primary-subtle`
- Typography: `--font-h1` (28px), `--font-h2` (20px), `--font-h3` (16px), `--font-body` (14px)
- Spacing: `--space-xs` (4px) through `--space-2xl` (48px) - 8px base scale
- Layout: `--radius-card` (8px), `--radius-btn` (6px)

### Component Patterns
- **Buttons:** Outline style preferred (1.5px border, no fills)
- **Cards:** White background, light border, subtle shadow
- **No gradients** (except module badges)
- **No heavy animations** (basic hover only)

See `CLAUDE.md` for complete design system documentation.

## Data fetching & caching

- TanStack Query is set up at the top level (`QueryClientProvider` in `src/App.tsx`). Use `useQuery` and `useMutation` for server interactions; queries are cached and managed by the QueryClient.

## Notifications

- There are two notification systems present:
	- `Toaster` (custom wrapper around Radix/Toast) in `src/components/ui/toaster` and
	- `Sonner` integration in `src/components/ui/sonner`.

Use the provided `use-toast` hook to show notifications consistently.

## Conventions and tips

- File structure: pages for route-level components, components for reusable UI, ui/ for primitives.
- Alias: `@` is aliased to `./src` in `vite.config.ts`. Import with `@/components/...` or `@/pages/...`.
- Keep pages small — extract UI into `components/` when it repeats.
- Prefer TypeScript types in `src/types/` for domain models (e.g. `event.ts`).

## Backend API Integration

### API Documentation
The backend API structure is documented in `openapi.json` at the project root.

**Available Endpoints:**
- Authentication (Firebase token exchange)
- Events (full CRUD, modules, speakers)
- Team management (invite, roles, members)
- Speakers (CRUD, public endpoints, intake forms)
- Integrations (Google Drive, Microsoft OAuth)
- File uploads (presigned URLs + R2 storage)
- Subscription & billing

### Data Conversion
- **Backend returns:** snake_case (e.g., `first_name`, `start_date`)
- **Frontend uses:** camelCase (automatically converted via `deepCamel()` utility)
- **Input schemas:** camelCase
- **Output schemas:** snake_case

### Environment Variables
Create a `.env` file in the project root:

```env
VITE_API_URL=<backend-api-url>
VITE_FIREBASE_API_KEY=<firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
VITE_FIREBASE_PROJECT_ID=<firebase-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<firebase-messaging-sender-id>
VITE_FIREBASE_APP_ID=<firebase-app-id>
```

### Tracking API Gaps
When working with the API, if you need data or endpoints that don't exist:
1. Check `openapi.json` first
2. Document in `API_GAPS.md`
3. Coordinate with backend developer

See `CLAUDE.md` for complete API workflow guidelines.

## Testing and linting

- ESLint is set up; run `npm run lint` to check the codebase.
- There are no unit tests in the repo yet; adding tests (Jest/React Testing Library or Vitest) is recommended for components and hooks.

## How to add a new page

1. Create a new file `src/pages/MyNewPage.tsx` exporting a React component.
2. Add a route in `src/App.tsx`, e.g. <Route path="/my-page" element={<MyNewPage />} />.
3. Add any UI primitives under `src/components/` if you need reusable bits.

## Editor & formatting

- Follow TypeScript and ESLint rules. Consider adding Prettier or running formatting in your editor.

## Troubleshooting

- If you see type errors after changing package versions, run `npm install` and restart the dev server.
- If Tailwind classes don't appear, ensure `tailwind.config.ts` content globs include the file you edited and restart Vite.

---

## Local Prototype Reference

**Location:** `C:\Users\james\OneDrive\Documents\Seamless\Local Prototype\Seamless Demo\`

The offline prototype contains the complete design system and feature implementations that are being migrated to this beta project.

**Key Reference Files:**
- `index.html` - Complete working demo with all screens in one file
- `CSS_GUIDE.md` - Full design system documentation (Slate Blue color scheme, Inter font, spacing scale)
- `CLAUDE.md` - Project context, design decisions, and ways of working

**Migration Process:**
Features from the prototype are being systematically migrated to this production-ready React/TypeScript codebase. The prototype serves as the design reference and feature specification.

**What's Been Migrated:**
- ✅ Design system (colors, typography, spacing)
- ✅ Login screen design
- 🚧 Dashboard layouts (in progress)
- ⏸️ Speaker module
- ⏸️ Event management
- ⏸️ Team management

---



## TODOS:
- Every module needs to be able to work with every other one, and be possible to turn on/off individually
- Look at sharepoint integration - is it so bad?
## Settings
- Add asterisk for required form fields in Settings page
## Events:
- Add event website to event create
- Add event image upload to event create
- Add sender name to event create
## Schedules:
- It is possible that they want a schedule but without speakers - think about how to handle this
## Speakers:
- We need the background to be included for the promo cards in the speaker portal
- Add email designer (with brief templates) for promo cards in the speaker portal
- Add font color as an option
- Add google font options
- Add intake form embed code (iframe with event ID)

## Attendee
- Only integrate tito if we have attendee module enabled (same for speakers)

Test