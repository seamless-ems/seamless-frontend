/**
 * CardBuilder_SPX — Website Card Builder (Active Development)
 *
 * Fabric.js-based card design tool for creating speaker website cards.
 * This is the SPX (active) version. Do NOT modify CardBuilder.tsx (stable V1).
 *
 * ARCHITECTURE:
 *
 * 1. CONFIG STATE  — `config: CardConfig`
 *    - Flat map of elementKey → ElementConfig (position, size, styling, text)
 *    - Saved to both localStorage (immediate) and server (via createPromoConfig)
 *    - Does NOT store test image data — test images are preview-only React state
 *
 * 2. ELEMENT TYPES
 *    - "headshot"       → image dropzone placeholder; shapes: circle, square, rounded, vertical, horizontal, full-bleed
 *    - "companyLogo"    → free-form image dropzone (any aspect ratio), rendered as Fabric Group
 *    - "name/title/company" → Fabric Textbox; width-only resize via mr handle; scale locked to 1
 *    - "gradientOverlay"→ Fabric Rect with linear gradient fill; 5-stop cinematic ramp
 *    - "dynamic_*"      → generated from form config fields with showInCardBuilder: true
 *
 * 3. RENDERING (`renderAllElements`)
 *    - Called via useEffect on [config, templateUrl, testHeadshot, testLogo, bgColor]
 *    - Awaits `document.fonts.ready` before drawing — prevents blurry fallback fonts
 *    - Canvas has `enableRetinaScaling: true` for crisp HiDPI rendering
 *    - Skips elements where `cfg.visible` is falsy
 *
 * 4. SCALE MANAGEMENT
 *    - Textboxes: width stored directly, scaleX/Y always 1 (avoids compounding)
 *    - Images: actualWidth/Height from getBoundingRect() stored; scaleX/Y also stored
 *    - Groups (logo placeholder): pixel width/height from getBoundingRect(), scale cleared to 1
 *
 * 5. SNAP SYSTEM
 *    - SNAP_THRESHOLD = 10px to attract; SNAP_RELEASE = 16px to unstick
 *    - Bright pink snap lines (#FF3C78), strokeWidth 2, linger 600ms after release
 *
 * 6. SAVE / LOAD
 *    - Save: config merged with { templateUrl, canvasWidth, canvasHeight, bgColor } → server + localStorage
 *    - Load: server preferred (getPromoConfigForEvent), falls back to localStorage
 *    - NOTE: server config object includes templateUrl/canvasWidth/canvasHeight/bgColor as top-level keys
 *      alongside element keys — non-object keys are safely skipped in renderAllElements (visible check)
 *
 * DEFAULT FONT: Montserrat (closest Google Font to Gotham — all weights loaded in index.html)
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { FaLinkedin, FaTwitter, FaFacebook, FaInstagram, FaGithub } from "react-icons/fa";
import { fabric } from "fabric";
import { API_BASE } from '@/lib/api';
import { ImageCropDialog } from "@/components/ImageCropDialog";
import ShadowContainer from "@/components/ShadowContainer";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import MissingFormDialog from "@/components/MissingFormDialog";
import { getFormConfigForEvent } from "@/lib/api";
import type { FormFieldConfig } from "@/components/SpeakerFormBuilder";

type CardType = "promo" | "website";

interface CardBuilderProps {
  eventId?: string;
  fullscreen?: boolean;
  onBack?: () => void;
}

interface ElementConfig {
  [key: string]: any;
}

interface CardConfig {
  [key: string]: ElementConfig;
}

// Hex colour input — local text state so the user can type freely;
// propagates upward only when a valid 6-digit hex is complete.
// Syncs back when the external value changes (e.g. from the swatch picker).
function HexColorInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  const [text, setText] = useState(value);

  // Keep local text in sync when value changes externally (swatch pick, template load, etc.)
  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const hex = raw.startsWith('#') ? raw : '#' + raw;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) onChange(hex);
      }}
      onBlur={() => {
        // On blur, snap back to the last valid value so the field is never left in a broken state
        setText(value);
      }}
      className={className}
      maxLength={7}
      spellCheck={false}
    />
  );
}

// Font size input — local text state so the user can type freely (e.g. clear "23" fully);
// propagates only when a valid integer in [8,120] is entered; clamps + restores on blur.
function FontSizeInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (size: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setText(raw);
        const val = parseInt(raw, 10);
        if (!isNaN(val) && val >= 8 && val <= 120) onChange(val);
      }}
      onBlur={() => {
        const val = parseInt(text, 10);
        if (!isNaN(val)) {
          const clamped = Math.max(8, Math.min(120, val));
          onChange(clamped);
          setText(String(clamped));
        } else {
          setText(String(value));
        }
      }}
      className={className}
      maxLength={3}
      spellCheck={false}
    />
  );
}

// Helper to convert hex colour + alpha to rgba string
const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Helper to map form field IDs to icons and element types
const getFieldIcon = (fieldId: string) => {
  const iconMap: { [key: string]: any } = {
    linkedin: FaLinkedin,
    twitter: FaTwitter,
    facebook: FaFacebook,
    instagram: FaInstagram,
    github: FaGithub,
    website: Globe,
    // Add more mappings as needed
  };
  return iconMap[fieldId] || Type;
};

// Helper to get brand icon SVG data URLs
const getBrandIconSVG = (iconType: string): string => {
  const icons: { [key: string]: string } = {
    linkedin: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`)}`,
    twitter: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`)}`,
    facebook: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`)}`,
    instagram: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>`)}`,
    github: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`)}`,
  };
  return icons[iconType] || icons.linkedin;
};

// Helper to create dynamic element template from form field
const createDynamicElementTemplate = (field: FormFieldConfig, index: number): ElementConfig => {
  const baseY = 200 + index * 35;

  // For URL fields, create a clickable icon/button element
  if (field.type === "url" || field.id.includes("linkedin") || field.id.includes("twitter") || field.id.includes("website")) {
    return {
      label: field.label,
      type: "icon-link",
      fieldId: field.id,
      x: 50,
      y: baseY,
      size: 32,
      iconType: field.id,
      url: "", // Will be populated with actual speaker data
      visible: true,
      zIndex: 10 + index,
    };
  }

  // For text/textarea fields, create a text element
  return {
    label: field.label,
    type: "dynamic-text",
    fieldId: field.id,
    text: field.label, // Placeholder text
    x: 150,
    y: baseY,
    fontSize: 16,
    fontFamily: "Inter",
    color: "#000000",
    fontWeight: 400,
    visible: true,
    textAlign: "left",
    width: 300,
    zIndex: 10 + index,
  };
};

// Element templates
const ELEMENT_TEMPLATES = {
  headshot: {
    label: "Headshot",
    type: "image-dropzone",
    x: 50,
    y: 50,
    size: 80,
    shape: "circle",
    visible: true,
    opacity: 1,
    zIndex: 1,
  },
  name: {
    label: "Name",
    text: "Lisa Young",
    nameFormat: "single" as "single" | "two-line", // "single" = "Lisa Young", "two-line" = "Lisa\nYoung"
    x: 150,
    y: 50,
    fontSize: 32,
    fontFamily: "Montserrat",
    color: "#000000",
    fontWeight: 700,
    visible: true,
    textAlign: "left",
    width: 300,
    zIndex: 2,
  },
  title: {
    label: "Title",
    text: "Vice President of Corporate Partnerships",
    x: 150,
    y: 90,
    fontSize: 20,
    fontFamily: "Montserrat",
    color: "#000000",
    fontWeight: 500,
    visible: true,
    textAlign: "left",
    width: 300,
    zIndex: 3,
  },
  company: {
    label: "Company",
    text: "Seattle Seahawks",
    x: 150,
    y: 115,
    fontSize: 18,
    fontFamily: "Montserrat",
    color: "#000000",
    fontWeight: 400,
    visible: true,
    textAlign: "left",
    width: 300,
    zIndex: 4,
  },
  companyLogo: {
    label: "Company Logo",
    type: "image-dropzone",
    x: 50,
    y: 150,
    size: 60,
    shape: "square",
    visible: true,
    opacity: 1,
    zIndex: 5,
  },
  gradientOverlay: {
    label: "Gradient Overlay",
    type: "gradient-overlay",
    x: 0,
    y: 0,
    width: 600,
    height: 300,
    gradientColor: "#000000",
    gradientDirection: "bottom", // transparent top → solid bottom
    overlayOpacity: 0.92,
    visible: true,
    zIndex: 3,
  },
};

export default function CardBuilder({ eventId, fullscreen = false, onBack }: CardBuilderProps) {
  // State
  const location = useLocation();
  const deriveInitialCardType = (): CardType => {
    const path = (location && location.pathname) || (typeof window !== 'undefined' ? window.location.pathname : '');
    if (path.includes('/website-card-builder')) return 'website';
    if (path.includes('/promo-card-builder')) return 'promo';
    return 'promo';
  };

  const [cardType, setCardType] = useState<CardType>(deriveInitialCardType);
  const [config, setConfig] = useState<CardConfig>({});
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [multiSelectActive, setMultiSelectActive] = useState(false);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<CardConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Crop dialog
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropMode, setCropMode] = useState<"headshot" | "logo" | "template" | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState("");

  // Shape selector popup
  const [shapePopupOpen, setShapePopupOpen] = useState(false);
  const [shapePopupPosition, setShapePopupPosition] = useState({ x: 0, y: 0 });

  // Drag and drop
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const elementRefs = useRef<{ [key: string]: fabric.Object }>({});
  // Skip full canvas rebuild when only position/size changed via Fabric drag (avoids flicker)
  const skipRerenderRef = useRef(false);

  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(600);

  // Test images (preview only)
  const [testHeadshot, setTestHeadshot] = useState<string | null>(null);
  const [testLogo, setTestLogo] = useState<string | null>(null);

  // Layers panel
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Multi-selection tracking — for applying formatting to all selected text elements at once
  const [multiSelectedKeys, setMultiSelectedKeys] = useState<string[]>([]);
  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementKey: string } | null>(null);

  // Background colour
  const [bgColor, setBgColor] = useState<string>("#ffffff");

  // Template presets popup
  const [templatePresetsOpen, setTemplatePresetsOpen] = useState(false);
  const [bgPanelOpen, setBgPanelOpen] = useState(false);

  // Fetch form configuration to get fields marked for card builder
  const [missingFormDialogOpen, setMissingFormDialogOpen] = useState(false);

  const { data: formConfig } = useQuery<{ config: FormFieldConfig[] }>({
    queryKey: ["formConfig", eventId, "speaker-info"],
    queryFn: async () => {
      try {
        return await getFormConfigForEvent(eventId || "", "speaker-info");
      } catch (err: any) {
        // 404 = no form configured for this event yet — show setup dialog
        if (err && (err.status === 404 || err?.status === 404)) {
          setMissingFormDialogOpen(true);
        }
        throw err;
      }
    },
    enabled: Boolean(eventId),
  });

  // Get fields that are enabled for card builder, excluding default fields
  const DEFAULT_FIELD_IDS = ["headshot", "name", "title", "first_name", "last_name", "company_name", "company_role", "company_logo"];
  const _fieldsArray: any[] = (() => {
    if (!formConfig) return [];
    if (Array.isArray(formConfig)) return formConfig as any[];
    if (Array.isArray((formConfig as any).config)) return (formConfig as any).config as any[];
    if (Array.isArray((formConfig as any).fields)) return (formConfig as any).fields as any[];
    return [];
  })();

  const cardBuilderFields = _fieldsArray.filter(
    (field: any) => field && field.showInCardBuilder && field.enabled && !DEFAULT_FIELD_IDS.includes(field.id)
  );

  // Helper to check if a hardcoded element should be shown based on form config
  const shouldShowElement = (elementKey: string): boolean => {
    if (_fieldsArray.length === 0) return true; // Show all if no config loaded

    const fieldMapping: { [key: string]: string[] } = {
      headshot: ["headshot"],
      name: ["first_name", "last_name"],
      title: ["company_role"],
      company: ["company_name"],
      companyLogo: ["company_logo"],
    };

    const relatedFields = fieldMapping[elementKey] || [];
    // Show if ANY related field has showInCardBuilder enabled
    return relatedFields.some(fieldId => {
      const field = _fieldsArray.find((f: any) => f.id === fieldId);
      return field?.showInCardBuilder === true;
    });
  };

  // Starter template presets
  const STARTER_PRESETS = [
    {
      name: "Classic",
      description: "Photo left, text right",
      apply: () => {
        setConfig({
          headshot: { ...ELEMENT_TEMPLATES.headshot, shape: "circle", x: 40, y: 220, size: 160 },
          name: { ...ELEMENT_TEMPLATES.name, x: 230, y: 220, fontSize: 28 },
          title: { ...ELEMENT_TEMPLATES.title, x: 230, y: 265, fontSize: 18 },
          company: { ...ELEMENT_TEMPLATES.company, x: 230, y: 295, fontSize: 16 },
        });
        setCanvasWidth(600); setCanvasHeight(600);
        if (fabricCanvasRef.current) fabricCanvasRef.current.setDimensions({ width: 600, height: 600 });
        setTemplatePresetsOpen(false);
        setHasUnsavedChanges(true);
      }
    },
    {
      name: "Centred",
      description: "Everything centred",
      apply: () => {
        setConfig({
          headshot: { ...ELEMENT_TEMPLATES.headshot, shape: "circle", x: 220, y: 80, size: 160 },
          name: { ...ELEMENT_TEMPLATES.name, x: 100, y: 270, textAlign: "center", width: 400, fontSize: 30 },
          title: { ...ELEMENT_TEMPLATES.title, x: 100, y: 315, textAlign: "center", width: 400, fontSize: 18 },
          company: { ...ELEMENT_TEMPLATES.company, x: 100, y: 345, textAlign: "center", width: 400, fontSize: 16 },
        });
        setCanvasWidth(600); setCanvasHeight(600);
        if (fabricCanvasRef.current) fabricCanvasRef.current.setDimensions({ width: 600, height: 600 });
        setTemplatePresetsOpen(false);
        setHasUnsavedChanges(true);
      }
    },
    {
      name: "Overlay",
      description: "Photo full card, text over gradient",
      apply: () => {
        setConfig({
          headshot: { ...ELEMENT_TEMPLATES.headshot, shape: "square", x: 0, y: 0, size: 600 },
          gradientOverlay: { ...ELEMENT_TEMPLATES.gradientOverlay, x: 0, y: 300, width: 600, height: 300, gradientDirection: "bottom", overlayOpacity: 0.92 },
          name: { ...ELEMENT_TEMPLATES.name, x: 30, y: 430, color: "#ffffff", fontSize: 30, width: 540 },
          title: { ...ELEMENT_TEMPLATES.title, x: 30, y: 475, color: "#ffffff", fontSize: 18, width: 540 },
          company: { ...ELEMENT_TEMPLATES.company, x: 30, y: 505, color: "#cccccc", fontSize: 15, width: 540 },
        });
        setCanvasWidth(600); setCanvasHeight(600);
        if (fabricCanvasRef.current) fabricCanvasRef.current.setDimensions({ width: 600, height: 600 });
        setTemplatePresetsOpen(false);
        setHasUnsavedChanges(true);
      }
    },
  ];

  // Initialize Fabric canvas
  useEffect(() => {
    let initInterval: number | null = null;

    const createCanvas = () => {
      if (!canvasRef.current || fabricCanvasRef.current) return false;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: "#ffffff",
        selection: true,
        preserveObjectStacking: true,
        enableRetinaScaling: true,
      });

      fabricCanvasRef.current = canvas;

      // Maximise canvas text rendering quality
      const ctx = canvas.getContext() as CanvasRenderingContext2D | null;
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        (ctx as any).imageSmoothingQuality = 'high';
      }

      // Canva/PowerPoint-style control handles — small circles, thin border
      fabric.Object.prototype.cornerSize = 8;
      fabric.Object.prototype.cornerStyle = 'circle';
      fabric.Object.prototype.transparentCorners = false;
      fabric.Object.prototype.cornerColor = '#ffffff';
      fabric.Object.prototype.cornerStrokeColor = '#4F9CFB';
      fabric.Object.prototype.borderColor = '#4F9CFB';
      fabric.Object.prototype.borderScaleFactor = 1;
      fabric.Object.prototype.padding = 6;

      // Selection box style (rubber-band multi-select)
      canvas.selectionColor = 'rgba(79,156,251,0.08)';
      canvas.selectionBorderColor = '#4F9CFB';
      canvas.selectionLineWidth = 1;

      // Selection change handler
      canvas.on("selection:created", (e) => {
        const all = canvas.getActiveObjects();
        if (all.length > 1) {
          setSelectedElement(null);
          setMultiSelectActive(true);
          setMultiSelectedKeys(all.map(o => o.data?.elementKey).filter(Boolean) as string[]);
        } else {
          const obj = e.selected?.[0];
          if (obj?.data?.elementKey) setSelectedElement(obj.data.elementKey);
          setMultiSelectActive(false);
          setMultiSelectedKeys([]);
        }
      });

      canvas.on("selection:updated", (e) => {
        const all = canvas.getActiveObjects();
        if (all.length > 1) {
          setSelectedElement(null);
          setMultiSelectActive(true);
          setMultiSelectedKeys(all.map(o => o.data?.elementKey).filter(Boolean) as string[]);
        } else {
          const obj = all[0];
          if (obj?.data?.elementKey) setSelectedElement(obj.data.elementKey);
          setMultiSelectActive(false);
          setMultiSelectedKeys([]);
        }
      });

      canvas.on("selection:cleared", () => {
        setMultiSelectActive(false);
        setMultiSelectedKeys([]);
        setContextMenu(null);
      });

      // Don't auto-clear selection - keep it persistent
      // Selection only clears when:
      // 1. User selects another element (handled by selection:created/updated)
      // 2. User presses ESC (handled by keyboard listener below)
      // 3. User clicks canvas background (handled below)

      canvas.on("mouse:down", (e) => {
        setContextMenu(null); // dismiss right-click menu on any canvas click
        if (!e.target) {
          setSelectedElement(null);
          setMultiSelectActive(false);
          setMultiSelectedKeys([]);
        }
      });

      // Right-click context menu
      canvas.on("contextmenu" as any, (opt: any) => {
        opt.e.preventDefault();
        const target = canvas.findTarget(opt.e, false);
        if (target?.data?.elementKey) {
          canvas.setActiveObject(target);
          canvas.renderAll();
          setSelectedElement(target.data.elementKey);
          setContextMenu({ x: opt.e.clientX, y: opt.e.clientY, elementKey: target.data.elementKey });
        } else {
          setContextMenu(null);
        }
      });

      // Double-click on headshot/logo placeholder triggers upload directly
      canvas.on("mouse:dblclick", (e) => {
        if (e.target?.data?.elementKey === "headshot") {
          headshotInputRef.current?.click();
        } else if (e.target?.data?.elementKey === "companyLogo") {
          logoInputRef.current?.click();
        }
      });

      // Canva/Figma-style snapping
      let alignmentLines: fabric.Line[] = [];
      let snapClearTimer: number | null = null;
      // Threshold to enter snap; release needs extra movement to break out (sticky feel)
      const SNAP_THRESHOLD = 10;
      const SNAP_RELEASE = 16;
      let snapLockedX: number | null = null; // currently locked snap X position
      let snapLockedY: number | null = null; // currently locked snap Y position

      const createSnapLine = (x1: number, y1: number, x2: number, y2: number) =>
        new fabric.Line([x1, y1, x2, y2], {
          stroke: "#FF3C78",   // bright pink — visible on any background
          strokeWidth: 1,
          selectable: false,
          evented: false,
          strokeUniform: true,
          opacity: 0.9,
        });

      const clearSnapLines = () => {
        alignmentLines.forEach((l) => canvas.remove(l));
        alignmentLines = [];
        canvas.renderAll();
      };

      canvas.on("object:moving", (e) => {
        const obj = e.target;
        if (!obj) return;

        if (snapClearTimer) { clearTimeout(snapClearTimer); snapClearTimer = null; }
        clearSnapLines();

        const b = obj.getBoundingRect();
        const oL = b.left, oT = b.top, oR = b.left + b.width, oB = b.top + b.height;
        const oCX = oL + b.width / 2, oCY = oT + b.height / 2;
        const cW = canvas.width!, cH = canvas.height!;

        type SnapPoint = { dist: number; delta: number; pos: number };
        const snapX: SnapPoint[] = [];
        const snapY: SnapPoint[] = [];

        const tryX = (ref: number, val: number) => {
          const d = Math.abs(ref - val);
          if (d < SNAP_THRESHOLD) snapX.push({ dist: d, delta: val - ref, pos: val });
        };
        const tryY = (ref: number, val: number) => {
          const d = Math.abs(ref - val);
          if (d < SNAP_THRESHOLD) snapY.push({ dist: d, delta: val - ref, pos: val });
        };

        // Canvas edges, centre and thirds (like PowerPoint/Canva)
        [0, cW / 3, cW / 2, (2 * cW) / 3, cW].forEach(snap => {
          tryX(oL, snap); tryX(oR, snap); tryX(oCX, snap);
        });
        [0, cH / 3, cH / 2, (2 * cH) / 3, cH].forEach(snap => {
          tryY(oT, snap); tryY(oB, snap); tryY(oCY, snap);
        });

        // Other objects — all edge-to-edge combinations (like Canva/Figma)
        canvas.forEachObject((other) => {
          if (other === obj || !other.data?.elementKey) return;
          const ob = other.getBoundingRect();
          const tL = ob.left, tT = ob.top, tR = tL + ob.width, tB = tT + ob.height;
          const tCX = tL + ob.width / 2, tCY = tT + ob.height / 2;

          // X: left↔left, left↔right, right↔right, right↔left, center↔center
          tryX(oL, tL); tryX(oL, tR); tryX(oR, tR); tryX(oR, tL); tryX(oCX, tCX);
          // Y: top↔top, top↔bottom, bottom↔bottom, bottom↔top, center↔center
          tryY(oT, tT); tryY(oT, tB); tryY(oB, tB); tryY(oB, tT); tryY(oCY, tCY);
        });

        // X axis — sticky snap: snap in at SNAP_THRESHOLD, only release at SNAP_RELEASE
        if (snapX.length > 0) {
          snapX.sort((a, b) => a.dist - b.dist);
          const s = snapX[0];
          snapLockedX = s.pos;
          obj.set({ left: (obj.left || 0) + s.delta });
          obj.setCoords();
          alignmentLines.push(createSnapLine(s.pos, 0, s.pos, cH));
        } else if (snapLockedX !== null) {
          // Check if we've moved far enough to break free of previous snap
          const distFromLock = Math.min(
            Math.abs(oL - snapLockedX), Math.abs(oR - snapLockedX), Math.abs(oCX - snapLockedX)
          );
          if (distFromLock < SNAP_RELEASE) {
            // Stay locked — pull back to snap
            const delta = snapLockedX - oL < 0 ? snapLockedX - oR : snapLockedX - oCX < 0 ? snapLockedX - oCX : snapLockedX - oL;
            obj.set({ left: (obj.left || 0) + delta });
            obj.setCoords();
            alignmentLines.push(createSnapLine(snapLockedX, 0, snapLockedX, cH));
          } else {
            snapLockedX = null;
          }
        }

        // Y axis — sticky snap
        if (snapY.length > 0) {
          snapY.sort((a, b) => a.dist - b.dist);
          const s = snapY[0];
          snapLockedY = s.pos;
          obj.set({ top: (obj.top || 0) + s.delta });
          obj.setCoords();
          alignmentLines.push(createSnapLine(0, s.pos, cW, s.pos));
        } else if (snapLockedY !== null) {
          const distFromLock = Math.min(
            Math.abs(oT - snapLockedY), Math.abs(oB - snapLockedY), Math.abs(oCY - snapLockedY)
          );
          if (distFromLock < SNAP_RELEASE) {
            const delta = snapLockedY - oT < 0 ? snapLockedY - oB : snapLockedY - oCY < 0 ? snapLockedY - oCY : snapLockedY - oT;
            obj.set({ top: (obj.top || 0) + delta });
            obj.setCoords();
            alignmentLines.push(createSnapLine(0, snapLockedY, cW, snapLockedY));
          } else {
            snapLockedY = null;
          }
        }

        alignmentLines.forEach((l) => canvas.add(l));
        canvas.renderAll();
      });

      // Clear snap lock on release; lines linger 600ms so you can see where you snapped
      canvas.on("mouse:up", () => {
        snapLockedX = null;
        snapLockedY = null;
        if (snapClearTimer) clearTimeout(snapClearTimer);
        snapClearTimer = window.setTimeout(() => {
          clearSnapLines();
          snapClearTimer = null;
        }, 600);
      });

      canvas.on("object:modified", (e) => {
        if (snapClearTimer) clearTimeout(snapClearTimer);
        snapClearTimer = window.setTimeout(() => {
          clearSnapLines();
          snapClearTimer = null;
        }, 600);
      });

      // Update config when objects are moved/modified/resized
      canvas.on("object:modified", (e) => {
        const obj = e.target;
        if (obj?.data?.elementKey) {
          const elementKey = obj.data.elementKey;
          const updates: any = {
            x: obj.left || 0,
            y: obj.top || 0,
          };

          // Save actual pixel dimensions for images (scale relative to natural size is misleading)
          if (obj.type === "image") {
            const imgBounds = obj.getBoundingRect(true);
            updates.actualWidth = imgBounds.width;
            updates.actualHeight = imgBounds.height;
            updates.scaleX = obj.scaleX || 1;
            updates.scaleY = obj.scaleY || 1;
          }

          // Save pixel dimensions for groups (placeholders) — avoids compounding scale bugs
          if (obj.type === "group") {
            const bounds = obj.getBoundingRect(true);
            skipRerenderRef.current = true; // position-only change; no need to rebuild canvas
            setConfig(prev => {
              const newConfig = {
                ...prev,
                [elementKey]: {
                  ...prev[elementKey],
                  x: obj.left || 0,
                  y: obj.top || 0,
                  width: Math.round(bounds.width),
                  height: Math.round(bounds.height),
                  // Clear stale scale so rendering uses width/height directly
                  scaleX: 1,
                  scaleY: 1,
                },
              };
              setHasUnsavedChanges(true);
              addToHistory(newConfig);
              return newConfig;
            });
            return;
          }

          // Save actual pixel dimensions for rect (gradient overlay)
          if (obj.type === "rect") {
            updates.width = Math.round((obj.width || 300) * (obj.scaleX || 1));
            updates.height = Math.round((obj.height || 300) * (obj.scaleY || 1));
          }

          // Save width for text elements (no scale — textboxes use width only)
          if (obj.type === "textbox") {
            updates.width = obj.width || 300;
          }

          setHasUnsavedChanges(true); // Mark as unsaved when elements are modified
          skipRerenderRef.current = true; // position/size-only change; update Fabric object directly
          setConfig(prev => {
            const newConfig = {
              ...prev,
              [elementKey]: {
                ...prev[elementKey],
                ...updates,
              },
            };
            addToHistory(newConfig); // Add to undo/redo history
            return newConfig;
          });
        }
      });
    }

    // Try to create immediately, otherwise poll until the canvas element is present (Shadow DOM mounts after parent)
    if (!createCanvas()) {
      initInterval = window.setInterval(() => {
        if (createCanvas()) {
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
      fabricCanvasRef.current?.dispose();
    };
  }, []);

  // Render canvas elements
  const renderAllElements = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Wait for all fonts to be ready before rendering (prevents pixelated fallback fonts)
    try { await document.fonts.ready; } catch (_) {}

    // Clear canvas
    canvas.clear();
    canvas.backgroundColor = bgColor;
    elementRefs.current = {};

    // Render background if exists (1:1 scale, canvas is sized to match)
    if (templateUrl) {
      try {
        const bgUrl = getAbsoluteUrl(templateUrl) || templateUrl;
        const img = await loadImagePromise(bgUrl);
        const fabricImg = new fabric.Image(img, {
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          hasControls: false,
          hasBorders: false,
          scaleX: 1,
          scaleY: 1,
        });


        canvas.add(fabricImg);
        canvas.sendToBack(fabricImg);
        elementRefs.current['_background'] = fabricImg;
        canvas.renderAll();
      } catch (err) {
        toast({ title: "Failed to load background", description: String(err), variant: "destructive" });
      }
    }

    // Render elements in zIndex order (lowest first → highest renders on top)
    const sortedEntries = Object.entries(config).sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0));
    for (const [key, cfg] of sortedEntries) {
      if (!cfg.visible) continue;

      if (key === "headshot") {
        if (testHeadshot) {
          // Render actual image
          const img = await loadImagePromise(testHeadshot);
          const fabricImg = new fabric.Image(img, {
            left: cfg.x,
            top: cfg.y,
            opacity: cfg.opacity ?? 1,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: true, // Maintain aspect ratio
            data: { elementKey: "headshot" },
          });

          // Hide middle edge controls - force corner-only resizing
          fabricImg.setControlsVisibility({
            ml: false,
            mt: false,
            mr: false,
            mb: false,
          });

          // Use actual size (base size × scale) to match the resized placeholder
          const scaleX = cfg.scaleX || 1;
          const scaleY = cfg.scaleY || 1;
          const shape = cfg.shape || "circle";

          if (shape === "circle") {
            const actualSize = cfg.size * scaleX;
            const radius = actualSize / 2;
            fabricImg.set({
              clipPath: new fabric.Circle({
                radius: radius,
                originX: 'center',
                originY: 'center',
              }),
            });
            fabricImg.scaleToWidth(actualSize);
          } else if (shape === "square") {
            const actualWidth = cfg.size * scaleX;
            fabricImg.scaleToWidth(actualWidth);
          } else if (shape === "vertical") {
            // 3:4 aspect ratio (portrait)
            const actualWidth = cfg.size * scaleX;
            const actualHeight = (cfg.size * 4 / 3) * scaleY;
            fabricImg.scaleToWidth(actualWidth);
            fabricImg.set({
              clipPath: new fabric.Rect({
                width: actualWidth / fabricImg.scaleX!,
                height: actualHeight / fabricImg.scaleY!,
                originX: 'center',
                originY: 'center',
              }),
            });
          } else if (shape === "horizontal") {
            // 4:3 aspect ratio (landscape)
            const actualWidth = cfg.size * scaleX;
            const actualHeight = (cfg.size * 3 / 4) * scaleY;
            fabricImg.scaleToWidth(actualWidth);
            fabricImg.set({
              clipPath: new fabric.Rect({
                width: actualWidth / fabricImg.scaleX!,
                height: actualHeight / fabricImg.scaleY!,
                originX: 'center',
                originY: 'center',
              }),
            });
          } else if (shape === "rounded") {
            // Square with bevelled corners
            const actualWidth = cfg.size * scaleX;
            fabricImg.scaleToWidth(actualWidth);
            const rx = 16 / (fabricImg.scaleX || 1);
            fabricImg.set({
              clipPath: new fabric.Rect({
                width: actualWidth / (fabricImg.scaleX || 1),
                height: actualWidth / (fabricImg.scaleY || 1),
                rx,
                ry: rx,
                originX: 'center',
                originY: 'center',
              }),
            });
          } else if (shape === "full-bleed") {
            // Scale to cover entire canvas (object-fit: cover)
            // No clipPath needed — canvas element clips to its own bounds naturally,
            // and the ShadowContainer CSS (overflow:hidden + border-radius) handles rounding.
            const imgNaturalW = img.width || 1;
            const imgNaturalH = img.height || 1;
            const coverScale = Math.max(canvasWidth / imgNaturalW, canvasHeight / imgNaturalH);
            fabricImg.set({
              left: 0,
              top: 0,
              scaleX: coverScale,
              scaleY: coverScale,
              hasControls: false,
              lockMovementX: true,
              lockMovementY: true,
              lockScalingX: true,
              lockScalingY: true,
            });
          }

          canvas.add(fabricImg);
          elementRefs.current.headshot = fabricImg;
        } else {
          // Render placeholder - calculate actual size from base size × scale
          const shape = cfg.shape || "circle";
          const scaleX = cfg.scaleX || 1;
          const scaleY = cfg.scaleY || 1;

          let baseWidth = cfg.size;
          let baseHeight = cfg.size;

          if (shape === "vertical") {
            baseHeight = cfg.size * 4 / 3;
          } else if (shape === "horizontal") {
            baseHeight = cfg.size * 3 / 4;
          } else if (shape === "full-bleed") {
            baseWidth = canvasWidth;
            baseHeight = canvasHeight;
          }

          // Calculate actual dimensions (base × scale)
          const width = baseWidth * scaleX;
          const height = baseHeight * scaleY;

          const rect = new fabric.Rect({
            left: 0,
            top: 0,
            width: width,
            height: height,
            fill: '#e5e7eb',
            stroke: '#d1d5db',
            strokeWidth: 2,
            strokeUniform: true,
            rx: shape === "circle" ? width / 2 : shape === "rounded" || shape === "full-bleed" ? 16 : 4,
            ry: shape === "circle" ? height / 2 : shape === "rounded" || shape === "full-bleed" ? 16 : 4,
            selectable: false,
            evented: false,
          });

          const text = new fabric.Text("Headshot", {
            left: width / 2,
            top: height / 2,
            fontSize: Math.min(Math.max(14, width / 6), 20), // Cap at 20px
            fill: '#9ca3af',
            fontFamily: 'Inter',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });

          const group = new fabric.Group([rect, text], {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: true, // Force uniform scaling to maintain aspect ratio
            subTargetCheck: false,
            data: { elementKey: "headshot" },
          });

          // Hide middle edge controls - force corner-only resizing (maintains aspect ratio)
          group.setControlsVisibility({
            ml: false,
            mt: false,
            mr: false,
            mb: false,
          });

          // Full-bleed placeholder: lock position/size, snap to 0,0
          if (shape === "full-bleed") {
            group.set({
              left: 0,
              top: 0,
              lockMovementX: true,
              lockMovementY: true,
              lockScalingX: true,
              lockScalingY: true,
              hasControls: false,
            });
          }

          canvas.add(group);
          elementRefs.current.headshot = group;
        }
      } else if (key === "companyLogo") {
        if (testLogo) {
          // Render actual logo - scaled to fit the drop zone
          const img = await loadImagePromise(testLogo);
          const fabricImg = new fabric.Image(img, {
            left: cfg.x,
            top: cfg.y,
            opacity: cfg.opacity ?? 1,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: false, // Logos can be stretched freely
            data: { elementKey: "companyLogo" },
          });

          const LOGO_PAD = 10; // inset buffer so logo never clips the drop zone edge
          const dropW = cfg.width || cfg.size;
          const dropH = cfg.height || cfg.size;

          if (cfg.actualWidth) {
            // Already placed — restore saved size and position directly
            fabricImg.scaleToWidth(cfg.actualWidth);
          } else {
            // First placement — scale to fit inside the drop zone with padding
            const naturalW = (fabricImg.width as number) || 1;
            const naturalH = (fabricImg.height as number) || 1;
            const maxW = dropW - LOGO_PAD * 2;
            const maxH = dropH - LOGO_PAD * 2;
            const scale = Math.min(maxW / naturalW, maxH / naturalH);
            fabricImg.set({ scaleX: scale, scaleY: scale });
            // Centre within the drop zone
            const scaledW = naturalW * scale;
            const scaledH = naturalH * scale;
            fabricImg.set({
              left: cfg.x + (dropW - scaledW) / 2,
              top:  cfg.y + (dropH - scaledH) / 2,
            });
          }

          canvas.add(fabricImg);
          elementRefs.current.companyLogo = fabricImg;
        } else {
          // Render placeholder — use saved pixel dimensions if available, else base size
          const width = cfg.width || cfg.size || 60;
          const height = cfg.height || cfg.size || 60;

          // Two-rect approach: fill covers full group area (no gap); dashed border inset on top.
          // A single rect with stroke would render half the stroke outside the rect bounds,
          // creating a visible gap between the grey fill and the dashed border on first drop.
          const fillRect = new fabric.Rect({
            left: 0,
            top: 0,
            width: width,
            height: height,
            fill: '#e5e7eb',
            strokeWidth: 0,
            rx: 4,
            ry: 4,
            selectable: false,
            evented: false,
          });

          const borderRect = new fabric.Rect({
            left: 2,
            top: 2,
            width: width - 4,
            height: height - 4,
            fill: 'transparent',
            stroke: '#9ca3af',
            strokeWidth: 1.5,
            strokeDashArray: [5, 5],
            strokeUniform: true,
            rx: 3,
            ry: 3,
            selectable: false,
            evented: false,
          });

          const text = new fabric.Text("Logo Drop Zone", {
            left: width / 2,
            top: height / 2,
            fontSize: Math.min(Math.max(11, width / 8), 18), // Cap at 18px
            fill: '#6b7280',
            fontFamily: 'Inter',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });

          const group = new fabric.Group([fillRect, borderRect, text], {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            subTargetCheck: false,
            data: { elementKey: "companyLogo" },
          });

          // Logo: Allow all resize handles (free drag, no aspect ratio lock)
          // Don't hide any controls - user can resize width/height independently

          canvas.add(group);
          elementRefs.current.companyLogo = group;
        }
      } else if (["name", "title", "company"].includes(key)) {
        // For the name element, honour nameFormat: "two-line" splits "Lisa Young" → "Lisa\nYoung"
        let displayText = cfg.text || cfg.label;
        if (key === "name" && cfg.nameFormat === "two-line") {
          const parts = displayText.trim().split(/\s+/);
          displayText = parts.length >= 2
            ? parts.slice(0, -1).join(" ") + "\n" + parts[parts.length - 1]
            : displayText;
        }
        const text = new fabric.Textbox(displayText, {
          left: cfg.x,
          top: cfg.y,
          fontSize: cfg.fontSize,
          fontFamily: cfg.fontFamily,
          fill: cfg.color,
          // No stroke: remove hairline stroke that alters text rendering
          paintFirst: "fill" as any,
          fontWeight: cfg.fontWeight,
          fontStyle: cfg.fontStyle || "normal",
          textAlign: cfg.textAlign,
          underline: cfg.underline || false,
          lineHeight: cfg.lineHeight || 1.2,
          charSpacing: cfg.charSpacing || 0,
          width: cfg.width,
          opacity: cfg.opacity ?? 1,
          // fabric.Textbox options don't include `textBaseline` in the TypeScript defs;
          // the default baseline is acceptable, so omit this option to satisfy typings.
          selectable: true,
          editable: true,
          hasControls: true,
          lockRotation: true,
          lockUniScaling: false,
          data: { elementKey: key },
        });

        // Textboxes: only allow width resize via middle-right handle; no corner scale
        text.setControlsVisibility({
          tl: false, tr: false, bl: false, br: false,
          ml: false,
          mt: false,
          mr: true,  // Allow width resize
          mb: false,
          mtr: false,
        });
        // Never apply scale to textboxes — scale compounds and distorts fontSize
        text.set({ scaleX: 1, scaleY: 1 });

        canvas.add(text);
        elementRefs.current[key] = text;
      } else if (key.startsWith("dynamic_")) {
        // Handle dynamic fields from form builder
        if (cfg.type === "icon-link") {
          // Render social media icon/link - simple text approach like v1
          const iconColors: { [key: string]: string } = {
            linkedin: "#0A66C2", // LinkedIn official blue
            twitter: "#1DA1F2",
            facebook: "#1877F2",
            instagram: "#E4405F",
            github: "#333333",
          };

          const iconText: { [key: string]: string } = {
            linkedin: "in",
            twitter: "x",
            facebook: "f",
            instagram: "📷",
            github: "gh",
          };

          const color = iconColors[cfg.iconType] || "#666666";
          const text = iconText[cfg.iconType] || "🔗";

          const background = new fabric.Rect({
            left: 0,
            top: 0,
            width: cfg.size,
            height: cfg.size,
            fill: color,
            rx: 4,
            ry: 4,
            selectable: false,
            evented: false,
          });

          const iconLabel = new fabric.Text(text, {
            left: cfg.size / 2,
            top: cfg.size / 2,
            fontSize: cfg.size * 0.4,
            fill: '#ffffff',
            fontFamily: 'Inter',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });

          const group = new fabric.Group([background, iconLabel], {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: true, // Maintain aspect ratio
            subTargetCheck: false,
            data: { elementKey: key, type: "icon-link" },
          });

          // Corner-only controls - hide middle edge controls
          group.setControlsVisibility({
            ml: false,
            mt: false,
            mr: false,
            mb: false,
          });

          // Apply saved scale if exists
          if (cfg.scaleX !== undefined) group.set('scaleX', cfg.scaleX);
          if (cfg.scaleY !== undefined) group.set('scaleY', cfg.scaleY);

          canvas.add(group);
          elementRefs.current[key] = group;
        } else if (cfg.type === "dynamic-text") {
          // Render text field
          const text = new fabric.Textbox(cfg.text || cfg.label, {
            left: cfg.x,
            top: cfg.y,
            fontSize: cfg.fontSize,
            fontFamily: cfg.fontFamily,
            fill: cfg.color,
            // No stroke: remove hairline stroke that alters text rendering
            // @CLAUDE please do not add stroke to text as we need to make sure
            // that the backend and the frontend look the same
            paintFirst: "fill" as any,
            fontWeight: cfg.fontWeight,
            textAlign: cfg.textAlign,
            width: cfg.width,
            opacity: cfg.opacity ?? 1,
            selectable: true,
            editable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: false,
            data: { elementKey: key, type: "dynamic-text" },
          });

          // Show middle-right for width resize; hide others
          text.setControlsVisibility({
            ml: false,
            mt: false,
            mr: true,  // Allow width resize
            mb: false,
            mtr: false, // Hide rotation handle
          });

          // Apply saved scale if exists
          if (cfg.scaleX !== undefined) text.set('scaleX', cfg.scaleX);
          if (cfg.scaleY !== undefined) text.set('scaleY', cfg.scaleY);

          canvas.add(text);
          elementRefs.current[key] = text;
        }
      } else if (cfg.type === "gradient-overlay") {
        const width = cfg.width || canvasWidth;
        const height = cfg.height || canvasHeight / 2;
        const color = cfg.gradientColor || "#000000";
        const opacity = cfg.overlayOpacity ?? 0.90;
        const direction = cfg.gradientDirection || "bottom";

        // Gradient coordinate pairs: [transparent end, solid end]
        const coordMap: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {
          bottom: { x1: 0, y1: 0, x2: 0, y2: height },
          top:    { x1: 0, y1: height, x2: 0, y2: 0 },
          left:   { x1: width, y1: 0, x2: 0, y2: 0 },
          right:  { x1: 0, y1: 0, x2: width, y2: 0 },
        };
        const coords = coordMap[direction] || coordMap.bottom;

        const rect = new fabric.Rect({
          left: cfg.x || 0,
          top: cfg.y || 0,
          width,
          height,
          opacity: cfg.opacity ?? 1,
          fill: new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'pixels',
            coords,
            // Canva-matched ramp: starts at 20%, hits near-full by 75%
            // Feels heavier/more readable than the old 45%-start ramp
            colorStops: [
              { offset: 0,    color: hexToRgba(color, 0) },
              { offset: 0.20, color: hexToRgba(color, 0) },
              { offset: 0.50, color: hexToRgba(color, opacity * 0.55) },
              { offset: 0.75, color: hexToRgba(color, opacity * 0.88) },
              { offset: 1,    color: hexToRgba(color, opacity) },
            ],
          }),
          selectable: true,
          hasControls: true,
          lockRotation: true,
          data: { elementKey: key, type: "gradient-overlay" },
        });

        canvas.add(rect);
        elementRefs.current[key] = rect;
      }
    }

    canvas.renderAll();
  };

  // Helper to load images
  const loadImagePromise = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  // Normalize template URLs: if the URL is relative (starts with '/'),
  // prefix with API_BASE so requests go to the backend (not the frontend dev server).
  const getAbsoluteUrl = (url: string | null | undefined) => {
    if (!url) return url;
    try {
      // If url already absolute (has protocol), return as-is
      const parsed = new URL(url);
      return parsed.href;
    } catch (e) {
      // Not an absolute URL — likely a path like '/uploads/...'
      // Ensure API_BASE does not end up with double slashes
      const base = API_BASE?.replace(/\/$/, "") || "";
      if (!base) return url; // fallback to raw value
      return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
    }
  };

  // Re-render when config changes (skip if only position/size was updated via Fabric drag)
  useEffect(() => {
    if (skipRerenderRef.current) {
      skipRerenderRef.current = false;
      return;
    }
    if (fabricCanvasRef.current) {
      renderAllElements();
    }
  }, [config, templateUrl, testHeadshot, testLogo, bgColor]);

  // Keyboard shortcuts for undo/redo and arrow key nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/redo fire globally — must be checked BEFORE the input guard
      // because Fabric.js keeps a hidden <textarea> focused on the canvas.
      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Don't handle other shortcuts if user is typing in a real input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        return;
      }
      // Allow Delete/Arrow/Escape through from Fabric's hidden textarea, but
      // block them from real textareas (e.g. text editing inside a Textbox).
      if (target.tagName === 'TEXTAREA' && !target.hasAttribute('data-fabric-hiddentextarea')) {
        return;
      }

      // ESC: Deselect (clear selection)
      if (e.key === 'Escape') {
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        e.preventDefault();
        setConfig(prev => {
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
      let moved = false;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          activeObject.set('left', (activeObject.left || 0) - nudgeAmount);
          moved = true;
          break;
        case 'ArrowRight':
          e.preventDefault();
          activeObject.set('left', (activeObject.left || 0) + nudgeAmount);
          moved = true;
          break;
        case 'ArrowUp':
          e.preventDefault();
          activeObject.set('top', (activeObject.top || 0) - nudgeAmount);
          moved = true;
          break;
        case 'ArrowDown':
          e.preventDefault();
          activeObject.set('top', (activeObject.top || 0) + nudgeAmount);
          moved = true;
          break;
      }

      if (moved) {
        activeObject.setCoords();
        canvas.requestRenderAll();

        // Update config
        if (activeObject.data?.elementKey) {
          updateElement(activeObject.data.elementKey, {
            x: activeObject.left || 0,
            y: activeObject.top || 0,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, selectedElement]);

  // Close shape popup when clicking outside (Templates/BG are inline, no close-outside needed)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shapePopupOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-popover]')) {
          setShapePopupOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shapePopupOpen]);

  // Auto-save: 3 seconds after any change, silently persist to localStorage + server.
  // The orange dot on Save still shows until explicitly dismissed; auto-save just prevents data loss.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const timer = window.setTimeout(() => {
      handleSave(true); // silent=true — no toast
    }, 3000);
    return () => clearTimeout(timer);
  }, [config, bgColor, templateUrl, canvasWidth, canvasHeight, hasUnsavedChanges]);

  // Load saved config on mount: prefer server config for eventId, fallback to localStorage
  useEffect(() => {
    const storageKey = `${cardType}-card-config-${eventId || "default"}`;

    const loadFromLocal = () => {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      try {
        const { config: savedConfig, templateUrl: savedTemplateUrl, canvasWidth: savedWidth, canvasHeight: savedHeight, bgColor: savedBgColor } = JSON.parse(saved);
        if (savedConfig) {
          setConfig(savedConfig);
          setHasUnsavedChanges(false);
        }
        if (savedBgColor) setBgColor(savedBgColor);

        // Load canvas dimensions if saved (preferred method)
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

        if (savedTemplateUrl) {
          // Load background image to get its dimensions (fallback if dimensions not saved)
          const img = new Image();
          img.onerror = (err) => {
            toast({ title: "Background load failed", description: "Could not load background image due to CORS or network error. Try re-uploading the image.", variant: "destructive" });
            // clear template to avoid broken image state
            setTemplateUrl(null);
          };
          img.onload = () => {
            // Update canvas dimensions to match background (only if not already set from saved data)
            if (!savedWidth || !savedHeight) {
              setCanvasWidth(img.width);
              setCanvasHeight(img.height);

              // Resize Fabric canvas
              if (fabricCanvasRef.current) {
                fabricCanvasRef.current.setDimensions({
                  width: img.width,
                  height: img.height,
                });
              }
            }

            // Set background URL (will trigger re-render)
            setTemplateUrl(savedTemplateUrl);
          };
          img.src = getAbsoluteUrl(savedTemplateUrl) || savedTemplateUrl;
        }
        toast({ title: "Loaded", description: "Restored your previous card", duration: 2000 });
      } catch (err) {
        
      }
    };

    // If we have an eventId, prefer fetching server config
    if (eventId) {
      (async () => {
        try {
          const api = await import("@/lib/api");
          const res = await api.getPromoConfigForEvent(eventId, cardType);

          // server may return { config: {...}, ... } or the config directly
          const serverConfig = res?.config ?? res;

          // If server returned a config object, use it
          if (serverConfig && typeof serverConfig === "object") {
            // serverConfig may be the saved config object (with templateUrl, canvasWidth/Height)
            const savedConfig = serverConfig;
            const savedTemplateUrl = serverConfig.templateUrl ?? null;
            const savedWidth = serverConfig.canvasWidth ?? serverConfig.canvas_width ?? null;
            const savedHeight = serverConfig.canvasHeight ?? serverConfig.canvas_height ?? null;

            if (savedConfig) {
              // Merge: server config as base, but restore x/y/width/height from localStorage.
              // localStorage is written before the server save (and on every drag via auto-save),
              // so its positions are always at least as fresh as the server.
              // This prevents the server returning stale positions from overwriting recent drags.
              let configToSet = savedConfig;
              try {
                const localRaw = localStorage.getItem(storageKey);
                if (localRaw) {
                  const { config: localConfig } = JSON.parse(localRaw);
                  if (localConfig && typeof localConfig === 'object') {
                    const merged = { ...savedConfig };
                    for (const key of Object.keys(merged)) {
                      if (merged[key]?.visible && localConfig[key]) {
                        merged[key] = {
                          ...merged[key],
                          ...(localConfig[key].x !== undefined ? { x: localConfig[key].x } : {}),
                          ...(localConfig[key].y !== undefined ? { y: localConfig[key].y } : {}),
                          ...(localConfig[key].width !== undefined ? { width: localConfig[key].width } : {}),
                          ...(localConfig[key].height !== undefined ? { height: localConfig[key].height } : {}),
                        };
                      }
                    }
                    configToSet = merged;
                  }
                }
              } catch (e) { /* ignore localStorage errors */ }
              setConfig(configToSet);
              setHasUnsavedChanges(false);
            }

            if (savedWidth && savedHeight) {
              setCanvasWidth(savedWidth);
              setCanvasHeight(savedHeight);
              if (fabricCanvasRef.current) {
                fabricCanvasRef.current.setDimensions({ width: savedWidth, height: savedHeight });
              }
            }

            if (savedTemplateUrl) {
              const img = new Image();
              img.onload = () => {
                if (!savedWidth || !savedHeight) {
                  setCanvasWidth(img.width);
                  setCanvasHeight(img.height);
                  if (fabricCanvasRef.current) {
                    fabricCanvasRef.current.setDimensions({ width: img.width, height: img.height });
                  }
                }
                setTemplateUrl(savedTemplateUrl);
              };
              img.src = getAbsoluteUrl(savedTemplateUrl) || savedTemplateUrl;
            }

            toast({ title: "Loaded", description: "Loaded template from event", duration: 2000 });
            return;
          }

          // If no server config found, fall back to localStorage
          loadFromLocal();
        } catch (err) {
          
          // fallback
          loadFromLocal();
        }
      })();
    } else {
      // No eventId -> use local storage
      loadFromLocal();
    }
  }, [eventId, cardType]); // Load when eventId or cardType changes

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, elementKey: string) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", elementKey);
    setDraggingElement(elementKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const elementKey = e.dataTransfer.getData("text/plain");

    if (!elementKey) {
      setDraggingElement(null);
      return;
    }

    // If headshot and not yet added, show shape selector at drop position
    if (elementKey === "headshot" && !config.headshot) {
      setShapePopupPosition({ x: e.clientX, y: e.clientY });
      setShapePopupOpen(true);
      setDraggingElement(null);

      // Store the drop position for when shape is selected
      (window as any).__headshotDropPos = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvas = fabricCanvasRef.current;
    const canvasElement = canvasRef.current;
    if (!canvas || !canvasElement) return;

    // Calculate position relative to canvas (accounting for zoom)
    const rect = canvasElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Get template (from static templates or create dynamic one)
    let template = ELEMENT_TEMPLATES[elementKey as keyof typeof ELEMENT_TEMPLATES] as ElementConfig;

    // Handle dynamic fields
    if (!template && elementKey.startsWith("dynamic_")) {
      const fieldId = elementKey.replace("dynamic_", "");
      const field = cardBuilderFields.find(f => f.id === fieldId);
      if (field) {
        template = createDynamicElementTemplate(field, 0);
      }
    }

    if (!template) {
      
      setDraggingElement(null);
      return;
    }

    // Center the element at drop position
    let adjustedX = x;
    let adjustedY = y;

    if (template.size) {
      // Image elements - center at drop point
      adjustedX = x - template.size / 2;
      adjustedY = y - template.size / 2;
    } else if (template.width) {
      // Text elements - center at drop point
      adjustedX = x - template.width / 2;
      adjustedY = y - 10;
    }

    // Add element at calculated position
    setHasUnsavedChanges(true);
    setConfig(prev => {
      const maxZ = Math.max(0, ...Object.values(prev).map(c => c.zIndex || 0));
      const newConfig = {
        ...prev,
        [elementKey]: {
          ...template,
          x: adjustedX,
          y: adjustedY,
          zIndex: maxZ + 1,
        },
      };

      addToHistory(newConfig);
      return newConfig;
    });

    setDraggingElement(null);
    toast({ title: "Element added", description: `${template.label} added to canvas` });
  };

  // Add element to canvas
  // Toggle element - remove if exists, add if not
  const toggleElement = (elementKey: string) => {
    if (config[elementKey]) {
      // Element exists - remove it
      setHasUnsavedChanges(true);
      setConfig(prev => {
        const newConfig = { ...prev };
        delete newConfig[elementKey];
        return newConfig;
      });
      toast({ title: "Element removed", description: `Removed ${elementKey}`, duration: 2000 });
    } else {
      // Element doesn't exist - add it
      addElementToCanvas(elementKey);
    }
  };

  const addElementToCanvas = (elementKey: string, customPos?: { x: number, y: number }, customProps?: any) => {
    const template = ELEMENT_TEMPLATES[elementKey as keyof typeof ELEMENT_TEMPLATES] as ElementConfig;
    if (!template) return;

    // Use custom position if provided, otherwise center element
    let posX: number, posY: number;
    if (customPos) {
      const canvas = fabricCanvasRef.current;
      const canvasElement = canvasRef.current;
      if (canvas && canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const x = (customPos.x - rect.left) / zoom;
        const y = (customPos.y - rect.top) / zoom;

        if (template.size) {
          posX = x - template.size / 2;
          posY = y - template.size / 2;
        } else if (template.width) {
          posX = x - template.width / 2;
          posY = y - 10;
        } else {
          posX = x;
          posY = y;
        }
      } else {
        posX = canvasWidth / 2;
        posY = canvasHeight / 2;
      }
    } else if (template.size) {
      posX = canvasWidth / 2 - template.size / 2;
      posY = canvasHeight / 2 - template.size / 2;
    } else if (template.width) {
      posX = canvasWidth / 2 - template.width / 2;
      posY = canvasHeight / 2 - 10;
    } else {
      posX = canvasWidth / 2;
      posY = canvasHeight / 2;
    }

    setHasUnsavedChanges(true);
    setConfig(prev => {
      const maxZ = Math.max(0, ...Object.values(prev).map(c => c.zIndex || 0));
      const newConfig = {
        ...prev,
        [elementKey]: {
          ...template,
          ...customProps, // Apply custom properties like shape
          // Allow customProps to explicitly set position (e.g. full-bleed forces x:0, y:0)
          x: customProps?.x !== undefined ? customProps.x : posX,
          y: customProps?.y !== undefined ? customProps.y : posY,
          zIndex: maxZ + 1,
        },
      };

      // Add to history with the NEW config
      addToHistory(newConfig);
      return newConfig;
    });

    toast({ title: "Element added", description: `${template.label} added to canvas` });
  };

  // Update element properties
  const updateElement = (elementKey: string, updates: Partial<ElementConfig>) => {
    setHasUnsavedChanges(true);
    setConfig(prev => {
      const newConfig = {
        ...prev,
        [elementKey]: {
          ...prev[elementKey],
          ...updates,
        },
      };

      // Update the fabric object directly for immediate visual feedback
      const fabricObj = elementRefs.current[elementKey];
      if (fabricObj && 'fontSize' in fabricObj) {
        const textObj = fabricObj as fabric.Text;

        if (updates.fontSize !== undefined) textObj.set('fontSize', updates.fontSize);
        if (updates.color !== undefined) textObj.set('fill', updates.color);
        if (updates.fontWeight !== undefined) textObj.set('fontWeight', updates.fontWeight);
        if (updates.fontStyle !== undefined) textObj.set('fontStyle', updates.fontStyle);
        if (updates.fontFamily !== undefined) textObj.set('fontFamily', updates.fontFamily);
        if (updates.textAlign !== undefined) textObj.set('textAlign', updates.textAlign);
        if (updates.underline !== undefined) textObj.set('underline', updates.underline);
        if (updates.lineHeight !== undefined) textObj.set('lineHeight', updates.lineHeight);
        if (updates.charSpacing !== undefined) textObj.set('charSpacing', updates.charSpacing);

        fabricCanvasRef.current?.requestRenderAll();
      }

      addToHistory(newConfig);
      return newConfig;
    });
  };

  // History management
  const addToHistory = (newConfig: CardConfig) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newConfig)));
      return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const newZoom = Math.min(zoom + 0.1, 3);

    // Resize canvas display dimensions
    canvas.setDimensions({
      width: canvasWidth * newZoom,
      height: canvasHeight * newZoom
    });

    // Set zoom from top-left (0,0) to keep content positioned correctly
    canvas.setViewportTransform([newZoom, 0, 0, newZoom, 0, 0]);
    setZoom(newZoom);
    canvas.renderAll();
  };

  const handleZoomOut = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const newZoom = Math.max(zoom - 0.1, 0.1);

    // Resize canvas display dimensions
    canvas.setDimensions({
      width: canvasWidth * newZoom,
      height: canvasHeight * newZoom
    });

    // Set zoom from top-left (0,0) to keep content positioned correctly
    canvas.setViewportTransform([newZoom, 0, 0, newZoom, 0, 0]);
    setZoom(newZoom);
    canvas.renderAll();
  };

  const handleZoomFit = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setZoom(1);
    const objects = canvas.getObjects();

    if (objects.length === 0) {
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      setZoom(1);
      canvas.renderAll();
      return;
    }

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
      const bounds = obj.getBoundingRect();
      minX = Math.min(minX, bounds.left);
      minY = Math.min(minY, bounds.top);
      maxX = Math.max(maxX, bounds.left + bounds.width);
      maxY = Math.max(maxY, bounds.top + bounds.height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    const padding = 50;
    const zoomX = (canvasWidth - padding * 2) / contentWidth;
    const zoomY = (canvasHeight - padding * 2) / contentHeight;
    const newZoom = Math.min(zoomX, zoomY, 1);

    canvas.setZoom(newZoom);

    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;
    const viewportTransform = canvas.viewportTransform;
    if (viewportTransform) {
      viewportTransform[4] = canvasCenterX - contentCenterX * newZoom;
      viewportTransform[5] = canvasCenterY - contentCenterY * newZoom;
    }

    setZoom(newZoom);
    canvas.requestRenderAll();
  };

  // Alignment — PowerPoint/Canva standard:
  //   Single element  → aligns to canvas edges/centre
  //   Multi-select    → aligns to the group's own bounding box (not the canvas)
  //
  // Implementation: compute all new positions first, then apply in ONE setConfig call
  // so renderAllElements only fires once and nothing gets wiped mid-operation.
  const alignSelection = (direction: 'left' | 'right' | 'centerH' | 'top' | 'bottom' | 'centerV') => {
    const keys = multiSelectedKeys.length > 0
      ? multiSelectedKeys
      : selectedElement ? [selectedElement] : [];
    if (keys.length === 0) return;

    // getBoundingRect(true) returns absolute canvas-space coords even when the
    // object is inside a Fabric ActiveSelection group.
    const items = keys.flatMap(key => {
      const obj = elementRefs.current[key];
      if (!obj) return [];
      const bounds = obj.getBoundingRect(true);
      return [{ key, bounds }];
    });
    if (items.length === 0) return;

    const updates: Record<string, { x: number; y: number }> = {};

    if (items.length === 1) {
      // Single: align to canvas
      const { key, bounds } = items[0];
      let newX = bounds.left, newY = bounds.top;
      switch (direction) {
        case 'left':    newX = 0; break;
        case 'right':   newX = canvasWidth - bounds.width; break;
        case 'centerH': newX = (canvasWidth - bounds.width) / 2; break;
        case 'top':     newY = 0; break;
        case 'bottom':  newY = canvasHeight - bounds.height; break;
        case 'centerV': newY = (canvasHeight - bounds.height) / 2; break;
      }
      updates[key] = { x: newX, y: newY };
    } else {
      // Multi: align to the selection's own bounding box
      const selLeft    = Math.min(...items.map(i => i.bounds.left));
      const selRight   = Math.max(...items.map(i => i.bounds.left + i.bounds.width));
      const selTop     = Math.min(...items.map(i => i.bounds.top));
      const selBottom  = Math.max(...items.map(i => i.bounds.top + i.bounds.height));
      const selCenterX = (selLeft + selRight) / 2;
      const selCenterY = (selTop + selBottom) / 2;

      items.forEach(({ key, bounds }) => {
        let newX = bounds.left, newY = bounds.top;
        switch (direction) {
          case 'left':    newX = selLeft; break;
          case 'right':   newX = selRight - bounds.width; break;
          case 'centerH': newX = selCenterX - bounds.width / 2; break;
          case 'top':     newY = selTop; break;
          case 'bottom':  newY = selBottom - bounds.height; break;
          case 'centerV': newY = selCenterY - bounds.height / 2; break;
        }
        updates[key] = { x: newX, y: newY };
      });
    }

    // Single config update → single renderAllElements call, nothing vanishes
    setConfig(prev => {
      const next = { ...prev };
      Object.entries(updates).forEach(([key, { x, y }]) => {
        next[key] = { ...prev[key], x, y };
      });
      return next;
    });
  };

  // Background upload - no crop needed, canvas adjusts to image size
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const allowed = ["image/png", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PNG or JPEG image", variant: "destructive" });
      return;
    }

    try {
      // Convert to data URL
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;

        // Load image to get dimensions
        const img = await loadImagePromise(dataUrl);

        // Update canvas dimensions to match background
        setCanvasWidth(img.width);
        setCanvasHeight(img.height);

        // Resize Fabric canvas and reset zoom to 1 so dimensions are clean
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.setDimensions({
            width: img.width,
            height: img.height,
          });
          fabricCanvasRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
        }
        setZoom(1);

        // Set background URL (will trigger re-render)
        setTemplateUrl(dataUrl);

        toast({
          title: "Background uploaded",
          description: `Canvas: ${img.width}x${img.height}. Use zoom controls if needed.`,
          duration: 3000
        });
      };
      reader.onerror = () => {
        
        toast({ title: "Upload failed", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      
      toast({ title: "Upload failed", variant: "destructive" });
    }

    // Clear file input so same file can be selected again
    e.target.value = '';
  };

  // Headshot upload
  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const allowed = ["image/png", "image/jpeg"];
    if (!file) return;
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Headshot must be PNG or JPEG", variant: "destructive" });
      e.target.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
    setCropMode("headshot");
    setCropDialogOpen(true);
  };

  // Logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const allowed = ["image/png", "image/jpeg"];
    if (!file) return;
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Logo must be PNG or JPEG", variant: "destructive" });
      e.target.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
    setCropMode("logo");
    setCropDialogOpen(true);
  };

  const handleCropComplete = async (blob: Blob) => {
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(new Error("read error"));
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      if (cropMode === "template") {
        setTemplateUrl(dataUrl);
        toast({ title: "Background uploaded" });
      } else if (cropMode === "headshot") {
        setTestHeadshot(dataUrl);

        // Auto-add headshot element if it doesn't exist
        if (!config.headshot) {
          addElementToCanvas("headshot");
        }

        toast({ title: "Test headshot uploaded" });
      } else if (cropMode === "logo") {
        setTestLogo(dataUrl);

        // Auto-add logo element if it doesn't exist
        if (!config.companyLogo) {
          addElementToCanvas("companyLogo");
        }

        toast({ title: "Test logo uploaded" });
      }
    } catch (err) {
      
      toast({ title: "Image error", variant: "destructive" });
    } finally {
      setCropDialogOpen(false);
      setCropImageUrl("");
      setCropMode(null);
    }
  };

  // Save — pass silent=true from auto-save to suppress the toast
  const handleSave = async (silent = false) => {
    const storageKey = `${cardType}-card-config-${eventId || "default"}`;
    localStorage.setItem(storageKey, JSON.stringify({ config, templateUrl, canvasWidth, canvasHeight, bgColor }));

    // Also save to backend if eventId exists
    if (eventId) {
      try {
        // Dynamically import API helpers so this file doesn't eagerly bundle all api methods
        const api = await import("@/lib/api");
        const { createPromoConfig, uploadFile } = api;

        // If templateUrl is a data: or blob: URL, upload it to the /uploads endpoint
        // and replace it with the returned public URL when saving to the server.
        let finalTemplateUrl = templateUrl;

        if (templateUrl && (templateUrl.startsWith("data:") || templateUrl.startsWith("blob:"))) {
          try {
            // Convert data/blob URL to a Blob, then to a File for upload
            const fetched = await fetch(templateUrl);
            const blob = await fetched.blob();
            const fileName = `template-${Date.now()}`;
            const file = new File([blob], `${fileName}.${(blob.type || "image/png").split("/").pop()}`, { type: blob.type || "image/png" });

            const uploadRes = await uploadFile(file, undefined, eventId);
            const uploadedUrl = uploadRes?.public_url ?? uploadRes?.publicUrl ?? uploadRes?.url ?? uploadRes?.id ?? null;

            if (uploadedUrl) {
              finalTemplateUrl = uploadedUrl;
              // update local state so UI reflects the server URL
              setTemplateUrl(finalTemplateUrl);
            }
          } catch (uploadErr) {
            
            // Continue and attempt to save the data URL if upload fails; notify user
            toast({ title: "Upload failed", description: "Could not upload background image to server. Saved locally instead.", variant: "destructive" });
          }
        }

        // Save the full config to the promo-cards API (include canvas dimensions for proper scaling)
        const saved = await createPromoConfig({
          eventId,
          promoType: cardType,
          config: {
            ...config,
            templateUrl: finalTemplateUrl, // include uploaded URL when available; server may normalize/override
            canvasWidth, // Save canvas dimensions for scaling
            canvasHeight,
            bgColor,
          },
        });

        // Prefer the canonical templateUrl returned by the server's config endpoint
        const serverTemplateUrl = saved?.templateUrl ?? saved?.config?.templateUrl ?? saved?.config?.template_url ?? null;
        if (serverTemplateUrl) {
          setTemplateUrl(serverTemplateUrl);
          // update localStorage entry so the canonical URL is persisted locally too
          try {
            const storageKey = `${cardType}-card-config-${eventId || "default"}`;
            const existing = localStorage.getItem(storageKey);
            const parsed = existing ? JSON.parse(existing) : {};
            parsed.templateUrl = serverTemplateUrl;
            localStorage.setItem(storageKey, JSON.stringify(parsed));
          } catch (e) {
            // ignore localStorage errors
          }
        }

        if (!silent) toast({ title: "Saved", description: `${cardType === "promo" ? "Promo" : "Website"} card template saved` });
      } catch (err: any) {

        if (!silent) toast({ title: "Saved locally", description: "Template saved to browser, but failed to sync with server" });
      }
    } else {
      if (!silent) toast({ title: "Saved", description: `${cardType === "promo" ? "Promo" : "Website"} card saved locally` });
    }

    setHasUnsavedChanges(false);
  };

  // Export PNG — reset zoom/transform first so we always get the full 1:1 card
  const handleExport = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Snapshot current viewport state
    const savedTransform = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
    const savedW = canvas.getWidth();
    const savedH = canvas.getHeight();

    // Reset to 1:1 for clean export
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });

    const dataURL = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });

    // Restore previous viewport
    canvas.setDimensions({ width: savedW, height: savedH });
    canvas.setViewportTransform(savedTransform as [number, number, number, number, number, number]);
    canvas.renderAll();

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `${cardType}-card-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Exported", description: "Card downloaded as PNG" });
  };

  // Reset - clear everything and start fresh
  const handleReset = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset the card?\n\nThis will clear all elements and the background. This action cannot be undone."
    );

    if (!confirmed) return;

    // Clear config and template
    setConfig({});
    setTemplateUrl(null);
    setTestHeadshot(null);
    setTestLogo(null);
    setSelectedElement(null);

    // Reset canvas to default size (Square 600×600 — best practice for speaker cards)
    setCanvasWidth(600);
    setCanvasHeight(600);
    setBgColor("#ffffff");

    // Clear localStorage
    const storageKey = `${cardType}-card-config-${eventId || "default"}`;
    localStorage.removeItem(storageKey);

    // Reset history
    setHistory([]);
    setHistoryIndex(-1);
    setHasUnsavedChanges(false);

    // Clear canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.setDimensions({ width: 600, height: 600 });
      fabricCanvasRef.current.backgroundColor = "#ffffff";
      fabricCanvasRef.current.requestRenderAll();
    }

    // Reset file inputs so the same file can be re-selected after reset
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (headshotInputRef.current) headshotInputRef.current.value = "";
    if (logoInputRef.current) logoInputRef.current.value = "";

    toast({
      title: "Card reset",
      description: "Started with a fresh canvas",
      duration: 2000
    });
  };

  // Generate standalone HTML snapshot of the current card config
  const escapeHTML = (s: any) => {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const generateCardHTML = () => {
    // Build HTML that matches backend structure (hard-coded acceptable)
    const templateBg = templateUrl ? templateUrl : '';
    const headshotSrc = testHeadshot || (config.headshot && config.headshot.src) || '';
    const logoSrc = testLogo || (config.companyLogo && config.companyLogo.src) || '';

    const nameEl = config.name || {};
    const titleEl = config.title || {};
    const companyEl = config.company || {};
    const headshotEl = config.headshot || {};
    const logoEl = config.companyLogo || {};

    // Collect font families used by visible text elements so we can load them from Google Fonts
    const usedFontFamilies = Array.from(
      new Set([
        nameEl.fontFamily,
        titleEl.fontFamily,
        companyEl.fontFamily,
      ].filter(Boolean))
    );

    const fontFamilyFallback = usedFontFamilies[0] || nameEl.fontFamily || titleEl.fontFamily || companyEl.fontFamily || 'Inter';
    const googleFontsHref = usedFontFamilies.length
      ? `https://fonts.googleapis.com/css2?${usedFontFamilies.map(f => `family=${String(f).replace(/\s+/g,'+')}:wght@300;400;500;600;700;800`).join('&')}&display=swap`
      : '';

    const cardStyle = `width: ${canvasWidth}px; height: ${canvasHeight}px; position: relative; background-color: ${escapeHTML(bgColor)}; background-image: ${templateBg ? `url('${escapeHTML(templateBg)}')` : 'none'}; background-size: cover; overflow: hidden; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);`;

    const _isFullBleed = headshotEl.shape === 'full-bleed';
    const headshotLeft = _isFullBleed ? 0 : (headshotEl.x || 0);
    const headshotTop = _isFullBleed ? 0 : (headshotEl.y || 0);
    const headshotW = _isFullBleed ? canvasWidth : (headshotEl.size || headshotEl.width || 80);
    const headshotH = _isFullBleed ? canvasHeight : (headshotEl.size || headshotEl.height || headshotW);

    const logoLeft = logoEl.x || 0;
    const logoTop = logoEl.y || 0;
    const logoW = logoEl.size || logoEl.width || 60;
    const logoH = logoEl.size || logoEl.height || logoW;

    const nameLeft = nameEl.x || 0;
    const nameTop = nameEl.y || 0;
    const nameW = nameEl.width || 300;
    const nameFS = nameEl.fontSize || 32;
    const nameFW = nameEl.fontWeight || 700;

    const titleLeft = titleEl.x || 0;
    const titleTop = titleEl.y || 0;
    const titleW = titleEl.width || 300;
    const titleFS = titleEl.fontSize || 20;
    const titleFW = titleEl.fontWeight || 500;

    const companyLeft = companyEl.x || 0;
    const companyTop = companyEl.y || 0;
    const companyW = companyEl.width || 300;
    const companyFS = companyEl.fontSize || 18;
    const companyFW = companyEl.fontWeight || 400;

    const fullName = String(nameEl.text || nameEl.label || '').trim();
    const firstName = fullName.split(/\s+/).shift() || '';
    const lastName = fullName.split(/\s+/).slice(1).join(' ') || '';

    // Headshot shape border-radius for HTML output
    const headshotShape = headshotEl.shape || 'circle';
    const headshotBorderRadius = headshotShape === 'circle' ? 'border-radius: 50%;' : headshotShape === 'rounded' ? 'border-radius: 16px;' : '';
    const headshotZIndex = headshotEl.zIndex ?? 1;

    // Gradient overlay HTML
    const overlayEl = config.gradientOverlay;
    const overlayHTML = (() => {
      if (!overlayEl || !overlayEl.visible) return '';
      const ox = overlayEl.x || 0;
      const oy = overlayEl.y || 0;
      const ow = overlayEl.width || canvasWidth;
      const oh = overlayEl.height || canvasHeight / 2;
      const oColor = overlayEl.gradientColor || '#000000';
      const oOpacity = overlayEl.overlayOpacity ?? 0.92;
      const oDir = overlayEl.gradientDirection || 'bottom';
      const oZ = overlayEl.zIndex ?? 3;
      const dirMap: Record<string, string> = {
        bottom: 'to bottom',
        top:    'to top',
        left:   'to left',
        right:  'to right',
      };
      const cssDir = dirMap[oDir] || 'to bottom';
      // Parse hex color to rgb for rgba stops
      const r = parseInt(oColor.slice(1, 3), 16);
      const g = parseInt(oColor.slice(3, 5), 16);
      const b = parseInt(oColor.slice(5, 7), 16);
      return `<div style="position:absolute; left:${ox}px; top:${oy}px; width:${ow}px; height:${oh}px; background:linear-gradient(${cssDir}, rgba(${r},${g},${b},0) 0%, rgba(${r},${g},${b},0) 45%, rgba(${r},${g},${b},${+(oOpacity*0.45).toFixed(3)}) 72%, rgba(${r},${g},${b},${+(oOpacity*0.78).toFixed(3)}) 88%, rgba(${r},${g},${b},${oOpacity}) 100%); z-index:${oZ}; pointer-events:none;"></div>`;
    })();

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${ googleFontsHref ? `<link href="${googleFontsHref}" rel="stylesheet">` : '' }
  <style>
    body, .speaker-card { font-family: '${escapeHTML(fontFamilyFallback)}', sans-serif; }
    .speaker-card:hover { transform: translateY(-5px); transition: transform 0.2s; }
  </style>
</head>
<body>
  <div style="display: grid; grid-template-columns: repeat(1, 1fr); gap: 30px; padding: 20px; justify-items: center;">
    <div style="${cardStyle}" class="speaker-card embed-speaker-name" data-index="0">
      ${ headshotSrc ? `<img src="${escapeHTML(headshotSrc)}" style="position:absolute; left:${headshotLeft}px; top:${headshotTop}px; z-index:${headshotZIndex}; opacity:1.0; width:${headshotW}px; height:${headshotH}px; object-fit: cover; object-position: center; background-color: transparent; ${headshotBorderRadius}">` : `<div style="position:absolute; left:${headshotLeft}px; top:${headshotTop}px; z-index:${headshotZIndex}; width:${headshotW}px; height:${headshotH}px; background:#ddd; ${headshotBorderRadius}"></div>` }
      ${overlayHTML}
      <div style="position:absolute; left:${nameLeft}px; top:${nameTop}px; color:${escapeHTML(nameEl.color || '#000000')}; font-family:'${escapeHTML(nameEl.fontFamily || fontFamilyFallback)}', sans-serif; font-size:${nameFS}px; font-weight:${nameFW}; text-align:center; z-index:${nameEl.zIndex ?? 2}; opacity:1.0; width:${nameW}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(nameEl.text || nameEl.label || 'Name')}</div>
      <div style="position:absolute; left:${titleLeft}px; top:${titleTop}px; color:${escapeHTML(titleEl.color || '#000000')}; font-family:'${escapeHTML(titleEl.fontFamily || fontFamilyFallback)}', sans-serif; font-size:${titleFS}px; font-weight:${titleFW}; text-align:left; z-index:${titleEl.zIndex ?? 3}; opacity:1.0; width:${titleW}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(titleEl.text || titleEl.label || 'Title')}</div>
      <div style="position:absolute; left:${companyLeft}px; top:${companyTop}px; color:${escapeHTML(companyEl.color || '#000000')}; font-family:'${escapeHTML(companyEl.fontFamily || fontFamilyFallback)}', sans-serif; font-size:${companyFS}px; font-weight:${companyFW}; text-align:left; z-index:${companyEl.zIndex ?? 4}; opacity:1.0; width:${companyW}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(companyEl.text || companyEl.label || 'Company')}</div>
      ${ logoSrc ? `<img src="${escapeHTML(logoSrc)}" style="position:absolute; left:${logoLeft}px; top:${logoTop}px; z-index:${logoEl.zIndex ?? 5}; opacity:1.0; width:${logoW}px; height:${logoH}px; object-fit: contain; object-position: center; background-color: transparent; ">` : '' }
    </div>
  </div>
  <div id="bioModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5); z-index:9999999;">
    <div style="background-color:#fff; margin:10% auto; padding:20px; width:50%; position:relative; z-index:10000000;">
        <span id="closeModal" style="position:absolute; top:10px; right:20px; cursor:pointer; z-index:10000001;">&times;</span>
        <div id="modalContent"></div>
    </div>
  </div>
  <script>
    const modal = document.getElementById('bioModal');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.getElementById('closeModal');
    closeModal.onclick = function() { modal.style.display = 'none'; }
    window.onclick = function(event) { if (event.target == modal) { modal.style.display = 'none'; } }
    const speakersData = [{
      "id": "${escapeHTML((config.id || 'speaker-1'))}",
      "first_name": "${escapeHTML(firstName)}",
      "last_name": "${escapeHTML(lastName)}",
      "email": "${escapeHTML((config.email || ''))}",
      "company_name": "${escapeHTML(companyEl.text || companyEl.label || '')}",
      "company_role": "${escapeHTML(titleEl.text || titleEl.label || '')}",
      "linkedin": null,
      "bio": "${escapeHTML((config.bio || ''))}",
      "headshot": "${escapeHTML(headshotSrc)}",
      "company_logo": "${escapeHTML(logoSrc)}",
      "form_type": "speaker-info",
      "speaker_information_status": "${escapeHTML((config.speaker_information_status || 'info_pending'))}",
      "call_for_speakers_status": "${escapeHTML((config.call_for_speakers_status || 'submitted'))}",
      "custom_fields": ${JSON.stringify(config.custom_fields || config.customFields || {})},
      "website_card_approved": ${!!(config.website_card_approved || config.websiteCardApproved || false)},
      "promo_card_approved": ${!!(config.promo_card_approved || config.promoCardApproved || false)},
      "internal_notes": ${config.internal_notes ? '"' + escapeHTML(config.internal_notes) + '"' : 'null'},
      "created_at": new Date().toISOString(),
      "updated_at": new Date().toISOString()
    }];
    const speakerElements = document.querySelectorAll('.embed-speaker-name');
    speakerElements.forEach( (el) => {
        const index = parseInt(el.getAttribute('data-index'), 10);
        el.onclick = function() {
          const s = speakersData[index];
          modalContent.innerHTML = '<h2>' + (s.first_name || '') + ' ' + (s.last_name || '') + '</h2>' + '<p>' + (s.bio || '') + '</p>';
          modal.style.display = 'block';
        }
    });
  </script>
</body>
</html>`;

    return html;
  };

  return (
    <>
      <MissingFormDialog open={missingFormDialogOpen} onOpenChange={setMissingFormDialogOpen} eventId={eventId || ""} />
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
          cropMode === "logo"
            ? NaN  // Free-form: logos come in all shapes
            : cropMode === "headshot"
              ? (config.headshot?.shape === "vertical" ? 3/4 : config.headshot?.shape === "horizontal" ? 4/3 : config.headshot?.shape === "full-bleed" ? canvasWidth / canvasHeight : 1)
              : undefined
        }
        cropShape={
          cropMode === "headshot"
            ? (config.headshot?.shape === "rounded" || config.headshot?.shape === "full-bleed" ? "square" : (config.headshot?.shape || "circle"))
            : "square"
        }
        title={cropMode === "logo" ? "Crop Logo" : "Crop Image"}
        instructions={cropMode === "logo" ? "Drag to reposition, scroll to zoom. Crop to the logo boundary — any shape is fine." : "Drag to reposition, scroll to zoom, adjust to fit perfectly."}
        imageFormat={cropMode === "logo" ? "png" : "jpeg"}
      />

      <div className="h-full w-full flex flex-col bg-background">
        {/* ── Two-row toolbar ── */}
        <div className="flex flex-col bg-card border-b border-border shrink-0">

          {/* Row 1: Branding + navigation + global actions */}
          <div className="flex items-center gap-1 px-3 h-10 border-b border-border/40">
            {/* Left: back + wordmark + card type */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onBack && (
                <>
                  <button onClick={onBack} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Back to Speakers">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="h-5 w-px bg-border mx-0.5" />
                </>
              )}
              <div className="flex items-baseline gap-1 leading-none select-none">
                <span className="text-sm font-semibold text-primary" style={{ letterSpacing: '-0.01em' }}>Seamless</span>
                <span className="text-xs font-normal text-muted-foreground">Card Builder</span>
              </div>
              {!fullscreen && (
                <>
                  <div className="h-4 w-px bg-border mx-0.5" />
                  <div className="inline-flex items-center gap-0.5 p-0.5 bg-muted rounded-md">
                    <button onClick={() => setCardType("promo")} className={`px-2.5 py-0.5 text-xs font-medium rounded transition-all ${cardType === "promo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>Promo</button>
                    <button onClick={() => setCardType("website")} className={`px-2.5 py-0.5 text-xs font-medium rounded transition-all ${cardType === "website" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>Website</button>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Right: Layers, undo/redo, zoom, export, save */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Layers panel */}
              <div className="relative">
                <button onClick={() => setLayersPanelOpen(!layersPanelOpen)} className={`p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground ${layersPanelOpen ? 'bg-accent' : ''}`} title="Layers">
                  <Layers className="h-4 w-4" />
                </button>
                {layersPanelOpen && (
                  <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-lg shadow-xl p-3 z-50 w-64">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Layers</h3>
                      <button onClick={() => setLayersPanelOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                    </div>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {Object.entries(config)
                        .sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0))
                        .map(([key, element]) => (
                          <div
                            key={key}
                            className={`flex items-center justify-between p-2 rounded text-sm hover:bg-accent cursor-pointer ${selectedElement === key ? 'bg-accent' : ''}`}
                            onClick={() => { const canvas = fabricCanvasRef.current; const obj = elementRefs.current[key]; if (canvas && obj) { canvas.setActiveObject(obj); canvas.renderAll(); setSelectedElement(key); } }}
                          >
                            <span className="flex-1 truncate">{element.label || key}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); updateElement(key, { visible: !element.visible }); }} className="p-1 hover:bg-muted rounded" title={element.visible !== false ? "Hide" : "Show"}>
                                {element.visible !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              </button>
                              <div className="flex flex-col">
                                <button onClick={(e) => { e.stopPropagation(); const sorted = Object.entries(config).sort((a,b)=>(b[1].zIndex||0)-(a[1].zIndex||0)); const ci=sorted.findIndex(([k])=>k===key); if(ci>0){const [pk]=sorted[ci-1];const nc={...config};const tz=nc[key].zIndex;nc[key].zIndex=nc[pk].zIndex;nc[pk].zIndex=tz;setConfig(nc);} }} className="p-0.5 hover:bg-muted rounded" title="Move up"><ChevronUp className="h-3 w-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); const sorted = Object.entries(config).sort((a,b)=>(b[1].zIndex||0)-(a[1].zIndex||0)); const ci=sorted.findIndex(([k])=>k===key); if(ci<sorted.length-1){const [nk]=sorted[ci+1];const nc={...config};const tz=nc[key].zIndex;nc[key].zIndex=nc[nk].zIndex;nc[nk].zIndex=tz;setConfig(nc);} }} className="p-0.5 hover:bg-muted rounded" title="Move down"><ChevronDown className="h-3 w-3" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="h-5 w-px bg-border mx-0.5" />
              <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 rounded hover:bg-accent disabled:opacity-30" title="Undo (Ctrl+Z)"><Undo2 className="h-3.5 w-3.5" /></button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded hover:bg-accent disabled:opacity-30" title="Redo (Ctrl+Shift+Z)"><Redo2 className="h-3.5 w-3.5" /></button>
              <div className="h-5 w-px bg-border mx-0.5" />
              <button onClick={handleZoomOut} disabled={zoom <= 0.1} className="p-1.5 rounded hover:bg-accent disabled:opacity-30" title="Zoom Out"><ZoomOut className="h-3.5 w-3.5" /></button>
              <button onClick={() => { const c = fabricCanvasRef.current; if (!c) return; c.setViewportTransform([1,0,0,1,0,0]); c.setDimensions({ width: canvasWidth, height: canvasHeight }); setZoom(1); c.renderAll(); }} className="text-xs font-mono w-10 text-center py-1 rounded hover:bg-accent cursor-pointer" title="Reset zoom">{(zoom * 100).toFixed(0)}%</button>
              <button onClick={handleZoomIn} disabled={zoom >= 3} className="p-1.5 rounded hover:bg-accent disabled:opacity-30" title="Zoom In"><ZoomIn className="h-3.5 w-3.5" /></button>
              <button onClick={handleZoomFit} className="p-1.5 rounded hover:bg-accent" title="Fit to content"><Maximize2 className="h-3.5 w-3.5" /></button>
              <div className="h-5 w-px bg-border mx-0.5" />
              <button onClick={() => { const html = generateCardHTML(); const blob = new Blob([html], { type: "text/html" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `card-${cardType}.html`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); toast({ title: "Exported", description: "HTML snapshot downloaded" }); }} className="px-2 py-1 text-xs rounded hover:bg-accent font-mono text-muted-foreground hover:text-foreground" title="Export HTML">&lt;/&gt;</button>
              <button onClick={handleReset} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Reset canvas"><RotateCcw className="h-3.5 w-3.5" /></button>
              <div className="h-5 w-px bg-border mx-0.5" />
              <Button onClick={() => handleSave()} size="sm" variant="outline" className={`relative h-7 text-xs font-semibold ${hasUnsavedChanges ? 'border-primary text-primary hover:bg-primary/5' : ''}`}>
                <Save className="h-3 w-3 mr-1" />Save
                {hasUnsavedChanges && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-400" />}
              </Button>
              <Button onClick={handleExport} size="sm" variant="default" className="h-7 text-xs">
                <Download className="h-3 w-3 mr-1" />Export
              </Button>
            </div>
          </div>

          {/* Row 2: Context-sensitive formatting bar */}
          <div className="flex items-center gap-2 px-3 h-10 overflow-x-auto bg-muted/10 shrink-0">

            {/* Default (nothing selected): hint */}
            {!selectedElement && !multiSelectActive && (
              <span className="text-xs text-muted-foreground/40 italic shrink-0">← use the left panel to add elements and set the canvas</span>
            )}

            {/* Alignment (shown whenever anything is selected) */}
            {(selectedElement || multiSelectActive) && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-muted/40 rounded-md shrink-0">
                <span className="text-xs text-muted-foreground mr-1 whitespace-nowrap">Align</span>
                <button onClick={() => alignSelection('left')}    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Left"><AlignStartHorizontal className="h-3.5 w-3.5" /></button>
                <button onClick={() => alignSelection('centerH')} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Centre H"><AlignCenterHorizontal className="h-3.5 w-3.5" /></button>
                <button onClick={() => alignSelection('right')}   className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Right"><AlignEndHorizontal className="h-3.5 w-3.5" /></button>
                <div className="h-3.5 w-px bg-border mx-0.5" />
                <button onClick={() => alignSelection('top')}     className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Top"><AlignStartVertical className="h-3.5 w-3.5" /></button>
                <button onClick={() => alignSelection('centerV')} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Centre V"><AlignCenterVertical className="h-3.5 w-3.5" /></button>
                <button onClick={() => alignSelection('bottom')}  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Bottom"><AlignEndVertical className="h-3.5 w-3.5" /></button>
              </div>
            )}

            {/* Text formatting — single text OR multi-select of all-text elements */}
            {(() => {
              const isSingleText = !!(selectedElement && (["name","title","company"].includes(selectedElement) || config[selectedElement]?.type === "dynamic-text"));
              const isMultiText = multiSelectActive && multiSelectedKeys.length > 0 && multiSelectedKeys.every(k => ["name","title","company"].includes(k) || config[k]?.type === "dynamic-text");
              if (!isSingleText && !isMultiText) return null;
              const activeKey = isSingleText ? selectedElement! : multiSelectedKeys[0];
              const applyUpdate = (updates: Partial<ElementConfig>) => {
                if (isSingleText) { updateElement(selectedElement!, updates); }
                else { multiSelectedKeys.forEach(k => updateElement(k, updates)); }
              };
              return (
                <>
                  <div className="h-6 w-px bg-border shrink-0" />
                  <div className="flex items-center gap-2 shrink-0" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    {/* Font family */}
                    <select
                      value={config[activeKey]?.fontFamily || "Montserrat"}
                      onChange={(e) => applyUpdate({ fontFamily: e.target.value })}
                      className="h-7 px-2 text-xs border border-border rounded bg-background"
                    >
                      {["Roboto","Open Sans","Lato","Montserrat","Poppins","Raleway","Noto Sans","Source Sans Pro","Merriweather","Playfair Display","Nunito","Ubuntu","PT Sans","Karla","Oswald","Fira Sans","Work Sans","Inconsolata","Josefin Sans","Alegreya","Cabin","Titillium Web","Mulish","Quicksand","Anton","Droid Sans","Archivo","Hind","Bitter","Libre Franklin"].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    {/* Font size — uses local-state input to allow clearing and retyping freely */}
                    <FontSizeInput
                      value={config[activeKey]?.fontSize || 16}
                      onChange={(val) => applyUpdate({ fontSize: val })}
                      className="w-12 h-7 text-xs text-center px-1 rounded border border-border bg-background font-mono"
                    />
                    <div className="h-4 w-px bg-border" />
                    {/* Bold / Italic / Underline */}
                    <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-md">
                      <button onClick={() => applyUpdate({ fontWeight: config[activeKey]?.fontWeight === 700 ? 400 : 700 })} className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${config[activeKey]?.fontWeight === 700 ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Bold"><Bold className="h-3.5 w-3.5" /></button>
                      <button onClick={() => applyUpdate({ fontStyle: config[activeKey]?.fontStyle === "italic" ? "normal" : "italic" })} className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${config[activeKey]?.fontStyle === "italic" ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Italic"><Italic className="h-3.5 w-3.5" /></button>
                      <button onClick={() => applyUpdate({ underline: !config[activeKey]?.underline })} className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${config[activeKey]?.underline ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Underline"><Underline className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    {/* Text align */}
                    <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-md">
                      {([{ val: "left", icon: <AlignLeft className="h-3.5 w-3.5" />, title: "Left" }, { val: "center", icon: <AlignCenter className="h-3.5 w-3.5" />, title: "Center" }, { val: "right", icon: <AlignRight className="h-3.5 w-3.5" />, title: "Right" }] as const).map(({ val, icon, title }) => (
                        <button key={val} onClick={() => applyUpdate({ textAlign: val })} className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${config[activeKey]?.textAlign === val ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title={`Align ${title}`}>{icon}</button>
                      ))}
                    </div>
                    <div className="h-4 w-px bg-border" />
                    {/* Colour — preset swatches + swatch picker + hex */}
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {["#ffffff","#000000","#374151","#dc2626","#2563eb","#16a34a","#d97706","#9333ea"].map(c => (
                          <button key={c} onClick={() => applyUpdate({ color: c })} className="w-4 h-4 rounded-sm border border-border/60 flex-shrink-0 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                        ))}
                      </div>
                      <div className="relative w-6 h-6 rounded border border-border overflow-hidden cursor-pointer flex-shrink-0" title="Custom colour">
                        <div className="absolute inset-0" style={{ backgroundColor: config[activeKey]?.color || "#000000" }} />
                        <input type="color" value={config[activeKey]?.color || "#000000"} onChange={(e) => applyUpdate({ color: e.target.value })} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                      </div>
                      <HexColorInput value={config[activeKey]?.color || "#000000"} onChange={(hex) => applyUpdate({ color: hex })} className="w-20 h-7 text-xs font-mono px-1.5 rounded border border-border bg-background" />
                    </div>
                    <div className="h-4 w-px bg-border" />
                    {/* Line height */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground" title="Line height">↕</span>
                      <input type="number" value={config[activeKey]?.lineHeight || 1.2} onChange={(e) => { const v=parseFloat(e.target.value); if(!isNaN(v)&&v>=0.5&&v<=3) applyUpdate({lineHeight:v}); }} className="w-14 h-7 text-xs text-center px-1 rounded border border-border bg-background" step={0.1} min={0.5} max={3} title="Line Height" />
                    </div>
                    {/* Letter spacing */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground" title="Letter spacing">↔</span>
                      <input type="number" value={config[activeKey]?.charSpacing || 0} onChange={(e) => { const v=parseInt(e.target.value); if(!isNaN(v)&&v>=-100&&v<=500) applyUpdate({charSpacing:v}); }} className="w-14 h-7 text-xs text-center px-1 rounded border border-border bg-background" min={-100} max={500} title="Letter Spacing" />
                    </div>
                    <div className="h-4 w-px bg-border" />
                    {/* Opacity */}
                    <input type="range" min={0} max={1} step={0.05} value={config[activeKey]?.opacity ?? 1} onChange={(e) => applyUpdate({ opacity: parseFloat(e.target.value) })} className="w-16 h-4 accent-primary" title="Opacity" />
                    <span className="text-xs w-8 tabular-nums">{Math.round((config[activeKey]?.opacity ?? 1) * 100)}%</span>
                    {/* Name format — only shown when the name element is selected */}
                    {isSingleText && selectedElement === "name" && (
                      <>
                        <div className="h-4 w-px bg-border" />
                        <span className="text-xs text-muted-foreground shrink-0">Name</span>
                        <select
                          value={config["name"]?.nameFormat || "single"}
                          onChange={(e) => updateElement("name", { nameFormat: e.target.value })}
                          className="h-7 px-2 text-xs border border-border rounded bg-background shrink-0"
                          title="How the speaker's name is displayed on the card"
                        >
                          <option value="single">Single line — Lisa Young</option>
                          <option value="two-line">Two lines — Lisa / Young</option>
                        </select>
                      </>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Headshot controls */}
            {selectedElement === "headshot" && (
              <>
                <div className="h-6 w-px bg-border shrink-0" />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">Shape</span>
                  {(["circle","square","vertical","horizontal","rounded","full-bleed"] as const).map((shape) => (
                    <button key={shape} onClick={() => updateElement("headshot", shape === "full-bleed" ? { shape, x: 0, y: 0 } : { shape })} className={`h-7 px-2 text-xs rounded border capitalize ${config.headshot?.shape === shape ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>{shape}</button>
                  ))}
                  <div className="h-4 w-px bg-border" />
                  <input type="range" min={0} max={1} step={0.05} value={config.headshot?.opacity ?? 1} onChange={(e) => updateElement("headshot", { opacity: parseFloat(e.target.value) })} className="w-16 h-4 accent-primary" />
                  <span className="text-xs w-8 tabular-nums">{Math.round((config.headshot?.opacity ?? 1) * 100)}%</span>
                  <div className="h-4 w-px bg-border" />
                  <Button onClick={() => headshotInputRef.current?.click()} variant="outline" size="sm" className="h-7 text-xs shrink-0">
                    <Upload className="h-3 w-3 mr-1" />Test Image
                  </Button>
                </div>
              </>
            )}

            {/* Logo controls */}
            {selectedElement === "companyLogo" && (
              <>
                <div className="h-6 w-px bg-border shrink-0" />
                <div className="flex items-center gap-2 shrink-0">
                  <input type="range" min={0} max={1} step={0.05} value={config.companyLogo?.opacity ?? 1} onChange={(e) => updateElement("companyLogo", { opacity: parseFloat(e.target.value) })} className="w-16 h-4 accent-primary" />
                  <span className="text-xs w-8 tabular-nums">{Math.round((config.companyLogo?.opacity ?? 1) * 100)}%</span>
                  <div className="h-4 w-px bg-border" />
                  <Button onClick={() => logoInputRef.current?.click()} variant="outline" size="sm" className="h-7 text-xs shrink-0">
                    <Upload className="h-3 w-3 mr-1" />Test Logo
                  </Button>
                </div>
              </>
            )}

            {/* Gradient Overlay Controls */}
            {selectedElement && config[selectedElement]?.type === "gradient-overlay" && (
              <>
                <div className="h-6 w-px bg-border shrink-0" />
                <div className="flex items-center gap-2 shrink-0" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-muted-foreground">Colour</span>
                  <div className="flex items-center gap-1">
                    <div className="relative w-6 h-6 rounded border border-border overflow-hidden cursor-pointer flex-shrink-0">
                      <div className="absolute inset-0" style={{ backgroundColor: config[selectedElement]?.gradientColor || "#000000" }} />
                      <input type="color" value={config[selectedElement]?.gradientColor || "#000000"} onChange={(e) => updateElement(selectedElement, { gradientColor: e.target.value })} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                    </div>
                    <HexColorInput value={config[selectedElement]?.gradientColor || "#000000"} onChange={(hex) => updateElement(selectedElement, { gradientColor: hex })} className="w-20 h-7 text-xs font-mono px-1.5 rounded border border-border bg-background" />
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-xs text-muted-foreground">Opacity</span>
                  <input type="range" min={0} max={1} step={0.05} value={config[selectedElement]?.overlayOpacity ?? 0.90} onChange={(e) => updateElement(selectedElement, { overlayOpacity: parseFloat(e.target.value) })} className="w-16 h-4 accent-primary" />
                  <span className="text-xs w-8 tabular-nums">{Math.round((config[selectedElement]?.overlayOpacity ?? 0.90) * 100)}%</span>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-xs text-muted-foreground">Direction</span>
                  {(["bottom","top","left","right"] as const).map((dir) => (
                    <button key={dir} onClick={() => updateElement(selectedElement, { gradientDirection: dir })} className={`h-7 px-2 text-xs rounded border ${(config[selectedElement]?.gradientDirection || "bottom") === dir ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>{dir.charAt(0).toUpperCase() + dir.slice(1)}</button>
                  ))}
                </div>
              </>
            )}

            {/* Opacity for other elements (dynamic icon-links etc.) */}
            {selectedElement && !["name","title","company"].includes(selectedElement) && config[selectedElement]?.type !== "gradient-overlay" && config[selectedElement]?.type !== "dynamic-text" && selectedElement !== "headshot" && selectedElement !== "companyLogo" && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-muted-foreground">Opacity</span>
                <input type="range" min={0} max={1} step={0.05} value={config[selectedElement]?.opacity ?? 1} onChange={(e) => updateElement(selectedElement, { opacity: parseFloat(e.target.value) })} className="w-16 h-4 accent-primary" />
                <span className="text-xs w-8 tabular-nums">{Math.round((config[selectedElement]?.opacity ?? 1) * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Elements */}
          <div className="w-36 border-r border-border/60 bg-muted/20 flex flex-col items-center pt-3 pb-4 gap-3 overflow-y-auto">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 w-full px-3">Elements</span>

            {/* Starter Templates */}
            <div className="w-full px-2">
              <button
                onClick={() => setTemplatePresetsOpen(!templatePresetsOpen)}
                className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${templatePresetsOpen ? 'bg-accent' : 'hover:bg-accent'}`}
                title="Starter Templates"
              >
                <Layers className="h-5 w-5" />
                <span className="text-xs">Templates</span>
              </button>
              {templatePresetsOpen && (
                <div className="mt-1 rounded-lg border border-border bg-card p-1">
                  {STARTER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={preset.apply}
                      className="w-full text-left px-2 py-2 rounded hover:bg-accent text-xs mb-0.5"
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-muted-foreground">{preset.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Background — colour + image, unified inline panel */}
            <div className="w-full px-2">
              <button
                onClick={() => setBgPanelOpen(!bgPanelOpen)}
                className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${bgPanelOpen ? 'bg-accent' : 'hover:bg-accent'}`}
                title="Background colour or image"
              >
                <div className="relative">
                  <ImageIcon className="h-5 w-5" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-sm border border-border/80 shadow-sm" style={{ backgroundColor: bgColor }} />
                </div>
                <span className="text-xs">Canvas</span>
              </button>

              {bgPanelOpen && (
                <div className="mt-1 rounded-lg border border-border bg-card p-2 space-y-2">
                  {/* Canvas size */}
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Size</div>
                    <select
                      value={["600x600","1200x628","900x1200","1584x396"].includes(`${canvasWidth}x${canvasHeight}`) ? `${canvasWidth}x${canvasHeight}` : "custom"}
                      onChange={(e) => {
                        if (e.target.value === "custom") return;
                        const [w, h] = e.target.value.split('x').map(Number);
                        setCanvasWidth(w); setCanvasHeight(h);
                        setHasUnsavedChanges(true);
                        if (fabricCanvasRef.current) { fabricCanvasRef.current.setDimensions({ width: w, height: h }); fabricCanvasRef.current.renderAll(); }
                      }}
                      className="w-full h-7 px-2 text-xs border border-border rounded bg-background"
                    >
                      <option value="600x600">Square (600×600)</option>
                      <option value="1200x628">Landscape (1200×628)</option>
                      <option value="900x1200">Portrait (900×1200)</option>
                      <option value="1584x396">Banner (1584×396)</option>
                      <option value="custom" disabled>Custom: {canvasWidth}×{canvasHeight}</option>
                    </select>
                  </div>

                  {/* Colour swatches */}
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Colour</div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {["#ffffff","#000000","#1e293b","#0f172a","#1d4ed8","#dc2626","#16a34a","#d97706","#7c3aed","#db2777","#0891b2","#374151"].map(c => (
                        <button
                          key={c}
                          onClick={() => { setBgColor(c); setHasUnsavedChanges(true); }}
                          className={`w-5 h-5 rounded border-2 transition-transform hover:scale-110 ${bgColor === c ? 'border-primary' : 'border-border/60'}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="relative w-6 h-6 rounded border border-border overflow-hidden cursor-pointer flex-shrink-0">
                        <div className="absolute inset-0" style={{ backgroundColor: bgColor }} />
                        <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setHasUnsavedChanges(true); }} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                      </div>
                      <HexColorInput value={bgColor} onChange={(hex) => { setBgColor(hex); setHasUnsavedChanges(true); }} className="flex-1 h-6 text-xs font-mono px-1 rounded border border-border bg-background min-w-0" />
                    </div>
                  </div>

                  {/* Image upload */}
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Background</div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs transition-colors ${templateUrl ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border hover:bg-accent'}`}
                    >
                      <Upload className="h-3 w-3 shrink-0" />
                      <span className="truncate">{templateUrl ? "Replace" : "Upload"}</span>
                    </button>
                    {templateUrl && (
                      <button onClick={() => { setTemplateUrl(null); setHasUnsavedChanges(true); }} className="w-full text-[10px] text-muted-foreground hover:text-destructive text-left mt-1">✕ Remove image</button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleBackgroundUpload} className="hidden" />

            <div className="h-px w-12 bg-border" />

            {shouldShowElement("headshot") && (
              <div className="relative w-full px-2">
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, "headshot")}
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setShapePopupPosition({ x: rect.right + 8, y: rect.top });
                    setShapePopupOpen(!shapePopupOpen);
                  }}
                  className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-move ${
                    config.headshot ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                  }`}
                  title="Drag to canvas or click for options"
                  data-popover="true"
                >
                  <Users className={`h-5 w-5 ${config.headshot ? 'text-primary' : ''}`} />
                  <span className={`text-xs ${config.headshot ? 'text-primary font-semibold' : ''}`}>Headshot</span>
                </button>

              {/* Shape selector popup */}
              {shapePopupOpen && (
                <div
                  className="fixed bg-card border border-border rounded-lg shadow-xl p-2 z-50 w-36"
                  style={{ left: shapePopupPosition.x, top: shapePopupPosition.y }}
                  data-popover="true"
                >
                  <div className="text-xs font-semibold mb-2 px-1">Select Shape</div>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "circle" });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded-full bg-muted border border-border"></div>
                    Circle
                  </button>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "square" });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded bg-muted border border-border"></div>
                    Square
                  </button>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "vertical" });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-3 h-4 rounded bg-muted border border-border"></div>
                    Vertical
                  </button>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "horizontal" });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-4 h-3 rounded bg-muted border border-border"></div>
                    Horizontal
                  </button>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "rounded" });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded-xl bg-muted border border-border"></div>
                    Rounded
                  </button>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "full-bleed", x: 0, y: 0 });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-4 h-3 bg-muted border border-border"></div>
                    Full Bleed
                  </button>
                </div>
              )}
              </div>
            )}

            {shouldShowElement("name") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "name")}
                onClick={() => toggleElement("name")}
                className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-move ${
                  config.name ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                }`}
                title={config.name ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <Type className={`h-5 w-5 ${config.name ? 'text-primary' : ''}`} />
                <span className={`text-xs ${config.name ? 'text-primary font-semibold' : ''}`}>Name</span>
              </button>
            )}

            {shouldShowElement("title") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "title")}
                onClick={() => toggleElement("title")}
                className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-move ${
                  config.title ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                }`}
                title={config.title ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <Type className={`h-5 w-5 ${config.title ? 'text-primary' : ''}`} />
                <span className={`text-xs ${config.title ? 'text-primary font-semibold' : ''}`}>Title</span>
              </button>
            )}

            {shouldShowElement("company") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "company")}
                onClick={() => toggleElement("company")}
                className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-move ${
                  config.company ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                }`}
                title={config.company ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <Briefcase className={`h-5 w-5 ${config.company ? 'text-primary' : ''}`} />
                <span className={`text-xs ${config.company ? 'text-primary font-semibold' : ''}`}>Company</span>
              </button>
            )}

            {shouldShowElement("companyLogo") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "companyLogo")}
                onClick={() => toggleElement("companyLogo")}
                className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-move ${
                  config.companyLogo ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                }`}
                title={config.companyLogo ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <ImageIcon className={`h-5 w-5 ${config.companyLogo ? 'text-primary' : ''}`} />
                <span className={`text-xs ${config.companyLogo ? 'text-primary font-semibold' : ''}`}>Logo</span>
              </button>
            )}

            <div className="h-px w-12 bg-border" />

            <button
              draggable
              onDragStart={(e) => handleDragStart(e, "gradientOverlay")}
              onClick={() => toggleElement("gradientOverlay")}
              className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-move ${
                config.gradientOverlay ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
              }`}
              title={config.gradientOverlay ? "Click to remove" : "Add gradient overlay"}
            >
              <Square className={`h-5 w-5 ${config.gradientOverlay ? 'text-primary' : ''}`} />
              <span className={`text-xs ${config.gradientOverlay ? 'text-primary font-semibold' : ''}`}>Overlay</span>
            </button>

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
                          setConfig(prev => {
                            const newConfig = { ...prev };
                            delete newConfig[fieldKey];
                            return newConfig;
                          });
                          toast({ title: "Element removed", description: `Removed ${field.label}`, duration: 2000 });
                        } else {
                          // Add if doesn't exist
                          const template = createDynamicElementTemplate(field, 0);
                          addElementToCanvas(fieldKey, undefined, template);
                        }
                      }}
                      className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-move ${
                        isActive ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                      }`}
                      title={isActive ? "Click to remove" : `Drag ${field.label} to canvas or click to add`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                      <span className={`text-xs line-clamp-1 w-full text-center ${isActive ? 'text-primary font-semibold' : ''}`}>
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
          >
            {/* Empty state overlay */}
            {Object.keys(config).length === 0 && !templateUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="bg-card/90 border border-border rounded-xl p-6 text-center shadow-lg max-w-xs">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">Start designing</p>
                  <p className="text-xs text-muted-foreground">Upload a background image or pick a BG colour,<br />then drag elements from the left panel onto the card.</p>
                </div>
              </div>
            )}


            <ShadowContainer
              className="border-2 border-border rounded-lg shadow-lg overflow-hidden"
              injectStyles={`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Roboto:wght@300;400;500;600;700;800&family=Open+Sans:wght@300;400;500;600;700;800&family=Lato:wght@300;400;500;600;700;800&family=Montserrat:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&family=Raleway:wght@300;400;500;600;700;800&family=Noto+Sans:wght@300;400;500;600;700;800&family=Source+Sans+Pro:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;500;600;700;800&family=Playfair+Display:wght@300;400;500;600;700;800&family=Nunito:wght@300;400;500;600;700;800&family=Ubuntu:wght@300;400;500;600;700;800&family=PT+Sans:wght@300;400;500;600;700;800&family=Karla:wght@300;400;500;600;700;800&family=Oswald:wght@300;400;500;600;700;800&family=Fira+Sans:wght@300;400;500;600;700;800&family=Work+Sans:wght@300;400;500;600;700;800&family=Inconsolata:wght@300;400;500;600;700;800&family=Josefin+Sans:wght@300;400;500;600;700;800&family=Alegreya:wght@300;400;500;600;700;800&family=Cabin:wght@300;400;500;600;700;800&family=Titillium+Web:wght@300;400;500;600;700;800&family=Mulish:wght@300;400;500;600;700;800&family=Quicksand:wght@300;400;500;600;700;800&family=Anton:wght@300;400;500;600;700;800&family=Droid+Sans:wght@300;400;500;600;700;800&family=Archivo:wght@300;400;500;600;700;800&family=Hind:wght@300;400;500;600;700;800&family=Bitter:wght@300;400;500;600;700;800&family=Libre+Franklin:wght@300;400;500;600;700;800&display=swap'); :host{all:initial;display:block;font-family:Inter, Roboto, 'Open Sans', Lato, Montserrat, Poppins, Raleway, 'Noto Sans', 'Source Sans Pro', 'Merriweather', 'Playfair Display', Nunito, Ubuntu, 'PT Sans', Karla, Oswald, 'Fira Sans', 'Work Sans', Inconsolata, 'Josefin Sans', Alegreya, Cabin, 'Titillium Web', Mulish, Quicksand, Anton, 'Droid Sans', Archivo, Hind, Bitter, 'Libre Franklin', sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;} *{box-sizing:border-box;} canvas{display:block;}
              .card-root{background-color:#f5f5f5;}`} 
            >
              <div className="card-root" style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}>
                <canvas ref={canvasRef} style={{ display: "block" }} />
              </div>
            </ShadowContainer>

          </div>

          {/* Right Sidebar - Test Images */}
          <div className="w-56 border-l bg-card/30 p-4 overflow-y-auto space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Test Images</h3>
              <p className="text-xs text-muted-foreground mb-3">Preview only (not saved)</p>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Headshot</Label>
              <input ref={headshotInputRef} type="file" accept="image/png,image/jpeg" onChange={handleHeadshotUpload} className="hidden" />
              <Button onClick={() => headshotInputRef.current?.click()} variant="outline" size="sm" className="w-full">
                <Upload className="h-3 w-3 mr-2" />
                Upload Test Image
              </Button>
              {testHeadshot && (
                <div className="mt-2 relative">
                  <img src={testHeadshot} alt="Test headshot" className="w-full h-20 object-cover rounded" />
                  <button
                    onClick={() => setTestHeadshot(null)}
                    className="absolute top-1 right-1 p-1 bg-background rounded-full shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1 block">Company Logo</Label>
              <p className="text-xs text-muted-foreground mb-2">Drop zone for logos (free crop)</p>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="hidden" />
              <Button onClick={() => logoInputRef.current?.click()} variant="outline" size="sm" className="w-full">
                <Upload className="h-3 w-3 mr-2" />
                Upload Test Image
              </Button>
              {testLogo && (
                <div className="mt-2 relative">
                  <img src={testLogo} alt="Test logo" className="w-full h-20 object-cover rounded" />
                  <button
                    onClick={() => setTestLogo(null)}
                    className="absolute top-1 right-1 p-1 bg-background rounded-full shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px] text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {(["name","title","company"].includes(contextMenu.elementKey) || config[contextMenu.elementKey]?.type === "dynamic-text") && (
            <>
              <button className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2" onClick={() => { updateElement(contextMenu.elementKey, { fontWeight: config[contextMenu.elementKey]?.fontWeight === 700 ? 400 : 700 }); setContextMenu(null); }}>
                <Bold className="h-3.5 w-3.5" />{config[contextMenu.elementKey]?.fontWeight === 700 ? "Remove Bold" : "Bold"}
              </button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2" onClick={() => { updateElement(contextMenu.elementKey, { fontStyle: config[contextMenu.elementKey]?.fontStyle === "italic" ? "normal" : "italic" }); setContextMenu(null); }}>
                <Italic className="h-3.5 w-3.5" />{config[contextMenu.elementKey]?.fontStyle === "italic" ? "Remove Italic" : "Italic"}
              </button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2" onClick={() => { updateElement(contextMenu.elementKey, { underline: !config[contextMenu.elementKey]?.underline }); setContextMenu(null); }}>
                <Underline className="h-3.5 w-3.5" />{config[contextMenu.elementKey]?.underline ? "Remove Underline" : "Underline"}
              </button>
              <div className="border-t border-border my-1" />
            </>
          )}
          {contextMenu.elementKey === "headshot" && (
            <>
              <button className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2" onClick={() => { headshotInputRef.current?.click(); setContextMenu(null); }}>
                <Upload className="h-3.5 w-3.5" />Upload Test Image
              </button>
              <div className="border-t border-border my-1" />
            </>
          )}
          {contextMenu.elementKey === "companyLogo" && (
            <>
              <button className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2" onClick={() => { logoInputRef.current?.click(); setContextMenu(null); }}>
                <Upload className="h-3.5 w-3.5" />Upload Test Logo
              </button>
              <div className="border-t border-border my-1" />
            </>
          )}
          <button className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2" onClick={() => { updateElement(contextMenu.elementKey, { visible: !config[contextMenu.elementKey]?.visible }); setContextMenu(null); }}>
            {config[contextMenu.elementKey]?.visible !== false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {config[contextMenu.elementKey]?.visible !== false ? "Hide" : "Show"}
          </button>
          <div className="border-t border-border my-1" />
          <button className="w-full text-left px-3 py-1.5 hover:bg-accent text-destructive flex items-center gap-2" onClick={() => { setConfig(prev => { const n = { ...prev }; delete n[contextMenu.elementKey]; return n; }); setSelectedElement(null); setContextMenu(null); }}>
            <X className="h-3.5 w-3.5" />Delete
          </button>
        </div>
      )}
    </>
  );
}
