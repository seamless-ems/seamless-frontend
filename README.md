# Seamless Events - Beta Frontend

A Vite + React + TypeScript frontend for Seamless Events, an operational event management system. Built with shadcn/ui component patterns and Tailwind CSS.

**Project Philosophy:** "The Trello of event operations" - stays in the background, operational not decorative, professional not flashy.

**Progress & Updates:** Primary progress and session notes are maintained in [CLAUDE.md](CLAUDE.md). Ephemeral session files (e.g., session summaries) have been archived to `archive_docs/` to keep the repo root clean.

**Current Status:** Beta phase - actively migrating features from offline prototype to production-ready app.

⚠️ **IMPORTANT:** When making changes to this codebase, proceed carefully and do not make any structural changes (component refactors, major integrations, routing changes) without first requesting approval. Major changes can impact data flow and backend connectivity. Always test thoroughly and communicate changes clearly.

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

## Components & Features

### CardBuilderV2 (`src/components/CardBuilderV2.tsx`)
**Status:** ✅ Complete & Stable (Unified card builder - replaces PromoCardBuilder and WebsiteCardBuilder)

Professional Canva-like design tool built with Fabric.js for creating both promo cards and website cards:

**Architecture:**
- **Unified builder**: Single component with card type toggle (Promo/Website)
- **Dynamic elements**: Automatically generates card elements from event form configuration
- **Drop zone system**: Templates define WHERE content goes (position, size, shape), NOT the actual content
- **Test images**: Preview-only (never saved to config) - upload samples to see how layout looks
- **Template config**: Saves layout positions, sizes, shapes, colors (NOT image URLs)
- **Form integration**: Custom form fields can be toggled to appear in card builder via `showInCardBuilder` flag

**3-Column Layout:**
- **Left (50%):** Canvas with visual snap guides (pink dashed lines)
- **Middle (25%):** Card type selector + Element library (click to add) + test image uploads + layers panel
- **Right (25%):** Properties panel with number inputs for precision

**Key Features:**
- **Card Types**: Toggle between Promo and Website cards with separate configs
- **Dynamic Elements**: Reads form config via API and creates elements from custom fields
- **Social Media Icons**: LinkedIn, Twitter, Facebook, Instagram, GitHub support
- Visual alignment snapping (edges, centers, adjacent elements)
- Multi-select batch editing (font size, weight, color, opacity)
- Layers panel with drag-to-reorder and z-index management
- Alignment toolbar (6 quick-align buttons)
- Undo/Redo (Ctrl+Z/Y) with 50-state history
- Zoom controls (10%-300%)
- Number inputs for precise positioning/sizing
- Headshot shape toggle (circle/square/rectangle)
- Empty canvas start with click-to-add elements
- PNG export with proper clipping paths
- localStorage persistence per event + card type

**Access:**
- Route: `/organizer/event/:id/card-builder`
- Accessible from Speaker Module via "Card Builder" button
- Fullscreen editing experience with back navigation

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

For design system, routing, and architecture details see `CLAUDE.md`.

##GitHub Push Do in WSL
- git status
- git add .
- git commit -m "account, speaker portal updates" 
- git push origin beta

##GitHub Pull
- git pull origin beta

## TODOs:
- force all image uploads to be png or jpeg (no pdfs etc.)
- add form title and form description, boolean show_title_description for (FormConfig object) (default on with Event Title, "please submit")
- Do folders in google drive by speaker information/ speaker name/ headshot.png
- Do folders in google drive by call for speakers/ speaker name/ headshot.png
- Make the call for speakers and speaker information fully seperate in master google sheet
- Don't autofill sheet columns. On creation put instructions in the column headers
- Add Speaker/ FormConfig optional field for "talk_topic"
- For the select speakers make this default off
- For edit form we need both radio buttons and checkboxes as options for the builder
- Add custom font upload for card builder (and then use that font in the card builder)
- Apply to all button for card builder (speaker promo card download)