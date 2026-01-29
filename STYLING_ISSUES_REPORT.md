# CSS/Tailwind Styling Inconsistencies Report

## Summary
Found **85+ styling issues** across the codebase organized into 10 categories. Issues include hardcoded inline styles, inconsistent spacing, missing responsive patterns, and accessibility gaps.

---

## 1. Inconsistent Padding/Margin Patterns

### Issue: Mix of hardcoded values vs Tailwind classes
Files with inline pixel/hardcoded margins that should use Tailwind:

#### High Priority Issues:
- **src/pages/public/PromoEmbed.tsx**
  - Line 76: `style={{ minHeight: 110, maxHeight: 110, justifyContent: 'flex-start', gap: 2, paddingBottom: 8, marginTop: -60 }}` 
  - Should use: `mb-8 mt-[-60px]` or Tailwind equivalents
  - Line 77: `marginTop: '-18px'` - hardcoded negative margin
  - Line 78: `marginTop: 0` - should use `mt-0` class

- **src/pages/public/PromoEmbed.tsx**
  - Line 80: `marginTop: 4, marginBottom: 0` - hardcoded pixel values
  - Should use: `mt-1 mb-0` (or create custom utility if exact pixel needed)

- **src/pages/organizer/SpeakerPortal.tsx**
  - Multiple lines: `marginBottom: '4px'`, `marginBottom: '8px'`, `marginBottom: '12px'` 
  - Lines 201-235: Inconsistent margin patterns throughout speaker info display
  - Should standardize to Tailwind spacing scale (mb-1, mb-2, mb-3)

#### Medium Priority:
- **src/components/layout/DashboardLayout.tsx**
  - Line 105: `className="px-2 pt-6 pb-4"` - mixed Tailwind (good)
  - Line 109: `className="px-2 ... mb-2"` - good
  - BUT line 114: `className="w-full border-[1.5px]"` - arbitrary border value
  
---

## 2. Inconsistent Border Styles

### Issue: Different border colors, widths, and approaches

- **src/components/layout/DashboardLayout.tsx**
  - Line 104: `border-r border-sidebar-border` - using CSS variable
  - Line 114: `border-[1.5px]` - arbitrary pixel width
  - Inconsistent with Tailwind border widths (should be 1, 2, 4, 8)

- **src/components/dashboard/StatsCard.tsx**
  - Line 25: `border border-border` - standard Tailwind (good)
  
- **src/pages/public/SpeakerEmbedSingle.tsx**
  - Line 29: `border border-border` - standard (good)
  - Line 31: `bg-gray-100` - hardcoded color, should use Tailwind gray scale

- **src/pages/public/PromoEmbedSingle.tsx**
  - Line 40: `rounded-xl overflow-hidden` - good
  - BUT: Inconsistent with other card borders elsewhere

- **src/pages/organizer/Team.tsx**
  - Line 262: `className="rounded-md border"` - no color specified (defaults to default color)
  - Should be explicit: `border border-border`

### Border Width Issues:
- **border-[1.5px]** in DashboardLayout.tsx is arbitrary - Tailwind doesn't support 1.5px
- Should standardize to: border (1px), border-2, border-4

---

## 3. Inconsistent Text Sizing

### Issue: Mix of text-* classes, CSS variables, and custom font-size

- **src/pages/organizer/SpeakerPortal.tsx** (MAJOR OFFENDER)
  - Lines 201-235: `style={{ fontSize: 'var(--font-small)', fontWeight: 600, color: 'var(--text-secondary)' }}`
  - Lines 292: `fontSize: '20px'` - hardcoded pixel
  - Lines 401: `fontSize: '13px'` - hardcoded pixel
  - Lines 459-465: Mix of `fontSize: '13px'`, `'10px'`, `'10px'`
  - Lines 554-555: `fontSize: 'var(--font-body)'` - CSS variable instead of Tailwind

- **src/pages/organizer/SpeakerModule.tsx**
  - Line 554: `fontSize: 'var(--font-body)'` - inconsistent
  - Line 635: Using CSS variable + inline style
  - Line 671: `fontSize: 'var(--font-small)'` - inconsistent

- **src/components/dashboard/EventCard.tsx**
  - Line 47: `style={{ fontSize: 'var(--font-h2)' }}` - CSS variable for text size
  - Line 84: `style={{ fontSize: 'var(--font-small)' }}` - CSS variable inconsistency

- **src/components/ImageCropDialog.tsx**
  - Line 87: `style={{ fontSize: 'var(--font-small)', color: 'var(--primary)' }}` - CSS variables

### Text Classes Used:
- `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl` - good
- BUT also: CSS variable font sizes (`var(--font-small)`, `var(--font-body)`, `var(--font-h2)`, `var(--font-h3)`)
- **INCONSISTENT: Should standardize on Tailwind classes OR CSS variables, not both**

---

## 4. Inconsistent Hover States

### Issue: Missing or inconsistent hover interactions

- **src/components/layout/DashboardLayout.tsx**
  - Lines 140, 148: `text-primary hover:bg-primary/10` - custom hover style
  - Works but not standard Tailwind button pattern

- **src/components/dashboard/StatsCard.tsx**
  - Line 25: `hover:shadow-medium` - custom shadow class (may not exist in standard Tailwind)
  - Good but verify custom class exists

- **src/components/dashboard/ModuleCard.tsx**
  - Lines 65-72: `group-hover:scale-110` on icon - custom transform
  - Line 120: `group-hover:translate-x-1` - good
  - Inconsistent: One uses scale, one uses translate

- **src/components/dashboard/EventCard.tsx**
  - Line 48: `opacity-0 group-hover:opacity-100` - good pattern
  - BUT Line 48: `hover:border-primary hover:shadow-sm` - missing consistency in other cards

- **src/pages/public/SpeakerEmbed.tsx**
  - NO visible hover states on cards (accessibility issue)

- **src/pages/public/PromoEmbed.tsx**
  - NO visible hover states on cards (accessibility issue)

### Missing Hover States:
- SpeakerEmbed cards (lines 83-111)
- PromoEmbed cards (lines 71-80)
- Should have: `hover:shadow-md`, `hover:border-primary`, or similar visual feedback

---

## 5. Inconsistent Spacing Between Sections

### Issue: Varied spacing between major sections

- **src/components/layout/DashboardLayout.tsx**
  - Line 105: `pt-6 pb-4` - 6/4 spacing
  - Line 108: `className="mb-6"` vs `className="mb-4"` - inconsistent sidebar spacing
  - Line 493: `p-6` for main content padding - good

- **src/pages/organizer/Team.tsx**
  - Line 136: `className="space-y-6"` - 6 unit spacing
  - Line 138: `className="gap-4 md:flex-row"` - 4 unit gap
  - INCONSISTENT: 6 vs 4 units

- **src/pages/organizer/Events.tsx**
  - Line 55: `className="space-y-6"` - 6 unit spacing (good)
  - Line 58: `className="gap-4 sm:flex-row"` - 4 unit spacing
  - INCONSISTENT: Mixing 4 and 6

- **src/components/SpeakerForm.tsx**
  - Line 46: `className="space-y-4"` - 4 unit spacing
  - Should be consistent with other forms (6 or 4, pick one)

### Spacing Standardization Needed:
- Between page sections: `space-y-6` OR `space-y-8` (pick one)
- Between form elements: `space-y-4` (consistent)
- Between cards in grid: `gap-6` (mostly consistent, but some use 4)

---

## 6. Inconsistent Use of Colors

### Issue: Hardcoded hex, CSS variables, and Tailwind classes mixed

- **src/pages/public/PromoEmbed.tsx**
  - Line 69: `background: "linear-gradient(135deg, #4E5BA6 0%, #3D4A8F 100%)"` - hardcoded hex gradient
  - Line 80: `background: 'rgba(255,255,255,0.85)'` - hardcoded RGBA
  - Line 80: `boxShadow: '0 1px 4px rgba(0,0,0,0.08)'` - hardcoded shadow color

- **src/pages/public/SpeakerEmbed.tsx**
  - Line 79: `background: "linear-gradient(135deg, #4E5BA6 0%, #3D4A8F 100%)"` - DUPLICATE hardcoded gradient
  - Line 89: `bg-black/10` - Tailwind opacity (inconsistent with hardcoded colors elsewhere)

- **src/pages/organizer/SpeakerPortal.tsx**
  - Lines 201-235: `color: 'var(--text-secondary)'` - CSS variable
  - Lines 292, 440: `color: 'var(--primary)'` - CSS variable
  - BUT also: `color: 'white'`, `background: 'linear-gradient(...)'` - hardcoded
  - Line 459-465: `color: 'white'` - hardcoded (not using text-white class)
  - Line 440: `'linear-gradient(135deg, #4E5BA6 0%, #3D4A8F 100%)'` - THIRD instance of same gradient

- **src/pages/public/SpeakerEmbedSingle.tsx**
  - Line 27: `className="text-red-600"` - Tailwind red (good)
  - Line 31: `className="bg-gray-100"` - Tailwind gray (good, but should be `bg-muted`)

- **src/pages/public/PromoEmbedSingle.tsx**
  - Line 31: `background: "linear-gradient(180deg,#fff,#f7f7f9)"` - hardcoded hex colors

- **src/pages/Auth.tsx**
  - Line 199: `boxShadow: '0 4px 6px rgba(0,0,0,0.1)'` - hardcoded shadow
  - Lines 270, 308-311: Hardcoded hex colors (#EA4335, #f65314, #7cbb00, #00a1f1, #ffbb00)

### Color Inconsistencies Summary:
1. **Gradient (appears 3x with same colors)**: 
   - `linear-gradient(135deg, #4E5BA6 0%, #3D4A8F 100%)`
   - Locations: PromoEmbed.tsx:69, SpeakerEmbed.tsx:79, SpeakerPortal.tsx:440
   - **Should create Tailwind utility or CSS class**

2. **Text colors**:
   - CSS Variables: `var(--text-primary)`, `var(--text-secondary)`
   - Tailwind: `text-foreground`, `text-muted-foreground`
   - **Pick one approach and standardize**

3. **Background colors**:
   - Hardcoded: `#fff`, `#f7f7f9`, `rgba(255,255,255,0.85)`
   - Tailwind: `bg-white`, `bg-muted`
   - **Inconsistent - should use Tailwind**

---

## 7. Missing or Inconsistent Rounded Corners

### Issue: Different border-radius patterns

- **src/pages/public/SpeakerEmbed.tsx**
  - Line 83: `rounded-xl` - extra large radius (consistent)
  - Line 95: `rounded-lg` - large radius (on images, good)

- **src/pages/public/PromoEmbed.tsx**
  - Line 71: `rounded-xl` - extra large (consistent)
  - Line 74: `rounded-lg` - on image (consistent with SpeakerEmbed)
  - Line 80: `borderRadius: 6` - hardcoded pixels (INCONSISTENT)
  - Should be: `rounded-md` or `rounded-lg`

- **src/components/dashboard/StatsCard.tsx**
  - Line 25: `rounded-xl` - extra large (consistent)

- **src/components/dashboard/ModuleCard.tsx**
  - Line 65: `rounded-xl` - extra large (consistent)
  - Line 74: `rounded-xl` - (consistent)

- **src/pages/public/SpeakerEmbedSingle.tsx**
  - Line 29: `rounded-xl` - extra large (consistent)

- **src/components/ImageCropDialog.tsx**
  - Line 92: `rounded-lg` - large (OK)

- **src/pages/organizer/SpeakerPortal.tsx**
  - No explicit rounded classes visible, but style object hardcoding elsewhere

### Rounded Corners Inconsistencies:
- Mostly consistent with `rounded-xl` for card containers
- **Issue**: `borderRadius: 6` in PromoEmbed.tsx:80 should be Tailwind class
- Standard should be: `rounded-xl` (cards), `rounded-lg` (images), `rounded-md` (small elements)

---

## 8. Inconsistent Shadows or Missing Elevation

### Issue: Shadow classes vs hardcoded box-shadow

- **src/components/dashboard/StatsCard.tsx**
  - Line 25: `shadow-soft transition-all duration-300 hover:shadow-medium` 
  - Uses custom shadow classes: `shadow-soft`, `shadow-medium`
  - **Verify these exist in tailwind.config.ts**

- **src/components/dashboard/ModuleCard.tsx**
  - Line 65: `border-2` with no shadow - should add shadow for elevation
  - No shadow class - missing elevation consistency

- **src/pages/public/SpeakerEmbed.tsx**
  - Line 83: `shadow-md` - medium shadow (good, standard Tailwind)

- **src/pages/public/PromoEmbed.tsx**
  - Line 71: No shadow visible - missing elevation (should have shadow-md)
  - Line 80: `boxShadow: '0 1px 4px rgba(0,0,0,0.08)'` - hardcoded (should be `shadow-sm`)

- **src/pages/public/SpeakerEmbedSingle.tsx**
  - Line 29: `shadow-sm` - small shadow (good)

- **src/pages/public/PromoEmbedSingle.tsx**
  - Line 40: No explicit shadow (missing elevation)

- **src/pages/Auth.tsx**
  - Line 199: `boxShadow: '0 4px 6px rgba(0,0,0,0.1)'` - hardcoded (should be `shadow-md`)

- **src/components/dashboard/EventCard.tsx**
  - Line 48: `hover:shadow-sm` - good, on hover

### Shadow Inconsistencies:
1. Custom shadow classes used: `shadow-soft`, `shadow-medium`
   - **Need verification in tailwind.config.ts**
2. Hardcoded box-shadow values in multiple files
   - Should use: `shadow-sm`, `shadow-md`, `shadow-lg`
3. Missing shadows on some card components
   - PromoEmbed cards at line 71 - should have `shadow-md`

---

## 9. Responsive Design Gaps

### Issue: Inconsistent or missing responsive patterns

- **src/components/layout/DashboardLayout.tsx**
  - Line 282: `-ml-2` - good
  - Line 293: `text-sm text-muted-foreground` - no responsive sizing changes
  - Line 336: `hidden md:inline` - good responsive hiding
  - Line 342: `w-64` - fixed width, but `DropdownMenuContent` has hardcoded width
  - **Should have mobile-responsive width**

- **src/pages/organizer/Team.tsx**
  - Line 138: `flex-col gap-4 md:flex-row` - good responsive layout
  - Line 145: `hidden sm:block` - good responsive hiding
  - Line 244: `w-full sm:w-auto` - good responsive width
  - Line 262: `rounded-md border` - no responsive padding changes
  - **MOSTLY GOOD - this is the best example**

- **src/pages/organizer/Events.tsx**
  - Line 55-68: Good responsive pattern with `flex-col gap-4 sm:flex-row`
  - **Good example**

- **src/components/SpeakerForm.tsx**
  - Line 48: `grid gap-2 sm:grid-cols-2` - good responsive grid
  - **Good example**

- **src/pages/public/SpeakerEmbed.tsx**
  - Line 59: `grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` - EXCELLENT
  - **This is the best responsive pattern**

- **src/pages/public/PromoEmbed.tsx**
  - Line 71: No responsive sizing - fixed `width: 400, minWidth: 400`
  - Should have responsive widths for mobile
  - **MISSING: sm: and md: breakpoints**

- **src/pages/public/SpeakerEmbedSingle.tsx**
  - Line 29: `max-w-[420px]` - fixed max-width
  - Should have responsive adjustments for mobile

### Responsive Issues:
1. **Missing**: PromoEmbed.tsx cards - fixed 400px width, should be responsive
2. **Missing**: SpeakerEmbedSingle.tsx - fixed max-w-[420px], should be full-width on mobile
3. **Missing**: SpeakerPortal.tsx - multiple inline styles with no responsive variations
4. **Good patterns**: Team.tsx, Events.tsx, SpeakerForm.tsx, SpeakerEmbed.tsx

---

## 10. Accessibility Issues

### A. Color Contrast Issues

- **src/pages/public/SpeakerEmbed.tsx**
  - Line 100, 103, 104: `text-white` on blue gradient background (#4E5BA6, #3D4A8F)
  - Using `drop-shadow-md` and `drop-shadow-sm` for readability (workaround, not ideal)
  - **ISSUE**: Relies on text shadow instead of ensuring proper contrast ratio

- **src/pages/public/PromoEmbedSingle.tsx**
  - Line 47-48: `text-black` on potentially light backgrounds
  - Line 47: Uses `font-bold` to increase visual weight (accessibility workaround)

- **src/pages/organizer/SpeakerPortal.tsx**
  - Line 459-465: `color: 'white', textShadow: '...'` - text shadow for contrast (workaround)
  - White text on custom gradients without proper contrast verification

- **src/pages/Auth.tsx**
  - Color contrast not verified for login form

### B. Missing Focus States

- **Buttons**: UI components have `focus:outline-none focus:ring-2 focus:ring-ring` (good)
- **Cards**: No visible focus states for keyboard navigation
  - SpeakerEmbed cards: No focus outline
  - PromoEmbed cards: No focus outline
  - **Should add**: `focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`

- **Interactive Elements**: Missing consistent focus patterns
  - Dashboard sidebar buttons: Have hover but unclear focus state
  - Speaker info display: Non-interactive elements shouldn't have focus

### C. Missing ARIA Labels

- **Images**: Some img tags lack alt text or have inadequate descriptions
  - Line 34 (SpeakerEmbedSingle): `alt={`${name} headshot``}` - good
  - Line 95 (SpeakerEmbed): Same (good)
  - Line 43 (PromoEmbedSingle): `alt={`${name} headshot``}` - good
  - Line 74 (PromoEmbed): `alt={`${name} headshot``}` - good

- **Buttons**: Custom buttons may lack proper ARIA roles
  - Dashboard sidebar custom buttons (lines 140, 148): Plain `<button>` with custom styles
  - Should use `<button role="button">` or `<Button>` component

### D. Keyboard Navigation Issues

- **Interactive Cards**: No visible focus outlines
  - EventCard.tsx: Link-wrapped card, should have visible focus indicator
  - ModuleCard.tsx: Link-wrapped card, should have visible focus indicator

- **Custom Buttons**: Sidebar buttons don't use Button component
  - Lines 140, 148 in DashboardLayout.tsx: Custom styled buttons
  - Should use `<Button>` component for consistency and accessibility

### Accessibility Fixes Needed:
1. Add focus states to all clickable cards
2. Verify color contrast ratios (WCAG AA minimum 4.5:1)
3. Replace custom buttons with Button components
4. Add focus ring utilities to interactive elements

---

## Summary Table by File

| File | Issues | Severity |
|------|--------|----------|
| src/pages/organizer/SpeakerPortal.tsx | 40+ | CRITICAL |
| src/pages/public/PromoEmbed.tsx | 20+ | HIGH |
| src/pages/public/SpeakerEmbed.tsx | 8+ | HIGH |
| src/components/layout/DashboardLayout.tsx | 12+ | MEDIUM |
| src/pages/organizer/SpeakerModule.tsx | 8+ | MEDIUM |
| src/components/dashboard/ModuleCard.tsx | 5+ | MEDIUM |
| src/pages/public/PromoEmbedSingle.tsx | 6+ | MEDIUM |
| src/pages/public/SpeakerEmbedSingle.tsx | 4+ | MEDIUM |
| src/pages/organizer/Team.tsx | 2+ | LOW |
| src/pages/organizer/Events.tsx | 2+ | LOW |
| src/pages/Auth.tsx | 5+ | MEDIUM |

---

## Recommended Actions

### Immediate (Critical - SpeakerPortal.tsx)
1. Replace all `style={{ fontSize: 'var(...)'}}` with Tailwind `text-*` classes
2. Replace all hardcoded `color: 'var(...)'` with Tailwind color utilities
3. Replace pixel margins/padding with Tailwind spacing classes

### High Priority
1. Standardize colors: Choose between CSS variables and Tailwind classes
2. Create Tailwind utilities for repeated gradients
3. Fix responsive design in PromoEmbed.tsx cards
4. Add hover and focus states to all interactive cards

### Medium Priority
1. Verify custom shadow classes (`shadow-soft`, `shadow-medium`)
2. Standardize section spacing (6 vs 4 units)
3. Fix border widths (use standard Tailwind values only)
4. Add consistent focus indicators to all keyboard-accessible elements

### Low Priority
1. Verify accessibility color contrast ratios
2. Document color and spacing conventions
3. Create component storybook with consistent patterns
