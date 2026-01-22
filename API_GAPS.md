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

**Use cases:**
- Organizer manually adds speaker → speaker receives invitation email
- Speaker applies via intake form → speaker receives welcome email with login
- Speaker logs in → sees list of events they're speaking at
- Speaker can update their profile, view event details, upload assets

---

## User Roles & Permissions

**Current API structure:**
- Users have `is_admin` boolean field
- Users have `role` string field (optional)
- Users have `team_ids` array

**Suggested role values:**
1. **"admin"** - Team admin, can manage team members, billing, all events
2. **"member"** - Team member, can manage events but not team/billing
3. **"speaker"** - Speaker user, can access speaker dashboard and their events

**Key distinction:**
- **Team members** (`admin`/`member`) belong to an organization, manage events
- **Speakers** (`speaker`) are invited to speak at events, have limited access

**Permissions by role:**
- `admin`: Full access to organization settings, team, billing, all events
- `member`: Can create/manage events, cannot access team/billing settings
- `speaker`: Can view events they're speaking at, update their profile, upload assets

**Frontend implementation:**
- ✅ Role-based navigation already implemented
- ✅ Mode switcher (organizer/speaker) already exists
- ✅ Speaker dashboard route exists (`/speaker`)
- ⚠️ Backend needs to actually assign roles and create speaker user accounts

---

## Notes for Backend Developer

1. **Snake case vs camelCase**: The API returns snake_case fields (e.g., `first_name`), which we automatically convert to camelCase on the frontend using the `deepCamel()` utility. Input schemas use camelCase (e.g., `EventSchema-Input` has `startDate`), output schemas use snake_case (e.g., `EventSchema-Output` has `start_date`).

2. **Speaker intake_form_status field**: This appears to be a string field. Please confirm valid values (e.g., "pending", "submitted", "approved", "rejected").

3. **Event status field**: Referenced in query params but not defined in schema. Please confirm valid values.

4. **Modules structure**: Currently defined as `additionalProperties: true` object. Frontend expects keys like `speaker`, `schedule`, `content`, `attendee`, `app` with boolean or object values.

---

## Questions for Backend Developer

1. What are the valid values for `intake_form_status` on speakers?
2. What are the valid values for event `status` field?
3. What should the modules object structure look like? (boolean values or nested objects with metadata?)
4. Does the `/account/me` endpoint return user data including first_name, last_name, role, team_ids?
5. **What are the valid values for user `role` field?** Suggest: "admin", "member", "speaker"
6. **How should speaker user accounts be created?** Should `POST /events/{event_id}/speakers` automatically create user accounts?
7. **Should there be a `user_id` field on speakers** to link speaker records to user accounts?

---

## Future Features (Not Urgent)

These features will be needed as we build out the app:

- Event duplication endpoint
- Event archiving endpoint
- Bulk speaker operations
- Speaker intake form builder endpoints
- Embed builder configuration storage
- Email template management
