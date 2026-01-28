# Promo Card Builder - Phase 2 Refactor Plan

## Current Status
✅ **PHASE 2 COMPLETE** - All refactoring tasks finished and build passing.

## Changes Completed

### 1. Drop Zone Architecture ✅
- Headshot/Logo are now "drop zones" in config (position, size, shape, opacity)
- Test images moved to separate state (`testHeadshot`, `testLogo`) - NOT saved
- Placeholders show when no test image loaded
- Config no longer stores image URLs

### 2. Multi-Select Foundation ✅
- Added `selectedElements[]` state to track multiple selections
- Added `updateElements()` function for batch updates
- Canvas selection tracking updated for multi-select

### 3. Save/Load Updates ✅
- Save: Only saves config + template background (NOT test images)
- Load: Updated to not restore test images from localStorage
- Test images are preview-only and ephemeral

### 4. Remove Legacy headshotCropShape State ✅
- Removed `headshotCropShape` state declaration
- Shape now stored in `config.headshot.shape`
- Shape toggle UI updated to modify `config.headshot.shape`
- Removed from all useEffect dependencies

### 5. Replace Sliders with Number Inputs ✅
- All sliders replaced with `<Input type="number">`
- Font size, image size, opacity now use number inputs
- More precise control with +/- arrows
- Better for multi-select batch editing

### 6. Multi-Select Property Panel ✅
- Full property panel when `selectedElement === "multiple"`
- Batch edit for text elements (font size, weight, color)
- Batch edit for image elements (opacity)
- Multi-select tips panel with keyboard shortcuts
- Deselect button with Esc shortcut

### 7. Test Image UX ✅
- Clear messaging that test images are "preview only"
- Italic helper text explaining purpose
- Placeholder SVGs with clear labeling
- Test images properly separated from template config

## Implementation Order (Completed)

1. ✅ Drop zone architecture
2. ✅ Save configuration updates
3. ✅ Remove headshotCropShape legacy
4. ✅ Fix load configuration
5. ✅ Replace sliders with number inputs
6. ✅ Multi-select property editing
7. ✅ Polish test image UX

## Testing Checklist

Ready for user testing:

- [ ] Add headshot element → appears with placeholder SVG
- [ ] Upload test headshot → replaces placeholder
- [ ] Change headshot shape (circle/square/rectangle) → updates on canvas
- [ ] Save config → test images NOT saved (verify in localStorage)
- [ ] Reload page → placeholders show again (test images gone)
- [ ] Multi-select text elements (Shift+click) → shows "X Elements Selected" panel
- [ ] Batch edit font size → updates all selected elements
- [ ] Batch edit color → updates all selected text elements
- [ ] Multi-select with images → can batch edit opacity
- [ ] Drag element → selection stays active
- [ ] Number inputs → precise positioning works
- [ ] Undo/Redo (Ctrl+Z/Y) → works with all changes
- [ ] Alignment toolbar → aligns multiple selected elements
