# API Gaps & Mock Data Requirements

This document tracks any data or endpoints we need that aren't currently available in the API.
Share this list with the backend developer to coordinate changes.

**Last Updated:** January 21, 2026

---

## ✅ Speaker Workflow - FULLY WIRED UP

The complete speaker workflow has been implemented and is ready for testing:

### What's Working:
1. **Edit Speaker Form** - Matches dashboard fields exactly (First Name, Last Name, Email, Title, Company, LinkedIn, Bio)
2. **Image Cropping** - Headshots (square) and logos (16:9) with zoom controls
3. **Single Approval Button** - Approves both website and promo cards together
4. **Approval Validation** - Cannot approve without headshot; approval resets when new headshot uploaded
5. **Promo Card Template Flow** - Event's template flows to all speaker promo cards
6. **Speaker Data Flow** - Name, title, company, logo all flow to preview cards and embeds
7. **Embed Filtering** - Only approved speakers appear in public embeds
8. **Embed Builder** - Live preview with grid/promo toggle

### Backend Fields Required (see sections below for details):
- `status` - Speaker workflow status
- `internal_notes` - Private organizer notes
- `website_card_approved` - Approval flag (assumed to exist)
- `promo_card_approved` - Approval flag (assumed to exist)
- `promo_card_template` on Event model (assumed to exist)

### User Account Creation:
- 🚨 **CRITICAL** - Speaker user accounts not created when speakers are added (see "Speaker User Account Creation" section)

---

---

## Critical: User vs Organization Data Structure

**Need clear separation between user-level and organization-level data.**

### User Level (`/account/me` response should include):
- `first_name` - user's first name
- `last_name` - user's last name
- `email` - user's email
- `avatar_url` - profile picture
- `role` - user's role (admin, member, speaker)
- `organization` - nested object with:
  - `id` - organization ID
  - `name` - organization name (e.g., "Seamless Events")
  - `role` - user's role in this org (admin/member)

### Organization/Account Level (new endpoint: `/account/organization` or similar):
- `id` - organization ID
- `name` - organization name (editable by admins)
- `logo_url` - organization logo
- `subscription` - plan details
- `created_at`
- `settings` - org-level settings

**Why we need this:**
1. Dropdown shows: "Organization Name / User Name (Role)" - need both separated
2. Users can belong to multiple organizations (team switching)
3. Admin users can edit organization settings; members cannot
4. Clear distinction between personal profile vs organization settings

**Current UI assumptions:**
- User belongs to one primary organization
- Organization name displayed in dropdown header
- User role determines access to org-level settings (Team, Billing, Organization Settings)

---

## Missing Data Fields

### 1. Event Email Settings - `from_name` field

**Status:** ⚠️ NEEDS BACKEND IMPLEMENTATION

**Field needed:** `from_name` (string, optional, max length 255)

**Where it's used:**
- Event Settings page - Email Settings card
- Field label: "'From' Name"
- Placeholder: "Your Company Name"

**Why we need it:**
When sending emails from the platform (speaker notifications, etc.), we need to set both the from name and from email. Currently we only have `from_email` field.

**Example usage:**
- From Name: "Seamless Events Team"
- From Email: "events@seamless.com"
- Results in email showing as: "Seamless Events Team <events@seamless.com>"

**Backend implementation needed:**

1. **Add to Event model/schema:**
   ```python
   from_name: Optional[str] = Field(None, max_length=255, description="Display name for outgoing emails")
   ```

2. **Database migration:**
   Add column `from_name VARCHAR(255) NULL` to events table

3. **Update API endpoints:**
   - `GET /events/{id}` - include `from_name` in response
   - `PATCH /events/{id}` - accept `from_name` in request body
   - `POST /events` - accept `from_name` in request body

**Frontend implementation (already complete):**
- ✅ Input field added to Event Settings page
- ✅ Sends as: `from_name` (snake_case) in PATCH `/events/{id}` payload
- ✅ Loads from: `from_name` field in GET `/events/{id}` response
- ✅ Form validation: optional field, no special validation needed

**Testing after backend implementation:**
1. Go to Event Settings page
2. Enter "Company Name" in 'From' Name field
3. Click Save Changes
4. Refresh page - should show "Company Name" persisted
5. Check database - `from_name` column should contain "Company Name"

---

### 2. Speaker Status Field - `status`

**Status:** ⚠️ NEEDS BACKEND IMPLEMENTATION

**Field needed:** `status` (string enum, required)

**Where it's used:**
- Speaker Portal page - Status badge/dropdown at top right
- Shows current workflow status of speaker

**Why we need it:**
Track the overall status of a speaker beyond just intake form completion. This represents where they are in the event preparation workflow.

**Suggested values:**
- `"ready"` - Speaker is fully approved and ready for event
- `"pending"` - Speaker needs attention or approval
- `"draft"` - Speaker record created but incomplete
- `"archived"` - Speaker removed from active list but data retained

**Example usage:**
- Organizer views speaker portal
- Status button shows "✓ Ready" (green) or "⏱ Pending" (yellow)
- Click to change status via dropdown

**Backend implementation needed:**

1. **Add to Speaker model/schema:**
   ```python
   status: str = Field("pending", description="Speaker workflow status")
   # Valid values: "ready", "pending", "draft", "archived"
   ```

2. **Database migration:**
   Add column `status VARCHAR(20) DEFAULT 'pending' NOT NULL` to speakers table

3. **Update API endpoints:**
   - `GET /events/{event_id}/speakers/{speaker_id}` - include `status` in response
   - `PATCH /events/{event_id}/speakers/{speaker_id}` - accept `status` in request body
   - `POST /events/{event_id}/speakers` - accept optional `status` (defaults to "pending")

**Frontend implementation (already complete):**
- ✅ Status dropdown UI in speaker portal
- ✅ Will send as: `status` in PATCH request
- ✅ Currently shows placeholder "Ready" status

---

### 3. Speaker Internal Notes - `internal_notes`

**Status:** ⚠️ NEEDS BACKEND IMPLEMENTATION

**Field needed:** `internal_notes` (text, optional)

**Where it's used:**
- Speaker Portal page - "Internal Notes" section
- Private notes visible only to organizer team, not to speaker

**Why we need it:**
Organizers need a place to track internal comments, reminders, or context about speakers that shouldn't be public or shared with the speaker.

**Example usage:**
- "Requested vegetarian meal option"
- "VIP - needs green room access"
- "Follow up about travel arrangements"

**Backend implementation needed:**

1. **Add to Speaker model/schema:**
   ```python
   internal_notes: Optional[str] = Field(None, description="Private organizer notes, not visible to speaker")
   ```

2. **Database migration:**
   Add column `internal_notes TEXT NULL` to speakers table

3. **Update API endpoints:**
   - `GET /events/{event_id}/speakers/{speaker_id}` - include `internal_notes` in response
   - `PATCH /events/{event_id}/speakers/{speaker_id}` - accept `internal_notes` in request body

**Frontend implementation (already complete):**
- ✅ "View/Edit Notes" button in speaker portal
- ✅ Dialog with textarea for editing notes
- ✅ Will send as: `internal_notes` in PATCH request

---

### 4. Speaker Approval Fields - `website_card_approved` and `promo_card_approved`

**Status:** ✅ ASSUMED TO EXIST (frontend implementation complete)

**Fields assumed:** `website_card_approved` (boolean), `promo_card_approved` (boolean)

**Where they're used:**
- Speaker Portal page - Single approval button that approves both cards
- Embed pages - Only show speakers where BOTH fields are true
- Speaker list - Show approval status badges

**Why we need them:**
Organizers need to approve speakers before they appear in public embeds. Approval is per-speaker and controls visibility in website and promo card embeds.

**Approval workflow:**
1. Speaker uploads headshot (required for approval)
2. Organizer reviews speaker portal
3. Organizer clicks "Approve for Embed" button
4. Both `website_card_approved` and `promo_card_approved` set to `true`
5. Speaker now appears in public embeds
6. If headshot is replaced, approval is automatically reset to `false` (requires re-approval)

**Frontend implementation (already complete):**
- ✅ Single approval button (approves both cards at once)
- ✅ Validation: cannot approve without headshot
- ✅ Auto-reset approval when new headshot uploaded
- ✅ Embeds filter to only show approved speakers
- ✅ Sends as: `website_card_approved` and `promo_card_approved` in PATCH request

**Backend verification needed:**
- Confirm these fields exist on Speaker model
- Confirm default value is `false`
- Confirm PATCH endpoint accepts these fields

---

### 5. Event Promo Card Template - `promo_card_template`

**Status:** ✅ ASSUMED TO EXIST (frontend implementation complete)

**Field assumed:** `promo_card_template` (string URL, optional)

**Where it's used:**
- Event Settings page - "Promo Card Template (PNG/PDF)" upload field
- Speaker Portal - Promo card preview uses event's template as background
- Public embeds - All speaker promo cards use event's template

**Why we need it:**
The promo card template is uploaded at the event level and serves as the background design for all speaker promo cards in that event. Speaker's headshot, name, title, company, and logo are overlaid on this template.

**Frontend implementation (already complete):**
- ✅ Upload field in Event Settings
- ✅ Speaker portal previews use event's template
- ✅ Public embeds use event's template as background
- ✅ Fallback to gradient if no template uploaded

**Backend verification needed:**
- Confirm `promo_card_template` field exists on Event model
- Confirm it's included in GET /events/{id} response
- Confirm file upload and URL storage works correctly

---

## Missing Endpoints & Critical Features

### 1. Speaker User Account Creation

**Status:** 🚨 CRITICAL - CORE FEATURE MISSING

**Problem:**
When a speaker is added (manually by organizer or via intake form), no user account is created. Speakers cannot log in to access their speaker dashboard.

**Current behavior:**
- Organizer adds speaker via "Add Speaker" dialog → creates speaker record only
- Speaker fills out intake form → creates speaker record only
- Speaker record has NO link to a user account
- Speaker has no login credentials

**What's needed:**

1. **Add `user_id` field to Speaker model:**
   ```python
   user_id: Optional[str] = Field(None, description="Linked user account for this speaker")
   ```

2. **Create user account when speaker is added:**
   - When `POST /events/{event_id}/speakers` is called:
     - Check if user with that email exists
     - If not, create new user with `role="speaker"`
     - Link speaker record to user via `user_id`
     - Send invitation email with login link

3. **Update existing speakers:**
   - Add migration to add `user_id` column to speakers table
   - Backfill: match existing speakers to users by email where possible

4. **Speaker invitation flow:**
   - Send email: "You've been invited to speak at [Event Name]"
   - Include login link or password reset link
   - Speaker logs in → sees their speaker dashboard with events they're speaking at

**Frontend impact:**
- Frontend already has speaker dashboard (`/speaker` route)
- Already has mode switching between organizer/speaker
- Just needs backend to actually create user accounts
# API Gaps — prioritized

Short, prioritized list of missing fields/endpoints the frontend depends on. Share with backend team; items marked P0/P1/P2 by priority.

Last updated: 2026-01-22

P0 — Critical (blocks features):
- Speaker user account creation (`user_id` on Speaker, create user on POST /events/{id}/speakers, send invite). Needed so speakers can log in and use `/speaker` flows.
- Speaker approval fields verification: `website_card_approved` and `promo_card_approved` (boolean, default false). Frontend depends on these for embeds.

P1 — High priority:
- `status` on Speaker (enum: `draft|pending|ready|archived`) with GET/PATCH support.
- `internal_notes` on Speaker (text) for organizer-only notes.
- `promo_card_template` on Event (string URL) — ensure included in GET /events/{id} and file upload persists URL.
- `from_name` on Event (string, optional) — Include in GET/PATCH/POST for email settings.

P2 — Nice-to-have / future work:
- Endpoints for saving embed builder configs (store/embed presets).
- Bulk speaker operations (bulk approve, bulk upload).
- Event duplication and archiving endpoints.

API shape & quick checks for backend:
- `/account/me` should return `first_name`, `last_name`, `email`, `avatar_url`, `role`, and `organization` (id, name, role).
- Speaker model should include: `id, first_name, last_name, email, headshot_url, website_card_approved, promo_card_approved, status, internal_notes, user_id`.
- Event model should include: `id, name, promo_card_template, from_name, modules`.

Actions for frontend dev (what to do now):
1. Treat P0 items as blockers — add to `API_GAPS.md` and ask backend to prioritize.
2. If backend not ready, implement approved mock responses and add `// TODO: Replace with API` near mocks. Keep mocks minimal and flagged.
3. Verify snake_case ↔ camelCase mapping in `openapi.json` and `src/lib/api.ts` (`deepCamel()`).

Questions for backend:
1. Should `POST /events/{id}/speakers` auto-create user accounts or return a `user_id` to link later?
2. Confirm enum values for `speaker.status` and `event.status`.
3. Confirm modules object shape: boolean flags or nested objects with metadata?

Keep this file short — details and proposed migrations can be shared in a follow-up ticket when backend agrees to implement.

