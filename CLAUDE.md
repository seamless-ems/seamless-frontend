# CLAUDE.md — Project Briefing

Purpose: a short, high-value briefing for the next agent working on this repo. Keep this file concise: project summary, ways of working, current priority, and immediate next steps.

Project at-a-glance
- Name: Seamless Events — Beta Frontend
- Status: Active development (frontend-only)
- Primary focus: Speaker module and card builder features

How to onboard quickly
1. Read `README.md` for setup and quickstart.
2. Read this file for working rules and current priorities.
3. Check `API_GAPS.md` for missing backend fields/endpoints before coding.

Working rules (short)
- For the CardBuilder, we render raw html based on the config that the CardBuilder.tsx sends to the backend. Please do not add any frontend-only styling (e.g., hairline text stroke) that is not also implemented in the backend rendering logic. The frontend and backend must look identical, so any visual changes must be made in both places. For an example of the raw html rendering, see `example-speaker-website-card.html`. The corresponding config json used to create that card is in `corresponding-config-speaker-website-card.json`.
- Frontend-only: do not propose or commit backend changes. If a backend change is required, document it in `API_GAPS.md` and ask the user.
- Use mock data only with explicit approval; mark mocks with `// TODO: Replace with API data`.
- Keep changes incremental: one small task per branch and preserve existing behavior.
- Follow the design system and tokens in `src/index.css` and `tailwind.config.ts`.
- **CRITICAL: NO COMPLETION DOCUMENTS** - Do NOT create summary/review/completed files (e.g., "UX_IMPROVEMENTS_COMPLETED.md", "REVIEW.md"). These burn credits unnecessarily. Just do the work, test it, report results verbally. Only update existing docs when required (README, API_GAPS, CLAUDE.md).
- **KEEP DOCS CONCISE** - API_GAPS.md should be SHORT and DIRECT. Backend team is competent - they don't need 50 lines of explanation for simple requests. Just state: what's needed, why, and minimal implementation notes.
- **CSS consistency:** All cards, tables, and component styling must follow these patterns:
  - **Cards:** Use `Card` component with `bg-card`, `border border-border`, `hover:shadow-sm`, `hover:border-primary` (for interactive cards like EventCard)
  - **Card Actions:** Buttons in cards use `variant="outline"` with `size="sm"` and `className="flex-1"` for equal widths
  - **Tables:** Use `rounded-lg border border-border overflow-hidden`, header `bg-muted/30`, rows `hover:bg-muted/40`
  - **Badges:** Use semantic colors: `bg-success/10 text-success border-success/30` (approved), `bg-warning/10 text-warning border-warning/30` (pending)
  - **Spacing:** Tab content starts with `pt-6`, form sections use `space-y-6`
  - **Headers in tabs:** Show title + description (no action buttons in header unless critical)
  - **Three-dot menus:** Use `DropdownMenu` with `MoreVertical` icon, positioned with `opacity-0 group-hover:opacity-100` on hover
  - See [EventCard.tsx](src/components/dashboard/EventCard.tsx), [SpeakerModule.tsx](src/pages/organizer/SpeakerModule.tsx) for reference patterns
- Commit policy: the user will explicitly instruct when to commit or push. Do not create commits or push changes without explicit permission.

Current priority
- **Promo Card Templates** — build a template/onboarding flow for the promo card builder, mirroring the website card builder pattern but with promo-appropriate layouts.

Immediate next steps
1. Design and implement `PROMO_PRESETS` with social media formats (square 1:1 1080×1080, landscape 16:9 1080×608, story 9:16 608×1080 or similar scaled).
2. Add a promo-specific onboarding flow gated behind `cardType === 'promo'` — separate state, separate localStorage key (`seamless-card-builder-onboarding-promo-v1`), separate modal steps.
3. Ensure no website template logic bleeds into promo and vice versa (see Card Builder — website vs promo split below).

**Known Issues:**
- **Custom fields:** Backend strips underscores from custom field keys (e.g., `custom_123` becomes `custom123`). Frontend handles this with fallback logic in field lookups.

Where to look first
- `src/components/CardBuilder.tsx` — Primary card builder (Fabric.js, all card types)
- `src/components/organizer/SpeakerPreviews.tsx` — Fetches and embeds card HTML from API
- `src/pages/organizer/SpeakerPortal.tsx` — Speaker details page
- `src/pages/organizer/SpeakerModule.tsx` — Speaker module main page ⚠️ see routing note below
- `src/lib/api.ts` — API functions
- `openapi.json` — API spec (source of truth for all endpoints)

## ⚠️ Card Builder Routing — READ THIS

The website card builder URL (`/organizer/event/:id/website-card-builder`) is handled by **SpeakerModule**, not WebsiteCardBuilderPage. This is a quirk of the routing setup.

**Currently active:**
- `src/pages/organizer/SpeakerModule.tsx` → imports `CardBuilder` ← this is the one that matters
- `src/pages/organizer/WebsiteCardBuilderPage.tsx` → imports `CardBuilder` (secondary, kept in sync)
- `src/pages/organizer/PromoCardBuilderPage.tsx` → imports `CardBuilder`

## ⚠️ Card Builder — Website vs Promo split — READ THIS

The CardBuilder component (`src/components/CardBuilder.tsx`) serves both card types via the `cardType` prop (`"website" | "promo"`). They share the same canvas engine but have completely separate template/onboarding systems.

**Website card builder — template system (DONE)**
- 9 starter templates: 3 shapes × 3 layouts
  - Square 600×600: Overlay, Headline, Spotlight
  - Landscape 900×600: Overlay, Side by Side, Editorial (full-bleed, heavy gradient 0.95, type-forward)
  - Portrait: Overlay 600×800, Spotlight 600×640, Brand Forward 600×660
- All templates audited and tightened (2026-03-18): dead space eliminated, logos resized, text blocks repositioned. Do NOT revert positions without reason.
- 4-step onboarding modal: (1) blank vs template, (2) shape picker, (3) template picker, (4) Quick Setup (colour, font, gradient, headshot shape)
- Quick Setup shows a **headshot shape picker** only when `preset.allowedHeadshotShapes.length > 1` (Overlay and Editorial templates hide it — full-bleed is integral)
- All gated behind `cardType === 'website'` — toolbar Templates button, sidebar Templates button, empty canvas copy, onboarding modal, post-template tip modal
- localStorage key: `seamless-card-builder-onboarding-website-v1`
- Post-template tip localStorage key: `seamless-card-builder-template-tip-v1`
- Preset arrays: `SQUARE_PRESETS`, `LANDSCAPE_PRESETS`, `PORTRAIT_PRESETS` (inside component, above canvas useEffect)
- Rule of 3: exactly 3 templates per shape — do NOT add a 4th
- **One template applies to ALL speakers** — user picks one, saves it, backend renders it for every speaker in the embed. No per-speaker template variation.

**Promo card builder — template system (TODO)**
- No templates yet — promo card builder opens to a blank canvas
- Next session: implement `PROMO_PRESETS` with social media formats
- Must use its own state variables, localStorage keys (`seamless-card-builder-onboarding-promo-v1`), and be gated behind `cardType === 'promo'`
- Do NOT reuse or modify the website preset arrays

**CardBuilder — text layout logic (website templates):**
- **Font size defaults:** name 55px / title 28px / company 28px (equal importance). Side-by-Side right column (≤308px): 38/22/22. Brand Forward: 48/28/28. All other templates: 55/28/28.
- **Auto-shrink:** name shrinks to 1 line (2 if `nameFormat === "two-line"`). Title wraps up to 2 lines. Min font size: name 20px, title 14px. Company has no shrink — backend handles dynamic company `top` when title wraps (see API_GAPS.md).
- **Measurement:** Two-step. Step 1: Fabric `textLines` count vs maxLines. Step 2: DOM span `getBoundingClientRect()` for single long words — only reliable method for web fonts. Do NOT use `__lineWidths`, canvas 2D context, or `new fabric.Text()`.
- **Positions fixed per-template.** Formula: `title_y = name_y + name_fontSize + 10`, `company_y = title_y + 28 + 10`. Hardcoded per template — one template cannot affect another.
- **Save behaviour:** localStorage always stores template-default fontSize (55px) so switching speakers doesn't poison the config. Backend API call receives the shrunk fontSize from live Fabric objects (temporary — backend team to replace with per-speaker logic).
- **Logo drop zone:** 148×74 standard. Spotlight/centred layouts: 192×74.

**CardBuilder — key non-obvious behaviours:**
- Canvas sidebar popovers (Templates, Canvas/Background) expand **inline** — do NOT change back to floating `absolute left-full` popovers, they get clipped by `overflow-y-auto` on the sidebar
- `skipRerenderRef`: set to `true` before any `setConfig` call that is position/size-only (drag end, arrow nudge) to prevent full canvas rebuild. Missing this causes erratic element movement
- Gradient overlay ramp starts at 20% opacity (not 0%) — matches Canva's heavier feel. Default opacity 0.90
- Canvas size + background colour + background image all live in the "Canvas" section of the left sidebar (unified — do not split them back out to the toolbar)
- Ctrl+Z undo: the keyboard handler must check undo/redo **before** the input-tag guard, because Fabric keeps a hidden `<textarea>` focused on the canvas
- Alignment (multi-select): aligns to the **group's own bounding box**, not the canvas — same as PowerPoint/Canva
- **`bgIsGenerated` flag**: template-built cards (no user-uploaded background) generate a background PNG at save time for the backend only. `bgIsGenerated=true` tells both load paths to skip restoring it as the frontend background — `bgColor`/`bgGradient` drive the canvas instead. Always guard server-response `setTemplateUrl` calls with `if (serverTemplateUrl && !bgIsGenerated)`.
- **`StarterPreset` interface**: includes `canvasW`, `canvasH`, `allowedHeadshotShapes` fields. `makeApply` accepts optional 6th `headshotShape` param. Always pass `preset.canvasW/canvasH` when calling `preset.apply()` — do NOT use hardcoded shape dimension maps.
- **Banner headshot shape**: full-width, partial-height rectangle crop. Uses `absolutePositioned: true` clipPath in canvas coordinates. Locks X movement/scaling; only `mb` resize handle shown. `cfg.height` stores the banner height (not `cfg.size`) after first resize.
- **`handleReset`**: must call `setBgGradient(null)` and `setBgGradientStyle(null)` — gradient persists across reset otherwise.

**Known outstanding (backend team):**
- `company` and `companyLogo` elements not persisting after server save/reload
- Embed HTML rendering broken — see API_GAPS.md for full spec

Mandatory agent check
- Before making any API-related changes, every agent MUST check the local API specification at:
- `C:\Users\james\OneDrive\Documents\Seamless\seamless-frontend\openapi.json`
- Verify endpoints, request/response shapes, and any required flags (e.g., `website_card_approved`, `promo_card_approved`). If the spec lacks needed fields, document the gap in `API_GAPS.md` and ask the user for guidance.

Commands
```bash
npm install
npm run dev
```

## Troubleshooting

### Data not loading / blank dashboard
**Problem:** Events, speakers, or other data not showing up after login.

**Solution:** Check the dev server port in your browser URL.
- **Correct port:** `http://localhost:5173` ✅
- **Wrong port:** `http://localhost:5174` or `5175` ❌

If you're on the wrong port, close that tab and use port **5173**.

**Why this happens:** Vite tries alternate ports when 5173 is busy, but the app expects to run on 5173.

Contact / notes
- Keep notes minimal — active progress is tracked here in `CLAUDE.md` only.
