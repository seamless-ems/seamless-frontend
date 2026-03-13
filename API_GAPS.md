# API Gaps

Missing backend fields/endpoints needed by frontend.

---

## Card embed HTML rendering — broken layout (`/embed/{eventId}/speaker/{speakerId}`)

The rendered HTML currently ignores the card config's positioning data. Required:

- Outer container: `position: relative; width: {canvasWidth}px; height: {canvasHeight}px; overflow: hidden; background-color: {bgColor}` (or background-image for template uploads)
- Each element: `position: absolute; left: {cfg.x}px; top: {cfg.y}px`
- Images (headshot, logo): explicit `width` and `height` from config, `object-fit: cover`, clipped to shape (circle → `border-radius: 50%`)
- Text elements: `font-family`, `font-size`, `font-weight`, `color`, `width`, `line-height` from config
- Gradient overlay: CSS `linear-gradient` matching direction and opacity from config

The preview in SpeakerPortal embeds this same HTML — fixing the embed fixes the preview too.

---

## Card rendering — shrink text on overflow

When rendering title/company elements, if text overflows `cfg.width` at `cfg.fontSize`, step the font size down (1pt at a time, floor 10px) until it fits. Treat `cfg.fontSize` as the maximum, not a fixed value.

---

## Card Builder — `name` element `nameFormat` field

**What:** The `name` element config now includes `nameFormat: "single" | "two-line"`.

**Why:** First and last name are stored separately. This flag lets the organiser choose how the name appears on the card without hard-coding font size as the only lever.

**Backend must:** When rendering a card, read `config.name.nameFormat`:
- `"single"` → `"Lisa Young"` (default, current behaviour)
- `"two-line"` → `"Lisa\nYoung"` (first name on line 1, last name on line 2)

---
