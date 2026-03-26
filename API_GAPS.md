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

## Speaker intake email — direct send

When an organiser adds a speaker via "Send Intake Form", the UI generates an editable email template and lets the organiser copy it manually. Direct sending requires:

- `POST /events/{eventId}/speakers/{speakerId}/send-intake` (or similar)
- Backend sends the intake form link to `speaker.email`
- Returns success; frontend shows confirmation and removes "Direct send coming soon" note

---

## Call for Speakers — approval flow

`PATCH /events/{eventId}/speakers/{speakerId}` needs to accept `call_for_speakers_status` values: `"approved"`, `"rejected"`.

On approval the backend must:
1. Set `call_for_speakers_status: "approved"` on the speaker record
2. Make the speaker appear in the standard speakers list (i.e. `GET /events/{eventId}/speakers` without `?form_type=call-for-speakers`) so they show up in the Speakers tab with whatever data they submitted
3. Optionally trigger a notification email with a Speaker Intake link so they can fill in missing fields (headshot etc.)

Frontend sends: `{ call_for_speakers_status: "approved" | "rejected" }`

---

## Card rendering — per-speaker text logic

`cfg.fontSize` is the **maximum**. Apply per speaker at render time:

- **Name:** `nameFormat` is now **always `"two-line"`** — single line has been removed as an option. Always render as two lines using this split: all words except the last on line 1, last word on line 2. E.g. `"Victoria Bartholomew-Richardson"` → `"Victoria Bartholomew<br>Richardson"`. If the name is a single word, render as-is. Shrink font (1px at a time, min 20px) until both lines fit within `cfg.width`.
- **Title:** allow up to 2 lines within `cfg.width`. No shrink.
- **Company `top`:** `title_top + (lineCount × fontSize × lineHeight) + 10`. Default `lineHeight` 1.2. Pushes company down when title wraps to 2 lines.

---
