# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Status & Current Phase

**Project:** Seamless Events - Beta Frontend
**Status:** In active development (beta phase)
**Repository:** seamless-frontend (staging site)

### Recent Session Summary

**Session: January 20, 2026 (Continued)**

**Completed:**
1. ✅ **Event Dashboard Complete** - Migrated from prototype to match design
   - Added module navigation buttons at top with enabled/disabled states (2px slate blue border for active)
   - Module summary cards showing detailed stats for each enabled module
   - Simplified layout matching prototype exactly

2. ✅ **Event Settings Page** - Full functionality with design system
   - Module toggles working (Speakers, Schedule, Content, Partners, Attendees)
   - "From Name" field added to Email Settings
   - All CSS updated to use design tokens (var(--font-h1), etc.)
   - Outline buttons with 1.5px borders

3. ✅ **Breadcrumb Navigation Fixed** - Multi-level breadcrumbs working
   - Event overview: "Team Seamless › Event Name"
   - Event sub-pages: "Team Seamless › Event Name › Sub-Page"
   - Changed "Settings" to "Event Settings" for clarity

4. ✅ **EventId Routing Fixed** - Added EventLayoutWrapper
   - Event routes now properly pass eventId to DashboardLayout
   - Sidebar shows correct event-specific navigation (Overview, Speakers, Event Settings)

5. 📝 **API Gap Documented** - `from_name` field
   - Comprehensive implementation guide added to API_GAPS.md
   - Frontend fully implemented, waiting on backend

**Previous Session: January 20, 2026 (Early)**

**Completed:**
1. ✅ **Documentation Update** - Added critical frontend-only guidelines
   - Added prominent "Frontend Only - No Backend Changes" section to CLAUDE.md
   - Documented dev notes workflow (TODO/NOTE comments)
   - Clarified that backend changes are never made in this repository
   - Established workflow for handling missing backend functionality

**Previous Session: January 16, 2026**

**Completed:**
1. ✅ **Design System Migration** - Migrated design system from offline prototype to beta
   - Changed primary color from teal (#2FB5A3) to Slate Blue (#4E5BA6)
   - Updated fonts from DM Sans/Fraunces to Inter system
   - Updated all CSS variables and design tokens in `src/index.css`
   - Updated CLAUDE.md with complete design philosophy and component guidelines

2. ✅ **Login Screen Redesign** - Updated Auth.tsx while preserving all functionality
   - New visual design: gradient background, centered two-line logo
   - Decorative flow elements (top/bottom)
   - Outline-style buttons with 1.5px borders
   - All auth flows intact: email/password, Google SSO, Microsoft SSO, signup/login toggle

3. ✅ **API Documentation Review** - Reviewed openapi.json structure
   - Created API_GAPS.md for tracking missing features/data
   - Documented snake_case ↔ camelCase conversion workflow
   - Added backend collaboration guidelines to CLAUDE.md

4. ✅ **Fixed Color Bug** - Corrected Slate Blue HSL conversion
   - Changed from incorrect `238 65% 48%` (too purple/saturated)
   - To correct `231 36% 48%` (proper muted slate blue)

**Next Session Goal:**
Focus on **Speaker Module** - migrate the speaker management features from the offline prototype into this beta project. Match the speaker list screen, speaker portal, and all related functionality to the prototype design.

**Speaker Module Scope:**
- Speaker list view with tabs (All, Applications, etc.)
- Speaker cards with status indicators
- Individual speaker portal/detail view
- Speaker intake forms management
- Embed preview/configuration
- Quick actions in sidebar (Add Speaker, Email All Speakers, etc.)

**Reference:** See "SCREEN 4: SPEAKER LIST" and "SCREEN 5: SPEAKER PORTAL" in prototype `index.html`

**Offline Prototype Location:**
`C:\Users\james\OneDrive\Documents\Seamless\Local Prototype\Seamless Demo\`

**Key Files to Reference:**
- `index.html` - Complete working demo with all screens
- `CSS_GUIDE.md` - Full design system documentation
- `CLAUDE.md` - Project context and design decisions
- `Screenshots/` - Reference screenshots (always contains latest/current state - updated regularly)

---

## Build & Development Commands

```bash
# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Preview production build locally
npm run preview

# Lint the codebase
npm run lint

# Deploy to Firebase Hosting (runs build first)
npm run deploy
```

## Architecture Overview

### Dual-Role System

This app supports **two distinct user roles** with separate dashboards:

1. **Organizer** - Event organizers who manage events, speakers, teams, and settings
2. **Speaker** - Individual speakers who manage their profile and view events they're participating in

The active role is determined by:
- The `mode` prop on `DashboardLayout` ("organizer" or "speaker")
- `localStorage.getItem("dashboardMode")`
- The user's role in the backend data (`me.roles` or `me.role`)

Role switching is available through the header dropdown menu. The root path `/` redirects to either `/organizer` or `/speaker` based on the stored mode.

### Routing Structure

Routes are defined in `src/App.tsx` and organized by role:

**Organizer routes** (protected):
- `/organizer` - Dashboard
- `/organizer/events` - Event list
- `/organizer/events/new` - Create event
- `/organizer/event/:id` - Event dashboard
- `/organizer/event/:id/speakers` - Speaker module for event
- `/organizer/event/:id/settings` - Event settings
- `/organizer/event/:id/speakers/:speakerId` - Individual speaker portal
- `/organizer/team` - Team management
- `/organizer/settings` - Account settings
- `/support` - Support page

**Speaker routes** (protected):
- `/speaker` - Speaker dashboard
- `/speaker/profile` - Speaker profile management

**Public routes** (no authentication):
- `/speaker-intake/:eventId` - Public speaker intake form
- `/event/:id/speakers/embed` - Embeddable speaker grid
- `/event/:id/speakers/embed/promo` - Embeddable promo cards
- `/event/:id/speakers/embed/speaker/:speakerId` - Single speaker embed
- `/event/:id/speakers/embed/promo/:speakerId` - Single promo embed

**Auth routes**:
- `/login`, `/signup` - Authentication pages

### Layout System

`DashboardLayout` (src/components/layout/DashboardLayout.tsx) is the main layout wrapper that provides:
- Collapsible sidebar with navigation
- Fixed header with user menu
- Different navigation items based on `mode` prop and whether viewing an event or account-level pages
- Automatic mode detection and persistence via localStorage

The sidebar shows different navigation based on context:
- **Account-level** (no eventId): Dashboard, Events, Team, Settings
- **Event-level** (with eventId): Overview, Speakers (with back button to Events)
- **Speaker-level**: Dashboard, Profile

### Authentication Flow

Firebase Authentication is the primary auth system:

1. Firebase SDK handles sign-in/sign-up (email/password, Google, Microsoft)
2. `onIdTokenChanged` listener in `src/lib/firebase.ts` watches for auth state changes
3. When user signs in, the Firebase ID token is exchanged for a backend token via `exchangeFirebaseToken()`
4. The backend token (or fallback Firebase ID token) is stored in localStorage as "accessToken"
5. `ProtectedRoute` component checks for token before rendering protected pages
6. All API calls in `src/lib/api.ts` attach the token as `Authorization: Bearer <token>`

Token management functions are in `src/lib/auth.ts`: `setToken()`, `getToken()`, `clearToken()`.

### API Integration

API client is centralized in `src/lib/api.ts`:
- Base URL: `import.meta.env.VITE_API_URL` (configure in `.env`)
- All responses are automatically converted from snake_case to camelCase via `deepCamel()` utility
- Authorization header is automatically attached using token from localStorage
- Exported functions for all backend endpoints (getMe, getTeam, getEvents, etc.)

### Data Fetching

TanStack Query (React Query) handles server state:
- QueryClient configured in `src/App.tsx`
- Use `useQuery` for fetching data with automatic caching
- Use `useMutation` for POST/PATCH/DELETE operations
- Query keys follow pattern: `["resource"]` or `["resource", id]`

### Styling & Theme

- **Tailwind CSS** with custom design system in `tailwind.config.ts`
- CSS variables define theme colors (in `src/index.css`)
- Custom fonts: DM Sans (sans), Fraunces (display)
- Module-specific colors: `speaker`, `schedule`, `content`, `attendee`
- Import path alias: `@` maps to `./src` (configured in vite.config.ts)

### Component Organization

- `src/components/ui/` - Primitive UI components (shadcn-style wrappers around Radix UI)
- `src/components/dashboard/` - Dashboard-specific cards and components
- `src/components/layout/` - Layout components (DashboardLayout)
- `src/pages/` - Route-level page components organized by role:
  - `pages/organizer/` - Organizer pages
  - `pages/speaker/` - Speaker pages
  - `pages/public/` - Public pages (embeds, intake forms)
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and API clients
- `src/types/` - TypeScript type definitions

### Key Type Definitions

Located in `src/types/event.ts`:
- `Event` - Event model with modules, status, dates, email config
- `EventModule` - Modular features (speaker, schedule, content, attendee, app) that can be enabled/disabled per event
- `Speaker` - Speaker model with headshot, bio, approval statuses
- `TeamMember` / `TeamUser` / `Team` - Team management types
- `Subscription` - Subscription plan and billing info

### Notifications

Two toast systems are available:
1. Custom `Toaster` (Radix Toast wrapper) - `src/components/ui/toaster`
2. Sonner integration - `src/components/ui/sonner`

Use the `useToast` hook from `src/hooks/use-toast.ts` to show notifications.

## Deployment

Deployed to Firebase Hosting:
- Production build outputs to `dist/`
- `firebase.json` configures hosting with SPA rewrites (all routes → index.html)
- `npm run deploy` builds and deploys via gh-pages (legacy), but Firebase is the active deployment target
- Post-build script copies `dist/index.html` to `dist/404.html` for SPA fallback

## Environment Variables

Configure these in `.env` (not committed to repo):

```
VITE_API_URL=<backend-api-url>
VITE_FIREBASE_API_KEY=<firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
VITE_FIREBASE_PROJECT_ID=<firebase-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<firebase-messaging-sender-id>
VITE_FIREBASE_APP_ID=<firebase-app-id>
```

## Working with Modules

Events have modular features that can be enabled/disabled individually:
- Speaker module (speaker management, intake forms, embeds)
- Schedule module (coming soon)
- Content module (coming soon)
- Attendee module (coming soon)
- App module (coming soon)

Each module has a corresponding color defined in Tailwind config and can be toggled on/off per event.

## Converting Backend Data

The utility function `deepCamel()` in `src/lib/utils.ts` recursively converts all object keys from snake_case to camelCase. This is automatically applied to all API responses, so backend fields like `first_name` become `firstName` in the frontend.

When working with data from the API, use camelCase property names. Example:
```typescript
// Backend returns: { first_name: "John", last_name: "Doe" }
// Frontend receives: { firstName: "John", lastName: "Doe" }
```

---

## Design Philosophy

**"The Trello of event operations"**

- **Stays in the background** – We support events, not compete with them
- **Operational, not decorative** – Every style has a purpose
- **Professional, not flashy** – Trustworthy and calm
- **Clarity over personality** – Readable and functional first
- **Left-aligned by default** – Operational tools favor left alignment for efficiency

**If a style doesn't communicate state or action, remove it.**

---

## Design System

### Brand Color: Slate Blue
**Primary:** `#4E5BA6` (Slate Blue)
**Primary Hover:** `#3D4A8F`
**Primary Subtle:** `#E8EAF6`

**Usage:**
- Buttons (outline style preferred)
- Active navigation states
- Links and clickable elements
- Module badges (with white gradient overlay)

### Neutrals
**Background App:** `#FAFAF9` (light warm gray)
**Background Surface:** `#FFFFFF` (white)
**Border Default:** `#E5E7EB` (light gray)
**Text Primary:** `#111827` (near black)
**Text Secondary:** `#6B7280` (medium gray)

### Status Colors
**Success:** `#16A34A` (green)
**Warning:** `#F59E0B` (amber)
**Danger:** `#DC2626` (red)
**Info:** `#2563EB` (blue)

**Do not invent new colors.**

---

## Typography Scale

### Font Family
**Primary:** Inter (with system fallback)

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale

| Token | Size | Usage | Weight |
|-------|------|-------|--------|
| `--font-h1` | 28px | Page titles | 600 (Semibold) |
| `--font-h2` | 20px | Section headings, card titles | 600 (Semibold) |
| `--font-h3` | 16px | Subsection headings | 600 (Semibold) |
| `--font-body` | 14px | Body text, inputs, buttons | 400 (Regular) |
| `--font-small` | 13px | Helper text, secondary labels | 400 (Regular) |
| `--font-tiny` | 11px | Sidebar section labels, badges | 600 (Semibold) |

---

## Spacing System

**Base unit:** 8px

Use only these values:
- `--space-xs`: 4px
- `--space-sm`: 8px
- `--space-md`: 16px
- `--space-lg`: 24px
- `--space-xl`: 32px
- `--space-2xl`: 48px

**Never use custom spacing values.**

---

## Component Guidelines

### Buttons

**Primary (Outline Style – Default)**
```css
background: white;
color: var(--primary);
border: 1.5px solid var(--primary);
padding: 10px 20px;
font-size: var(--font-body);
font-weight: 500;
border-radius: var(--radius-btn);
```

**Hover:**
```css
background: var(--primary-subtle);
```

**Rules:**
- One primary action per screen
- Destructive actions use danger color
- No filled solid buttons (outline preferred)
- No gradients or shadows

### Cards

**Standard Card**
```css
background: var(--bg-surface);
border: 1px solid var(--border-default);
border-radius: var(--radius-card);
padding: var(--space-lg);
box-shadow: var(--shadow-card);
```

**Interactive Card (Event Cards)**
```css
cursor: pointer;
transition: all 0.15s ease;
```

**Hover State:**
```css
/* Card border and shadow */
border-color: var(--primary);
box-shadow: 0 2px 8px rgba(78, 91, 166, 0.1);

/* Card title turns slate blue */
.event-card-title {
  color: var(--primary);
}
```

---

## Key Design Decisions

### 1. Slate Blue Over Teal
**Decision:** Changed primary color from teal to slate blue (#4E5BA6)
**Reason:** "Stays in the background" - operational tool positioning
**Date:** January 2026

### 2. Outline Buttons (Default)
**Decision:** Primary buttons use outline style, not solid fill
**Reason:** Less overpowering, more professional, better hierarchy
**Date:** January 2026

### 3. Inter Font System
**Decision:** Use Inter as primary font (replacing DM Sans/Fraunces)
**Reason:** Clean, readable, operational aesthetic. Professional and widely supported.
**Date:** January 2026

---

## Ways of Working

### 🚨 CRITICAL: Frontend Only - No Backend Changes

**This is a frontend-only repository. We NEVER make backend changes.**

- **NEVER modify backend code, database schemas, or API endpoints**
- **NEVER suggest backend changes as solutions**
- If functionality requires backend changes:
  1. Document the requirement in `API_GAPS.md`
  2. Ask the user for approval to use temporary mock/dummy data
  3. Add clear `// TODO: Replace with API data when available` comments
  4. Continue with frontend implementation using mock data
- The backend is maintained separately by the backend team
- Our job is to build the best possible frontend experience within the constraints of the existing API

### Work Efficiently - Budget Constraints
- **Keep messages short and concise** - we're working on a budget
- **Be efficient with tool usage** - don't waste credits on unnecessary operations
- **Work smart, not verbose** - focus on getting things done efficiently

### Keep Dev Notes (Sparingly)
- Add dev notes only at end of session or for major topics
- Use `// TODO:` comments only when backend updates are needed
- Update `API_GAPS.md` when discovering missing backend functionality
- Don't over-comment - only document non-obvious decisions

### Always Check Design System First
- **CRITICAL:** Always consult design system guidelines before making ANY style changes
- All design decisions must align with the documented design system
- Never create custom styles without checking the system first
- This ensures consistency across the app

### Progressive Changes
- **Work slowly, one task at a time**
- **Never make decisions without user input**
- Flag any issues or potential breaking changes immediately
- Preserve all existing functionality when updating designs

### UI Design Rules
- **No Emoji Icons** - Do not add emoji icons (📅, 📍, 🎤) beside text labels
- **Operational, not decorative** - Every style must have a purpose
- **Clarity over personality** - Readable and functional first

### What NOT to Do
❌ **Never:**
- Use gradients (except module badges)
- Add heavy animations
- Create custom colors
- Use drop shadows on buttons
- Add decorative elements
- Use multiple font families
- Create custom spacing values
- Add "fun" UI experiments

✅ **Always:**
- Use design tokens
- Follow the type scale
- Keep it operational
- Stay neutral and calm
- Let content be the focus

---

## Product Philosophy

Seamless Events is **"The Trello of event operations"** - an operational tool that stays in the background, supporting events without competing with them. We prioritize clarity, professionalism, and functionality over visual personality.

---

## Working with the Backend API

### API Documentation
The backend API structure is defined in `openapi.json` at the project root.

**Key Information:**
- Base URL configured via `VITE_API_URL` environment variable
- All API responses use snake_case (e.g., `first_name`, `start_date`)
- Frontend automatically converts to camelCase via `deepCamel()` utility
- Input schemas (create/update) use camelCase
- Output schemas (responses) use snake_case

### Tracking API Gaps
When you need data or endpoints that don't exist in the API:

1. **Do NOT make assumptions** - Ask the user first if unclear
2. **Add to API_GAPS.md** - Document what's needed under the appropriate section:
   - "Missing Data Fields" for new fields on existing models
   - "Missing Endpoints" for new API routes needed
   - Include clear description of why it's needed
3. **Use mock data temporarily** - If approved by user, create temporary mock data in the frontend
4. **Note in code comments** - Mark any mock data with `// TODO: Replace with API data when available`

### Example Workflow
```typescript
// User asks: "Show event status badges on the dashboard"
// You check openapi.json and find status isn't clearly defined

// Step 1: Add to API_GAPS.md
// Step 2: Ask user: "The API has a status field but valid values aren't documented.
//         Should I use mock values like 'draft', 'active', 'past' for now?"
// Step 3: If approved, implement with mock data and TODO comment
```

**Always check API_GAPS.md** before starting work to see what's already documented as missing.

---

## Session Notes & Next Steps

### Important Context for Next Session

**Primary Goal:** Continue migrating features from the local prototype into this beta project.

**Prototype Location:** `C:\Users\james\OneDrive\Documents\Seamless\Local Prototype\Seamless Demo\`

**Key Files:**
- `index.html` - Complete working demo
- `CSS_GUIDE.md` - Design system reference
- `CLAUDE.md` - Project philosophy and decisions

**What's Complete:**
1. Design system migration (Slate Blue #4E5BA6, Inter font, all tokens)
2. Login screen redesign (Auth.tsx) with preserved functionality
3. API documentation review and tracking system setup

**What's Next:**
- Migrate dashboard layouts from prototype
- Update event management screens
- Migrate speaker module UI
- Update team management pages

**Critical Reminders:**
- Always preserve existing functionality when updating designs
- Check API_GAPS.md before implementing features requiring backend data
- Work slowly, one task at a time
- Never make decisions without user input
- Flag any potential breaking changes before proceeding

**User Preferences:**
- Work incrementally (1 task at a time)
- Ask before making design decisions
- Preserve all working features
- Document any mock data needs in API_GAPS.md
