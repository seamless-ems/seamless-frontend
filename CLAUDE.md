# CLAUDE.md — Project Briefing

Purpose: a short, high-value briefing for the next agent working on this repo. Keep this file concise: project summary, ways of working, current priority, and immediate next steps.

Project at-a-glance
- Name: Seamless Events — Beta Frontend
- Status: Active development (frontend-only)
- Primary focus: migrate UI from local prototype and stabilize Speaker module

How to onboard quickly
1. Read `README.md` for setup and quickstart.
2. Read this file for working rules and current priorities.
3. Check `API_GAPS.md` for missing backend fields/endpoints before coding.

Working rules (short)
- Frontend-only: do not propose or commit backend changes. If a backend change is required, document it in `API_GAPS.md` and ask the user.
- Use mock data only with explicit approval; mark mocks with `// TODO: Replace with API data`.
- Keep changes incremental: one small task per branch and preserve existing behavior.
- Follow the design system and tokens in `src/index.css` and `tailwind.config.ts`.
- **CRITICAL: NO COMPLETION DOCUMENTS** - Do NOT create summary/review/completed files (e.g., "UX_IMPROVEMENTS_COMPLETED.md", "REVIEW.md"). These burn credits unnecessarily. Just do the work, test it, report results verbally. Only update existing docs when required (README, API_GAPS, CLAUDE.md).
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

Current priority (single source of truth)
- **Speaker Module migration and stabilization** (primary focus)
- **PromoCardBuilder component** — ✅ COMPLETE & STABLE
  - Phase 2 refactor finished: Drop zone architecture, number inputs, multi-select batch editing
  - Professional Fabric.js canvas with Canva-like UX
  - Template system: Saves layout config (positions, sizes, shapes) NOT content
  - Test images are preview-only, never saved to config
  - See README for full feature list and PROMO_CARD_REFACTOR_PLAN.md for details
- **Backend blocker:** Team/account nesting API required to fully integrate PromoCardBuilder into event flow

Immediate next steps (for the next agent)
- Verify speaker list and portal UI against the local prototype (`Local Prototype/Seamless Demo/index.html`).
- Confirm backend supports approval fields (`website_card_approved`, `promo_card_approved`) — if not, add to `API_GAPS.md` and request guidance.
- Implement missing UI flows using mock data only if approved; always add a `// TODO` note.

**PromoCardBuilder TODO:**
- **GIF Animation Export** - Background GIFs display animated on canvas but download as static PNG. To fix: Install `gif.js` or `gifshot` library, capture animated frames, encode with proper timing. Check `templateIsGif` state to conditionally export as animated GIF vs static PNG.
- **Canvas Download Dimensions** - Rectangle backgrounds download as rectangle on square canvas (white space around). Issue: Canvas state (`canvasWidth`/`canvasHeight`) updates but Fabric canvas resize not working properly for downloads. Need to ensure `fabricCanvasRef.current.setDimensions()` actually resizes the underlying canvas element before `toDataURL()` export. Check canvas initialization and dimension sync.

Where to look first
- `src/pages/organizer/SpeakerModule.tsx`
- `src/pages/organizer/SpeakerPortal.tsx`
- `src/components/SpeakerForm.tsx`
- `src/lib/api.ts` and `openapi.json` (API reference)

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
- Keep notes minimal and add session summaries (if needed) to `archive_docs/` — active progress is tracked here in `CLAUDE.md` only as a one-line status.

End of briefing.

---

## Recent Changes
1. ✅ **CRITICAL RULE ADDED** - NO completion/summary documents (burns credits). Just do work, test, report verbally.
2. ✅ **PromoCardBuilder UX Fixes** (2026-01-28) - Fixed multi-select bug, all number inputs use onBlur (no deselection), moved Undo/Redo to canvas controls, added background to layers panel
3. ✅ **Documentation Update** - Added critical frontend-only guidelines
2. ✅ **PromoCardBuilder Migration** - Migrated from react-draggable to Fabric.js (2026-01-28)
   - Professional canvas-based editor with snapping to edges, centers, and other elements
   - Direct manipulation of images and text with resize/drag handles
   - Suitable for design teams - matches industry-standard tools like Canva
3. ✅ **PromoCardBuilder Enhancements** - Professional UX improvements (2026-01-28)
   - **Visual snap guides**: Pink dashed lines appear when elements align during drag
   - **Layers panel**: Full z-index management with visibility toggles and reordering
   - **Alignment toolbar**: Quick-align buttons (left/center/right, top/middle/bottom)
   - **Multi-select support**: Hold Shift + click or drag-select multiple elements
   - **Persistent selection**: Selection maintained after moving (click canvas to deselect)
   - **Enhanced snapping**: Snaps to all edges (left/right/top/bottom), centers, and adjacent elements
4. ✅ **PromoCardBuilder UX Overhaul** - Element library + Undo/Redo (2026-01-28)
   - **Empty canvas start**: Clean slate instead of pre-populated elements
   - **Add Elements library**: Click-to-add interface for adding elements to canvas
   - **Undo/Redo**: Full history stack (Ctrl+Z/Ctrl+Y) with 50-state memory
   - **Centered placement**: New elements appear at canvas center
   - **Better scalability**: Only render what users need (frontend-only = perfect for this)
   - **Bundle size**: 1.26MB minified (347KB gzipped) - optimal for a rich editor
5. ✅ **PromoCardBuilder Bug Fixes + Zoom** (2026-01-28)
   - **Fixed**: Elements disappearing when dragging (render cycle conflict resolved)
   - **Fixed**: Smart element centering (handles images vs text vs buttons correctly)
   - **Zoom controls**: Zoom in/out buttons + fit-to-view + percentage display (10%-300%)
   - **Better viewport**: Canvas container properly handles zoomed content with scrolling
6. ✅ **PromoCardBuilder Phase 2 Refactor - COMPLETE** (2026-01-28)
   - **Drop zone architecture**: Headshot/Logo are layout positions (NOT saved images)
   - **Test images**: Preview-only in component state, never saved to config
   - **Number inputs**: Replaced all sliders for precise control
   - **Multi-select batch editing**: Select multiple elements (Shift+click), edit common properties at once
   - **Removed legacy state**: headshotCropShape moved to config.headshot.shape
   - **Save/Load updated**: Only saves template layout config, not test content
   - **Better UX**: Clear messaging that test images are preview-only
   - See `PROMO_CARD_REFACTOR_PLAN.md` for full details
