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
- To be defined at the start of each session with the user.

Immediate next steps
- To be defined at the start of each session with the user.

**Known Issues:**
- **Custom fields:** Backend strips underscores from custom field keys (e.g., `custom_123` becomes `custom123`). Frontend handles this with fallback logic in field lookups.

Where to look first
- `src/components/CardBuilder.tsx` — Unified card builder (template creator)
- `src/components/organizer/SpeakerPreviews.tsx` — Fetches and embeds card HTML from API
- `src/pages/organizer/SpeakerPortal.tsx` — Speaker details page
- `src/pages/organizer/SpeakerModule.tsx` — Speaker module main page
- `src/lib/api.ts` — API functions
- `openapi.json` — API spec (source of truth for all endpoints)

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
