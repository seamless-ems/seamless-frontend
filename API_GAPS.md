# API Gaps

Missing backend fields/endpoints needed by frontend.

---

## Speaker `updatedAt` field

**Need:** `updatedAt` timestamp field on Speaker model (datetime, auto-updated on PATCH)

**Why:** "Last Updated" column in speakers table currently shows `registeredAt` as placeholder

**Implementation:**
- Add `updated_at` column to speakers table (TIMESTAMP, auto-update on modify)
- Include in GET/PATCH `/events/{event_id}/speakers` responses

---
