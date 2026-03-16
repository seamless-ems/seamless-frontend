# Seamless Events - Beta Frontend

## IMPORTANT: Always remind James to do a GIT Pull before we start development — do not start coding until he confirms it is complete

A Vite + React + TypeScript frontend for Seamless Events, an operational event management system. Built with shadcn/ui component patterns and Tailwind CSS.

**Project Philosophy:** "The Trello of event operations" — stays in the background, operational not decorative, professional not flashy.

**Current Status:** Beta phase — actively migrating features from offline prototype to production-ready app.

⚠️ **IMPORTANT:** Proceed carefully and do not make any structural changes (component refactors, major integrations, routing changes) without first requesting approval. Major changes can impact data flow and backend connectivity.

## Quick start

Requirements:
- Node.js (v18+ recommended)
- npm

```bash
git clone <repo-url>
cd seamless-frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## What to read next
- Development & onboarding: `CLAUDE.md`
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

## GitHub Workflow (WSL)

**Push:**
```bash
git status
git add .
git commit -m "your message"
git push origin beta
```

**Pull:**
```bash
git pull origin beta
```

Active branches: `main` (stable), `beta` (active development)
