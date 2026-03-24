# CLAUDE.md — Project Briefing

**This file is a current-state snapshot, not a log.**

Rules for every agent that touches this file:
- **Edit, never append.** When something ships, update the status line — don't add a "completed" note below it.
- **Remove, don't archive.** Finished TODOs get deleted. Known issues that are fixed get deleted.
- **No history.** Changelogs, "recent changes", and session summaries do not belong here. Git has that.
- **Keep it short.** If you're making it longer, you're doing it wrong. Trim wherever you can.

---

## Project at-a-glance
- **Name:** Seamless Events — Beta Frontend
- **Status:** Active development (frontend-only)
- **Primary focus:** Speaker module and card builder

## How to onboard
1. Read `README.md` for setup.
2. Read this file for current priorities and rules.
3. Check `API_GAPS.md` before any API-related work.

---

## Working rules
- **CardBuilder:** frontend and backend rendering must match exactly. No frontend-only visual styles (e.g. text stroke) unless also in the backend HTML renderer. See `example-speaker-website-card.html` and `corresponding-config-speaker-website-card.json`.
- **Frontend-only:** no backend changes. Document gaps in `API_GAPS.md` and ask the user.
- **Mock data:** only with explicit approval; mark with `// TODO: Replace with API data`.
- **No completion docs:** never create summary/review/completed files. Update this file in place. Report results verbally.
- **CSS consistency:**
  - Cards: `bg-card border border-border hover:shadow-sm hover:border-primary`
  - Tables: `rounded-lg border border-border overflow-hidden`, header `bg-muted/30`, rows `hover:bg-muted/40`
  - Badges: `bg-success/10 text-success border-success/30` (approved), `bg-warning/10 text-warning border-warning/30` (pending)
  - Spacing: tab content `pt-6`, forms `space-y-6`
- **Commits:** only when explicitly instructed.

---

## Current priority
**Promo Card Templates** — blank canvas today, needs templates and onboarding flow.

1. Implement `PROMO_PRESETS` — social media formats: square 1080×1080, landscape 1080×608, story 608×1080.
2. Promo onboarding flow gated behind `cardType === 'promo'`, localStorage key `seamless-card-builder-onboarding-promo-v1`.
3. No bleed between website and promo template logic.

---

## Known issues
- **`nameFormat: "two-line"`** — saves correctly but embed renders single line. Backend bug (see API_GAPS.md).
- **`company` / `companyLogo`** — not persisting after server save/reload. Backend bug.
- **Custom field keys** — backend strips underscores (`custom_123` → `custom123`). Frontend has fallback logic.
- **ShareDialog** — UI complete, not yet wired to backend.
- **Card downloads** — open in new tab only; PNG export not yet available (see API_GAPS.md).
- **Content history attribution** — frontend sends `createdBy` but backend not storing/returning it (see API_GAPS.md).
- **Content archive** — stub only; backend endpoint not yet available (see API_GAPS.md).
- **`embed_enabled` toggle** — optimistic UI only; backend field not yet implemented (see API_GAPS.md).

---

## Where to look first
- `src/components/CardBuilder.tsx` — Fabric.js card builder (all card types)
- `src/components/organizer/SpeakersTable.tsx` — asset hub table (downloads, copy, status)
- `src/components/organizer/ShareDialog.tsx` — share modal (UI only)
- `src/components/organizer/SpeakerPreviews.tsx` — fetches and embeds card HTML from API (white bg, no scroll, expands to card size)
- `src/components/organizer/SpeakerCardTab.tsx` — Speaker Card / Social Card tab (approval, share, preview)
- `src/components/organizer/SpeakerContentTab.tsx` — Content tab (upload, replace, archive, restore, version history)
- `src/pages/organizer/SpeakerPortal.tsx` — individual speaker, 4 URL-driven tabs: Info / Speaker Card / Social Card / Content
- `src/pages/organizer/SpeakerModule.tsx` — speaker module main page ⚠️ see routing note
- `src/lib/api.ts` — API functions
- `openapi.json` — API spec (source of truth)

---

## ⚠️ Card Builder Routing

`/organizer/event/:eventSlugId/website-card-builder` is handled by **SpeakerModule**, not `WebsiteCardBuilderPage`. Both import `CardBuilder` — SpeakerModule is the one that matters.

Event routes use `:id` (bare UUID). All API calls use this directly.

---

## Card Builder — website vs promo split

`CardBuilder.tsx` serves both types via `cardType` prop (`"website" | "promo"`). Shared canvas engine, fully separate template/onboarding systems.

**Website (DONE — minor outstanding)**
- 9 templates: Square (Overlay, Headline, Spotlight), Landscape (Overlay, Side by Side, Editorial), Portrait (Overlay, Spotlight, Brand Forward)
- 4-step onboarding modal; localStorage key `seamless-card-builder-onboarding-website-v1`
- Rule of 3: exactly 3 templates per shape, do NOT add a 4th
- Outstanding: `nameFormat: "two-line"` backend rendering bug (see Known Issues)

**Promo (TODO)**
- Opens to blank canvas today
- Needs `PROMO_PRESETS`, separate onboarding, separate localStorage key
- Do NOT touch or reuse website preset arrays

---

## Card Builder — key behaviours (non-obvious)
- **Text layout:** name 55px / title 28px / company 28px defaults. Auto-shrink: name to 1 line (2 if `two-line`), title wraps 2 lines max. DOM `getBoundingClientRect()` is the only reliable measurement method.
- **`skipRerenderRef`:** set `true` before position/size-only `setConfig` calls (drag, arrow nudge) to prevent full canvas rebuild.
- **`bgIsGenerated` flag:** template cards generate a background PNG for the backend only. Guard `setTemplateUrl` calls with `if (serverTemplateUrl && !bgIsGenerated)`.
- **Sidebar popovers:** expand inline — do NOT change back to `absolute left-full` (gets clipped by `overflow-y-auto`).
- **Gradient:** ramp starts at 20% opacity, default 0.90. `handleReset` must call `setBgGradient(null)` and `setBgGradientStyle(null)`.
- **Undo:** keyboard handler checks undo/redo before the input-tag guard (Fabric keeps a hidden `<textarea>` focused).
- **Logo drop zone:** 148×74 standard, 192×74 for Spotlight/centred layouts.

---

## Mandatory agent check
Before any API-related changes, read `openapi.json` and verify endpoints, shapes, and flags. Missing fields go in `API_GAPS.md`.

---

## Commands
```bash
npm install
npm run dev  # always use http://localhost:5173
```

> If data isn't loading, check you're on port 5173 — Vite may have started on 5174/5175.
