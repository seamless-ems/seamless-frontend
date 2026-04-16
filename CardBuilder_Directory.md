# CardBuilder.tsx — Section Directory

**File:** `src/components/CardBuilder.tsx`
**Git fallback:** `ff4f3b6` (state as of 2026-04-16, before directory was created)
> To restore: `git checkout ff4f3b6 -- src/components/CardBuilder.tsx`

---

## AGENT INSTRUCTIONS — READ BEFORE TOUCHING CardBuilder.tsx

**Never use Glob or broad file searches to navigate this file.**
Use the anchors below. Workflow:
1. Find the relevant section in this directory.
2. `Grep` the anchor string in `src/components/CardBuilder.tsx` to land at the exact location.
3. `Read` only the lines you need.

This file is 3,400+ lines. Searching without anchors wastes tokens and credits.

## Maintenance rule
When you add a new section, rename a key function/const, or restructure the file, update this directory. Anchors must stay current — they are the navigation contract for all agents working on this file.

---

## 1. Imports

**External & UI**
Anchors: `import { useState`, `from "lucide-react"`, `import { HelpTip }`, `import { fabric }`

**Card builder helpers** (all `hb_*` prefixed wrappers)
Anchors: `from "@/lib/card-builder-helpers"`, `hb_handleSave`, `hb_handleReset`, `hb_applyPresetAndDismiss`

**Template data**
Anchors: `from "@/constants/websiteCardTemplates"`, `from "@/constants/promoCardTemplates"`, `SQUARE_PRESETS_DATA`, `INSTAGRAM_FEED_PRESETS`

**Utilities & types**
Anchors: `from "@/lib/card-builder-utils"`, `from "@/lib/card-builder-renderer"`, `from "@/lib/card-builder-canvas"`, `from "@/lib/card-builder-templates"`, `ELEMENT_TEMPLATES`, `CardConfig`

---

## 2. Types & Component Signature

Anchors: `type CardType`, `interface CardBuilderProps`, `interface ElementConfig`, `export default function CardBuilder`

---

## 3. State Declarations

**Canvas & selection state**
Anchors: `const [config, setConfig]`, `const [selectedElement`, `const [zoom`, `const [canvasReady`, `const [history`, `const [historyIndex`

**Refs**
Anchors: `const canvasRef`, `const fabricCanvasRef`, `const skipRerenderRef`, `const renderGenRef`, `const historyIndexRef`, `const elementRefs`

**Canvas dimensions**
Anchors: `const [canvasWidth`, `const [canvasHeight`

**Test/preview images** (never saved to server)
Anchors: `const [testHeadshot`, `const [testLogo`, `const [testEventLogo`

**UI panels & dialogs**
Anchors: `const [layersPanelOpen`, `const [cropDialogOpen`, `const [shapePopupOpen`, `const [bgPanelOpen`, `const [textColorPanelOpen`, `const [eventLogoPanelOpen`, `const [contextMenu`

**Unsaved changes guard**
Anchors: `const [hasUnsavedChanges`, `useWarnOnLeave`, `const [showLeaveDialog`

**Background**
Anchors: `const [bgColor`, `const [bgIsGenerated`, `const [bgGradient`, `const [bgGradientStyle`

**Onboarding state — website**
Anchors: `const [showOnboarding`, `const [onboardingShowTemplates`, `const [onboardingQuickSetup`

**Onboarding state — promo**
Anchors: `const [onboardingBrandSetup`, `const [onboardingPlatformPicker`, `const [pendingPreset`

**Quick setup pickers** (colour, font, shape used in onboarding step 3)
Anchors: `const [quickBg`, `const [quickTextColor`, `const [quickFont`, `const [quickHeadshotShape`

**Font inject string** (precomputed for ShadowContainer)
Anchors: `const googleFamilies`, `const injectStylesString`

**Canvas tip & sidebar tip**
Anchors: `const canvasTipStorageKey`, `const [showCanvasTip`, `const tryShowCanvasTip`, `const [showSidebarTip`

**Sidebar resize**
Anchors: `const [sidebarWidth`, `const sidebarDragging`

**Missing form / logo dialogs**
Anchors: `const [missingFormDialogOpen`, `const [missingLogoDialogOpen`, `const skipLogoWarningRef`

---

## 4. Form Config Fetch

Fetches speaker-info form fields from the API. Drives which elements appear in the left sidebar.

Anchors: `useQuery`, `queryKey: ["formConfig"`, `const _fieldsArray`, `const cardBuilderFields`, `const shouldShowElement`

---

## 5. Template Preset Wiring

**`makeApply` factory** — wraps every template's `build()` function; handles headshot shape override and event logo preservation across template switches.
Anchors: `const makeApply`

**Website presets**
Anchors: `const SQUARE_PRESETS`, `const LANDSCAPE_PRESETS`, `const STARTER_PRESETS`
> Source data lives in `src/constants/websiteCardTemplates.ts`

**Promo presets**
Anchors: `const PROMO_INSTAGRAM_FEED_PRESETS`, `const PROMO_INSTAGRAM_STORY_PRESETS`, `const PROMO_LINKEDIN_PRESETS`
> Source data lives in `src/constants/promoCardTemplates.ts`

**Shape helper**
Anchors: `const presetsForShape`

---

## 6. Fabric Canvas Lifecycle (useEffects)

**Canvas init** — runs once on mount, polls until canvas element is present, calls `createFabricCanvas`.
Anchors: `// Initialize Fabric canvas ONCE`, `const tryCreate`, `createFabricCanvas`

**Dimension sync** — resizes canvas when `canvasWidth`/`canvasHeight` change without reinitialising.
Anchors: `// Resize canvas when dimensions change`, `canvas.setDimensions`

**Auto-fit** — scales to fill container when template is applied or config is loaded.
Anchors: `const autoFitDimsRef`, `// Auto-fit:`

---

## 7. Render Pipeline

Delegates heavy rendering to `renderAllElementsHelper` (in `card-builder-renderer.ts`).

Anchors: `const renderAllElements = useCallback`, `renderAllElementsHelper`, `onFontSizeResolved`

---

## 8. History & Undo/Redo Callbacks

Anchors: `const addToHistory = useCallback`, `const undo = useCallback`, `const redo = useCallback`, `const duplicateElement = useCallback`

---

## 9. Config Change → Canvas Re-render Effect

Triggers `renderAllElements` on every config/templateUrl change. Skips if `skipRerenderRef.current` is true (drag/nudge path).

Anchors: `// Re-render when config changes`, `waitForCanvasReady`, `skipRerenderRef.current`

---

## 10. Keyboard Shortcuts Effect

Handles undo/redo, duplicate, ESC deselect, Delete/Backspace remove, arrow key nudging.
Note: undo/redo are checked *before* the input guard (Fabric keeps a hidden textarea focused).

Anchors: `// Keyboard shortcuts for undo/redo`, `handleKeyDown`, `nudgeAmount`, `ArrowLeft`

---

## 11. Popup / Sidebar Effects

**Shape popup close-outside**
Anchors: `// Close shape popup when clicking outside`

**Sidebar resize drag**
Anchors: `// Sidebar resize drag handlers`, `sidebarDragging`

---

## 12. Save & Auto-save

**`handleSave`** — checks read-only, warns on missing event logo, delegates to `hb_handleSave`.
Anchors: `const handleSave = useCallback`, `hb_handleSave`, `skipLogoWarningRef`

**Auto-save effect** — 3s debounce after any unsaved change, calls `handleSave(true)` (silent).
Anchors: `// Auto-save: 3 seconds after any change`

---

## 13. Config Load from Server

Loads saved config on mount. Handles template URL, canvas dimensions, bgColor, bgGradient, and event logo localStorage restoration.

Anchors: `// Load saved config on mount`, `getPromoConfigForEvent`, `migrateLoadedConfig`, `KNOWN_ELEMENT_KEYS`, `savedTemplateUrl`

---

## 14. Element Operation Wrappers

Thin wrappers around `hb_*` helpers that inject local state/refs.

**Drag & drop**
Anchors: `const handleDragStart`, `const handleDragOver`, `const handleDrop`

**Add / toggle / update**
Anchors: `const addElementToCanvas`, `const toggleElement`, `const updateElement`

**Zoom**
Anchors: `const applyZoom`, `const handleZoomIn`, `const handleZoomOut`, `const handleZoomFit`, `const handleZoomReset`

**Alignment**
Anchors: `const alignSelection`

**Z-order**
Anchors: `const bringToFront`, `const sendToBack`, `const bringForward`, `const sendBackward`

**Lock / unlock**
Anchors: `const toggleLock`

**Headshot shape popup**
Anchors: `const addHeadshotShape`

**Layers panel**
Anchors: `const selectLayerItem`, `const layerMoveUp`, `const layerMoveDown`

**Image uploads**
Anchors: `const handleBackgroundUpload`, `const handleHeadshotUpload`, `const handleLogoUpload`, `const handleEventLogoUpload`, `const handleCropComplete`
> Event logo data URL is also persisted to localStorage via `eventLogoStorageKey` inside `handleCropComplete`.

**Export & reset**
Anchors: `const handleExport`, `const handleReset`

**Gradient**
Anchors: `const applyGradientStyle`, `const clearGradient`

**Onboarding dismiss**
Anchors: `const dismissOnboarding`

**Field label helper**
Anchors: `const getFieldLabel`

**Preset apply + dismiss**
Anchors: `const applyPresetAndDismiss`

---

## 15. JSX — Dialogs & Crop (before main layout)

Anchors: `<UnsavedChangesDialog`, `<MissingFormDialog`, `Dialog open={missingLogoDialogOpen}`, `<ImageCropDialog`

---

## 16. JSX — Onboarding Modal

Triggered by `showOnboarding`. Shared wrapper; inner steps swap via boolean flags.

**Website Step 1** — Use template vs blank canvas choice
Anchors: `{/* Step 1: Welcome / choice */}`, `!onboardingShowTemplates && !onboardingQuickSetup`

**Website Step 2** — Template picker (all templates in one grid, shape label above each)
Anchors: `{/* Step 2: All templates */}`, `onboardingShowTemplates && !onboardingQuickSetup`, `<TemplateThumbnail`

**Website Step 3** — Quick Setup (bg, text colour, font, gradient, headshot shape)
Anchors: `{/* Step 4: Quick Setup */}`, `onboardingQuickSetup && pendingPreset`, `Apply & Start Designing`

**Promo Step 2** — Brand setup (brand colour, text colour)
Anchors: `{/* ── PROMO Step 2: Brand setup */}`, `isPromo && onboardingBrandSetup && !onboardingPlatformPicker`

**Promo Step 3** — Platform picker (Instagram Feed / Story / LinkedIn)
Anchors: `{/* ── PROMO Step 3: Platform picker */}`, `isPromo && onboardingPlatformPicker`

---

## 17. JSX — Main Layout

Outer wrapper: `<div className="h-full w-full flex flex-col bg-background">`

**Toolbar Row 1** — Branding, card type toggle, layers panel, undo/redo, zoom, export, save, HelpTip
Anchors: `{/* Row 1: Branding + navigation + global actions */}`, `{/* Layers panel */}`, layersPanelOpen JSX, `<Button onClick={() => handleSave()}`, `<HelpTip title="Speaker Card Template"`

**Toolbar Row 2** — Templates · Background · Event Logo · Text Colour · + Text Box · + Overlay
Anchors: `{/* Row 2: Canvas controls */}`, `{/* Background */}`, `{/* Event Logo */}`, `{/* Text Colour */}`, `{/* + Text Box */}`, `{/* + Overlay */}`
> Background and Event Logo are grouped (no separator). Text Colour and + Text Box are grouped. + Overlay is last.
> Background panel: solid colour swatches + gradient buttons.
> Text Colour panel: updates all text element colours in one action.

**Toolbar Row 3** — Formatting bar (alignment, X/Y position, font, bold/italic/underline, text colour, line height, letter spacing, opacity)
Anchors: `{/* Row 3: Formatting bar */}`, `const isSingleText`, `const applyUpdate`, `<FontSizeInput`

---

## 18. JSX — Left Sidebar (Elements Panel)

Draggable element buttons; active state highlighted.

**Core elements** (conditional on form config)
Anchors: `{/* Starter Templates */}` (template relaunch button), `shouldShowElement("headshot")`, `shouldShowElement("firstName")`, `shouldShowElement("lastName")`, `shouldShowElement("title")`, `shouldShowElement("company")`, `shouldShowElement("companyLogo")`

**Headshot shape popup** (fixed-position, data-popover)
Anchors: `{/* Shape selector popup */}`, `shapePopupOpen && (`

**Dynamic custom fields**
Anchors: `{/* Dynamic fields from form builder */}`, `cardBuilderFields.map`

**Sidebar tip** (first-run only, website mode)
Anchors: `{showSidebarTip && cardType === "website"`, `{/* First-run getting started tip */}`

---

## 19. JSX — Canvas Area (Centre)

Anchors: `{/* Center - Canvas */}`, `ref={canvasContainerRef}`, `onDragOver={handleDragOver}`, `onDrop={handleDrop}`

**Post-template canvas tip modal** (dismissible, "Don't show again" checkbox)
Anchors: `{showCanvasTip && (`, `{/* Post-template tip modal */}`

**Empty state overlay** (shown when config is empty and no background)
Anchors: `{/* Empty state overlay */}`, `Object.keys(config).length === 0 && !templateUrl`

**Fabric canvas host**
Anchors: `<ShadowContainer`, `<canvas ref={canvasRef}`

---

## 20. JSX — Right Sidebar (Preview Panel)

Test image uploads — headshot and company logo. Never saved to server.

Anchors: `{/* Right Sidebar - Preview */}`, `{/* Headshot */}`, `{/* Logo */}`, `ref={headshotInputRef}`, `ref={logoInputRef}`, `ref={eventLogoInputRef}`

---

## 21. JSX — Right-click Context Menu

Appears on canvas element right-click. Contains text formatting shortcuts, upload shortcuts (headshot/logo), arrange (z-order, duplicate), visibility/lock toggle, and delete.

Anchors: `{/* Right-click context menu */}`, `contextMenu &&`, `{/* Text style shortcuts */}`, `{/* Upload shortcuts */}`, `{/* Arrange */}`, `{/* Visibility & lock */}`, `{/* Delete */}`
