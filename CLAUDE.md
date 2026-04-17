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

## Language consistency — canonical terms
Use these exact terms everywhere (UI labels, tooltips, dialogs, HelpTips, copy):
- **Speaker Wall** — not "Embed", not "Wall", not "Speaker Wall Embed" (the tab, the feature, the published output)
- **Speaker Card** — the website embed card
- **Social Card** — the downloadable social image
- **Speaker Wall embed** — only when referring specifically to the embed code/snippet itself
- **TODO: full language sweep pending** — "Embed" still appears in various tooltips, dialog copy, and comments. Do not fix ad-hoc; sweep all at once when instructed.

## Copy rules
- **No fluff.** Labels, headings, and buttons must speak for themselves. Never add a supporting sentence that restates the obvious (e.g. `<CardDescription>Manage your subscription and payment methods</CardDescription>` under a "Billing" heading is redundant — delete it).
- **No descriptor sentences in cards.** If a card or section is labelled "Help", do not add body copy like "Questions? Browse our help centre or get in touch." The label is enough.
- **Buttons:** use the shortest accurate label. "Open Billing Portal" is fine; "Click here to open your billing portal" is not.
- **CardDescriptions:** only add one if the heading is genuinely ambiguous without it.

## Working rules
- **CardBuilder:** frontend and backend rendering must match exactly. No frontend-only visual styles (e.g. text stroke) unless also in the backend HTML renderer. See `example-speaker-website-card.html` and `corresponding-config-speaker-website-card.json`.
- **Frontend-only:** no backend changes. Flag gaps verbally and ask the user — only James writes to `API_GAPS.md`.
- **Mock data:** only with explicit approval; mark with `// TODO: Replace with API data`.
- **Commits & pushes:** James handles all git operations. Never run `git commit`, `git push`, `git rebase`, or `git stash` unless explicitly asked.
- **No completion docs:** never create summary/review/completed files. Update this file in place. Report results verbally.
- **CSS consistency:**
  - Cards: `bg-card border border-border hover:shadow-sm hover:border-primary`
  - Tables: `rounded-lg border border-border overflow-hidden`, header `bg-secondary/30`, rows `hover:bg-muted/40`
  - Info/callout banners: `bg-secondary/30 border-secondary/60` (lavender tint)
  - Badges: `bg-success/10 text-success border-success/30` (approved), `bg-warning/10 text-warning border-warning/30` (pending)
  - Spacing: tab content `pt-6`, forms `space-y-6`
- **Sub-page navigation:** any view launched from a tab (e.g. Edit Form, Speaker detail) must go full-page with a standard `h-14` sticky header:
  - Container: `fixed inset-0 z-50 bg-background flex flex-col`
  - Header: `sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border bg-card/95 px-4 shrink-0`
  - Back button: `ArrowLeft` (from lucide-react), `h-8 w-8` rounded button, always calls `navigate(-1)` — never hardcodes a destination URL
  - Wordmark: `"Seamless"` (primary, semibold) + module name (muted, xs)
  - Entity name after a `|` separator, truncated
  - Actions (Copy Link, Save, etc.) pushed right with `ml-auto`
  - Body: `<div className="flex-1 overflow-y-auto">` wrapping content
  - **Never** use `ChevronLeft` for back-navigation; always `ArrowLeft`
- **Unsaved changes:** any page/overlay where the user edits must guard navigation with `useWarnOnLeave(isDirty)` (beforeunload) and `UnsavedChangesDialog` (Save / Discard / Keep editing). `useBlocker` from react-router does NOT work — app uses `<BrowserRouter>`, not a data router.
- **Commits & pushes:** never. James handles all git operations. No `git commit`, `git push`, `git rebase --continue`, or `git status` unless explicitly asked. The only exception is `git stash` if James asks to stash local changes.

---

## Next up
**EmbedBuilder layout settings** (`src/components/organizer/EmbedBuilder.tsx`)
- Add columns-per-row control: desktop (2–4) and mobile (1–2), simple button-group toggles
- Add background toggle: transparent vs white (affects the copied iframe snippet)
- Settings become query params on the embed URL (`?cols=3&cols_mobile=1`)
- **Check `openapi.json` first** — verify `/embed/:eventId` supports these params before building; log gaps to `API_GAPS.md`

---

## Current priority
**SpeakerPortal — 3-column dashboard** (`src/pages/organizer/SpeakerPortal.tsx`)

Replace the 4-tab layout with a full-width 3-column dashboard for non-application speakers. Applications keep the existing simple info-only view.

**Layout**:
- Sticky `h-14` header unchanged (back button, wordmark, name, app approve/reject actions)
- Remove tab bar for non-application speakers
- Body: `grid grid-cols-[30%_35%_35%] gap-4 px-4 py-4`
  - **Col 1** — Info card (existing info content + edit button) stacked above `SpeakerContentTab`
  - **Col 2** — Speaker Card: status badge + approve/unapprove/approve+publish + share buttons, then scaled preview
  - **Col 3** — Social Card: status badge + approve/unapprove + share buttons, then scaled preview

**Card preview scaling**:
- Wrap `SpeakerPreviews` in a `ResizeObserver`-driven container
- Native widths: website = 600px, social = 1080px
- `scale = containerWidth / nativeWidth` (capped at 1)
- Outer container: `overflow: hidden`, height = `nativeWidth × scale` (assumes square; adjust if portrait/landscape)
- Inner wrapper: `width: {nativeWidth}px`, `transform: scale({scale})`, `transformOrigin: top left`
- No "Edit template" button anywhere on this page — editing is event-level, done from the card builder

**Application speakers**: keep existing tab-based approach (info tab only, approve/reject in header).

---

## Help system — phases

**Phase 1 — DONE.** Contextual `HelpTip` popovers on every tab and the card builders.
- Reusable component: `src/components/ui/HelpTip.tsx` (Popover-based, click-to-open)
- Default: pill button labelled "How this works" — `bg-secondary/50` style. Compact mode (`compact` prop): icon-only for tight spaces like column headers.
- **Always the rightmost item** in every tab header / toolbar. `align="end"` on the popover.
- Applied to: Speakers tab, Applications tab, Embed tab, SpeakersTable status column (compact), Speaker Card builder, Social Card builder
- Pattern: `<HelpTip title="…" side="bottom" align="end"><p>…</p></HelpTip>` — 3 short paragraphs max

**Phase 2 — DONE.** Getting started checklist on the Speakers tab.
- `src/components/organizer/GettingStartedChecklist.tsx` — collapsible card, primary-tinted header
- Steps: Application form (skippable) → Intake form (skippable) → Speaker Card template → Social Card template → Embed
- LocalStorage keys: `seamless-onboarding-checklist-{eventId}` (collapsed), `seamless-checklist-skipped-{eventId}` (skipped steps JSON array), `seamless-embed-visited-{eventId}` (embed step), `seamless-checklist-dismissed-{eventId}` (dismissed after all done)

**Phase 3 — LATER.** First-time guided walkthrough on Speakers tab (Shepherd.js or similar).
- Triggered once per event on first visit
- Highlights: Add Speaker → speaker portal → card approval → embed toggle
- Skippable, never shown again (localStorage flag)

**Phase 4 — LATER.** External help centre (Notion or GitBook).
- Linked from a persistent `?` button in the top nav (opens new tab)
- Key articles: full speaker workflow, status definitions, embed explained, card templates, Call for Speakers vs manual add

---

## Known issues
- **`nameFormat: "two-line"`** — saves correctly but embed renders single line. Backend bug (see API_GAPS.md).
- **`company` / `companyLogo`** — not persisting after server save/reload. Backend bug (see API_GAPS.md).
- **Event logo not appearing in embed** — `companyLogo.url` is not persisted across template switches in the website card builder (no localStorage for it, unlike `eventLogo`). Also `testEventLogo` is set in `makeApply` even when the template has no `eventLogo` element. Investigate both paths before touching.
- **Custom field keys** — backend strips underscores (`custom_123` → `custom123`). Frontend has fallback logic.
- **ShareDialog** — UI complete, not yet wired to backend.
- **Card downloads** — open in new tab only; PNG export not yet available (see API_GAPS.md).
- **Content history attribution** — frontend sends `createdBy` but backend not storing/returning it (see API_GAPS.md).
- **Content archive** — stub only; backend endpoint not yet available (see API_GAPS.md).
- **`embed_enabled` toggle** — optimistic UI only; backend field not yet implemented (see API_GAPS.md).

---

## Where to look first
- `src/components/CardBuilder.tsx` — Fabric.js card builder (all card types) — **read `CardBuilder_Directory.md` first before editing**
- `src/components/organizer/SpeakersTable.tsx` — asset hub table (downloads, copy, status)
- `src/components/organizer/ShareDialog.tsx` — share modal (UI only)
- `src/components/organizer/SpeakerPreviews.tsx` — fetches and embeds card HTML from API (white bg, no scroll, expands to card size)
- `src/components/organizer/SpeakerCardTab.tsx` — Speaker Card / Social Card tab (approval, share, preview)
- `src/components/organizer/SpeakerContentTab.tsx` — Content tab (upload, replace, archive, restore, version history)
- `src/pages/organizer/SpeakerPortal.tsx` — individual speaker, 4 URL-driven tabs: Info / Speaker Card / Social Card / Content
- `src/pages/organizer/SpeakerModule.tsx` — speaker module main page ⚠️ see routing note
- `src/components/ui/HelpTip.tsx` — contextual help popovers (pill + compact modes)
- `src/hooks/useWarnOnLeave.ts` — beforeunload guard for unsaved changes
- `src/components/ui/UnsavedChangesDialog.tsx` — Save / Discard / Keep editing dialog
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
Before any API-related changes, read `openapi.json` and verify endpoints, shapes, and flags. Report missing fields verbally — only James writes to `API_GAPS.md`.

---

## Screenshots
When James says "see screenshot", always read: `Screenshot/Screenshot.png` in the project root. No path needed in the message.

---

## Commands
```bash
npm install
npm run dev  # always use http://localhost:5173
```

> If data isn't loading, check you're on port 5173 — Vite may have started on 5174/5175.
