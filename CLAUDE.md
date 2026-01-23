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
- Speaker Module migration and stabilization: speaker list, portal, intake form, promo embeds. Treat this as the active sprint until otherwise directed.

Immediate next steps (for the next agent)
- Verify speaker list and portal UI against the local prototype (`Local Prototype/Seamless Demo/index.html`).
- Confirm backend supports approval fields (`website_card_approved`, `promo_card_approved`) — if not, add to `API_GAPS.md` and request guidance.
- Implement missing UI flows using mock data only if approved; always add a `// TODO` note.

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

Contact / notes
- Keep notes minimal and add session summaries (if needed) to `archive_docs/` — active progress is tracked here in `CLAUDE.md` only as a one-line status.

End of briefing.
1. ✅ **Documentation Update** - Added critical frontend-only guidelines
