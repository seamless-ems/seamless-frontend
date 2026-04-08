# API Gaps

Missing backend fields/endpoints needed by frontend.

---

## April 8 — Card builder template persistence (potential backend)

The Social Card (and occasionally Speaker Card) template config does not always load back as saved. Symptoms: canvas appears blank on re-entry, elements eventually appear after navigating away and back or re-saving. The frontend save/load logic has been audited and appears correct — the config is sent with the right `promo_type` and the response is applied. Suspected cause: the backend may not be reliably storing or returning the config for a given `promo_type`, or is returning a stale/empty record intermittently.

- `POST /promo-cards/config` with `{ promoType: "promo" | "website", config: {...} }` → confirm the record is keyed by both `eventId` AND `promoType` (not just `eventId`)
- `GET /promo-cards/config/{eventId}?promo_type=promo` → must return the config most recently saved for that specific `promo_type`

---

## April 8 — Speaker card embed positions wrong (backend rendering bug)

`GET /embed/{event_id}/speaker/{speaker_id}` does **not** use the saved config positions when rendering HTML. Text and logo elements appear at hardcoded/default positions rather than the `x`/`y` values stored in the config.

The social card endpoint (`GET /promo-cards/{event_id}/speaker/{speaker_id}`) **does** render correctly using config positions — so the fix is to bring the `/embed/` renderer in line with how `/promo-cards/` works.

Both endpoints receive the same config structure (saved by the frontend with `canvasWidth`, `canvasHeight`, and per-element `x`, `y`, `fontSize`, `color`, `width`, etc.). The backend just needs to use those values in `/embed/` the same way it already does in `/promo-cards/`.

---

## April 8 — Social card logos

### Company logo / company name on speaker cards
`companyLogo` (URL) and `company` (string) are not persisted or returned by the backend on speaker records. The company logo drop zone placeholder shows on every speaker card and the company name field is always blank after reload. This affects both the Speaker Card and Social Card builders.
- `PATCH /events/{eventId}/speakers/{speakerId}` → must persist and return `companyLogo` and `company`
- `GET /events/{eventId}/speakers/{speakerId}` → must include both fields

### Event logo image CORS
The event logo URL is uploaded to the server and stored in the template config. On reload, the frontend sets `testEventLogo` from the saved URL and attempts to render it as a canvas image. If the uploaded file is served from a CORS-blocked origin (S3/CDN without correct headers), the image silently fails to load and the drop zone placeholder renders instead. The event logo *position* is correct (it is stored in the config JSON) — only the image itself fails.
- Uploads endpoint / CDN must return `Access-Control-Allow-Origin: *` (or the app origin) on image responses.

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

## Company logo / company name not persisting

`companyLogo` and `company` fields on speaker records are not returned after save/reload. The frontend saves them correctly via the speaker form but the backend does not store or return them.

- `PATCH /events/{eventId}/speakers/{speakerId}` → must persist and return `companyLogo` (URL) and `company` (string)
- `GET /events/{eventId}/speakers/{speakerId}` → must include `companyLogo` and `company` in the response

Until fixed: the logo drop zone placeholder shows on all speaker cards; company name field appears blank after reload.

---

## embed_enabled toggle

Frontend sets `embed_enabled: true/false` optimistically on the event record when the organiser toggles the embed. Backend field not yet implemented — the toggle has no effect server-side.

- `PATCH /events/{eventId}` → must accept and persist `embed_enabled: boolean`
- `GET /events/{eventId}` → must return `embed_enabled`

---

## Content history attribution

Frontend sends `createdBy` (user ID) when creating content entries. Backend is not storing or returning it.

- `POST /events/{eventId}/speakers/{speakerId}/content` → persist `createdBy`
- `GET /events/{eventId}/speakers/{speakerId}/content` → return `createdBy` per entry

---

## Content archive / restore

Frontend has archive and restore UI (stub). Backend endpoint not yet available.

- `PATCH /events/{eventId}/speakers/{speakerId}/content/{contentId}` → accept `{ archived: true/false }` to archive/restore a content entry
- `GET /events/{eventId}/speakers/{speakerId}/content` → include `archived` field per entry; archived entries excluded from default response unless `?include_archived=true`

---

## Card downloads — PNG export

Card download currently opens the backend-rendered HTML in a new tab. Direct PNG download is not yet available.

- `GET /embed/{eventId}/speaker/{speakerId}?format=png` → return a rendered PNG of the speaker card
- `GET /promo-cards/{eventId}/speaker/{speakerId}?format=png` → return a rendered PNG of the social card

Frontend will use these to trigger a direct file download rather than opening a new tab.
