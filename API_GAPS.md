# API Gaps

Missing backend fields/endpoints needed by frontend.

---

## Asset downloads — CORS on company logo CDN

Company logo URLs are served from a CDN that does not return `Access-Control-Allow-Origin` headers. Client-side `fetch()` fails with a CORS error, causing the download to fall back to opening in a new tab instead of saving the file. Fix options:

- Enable CORS on the logo CDN bucket, **or**
- Add a backend proxy endpoint (e.g. `GET /uploads/proxy?url=...`) that fetches and streams the asset with `Content-Disposition: attachment`

Headshot downloads work because their CDN origin allows CORS.

---

## Embed page — transparent background

The frontend iframe snippet sets `allowtransparency="true"` and `background: transparent` so the embed sits over the customer's page background. For this to work, the embed page served by the backend must not set a hard background colour on `<html>` or `<body>`. Required:

- `GET /embed/:eventId` → no `background-color` on `<html>`/`<body>` (or set `background: transparent`)

---

## Card embed HTML rendering (`/embed/{eventId}/speaker/{speakerId}`)

The rendered HTML currently ignores config positioning data. Required:

- Outer container: `position: relative; width: {canvasWidth}px; height: {canvasHeight}px; overflow: hidden; background-color: {bgColor}` (or background-image for template uploads)
- Each element: `position: absolute; left: {cfg.x}px; top: {cfg.y}px`
- Images (headshot, logo): `width`/`height` from config, `object-fit: cover`, shape-clipped (circle → `border-radius: 50%`)
- Text: `font-family`, `font-size`, `font-weight`, `color`, `width`, `line-height` from config
- Gradient overlay: CSS `linear-gradient` matching direction and opacity from config

The SpeakerPortal preview embeds this same HTML — fixing the embed fixes the preview too.

---

## Event email settings — `from_name`, `from_email`, `reply_to_email`, `email_signature`

Frontend sends these fields on `POST /events` (create) and `PATCH /events/{id}` (update). Backend must:

- Store and return all four fields on `GET /events/{id}`
- Field names (snake_case): `from_name`, `from_email`, `reply_to_email`, `email_signature`
- These pre-fill the From / Reply-To fields in speaker intake and application emails shown to the organiser

Until the backend returns them, the frontend falls back to `localStorage` keys `seamless-email-from-name` / `seamless-email-from-email`.

---

## Speaker intake email — direct send

The organiser composes and copies the intake email manually today. Direct sending requires:

- `POST /events/{eventId}/speakers/{speakerId}/send-intake` (or similar)
- Backend sends the intake form link (`{origin}/speaker-intake/{eventId}`) to `speaker.email`
- The email should match the template the organiser has already seen: personalised greeting, CTA button, "Powered by Seamless Events" footer
- Returns success so the frontend can confirm delivery

---

## Call for Speakers — approval flow

`PATCH /events/{eventId}/speakers/{speakerId}` needs to accept `call_for_speakers_status` values: `"approved"`, `"rejected"`.

On approval the backend must:
1. Set `call_for_speakers_status: "approved"` on the speaker record
2. Carry over all submitted application data (name, email, bio, company, role) into the standard speaker record — these fields should not be blank when the speaker appears in the Speakers tab
3. Make the speaker appear in the standard speakers list (`GET /events/{eventId}/speakers` without `?form_type=call-for-speakers`) so they show in the Speakers tab
4. **Send a notification email** to the speaker confirming their application was accepted and including the Speaker Intake link (`{origin}/speaker-intake/{eventId}`) so they can log in or create a free Seamless account and complete their profile (headshot, logo, bio, and any missing fields).

On rejection:
- Set `call_for_speakers_status: "rejected"` only — speaker does not appear in the standard speakers list

Frontend sends: `{ call_for_speakers_status: "approved" | "rejected" }` alongside `id`, `firstName`, `lastName`, `email`, `formType` as a workaround — the backend currently rejects partial PATCH bodies (treats PATCH like PUT). Fix: make those fields optional on PATCH so a status-only update works.

---

## Card rendering — per-speaker text logic

`cfg.fontSize` is the **maximum**. Apply per speaker at render time:

- **Name:** `nameFormat` is now **always `"two-line"`** — single line has been removed as an option. Always render as two lines using this split: all words except the last on line 1, last word on line 2. E.g. `"Victoria Bartholomew-Richardson"` → `"Victoria Bartholomew<br>Richardson"`. If the name is a single word, render as-is. Shrink font (1px at a time, min 20px) until both lines fit within `cfg.width`.
- **Title:** allow up to 2 lines within `cfg.width`. No shrink.
- **Company `top`:** `title_top + (lineCount × fontSize × lineHeight) + 10`. Default `lineHeight` 1.2. Pushes company down when title wraps to 2 lines.

---
