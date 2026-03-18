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
1. Design and implement `PROMO_PRESETS` (equivalent of `SQUARE_PRESETS` etc.) with layouts suited to promo cards (social media formats: square 1:1, landscape 16:9, story 9:16).
2. Add a promo-specific onboarding flow gated behind `cardType === 'promo'` — separate state, separate localStorage key, separate modal steps.
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
- 9 starter templates: 3 shapes (Square 600×600, Landscape 900×600, Portrait 600×900) × 3 layouts (Overlay, Split/Side-by-side, Spotlight/Brand-forward)
- 4-step onboarding modal: (1) blank vs template, (2) shape picker, (3) template picker, (4) Quick Setup (colour, font, gradient)
- All gated behind `cardType === 'website'` — toolbar Templates button, sidebar Templates button, empty canvas copy, onboarding modal, post-template tip modal
- localStorage key: `seamless-card-builder-onboarding-website-v1`
- Post-template tip localStorage key: `seamless-card-builder-template-tip-v1`
- Preset arrays: `SQUARE_PRESETS`, `LANDSCAPE_PRESETS`, `PORTRAIT_PRESETS` (inside component, above canvas useEffect)

**Promo card builder — template system (TODO)**
- No templates yet — promo card builder opens to a blank canvas
- Next session: implement `PROMO_PRESETS` with social media formats
- Must use its own state variables, localStorage keys (`seamless-card-builder-onboarding-promo-v1`), and be gated behind `cardType === 'promo'`
- Do NOT reuse or modify the website preset arrays

**CardBuilder — key non-obvious behaviours:**
- Canvas sidebar popovers (Templates, Canvas/Background) expand **inline** — do NOT change back to floating `absolute left-full` popovers, they get clipped by `overflow-y-auto` on the sidebar
- `skipRerenderRef`: set to `true` before any `setConfig` call that is position/size-only (drag end, arrow nudge) to prevent full canvas rebuild. Missing this causes erratic element movement
- Gradient overlay ramp starts at 20% opacity (not 0%) — matches Canva's heavier feel. Default opacity 0.90
- Text elements get a hairline stroke (`strokeWidth: fontSize * 0.015`) to compensate for canvas grayscale antialiasing appearing lighter than CSS subpixel rendering
- `nameFormat: "single" | "two-line"` on the name element config — backend must honour this when rendering (see API_GAPS.md)
- Canvas size + background colour + background image all live in the "Canvas" section of the left sidebar (unified — do not split them back out to the toolbar)
- Ctrl+Z undo: the keyboard handler must check undo/redo **before** the input-tag guard, because Fabric keeps a hidden `<textarea>` focused on the canvas
- Alignment (multi-select): aligns to the **group's own bounding box**, not the canvas — same as PowerPoint/Canva

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
