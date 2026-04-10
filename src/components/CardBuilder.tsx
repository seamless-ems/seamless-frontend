import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useWarnOnLeave } from "@/hooks/useWarnOnLeave";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Save,
  Upload,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Users,
  Type,
  Briefcase,
  ImageIcon,
  Globe,
  Layers,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ChevronLeft,
  RotateCcw,
  AlignLeft,
  AlignRight,
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignEndVertical,
  Square,
  Bold,
  Italic,
  Underline,
  Lock,
  Unlock,
  Copy,
  AlertTriangle,
  ChevronsUp,
  ChevronsDown,
  ChevronUp as BringForward,
  ChevronDown as SendBackward,
} from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { fabric } from "fabric";
import {
  deriveInitialCardType,
  getPresetsForShape,
  handleDragStart as hb_handleDragStart,
  handleDragOver as hb_handleDragOver,
  handleDrop as hb_handleDrop,
  toggleElement as hb_toggleElement,
  addElementToCanvas as hb_addElementToCanvas,
  updateElement as hb_updateElement,
  addToHistory as hb_addToHistory,
  undo as hb_undo,
  redo as hb_redo,
  applyZoom as hb_applyZoom,
  handleZoomFit as hb_handleZoomFit,
  alignSelection as hb_alignSelection,
  duplicateElement as hb_duplicateElement,
  bringToFront as hb_bringToFront,
  sendToBack as hb_sendToBack,
  bringForward as hb_bringForward,
  sendBackward as hb_sendBackward,
  toggleLock as hb_toggleLock,
  addHeadshotShape as hb_addHeadshotShape,
  selectLayerItem as hb_selectLayerItem,
  layerMoveUp as hb_layerMoveUp,
  layerMoveDown as hb_layerMoveDown,
  handleBackgroundUpload as hb_handleBackgroundUpload,
  handleHeadshotUpload as hb_handleHeadshotUpload,
  handleLogoUpload as hb_handleLogoUpload,
  handleEventLogoUpload as hb_handleEventLogoUpload,
  handleCropComplete as hb_handleCropComplete,
  handleSave as hb_handleSave,
  handleExport as hb_handleExport,
  handleReset as hb_handleReset,
  handleZoomReset as hb_handleZoomReset,
  applyGradientStyle as hb_applyGradientStyle,
  clearGradient as hb_clearGradient,
  dismissOnboarding as hb_dismissOnboarding,
  applyPresetAndDismiss as hb_applyPresetAndDismiss,
  
} from "@/lib/card-builder-helpers";
import {
  SQUARE_PRESETS_DATA,
  LANDSCAPE_PRESETS_DATA,
  STARTER_PRESETS_DATA,
} from "@/constants/websiteCardTemplates";
import {
  INSTAGRAM_FEED_PRESETS,
  INSTAGRAM_STORY_PRESETS,
  LINKEDIN_PRESETS,
} from "@/constants/promoCardTemplates";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import ShadowContainer from "@/components/ShadowContainer";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import MissingFormDialog from "@/components/MissingFormDialog";
import {
  API_BASE,
  getFormConfigForEvent,
  getPromoConfigForEvent,
  createPromoConfig,
  uploadFile,
} from "@/lib/api";
import type { FormFieldConfig } from "@/components/SpeakerFormBuilder";
import {
  HexColorInput,
  FontSizeInput,
  PositionInput,
  QuickColorPicker,
  TemplateThumbnail,
} from "@/lib/card-builder";
import {
  hexToRgba,
  hexToHsl,
  hslToHex,
  deriveGradient,
  escapeHTML,
  getFieldIcon,
  createDynamicElementTemplate,
  shouldShowElementFromFields,
  loadImagePromise,
  getAbsoluteUrl,
  presetMetasFromData,
  createSnapLine as createSnapLineUtil,
  clearLines,
  computeSnapMatches,
  clampRectToCanvas,
  SIDEBAR_ELEM_BTN,
  CTX_MENU_BTN,
  TOOLBAR_ICON_BTN,
  CardConfig,
  DEFAULT_FIELD_IDS,
  NAME_TITLE_FIELDS,
  CORE_TEXT_FIELDS,
  GRADIENT_DIRECTIONS,
  GRADIENT_STYLES,
  FONT_FAMILIES,
  SWATCH_PRESET_SMALL,
  SWATCH_SOLID,
  getGradientCoords,
  migrateLoadedConfig,
  getCanvasRelativePos,
  FIXED_KEYS,
  AlignDirection,
  isLightColor,
} from "@/lib/card-builder-utils";
import { renderAllElements as renderAllElementsHelper } from "@/lib/card-builder-renderer";
import { createFabricCanvas } from "@/lib/card-builder-canvas";
import { ELEMENT_TEMPLATES } from "@/lib/card-builder-templates";
import { StarterPreset } from "@/types/card-builder";

type CardType = "promo" | "website";

interface CardBuilderProps {
  eventId?: string;
  fullscreen?: boolean;
  onBack?: () => void;
}

interface ElementConfig {
  [key: string]: unknown;
}

export default function CardBuilder({
  eventId,
  fullscreen = false,
  onBack,
}: CardBuilderProps) {
  const location = useLocation();
  const [cardType, setCardType] = useState<CardType>(() =>
    deriveInitialCardType(location?.pathname),
  );
  const isPromo = cardType === "promo";
  const [config, setConfig] = useState<CardConfig>({});
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [multiSelectActive, setMultiSelectActive] = useState(false);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  // Incremented each time a Fabric canvas becomes ready — used to re-trigger the
  // render effect after a canvas re-init completes (refs don't trigger effects).
  const [canvasReady, setCanvasReady] = useState(0);
  const [history, setHistory] = useState<CardConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropMode, setCropMode] = useState<
    "headshot" | "logo" | "event-logo" | "template" | null
  >(null);
  const [cropImageUrl, setCropImageUrl] = useState("");

  const [shapePopupOpen, setShapePopupOpen] = useState(false);
  const [shapePopupPosition, setShapePopupPosition] = useState({ x: 0, y: 0 });

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const eventLogoInputRef = useRef<HTMLInputElement>(null);
  const elementRefs = useRef<{ [key: string]: fabric.Object }>({});
  // Skip full canvas rebuild when only position/size changed via Fabric drag (avoids flicker)
  const skipRerenderRef = useRef(false);
  // Incremented on every render trigger — stale async renders bail out when their gen doesn't match
  const renderGenRef = useRef(0);
  // Ref mirror of historyIndex — always current, avoids stale closure in addToHistory
  const historyIndexRef = useRef(-1);

  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(600);

  // Test images — preview only, never saved to server
  const [testHeadshot, setTestHeadshot] = useState<string | null>(null);
  const [testLogo, setTestLogo] = useState<string | null>(null);
  const [testEventLogo, setTestEventLogo] = useState<string | null>(null);

  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  useWarnOnLeave(hasUnsavedChanges);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  // Multi-selection tracking — for applying formatting to all selected text elements at once
  const [multiSelectedKeys, setMultiSelectedKeys] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementKey: string;
  } | null>(null);
  const [bgColor, setBgColor] = useState<string>("#ffffff");

  const [bgIsGenerated, setBgIsGenerated] = useState(false);
  const [bgPanelOpen, setBgPanelOpen] = useState(false);
  const [eventLogoPanelOpen, setEventLogoPanelOpen] = useState(false);

  // Onboarding — controlled by API or default off (no localStorage)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingShowShapePicker, setOnboardingShowShapePicker] =
    useState(false);
  const [onboardingShowTemplates, setOnboardingShowTemplates] = useState(false);
  const [onboardingQuickSetup, setOnboardingQuickSetup] = useState(false);

  // Promo-specific onboarding steps (separate from website shape/template flow)
  const [onboardingBrandSetup, setOnboardingBrandSetup] = useState(false);
  const [onboardingPlatformPicker, setOnboardingPlatformPicker] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<StarterPreset | null>(
    null,
  );
  const [quickBg, setQuickBg] = useState("#ffffff");
  const [quickTextColor, setQuickTextColor] = useState("#111827");
  const [quickFont, setQuickFont] = useState("Montserrat");
  const [quickShape, setQuickShape] = useState<"square" | "landscape">("square");
  const [quickHeadshotShape, setQuickHeadshotShape] = useState("circle");
  const [bgGradient, setBgGradient] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [bgGradientStyle, setBgGradientStyle] = useState<
    "dark" | "tonal" | "soft" | null
  >(null);

  // Precompute fonts and injectStyles for ShadowContainer to avoid large inline strings
  const _fonts = FONT_FAMILIES || [];
  const googleFamilies = _fonts
    .map((f) => `family=${f.replace(/\s+/g, "+")}:wght@300;400;500;600;700;800`)
    .join("&");
  const fontFamilyList = _fonts
    .map((f) => (f.includes(" ") ? `'${f}'` : f))
    .join(", ");
  const injectStylesString = `@import url('https://fonts.googleapis.com/css2?${googleFamilies}&display=swap'); :host{all:initial;display:block;font-family:${fontFamilyList}, sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;} *{box-sizing:border-box;} canvas{display:block;} .card-root{background-color:#f5f5f5;}`;
  const canvasTipStorageKey = `seamless-canvas-tip-dismissed-${cardType}`;
  const canvasTipDismissedRef = useRef(() => {
    try { return localStorage.getItem(`seamless-canvas-tip-dismissed-${cardType}`) === 'true'; } catch { return false; }
  });
  const [showCanvasTip, setShowCanvasTip] = useState(false);
  const [canvasTipDontShow, setCanvasTipDontShow] = useState(false);
  // Helper: only show if user hasn't permanently dismissed it
  const tryShowCanvasTip = () => {
    try { if (localStorage.getItem(canvasTipStorageKey) === 'true') return; } catch {}
    setShowCanvasTip(true);
  };
  const [showSidebarTip, setShowSidebarTip] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(144);
  const sidebarDragging = useRef(false);
  const sidebarDragStartX = useRef(0);
  const sidebarDragStartW = useRef(144);

  const [missingFormDialogOpen, setMissingFormDialogOpen] = useState(false);
  const [missingLogoDialogOpen, setMissingLogoDialogOpen] = useState(false);
  const skipLogoWarningRef = useRef(false);

  const { data: formConfig } = useQuery<{ config: FormFieldConfig[] }>({
    queryKey: ["formConfig", eventId, "speaker-info"],
    queryFn: async () => {
      try {
        return await getFormConfigForEvent(eventId || "", "speaker-info");
      } catch (err: unknown) {
        // 404 = no form configured for this event yet — show setup dialog
        if ((err as { status?: number })?.status === 404) {
          setMissingFormDialogOpen(true);
        }
        throw err;
      }
    },
    enabled: Boolean(eventId),
  });

  // DEFAULT_FIELD_IDS imported from utils
  const _fieldsArray: FormFieldConfig[] = (() => {
    if (!formConfig) return [];
    const maybe = formConfig as unknown;
    if (Array.isArray(maybe)) return maybe as FormFieldConfig[];
    if (typeof maybe === "object" && maybe !== null) {
      const m = maybe as { config?: unknown; fields?: unknown };
      if (Array.isArray(m.config)) return m.config as FormFieldConfig[];
      // Nested shape: { config: { fields: [...], metadata: {...} } }
      if (m.config && typeof m.config === "object" && !Array.isArray(m.config)) {
        const nested = m.config as { fields?: unknown };
        if (Array.isArray(nested.fields)) return nested.fields as FormFieldConfig[];
      }
      if (Array.isArray(m.fields)) return m.fields as FormFieldConfig[];
    }
    return [];
  })();

  const cardBuilderFields = _fieldsArray.filter(
    (field) =>
      field &&
      (field as FormFieldConfig).showInCardBuilder &&
      (field as FormFieldConfig).enabled &&
      !DEFAULT_FIELD_IDS.includes((field as FormFieldConfig).id),
  );

  // Helper to check if a hardcoded element should be shown based on form config
  const shouldShowElement = (elementKey: string): boolean =>
    shouldShowElementFromFields(_fieldsArray, elementKey);

  // ── Starter template presets, organised by canvas shape ──────────────────────────────────────
  // Each template uses hand-tuned fixed pixel positions designed for its specific canvas size.
  // Colors and font come from the Quick Setup step (or use defaults if called directly).

  const makeApply =
    (
      buildConfig: (
        bg: string,
        textColor: string,
        font: string,
        canvasW: number,
        canvasH: number,
      ) => CardConfig,
    ) =>
    (
      bg = "#ffffff",
      textColor = "#000000",
      font = "Montserrat",
      canvasW = 600,
      canvasH = 600,
      headshotShape?: string,
    ) => {
      let newConfig = buildConfig(bg, textColor, font, canvasW, canvasH);
      // Override headshot shape if specified (e.g. circle vs square vs rounded in Quick Setup picker)
      if (headshotShape && newConfig.headshot) {
        newConfig = {
          ...newConfig,
          headshot: { ...newConfig.headshot, shape: headshotShape },
        };
      }
      // Preserve event logo URL across template switches.
      // Use cached data URL from localStorage (avoids CORS issues with server URLs).
      // Templates don't include eventLogo by default — keep the element in config if a URL exists.
      try {
        const cachedEventLogo = localStorage.getItem(`event-logo-${cardType}-${eventId}`);
        if (cachedEventLogo) {
          // Use existing element (preserves user's position/size) or fall back to template defaults.
          const base = newConfig.eventLogo ?? ELEMENT_TEMPLATES.eventLogo;
          newConfig = { ...newConfig, eventLogo: { ...base, url: cachedEventLogo } };
          setTestEventLogo(cachedEventLogo);
        }
      } catch {}
      setBgColor(bg);
      setBgGradient(null);
      setBgGradientStyle(null);
      setTemplateUrl(null);
      setConfig(newConfig);
      hb_addToHistory(newConfig, {
        historyIndexRef,
        setHistory,
        setHistoryIndex,
      });
      setCanvasWidth(canvasW);
      setCanvasHeight(canvasH);
      if (fabricCanvasRef.current)
        fabricCanvasRef.current.setDimensions({
          width: canvasW,
          height: canvasH,
        });
      setHasUnsavedChanges(true);
    };

  // ── WEBSITE CARD TEMPLATES (cardType === 'website' only) ──────────────────────────────────
  // Templates are defined in `src/constants/websiteCardTemplates.ts` as build functions.

  const SQUARE_PRESETS: StarterPreset[] = (
    presetMetasFromData(SQUARE_PRESETS_DATA) as StarterPreset[]
  ).map((m, i) => ({
    ...m,
    apply: makeApply(
      (
        bg = m.defaultBg,
        textColor = m.defaultTextColor,
        font = "Montserrat",
        canvasW = m.canvasW,
        canvasH = m.canvasH,
      ) =>
        SQUARE_PRESETS_DATA[i].build(
          ELEMENT_TEMPLATES,
          bg,
          textColor,
          font,
          canvasW,
          canvasH,
        ),
    ),
  }));

  const LANDSCAPE_PRESETS: StarterPreset[] = (
    presetMetasFromData(LANDSCAPE_PRESETS_DATA) as StarterPreset[]
  ).map((m, i) => ({
    ...m,
    apply: makeApply(
      (
        bg = m.defaultBg,
        textColor = m.defaultTextColor,
        font = "Montserrat",
        canvasW = m.canvasW,
        canvasH = m.canvasH,
      ) =>
        LANDSCAPE_PRESETS_DATA[i].build(
          ELEMENT_TEMPLATES,
          bg,
          textColor,
          font,
          canvasW,
          canvasH,
        ),
    ),
  }));

  // Flat list of all website templates (used internally — website only)
  const STARTER_PRESETS: StarterPreset[] = [
    ...SQUARE_PRESETS,
    ...LANDSCAPE_PRESETS,
  ];
  // ── END WEBSITE CARD TEMPLATES ─────────────────────────────────────────────────────────────

  // ── PROMO CARD TEMPLATES (cardType === 'promo' only) ──────────────────────────────────────
  // Platform-based "I'M SPEAKING AT" announcement cards. One template per platform.

  const PROMO_INSTAGRAM_FEED_PRESETS: StarterPreset[] = (
    presetMetasFromData(INSTAGRAM_FEED_PRESETS) as StarterPreset[]
  ).map((m, i) => ({
    ...m,
    thumbnailShape: INSTAGRAM_FEED_PRESETS[i].thumbnailShape,
    apply: makeApply(
      (bg = m.defaultBg, textColor = m.defaultTextColor, font = "Montserrat") =>
        INSTAGRAM_FEED_PRESETS[i].build(ELEMENT_TEMPLATES, bg, textColor, font),
    ),
  }));

  const PROMO_INSTAGRAM_STORY_PRESETS: StarterPreset[] = (
    presetMetasFromData(INSTAGRAM_STORY_PRESETS) as StarterPreset[]
  ).map((m, i) => ({
    ...m,
    thumbnailShape: INSTAGRAM_STORY_PRESETS[i].thumbnailShape,
    apply: makeApply(
      (bg = m.defaultBg, textColor = m.defaultTextColor, font = "Montserrat") =>
        INSTAGRAM_STORY_PRESETS[i].build(ELEMENT_TEMPLATES, bg, textColor, font),
    ),
  }));

  const PROMO_LINKEDIN_PRESETS: StarterPreset[] = (
    presetMetasFromData(LINKEDIN_PRESETS) as StarterPreset[]
  ).map((m, i) => ({
    ...m,
    thumbnailShape: LINKEDIN_PRESETS[i].thumbnailShape,
    apply: makeApply(
      (bg = m.defaultBg, textColor = m.defaultTextColor, font = "Montserrat") =>
        LINKEDIN_PRESETS[i].build(ELEMENT_TEMPLATES, bg, textColor, font),
    ),
  }));


  // Returns the website preset list for the currently-selected onboarding shape (website only)
  const presetsForShape = (shape: "square" | "landscape") => {
    return getPresetsForShape(
      false, // website only — promo uses presetsForPlatform
      shape,
      SQUARE_PRESETS,
      LANDSCAPE_PRESETS,
      [],
      [],
      [],
      [],
    );
  };

  // Initialize Fabric canvas ONCE on mount — no dimension deps.
  // Dimension changes are handled by a separate effect via setDimensions (below),
  // which avoids a full canvas dispose/recreate race when config load changes the size.
  useEffect(() => {
    let initInterval: number | null = null;

    const tryCreate = () =>
      createFabricCanvas({
        canvasRef,
        fabricCanvasRef,
        canvasWidth,
        canvasHeight,
        setSelectedElement,
        setMultiSelectActive,
        setMultiSelectedKeys,
        setContextMenu,
        headshotInputRef,
        logoInputRef,
        eventLogoInputRef,
        createSnapLineUtil,
        clearLines,
        computeSnapMatches,
        clampRectToCanvas,
        setConfig,
        setHasUnsavedChanges,
        addToHistory: (cfg: CardConfig) =>
          hb_addToHistory(cfg, {
            historyIndexRef,
            setHistory,
            setHistoryIndex,
          }),
        elementRefs,
        onReady: () => setCanvasReady((n) => n + 1),
      });

    // Try immediately, otherwise poll until the canvas element is present
    if (!tryCreate()) {
      initInterval = window.setInterval(() => {
        if (tryCreate()) {
          if (initInterval) {
            clearInterval(initInterval);
            initInterval = null;
          }
        }
      }, 100);
    }

    return () => {
      if (initInterval) {
        clearInterval(initInterval);
        initInterval = null;
      }
      // Dispose whichever canvas instance is live (canvasInstance may be null
      // because the ref is set asynchronously — so always check the ref too).
      const liveCanvas = fabricCanvasRef.current;
      fabricCanvasRef.current = null;
      try { liveCanvas?.dispose(); } catch (_) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once — dimension changes handled below

  // Resize canvas when dimensions change (e.g. after config load) without reinitialising.
  // canvasReady is included so this re-fires if dimensions were set before the canvas was ready.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    canvas.setBackgroundColor("#ffffff", () => canvas.renderAll());
  }, [canvasWidth, canvasHeight, canvasReady]);

  // Auto-fit: when canvas dimensions change (template applied / config loaded),
  // scale to fill the available container without exceeding 100%.
  const autoFitDimsRef = useRef<{ w: number; h: number } | null>(null);
  useEffect(() => {
    // Only re-fit when the dimensions themselves change, not on every canvasReady tick
    const prev = autoFitDimsRef.current;
    if (prev?.w === canvasWidth && prev?.h === canvasHeight) return;
    if (!canvasContainerRef.current || !fabricCanvasRef.current) return;
    autoFitDimsRef.current = { w: canvasWidth, h: canvasHeight };
    const container = canvasContainerRef.current;
    const PADDING = 80;
    const availW = container.clientWidth - PADDING;
    const availH = container.clientHeight - PADDING;
    if (availW <= 0 || availH <= 0) return;
    const fitZoom = Math.min(availW / canvasWidth, availH / canvasHeight, 1);
    hb_applyZoom(Math.max(0.1, Math.round(fitZoom * 100) / 100), {
      fabricCanvasRef,
      canvasWidth,
      canvasHeight,
      setZoom,
    });
  }, [canvasWidth, canvasHeight, canvasReady]);

  // Delegate heavy rendering to helper to keep component small
  const renderAllElements = useCallback(
    async () =>
      renderAllElementsHelper({
        fabricCanvasRef,
        renderGenRef,
        elementRefs,
        config,
        templateUrl,
        testHeadshot,
        testLogo,
        testEventLogo,
        bgGradient,
        bgColor,
        canvasWidth,
        canvasHeight,
        toast,
        onFontSizeResolved: (updates) => {
          // Patch config with auto-shrunk font sizes so the toolbar reflects reality.
          setConfig((prev) => {
            const next = { ...prev };
            for (const [k, fs] of Object.entries(updates)) {
              if (next[k] && next[k].fontSize !== fs) {
                next[k] = { ...next[k], fontSize: fs };
              }
            }
            return next;
          });
        },
      }),
    [
      fabricCanvasRef,
      renderGenRef,
      elementRefs,
      config,
      templateUrl,
      testHeadshot,
      testLogo,
      testEventLogo,
      bgGradient,
      bgColor,
      canvasWidth,
      canvasHeight,
    ],
  );

  // History helper — stable callback used across effects and helpers
  const addToHistory = useCallback(
    (newConfig: CardConfig) =>
      hb_addToHistory(newConfig, {
        historyIndexRef,
        setHistory,
        setHistoryIndex,
      }),
    [historyIndexRef, setHistory, setHistoryIndex],
  );

  // Undo/redo and duplicate helpers — declared here so keyboard handlers can reference them
  const undo = useCallback(
    () => hb_undo({ historyIndexRef, history, setHistoryIndex, setConfig }),
    [history, historyIndexRef, setHistoryIndex, setConfig],
  );
  const redo = useCallback(
    () => hb_redo({ historyIndexRef, history, setHistoryIndex, setConfig }),
    [history, historyIndexRef, setHistoryIndex, setConfig],
  );

  const duplicateElement = useCallback(
    (key: string) => {
      hb_duplicateElement(key, {
        config,
        setConfig,
        addToHistory,
        setSelectedElement,
        setHasUnsavedChanges,
      });
    },
    [config, addToHistory, setSelectedElement, setHasUnsavedChanges],
  );

  // Image/url helpers are provided by card-builder-utils

  // Re-render when config changes (skip if only position/size was updated via Fabric drag)
  useEffect(() => {
    if (skipRerenderRef.current) {
      skipRerenderRef.current = false;
      return;
    }
    (async () => {
      if (!fabricCanvasRef.current) return;

      const waitForCanvasReady = async (timeout = 1000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const c = fabricCanvasRef.current as any;
          if (c) {
            // Prefer explicit readiness flag set during creation
            if (c.__seamless_ready) return true;
            // Fallback: check Fabric's own getContext method
            try {
              const ctx = c.getContext?.();
              if (ctx) return true;
            } catch (_) {}
            // Fallback: lowerCanvasEl context check
            try {
              const lower = c.lowerCanvasEl;
              if (
                lower &&
                typeof lower.getContext === "function" &&
                lower.getContext("2d")
              )
                return true;
            } catch (_) {}
          }
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 50));
        }
        return false;
      };

      const ready = await waitForCanvasReady();
      if (ready) {
        renderAllElements();
      } else {
        console.warn(
          "renderAllElements: canvas not ready before render trigger",
        );
      }
    })();
  }, [
    config,
    templateUrl,
    testHeadshot,
    testLogo,
    bgColor,
    bgGradient,
    renderAllElements,
    canvasReady,
  ]);

  // Undo/redo and duplicate helpers — declared here so keyboard handlers can reference them

  // Keyboard shortcuts for undo/redo and arrow key nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/redo fire globally — must be checked BEFORE the input guard
      // because Fabric.js keeps a hidden <textarea> focused on the canvas.
      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        (e.ctrlKey && e.key === "y")
      ) {
        e.preventDefault();
        redo();
        return;
      }
      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (selectedElement) duplicateElement(selectedElement);
        return;
      }

      // Don't handle other shortcuts if user is typing in a real input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT") {
        return;
      }
      // Allow Delete/Arrow/Escape through from Fabric's hidden textarea, but
      // block them from real textareas (e.g. text editing inside a Textbox).
      if (
        target.tagName === "TEXTAREA" &&
        !target.hasAttribute("data-fabric-hiddentextarea")
      ) {
        return;
      }

      // ESC: Deselect (clear selection)
      if (e.key === "Escape") {
        e.preventDefault();
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          canvas.discardActiveObject();
          canvas.renderAll();
        }
        setSelectedElement(null);
        return;
      }

      // Delete/Backspace: Remove selected element
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElement) {
        e.preventDefault();
        setConfig((prev) => {
          const newConfig = { ...prev };
          delete newConfig[selectedElement];
          return newConfig;
        });
        setSelectedElement(null);
        setHasUnsavedChanges(true);
        return;
      }

      // Arrow key nudging (PowerPoint-style)
      const canvas = fabricCanvasRef.current;
      const activeObject = canvas?.getActiveObject();
      if (!activeObject || !canvas) return;

      const nudgeAmount = e.shiftKey ? 10 : 1; // Shift for larger steps
      let dx = 0,
        dy = 0;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          dx = -nudgeAmount;
          break;
        case "ArrowRight":
          e.preventDefault();
          dx = nudgeAmount;
          break;
        case "ArrowUp":
          e.preventDefault();
          dy = -nudgeAmount;
          break;
        case "ArrowDown":
          e.preventDefault();
          dy = nudgeAmount;
          break;
        default:
          return;
      }

      // Move the Fabric object(s) immediately for smooth visual feedback
      activeObject.set("left", (activeObject.left || 0) + dx);
      activeObject.set("top", (activeObject.top || 0) + dy);
      activeObject.setCoords();
      canvas.requestRenderAll();

      // Sync config without triggering a full canvas rebuild
      skipRerenderRef.current = true;
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length > 1) {
        // Multi-select: apply same delta to each element's stored position
        setConfig((prev) => {
          const next = { ...prev };
          activeObjects.forEach((obj) => {
            const key = obj.data?.elementKey;
            if (key && next[key]) {
              next[key] = {
                ...next[key],
                x: (next[key].x || 0) + dx,
                y: (next[key].y || 0) + dy,
              };
            }
          });
          addToHistory(next);
          return next;
        });
        setHasUnsavedChanges(true);
      } else if (activeObject.data?.elementKey) {
        updateElement(activeObject.data.elementKey, {
          x: activeObject.left || 0,
          y: activeObject.top || 0,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    historyIndex,
    history,
    selectedElement,
    undo,
    redo,
    duplicateElement,
    addToHistory,
  ]);

  // Close shape popup when clicking outside (Templates/BG are inline, no close-outside needed)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shapePopupOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-popover]")) {
          setShapePopupOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shapePopupOpen]);

  // Save handler — use shared helper to avoid duplication
  const handleSave = useCallback(
    async (silent = false) => {
      // Warn if event logo element is on canvas but no image uploaded
      if (!silent && !skipLogoWarningRef.current && config.eventLogo && !testEventLogo && !config.eventLogo?.url) {
        setMissingLogoDialogOpen(true);
        return;
      }
      skipLogoWarningRef.current = false;
      await hb_handleSave(silent, {
        config,
        elementRefs,
        canvasWidth,
        canvasHeight,
        templateUrl,
        bgColor,
        bgGradient,
        cardType,
        eventId,
        setTemplateUrl,
        setBgIsGenerated,
        setHasUnsavedChanges,
        toast,
      });
    },
    [
      config,
      testEventLogo,
      elementRefs,
      canvasWidth,
      canvasHeight,
      templateUrl,
      bgColor,
      bgGradient,
      cardType,
      eventId,
      setTemplateUrl,
      setBgIsGenerated,
      setHasUnsavedChanges,
      toast,
    ],
  );

  // Auto-save: 3 seconds after any change, persist to server only.
  // The orange dot on Save still shows until explicitly dismissed; auto-save just prevents data loss.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const timer = window.setTimeout(() => {
      handleSave(true); // silent=true — no toast
    }, 3000);
    return () => clearTimeout(timer);
  }, [handleSave, hasUnsavedChanges]);

  // Sidebar resize drag handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!sidebarDragging.current) return;
      const delta = e.clientX - sidebarDragStartX.current;
      setSidebarWidth(Math.max(144, Math.min(320, sidebarDragStartW.current + delta)));
    };
    const onUp = () => { sidebarDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Load saved config on mount: server-only (no localStorage fallback)
  useEffect(() => {
    if (!eventId) return;

    (async () => {
      let res: any;
      try {
        res = await getPromoConfigForEvent(eventId as string, cardType);
      } catch (err) {
        console.warn("CardBuilder: failed to load config from server", err);
        return;
      }

      const serverConfig = res?.config ?? res;

      // Guard: if the backend returns a null, non-object, or empty config for
      // this cardType (e.g. promo config not yet created, or backend returned
      // the wrong type), don't wipe the canvas — just leave it blank/empty.
      if (!serverConfig || typeof serverConfig !== "object") return;

      const KNOWN_ELEMENT_KEYS = ["headshot", "firstName", "lastName", "title", "company", "companyLogo", "eventLogo", "gradientOverlay"];
      const hasContent =
        Object.keys(serverConfig).some(
          (k) =>
            KNOWN_ELEMENT_KEYS.some((ek) => k.startsWith(ek)) ||
            k.startsWith("dynamic_"),
        ) ||
        serverConfig.canvasWidth ||
        serverConfig.canvasHeight ||
        serverConfig.bgColor;

      if (!hasContent) {
        // Backend returned a trivial/empty config — leave canvas alone (blank is fine).
        return;
      }

      const savedTemplateUrl = serverConfig.templateUrl ?? null;
      const savedWidth =
        serverConfig.canvasWidth ?? serverConfig.canvas_width ?? null;
      const savedHeight =
        serverConfig.canvasHeight ?? serverConfig.canvas_height ?? null;

      const { migrated, changed } = migrateLoadedConfig(serverConfig);
      setConfig(migrated);
      setHasUnsavedChanges(changed);
      // Restore event logo from localStorage (data URL) — avoids CORS issues with server URLs.
      try {
        const cached = localStorage.getItem(`event-logo-${cardType}-${eventId}`);
        if (cached) setTestEventLogo(cached);
      } catch {}

      if (savedWidth && savedHeight) {
        setCanvasWidth(savedWidth);
        setCanvasHeight(savedHeight);
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.setDimensions({
            width: savedWidth,
            height: savedHeight,
          });
        }
      }

      const savedBgColor = serverConfig.bgColor ?? serverConfig.bg_color;
      if (savedBgColor) setBgColor(savedBgColor);
      const savedBgGradient =
        serverConfig.bgGradient ?? serverConfig.bg_gradient;
      if (savedBgGradient) setBgGradient(savedBgGradient);

      const bgIsGenerated = serverConfig.bgIsGenerated ?? false;
      if (savedTemplateUrl && !bgIsGenerated) {
        const img = new Image();
        img.onerror = () => {
          toast({
            title: "Background load failed",
            description:
              "Could not load background image due to CORS or network error. Try re-uploading the image.",
            variant: "destructive",
          });
          setTemplateUrl(null);
        };
        img.onload = () => {
          if (!savedWidth || !savedHeight) {
            setCanvasWidth(img.width);
            setCanvasHeight(img.height);
            if (fabricCanvasRef.current) {
              fabricCanvasRef.current.setDimensions({
                width: img.width,
                height: img.height,
              });
            }
          }
          setTemplateUrl(savedTemplateUrl);
        };
        img.src =
          getAbsoluteUrl(savedTemplateUrl, API_BASE) || savedTemplateUrl;
      }
    })();
  }, [eventId, cardType]); // Load when eventId or cardType changes

  const handleDragStart = (e: React.DragEvent, elementKey: string) =>
    hb_handleDragStart(e, elementKey);
  const handleDragOver = (e: React.DragEvent) => hb_handleDragOver(e);
  const handleDrop = (e: React.DragEvent) =>
    hb_handleDrop(e, {
      ELEMENT_TEMPLATES,
      cardBuilderFields,
      createDynamicElementTemplate,
      getCanvasRelativePos,
      zoom,
      canvasRef,
      fabricCanvasRef,
      setShapePopupPosition,
      setShapePopupOpen,
      setHasUnsavedChanges,
      setConfig,
      addToHistory: (cfg: CardConfig) =>
        hb_addToHistory(cfg, { historyIndexRef, setHistory, setHistoryIndex }),
      toast,
    });

  const addElementToCanvas = (
    elementKey: string,
    customPos?: { x: number; y: number },
    customProps?: Record<string, unknown>,
  ) =>
    hb_addElementToCanvas(elementKey, {
      ELEMENT_TEMPLATES,
      customPos,
      customProps,
      canvasRef,
      fabricCanvasRef,
      getCanvasRelativePos,
      zoom,
      canvasWidth,
      canvasHeight,
      setHasUnsavedChanges,
      setConfig,
      addToHistory: (cfg: CardConfig) =>
        hb_addToHistory(cfg, { historyIndexRef, setHistory, setHistoryIndex }),
      toast,
    });

  const toggleElement = (elementKey: string) =>
    hb_toggleElement(elementKey, {
      config,
      setHasUnsavedChanges,
      setConfig,
      addElementToCanvas,
      toast,
    });

  const updateElement = (elementKey: string, updates: Partial<ElementConfig>) =>
    hb_updateElement(elementKey, updates, {
      setHasUnsavedChanges,
      setConfig,
      elementRefs,
      fabricCanvasRef,
      addToHistory: (cfg: CardConfig) =>
        hb_addToHistory(cfg, { historyIndexRef, setHistory, setHistoryIndex }),
    });

  const applyZoom = (newZoom: number) =>
    hb_applyZoom(newZoom, {
      fabricCanvasRef,
      canvasWidth,
      canvasHeight,
      setZoom,
    });
  const handleZoomIn = () => applyZoom(Math.min(zoom + 0.1, 3));
  const handleZoomOut = () => applyZoom(Math.max(zoom - 0.1, 0.1));

  const handleZoomFit = () =>
    hb_handleZoomFit({ fabricCanvasRef, canvasWidth, canvasHeight, setZoom });

  // Alignment — PowerPoint/Canva standard:
  //   Single element  → aligns to canvas edges/centre
  //   Multi-select    → aligns to the group's own bounding box (not the canvas)
  //
  // Implementation: compute all new positions first, then apply in ONE setConfig call
  // so renderAllElements only fires once and nothing gets wiped mid-operation.
  const alignSelection = (direction: AlignDirection) =>
    hb_alignSelection(direction, {
      multiSelectedKeys,
      selectedElement,
      config,
      elementRefs,
      canvasWidth,
      canvasHeight,
      setConfig,
      addToHistory: (cfg: CardConfig) =>
        hb_addToHistory(cfg, { historyIndexRef, setHistory, setHistoryIndex }),
      setHasUnsavedChanges,
    });

  // Z-order helpers
  const bringToFront = (key: string) => {
    hb_bringToFront(key, { config, updateElement });
  };
  const sendToBack = (key: string) => {
    hb_sendToBack(key, { config, updateElement });
  };
  const bringForward = (key: string) => {
    hb_bringForward(key, {
      config,
      setConfig,
      addToHistory,
      setHasUnsavedChanges,
    });
  };
  const sendBackward = (key: string) => {
    hb_sendBackward(key, {
      config,
      setConfig,
      addToHistory,
      setHasUnsavedChanges,
    });
  };

  // Lock / unlock — locked elements show selection handles but can't be moved or resized
  const toggleLock = (key: string) => {
    hb_toggleLock(key, { config, updateElement });
  };

  // Shape selector popup helper — adds headshot with given shape at saved drop position
  const addHeadshotShape = (
    shape: string,
    extraProps?: Record<string, unknown>,
  ) => {
    hb_addHeadshotShape(shape, { addElementToCanvas, setShapePopupOpen });
  };

  // Layers panel helpers
  const selectLayerItem = (key: string) => {
    hb_selectLayerItem(key, {
      fabricCanvasRef,
      elementRefs,
      setSelectedElement,
    });
  };
  const layerMoveUp = (key: string) => {
    hb_layerMoveUp(key, { config, setConfig });
  };
  const layerMoveDown = (key: string) => {
    hb_layerMoveDown(key, { config, setConfig });
  };

  const handleBackgroundUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) =>
    hb_handleBackgroundUpload(e, {
      loadImagePromise,
      fabricCanvasRef,
      setCanvasWidth,
      setCanvasHeight,
      setZoom,
      setTemplateUrl,
      toast,
    });

  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    hb_handleHeadshotUpload(e, {
      setCropImageUrl,
      setCropMode,
      setCropDialogOpen,
      toast,
    });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    hb_handleLogoUpload(e, {
      setCropImageUrl,
      setCropMode,
      setCropDialogOpen,
      toast,
    });

  const handleEventLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    hb_handleEventLogoUpload(e, {
      setCropImageUrl,
      setCropMode,
      setCropDialogOpen,
      toast,
    });

  const eventLogoStorageKey = `event-logo-${cardType}-${eventId}`;

  const handleCropComplete = async (blob: Blob) => {
    await hb_handleCropComplete(blob, {
      cropMode,
      setTemplateUrl,
      setBgIsGenerated,
      setTestHeadshot,
      setTestLogo,
      setTestEventLogo,
      config,
      addElementToCanvas,
      updateElement,
      setCropDialogOpen,
      setCropImageUrl,
      setCropMode,
      toast,
    });
    // Persist event logo data URL to localStorage so it survives page reloads and template switches.
    if (cropMode === "event-logo") {
      const reader = new FileReader();
      reader.onloadend = () => {
        try { localStorage.setItem(eventLogoStorageKey, reader.result as string); } catch {}
      };
      reader.readAsDataURL(blob);
    }
  };

  // Export PNG at 1:1 scale (resets zoom transform temporarily)
  const handleExport = () =>
    hb_handleExport({
      fabricCanvasRef,
      canvasWidth,
      canvasHeight,
      cardType,
      toast,
    });

  const handleReset = () =>
    hb_handleReset({
      setConfig,
      setTemplateUrl,
      setTestHeadshot,
      setTestLogo,
      setSelectedElement,
      setCanvasWidth,
      setCanvasHeight,
      setBgColor,
      setBgGradient,
      setBgGradientStyle,
      setBgIsGenerated,
      setHistory,
      historyIndexRef,
      setHistoryIndex,
      setHasUnsavedChanges,
      fabricCanvasRef,
      fileInputRef,
      headshotInputRef,
      logoInputRef,
      toast,
    });

  // Reset zoom to 1:1 (toolbar zoom-reset button)
  const handleZoomReset = () => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);
    c.setDimensions({ width: canvasWidth, height: canvasHeight });
    setZoom(1);
    c.renderAll();
  };

  const applyGradientStyle = (style: "dark" | "tonal" | "soft") =>
    hb_applyGradientStyle(style, {
      deriveGradient,
      bgColor,
      setBgGradient,
      setBgGradientStyle,
      setHasUnsavedChanges,
    });

  const clearGradient = () =>
    hb_clearGradient({
      setBgGradient,
      setBgGradientStyle,
      setHasUnsavedChanges,
    });

  const dismissOnboarding = () => {
    hb_dismissOnboarding({
      setShowOnboarding,
      setOnboardingShowShapePicker,
      setOnboardingShowTemplates,
      setOnboardingQuickSetup,
      setPendingPreset,
    });
    setOnboardingBrandSetup(false);
    setOnboardingPlatformPicker(false);
  };

  const getFieldLabel = (elementKey: string, fallback: string): string => {
    const fieldMapping: Record<string, string[]> = {
      headshot: ["headshot"],
      firstName: ["first_name"],
      lastName: ["last_name"],
      title: ["company_role"],
      company: ["company_name"],
      companyLogo: ["company_logo"],
    };
    const fieldIds = fieldMapping[elementKey] || [];
    for (const fid of fieldIds) {
      const field = _fieldsArray.find((f: any) => f.id === fid);
      if (field?.label) return field.label;
    }
    return fallback;
  };

  const applyPresetAndDismiss = (preset: StarterPreset) =>
    hb_applyPresetAndDismiss(preset, {
      presetApply: preset.apply,
      dismissOnboarding: (p: unknown) => dismissOnboarding(),
    });

  return (
    <>
      <UnsavedChangesDialog
        open={showLeaveDialog}
        onSave={() => { setShowLeaveDialog(false); handleSave(); onBack?.(); }}
        onDiscard={() => { setShowLeaveDialog(false); onBack?.(); }}
        onCancel={() => setShowLeaveDialog(false)}
      />

      <MissingFormDialog
        open={missingFormDialogOpen}
        onOpenChange={setMissingFormDialogOpen}
        eventId={eventId || ""}
      />

      <Dialog open={missingLogoDialogOpen} onOpenChange={setMissingLogoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event logo not uploaded</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              Your card template has an event logo placeholder but no image has been uploaded yet. Upload your logo now, or save anyway and add it later.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMissingLogoDialogOpen(false);
                  skipLogoWarningRef.current = true;
                  handleSave();
                }}
              >
                Save anyway
              </Button>
              <Button
                onClick={() => {
                  setMissingLogoDialogOpen(false);
                  setTimeout(() => eventLogoInputRef.current?.click(), 50);
                }}
              >
                Upload logo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={(open) => {
          setCropDialogOpen(open);
          if (!open) {
            setCropImageUrl("");
            setCropMode(null);
          }
        }}
        imageUrl={cropImageUrl}
        onCropComplete={handleCropComplete}
        aspectRatio={
          cropMode === "logo" || cropMode === "event-logo"
            ? NaN // Free-form: logos come in all shapes
            : cropMode === "headshot"
              ? config.headshot?.shape === "vertical"
                ? 3 / 4
                : config.headshot?.shape === "horizontal"
                  ? 4 / 3
                  : config.headshot?.shape === "full-bleed"
                    ? canvasWidth / canvasHeight
                    : 1
              : undefined
        }
        cropShape={
          cropMode === "headshot"
            ? config.headshot?.shape === "rounded" ||
              config.headshot?.shape === "full-bleed"
              ? "square"
              : config.headshot?.shape || "circle"
            : "square"
        }
        title={cropMode === "logo" || cropMode === "event-logo" ? "Crop Logo" : "Crop Image"}
        instructions={
          cropMode === "logo" || cropMode === "event-logo"
            ? "Drag to reposition, scroll to zoom. Crop to the logo boundary — any shape is fine."
            : "Drag to reposition, scroll to zoom, adjust to fit perfectly."
        }
        imageFormat={cropMode === "logo" || cropMode === "event-logo" ? "png" : "jpeg"}
      />

      {/* ── Onboarding modal (website + promo card builders, shows once) ── */}
      {showOnboarding && (cardType === "website" || cardType === "promo") && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`bg-card border border-border rounded-2xl shadow-2xl w-full mx-4 overflow-hidden transition-all ${onboardingShowTemplates && !onboardingQuickSetup ? "max-w-2xl" : "max-w-lg"}`}
          >
            {/* Step 1: Welcome / choice */}
            {!onboardingShowShapePicker &&
              !onboardingShowTemplates &&
              !onboardingQuickSetup &&
              !onboardingBrandSetup &&
              !onboardingPlatformPicker && (
                <div className="relative p-8">
                  <button
                    onClick={dismissOnboarding}
                    className="absolute top-4 right-4 p-1.5 rounded hover:bg-accent text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-sm font-medium mb-6">
                    How do you want to start?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => isPromo ? setOnboardingBrandSetup(true) : setOnboardingShowShapePicker(true)}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Layers className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold text-sm">
                        Use a template
                      </span>
                    </button>
                    <button
                      onClick={dismissOnboarding}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-border/80 hover:bg-muted/30 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                        <Square className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="font-semibold text-sm">
                        Blank canvas
                      </span>
                    </button>
                  </div>
                </div>
              )}

            {/* Step 2: Canvas shape picker */}
            {onboardingShowShapePicker &&
              !onboardingShowTemplates &&
              !onboardingQuickSetup && (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOnboardingShowShapePicker(false)}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-sm">Card shape</span>
                    </div>
                    <button
                      onClick={() => {
                        setOnboardingShowShapePicker(false);
                        dismissOnboarding();
                      }}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {(
                      [
                        {
                          key: "square",
                          label: "Square",
                          ratio: "1:1",
                          w: 80,
                          h: 80,
                        },
                        {
                          key: "landscape",
                          label: "Landscape",
                          ratio: "3:2",
                          w: 96,
                          h: 64,
                        },
                      ] as const
                    ).map(({ key, label, ratio, w, h }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setQuickShape(key);
                          setOnboardingShowShapePicker(false);
                          setOnboardingShowTemplates(true);
                        }}
                        className="flex flex-col items-center gap-3 py-5 px-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                      >
                        <div
                          className="flex items-center justify-center"
                          style={{ width: 96, height: 96 }}
                        >
                          <div
                            className="rounded-lg border-2 border-muted-foreground/40 group-hover:border-primary bg-muted/30 group-hover:bg-primary/5 transition-colors"
                            style={{ width: w, height: h }}
                          />
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-sm">{label}</div>
                          <div className="text-xs text-muted-foreground">
                            {ratio}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingShowShapePicker(false);
                        dismissOnboarding();
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Blank canvas
                    </button>
                  </div>
                </div>
              )}

            {/* Step 3: Template picker — layouts for the selected shape */}
            {onboardingShowTemplates && !onboardingQuickSetup && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setOnboardingShowTemplates(false);
                        setOnboardingShowShapePicker(true);
                      }}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-sm capitalize">
                      {quickShape}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setOnboardingShowTemplates(false);
                      dismissOnboarding();
                    }}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-5 mb-6">
                  {presetsForShape(quickShape).map((preset) => {
                    const aspectClass =
                      preset.thumbnailShape === "landscape"
                        ? "aspect-[3/2]"
                        : preset.thumbnailShape === "portrait"
                          ? "aspect-[2/3]"
                          : "aspect-square";
                    return (
                      <div key={preset.name} className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPendingPreset(preset);
                            setQuickBg(preset.defaultBg);
                            setQuickTextColor(preset.defaultTextColor);
                            setQuickFont("Montserrat");
                            setQuickHeadshotShape(
                              preset.allowedHeadshotShapes[0] ?? "circle",
                            );
                            setOnboardingQuickSetup(true);
                          }}
                          className={`${aspectClass} w-full rounded-xl border-2 border-border hover:border-primary hover:shadow-lg transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary`}
                        >
                          <TemplateThumbnail type={preset.thumbnail} />
                        </button>
                        <span className="text-xs font-semibold">
                          {preset.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={dismissOnboarding}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Blank canvas
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Quick Setup — pick background, text colour, font */}
            {onboardingQuickSetup && pendingPreset && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOnboardingQuickSetup(false)}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-sm">
                      {pendingPreset.name}
                    </span>
                  </div>
                  <button
                    onClick={dismissOnboarding}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* 3 pickers */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div>
                    <label className="text-xs font-medium mb-2 block">
                      Background
                    </label>
                    <div className="flex items-center gap-1.5">
                      <QuickColorPicker
                        value={quickBg}
                        onChange={setQuickBg}
                        label="Background colour"
                      />
                      <HexColorInput
                        value={quickBg}
                        onChange={setQuickBg}
                        className="flex-1 h-7 text-xs font-mono px-1.5 rounded border border-border bg-background min-w-0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block">
                      Text
                    </label>
                    <div className="flex items-center gap-1.5">
                      <QuickColorPicker
                        value={quickTextColor}
                        onChange={setQuickTextColor}
                        label="Text colour"
                      />
                      <HexColorInput
                        value={quickTextColor}
                        onChange={setQuickTextColor}
                        className="flex-1 h-7 text-xs font-mono px-1.5 rounded border border-border bg-background min-w-0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block">
                      Font
                    </label>
                    <select
                      value={quickFont}
                      onChange={(e) => setQuickFont(e.target.value)}
                      className="w-full h-7 px-1.5 text-xs border border-border rounded bg-background"
                    >
                      {[
                        "Roboto",
                        "Open Sans",
                        "Lato",
                        "Montserrat",
                        "Poppins",
                        "Raleway",
                        "Noto Sans",
                        "Source Sans Pro",
                        "Merriweather",
                        "Playfair Display",
                        "Nunito",
                        "Ubuntu",
                        "PT Sans",
                        "Karla",
                        "Oswald",
                        "Fira Sans",
                        "Work Sans",
                        "Inconsolata",
                        "Josefin Sans",
                        "Alegreya",
                        "Cabin",
                        "Titillium Web",
                        "Mulish",
                        "Quicksand",
                        "Anton",
                        "Droid Sans",
                        "Archivo",
                        "Hind",
                        "Bitter",
                        "Libre Franklin",
                      ].map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Build font import string dynamically from FONT_FAMILIES to keep JSX clean */}

                {/* Gradient */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium">Gradient</label>
                    {bgGradient && (
                      <button
                        type="button"
                        onClick={() => {
                          setBgGradient(null);
                          setBgGradientStyle(null);
                        }}
                        className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { style: null, label: "None" },
                        { style: "dark", label: "Dark" },
                        { style: "tonal", label: "Tonal" },
                        { style: "soft", label: "Soft" },
                      ] as const
                    ).map(({ style, label }) => {
                      const preview = style
                        ? deriveGradient(quickBg, style)
                        : null;
                      const isActive =
                        style === null
                          ? !bgGradient
                          : bgGradientStyle === style;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            if (style === null) {
                              setBgGradient(null);
                              setBgGradientStyle(null);
                            } else {
                              const g = deriveGradient(quickBg, style);
                              setBgGradient(g);
                              setBgGradientStyle(style);
                            }
                          }}
                          className={`flex flex-col items-center gap-1.5 py-2 px-1.5 rounded-lg border-2 transition-all ${isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        >
                          <div
                            className="w-full rounded h-6 border border-border/30"
                            style={{
                              background: preview
                                ? `linear-gradient(135deg, ${preview.from}, ${preview.to})`
                                : quickBg,
                            }}
                          />
                          <span className="text-[10px] font-semibold">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Headshot shape picker — shown when template supports multiple shapes */}
                {pendingPreset.allowedHeadshotShapes.length > 1 && (
                  <div className="mb-5">
                    <label className="text-xs font-medium mb-2 block">
                      Headshot Shape
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {pendingPreset.allowedHeadshotShapes.map((shape) => {
                        const isActive = quickHeadshotShape === shape;
                        const label =
                          shape === "full-bleed"
                            ? "Full bleed"
                            : shape.charAt(0).toUpperCase() + shape.slice(1);
                        return (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => setQuickHeadshotShape(shape)}
                            className={`px-3 py-1.5 text-xs rounded-lg border-2 font-medium transition-all ${isActive ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Apply button */}
                <button
                  type="button"
                  onClick={() => {
                    const cw = pendingPreset.canvasW;
                    const ch = pendingPreset.canvasH;
                    const hs =
                      pendingPreset.allowedHeadshotShapes.length > 1
                        ? quickHeadshotShape
                        : undefined;
                    pendingPreset.apply(
                      quickBg,
                      quickTextColor,
                      quickFont,
                      cw,
                      ch,
                      hs,
                    );
                    setShowOnboarding(false);
                    setOnboardingShowShapePicker(false);
                    setOnboardingShowTemplates(false);
                    setOnboardingQuickSetup(false);
                    setPendingPreset(null);
                    tryShowCanvasTip();
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  Apply &amp; Start Designing
                </button>
              </div>
            )}

            {/* ── PROMO Step 2: Brand setup — event logo + colours ── */}
            {isPromo && onboardingBrandSetup && !onboardingPlatformPicker && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOnboardingBrandSetup(false)}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-sm">Brand setup</span>
                  </div>
                  <button onClick={dismissOnboarding} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Brand colour + text colour */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-medium mb-2 block">Brand colour</label>
                    <div className="flex items-center gap-1.5">
                      <QuickColorPicker value={quickBg} onChange={setQuickBg} label="Brand colour" />
                      <HexColorInput value={quickBg} onChange={setQuickBg} className="flex-1 h-7 text-xs font-mono px-1.5 rounded border border-border bg-background min-w-0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block">Text colour</label>
                    <div className="flex items-center gap-1.5">
                      <QuickColorPicker value={quickTextColor} onChange={setQuickTextColor} label="Text colour" />
                      <HexColorInput value={quickTextColor} onChange={setQuickTextColor} className="flex-1 h-7 text-xs font-mono px-1.5 rounded border border-border bg-background min-w-0" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOnboardingPlatformPicker(true)}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  Choose platform
                </button>
              </div>
            )}

            {/* ── PROMO Step 3: Platform picker ── */}
            {isPromo && onboardingPlatformPicker && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOnboardingPlatformPicker(false)}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-sm">Choose platform</span>
                  </div>
                  <button onClick={dismissOnboarding} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {[
                    { label: "Instagram Feed", sub: "1080 × 1080 px", preset: PROMO_INSTAGRAM_FEED_PRESETS[0], shapeW: 28, shapeH: 28 },
                    { label: "Instagram Story", sub: "1080 × 1920 px", preset: PROMO_INSTAGRAM_STORY_PRESETS[0], shapeW: 18, shapeH: 32 },
                    { label: "LinkedIn Post",   sub: "1200 × 627 px",  preset: PROMO_LINKEDIN_PRESETS[0],        shapeW: 36, shapeH: 19 },
                  ].map(({ label, sub, preset, shapeW, shapeH }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        preset.apply(quickBg, quickTextColor, "Montserrat", preset.canvasW, preset.canvasH);
                        setBgColor(quickBg);
                        dismissOnboarding();
                        tryShowCanvasTip();
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <div
                        className="shrink-0 rounded border-2 border-muted-foreground/30 group-hover:border-primary/60 bg-muted/30 transition-colors"
                        style={{ width: shapeW, height: shapeH }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-tight">{label}</div>
                        <div className="text-xs text-muted-foreground">{sub}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="text-center mt-4">
                  <button type="button" onClick={dismissOnboarding} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                    Blank canvas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="h-full w-full flex flex-col bg-background">
        {/* ── Two-row toolbar ── */}
        <div className="flex flex-col bg-card border-b border-border shrink-0 sticky top-0 z-20">
          {/* Row 1: Branding + navigation + global actions */}
          <div className="flex items-center gap-1 px-3 h-10 border-b border-border/40">
            {/* Left: back + wordmark + card type */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onBack && (
                <>
                  <button
                    onClick={() => {
                      if (hasUnsavedChanges) { setShowLeaveDialog(true); return; }
                      onBack?.();
                    }}
                    className={TOOLBAR_ICON_BTN}
                    title="Back to Speakers"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="h-5 w-px bg-border mx-0.5" />
                </>
              )}
              <div className="flex items-baseline gap-1 leading-none select-none">
                <span
                  className="text-sm font-semibold text-primary"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  Seamless
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {cardType === "promo" ? "Social Card Builder" : "Speaker Card Builder"}
                </span>
              </div>
              {!fullscreen && (
                <>
                  <div className="h-4 w-px bg-border mx-0.5" />
                  <div className="inline-flex items-center gap-0.5 p-0.5 bg-muted rounded-md">
                    <button
                      onClick={() => setCardType("promo")}
                      className={`px-2.5 py-0.5 text-xs font-medium rounded transition-all ${cardType === "promo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
                    >
                      Promo
                    </button>
                    <button
                      onClick={() => setCardType("website")}
                      className={`px-2.5 py-0.5 text-xs font-medium rounded transition-all ${cardType === "website" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}
                    >
                      Website
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Right: Layers, undo/redo, zoom, export, save */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Layers panel */}
              <div className="relative">
                <button
                  onClick={() => setLayersPanelOpen(!layersPanelOpen)}
                  className={`p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground ${layersPanelOpen ? "bg-accent" : ""}`}
                  title="Layers"
                >
                  <Layers className="h-4 w-4" />
                </button>
                {layersPanelOpen && (
                  <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-lg shadow-xl p-3 z-50 w-64">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Layers</h3>
                      <button
                        onClick={() => setLayersPanelOpen(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {Object.entries(config)
                        .sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0))
                        .map(([key, element]) => (
                          <div
                            key={key}
                            className={`flex items-center justify-between p-2 rounded text-sm hover:bg-accent cursor-pointer ${selectedElement === key ? "bg-accent" : ""}`}
                            onClick={() => selectLayerItem(key)}
                          >
                            <span className="flex-1 truncate">
                              {element.label || key}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLock(key);
                                }}
                                className={`p-1 hover:bg-muted rounded ${element.locked ? "text-amber-500" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                                title={element.locked ? "Unlock" : "Lock"}
                              >
                                {element.locked ? (
                                  <Lock className="h-3 w-3" />
                                ) : (
                                  <Unlock className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateElement(key, {
                                    visible: !element.visible,
                                  });
                                }}
                                className="p-1 hover:bg-muted rounded"
                                title={
                                  element.visible !== false ? "Hide" : "Show"
                                }
                              >
                                {element.visible !== false ? (
                                  <Eye className="h-3 w-3" />
                                ) : (
                                  <EyeOff className="h-3 w-3" />
                                )}
                              </button>
                              <div className="flex flex-col">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    layerMoveUp(key);
                                  }}
                                  className="p-0.5 hover:bg-muted rounded"
                                  title="Move up"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    layerMoveDown(key);
                                  }}
                                  className="p-0.5 hover:bg-muted rounded"
                                  title="Move down"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="h-5 w-px bg-border mx-0.5" />
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <div className="h-5 w-px bg-border mx-0.5" />
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.1}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleZoomReset}
                className="text-xs font-mono w-10 text-center py-1 rounded hover:bg-accent cursor-pointer"
                title="Reset zoom"
              >
                {(zoom * 100).toFixed(0)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleZoomFit}
                className="p-1.5 rounded hover:bg-accent"
                title="Fit to content"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <div className="h-5 w-px bg-border mx-0.5" />
              <button
                onClick={handleReset}
                className={TOOLBAR_ICON_BTN}
                title="Reset canvas"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <div className="h-5 w-px bg-border mx-0.5" />
              <Button
                onClick={() => handleSave()}
                size="sm"
                variant="outline"
                className={`relative h-7 text-xs font-semibold ${hasUnsavedChanges ? "border-primary text-primary hover:bg-primary/5" : ""}`}
              >
                <Save className="h-3 w-3 mr-1" />
                Save
                {hasUnsavedChanges && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-400" />
                )}
              </Button>
              <Button
                onClick={handleExport}
                size="sm"
                variant="default"
                className="h-7 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <div className="h-5 w-px bg-border mx-0.5" />
              {cardType === "website" ? (
                <HelpTip title="Speaker Card Template" side="bottom" align="end">
                  <p>One design, every speaker — headshot, name, title, and logo are filled in automatically. Save here, then approve each speaker's card from their profile.</p>
                </HelpTip>
              ) : (
                <HelpTip title="Social Card Template" side="bottom" align="end">
                  <p>One template, every speaker gets their own version for LinkedIn, Instagram, and similar. Choose square, landscape, or story format.</p>
                </HelpTip>
              )}
            </div>
          </div>

          {/* Row 2: Canvas controls — always visible */}
          <div className="flex items-center gap-1.5 px-3 h-9 border-b border-border/40 bg-muted/5 shrink-0">
            {/* Templates */}
            <button
              onClick={() => {
                if (isPromo) {
                  setOnboardingBrandSetup(true);
                  setQuickBg("#0f172a");
                  setQuickTextColor("#ffffff");
                } else {
                  setOnboardingShowShapePicker(true);
                }
                setShowOnboarding(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Browse templates"
            >
              <Layers className="h-3.5 w-3.5" />
              Templates
            </button>

            <div className="h-4 w-px bg-border" />

            {/* Background */}
            <div className="relative">
              <button
                onClick={() => setBgPanelOpen(!bgPanelOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${bgPanelOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                title="Background colour or image"
              >
                <div className="relative">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-sm border border-border/80"
                    style={{
                      background: bgGradient
                        ? `linear-gradient(135deg, ${bgGradient.from}, ${bgGradient.to})`
                        : bgColor,
                    }}
                  />
                </div>
                Background
              </button>
              {bgPanelOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-card shadow-xl p-2 space-y-2 z-50">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Background image</div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs transition-colors ${templateUrl ? "border-primary/40 bg-primary/5 text-primary" : "border-border hover:bg-accent"}`}
                    >
                      <Upload className="h-3 w-3 shrink-0" />
                      <span className="truncate">{templateUrl ? "Replace image" : "Upload image"}</span>
                    </button>
                    {templateUrl && (
                      <button
                        onClick={() => { setTemplateUrl(null); setHasUnsavedChanges(true); }}
                        className="w-full text-[10px] text-muted-foreground hover:text-destructive text-left mt-1"
                      >
                        ✕ Remove image
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Solid colour</div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {["#ffffff","#000000","#1e293b","#0f172a","#1d4ed8","#dc2626","#16a34a","#d97706","#7c3aed","#db2777","#0891b2","#374151"].map((c) => (
                        <button
                          key={c}
                          onClick={() => { setBgColor(c); setBgGradient(null); setBgGradientStyle(null); setHasUnsavedChanges(true); }}
                          className={`w-5 h-5 rounded border-2 transition-transform hover:scale-110 ${!bgGradient && bgColor === c ? "border-primary" : "border-border/60"}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <QuickColorPicker
                        value={bgColor}
                        onChange={(hex) => { setBgColor(hex); setBgGradient(null); setBgGradientStyle(null); setHasUnsavedChanges(true); }}
                        label="Background colour"
                      />
                      <HexColorInput
                        value={bgColor}
                        onChange={(hex) => { setBgColor(hex); setBgGradient(null); setBgGradientStyle(null); setHasUnsavedChanges(true); }}
                        className="flex-1 h-6 text-xs font-mono px-1 rounded border border-border bg-background min-w-0"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Gradient</div>
                      {bgGradient && (
                        <button onClick={clearGradient} className="text-[10px] text-muted-foreground hover:text-destructive">✕ Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {GRADIENT_STYLES.map((style) => {
                        const preview = deriveGradient(bgColor, style as any);
                        const isActive = bgGradientStyle === (style as any);
                        return (
                          <button
                            key={style}
                            onClick={() => applyGradientStyle(style)}
                            className={`flex flex-col items-center gap-1 py-1.5 rounded border-2 transition-colors capitalize text-[10px] ${isActive ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                          >
                            <div className="w-full rounded-sm h-5" style={{ background: `linear-gradient(135deg, ${preview.from}, ${preview.to})` }} />
                            {style}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Event Logo */}
            <div className="relative">
              <button
                onClick={() => setEventLogoPanelOpen(!eventLogoPanelOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${eventLogoPanelOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"} ${testEventLogo || config.eventLogo ? "text-foreground" : ""}`}
                title="Event logo"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Event Logo
                {testEventLogo && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />}
              </button>
              {eventLogoPanelOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 rounded-lg border border-border bg-card shadow-xl p-3 z-50 space-y-2">
                  <div className="text-xs font-medium">Event Logo</div>
                  <p className="text-[10px] text-muted-foreground leading-snug">Appears on every card. Same logo for all speakers.</p>
                  {testEventLogo ? (
                    <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                      <img src={testEventLogo} alt="Event logo" className="w-full h-14 object-contain p-2" />
                      <button
                        onClick={() => { setTestEventLogo(null); try { localStorage.removeItem(eventLogoStorageKey); } catch {} }}
                        className="absolute top-1 right-1 p-0.5 bg-background/90 rounded-full shadow text-muted-foreground hover:text-foreground"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => eventLogoInputRef.current?.click()}
                      className="w-full h-12 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span className="text-xs">Upload logo</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!config.eventLogo && testEventLogo) {
                        // Adding: add element and immediately set URL so the backend receives it.
                        // Both setConfig calls use functional updaters and compose safely.
                        addElementToCanvas("eventLogo", undefined, { url: testEventLogo });
                      } else {
                        toggleElement("eventLogo");
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded border text-xs transition-colors ${config.eventLogo ? "border-primary/40 bg-primary/5 text-primary" : "border-border hover:bg-accent text-muted-foreground"}`}
                  >
                    <span>{config.eventLogo ? "On canvas" : "Add to canvas"}</span>
                    {config.eventLogo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-border" />

            {/* + Overlay */}
            <button
              onClick={() => {
                const newKey = `gradientOverlay_${Date.now()}`;
                setConfig((prev) => {
                  const maxZ = Math.max(0, ...Object.values(prev).map((c) => (c as any).zIndex || 0));
                  const next = {
                    ...prev,
                    [newKey]: {
                      ...ELEMENT_TEMPLATES.gradientOverlay,
                      x: 0,
                      y: Math.round(canvasHeight / 2),
                      width: canvasWidth,
                      height: Math.round(canvasHeight / 2),
                      gradientDirection: "bottom" as const,
                      overlayOpacity: 0.9,
                      zIndex: maxZ + 1,
                    },
                  };
                  addToHistory(next);
                  return next;
                });
                setHasUnsavedChanges(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Add a gradient overlay"
            >
              <Square className="h-3.5 w-3.5" />
              + Overlay
            </button>

            {/* + Text */}
            <button
              onClick={() => {
                const newKey = `dynamic_text_${Date.now()}`;
                const textColor = isLightColor(bgColor) ? "#111827" : "#ffffff";
                const w = Math.round(canvasWidth * 0.6);
                setConfig((prev) => {
                  const maxZ = Math.max(0, ...Object.values(prev).map((c) => (c as any).zIndex || 0));
                  const next = {
                    ...prev,
                    [newKey]: {
                      type: "dynamic-text",
                      label: "Text",
                      text: "Text",
                      x: Math.round((canvasWidth - w) / 2),
                      y: Math.round(canvasHeight * 0.4),
                      fontSize: Math.round(canvasHeight * 0.055),
                      fontFamily: "Inter",
                      color: textColor,
                      fontWeight: 700,
                      textAlign: "center",
                      width: w,
                      zIndex: maxZ + 1,
                      visible: true,
                    },
                  };
                  addToHistory(next);
                  return next;
                });
                setHasUnsavedChanges(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Add a text box"
            >
              <Type className="h-3.5 w-3.5" />
              + Text
            </button>
          </div>

          {/* Row 3: Formatting bar — alignment always-on, text formatting dims when inactive */}
          <div className="flex items-center gap-2 px-3 h-10 overflow-x-auto bg-muted/10 shrink-0">
            {/* Alignment — always visible */}
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-muted/40 rounded-md shrink-0">
              <span className="text-xs text-muted-foreground mr-1 whitespace-nowrap">Align</span>
              <button onClick={() => alignSelection("left")} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Left"><AlignStartVertical className="h-3.5 w-3.5" /></button>
              <button onClick={() => alignSelection("centerH")} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Centre H"><AlignCenterVertical className="h-3.5 w-3.5" /></button>
              <button onClick={() => alignSelection("right")} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Right"><AlignEndVertical className="h-3.5 w-3.5" /></button>
              <div className="h-3.5 w-px bg-border mx-0.5" />
              <button onClick={() => alignSelection("top")} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Top"><AlignStartHorizontal className="h-3.5 w-3.5" /></button>
              <button onClick={() => alignSelection("centerV")} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Centre V"><AlignCenterHorizontal className="h-3.5 w-3.5" /></button>
              <button onClick={() => alignSelection("bottom")} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Bottom"><AlignEndHorizontal className="h-3.5 w-3.5" /></button>
            </div>

            {/* X/Y position — single element only */}
            {selectedElement && !multiSelectActive && config[selectedElement] && (
              <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <div className="h-6 w-px bg-border mr-1" />
                <span className="text-[10px] text-muted-foreground font-mono">X</span>
                <PositionInput value={config[selectedElement].x || 0} onChange={(v) => { skipRerenderRef.current = true; const obj = elementRefs.current[selectedElement]; if (obj) { obj.set("left", v); obj.setCoords(); fabricCanvasRef.current?.requestRenderAll(); } updateElement(selectedElement, { x: v }); }} className="w-14 h-7 text-xs text-center px-1 rounded border border-border bg-background font-mono" />
                <span className="text-[10px] text-muted-foreground font-mono">Y</span>
                <PositionInput value={config[selectedElement].y || 0} onChange={(v) => { skipRerenderRef.current = true; const obj = elementRefs.current[selectedElement]; if (obj) { obj.set("top", v); obj.setCoords(); fabricCanvasRef.current?.requestRenderAll(); } updateElement(selectedElement, { y: v }); }} className="w-14 h-7 text-xs text-center px-1 rounded border border-border bg-background font-mono" />
              </div>
            )}

            {/* Text formatting — always rendered, dims when no text is active */}
            {(() => {
              const isSingleText = !!(selectedElement && (CORE_TEXT_FIELDS.includes(selectedElement as any) || config[selectedElement]?.type === "dynamic-text"));
              const isMultiText = multiSelectActive && multiSelectedKeys.length > 0 && multiSelectedKeys.every((k) => CORE_TEXT_FIELDS.includes(k as any) || config[k]?.type === "dynamic-text");
              const isTextActive = isSingleText || isMultiText;
              const activeKey = isSingleText ? selectedElement! : isMultiText ? multiSelectedKeys[0] : null;
              const applyUpdate = (updates: Partial<ElementConfig>) => {
                if (!isTextActive) return;
                if (isSingleText) { updateElement(selectedElement!, updates); }
                else { multiSelectedKeys.forEach((k) => updateElement(k, updates)); }
              };
              return (
                <>
                  <div className="h-6 w-px bg-border shrink-0" />
                  <div className={`flex items-center gap-2 shrink-0 transition-opacity ${!isTextActive ? "opacity-40 pointer-events-none" : ""}`} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <select value={config[activeKey ?? ""]?.fontFamily || "Montserrat"} onChange={(e) => applyUpdate({ fontFamily: e.target.value })} className="h-7 px-2 text-xs border border-border rounded bg-background">
                      {["Roboto","Open Sans","Lato","Montserrat","Poppins","Raleway","Noto Sans","Source Sans Pro","Merriweather","Playfair Display","Nunito","Ubuntu","PT Sans","Karla","Oswald","Fira Sans","Work Sans","Inconsolata","Josefin Sans","Alegreya","Cabin","Titillium Web","Mulish","Quicksand","Anton","Droid Sans","Archivo","Hind","Bitter","Libre Franklin"].map((f) => (<option key={f} value={f}>{f}</option>))}
                    </select>
                    <FontSizeInput value={config[activeKey ?? ""]?.fontSize || 16} onChange={(val) => applyUpdate({ fontSize: val })} className="w-12 h-7 text-xs text-center px-1 rounded border border-border bg-background font-mono" />
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-md">
                      <button onClick={() => applyUpdate({ fontWeight: config[activeKey ?? ""]?.fontWeight === 700 ? 400 : 700 })} className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${config[activeKey ?? ""]?.fontWeight === 700 ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Bold"><Bold className="h-3.5 w-3.5" /></button>
                      <button onClick={() => applyUpdate({ fontStyle: config[activeKey ?? ""]?.fontStyle === "italic" ? "normal" : "italic" })} className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${config[activeKey ?? ""]?.fontStyle === "italic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Italic"><Italic className="h-3.5 w-3.5" /></button>
                      <button onClick={() => applyUpdate({ underline: !config[activeKey ?? ""]?.underline })} className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${config[activeKey ?? ""]?.underline ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Underline"><Underline className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-md">
                      {([{val:"left",icon:<AlignLeft className="h-3.5 w-3.5" />,title:"Left"},{val:"center",icon:<AlignCenter className="h-3.5 w-3.5" />,title:"Center"},{val:"right",icon:<AlignRight className="h-3.5 w-3.5" />,title:"Right"}] as const).map(({val,icon,title}) => (
                        <button key={val} onClick={() => applyUpdate({ textAlign: val })} className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${config[activeKey ?? ""]?.textAlign === val ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title={`Align ${title}`}>{icon}</button>
                      ))}
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {["#ffffff","#000000","#374151","#dc2626","#2563eb","#16a34a","#d97706","#9333ea"].map((c) => (
                          <button key={c} onClick={() => applyUpdate({ color: c })} className="w-4 h-4 rounded-sm border border-border/60 flex-shrink-0 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                        ))}
                      </div>
                      <QuickColorPicker value={config[activeKey ?? ""]?.color || "#000000"} onChange={(hex) => applyUpdate({ color: hex })} label="Text colour" />
                      <HexColorInput value={config[activeKey ?? ""]?.color || "#000000"} onChange={(hex) => applyUpdate({ color: hex })} className="w-20 h-7 text-xs font-mono px-1.5 rounded border border-border bg-background" />
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground" title="Line height">↕</span>
                      <input type="number" value={config[activeKey ?? ""]?.lineHeight || 1.2} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0.5 && v <= 3) applyUpdate({ lineHeight: v }); }} className="w-14 h-7 text-xs text-center px-1 rounded border border-border bg-background" step={0.1} min={0.5} max={3} title="Line Height" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground" title="Letter spacing">↔</span>
                      <input type="number" value={config[activeKey ?? ""]?.charSpacing || 0} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= -100 && v <= 500) applyUpdate({ charSpacing: v }); }} className="w-14 h-7 text-xs text-center px-1 rounded border border-border bg-background" min={-100} max={500} title="Letter Spacing" />
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <input type="range" min={0} max={1} step={0.05} value={config[activeKey ?? ""]?.opacity ?? 1} onChange={(e) => applyUpdate({ opacity: parseFloat(e.target.value) })} className="w-16 h-4 accent-primary" title="Opacity" />
                    <span className="text-xs w-8 tabular-nums">{Math.round((config[activeKey ?? ""]?.opacity ?? 1) * 100)}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Elements */}
          <div
            className="relative border-r border-border/60 bg-muted/20 flex flex-col items-center pt-3 pb-4 gap-3 overflow-y-auto shrink-0"
            style={{ width: sidebarWidth }}
          >
            {/* Drag-to-resize handle */}
            <div
              className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-10 hover:bg-primary/20 transition-colors"
              onMouseDown={(e) => {
                sidebarDragging.current = true;
                sidebarDragStartX.current = e.clientX;
                sidebarDragStartW.current = sidebarWidth;
                e.preventDefault();
              }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 w-full px-3">
              Elements
            </span>

            {/* First-run getting started tip */}
            {showSidebarTip && cardType === "website" && (
              <div className="w-full px-2">
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5 relative">
                  <button
                    onClick={() => {
                      setShowSidebarTip(false);
                    }}
                    className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-accent text-muted-foreground"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-[10px] font-semibold text-primary mb-2 pr-4">
                    Getting started
                  </p>
                  <div className="space-y-1.5 pr-3">
                    {[
                      "Click to select, drag to move",
                      "Background colour — section below",
                      "Test photos — right panel",
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[9px] font-bold text-primary mt-px leading-none">
                          {i + 1}
                        </span>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Starter Templates */}
            <div className="w-full px-2">
              <button
                onClick={() => {
                  if (isPromo) {
                    setOnboardingBrandSetup(true);
                    setQuickBg("#0f172a");
                    setQuickTextColor("#ffffff");
                  } else {
                    setOnboardingShowShapePicker(true);
                  }
                  setShowOnboarding(true);
                }}
                className="w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent"
                title="Starter Templates"
              >
                <Layers className="h-5 w-5" />
                <span className="text-xs">Templates</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleBackgroundUpload}
              className="hidden"
            />

            {shouldShowElement("headshot") && (
              <div className="relative w-full px-2">
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, "headshot")}
                  onClick={(e) => {
                    const rect = (
                      e.currentTarget as HTMLElement
                    ).getBoundingClientRect();
                    setShapePopupPosition({ x: rect.right + 8, y: rect.top });
                    setShapePopupOpen(!shapePopupOpen);
                  }}
                  className={`${SIDEBAR_ELEM_BTN} ${config.headshot ? "bg-primary/10 border-2 border-primary/30" : "hover:bg-accent"}`}
                  title="Drag to canvas or click for options"
                  data-popover="true"
                >
                  <Users
                    className={`h-5 w-5 ${config.headshot ? "text-primary" : ""}`}
                  />
                  <span
                    className={`text-xs ${config.headshot ? "text-primary font-semibold" : ""}`}
                  >
                    {getFieldLabel("headshot", "Headshot")}
                  </span>
                </button>

                {/* Shape selector popup */}
                {shapePopupOpen && (
                  <div
                    className="fixed bg-card border border-border rounded-lg shadow-xl p-2 z-50 w-36"
                    style={{
                      left: shapePopupPosition.x,
                      top: shapePopupPosition.y,
                    }}
                    data-popover="true"
                  >
                    <div className="text-xs font-semibold mb-2 px-1">
                      Select Shape
                    </div>
                    {(
                      [
                        {
                          shape: "circle",
                          label: "Circle",
                          icon: "w-4 h-4 rounded-full",
                        },
                        {
                          shape: "square",
                          label: "Square",
                          icon: "w-4 h-4 rounded",
                        },
                        {
                          shape: "vertical",
                          label: "Vertical",
                          icon: "w-3 h-4 rounded",
                        },
                        {
                          shape: "horizontal",
                          label: "Horizontal",
                          icon: "w-4 h-3 rounded",
                        },
                        {
                          shape: "rounded",
                          label: "Rounded",
                          icon: "w-4 h-4 rounded-xl",
                        },
                        {
                          shape: "full-bleed",
                          label: "Full Bleed",
                          icon: "w-4 h-3",
                          extra: { x: 0, y: 0 } as Record<string, unknown>,
                        },
                      ] as Array<{
                        shape: string;
                        label: string;
                        icon: string;
                        extra?: Record<string, unknown>;
                      }>
                    ).map(({ shape, label, icon, extra }) => (
                      <button
                        key={shape}
                        onClick={() => addHeadshotShape(shape, extra)}
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                      >
                        <div
                          className={`${icon} bg-muted border border-border`}
                        />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {shouldShowElement("firstName") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "firstName")}
                onClick={() => toggleElement("firstName")}
                className={`${SIDEBAR_ELEM_BTN} ${config.firstName ? "bg-primary/10 border-2 border-primary/30" : "hover:bg-accent"}`}
                title={config.firstName ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <Type className={`h-5 w-5 ${config.firstName ? "text-primary" : ""}`} />
                <span className={`text-xs ${config.firstName ? "text-primary font-semibold" : ""}`}>{getFieldLabel("firstName", "First Name")}</span>
              </button>
            )}

            {shouldShowElement("lastName") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "lastName")}
                onClick={() => toggleElement("lastName")}
                className={`${SIDEBAR_ELEM_BTN} ${config.lastName ? "bg-primary/10 border-2 border-primary/30" : "hover:bg-accent"}`}
                title={config.lastName ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <Type className={`h-5 w-5 ${config.lastName ? "text-primary" : ""}`} />
                <span className={`text-xs ${config.lastName ? "text-primary font-semibold" : ""}`}>{getFieldLabel("lastName", "Last Name")}</span>
              </button>
            )}

            {shouldShowElement("title") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "title")}
                onClick={() => toggleElement("title")}
                className={`${SIDEBAR_ELEM_BTN} ${config.title ? "bg-primary/10 border-2 border-primary/30" : "hover:bg-accent"}`}
                title={
                  config.title
                    ? "Click to remove"
                    : "Drag to canvas or click to add"
                }
              >
                <Type
                  className={`h-5 w-5 ${config.title ? "text-primary" : ""}`}
                />
                <span
                  className={`text-xs ${config.title ? "text-primary font-semibold" : ""}`}
                >
                  {getFieldLabel("title", "Title")}
                </span>
              </button>
            )}

            {shouldShowElement("company") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "company")}
                onClick={() => toggleElement("company")}
                className={`${SIDEBAR_ELEM_BTN} ${config.company ? "bg-primary/10 border-2 border-primary/30" : "hover:bg-accent"}`}
                title={
                  config.company
                    ? "Click to remove"
                    : "Drag to canvas or click to add"
                }
              >
                <Briefcase
                  className={`h-5 w-5 ${config.company ? "text-primary" : ""}`}
                />
                <span
                  className={`text-xs ${config.company ? "text-primary font-semibold" : ""}`}
                >
                  {getFieldLabel("company", "Company")}
                </span>
              </button>
            )}

            {shouldShowElement("companyLogo") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "companyLogo")}
                onClick={() => toggleElement("companyLogo")}
                className={`${SIDEBAR_ELEM_BTN} ${config.companyLogo ? "bg-primary/10 border-2 border-primary/30" : "hover:bg-accent"}`}
                title={
                  config.companyLogo
                    ? "Click to remove"
                    : "Drag to canvas or click to add"
                }
              >
                <ImageIcon
                  className={`h-5 w-5 ${config.companyLogo ? "text-primary" : ""}`}
                />
                <span
                  className={`text-xs ${config.companyLogo ? "text-primary font-semibold" : ""}`}
                >
                  {getFieldLabel("companyLogo", "Company Logo")}
                </span>
              </button>
            )}

            {/* Dynamic fields from form builder */}
            {cardBuilderFields.length > 0 && (
              <>
                <div className="h-px w-12 bg-border" />
                {cardBuilderFields.map((field) => {
                  const Icon = getFieldIcon(field.id);
                  const fieldKey = `dynamic_${field.id}`;
                  const isActive = config[fieldKey];

                  return (
                    <button
                      key={field.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, fieldKey)}
                      onClick={() => {
                        if (isActive) {
                          // Remove if already exists
                          setHasUnsavedChanges(true);
                          setConfig((prev) => {
                            const newConfig = { ...prev };
                            delete newConfig[fieldKey];
                            return newConfig;
                          });
                          toast({
                            title: "Element removed",
                            description: `Removed ${field.label}`,
                            duration: 2000,
                          });
                        } else {
                          // Add if doesn't exist
                          const template = createDynamicElementTemplate(
                            field,
                            0,
                          );
                          addElementToCanvas(fieldKey, undefined, template);
                        }
                      }}
                      className={`${SIDEBAR_ELEM_BTN} ${isActive ? "bg-primary/10 border-2 border-primary/30" : "hover:bg-accent"}`}
                      title={
                        isActive
                          ? "Click to remove"
                          : `Drag ${field.label} to canvas or click to add`
                      }
                    >
                      <Icon
                        className={`h-5 w-5 ${isActive ? "text-primary" : ""}`}
                      />
                      <span
                        className={`text-xs line-clamp-1 w-full text-center ${isActive ? "text-primary font-semibold" : ""}`}
                      >
                        {field.label}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Center - Canvas */}
          <div
            ref={canvasContainerRef}
            className="flex-1 flex items-center justify-center bg-muted/10 p-8 relative overflow-auto"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={(e) => {
              // Deselect when clicking the grey area outside the card (not the canvas itself)
              if (e.target === e.currentTarget) {
                const canvas = fabricCanvasRef.current;
                if (canvas) {
                  canvas.discardActiveObject();
                  canvas.renderAll();
                }
                setSelectedElement(null);
                setMultiSelectActive(false);
                setMultiSelectedKeys([]);
                setContextMenu(null);
                return;
              }

              const canvas = fabricCanvasRef.current;
              // Only call fabric.findTarget when the clicked DOM node is the canvas
              // (or a descendant). Otherwise fabric's pointer logic may access
              // elements that aren't present and throw `getBoundingClientRect`.
              const canvasEl = canvasRef.current;
              if (!canvas || !canvasEl) return;
              const clickedNode = e.target as Node | null;
              if (
                !(
                  clickedNode &&
                  (clickedNode === canvasEl || canvasEl.contains(clickedNode))
                )
              ) {
                // Click happened on some overlay/child that isn't the canvas — clear context
                setContextMenu(null);
                return;
              }

              const target = canvas.findTarget(
                e.nativeEvent as unknown as Event,
                false,
              );
              if (target?.data?.elementKey) {
                canvas.setActiveObject(target);
                canvas.renderAll();
                setSelectedElement(target.data.elementKey);
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  elementKey: target.data.elementKey,
                });
              } else {
                setContextMenu(null);
              }
            }}
          >
            {/* Post-template tip modal */}
            {showCanvasTip && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 mx-4">
                  <h3 className="text-base font-semibold mb-1">
                    Your {isPromo ? "Social Card" : "Speaker Card"} template is ready
                  </h3>
                  <div className="space-y-2.5 mb-6">
                    {[
                      "Click any element to select it, then drag to move",
                      "Edit colours, fonts and size in the toolbar that appears",
                      isPromo
                        ? 'Upload your event logo using "Event Logo" in the top toolbar'
                        : "One template applies to all speakers — names and photos fill in automatically",
                      isPromo
                        ? "Hit Save — speakers can then download their personalised Social Card from the Speakers table"
                        : "Hit Save, then approve each Speaker Card individually from the Speakers tab",
                    ].map((tip, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                        </div>
                        <p className="text-xs">{tip}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={canvasTipDontShow}
                        onChange={(e) => setCanvasTipDontShow(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs text-muted-foreground">
                        Don't show again
                      </span>
                    </label>
                    <button
                      onClick={() => {
                        if (canvasTipDontShow) {
                          try { localStorage.setItem(canvasTipStorageKey, 'true'); } catch {}
                        }
                        setShowCanvasTip(false);
                      }}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state overlay */}
            {Object.keys(config).length === 0 && !templateUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="bg-card/95 border border-border rounded-xl p-6 text-center shadow-lg max-w-xs">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">Ready when you are</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Add elements from the left panel, or start from a template.
                  </p>
                  <button
                    onClick={() => {
                      if (isPromo) {
                        setOnboardingBrandSetup(true);
                        setQuickBg("#0f172a");
                        setQuickTextColor("#ffffff");
                      } else {
                        setOnboardingShowShapePicker(true);
                      }
                      setShowOnboarding(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Browse templates
                  </button>
                </div>
              </div>
            )}

            <ShadowContainer
              className="border-2 border-border rounded-lg shadow-lg overflow-hidden"
              injectStyles={injectStylesString}
            >
              <div
                className="card-root"
                style={{
                  width: canvasWidth * zoom,
                  height: canvasHeight * zoom,
                }}
              >
                <canvas ref={canvasRef} style={{ display: "block" }} />
              </div>
            </ShadowContainer>
          </div>

          {/* Right Sidebar - Preview */}
          <div className="w-56 border-l bg-card/30 p-4 overflow-y-auto space-y-5">
            {/* Header */}
            <div>
              <h3 className="text-sm font-semibold">Preview</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Upload sample images to see your design. These are never saved.
              </p>
            </div>

            {/* Headshot */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Speaker Headshot
              </Label>
              <input
                ref={headshotInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleHeadshotUpload}
                className="hidden"
              />
              {/* Always-rendered hidden input so eventLogoInputRef.current is never null */}
              <input
                ref={eventLogoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleEventLogoUpload}
                className="hidden"
              />
              {testHeadshot ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={testHeadshot}
                    alt="Test headshot"
                    className="w-full h-24 object-cover"
                  />
                  <button
                    onClick={() => setTestHeadshot(null)}
                    className="absolute top-1.5 right-1.5 p-1 bg-background/90 rounded-full shadow text-muted-foreground hover:text-foreground"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => headshotInputRef.current?.click()}
                  className="w-full h-20 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-xs">Upload headshot</span>
                </button>
              )}
            </div>

            {/* Logo */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">
                Company Logo
              </Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {testLogo ? (
                <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                  <img
                    src={testLogo}
                    alt="Test logo"
                    className="w-full h-16 object-contain p-2"
                  />
                  <button
                    onClick={() => setTestLogo(null)}
                    className="absolute top-1.5 right-1.5 p-1 bg-background/90 rounded-full shadow text-muted-foreground hover:text-foreground"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full h-16 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-xs">Upload logo</span>
                </button>
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                Logos are free-crop — any aspect ratio.
              </p>
            </div>

            {/* Tip */}
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Tip:</span>{" "}
                Double-click the headshot or logo placeholder on the canvas to
                upload directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu &&
        (() => {
          const menuW = 200,
            menuH = 340;
          const x =
            contextMenu.x + menuW > window.innerWidth
              ? contextMenu.x - menuW
              : contextMenu.x;
          const y =
            contextMenu.y + menuH > window.innerHeight
              ? contextMenu.y - menuH
              : contextMenu.y;
          return (
            <div
              className="fixed z-[9999] bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px] text-sm"
              style={{ left: Math.max(4, x), top: Math.max(4, y) }}
              onMouseLeave={() => setContextMenu(null)}
            >
              {/* Text style shortcuts */}
              {(CORE_TEXT_FIELDS.includes(contextMenu.elementKey as any) ||
                config[contextMenu.elementKey]?.type === "dynamic-text") && (
                <>
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Text
                  </div>
                  <button
                    className={CTX_MENU_BTN}
                    onClick={() => {
                      updateElement(contextMenu.elementKey, {
                        fontWeight:
                          config[contextMenu.elementKey]?.fontWeight === 700
                            ? 400
                            : 700,
                      });
                      setContextMenu(null);
                    }}
                  >
                    <Bold className="h-3.5 w-3.5" />
                    {config[contextMenu.elementKey]?.fontWeight === 700
                      ? "Remove Bold"
                      : "Bold"}
                  </button>
                  <button
                    className={CTX_MENU_BTN}
                    onClick={() => {
                      updateElement(contextMenu.elementKey, {
                        fontStyle:
                          config[contextMenu.elementKey]?.fontStyle === "italic"
                            ? "normal"
                            : "italic",
                      });
                      setContextMenu(null);
                    }}
                  >
                    <Italic className="h-3.5 w-3.5" />
                    {config[contextMenu.elementKey]?.fontStyle === "italic"
                      ? "Remove Italic"
                      : "Italic"}
                  </button>
                  <button
                    className={CTX_MENU_BTN}
                    onClick={() => {
                      updateElement(contextMenu.elementKey, {
                        underline: !config[contextMenu.elementKey]?.underline,
                      });
                      setContextMenu(null);
                    }}
                  >
                    <Underline className="h-3.5 w-3.5" />
                    {config[contextMenu.elementKey]?.underline
                      ? "Remove Underline"
                      : "Underline"}
                  </button>
                  <div className="border-t border-border my-1" />
                </>
              )}

              {/* Upload shortcuts */}
              {contextMenu.elementKey === "headshot" && (
                <>
                  <button
                    className={CTX_MENU_BTN}
                    onClick={() => {
                      headshotInputRef.current?.click();
                      setContextMenu(null);
                    }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Test Image
                  </button>
                  <div className="border-t border-border my-1" />
                </>
              )}
              {contextMenu.elementKey === "companyLogo" && (
                <>
                  <button
                    className={CTX_MENU_BTN}
                    onClick={() => {
                      logoInputRef.current?.click();
                      setContextMenu(null);
                    }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Test Logo
                  </button>
                  <div className="border-t border-border my-1" />
                </>
              )}

              {/* Arrange */}
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Arrange
              </div>
              {!FIXED_KEYS.includes(contextMenu.elementKey) && (
                <button
                  className={CTX_MENU_BTN}
                  onClick={() => {
                    duplicateElement(contextMenu.elementKey);
                    setContextMenu(null);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate{" "}
                  <span className="ml-auto text-xs text-muted-foreground">
                    Ctrl+D
                  </span>
                </button>
              )}
              <button
                className={CTX_MENU_BTN}
                onClick={() => {
                  bringToFront(contextMenu.elementKey);
                  setContextMenu(null);
                }}
              >
                <ChevronsUp className="h-3.5 w-3.5" />
                Bring to Front
              </button>
              <button
                className={CTX_MENU_BTN}
                onClick={() => {
                  bringForward(contextMenu.elementKey);
                  setContextMenu(null);
                }}
              >
                <BringForward className="h-3.5 w-3.5" />
                Bring Forward
              </button>
              <button
                className={CTX_MENU_BTN}
                onClick={() => {
                  sendBackward(contextMenu.elementKey);
                  setContextMenu(null);
                }}
              >
                <SendBackward className="h-3.5 w-3.5" />
                Send Backward
              </button>
              <button
                className={CTX_MENU_BTN}
                onClick={() => {
                  sendToBack(contextMenu.elementKey);
                  setContextMenu(null);
                }}
              >
                <ChevronsDown className="h-3.5 w-3.5" />
                Send to Back
              </button>
              <div className="border-t border-border my-1" />

              {/* Visibility & lock */}
              <button
                className={CTX_MENU_BTN}
                onClick={() => {
                  updateElement(contextMenu.elementKey, {
                    visible: !config[contextMenu.elementKey]?.visible,
                  });
                  setContextMenu(null);
                }}
              >
                {config[contextMenu.elementKey]?.visible !== false ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {config[contextMenu.elementKey]?.visible !== false
                  ? "Hide"
                  : "Show"}
              </button>
              <button
                className={CTX_MENU_BTN}
                onClick={() => {
                  toggleLock(contextMenu.elementKey);
                  setContextMenu(null);
                }}
              >
                {config[contextMenu.elementKey]?.locked ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                {config[contextMenu.elementKey]?.locked ? "Unlock" : "Lock"}
              </button>
              <div className="border-t border-border my-1" />

              {/* Delete */}
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-accent text-destructive flex items-center gap-2"
                onClick={() => {
                  setConfig((prev) => {
                    const n = { ...prev };
                    delete n[contextMenu.elementKey];
                    return n;
                  });
                  setSelectedElement(null);
                  setContextMenu(null);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Delete{" "}
                <span className="ml-auto text-xs text-muted-foreground">
                  Del
                </span>
              </button>
            </div>
          );
        })()}
    </>
  );
}
