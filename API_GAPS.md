# API Gaps

Missing backend fields/endpoints needed by frontend.

---

## CORS Headers for Image Uploads (BLOCKING ISSUE)

**Need:** Add CORS headers to `/uploads/proxy/*` endpoint

**Why:** Frontend needs to fetch speaker headshots/logos to generate promo cards. Currently blocked by CORS.

**Implementation:**
- Add `Access-Control-Allow-Origin: *` (or specific origins)
- Add `Access-Control-Allow-Methods: GET, OPTIONS`
- Add `Access-Control-Allow-Headers: *`

**Current error:**
```
Access to image at 'https://api.seamlessevents.io/uploads/proxy/events/.../headshot.jpg'
from origin 'http://localhost:5173' has been blocked by CORS policy
```

---

## Promo Card Image Generation (RECOMMENDED APPROACH)

**Need:** `POST /api/promo-cards/generate` endpoint - server-side image generation

**Why:**
- Frontend card generation blocked by CORS, font issues, and scalability problems
- Backend generation is the industry-standard approach (Canva, Figma, etc.)
- Provides stable URLs for Google Sheets, downloads, and embed builder
- Scales to 100+ speakers per event

**Endpoint Spec:**

```
POST /api/promo-cards/generate
Content-Type: application/json

Request Body:
{
  "event_id": "uuid",
  "speaker_id": "uuid",
  "card_type": "promo" | "website",
  "config": {
    "canvasWidth": 908,
    "canvasHeight": 908,
    "templateUrl": "https://...", // Background image URL
    "headshot": {
      "x": 100, "y": 100,
      "size": 200,
      "scaleX": 1, "scaleY": 1,
      "shape": "circle" | "square" | "vertical" | "horizontal",
      "visible": true,
      "opacity": 1
    },
    "companyLogo": {
      "x": 500, "y": 500,
      "size": 100,
      "scaleX": 1, "scaleY": 1,
      "visible": true,
      "opacity": 1
    },
    "name": {
      "x": 100, "y": 400,
      "fontSize": 33,
      "fontFamily": "Inter",
      "fontWeight": 700,
      "color": "#000000",
      "textAlign": "left",
      "width": 400,
      "visible": true,
      "opacity": 1
    },
    // ... other text elements (title, company, custom fields)
  },
  "speaker_data": {
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "Acme Corp",
    "companyRole": "CEO",
    "headshot": "https://...",
    "companyLogo": "https://...",
    "customFields": {
      "custom123": "value"
    }
  }
}

Response:
{
  "image_url": "https://speaker.event.seamlessevents.io/events/{event_id}/speakers/{speaker_id}/promo.png",
  "generated_at": "2026-02-11T12:00:00Z",
  "size_kb": 245
}
```

**Rendering Logic:**

1. **Background:** Stretch template image to canvas dimensions
2. **Headshot:** Clip to shape (circle/square/vertical/horizontal), position at x/y
3. **Logo:** Position at x/y, scale by scaleX/scaleY
4. **Text:** Render with exact font (family, size, weight, color), position at x/y

**Element Mapping (text elements):**
- `name` → `{speaker.firstName} {speaker.lastName}`
- `title` → `speaker.companyRole`
- `company` → `speaker.companyName`
- `dynamic_{fieldId}` → `speaker.customFields[fieldId]`

**Recommended Libraries:**
- **Node.js:** `node-canvas` (Canvas API) or `puppeteer` (headless Chrome)
- **Python:** `Pillow` or `wand` (ImageMagick)
- Any library that can render images, text, and clip paths

**Storage:**
- Store generated images at stable URLs
- Overwrite if speaker data changes and needs regeneration
- Suggested format: `/uploads/generated/events/{event_id}/speakers/{speaker_id}/{card_type}.png`

**Performance:**
- Only generate at approval time (not on every request)
- Cache forever until speaker data changes
- Expect 100+ speakers per event

---

## Speaker `updatedAt` field

**Need:** `updatedAt` timestamp field on Speaker model (datetime, auto-updated on PATCH)

**Why:** "Last Updated" column in speakers table currently shows `registeredAt` as placeholder

**Implementation:**
- Add `updated_at` column to speakers table (TIMESTAMP, auto-update on modify)
- Include in GET/PATCH `/events/{event_id}/speakers` responses

---
