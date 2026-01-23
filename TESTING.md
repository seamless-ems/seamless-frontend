# Speaker Module Testing Guide

**Date:** January 21, 2026
**Status:** All features wired up and ready for testing

---

## Overview

The complete speaker workflow has been implemented end-to-end. This guide helps you test every feature systematically.

---

## Prerequisites

1. Event created with Speaker module enabled
2. Event Settings > "Promo Card Template" uploaded (optional but recommended)
3. At least one speaker added to test with

---

## Test Plan

### 1. Add Speaker & Edit Speaker Form

**Test:** Add a new speaker
**Steps:**
1. Go to event > Speakers tab
2. Click "Add Speaker" in Quick Actions sidebar
3. Fill in all fields:
   - First Name: "Jane"
   - Last Name: "Doe"
   - Email: "jane@example.com"
   - Title: "CEO"
   - Company: "Acme Corp"
   - LinkedIn: "linkedin.com/in/janedoe"
   - Bio: "Sample bio text..."
4. Click Save

**Expected:**
- Speaker created successfully
- Appears in speaker list
- Toast notification confirms creation

**Test:** Edit existing speaker
**Steps:**
1. Open speaker portal (click speaker from list)
2. Click pencil icon (✏️) next to "Speaker Information"
3. Edit any field
4. Click Save

**Expected:**
- Form layout matches speaker information section exactly
- All fields populated correctly
- Changes saved and reflected immediately

---

### 2. Image Cropping (Headshot & Logo)

**Test:** Upload and crop headshot
**Steps:**
1. Open speaker portal
2. Click "Replace" button under Headshot
3. Select an image file
4. Crop dialog appears
5. Adjust position and zoom
6. Click "Apply Crop"

**Expected:**
- Square crop area (1:1 aspect ratio)
- Zoom slider works (1x to 3x)
- Cropped image uploads and displays
- **IMPORTANT:** Approval status resets to pending

**Test:** Upload and crop company logo
**Steps:**
1. Click "Replace" button under Logo
2. Select an image file
3. Crop dialog appears
4. Adjust position and zoom
5. Click "Apply Crop"

**Expected:**
- 16:9 aspect ratio crop area
- Zoom slider works
- Cropped logo uploads and displays
- Approval status NOT affected (only headshot resets approval)

---

### 3. Approval Workflow

**Test:** Cannot approve without headshot
**Steps:**
1. Create a speaker with no headshot
2. Open speaker portal
3. Check approval button in Website Card or Promo Card

**Expected:**
- Button shows "Upload headshot to approve"
- Button is disabled
- Both cards show same button state

**Test:** Approve speaker for embed
**Steps:**
1. Ensure speaker has headshot
2. Click "Approve for Embed" button
3. Check both card previews

**Expected:**
- Button changes to green "Approved" button
- BOTH Website Card AND Promo Card show approved
- Single button approves both cards simultaneously

**Test:** Unapprove speaker
**Steps:**
1. Click the green "Approved" button

**Expected:**
- Button changes back to "Approve for Embed"
- Both cards revert to pending state

**Test:** Approval resets when headshot changes
**Steps:**
1. Approve a speaker
2. Upload a new headshot
3. Check approval status

**Expected:**
- Approval automatically resets to pending
- Toast notification: "Headshot updated - approval reset"
- Must re-approve speaker for embed

---

### 4. Card Previews (Website & Promo)

**Test:** Website Card shows all speaker data
**Steps:**
1. Open speaker portal with complete data (name, title, company, logo)
2. View Website Card preview

**Expected:**
- Headshot displays (100x100px, rounded)
- Full name displays
- Title/role displays
- Company name displays
- Company logo displays below (if uploaded)
- Horizontal card layout

**Test:** Promo Card uses event template
**Steps:**
1. Upload Promo Card Template in Event Settings
2. Open speaker portal
3. View Promo Card preview

**Expected:**
- Event's template appears as background
- Headshot displays (60x60px, circular, white border)
- Name displays (white text, shadow for readability)
- Title displays
- Company displays
- Company logo displays at bottom (if uploaded)
- Square card layout (200x200px preview)
- If no template: gradient background (#4E5BA6 to #3D4A8F)

---

### 5. Embed Builder

**Test:** Configure and preview embed
**Steps:**
1. Go to Speakers > Embed Builder tab
2. Select "Speaker Grid"
3. View live preview

**Expected:**
- Preview shows grid of approved speakers only
- Each card shows headshot, name, title, company, logo
- Uses event's promo template as background
- Responsive grid layout

**Test:** Switch to Promo Cards
**Steps:**
1. Select "Promo Cards" from Embed Type dropdown
2. View live preview

**Expected:**
- Preview changes to promo card style
- Larger cards with background template
- Different layout than grid

**Test:** Copy embed code
**Steps:**
1. Configure embed settings
2. Click "Copy" button next to HTML Code
3. Click "Copy" button next to Direct URL

**Expected:**
- Toast notification: "Copied to clipboard!"
- Button shows checkmark briefly
- Code is valid iframe HTML

---

### 6. Public Embeds (End-to-End Test)

**Test:** Only approved speakers appear
**Steps:**
1. Create 3 speakers:
   - Speaker A: Has headshot, APPROVED
   - Speaker B: Has headshot, NOT approved
   - Speaker C: No headshot (cannot be approved)
2. Open embed URL in incognito window:
   `/event/{eventId}/speakers/embed`

**Expected:**
- Only Speaker A appears
- Speaker B and C are hidden
- No authentication required to view embed

**Test:** Promo template flows to embed
**Steps:**
1. Upload promo template in Event Settings
2. Approve a speaker
3. Open embed URL: `/event/{eventId}/speakers/embed`

**Expected:**
- Speaker cards use event's template as background
- Headshot overlaid on template
- Company logo visible
- Professional appearance

---

## Edge Cases & Error Handling

### No Headshot
- **Expected:** Cannot approve speaker
- **UI:** Button disabled with clear message

### No Company Logo
- **Expected:** Card displays without logo section
- **UI:** No broken images or layout issues

### No Promo Template
- **Expected:** Cards use gradient fallback
- **Fallback:** Linear gradient from Slate Blue to darker blue

### Long Names/Titles
- **Expected:** Text truncates gracefully
- **No overflow:** Text stays within card boundaries

### Image Upload Fails
- **Expected:** Toast error notification
- **UI:** Upload button re-enables, user can retry

### Approval Without Backend Support
- **Expected:** Frontend sends `website_card_approved` and `promo_card_approved` fields
- **Note:** If backend doesn't accept these fields yet, approval won't persist

---

## Known API Gaps

See `API_GAPS.md` for full details. Key items:

1. **Speaker approval fields** (`website_card_approved`, `promo_card_approved`)
   - Frontend sends these in PATCH requests
   - Backend must accept and store them
   - Default value should be `false`

2. **Promo card template** (`promo_card_template` on Event model)
   - Frontend expects this in GET /events/{id} response
   - Frontend sends this in Event Settings

3. **Speaker user accounts** (critical missing feature)
   - When speaker is added, no user account created
   - Speaker cannot log in to speaker dashboard
   - Requires backend implementation

---

## Success Criteria

All tests should pass with these results:

✅ Edit form matches dashboard layout exactly
✅ Image cropping works for headshot (square) and logo (16:9)
✅ Single approval button controls both cards
✅ Cannot approve without headshot
✅ Approval resets when headshot changes
✅ Speaker data flows to all card previews
✅ Event's promo template appears on all promo cards
✅ Embed builder shows live preview
✅ Public embeds show ONLY approved speakers
✅ No console errors during any operation

---

## Testing Checklist

Use this checklist when testing:

- [ ] Add speaker with all fields
- [ ] Edit speaker information
- [ ] Upload and crop headshot (square)
- [ ] Upload and crop company logo (16:9)
- [ ] Try to approve speaker without headshot (should fail)
- [ ] Approve speaker with headshot (should succeed)
- [ ] Upload new headshot (should reset approval)
- [ ] Re-approve speaker
- [ ] View Website Card preview (all data visible)
- [ ] View Promo Card preview (uses event template)
- [ ] Go to Embed Builder tab
- [ ] Switch between Grid and Promo views
- [ ] Copy HTML embed code
- [ ] Copy direct URL
- [ ] Open embed URL in incognito window
- [ ] Verify only approved speakers appear
- [ ] Verify promo template is used
- [ ] Test with no promo template (gradient fallback)
- [ ] Test speaker with no company logo (graceful fallback)

---

## Reporting Issues

If any test fails, note:

1. What you did (steps to reproduce)
2. What you expected
3. What actually happened
4. Browser console errors (if any)
5. Network tab errors (if any)

Common issues:
- **Approval doesn't persist:** Backend may not support approval fields yet
- **Promo template doesn't show:** Check Event Settings, ensure file uploaded
- **Images don't upload:** Check file size (<5MB), check network tab for upload errors
- **Embed shows no speakers:** Check that speakers are approved

---

## Next Steps

After testing, coordinate with backend:

1. Verify approval fields exist and work
2. Verify promo_card_template field exists
3. Implement speaker user account creation
4. Test full workflow end-to-end with real backend
