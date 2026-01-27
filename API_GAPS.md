# API Gaps & Mock Data Requirements

This document tracks any data or endpoints we need that aren't currently available in the API.
Share this list with the backend developer to coordinate changes.

**Last Updated:** January 27, 2026

---

## 🔴 CRITICAL: Promo Card Template Not Saving

**Status:** 🚨 BLOCKING - Currently broken

**Issue:**
The promo card template upload in Event Settings appears to work (preview shows the uploaded image), but when clicking "Save Changes", the endpoint fails and the template is not persisted.

**What's Happening:**
1. User uploads PNG/PDF template in Event Settings → Preview appears ✅
2. User clicks "Save Changes" → API call fails ❌
3. Error: `PATCH /events/{event_id}` returns CORS error + fetch failure
4. Template is NOT saved to the backend
5. When user navigates to speaker portal, template does NOT appear on promo card preview

**Error Details:**
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
CORS policy: No 'Access-Control-Allow-Origin' header
TypeError: Failed to fetch
```

**Backend Fix Required:**
1. Verify `PATCH /api/v1/events/{event_id}` endpoint accepts `promo_card_template` field
2. Confirm the file URL from upload is being stored correctly in the database
3. Verify the field is being returned in `GET /api/v1/events/{event_id}` response
4. Check CORS headers are properly configured for local development

**Frontend Implementation (Already Complete):**
- ✅ File upload input accepts PNG/PDF
- ✅ Preview image displays after selection
- ✅ Sends `promo_card_template` field in PATCH request
- ✅ Query cache invalidation triggers after save

**Testing After Backend Fix:**
1. Go to Event Settings
2. Upload a PNG or PDF template
3. Verify preview appears
4. Click "Save Changes"
5. No errors should appear
6. Navigate to speaker portal → Template should appear as background on promo card
7. Refresh page → Template should persist
8. Check database → `promo_card_template` field should contain the file URL

---

## 🔴 CRITICAL: Speaker Intake Endpoint Not Storing Extended Fields

**Status:** 🚨 BLOCKING - Currently broken

**Issue:**
The `POST /api/v1/events/{event_id}/intake` endpoint accepts `companyName`, `companyRole`, and `bio` fields in the request payload, but is not storing or returning them when the speaker is fetched.

**What's Broken:**
1. Frontend submits complete payload with all fields:
   ```json
   {
     "firstName": "Speaker",
     "lastName": "Name",
     "email": "speaker@example.com",
     "companyName": "Acme Corp",
     "companyRole": "CEO",
     "bio": "Speaker bio text",
     "linkedin": "https://linkedin.com/in/speaker",
     "headshot": "/uploads/proxy/headshot.jpg",
     "company_logo": "/uploads/proxy/logo.jpg"
   }
   ```

2. Intake endpoint receives the payload (no 400 errors), but when speaker is fetched via `GET /api/v1/events/{event_id}/speakers/{speaker_id}`, only these fields are returned:
   - `firstName` ✅
   - `lastName` ✅
   - `email` ✅
   - `headshot` ✅
   - `company_logo` ✅
   - `companyName` ❌ (missing)
   - `companyRole` ❌ (missing)
   - `bio` ❌ (missing)
   - `linkedin` ❌ (missing)

**Backend Fix Required:**
1. Verify the intake endpoint is storing `companyName`, `companyRole`, `bio`, and `linkedin` in the database
2. Confirm the speaker GET endpoint returns these fields
3. Check if intake endpoint uses a different schema that excludes these fields

**Testing:**
1. Submit speaker via intake form with all fields filled in
2. Fetch speaker via GET `/api/v1/events/{event_id}/speakers/{speaker_id}`
3. All submitted fields should appear in response

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

## Forms & Applications API (NEW — P0/P1 Priority)

**Context:** Frontend has implemented UI for Forms and Applications tabs in the Speaker Module (`/organizer/event/{id}/speakers`). Both tabs are ready for backend integration but require the following endpoints and data models.

**Missing Endpoints (P0 - Blocker):**

### Forms Endpoints

1. **GET `/events/{id}/forms`** — Fetch all forms for an event
   - Returns: Array of Form objects with submission counts
   - Query params: (none required, optional: `type` filter for "speaker_info" vs "application")
   - Example response:
   ```json
   {
     "forms": [
       {
         "id": "form_1",
         "event_id": "event_123",
         "name": "Event Speaker Information",
         "type": "speaker_info",
         "description": "For confirmed speakers - submissions go directly to Speakers",
         "fields": [...],
         "submissions_count": 12,
         "created_at": "2026-01-15T10:00:00Z",
         "updated_at": "2026-01-20T14:30:00Z"
       },
       {
         "id": "form_2",
         "event_id": "event_123",
         "name": "Event Call for Speakers",
         "type": "application",
         "description": "Applications require approval - submissions go to Applications tab",
         "fields": [...],
         "submissions_count": 6,
         "created_at": "2026-01-10T09:00:00Z",
         "updated_at": "2026-01-18T11:20:00Z"
       }
     ]
   }
   ```

2. **POST `/events/{id}/forms`** — Create a new form
   - Body:
   ```json
   {
     "name": "string (required)",
     "type": "speaker_info|application (required)",
     "description": "string (optional)",
     "fields": [
       {
         "id": "field_1",
         "label": "Full Name",
         "type": "text|email|textarea|select|file",
         "required": true,
         "options": ["..."] // for select type only
       }
     ]
   }
   ```
   - Returns: Created Form object with id and timestamps

3. **PATCH `/events/{id}/forms/{formId}`** — Update form (name, description, fields)
   - Body: Same as POST (partial updates allowed)
   - Returns: Updated Form object
   - Note: Should NOT allow changing `type` after creation

4. **DELETE `/events/{id}/forms/{formId}`** — Delete form
   - Returns: 204 No Content or `{ "success": true }`
   - Note: Soft delete recommended to preserve submission history

### Applications Endpoints

5. **GET `/events/{id}/applications`** — Fetch all applications (form submissions of type "application")
   - Returns: Array of Application objects
   - Query params: (optional: `status` filter for "pending|approved|rejected")
   - Example response:
   ```json
   {
     "applications": [
       {
         "id": "app_1",
         "event_id": "event_123",
         "form_id": "form_2",
         "form_name": "Event Call for Speakers",
         "speaker_name": "Alice Johnson",
         "email": "alice@example.com",
         "company": "Tech Corp",
         "topic": "AI in Modern Apps",
         "status": "pending",
         "submission_data": { "...": "..." },
         "rejection_reason": null,
         "created_at": "2026-01-20T15:45:00Z",
         "updated_at": "2026-01-20T15:45:00Z"
       }
     ]
   }
   ```

6. **PATCH `/events/{id}/applications/{appId}`** — Approve or reject application
   - Body:
   ```json
   {
     "status": "approved|rejected (required)",
     "rejection_reason": "string (required if status=rejected, null otherwise)"
   }
   ```
   - Returns: Updated Application object
   - Side effect (on approve): Auto-create Speaker record linked to this Application
   - Side effect (on reject): Store rejection_reason for applicant visibility in future

**Form Submission Endpoint (P1 - Secondary):**

7. **POST `/forms/{formId}/submissions`** — Public endpoint for form submissions (used by SpeakerIntakeForm)
   - Body:
   ```json
   {
     "form_id": "form_1",
     "submission_data": {
       "full_name": "Bob Smith",
       "email": "bob@example.com",
       "company": "StartUp Inc",
       "...": "..."
     }
   }
   ```
   - Returns: `{ "id": "submission_123", "status": "received" }`
   - Authentication: Public (no auth required) or rate-limited
   - Routing: If form.type = "speaker_info", create Speaker record. If form.type = "application", create Application record.

**Missing Data Models:**

### Form Model
```
{
  id: string (UUID)
  event_id: string (FK to Event)
  name: string
  type: enum("speaker_info", "application") // determines routing of submissions
  description: string | null
  fields: Array<{
    id: string
    label: string
    type: enum("text", "email", "textarea", "select", "file", "checkbox", "radio")
    required: boolean
    placeholder: string | null
    options: string[] | null (for select/radio types)
    validation: object | null (e.g., { "minLength": 5, "pattern": "regex" })
  }>
  submissions_count: integer (auto-calculated from Submission table)
  created_at: datetime
  updated_at: datetime
  deleted_at: datetime | null (soft delete)
}
```

### Application Model
```
{
  id: string (UUID)
  event_id: string (FK to Event)
  form_id: string (FK to Form)
  speaker_name: string
  email: string
  company: string | null
  topic: string | null
  status: enum("pending", "approved", "rejected") // default "pending"
  submission_data: json (raw form submission data)
  rejection_reason: string | null
  linked_speaker_id: string | null (FK to Speaker, set when approved)
  created_at: datetime
  updated_at: datetime
}
```

### Submission Model (for tracking all form submissions)
```
{
  id: string (UUID)
  form_id: string (FK to Form)
  form_type: enum("speaker_info", "application")
  submission_data: json
  status: enum("received", "processed") // "processed" = moved to Speaker or Application
  created_at: datetime
}
```

**Frontend Integration Notes:**

1. **Forms Tab** (`SpeakerModule.tsx` Forms tab):
   - Call GET `/events/{id}/forms` on mount
   - Display forms as cards with submission counts
   - "Create New Form" button → POST `/events/{id}/forms` → refresh list
   - "Edit Form" button → opens SpeakerFormBuilder → PATCH `/events/{id}/forms/{formId}` on save
   - "Duplicate" button → POST with cloned fields → rename + save
   - "Delete" button → DELETE `/events/{id}/forms/{formId}` → refresh list
   - "Get Link" button → copy `${ORIGIN}/organizer/events/{eventId}/forms/{formId}` or similar public URL

2. **Applications Tab** (`SpeakerModule.tsx` Applications tab):
   - Call GET `/events/{id}/applications?status=pending` on mount
   - Display applications in table/card view
   - "Approve" button → PATCH `/events/{id}/applications/{appId}` with `status: "approved"` → refresh list
   - "Reject" button → PATCH with `status: "rejected"` + reason → refresh list
   - Approved applications should move to Speakers tab via auto-created Speaker record

3. **Speaker Intake Form** (`SpeakerIntakeForm.tsx`):
   - Form already submits to `/organizer/event/{eventId}/speaker-intake` endpoint
   - Can be migrated to POST `/forms/{formId}/submissions` with public form ID
   - Routing handled server-side based on form.type

**Questions for Backend:**

1. Should form.type auto-determine submission routing, or explicitly route in frontend?
2. Can approved Applications auto-create Speaker records server-side, or should frontend call a separate endpoint?
3. Should deleted forms (soft delete) keep their submissions and applications intact?
4. For form field validation, should we store validation rules in DB or assume frontend-only?
5. Should form submissions be queryable by `status`? (e.g., "drafts", "spam", "complete")

**Testing Checklist (when endpoints ready):**

- [ ] GET `/events/{id}/forms` returns correct form list with submission counts
- [ ] POST `/events/{id}/forms` creates form and returns in GET list
- [ ] PATCH `/events/{id}/forms/{formId}` updates fields and reflects in GET
- [ ] DELETE `/events/{id}/forms/{formId}` removes from list
- [ ] GET `/events/{id}/applications` returns submitted applications
- [ ] PATCH `/events/{id}/applications/{appId}` with approve status creates Speaker record
- [ ] PATCH with reject status stores rejection_reason
- [ ] POST `/forms/{formId}/submissions` (public) routes correctly by form.type
- [ ] Form links are copyable and publicly accessible

## Form Fields & Custom Fields API (P1 - High Priority)

**Context:** SpeakerFormBuilder component allows organizers to enable/disable default fields and add custom fields. Currently configured fields are only stored locally in frontend state. This section details what backend support is needed.

**Default Fields (Pre-Configured):**

These are always available, but can be enabled/disabled:
```
1. First Name (text) - required, cannot disable
2. Last Name (text) - required, cannot disable
3. Email (email) - required, cannot disable
4. Company Name (text) - optional
5. Role/Title (text) - optional
6. Bio (textarea) - optional
7. LinkedIn URL (text) - optional
8. Headshot (file) - optional, image upload
9. Company Logo (file) - optional, image upload
```

**Custom Fields:**

Organizers can add unlimited custom fields with:
- Field label (string)
- Field type (text, textarea, email, file, [TODO: checkbox, radio, select])
- Placeholder text (optional)
- Required toggle (boolean)
- Order/positioning (drag to reorder)

**Missing Backend Requirements (P1):**

### File Upload Handling (BLOCKER)

**Issue:** Current form field type includes `file`, but no backend file upload endpoint exists.

**Required:**
1. **File upload endpoint** for form submissions:
   ```
   POST /forms/{formId}/submissions/upload
   Content-Type: multipart/form-data
   
   Body:
   {
     "field_id": "headshot",
     "file": <binary>
   }
   
   Returns:
   {
     "file_url": "https://cdn.seamlessevents.io/forms/event_123/submission_456/headshot.jpg",
     "file_size": 2048576,
     "mime_type": "image/jpeg"
   }
   ```

2. **File storage strategy:**
   - Where are file uploads stored? (S3, GCS, file server, CDN?)
   - URL structure for retrieving files?
   - File size limits per field? (e.g., 5MB for images, 10MB for documents)
   - Allowed MIME types per field? (images only, any document, etc.)

3. **File cleanup:**
   - Orphaned files when submission is deleted?
   - File retention policy?
   - Virus scanning? NSFW filtering?

### Custom Field Types (P1 - Future)

Currently supported in frontend:
- `text` ✅
- `textarea` ✅
- `email` ✅
- `file` ✅ (needs upload endpoint)

Not yet supported but planned:
- `select` - dropdown with multiple options (need `options: string[]` in field schema)
- `checkbox` - single checkbox (boolean)
- `radio` - radio button group (need `options: string[]`)
- `date` - date picker
- `time` - time picker
- `phone` - phone number with validation
- `url` - URL with validation

**Questions for Backend:**

1. **File uploads:** Should organizer-configured file fields (e.g., "Headshot") auto-route uploads to Speaker records or stay in form submission data?
   - Example: If "Headshot" field is in Speaker Information Form, should it auto-update `speaker.headshot_url`?
   - Or should frontend handle the routing after submission?

2. **File size limits:** Should limits vary by field type or form.type?
   - Speaker info forms might allow larger files than application forms?

3. **Custom select/checkbox/radio:** Should field.options be simple string array or more structured?
   ```json
   // Option 1: Simple array
   "options": ["Option A", "Option B", "Option C"]
   
   // Option 2: Objects with labels and values
   "options": [
     { "label": "Option A", "value": "opt_a" },
     { "label": "Option B", "value": "opt_b" }
   ]
   ```

4. **Field validation:** Should validation rules be stored per field or in form.type definition?
   - E.g., "email" field always validates as email?
   - Or allow regex patterns per field in the UI?

5. **Form submission with files:** Should multipart form data include all fields + files, or separate endpoints?
   ```
   // Option 1: All in one multipart request
   POST /forms/{formId}/submissions
   Content-Type: multipart/form-data
   {
     "full_name": "Alice",
     "email": "alice@example.com",
     "headshot": <binary>,
     "resume": <binary>
   }
   
   // Option 2: Submit data first, upload files after
   POST /forms/{formId}/submissions → returns submission_id
   POST /forms/{formId}/submissions/{submission_id}/upload → upload files
   ```

**Frontend Implementation Status:**

- ✅ UI for default field toggling (switch on/off)
- ✅ UI for custom field creation (label, type, placeholder, required)
- ✅ UI for custom field reordering (drag with up/down arrows)
- ✅ Live preview of form as organizer builds it
- ✅ Save button (currently saves to local state only)
- 🔲 Backend persistence of form field configuration
- 🔲 File upload handling in form submissions
- 🔲 Multi-step form support (e.g., demographics → media → questions)
- 🔲 Conditional fields (show/hide based on previous answers)

**Testing Checklist:**

- [ ] File upload endpoint accepts multipart/form-data
- [ ] Uploaded files are stored and retrievable via returned URL
- [ ] File size validation rejects oversized files
- [ ] MIME type validation works (images, documents, etc.)
- [ ] Form submission with file fields completes successfully
- [ ] File fields marked required prevent submission without file
- [ ] Custom fields with select/checkbox/radio types work (when implemented)
- [ ] Form configuration persists across sessions

