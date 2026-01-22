# Seamless Events - Beta Frontend

A Vite + React + TypeScript frontend for Seamless Events, an operational event management system. Built with shadcn/ui component patterns and Tailwind CSS.

**Project Philosophy:** "The Trello of event operations" - stays in the background, operational not decorative, professional not flashy.

**Progress & Updates:** Primary progress and session notes are maintained in [CLAUDE.md](CLAUDE.md). Ephemeral session files (e.g., session summaries) have been archived to `archive_docs/` to keep the repo root clean.

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
# Seamless Events - Beta Frontend

A Vite + React + TypeScript frontend for Seamless Events. This README focuses on setup, quickstart and where to find documentation.

## Quick start

Requirements:
- Node.js (v18+ recommended)
- npm

Clone, install, and run:

```bash
git clone <repo-url>
cd seamless-frontend
npm install
npm run dev
```

Open http://localhost:5173.

## What to read next
- Development & onboarding: `CLAUDE.md` (brief project rules, priorities, and next steps)
- API gaps and backend notes: `API_GAPS.md`
- Full API spec: `openapi.json`

## Notable folders

- `src/` — app source (components, pages, hooks, lib, types)
- `public/` — static assets

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

For design system, routing, and architecture details see `CLAUDE.md`.