# API Gaps

Missing backend fields/endpoints needed by frontend.

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

## Card rendering — per-speaker text logic

`cfg.fontSize` is the **maximum**. Apply per speaker at render time:

- **Name:** shrink (1px at a time) until it fits on 1 line within `cfg.width`. Min 20px. Allow 2 lines if `nameFormat === "two-line"`. **Bug:** `nameFormat: "two-line"` is not rendering as two lines in the embed despite being saved correctly in the config — single line works fine. Backend to investigate.
- **Title:** allow up to 2 lines within `cfg.width`. No shrink.
- **Company `top`:** `title_top + (lineCount × fontSize × lineHeight) + 10`. Default `lineHeight` 1.2. Pushes company down when title wraps to 2 lines.

---
