# seamless-frontend

A Vite + React + TypeScript frontend scaffolded around the shadcn/ui component patterns and Tailwind CSS. This repository powers the Seamless EMS frontend (UI for events, speakers, teams, subscriptions and settings).

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

## Styling & Design system

- Tailwind is configured in `tailwind.config.ts`. The project uses CSS variables for theme colors and some extended theme values (module colors, sidebar tokens, animations).
- Global styles are in `src/index.css` and `src/App.css`.
- Many components are written as small, composable primitives under `src/components/ui` — prefer reusing them over writing new CSS.

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

## Environment & backend

This repo contains only the frontend. Any backend API base URL or environment variables the app requires should be documented here when added. Currently there are no .env or API-specific files included in the repository root.

If the app expects an API host, add it to a `.env` and reference it from code with `import.meta.env.VITE_API_URL` (Vite convention).

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
- If Tailwind classes don’t appear, ensure `tailwind.config.ts` content globs include the file you edited and restart Vite.



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