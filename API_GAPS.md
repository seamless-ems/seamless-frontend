# API Gaps

Missing backend fields/endpoints needed by frontend.

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
