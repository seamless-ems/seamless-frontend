# Backend Queue — Frontend Wiring Tracker

Items the backend team needs to ship. Each entry notes the exact frontend wiring needed once it lands.
**When a backend item ships: test it, wire up the frontend change, and delete the entry.**

---

## Speaker Intake & Auth Flow

### 1. `POST /auth/firebase/send-magic-link` — use `url` param as `continueUrl`
**Backend:** The `url` field in the request body must be used as the Firebase `continueUrl`. Currently hardcoded to `/finish-signup`.
**Why it matters:** Frontend encodes `?redirect=/speaker/:id/event/:id` into the URL so speakers land on their profile after clicking the magic link. Hardcoding drops it.
**Frontend wiring:** None — already implemented. Just verify end-to-end: submit intake form → type email on success screen → click Firebase link → land on speaker profile.

---

### 2. Confirmation email — trigger server-side on intake submission
**Backend:** `POST /events/:eventId/speaker-intake` should send a welcome email to the speaker on successful submission. Email must include:
- Their email address (so they know what to sign in with)
- A login link: `/login?redirect=/speaker/:speakerId/event/:eventId`
- Subject: `Your speaker profile — [Event Name]`
**Why it matters:** `POST /events/:eventId/speakers/:speakerId/email` requires auth. Speakers submitting the public intake form have no session — the frontend call fails silently.
**Frontend wiring:** Remove the `emailSpeaker` fire-and-forget block in `src/pages/public/SpeakerIntakeForm.tsx` (around line 601–621). Also remove the `emailSpeaker` and `buildEmailHtml` imports if no longer used.

---

### 3. `PATCH /events/:eventId/speakers/:speakerId` — identify by `speakerId` not email
**Backend:** When updating a speaker, look up the record by `speakerId` (path param), not by email. Currently a speaker changing their email triggers a duplicate-email error.
**Frontend wiring:** None — already sending `speakerId` in the payload. Just verify email field can be edited and saved on the intake form without error.

---

### 4. `GET /events/:eventId/speakers/:speakerId` — allow unauthenticated CORS
**Backend:** Public intake form needs to pre-populate fields from the speaker record. Endpoint must accept unauthenticated requests with correct CORS headers.
**Frontend wiring:** None — pre-population already implemented with camelCase/snake_case fallbacks. Verify all fields populate correctly once CORS is open.

---

### 5. File uploads from public intake form
**Backend:** `POST /uploads` (or equivalent) currently requires a Firebase Bearer token. Speakers on the public intake form have no session, so headshot/logo/content uploads fail silently.
**Options (backend to decide):**
- Accept unauthenticated uploads scoped to a `speakerId` + `eventId`
- Handle uploads server-side as part of the intake submission
**Frontend wiring:** Once fixed, test headshot, company logo, and content uploads from an unauthenticated intake form session. Remove any silent-fail guards if the endpoint now throws proper errors.

---

### 6. Intake link expiry
**Backend:** The `?speakerId=` intake URL is permanently live. Once a speaker has an authenticated account, the plain link should be invalidated (or require auth to use).
**Frontend wiring:** None required — this is purely a backend security concern. Frontend already handles the authenticated edit flow.

---

## Session Persistence

### 7. Backend JWT expiry — set to 7 days (rolling)
**Backend:** `POST /auth/firebase/exchange` (or equivalent token exchange endpoint) currently issues short-lived JWTs (likely 1 hour). Set expiry to **7 days**. Issue a fresh token on every exchange call so the window rolls — users stay logged in indefinitely while active.
**Why it matters:** Firebase refreshes its ID token hourly, triggering a new exchange call. With 7-day expiry, users only see a login prompt after 7 days of complete inactivity.
**Frontend wiring:** None — session handling already improved (token read from localStorage on startup, transient exchange failures no longer log the user out). Just verify users stay logged in across browser restarts.

---

## Application Flow

### 8. Approved applicant → moves to speakers list
**Backend:** When an application is approved, the applicant should automatically appear in the speakers list.
**Frontend wiring:** `src/components/organizer/ApplicationsTab.tsx` — verify approved applicants appear in the Speakers tab. Check status badge updates correctly.

### 9. Approved applicant email → log in to profile (not blank intake form)
**Backend:** When an application is approved, the email sent to the speaker should link to `/login?redirect=/speaker/:speakerId/event/:eventId` — not to the blank intake form.
**Why it matters:** Approved applicants already have their info submitted — sending them back to the intake form is confusing.
**Frontend wiring:** Check `ApplicationsTab.tsx` approval email flow and update the CTA URL to use the login+redirect pattern instead of the intake form URL.

### 10. Application status logic
**Backend:** When an application is approved and moved to speakers:
- If all required speaker info fields are present → status: `Pending Approval`
- If info is missing → status: `Info Pending`
**Frontend wiring:** Verify status badges in `SpeakersTable.tsx` reflect the new statuses correctly.
