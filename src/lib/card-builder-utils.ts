import { FaLinkedin, FaTwitter, FaFacebook, FaInstagram, FaGithub } from 'react-icons/fa';
import { 
  Globe, 
  Type,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical
} from 'lucide-react';
import type { FormFieldConfig } from '@/components/SpeakerFormBuilder';
import { fabric } from 'fabric';

export const QUICK_SWATCHES = [
  "#ffffff",
  "#000000",
  "#1e293b",
  "#0f172a",
  "#111827",
  "#374151",
  "#1d4ed8",
  "#2563eb",
  "#0891b2",
  "#0d9488",
  "#16a34a",
  "#65a30d",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#ca8a04",
  "#9333ea",
  "#db2777",
];

export const SIDEBAR_ELEM_BTN =
  "w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-move";
export const CTX_MENU_BTN =
  "w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2";
export const TOOLBAR_ICON_BTN =
  "p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground";

export type CardConfig = {
  [key: string]: {
    [key: string]: any;
  };
};

export const GRADIENT_COORD_MAP: Record<
  string,
  { x1: number; y1: number; x2: number; y2: number }
> = {
  bottom: { x1: 0, y1: 0, x2: 0, y2: 600 }, // Default values, will be overridden by actual canvas dimensions
  top: { x1: 0, y1: 600, x2: 0, y2: 0 },
  left: { x1: 600, y1: 0, x2: 0, y2: 0 },
  right: { x1: 0, y1: 0, x2: 600, y2: 0 },
};

export const getGradientCoords = (
  direction: string,
  width: number,
  height: number,
) => {
  const coordMap: Record<
    string,
    { x1: number; y1: number; x2: number; y2: number }
  > = {
    bottom: { x1: 0, y1: 0, x2: 0, y2: height },
    top: { x1: 0, y1: height, x2: 0, y2: 0 },
    left: { x1: width, y1: 0, x2: 0, y2: 0 },
    right: { x1: 0, y1: 0, x2: width, y2: 0 },
  };
  return coordMap[direction] || coordMap.bottom;
};

export const migrateLoadedConfig = (
  cfg: CardConfig,
): { migrated: CardConfig; changed: boolean } => {
  // Migration no-op: app now uses `firstName` and `lastName` elements everywhere.
  // Any legacy conversion (if needed) should be handled elsewhere to avoid
  // reintroducing a single combined element in the runtime config.
  return { migrated: cfg, changed: false };
};

export const getGoogleFontsHref = (fonts: string[]) => {
  const families = fonts.filter(Boolean);
  if (families.length === 0) return "";
  const query = families
    .map((f) => `family=${f.replace(/\s+/g, "+")}:wght@300;400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
};

export const ALIGN_MODES = [
  { id: "left", icon: AlignLeft, label: "Left" },
  { id: "centerH", icon: AlignCenterHorizontal, label: "Center H" },
  { id: "right", icon: AlignRight, label: "Right" },
  { id: "top", icon: AlignStartVertical, label: "Top" },
  { id: "centerV", icon: AlignCenterVertical, label: "Center V" },
  { id: "bottom", icon: AlignEndVertical, label: "Bottom" },
] as const;

export type AlignDirection = (typeof ALIGN_MODES)[number]["id"];

export const FIXED_KEYS = ["headshot", "firstName", "lastName", "title", "company", "companyLogo"];

export const ICON_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  twitter: "#1DA1F2",
  facebook: "#1877F2",
  instagram: "#E4405F",
  github: "#333333",
};

export const ICON_TEXT: Record<string, string> = {
  linkedin: "in",
  twitter: "x",
  facebook: "f",
  instagram: "📷",
  github: "gh",
};

export const getCanvasRelativePos = (
  clientX: number,
  clientY: number,
  canvasElement: HTMLCanvasElement,
  zoom: number,
) => {
  const rect = canvasElement.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / zoom,
    y: (clientY - rect.top) / zoom,
  };
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export function hexToHsl(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h: number, s: number, l: number): string {
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function deriveGradient(baseHex: string, style: "dark" | "tonal" | "soft"): { from: string; to: string } {
  const [h, s, l] = hexToHsl(baseHex);
  if (style === "dark") return { from: hslToHex(h, Math.min(s + 10, 100), Math.max(l - 45, 5)), to: baseHex };
  if (style === "soft") return { from: baseHex, to: hslToHex(h, Math.max(s - 35, 0), Math.min(l + 38, 94)) };
  return { from: hslToHex(h, s, Math.max(l - 28, 5)), to: hslToHex(h, Math.max(s - 10, 0), Math.min(l + 18, 92)) };
}

export const escapeHTML = (s: any) => {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const getFieldIcon = (fieldId: string) => {
  const iconMap: { [key: string]: any } = {
    linkedin: FaLinkedin,
    twitter: FaTwitter,
    facebook: FaFacebook,
    instagram: FaInstagram,
    github: FaGithub,
    website: Globe,
  };
  return iconMap[fieldId] || Type;
};

export const createDynamicElementTemplate = (field: FormFieldConfig, index: number): any => {
  const baseY = 200 + index * 35;
  if (field.type === "url" || field.id.includes("linkedin") || field.id.includes("twitter") || field.id.includes("website")) {
    return {
      label: field.label,
      type: "icon-link",
      fieldId: field.id,
      x: 50,
      y: baseY,
      size: 32,
      iconType: field.id,
      url: "",
      visible: true,
      zIndex: 10 + index,
    };
  }
  return {
    label: field.label,
    type: "dynamic-text",
    fieldId: field.id,
    text: field.label,
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

export const loadImagePromise = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

export const getAbsoluteUrl = (url: string | null | undefined, apiBase = ''): string | null | undefined => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch (e) {
    const base = (apiBase || '').replace(/\/$/, '') || '';
    if (!base) return url;
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  }
};

export const shouldShowElementFromFields = (fieldsArray: any[], elementKey: string): boolean => {
  if (!fieldsArray || fieldsArray.length === 0) return true;
  const fieldMapping: { [key: string]: string[] } = {
    headshot: ['headshot'],
    firstName: ['first_name'],
    lastName: ['last_name'],
    title: ['company_role'],
    company: ['company_name'],
    companyLogo: ['company_logo'],
  };
  const relatedFields = fieldMapping[elementKey] || [];
  return relatedFields.some((fieldId) => {
    const field = fieldsArray.find((f: any) => f.id === fieldId);
    return field?.showInCardBuilder === true;
  });
};

export const presetMetasFromData = (presetsData: any[]) => {
  return (presetsData || []).map((p: any) => ({
    name: p.name,
    description: p.description,
    thumbnail: p.thumbnail,
    thumbnailShape: p.thumbnailShape,
    defaultBg: p.defaultBg,
    defaultTextColor: p.defaultTextColor,
    canvasW: p.canvasW,
    canvasH: p.canvasH,
    allowedHeadshotShapes: p.allowedHeadshotShapes,
  }));
};

// Common arrays and small constants moved here to keep components tidy.
export const DEFAULT_FIELD_IDS = [
  "headshot",
  "first_name",
  "last_name",
  "title",
  "company_name",
  "company_role",
  "company_logo",
];

export const NAME_TITLE_FIELDS = ['firstName', 'lastName', 'title'] as const;
export const CORE_TEXT_FIELDS = ['firstName', 'lastName', 'title', 'company'] as const;

export const GRADIENT_DIRECTIONS = ['bottom', 'top', 'left', 'right'] as const;
export const GRADIENT_STYLES = ['dark', 'tonal', 'soft'] as const;

// Font family options used in the quick setup and font pickers.
export const FONT_FAMILIES = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Noto Sans',
  'Source Sans Pro',
  'Merriweather',
  'Playfair Display',
  'Nunito',
  'Ubuntu',
  'PT Sans',
  'Karla',
  'Oswald',
  'Fira Sans',
  'Work Sans',
  'Inconsolata',
  'Josefin Sans',
  'Alegreya',
  'Cabin',
  'Titillium Web',
  'Mulish',
  'Quicksand',
  'Anton',
  'Droid Sans',
  'Archivo',
  'Hind',
  'Bitter',
  'Libre Franklin',
];

// Small quick swatch used in compact controls
export const SWATCH_PRESET_SMALL = [
  '#ffffff',
  '#000000',
  '#374151',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#9333ea',
];

// Larger solid colour palette used in colour selector
export const SWATCH_SOLID = [
  '#ffffff',
  '#000000',
  '#1e293b',
  '#0f172a',
  '#1d4ed8',
  '#dc2626',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#374151',
];

export type Rect = { left: number; top: number; width: number; height: number };

export const computeSnapMatches = (
  objRect: Rect,
  canvasW: number,
  canvasH: number,
  others: Array<Rect & { elementKey?: string }>,
  threshold = 10,
) => {
  const oL = objRect.left;
  const oT = objRect.top;
  const oR = objRect.left + objRect.width;
  const oB = objRect.top + objRect.height;
  const oCX = oL + objRect.width / 2;
  const oCY = oT + objRect.height / 2;

  type SnapPoint = { dist: number; delta: number; pos: number };
  const snapX: SnapPoint[] = [];
  const snapY: SnapPoint[] = [];

  const tryX = (ref: number, val: number) => {
    const d = Math.abs(ref - val);
    if (d < threshold) snapX.push({ dist: d, delta: val - ref, pos: val });
  };
  const tryY = (ref: number, val: number) => {
    const d = Math.abs(ref - val);
    if (d < threshold) snapY.push({ dist: d, delta: val - ref, pos: val });
  };

  // Canvas edges, centre and thirds
  [0, canvasW / 3, canvasW / 2, (2 * canvasW) / 3, canvasW].forEach((snap) => {
    tryX(oL, snap as number);
    tryX(oR, snap as number);
    tryX(oCX, snap as number);
  });
  [0, canvasH / 3, canvasH / 2, (2 * canvasH) / 3, canvasH].forEach((snap) => {
    tryY(oT, snap as number);
    tryY(oB, snap as number);
    tryY(oCY, snap as number);
  });

  // Other objects
  (others || []).forEach((other) => {
    if (!other || other === objRect || !other.elementKey) return;
    const tL = other.left;
    const tT = other.top;
    const tR = other.left + other.width;
    const tB = other.top + other.height;
    const tCX = tL + other.width / 2;
    const tCY = tT + other.height / 2;

    tryX(oL, tL);
    tryX(oL, tR);
    tryX(oR, tR);
    tryX(oR, tL);
    tryX(oCX, tCX);

    tryY(oT, tT);
    tryY(oT, tB);
    tryY(oB, tB);
    tryY(oB, tT);
    tryY(oCY, tCY);
  });

  return { snapX, snapY };
};

export const clampRectToCanvas = (
  rect: Rect,
  canvasW: number,
  canvasH: number,
  safeZoneH = 50,
) => {
  const maxLeft = Math.max(0, canvasW - rect.width);
  const maxTop = Math.max(0, canvasH - rect.height - safeZoneH);
  const clampedLeft = Math.max(0, Math.min(maxLeft, rect.left));
  const clampedTop = Math.max(0, Math.min(maxTop, rect.top));
  return { left: clampedLeft, top: clampedTop };
};

export const createSnapLine = (x1: number, y1: number, x2: number, y2: number, color = '#FF3C78') =>
  new fabric.Line([x1, y1, x2, y2], {
    stroke: color,
    strokeWidth: 1,
    selectable: false,
    evented: false,
    strokeUniform: true,
    opacity: 0.9,
  });

export const clearLines = (canvas: fabric.Canvas, lines: fabric.Line[]) => {
  lines.forEach((l) => canvas.remove(l));
};