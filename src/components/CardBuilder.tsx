/**
 * CardBuilder — Fabric.js-based card design tool for creating speaker website cards.
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Lock,
  Unlock,
  Copy,
  ChevronsUp,
  ChevronsDown,
  ChevronUp as BringForward,
  ChevronDown as SendBackward,
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

// Position input — local text state so the user can type freely; propagates on valid integer
function PositionInput({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  const [text, setText] = useState(String(Math.round(value)));
  useEffect(() => { setText(String(Math.round(value))); }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9\-]/g, "");
        setText(raw);
        const val = parseInt(raw, 10);
        if (!isNaN(val)) onChange(val);
      }}
      onBlur={() => setText(String(Math.round(value)))}
      className={className}
      maxLength={5}
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
    text: "Victoria Bartholomew-Richardson",
    nameFormat: "two-line" as "two-line", // always two-line: first name <break> last name
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
    text: "Vice President Marketing",
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

// ── Gradient helpers ─────────────────────────────────────────────────────────
// Generates a two-stop gradient from a base hex colour. Three styles:
//   "dark"  — very dark shade → base colour (dramatic, works great for Overlay)
//   "tonal" — medium dark → medium light of the same hue (rich and cohesive)
//   "soft"  — base colour → near-white tint (airy, suits lighter backgrounds)
function hexToHsl(hex: string): [number, number, number] {
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
function hslToHex(h: number, s: number, l: number): string {
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
function deriveGradient(baseHex: string, style: "dark" | "tonal" | "soft"): { from: string; to: string } {
  const [h, s, l] = hexToHsl(baseHex);
  if (style === "dark")  return { from: hslToHex(h, Math.min(s + 10, 100), Math.max(l - 45, 5)), to: baseHex };
  if (style === "soft")  return { from: baseHex, to: hslToHex(h, Math.max(s - 35, 0), Math.min(l + 38, 94)) };
  /* tonal */             return { from: hslToHex(h, s, Math.max(l - 28, 5)), to: hslToHex(h, Math.max(s - 10, 0), Math.min(l + 18, 92)) };
}

// Hex-first colour picker popover — used in Quick Setup and anywhere else we want
// hex as the primary input rather than the browser's native picker (which defaults to RGB).
const QUICK_SWATCHES = [
  "#ffffff","#000000","#1e293b","#0f172a","#111827","#374151",
  "#1d4ed8","#2563eb","#0891b2","#0d9488","#16a34a","#65a30d",
  "#dc2626","#ea580c","#d97706","#ca8a04","#9333ea","#db2777",
];
function QuickColorPicker({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-7 h-7 rounded border-2 border-border hover:border-primary transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ backgroundColor: value }}
          title={label ?? "Pick colour"}
        />
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3 z-[300]" align="start" side="bottom">
        <div className="text-xs font-medium text-muted-foreground mb-2">Hex</div>
        <HexColorInput
          value={value}
          onChange={onChange}
          className="w-full h-8 text-sm font-mono px-2 rounded border border-border bg-background mb-3"
        />
        <div className="grid grid-cols-6 gap-1">
          {QUICK_SWATCHES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${value.toLowerCase() === c ? 'border-primary' : 'border-border/40'}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Shared class strings used repeatedly in JSX
const SIDEBAR_ELEM_BTN = "w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-move";
const CTX_MENU_BTN = "w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2";
const TOOLBAR_ICON_BTN = "p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground";

// Shared preset type — defined before the component so state can reference it
interface StarterPreset {
  name: string;
  description: string;
  thumbnail: string;
  thumbnailShape: "square" | "landscape" | "portrait";
  defaultBg: string;
  defaultTextColor: string;
  canvasW: number;
  canvasH: number;
  // Shapes offered in Quick Setup headshot picker (first = default). Empty = no picker shown.
  allowedHeadshotShapes: string[];
  apply: (bg?: string, textColor?: string, font?: string, canvasW?: number, canvasH?: number, headshotShape?: string) => void;
}

// CSS div-based previews using the actual template colours so each one
// immediately reads as distinct. Much clearer than SVG wireframes.
function TemplateThumbnail({ type }: { type: string }) {
  // Shared reusable pieces
  const PersonSilhouette = ({ size = 40, className = "" }: { size?: number; className?: string }) => (
    <div className={`relative flex flex-col items-center ${className}`} style={{ width: size, height: size * 1.1 }}>
      <div className="rounded-full bg-white/30" style={{ width: size * 0.42, height: size * 0.42 }} />
      <div className="rounded-t-full bg-white/30 mt-0.5" style={{ width: size * 0.58, height: size * 0.32 }} />
    </div>
  );

  // Shared neutral palette — same across all thumbnails so they read as layout wireframes, not colour choices
  const TN_BG = "#ffffff";       // white canvas
  const TN_PHOTO = "#d1d5db";    // grey-300 — photo / headshot area
  const TN_LOGO = "#e5e7eb";     // grey-200 — logo placeholder
  const TN_NAME = "#374151";     // grey-700 — primary text bar
  const TN_SUB = "#9ca3af";      // grey-400 — secondary text bars

  switch (type) {
    case "overlay":
      return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: TN_PHOTO }}>
          {/* full-bleed photo fill */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <PersonSilhouette size={60} />
          </div>
          {/* gradient overlay bottom half — darkens to show text sits over photo */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: "55%", background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)" }} />
          {/* logo top-right */}
          <div className="absolute top-3 right-3 rounded" style={{ width: "22%", height: "9%", background: "rgba(255,255,255,0.6)" }} />
          {/* text stack bottom-left */}
          <div className="absolute bottom-4 left-4 right-8 space-y-1.5">
            <div className="rounded-sm" style={{ height: 8, width: "58%", background: "#ffffff" }} />
            <div className="rounded-sm" style={{ height: 5, width: "78%", background: "rgba(255,255,255,0.65)" }} />
            <div className="rounded-sm" style={{ height: 4, width: "42%", background: "rgba(255,255,255,0.45)" }} />
          </div>
        </div>
      );

    case "split":
      return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: TN_BG }}>
          {/* name full-width at top */}
          <div className="absolute rounded-sm" style={{ top: "8%", left: "5%", right: "5%", height: 9, background: TN_NAME }} />
          {/* circle headshot right — oversized, clips edge */}
          <div className="absolute flex items-center justify-center rounded-full"
            style={{ right: "-4%", top: "26%", width: "50%", aspectRatio: "1", background: TN_PHOTO }}>
            <PersonSilhouette size={36} />
          </div>
          {/* logo top-left, below name */}
          <div className="absolute rounded" style={{ left: "5%", top: "22%", width: "28%", height: "9%", background: TN_LOGO }} />
          {/* text stack left-column, mid-card */}
          <div className="absolute flex flex-col gap-1.5" style={{ left: "5%", top: "38%" }}>
            <div className="rounded-sm" style={{ height: 5, width: 44, background: TN_SUB }} />
            <div className="rounded-sm" style={{ height: 4, width: 34, background: TN_SUB }} />
          </div>
        </div>
      );

    case "spotlight":
      return (
        <div className="relative w-full h-full flex flex-col items-center overflow-hidden" style={{ background: TN_BG }}>
          {/* circle headshot centred top */}
          <div className="flex items-center justify-center rounded-full mt-5" style={{ width: "40%", height: "38%", background: TN_PHOTO }}>
            <PersonSilhouette size={36} />
          </div>
          {/* text stack centred */}
          <div className="flex flex-col items-center gap-1.5 mt-3 px-3 w-full">
            <div className="rounded-sm" style={{ height: 8, width: "68%", background: TN_NAME }} />
            <div className="rounded-sm" style={{ height: 5, width: "54%", background: TN_SUB }} />
            <div className="rounded-sm" style={{ height: 4, width: "40%", background: TN_SUB }} />
          </div>
          {/* logo bottom */}
          <div className="rounded-sm mt-auto mb-3" style={{ width: "28%", height: "7%", background: TN_LOGO }} />
        </div>
      );

    case "brand-forward":
      return (
        <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ background: TN_BG }}>
          {/* company logo HERO — dominates the top half */}
          <div className="flex items-center justify-center mx-2 mt-2 rounded" style={{ height: "44%", background: TN_PHOTO }}>
            <div className="rounded" style={{ width: "65%", height: "38%", background: TN_LOGO }} />
          </div>
          {/* centered circle headshot */}
          <div className="flex items-center justify-center mt-2">
            <div className="flex items-center justify-center rounded-full" style={{ width: "26%", aspectRatio: "1", background: TN_PHOTO }}>
              <PersonSilhouette size={20} />
            </div>
          </div>
          {/* centered text stack */}
          <div className="flex flex-col items-center gap-1.5 mt-2 px-2">
            <div className="rounded-sm" style={{ height: 7, width: "70%", background: TN_NAME }} />
            <div className="rounded-sm" style={{ height: 4, width: "56%", background: TN_SUB }} />
            <div className="rounded-sm" style={{ height: 4, width: "44%", background: TN_SUB }} />
          </div>
        </div>
      );

    case "dark-editorial":
      return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: TN_BG }}>
          {/* square headshot top-left */}
          <div className="absolute flex items-center justify-center rounded" style={{ left: "8%", top: "8%", width: "42%", height: "44%", background: TN_PHOTO }}>
            <PersonSilhouette size={36} />
          </div>
          {/* large name top-right */}
          <div className="absolute flex flex-col gap-1.5" style={{ left: "56%", top: "8%", right: "5%" }}>
            <div className="rounded-sm" style={{ height: 9, background: TN_NAME }} />
            <div className="rounded-sm" style={{ height: 9, width: "80%", background: TN_NAME }} />
            <div className="rounded-sm mt-1" style={{ height: 4, width: "90%", background: TN_SUB }} />
            <div className="rounded-sm" style={{ height: 4, width: "68%", background: TN_SUB }} />
          </div>
          {/* logo bottom-left */}
          <div className="absolute rounded" style={{ left: "8%", bottom: "8%", width: "30%", height: "10%", background: TN_LOGO }} />
        </div>
      );

    case "wide-photo":
      return (
        <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ background: TN_BG }}>
          {/* full-width banner photo at top */}
          <div className="relative flex items-center justify-center flex-shrink-0" style={{ height: "42%", background: TN_PHOTO }}>
            <PersonSilhouette size={36} />
          </div>
          {/* text stack below */}
          <div className="flex flex-col gap-1.5 px-3 mt-3">
            <div className="rounded-sm" style={{ height: 8, width: "72%", background: TN_NAME }} />
            <div className="rounded-sm" style={{ height: 5, width: "58%", background: TN_SUB }} />
            <div className="rounded-sm" style={{ height: 4, width: "44%", background: TN_SUB }} />
          </div>
          {/* logo bottom-right */}
          <div className="absolute bottom-3 right-3 rounded" style={{ width: "26%", height: "8%", background: TN_LOGO }} />
        </div>
      );

    case "editorial":
      return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: TN_PHOTO }}>
          {/* full-bleed photo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <PersonSilhouette size={60} />
          </div>
          {/* heavy gradient — lower half, very dark to distinguish from overlay */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: "55%", background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)" }} />
          {/* logo top-right — sits in clear photo area */}
          <div className="absolute top-3 right-3 rounded" style={{ width: "20%", height: "8%", background: "rgba(255,255,255,0.6)" }} />
          {/* oversized name — two bars to convey large bold headline */}
          <div className="absolute" style={{ bottom: "18%", left: "8%", right: "8%" }}>
            <div className="rounded-sm mb-1.5" style={{ height: 13, width: "90%", background: "#ffffff" }} />
            <div className="rounded-sm mb-2.5" style={{ height: 13, width: "58%", background: "#ffffff" }} />
            <div className="rounded-sm mb-1" style={{ height: 5, width: "72%", background: "rgba(255,255,255,0.65)" }} />
            <div className="rounded-sm" style={{ height: 4, width: "44%", background: "rgba(255,255,255,0.45)" }} />
          </div>
        </div>
      );

    default:
      return <div className="w-full h-full bg-muted rounded" />;
  }
}

export default function CardBuilder({ eventId, fullscreen = false, onBack }: CardBuilderProps) {
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

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropMode, setCropMode] = useState<"headshot" | "logo" | "template" | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState("");

  const [shapePopupOpen, setShapePopupOpen] = useState(false);
  const [shapePopupPosition, setShapePopupPosition] = useState({ x: 0, y: 0 });

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
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

  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Multi-selection tracking — for applying formatting to all selected text elements at once
  const [multiSelectedKeys, setMultiSelectedKeys] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementKey: string } | null>(null);
  const [bgColor, setBgColor] = useState<string>("#ffffff");

  const [bgPanelOpen, setBgPanelOpen] = useState(false);

  // Onboarding — shows once on first visit to website card builder
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.includes('/website-card-builder') &&
      !localStorage.getItem('seamless-card-builder-onboarding-website-v1');
  });
  const [onboardingShowShapePicker, setOnboardingShowShapePicker] = useState(false);
  const [onboardingShowTemplates, setOnboardingShowTemplates] = useState(false);
  const [onboardingQuickSetup, setOnboardingQuickSetup] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<StarterPreset | null>(null);
  const [quickBg, setQuickBg] = useState("#ffffff");
  const [quickTextColor, setQuickTextColor] = useState("#111827");
  const [quickFont, setQuickFont] = useState("Montserrat");
  const [quickShape, setQuickShape] = useState<"square" | "landscape" | "portrait">("square");
  const [quickHeadshotShape, setQuickHeadshotShape] = useState("circle");
  const [bgGradient, setBgGradient] = useState<{ from: string; to: string } | null>(null);
  const [bgGradientStyle, setBgGradientStyle] = useState<"dark" | "tonal" | "soft" | null>(null);
  const [showCanvasTip, setShowCanvasTip] = useState(false);
  const [canvasTipDontShow, setCanvasTipDontShow] = useState(false);
  const [showSidebarTip, setShowSidebarTip] = useState(() =>
    typeof window !== 'undefined' &&
    window.location.pathname.includes('/website-card-builder') &&
    !localStorage.getItem('seamless-card-builder-tip-v1')
  );

  const [missingFormDialogOpen, setMissingFormDialogOpen] = useState(false);

  const { data: formConfig } = useQuery<{ config: FormFieldConfig[] }>({
    queryKey: ["formConfig", eventId, "speaker-info"],
    queryFn: async () => {
      try {
        return await getFormConfigForEvent(eventId || "", "speaker-info");
      } catch (err: any) {
        // 404 = no form configured for this event yet — show setup dialog
        if (err?.status === 404) {
          setMissingFormDialogOpen(true);
        }
        throw err;
      }
    },
    enabled: Boolean(eventId),
  });

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

  // ── Starter template presets, organised by canvas shape ──────────────────────────────────────
  // Each template uses hand-tuned fixed pixel positions designed for its specific canvas size.
  // Colors and font come from the Quick Setup step (or use defaults if called directly).

  const makeApply = (buildConfig: (bg: string, textColor: string, font: string, canvasW: number, canvasH: number) => CardConfig) =>
    (bg = "#ffffff", textColor = "#000000", font = "Montserrat", canvasW = 600, canvasH = 600, headshotShape?: string) => {
      let newConfig = buildConfig(bg, textColor, font, canvasW, canvasH);
      // Override headshot shape if specified (e.g. circle vs square vs rounded in Quick Setup picker)
      if (headshotShape && newConfig.headshot) {
        newConfig = { ...newConfig, headshot: { ...newConfig.headshot, shape: headshotShape } };
      }
      setBgColor(bg);
      setBgGradient(null);
      setBgGradientStyle(null);
      setTemplateUrl(null);
      setConfig(newConfig);
      addToHistory(newConfig);
      setCanvasWidth(canvasW); setCanvasHeight(canvasH);
      if (fabricCanvasRef.current) fabricCanvasRef.current.setDimensions({ width: canvasW, height: canvasH });
      setHasUnsavedChanges(true);
    };

  // ── WEBSITE CARD TEMPLATES (cardType === 'website' only) ──────────────────────────────────
  // 9 templates: 3 shapes × 3 layouts. All gated behind cardType === 'website' in the UI.
  // Do NOT add promo templates here — promo gets its own separate preset arrays (TODO).

  // ── SQUARE 600×600 ─────────────────────────────────────────────────────────────────────────
  // Font standard: name 55px / title 28px / company 28px. Logo standard: 128×64 (≈ name line height).
  const SQUARE_PRESETS: StarterPreset[] = [
    {
      // Full-bleed headshot, gradient lower ~47%, text anchored to bottom.
      // Safe zone maths (800px): company_y(689) + wrap(33) + height(28) = 750 ✓
      // Logo top-right in clear photo area. Gradient y:420 covers name at y:522.
      name: "Overlay",
      description: "Full-bleed photo, gradient reveals text at the bottom",
      thumbnail: "overlay",
      thumbnailShape: "square",
      defaultBg: "#000000",
      defaultTextColor: "#ffffff",
      canvasW: 800, canvasH: 800,
      allowedHeadshotShapes: [],
      apply: makeApply((bg, textColor, font) => ({
        headshot:        { ...ELEMENT_TEMPLATES.headshot, shape: "full-bleed", x: 0, y: 0, size: 800, zIndex: 1 },
        gradientOverlay: { ...ELEMENT_TEMPLATES.gradientOverlay, x: 0, y: 420, width: 800, height: 380, gradientDirection: "bottom", overlayOpacity: 0.90, zIndex: 3 },
        companyLogo:     { ...ELEMENT_TEMPLATES.companyLogo, x: 632, y: 20, width: 148, height: 74, size: 70, zIndex: 6 },
        name:            { ...ELEMENT_TEMPLATES.name, x: 36, y: 528, color: textColor, fontFamily: font, fontSize: 55, nameFormat: "two-line", width: 728, fontWeight: 700, zIndex: 10 },
        title:           { ...ELEMENT_TEMPLATES.title, x: 36, y: 651, color: textColor, fontFamily: font, fontSize: 28, width: 728, fontWeight: 500, zIndex: 8 },
        company:         { ...ELEMENT_TEMPLATES.company, x: 36, y: 689, color: textColor, fontFamily: font, fontSize: 28, width: 500, fontWeight: 400, zIndex: 7 },
      })),
    },
    {
      // Text block full-width at top. Headshot below, clear of worst-case text expansion (company bottom ~250).
      // Safe zone (600px): headshot y:265 size:200 → bottom:465. Logo y:473 → bottom:547 ≤ 550 ✓
      name: "Headline",
      description: "Full-width name and details at top, circle photo below, logo bottom-left",
      thumbnail: "headline",
      thumbnailShape: "square",
      defaultBg: "#000000",
      defaultTextColor: "#ffffff",
      canvasW: 600, canvasH: 600,
      allowedHeadshotShapes: ["circle", "square", "rounded"],
      apply: makeApply((bg, textColor, font) => ({
        name:        { ...ELEMENT_TEMPLATES.name, x: 24, y: 22, color: textColor, fontFamily: font, fontSize: 55, nameFormat: "two-line", width: 552, fontWeight: 700, zIndex: 4 },
        title:       { ...ELEMENT_TEMPLATES.title, x: 24, y: 151, color: textColor, fontFamily: font, fontSize: 28, width: 552, fontWeight: 500, zIndex: 3 },
        company:     { ...ELEMENT_TEMPLATES.company, x: 24, y: 189, color: textColor, fontFamily: font, fontSize: 28, width: 552, fontWeight: 400, zIndex: 2 },
        headshot:    { ...ELEMENT_TEMPLATES.headshot, shape: "circle", x: 200, y: 265, size: 200, zIndex: 1 },
        companyLogo: { ...ELEMENT_TEMPLATES.companyLogo, x: 20, y: 473, width: 148, height: 74, size: 70, zIndex: 5 },
      })),
    },
    {
      // Logo centred above headshot — removes logo from the text expansion zone entirely.
      // Safe zone maths (600px): company_y(488) + wrap(33) + height(28) = 549 ≤ 550 ✓
      // Headshot 200px centred (x:200). 21px gap between headshot bottom (300) and name (321).
      name: "Spotlight",
      description: "Centered circle photo, centered text below, clean and minimal",
      thumbnail: "spotlight",
      thumbnailShape: "square",
      defaultBg: "#000000",
      defaultTextColor: "#ffffff",
      canvasW: 600, canvasH: 600,
      allowedHeadshotShapes: ["circle", "square", "rounded"],
      apply: makeApply((bg, textColor, font) => ({
        companyLogo: { ...ELEMENT_TEMPLATES.companyLogo, x: 204, y: 16, width: 192, height: 74, size: 70, zIndex: 6 },
        headshot:    { ...ELEMENT_TEMPLATES.headshot, shape: "circle", x: 200, y: 100, size: 200, zIndex: 1 },
        name:        { ...ELEMENT_TEMPLATES.name, x: 60, y: 321, color: textColor, fontFamily: font, fontSize: 55, nameFormat: "two-line", width: 480, textAlign: "center", fontWeight: 700, zIndex: 4 },
        title:       { ...ELEMENT_TEMPLATES.title, x: 60, y: 450, color: textColor, fontFamily: font, fontSize: 28, width: 480, textAlign: "center", fontWeight: 500, zIndex: 3 },
        company:     { ...ELEMENT_TEMPLATES.company, x: 60, y: 488, color: textColor, fontFamily: font, fontSize: 28, width: 480, textAlign: "center", fontWeight: 400, zIndex: 2 },
      })),
    },
  ];

  // ── LANDSCAPE 900×600 ──────────────────────────────────────────────────────────────────────
  const LANDSCAPE_PRESETS: StarterPreset[] = [
    {
      // Full-bleed headshot, gradient lower third, text anchored to bottom.
      // Safe zone maths (600px): company_y(488) + wrap(33) + height(28) = 549 ≤ 550 ✓
      // Logo top-right in clear photo area above gradient and text zone.
      // Gradient starts y:271 to cover name at y:321.
      name: "Overlay",
      description: "Full-bleed photo, gradient reveals text at the bottom",
      thumbnail: "overlay",
      thumbnailShape: "landscape",
      defaultBg: "#000000",
      defaultTextColor: "#ffffff",
      canvasW: 900, canvasH: 600,
      allowedHeadshotShapes: [],
      apply: makeApply((bg, textColor, font) => ({
        headshot:        { ...ELEMENT_TEMPLATES.headshot, shape: "full-bleed", x: 0, y: 0, size: 900, zIndex: 1 },
        gradientOverlay: { ...ELEMENT_TEMPLATES.gradientOverlay, x: 0, y: 271, width: 900, height: 329, gradientDirection: "bottom", overlayOpacity: 0.90, zIndex: 3 },
        companyLogo:     { ...ELEMENT_TEMPLATES.companyLogo, x: 732, y: 18, width: 148, height: 74, size: 70, zIndex: 6 },
        name:            { ...ELEMENT_TEMPLATES.name, x: 40, y: 321, color: textColor, fontFamily: font, fontSize: 55, nameFormat: "two-line", width: 560, fontWeight: 700, zIndex: 10 },
        title:           { ...ELEMENT_TEMPLATES.title, x: 40, y: 450, color: textColor, fontFamily: font, fontSize: 28, width: 560, fontWeight: 500, zIndex: 8 },
        company:         { ...ELEMENT_TEMPLATES.company, x: 40, y: 488, color: textColor, fontFamily: font, fontSize: 28, width: 380, fontWeight: 400, zIndex: 7 },
      })),
    },
    {
      // Headshot left (x:36, size:480). Right column x:556, width:308. Logo top of column.
      // Text well within safe zone — right column max content bottom ~320, far from 550 ✓
      // 20px gap between logo bottom (110) and name (130).
      name: "Side by Side",
      description: "Large square photo left, event logo and speaker info right",
      thumbnail: "side-by-side",
      thumbnailShape: "landscape",
      defaultBg: "#000000",
      defaultTextColor: "#ffffff",
      canvasW: 900, canvasH: 600,
      allowedHeadshotShapes: ["square", "rounded", "circle"],
      apply: makeApply((bg, textColor, font) => ({
        headshot:    { ...ELEMENT_TEMPLATES.headshot, shape: "square", x: 36, y: 36, size: 480, zIndex: 1 },
        companyLogo: { ...ELEMENT_TEMPLATES.companyLogo, x: 556, y: 36, width: 148, height: 74, size: 70, zIndex: 5 },
        name:        { ...ELEMENT_TEMPLATES.name, x: 556, y: 130, color: textColor, fontFamily: font, fontSize: 55, nameFormat: "two-line", width: 308, fontWeight: 700, zIndex: 4 },
        title:       { ...ELEMENT_TEMPLATES.title, x: 556, y: 259, color: textColor, fontFamily: font, fontSize: 22, width: 308, fontWeight: 500, zIndex: 3 },
        company:     { ...ELEMENT_TEMPLATES.company, x: 556, y: 293, color: textColor, fontFamily: font, fontSize: 22, width: 308, fontWeight: 400, zIndex: 2 },
      })),
    },
    {
      // Full-bleed photo, very heavy gradient (0.95), bold name (weight:800) dominates — announcement feel.
      // Safe zone maths (600px): company_y(488) + wrap(33) + height(28) = 549 ≤ 550 ✓
      // Logo top-right in clear photo area. Gradient starts y:271 to cover name at y:321.
      name: "Editorial",
      description: "Full-bleed photo, bold headline lower panel — speaker name leads the card",
      thumbnail: "editorial",
      thumbnailShape: "landscape",
      defaultBg: "#000000",
      defaultTextColor: "#ffffff",
      canvasW: 900, canvasH: 600,
      allowedHeadshotShapes: [],
      apply: makeApply((bg, textColor, font) => ({
        headshot:        { ...ELEMENT_TEMPLATES.headshot, shape: "full-bleed", x: 0, y: 0, size: 900, zIndex: 1 },
        gradientOverlay: { ...ELEMENT_TEMPLATES.gradientOverlay, x: 0, y: 271, width: 900, height: 329, gradientDirection: "bottom", overlayOpacity: 0.95, zIndex: 3 },
        companyLogo:     { ...ELEMENT_TEMPLATES.companyLogo, x: 728, y: 24, width: 148, height: 74, size: 70, zIndex: 6 },
        name:            { ...ELEMENT_TEMPLATES.name, x: 40, y: 321, color: textColor, fontFamily: font, fontSize: 55, nameFormat: "two-line", width: 680, fontWeight: 800, zIndex: 10 },
        title:           { ...ELEMENT_TEMPLATES.title, x: 40, y: 450, color: textColor, fontFamily: font, fontSize: 28, width: 580, fontWeight: 500, zIndex: 8 },
        company:         { ...ELEMENT_TEMPLATES.company, x: 40, y: 488, color: textColor, fontFamily: font, fontSize: 28, width: 400, fontWeight: 400, zIndex: 7 },
      })),
    },
  ];

  // ── PORTRAIT ───────────────────────────────────────────────────────────────────────────────
  // Heights: Overlay 600×800 (cinematic), Spotlight 600×640, Brand Forward 600×660.
  const PORTRAIT_PRESETS: StarterPreset[] = [
    {
      // Full-bleed headshot, gradient covers bottom half (y:401 → 800).
      // Safe zone maths (800px): company_y(688) + wrap(33) + height(28) = 749 ≤ 750 ✓
      // Logo top-right in clear photo area above gradient and text zone.
      name: "Overlay",
      description: "Full-bleed photo, gradient reveals text at the bottom",
      thumbnail: "overlay",
      thumbnailShape: "portrait",
      defaultBg: "#000000",
      defaultTextColor: "#ffffff",
      canvasW: 600, canvasH: 800,
      allowedHeadshotShapes: [],
      apply: makeApply((bg, textColor, font) => ({
        headshot:        { ...ELEMENT_TEMPLATES.headshot, shape: "full-bleed", x: 0, y: 0, size: 600, zIndex: 1 },
        gradientOverlay: { ...ELEMENT_TEMPLATES.gradientOverlay, x: 0, y: 401, width: 600, height: 399, gradientDirection: "bottom", overlayOpacity: 0.92, zIndex: 3 },
        companyLogo:     { ...ELEMENT_TEMPLATES.companyLogo, x: 432, y: 20, width: 148, height: 74, size: 70, zIndex: 6 },
        name:            { ...ELEMENT_TEMPLATES.name, x: 36, y: 521, color: textColor, fontFamily: font, fontSize: 55, nameFormat: "two-line", width: 528, fontWeight: 700, zIndex: 10 },
        title:           { ...ELEMENT_TEMPLATES.title, x: 36, y: 650, color: textColor, fontFamily: font, fontSize: 28, width: 528, fontWeight: 500, zIndex: 8 },
        company:         { ...ELEMENT_TEMPLATES.company, x: 36, y: 688, color: textColor, fontFamily: font, fontSize: 28, width: 380, fontWeight: 400, zIndex: 7 },
      })),
    },
    {
      // Logo centred above headshot — removes logo from the text expansion zone entirely.
      // Safe zone maths (640px): company_y(528) + wrap(33) + height(28) = 589 ≤ 590 ✓
      // Headshot 240px centred (x:180). 21px gap between headshot bottom (340) and name (361).
      name: "Spotlight",
      description: "Centered circle photo, centered text below — clean poster feel",
      thumbnail: "spotlight",
      thumbnailShape: "portrait",
      defaultBg: "#000000",
      defaultTextColor: "#ffffff",
      canvasW: 600, canvasH: 640,
      allowedHeadshotShapes: ["circle", "square", "rounded"],
      apply: makeApply((bg, textColor, font) => ({
        companyLogo: { ...ELEMENT_TEMPLATES.companyLogo, x: 204, y: 16, width: 192, height: 74, size: 70, zIndex: 6 },
        headshot:    { ...ELEMENT_TEMPLATES.headshot, shape: "circle", x: 180, y: 100, size: 240, zIndex: 1 },
        name:        { ...ELEMENT_TEMPLATES.name, x: 60, y: 361, color: textColor, fontFamily: font, fontSize: 55, nameFormat: "two-line", width: 480, textAlign: "center", fontWeight: 700, zIndex: 4 },
        title:       { ...ELEMENT_TEMPLATES.title, x: 60, y: 490, color: textColor, fontFamily: font, fontSize: 28, width: 480, textAlign: "center", fontWeight: 500, zIndex: 3 },
        company:     { ...ELEMENT_TEMPLATES.company, x: 60, y: 528, color: textColor, fontFamily: font, fontSize: 28, width: 480, textAlign: "center", fontWeight: 400, zIndex: 2 },
      })),
    },
    {
      // Event logo hero top (480×160). Headshot small-centred below logo.
      // Safe zone maths (660px): company_y(548) + wrap(33) + height(28) = 609 ≤ 610 ✓
      // Headshot moved to y:206 (18px gap from logo bottom 188) so it clears name at y:381 by 15px.
      name: "Brand Forward",
      description: "Event logo dominates the top half, speaker photo and info fill the bottom",
      thumbnail: "brand-forward",
      thumbnailShape: "portrait",
      defaultBg: "#000000",
      defaultTextColor: "#ffffff",
      canvasW: 600, canvasH: 660,
      allowedHeadshotShapes: ["circle", "square", "rounded"],
      apply: makeApply((bg, textColor, font) => ({
        companyLogo: { ...ELEMENT_TEMPLATES.companyLogo, x: 60, y: 28, width: 480, height: 160, size: 60, zIndex: 5 },
        headshot:    { ...ELEMENT_TEMPLATES.headshot, shape: "circle", x: 220, y: 206, size: 160, zIndex: 1 },
        name:        { ...ELEMENT_TEMPLATES.name, x: 60, y: 381, color: textColor, fontFamily: font, fontSize: 55, nameFormat: "two-line", width: 480, textAlign: "center", fontWeight: 700, zIndex: 4 },
        title:       { ...ELEMENT_TEMPLATES.title, x: 60, y: 510, color: textColor, fontFamily: font, fontSize: 28, width: 480, textAlign: "center", fontWeight: 500, zIndex: 3 },
        company:     { ...ELEMENT_TEMPLATES.company, x: 60, y: 548, color: textColor, fontFamily: font, fontSize: 28, width: 480, textAlign: "center", fontWeight: 400, zIndex: 2 },
      })),
    },
  ];

  // Flat list of all website templates (used internally — website only)
  const STARTER_PRESETS: StarterPreset[] = [...SQUARE_PRESETS, ...LANDSCAPE_PRESETS, ...PORTRAIT_PRESETS];
  // ── END WEBSITE CARD TEMPLATES ─────────────────────────────────────────────────────────────
  // PROMO_PRESETS go here when built — use separate arrays, separate onboarding state, separate localStorage key.

  // Returns the right preset list for the currently-selected onboarding shape
  const presetsForShape = (shape: "square" | "landscape" | "portrait") =>
    shape === "landscape" ? LANDSCAPE_PRESETS : shape === "portrait" ? PORTRAIT_PRESETS : SQUARE_PRESETS;

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
        renderOnAddRemove: false, // prevent deferred RAF renders on each add/remove; we call renderAll() explicitly
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
        setSelectedElement(null);
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

      // Right-click context menu is handled via onContextMenu on the container div (outside shadow DOM)
      // to ensure e.preventDefault() actually suppresses the browser's native menu.

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

        // ── Hard boundary enforcement ────────────────────────────────────────
        // Elements cannot leave the canvas or enter the safe zone (bottom 50px).
        // Re-read bounding rect after snap adjustments so clamping is accurate.
        {
          const SAFE_ZONE_H = 50;
          const cb = obj.getBoundingRect();
          const maxLeft = Math.max(0, cW - cb.width);
          const maxTop  = Math.max(0, cH - SAFE_ZONE_H - cb.height);
          let clamped = false;
          if (cb.left < 0)        { obj.set({ left: (obj.left || 0) - cb.left });            clamped = true; }
          if (cb.left > maxLeft)  { obj.set({ left: (obj.left || 0) + (maxLeft - cb.left) }); clamped = true; }
          if (cb.top  < 0)        { obj.set({ top:  (obj.top  || 0) - cb.top });             clamped = true; }
          if (cb.top  > maxTop)   { obj.set({ top:  (obj.top  || 0) + (maxTop  - cb.top) });  clamped = true; }
          if (clamped) obj.setCoords();
        }

        alignmentLines.forEach((l) => canvas.add(l));
        canvas.renderAll();
      });

      // ── Safe zone guide ─────────────────────────────────────────────────────
      // Draws a dashed line 50px from the bottom of the canvas (editor-only — not exported).
      // Marks the boundary below which title-wrap + company-shift may overflow.
      canvas.on("after:render", () => {
        const ctx = canvas.getContext() as CanvasRenderingContext2D | null;
        if (!ctx) return;
        const cH = canvas.getHeight();
        const cW = canvas.getWidth();
        const safeY = cH - 50;
        ctx.save();
        ctx.strokeStyle = "rgba(79, 156, 251, 0.55)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(0, safeY);
        ctx.lineTo(cW, safeY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "rgba(79, 156, 251, 0.7)";
        ctx.textAlign = "right";
        ctx.fillText("safe zone", cW - 6, safeY - 4);
        ctx.restore();
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
          // Use getScaledWidth/Height — getBoundingRect includes 6px padding and inflates on every save
          if (obj.type === "image") {
            updates.actualWidth = Math.round(obj.getScaledWidth());
            updates.actualHeight = Math.round(obj.getScaledHeight());
            updates.scaleX = obj.scaleX || 1;
            updates.scaleY = obj.scaleY || 1;
          }

          // Save pixel dimensions for groups (placeholders) — avoids compounding scale bugs
          if (obj.type === "group") {
            skipRerenderRef.current = true; // position-only change; no need to rebuild canvas
            setConfig(prev => {
              const newConfig = {
                ...prev,
                [elementKey]: {
                  ...prev[elementKey],
                  x: obj.left || 0,
                  y: obj.top || 0,
                  width: Math.round(obj.getScaledWidth()),
                  height: Math.round(obj.getScaledHeight()),
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

  const renderAllElements = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Claim this render generation — if a newer render starts while we await, we bail out
    const gen = ++renderGenRef.current;

    // Wait for all fonts to be ready before rendering (prevents pixelated fallback fonts)
    try { await document.fonts.ready; } catch (_) {}

    // A newer render was triggered while we were awaiting — bail out to avoid overwriting it
    if (gen !== renderGenRef.current) return;

    // Clear canvas and set background — use setBackgroundColor for both cases so
    // the background is always committed before the final renderAll() at the end.
    canvas.clear();
    if (bgGradient) {
      const grad = new fabric.Gradient({
        type: 'linear',
        gradientUnits: 'pixels',
        coords: { x1: 0, y1: 0, x2: canvasWidth, y2: canvasHeight },
        colorStops: [{ offset: 0, color: bgGradient.from }, { offset: 1, color: bgGradient.to }],
      });
      canvas.setBackgroundColor(grad as any, () => {});
    } else {
      canvas.setBackgroundColor(bgColor, () => {});
    }
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

    // Render elements in zIndex order (lowest first → highest renders on top).
    const sortedEntries = Object.entries(config).sort((a, b) => {
      return (a[1].zIndex || 0) - (b[1].zIndex || 0);
    });
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
          } else if (shape === "banner") {
            // Full canvas width, partial height — scales to cover the banner area, clips to it.
            const bannerW = canvasWidth;
            const bannerH = (cfg.height ?? cfg.size ?? 260) * (cfg.scaleY || 1);
            const imgNaturalW = img.width || 1;
            const imgNaturalH = img.height || 1;
            const coverScale = Math.max(bannerW / imgNaturalW, bannerH / imgNaturalH);
            fabricImg.set({
              left: 0,
              top: cfg.y ?? 0,
              scaleX: coverScale,
              scaleY: coverScale,
              lockMovementX: true,
              lockScalingX: true,
              clipPath: new fabric.Rect({
                left: 0,
                top: cfg.y ?? 0,
                width: bannerW,
                height: bannerH,
                absolutePositioned: true,
              }),
            });
            fabricImg.setControlsVisibility({
              ml: false, mr: false, mt: false,
              tl: false, tr: false, bl: false, br: false,
              mb: true, mtr: false,
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
          } else if (shape === "banner") {
            baseWidth = canvasWidth;
            baseHeight = cfg.height ?? cfg.size; // height: from saved resize or initial size field
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

          // Full-bleed placeholder: lock everything
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

          // Banner placeholder: lock x movement and width, allow height resize via bottom handle only
          if (shape === "banner") {
            group.set({
              left: 0,
              top: cfg.y ?? 0,
              lockMovementX: true,
              lockScalingX: true,
              lockUniScaling: false, // allow non-uniform resize (height only)
            });
            group.setControlsVisibility({
              ml: false, mr: false, mt: false,
              tl: false, tr: false, bl: false, br: false,
              mb: true, mtr: false,
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
          // @CLAUDE please do not add stroke to text as we need to make sure
          // that the backend and the frontend look the same
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

        // Auto-shrink name and title to prevent overflow.
        // Name: max 1 line (unless nameFormat "two-line"). Title: max 2 lines (company moves down to match).
        // Step 1: shrink on line count (handles normal wrapping cases).
        // Step 2: DOM span width check — catches single long words (e.g. hyphenated) that
        //         Fabric won't wrap. DOM is the only reliable measure of the loaded web font.
        // Company y is set dynamically after title renders (see below) — not fixed.
        if (key === "name" || key === "title") {
          const maxLines = 2; // name always two-line
          const minFontSize = key === "name" ? 20 : 14;
          const boxWidth = cfg.width || 300;
          let fs = cfg.fontSize;

          // Fabric Textbox does not call initDimensions() on construction — textLines is empty
          // until we call it explicitly. Without this, Step 1 loop never fires.
          text.initDimensions();

          // Step 1: line count
          while ((text.textLines?.length ?? 0) > maxLines && fs > minFontSize) {
            fs--;
            text.set({ fontSize: fs });
            text.initDimensions();
          }

          // Step 2: width check via DOM span
          const measureEl = document.createElement("span");
          measureEl.style.cssText = `position:absolute;top:-9999px;left:-9999px;white-space:nowrap;font-family:${cfg.fontFamily || "Inter"};font-weight:${cfg.fontWeight || 700};font-size:${fs}px;`;
          document.body.appendChild(measureEl);
          const lines: string[] = (text.textLines as string[]) ?? [];
          let needsWidthShrink = lines.some(line => {
            measureEl.textContent = line;
            return measureEl.getBoundingClientRect().width > boxWidth - 2;
          });
          while (needsWidthShrink && fs > minFontSize) {
            fs--;
            text.set({ fontSize: fs });
            text.initDimensions();
            measureEl.style.fontSize = `${fs}px`;
            needsWidthShrink = (text.textLines as string[]).some(line => {
              measureEl.textContent = line;
              return measureEl.getBoundingClientRect().width > boxWidth - 2;
            });
          }
          document.body.removeChild(measureEl);
          // Fabric.Textbox.initDimensions() expands this.width to dynamicMinWidth when
          // a long unhyphenable token (e.g. "Bartholomew-Richardson") exceeds cfg.width.
          // Reset to the configured width now that font shrinking is complete, then
          // call setCoords() so selection handles and hit area match the final bounds.
          text.set({ width: boxWidth });
          text.initDimensions();
          text.setCoords();
        }

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

    // Apply lock state: locked elements can't be moved/resized but remain selectable for right-click
    Object.entries(config).forEach(([key, cfg]) => {
      const obj = elementRefs.current[key];
      if (obj && cfg.locked) {
        obj.set({
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          hasControls: false,
          hoverCursor: 'not-allowed',
        });
      }
    });

    canvas.renderAll();
  };

  const loadImagePromise = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  // Prefix relative paths with API_BASE so requests go to the backend, not the dev server
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
  }, [config, templateUrl, testHeadshot, testLogo, bgColor, bgGradient]);

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
      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedElement) duplicateElement(selectedElement);
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
      let dx = 0, dy = 0;

      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); dx = -nudgeAmount; break;
        case 'ArrowRight': e.preventDefault(); dx = nudgeAmount; break;
        case 'ArrowUp':    e.preventDefault(); dy = -nudgeAmount; break;
        case 'ArrowDown':  e.preventDefault(); dy = nudgeAmount; break;
        default: return;
      }

      // Move the Fabric object(s) immediately for smooth visual feedback
      activeObject.set('left', (activeObject.left || 0) + dx);
      activeObject.set('top', (activeObject.top || 0) + dy);
      activeObject.setCoords();
      canvas.requestRenderAll();

      // Sync config without triggering a full canvas rebuild
      skipRerenderRef.current = true;
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length > 1) {
        // Multi-select: apply same delta to each element's stored position
        setConfig(prev => {
          const next = { ...prev };
          activeObjects.forEach(obj => {
            const key = obj.data?.elementKey;
            if (key && next[key]) {
              next[key] = { ...next[key], x: (next[key].x || 0) + dx, y: (next[key].y || 0) + dy };
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

  // Migrate loaded configs to current defaults.
  // "two-line" is now the default nameFormat — upgrade any old "single" saves automatically.
  const migrateLoadedConfig = (cfg: CardConfig): { migrated: CardConfig; changed: boolean } => {
    if (!cfg?.name || cfg.name.nameFormat === "two-line") return { migrated: cfg, changed: false };
    return { migrated: { ...cfg, name: { ...cfg.name, nameFormat: "two-line" } }, changed: true };
  };

  // Load saved config on mount: prefer server config for eventId, fallback to localStorage
  useEffect(() => {
    const storageKey = `${cardType}-card-config-${eventId || "default"}`;

    const loadFromLocal = () => {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      try {
        const { config: savedConfig, templateUrl: savedTemplateUrl, canvasWidth: savedWidth, canvasHeight: savedHeight, bgColor: savedBgColor, bgGradient: savedBgGradient, bgIsGenerated: savedBgIsGenerated } = JSON.parse(saved);
        if (savedConfig) {
          const { migrated, changed } = migrateLoadedConfig(savedConfig);
          setConfig(migrated);
          setHasUnsavedChanges(changed);
        }
        if (savedBgColor) setBgColor(savedBgColor);
        if (savedBgGradient) setBgGradient(savedBgGradient);

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

        // Only restore templateUrl as frontend background for user-uploaded images.
        // bgIsGenerated means the PNG was auto-created at save time for backend rendering only.
        if (savedTemplateUrl && !savedBgIsGenerated) {
          const img = new Image();
          img.onerror = () => {
            toast({ title: "Background load failed", description: "Could not load background image due to CORS or network error. Try re-uploading the image.", variant: "destructive" });
            setTemplateUrl(null);
          };
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
              const { migrated, changed } = migrateLoadedConfig(configToSet);
              setConfig(migrated);
              setHasUnsavedChanges(changed);
            }

            if (savedWidth && savedHeight) {
              setCanvasWidth(savedWidth);
              setCanvasHeight(savedHeight);
              if (fabricCanvasRef.current) {
                fabricCanvasRef.current.setDimensions({ width: savedWidth, height: savedHeight });
              }
            }

            // Restore background colour and gradient (template-built cards use these, not templateUrl)
            const savedBgColor = serverConfig.bgColor ?? serverConfig.bg_color;
            if (savedBgColor) setBgColor(savedBgColor);
            const savedBgGradient = serverConfig.bgGradient ?? serverConfig.bg_gradient;
            if (savedBgGradient) setBgGradient(savedBgGradient);

            // Only restore templateUrl as frontend background for user-uploaded images.
            // bgIsGenerated means the PNG was auto-created at save time for backend rendering only.
            const bgIsGenerated = serverConfig.bgIsGenerated ?? false;
            if (savedTemplateUrl && !bgIsGenerated) {
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

  const handleDragStart = (e: React.DragEvent, elementKey: string) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", elementKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const elementKey = e.dataTransfer.getData("text/plain");

    if (!elementKey) return;

    // If headshot and not yet added, show shape selector at drop position
    if (elementKey === "headshot" && !config.headshot) {
      setShapePopupPosition({ x: e.clientX, y: e.clientY });
      setShapePopupOpen(true);
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

    if (!template) return;

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

    toast({ title: "Element added", description: `${template.label} added to canvas` });
  };

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

  const addToHistory = (newConfig: CardConfig) => {
    // Use ref so rapid successive calls (arrow key held down, etc.) never read a stale index
    const currentIdx = historyIndexRef.current;
    const nextIdx = Math.min(currentIdx + 1, 49);
    historyIndexRef.current = nextIdx;
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIdx + 1);
      newHistory.push(JSON.parse(JSON.stringify(newConfig)));
      return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
    });
    setHistoryIndex(nextIdx);
  };

  const undo = () => {
    const currentIdx = historyIndexRef.current;
    if (currentIdx > 0) {
      const newIdx = currentIdx - 1;
      historyIndexRef.current = newIdx;
      setHistoryIndex(newIdx);
      setConfig(JSON.parse(JSON.stringify(history[newIdx])));
    }
  };

  const redo = () => {
    const currentIdx = historyIndexRef.current;
    if (currentIdx < history.length - 1) {
      const newIdx = currentIdx + 1;
      historyIndexRef.current = newIdx;
      setHistoryIndex(newIdx);
      setConfig(JSON.parse(JSON.stringify(history[newIdx])));
    }
  };

  // Set zoom level — resize canvas display and update viewport transform from top-left origin
  const applyZoom = (newZoom: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width: canvasWidth * newZoom, height: canvasHeight * newZoom });
    canvas.setViewportTransform([newZoom, 0, 0, newZoom, 0, 0]);
    setZoom(newZoom);
    canvas.renderAll();
  };
  const handleZoomIn  = () => applyZoom(Math.min(zoom + 0.1, 3));
  const handleZoomOut = () => applyZoom(Math.max(zoom - 0.1, 0.1));

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

    // Use config-stored x/y/width/height — always in canvas coordinate space.
    // Avoids getBoundingRect issues: padding inflation and incorrect coords when
    // objects are inside a Fabric ActiveSelection (where left/top are group-relative).
    const items = keys.flatMap(key => {
      const cfg = config[key];
      if (!cfg) return [];
      const obj = elementRefs.current[key];
      const x = cfg.x || 0;
      const y = cfg.y || 0;
      // actualWidth/Height for images; width/height for groups/text; size fallback for shapes
      const width  = cfg.actualWidth  ?? (obj ? Math.round(obj.getScaledWidth())  : cfg.width  ?? cfg.size ?? 100);
      const height = cfg.actualHeight ?? (obj ? Math.round(obj.getScaledHeight()) : cfg.height ?? cfg.size ?? 100);
      return [{ key, x, y, width, height }];
    });
    if (items.length === 0) return;

    const updates: Record<string, { x: number; y: number }> = {};

    if (items.length === 1) {
      // Single: align to canvas edges/centre
      const { key, x, y, width, height } = items[0];
      let newX = x, newY = y;
      switch (direction) {
        case 'left':    newX = 0; break;
        case 'right':   newX = canvasWidth - width; break;
        case 'centerH': newX = (canvasWidth - width) / 2; break;
        case 'top':     newY = 0; break;
        case 'bottom':  newY = canvasHeight - height; break;
        case 'centerV': newY = (canvasHeight - height) / 2; break;
      }
      updates[key] = { x: newX, y: newY };
    } else {
      // Multi: align to the selection's own bounding box (same as PowerPoint/Canva)
      const selLeft    = Math.min(...items.map(i => i.x));
      const selRight   = Math.max(...items.map(i => i.x + i.width));
      const selTop     = Math.min(...items.map(i => i.y));
      const selBottom  = Math.max(...items.map(i => i.y + i.height));
      const selCenterX = (selLeft + selRight) / 2;
      const selCenterY = (selTop + selBottom) / 2;

      items.forEach(({ key, x, y, width, height }) => {
        let newX = x, newY = y;
        switch (direction) {
          case 'left':    newX = selLeft; break;
          case 'right':   newX = selRight - width; break;
          case 'centerH': newX = selCenterX - width / 2; break;
          case 'top':     newY = selTop; break;
          case 'bottom':  newY = selBottom - height; break;
          case 'centerV': newY = selCenterY - height / 2; break;
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
      addToHistory(next);
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Fixed elements cannot be duplicated (they are singletons)
  const FIXED_KEYS = ["headshot", "name", "title", "company", "companyLogo"];
  const duplicateElement = (key: string) => {
    const cfg = config[key];
    if (!cfg || FIXED_KEYS.includes(key)) return;
    const newKey = cfg.type === "gradient-overlay"
      ? `gradientOverlay_${Date.now()}`
      : `dynamic_${Date.now()}`;
    const maxZ = Math.max(0, ...Object.values(config).map(c => c.zIndex || 0));
    const newCfg = { ...cfg, x: (cfg.x || 0) + 15, y: (cfg.y || 0) + 15, zIndex: maxZ + 1, locked: false };
    setConfig(prev => {
      const next = { ...prev, [newKey]: newCfg };
      addToHistory(next);
      return next;
    });
    setSelectedElement(newKey);
    setHasUnsavedChanges(true);
  };

  // Z-order helpers
  const bringToFront = (key: string) => {
    const maxZ = Math.max(0, ...Object.values(config).map(c => c.zIndex || 0));
    updateElement(key, { zIndex: maxZ + 1 });
  };
  const sendToBack = (key: string) => {
    const minZ = Math.min(0, ...Object.values(config).map(c => c.zIndex || 0));
    updateElement(key, { zIndex: minZ - 1 });
  };
  const bringForward = (key: string) => {
    const currentZ = config[key]?.zIndex || 0;
    // Find the next object above and swap
    const above = Object.entries(config)
      .filter(([k, v]) => k !== key && (v.zIndex || 0) > currentZ)
      .sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0))[0];
    if (above) {
      const aboveZ = above[1].zIndex || 0;
      setConfig(prev => {
        const next = {
          ...prev,
          [key]: { ...prev[key], zIndex: aboveZ },
          [above[0]]: { ...prev[above[0]], zIndex: currentZ },
        };
        addToHistory(next);
        return next;
      });
      setHasUnsavedChanges(true);
    }
  };
  const sendBackward = (key: string) => {
    const currentZ = config[key]?.zIndex || 0;
    const below = Object.entries(config)
      .filter(([k, v]) => k !== key && (v.zIndex || 0) < currentZ)
      .sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0))[0];
    if (below) {
      const belowZ = below[1].zIndex || 0;
      setConfig(prev => {
        const next = {
          ...prev,
          [key]: { ...prev[key], zIndex: belowZ },
          [below[0]]: { ...prev[below[0]], zIndex: currentZ },
        };
        addToHistory(next);
        return next;
      });
      setHasUnsavedChanges(true);
    }
  };

  // Lock / unlock — locked elements show selection handles but can't be moved or resized
  const toggleLock = (key: string) => {
    updateElement(key, { locked: !config[key]?.locked });
  };

  // Shape selector popup helper — adds headshot with given shape at saved drop position
  const addHeadshotShape = (shape: string, extraProps?: Record<string, unknown>) => {
    const dropPos = (window as any).__headshotDropPos;
    addElementToCanvas("headshot", dropPos, { shape, ...extraProps });
    setShapePopupOpen(false);
  };

  // Layers panel helpers
  const selectLayerItem = (key: string) => {
    const canvas = fabricCanvasRef.current;
    const obj = elementRefs.current[key];
    if (canvas && obj) { canvas.setActiveObject(obj); canvas.renderAll(); setSelectedElement(key); }
  };
  const layerMoveUp = (key: string) => {
    const sorted = Object.entries(config).sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0));
    const ci = sorted.findIndex(([k]) => k === key);
    if (ci > 0) {
      const [pk] = sorted[ci - 1];
      const nc = { ...config };
      const tz = nc[key].zIndex;
      nc[key].zIndex = nc[pk].zIndex;
      nc[pk].zIndex = tz;
      setConfig(nc);
    }
  };
  const layerMoveDown = (key: string) => {
    const sorted = Object.entries(config).sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0));
    const ci = sorted.findIndex(([k]) => k === key);
    if (ci < sorted.length - 1) {
      const [nk] = sorted[ci + 1];
      const nc = { ...config };
      const tz = nc[key].zIndex;
      nc[key].zIndex = nc[nk].zIndex;
      nc[nk].zIndex = tz;
      setConfig(nc);
    }
  };

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

  const handleSave = async (silent = false) => {
    // localStorage always gets template-default fontSizes (e.g. 55px) — never the shrunk value.
    // This prevents one speaker's shrink from poisoning the config for all other speakers.
    const effectiveConfig = { ...config };

    const storageKey = `${cardType}-card-config-${eventId || "default"}`;
    localStorage.setItem(storageKey, JSON.stringify({ config: effectiveConfig, templateUrl, canvasWidth, canvasHeight, bgColor, bgGradient, bgIsGenerated: !templateUrl }));

    // Backend payload uses shrunk fontSizes read from live Fabric objects.
    // TEMPORARY: this is a "fake" — it bakes in the shrunk size for whichever test speaker
    // was open at save time. Good enough for layout testing. Backend team should replace this
    // with real per-speaker shrink logic (see API_GAPS.md) and we can remove this override.
    const backendConfig = { ...effectiveConfig };
    (["name", "title"] as const).forEach(k => {
      const obj = elementRefs.current[k] as fabric.Textbox | undefined;
      if (obj && obj.fontSize && backendConfig[k]) {
        backendConfig[k] = { ...backendConfig[k], fontSize: obj.fontSize };
      }
    });

    // Also save to backend if eventId exists
    if (eventId) {
      try {
        // Dynamically import API helpers so this file doesn't eagerly bundle all api methods
        const api = await import("@/lib/api");
        const { createPromoConfig, uploadFile } = api;

        // If templateUrl is a data: or blob: URL, upload it to the /uploads endpoint
        // and replace it with the returned public URL when saving to the server.
        let finalTemplateUrl = templateUrl;

        // Template-built cards have no templateUrl (they use bgColor/bgGradient as background).
        // Generate a background PNG for the backend so it can render speaker cards.
        // bgIsGenerated = true tells the load logic to skip restoring it as frontend background
        // (bgColor/bgGradient handle frontend rendering; the PNG is backend-only).
        const bgIsGenerated = !templateUrl;
        if (bgIsGenerated) {
          try {
            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = canvasWidth;
            bgCanvas.height = canvasHeight;
            const ctx = bgCanvas.getContext('2d');
            if (ctx) {
              if (bgGradient) {
                const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
                grad.addColorStop(0, bgGradient.from);
                grad.addColorStop(1, bgGradient.to);
                ctx.fillStyle = grad;
              } else {
                ctx.fillStyle = bgColor;
              }
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);
              finalTemplateUrl = bgCanvas.toDataURL('image/png');
            }
          } catch (_bgErr) {
            // Non-fatal — proceed without background image
          }
        }

        if (finalTemplateUrl && (finalTemplateUrl.startsWith("data:") || finalTemplateUrl.startsWith("blob:"))) {
          try {
            // Convert data/blob URL to a Blob, then to a File for upload
            const fetched = await fetch(finalTemplateUrl);
            const blob = await fetched.blob();
            const fileName = `template-${Date.now()}`;
            const file = new File([blob], `${fileName}.${(blob.type || "image/png").split("/").pop()}`, { type: blob.type || "image/png" });

            const uploadRes = await uploadFile(file, undefined, eventId);
            const uploadedUrl = uploadRes?.public_url ?? uploadRes?.publicUrl ?? uploadRes?.url ?? uploadRes?.id ?? null;

            if (uploadedUrl) {
              finalTemplateUrl = uploadedUrl;
              // Only update frontend templateUrl state for user-uploaded backgrounds.
              // Auto-generated PNGs are backend-only — bgColor/bgGradient drive the frontend canvas.
              if (!bgIsGenerated) setTemplateUrl(finalTemplateUrl);
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
            ...backendConfig,
            templateUrl: finalTemplateUrl,
            canvasWidth,
            canvasHeight,
            bgColor,
            bgGradient: bgGradient ?? undefined,
            bgIsGenerated, // tells load logic not to restore templateUrl as frontend background
          },
        });

        // Prefer the canonical templateUrl returned by the server's config endpoint.
        // Only update frontend templateUrl for user-uploaded backgrounds — NOT for
        // auto-generated PNGs (bgIsGenerated=true). Setting templateUrl for generated
        // PNGs would cause the next renderAllElements to load the PNG as a background
        // image, hiding any subsequent bgColor changes made by the user.
        const serverTemplateUrl = saved?.templateUrl ?? saved?.config?.templateUrl ?? saved?.config?.template_url ?? null;
        if (serverTemplateUrl && !bgIsGenerated) {
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

  // Export PNG at 1:1 scale (resets zoom transform temporarily)
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
    setBgGradient(null);
    setBgGradientStyle(null);

    // Clear localStorage
    const storageKey = `${cardType}-card-config-${eventId || "default"}`;
    localStorage.removeItem(storageKey);

    // Reset history
    setHistory([]);
    historyIndexRef.current = -1;
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

  // Reset zoom to 1:1 (toolbar zoom-reset button)
  const handleZoomReset = () => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);
    c.setDimensions({ width: canvasWidth, height: canvasHeight });
    setZoom(1);
    c.renderAll();
  };

  // Export standalone HTML snapshot of the current card
  const handleExportHTML = () => {
    const html = generateCardHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `card-${cardType}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "HTML snapshot downloaded" });
  };

  const applyGradientStyle = (style: "dark" | "tonal" | "soft") => {
    const grad = deriveGradient(bgColor, style);
    setBgGradient(grad);
    setBgGradientStyle(style);
    setHasUnsavedChanges(true);
  };

  const clearGradient = () => {
    setBgGradient(null);
    setBgGradientStyle(null);
    setHasUnsavedChanges(true);
  };

  const dismissOnboarding = () => {
    localStorage.setItem('seamless-card-builder-onboarding-website-v1', '1');
    setShowOnboarding(false);
    setOnboardingShowShapePicker(false);
    setOnboardingShowTemplates(false);
    setOnboardingQuickSetup(false);
    setPendingPreset(null);
  };

  const applyPresetAndDismiss = (preset: StarterPreset) => {
    preset.apply(preset.defaultBg, preset.defaultTextColor, "Montserrat", preset.canvasW, preset.canvasH);
    dismissOnboarding();
  };

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

    const bgStylePart = bgGradient
      ? `background: linear-gradient(135deg, ${escapeHTML(bgGradient.from)}, ${escapeHTML(bgGradient.to)});`
      : `background-color: ${escapeHTML(bgColor)};`;
    const cardStyle = `width: ${canvasWidth}px; height: ${canvasHeight}px; position: relative; ${bgStylePart} background-image: ${templateBg ? `url('${escapeHTML(templateBg)}')` : 'none'}; background-size: cover; overflow: hidden; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);`;

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

      {/* ── Onboarding modal (website card builder only, shows once) ── */}
      {showOnboarding && cardType === 'website' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`bg-card border border-border rounded-2xl shadow-2xl w-full mx-4 overflow-hidden transition-all ${onboardingShowTemplates && !onboardingQuickSetup ? 'max-w-3xl' : 'max-w-lg'}`}>

            {/* Step 1: Welcome / choice */}
            {!onboardingShowShapePicker && !onboardingShowTemplates && !onboardingQuickSetup && (
              <div className="relative p-8">
                <button onClick={dismissOnboarding} className="absolute top-4 right-4 p-1.5 rounded hover:bg-accent text-muted-foreground"><X className="h-4 w-4" /></button>
                <p className="text-sm font-medium mb-6">How do you want to start?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOnboardingShowShapePicker(true)}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold text-sm">Use a template</span>
                  </button>
                  <button
                    onClick={dismissOnboarding}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-border/80 hover:bg-muted/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                      <Square className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="font-semibold text-sm">Blank canvas</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Canvas shape picker */}
            {onboardingShowShapePicker && !onboardingShowTemplates && !onboardingQuickSetup && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOnboardingShowShapePicker(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-sm">Card shape</span>
                  </div>
                  <button onClick={() => { setOnboardingShowShapePicker(false); dismissOnboarding(); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {([
                    { key: "square",    label: "Square",    ratio: "1:1", w: 80, h: 80 },
                    { key: "landscape", label: "Landscape", ratio: "3:2", w: 96, h: 64 },
                    { key: "portrait",  label: "Portrait",  ratio: "2:3", w: 64, h: 96 },
                  ] as const).map(({ key, label, ratio, w, h }) => (
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
                      <div className="flex items-center justify-center" style={{ width: 96, height: 96 }}>
                        <div className="rounded-lg border-2 border-muted-foreground/40 group-hover:border-primary bg-muted/30 group-hover:bg-primary/5 transition-colors" style={{ width: w, height: h }} />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">{label}</div>
                        <div className="text-xs text-muted-foreground">{ratio}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="text-center">
                  <button type="button" onClick={() => { setOnboardingShowShapePicker(false); dismissOnboarding(); }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
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
                    <button onClick={() => { setOnboardingShowTemplates(false); setOnboardingShowShapePicker(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-sm capitalize">{quickShape}</span>
                  </div>
                  <button onClick={() => { setOnboardingShowTemplates(false); dismissOnboarding(); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-5 mb-6">
                  {presetsForShape(quickShape).map((preset) => {
                    const aspectClass = preset.thumbnailShape === 'landscape' ? 'aspect-[3/2]' : preset.thumbnailShape === 'portrait' ? 'aspect-[2/3]' : 'aspect-square';
                    return (
                      <div key={preset.name} className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPendingPreset(preset);
                            setQuickBg(preset.defaultBg);
                            setQuickTextColor(preset.defaultTextColor);
                            setQuickFont("Montserrat");
                            setQuickHeadshotShape(preset.allowedHeadshotShapes[0] ?? "circle");
                            setOnboardingQuickSetup(true);
                          }}
                          className={`${aspectClass} w-full rounded-xl border-2 border-border hover:border-primary hover:shadow-lg transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary`}
                        >
                          <TemplateThumbnail type={preset.thumbnail} />
                        </button>
                        <span className="text-xs font-semibold">{preset.name}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center">
                  <button type="button" onClick={dismissOnboarding} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
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
                    <button onClick={() => setOnboardingQuickSetup(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-sm">{pendingPreset.name}</span>
                  </div>
                  <button onClick={dismissOnboarding} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* 3 pickers */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div>
                    <label className="text-xs font-medium mb-2 block">Background</label>
                    <div className="flex items-center gap-1.5">
                      <QuickColorPicker value={quickBg} onChange={setQuickBg} label="Background colour" />
                      <HexColorInput value={quickBg} onChange={setQuickBg} className="flex-1 h-7 text-xs font-mono px-1.5 rounded border border-border bg-background min-w-0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block">Text</label>
                    <div className="flex items-center gap-1.5">
                      <QuickColorPicker value={quickTextColor} onChange={setQuickTextColor} label="Text colour" />
                      <HexColorInput value={quickTextColor} onChange={setQuickTextColor} className="flex-1 h-7 text-xs font-mono px-1.5 rounded border border-border bg-background min-w-0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block">Font</label>
                    <select value={quickFont} onChange={(e) => setQuickFont(e.target.value)} className="w-full h-7 px-1.5 text-xs border border-border rounded bg-background">
                      {["Roboto","Open Sans","Lato","Montserrat","Poppins","Raleway","Noto Sans","Source Sans Pro","Merriweather","Playfair Display","Nunito","Ubuntu","PT Sans","Karla","Oswald","Fira Sans","Work Sans","Inconsolata","Josefin Sans","Alegreya","Cabin","Titillium Web","Mulish","Quicksand","Anton","Droid Sans","Archivo","Hind","Bitter","Libre Franklin"].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Gradient */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium">Gradient</label>
                    {bgGradient && <button type="button" onClick={() => { setBgGradient(null); setBgGradientStyle(null); }} className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2">Remove</button>}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { style: null,    label: "None"  },
                      { style: "dark",  label: "Dark"  },
                      { style: "tonal", label: "Tonal" },
                      { style: "soft",  label: "Soft"  },
                    ] as const).map(({ style, label }) => {
                      const preview = style ? deriveGradient(quickBg, style) : null;
                      const isActive = style === null ? !bgGradient : bgGradientStyle === style;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            if (style === null) { setBgGradient(null); setBgGradientStyle(null); }
                            else { const g = deriveGradient(quickBg, style); setBgGradient(g); setBgGradientStyle(style); }
                          }}
                          className={`flex flex-col items-center gap-1.5 py-2 px-1.5 rounded-lg border-2 transition-all ${isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                          <div className="w-full rounded h-6 border border-border/30" style={{ background: preview ? `linear-gradient(135deg, ${preview.from}, ${preview.to})` : quickBg }} />
                          <span className="text-[10px] font-semibold">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Headshot shape picker — shown when template supports multiple shapes */}
                {pendingPreset.allowedHeadshotShapes.length > 1 && (
                  <div className="mb-5">
                    <label className="text-xs font-medium mb-2 block">Headshot Shape</label>
                    <div className="flex gap-2 flex-wrap">
                      {pendingPreset.allowedHeadshotShapes.map((shape) => {
                        const isActive = quickHeadshotShape === shape;
                        const label = shape === "full-bleed" ? "Full bleed" : shape.charAt(0).toUpperCase() + shape.slice(1);
                        return (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => setQuickHeadshotShape(shape)}
                            className={`px-3 py-1.5 text-xs rounded-lg border-2 font-medium transition-all ${isActive ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40'}`}
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
                    const hs = pendingPreset.allowedHeadshotShapes.length > 1 ? quickHeadshotShape : undefined;
                    pendingPreset.apply(quickBg, quickTextColor, quickFont, cw, ch, hs);
                    localStorage.setItem('seamless-card-builder-onboarding-website-v1', '1');
                    setShowOnboarding(false);
                    setOnboardingShowShapePicker(false);
                    setOnboardingShowTemplates(false);
                    setOnboardingQuickSetup(false);
                    setPendingPreset(null);
                    if (!localStorage.getItem('seamless-card-builder-template-tip-v1')) {
                      setShowCanvasTip(true);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  Apply &amp; Start Designing
                </button>
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
                  <button onClick={onBack} className={TOOLBAR_ICON_BTN} title="Back to Speakers">
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
              {/* Templates button — website card builder only */}
              {cardType === 'website' && (
                <>
                  <button
                    onClick={() => { setOnboardingShowShapePicker(true); setShowOnboarding(true); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                    title="Browse templates"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Templates
                  </button>
                  <div className="h-5 w-px bg-border mx-0.5" />
                </>
              )}
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
                            onClick={() => selectLayerItem(key)}
                          >
                            <span className="flex-1 truncate">{element.label || key}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); toggleLock(key); }} className={`p-1 hover:bg-muted rounded ${element.locked ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-muted-foreground'}`} title={element.locked ? "Unlock" : "Lock"}>
                                {element.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); updateElement(key, { visible: !element.visible }); }} className="p-1 hover:bg-muted rounded" title={element.visible !== false ? "Hide" : "Show"}>
                                {element.visible !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              </button>
                              <div className="flex flex-col">
                                <button onClick={(e) => { e.stopPropagation(); layerMoveUp(key); }} className="p-0.5 hover:bg-muted rounded" title="Move up"><ChevronUp className="h-3 w-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); layerMoveDown(key); }} className="p-0.5 hover:bg-muted rounded" title="Move down"><ChevronDown className="h-3 w-3" /></button>
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
              <button onClick={handleZoomReset} className="text-xs font-mono w-10 text-center py-1 rounded hover:bg-accent cursor-pointer" title="Reset zoom">{(zoom * 100).toFixed(0)}%</button>
              <button onClick={handleZoomIn} disabled={zoom >= 3} className="p-1.5 rounded hover:bg-accent disabled:opacity-30" title="Zoom In"><ZoomIn className="h-3.5 w-3.5" /></button>
              <button onClick={handleZoomFit} className="p-1.5 rounded hover:bg-accent" title="Fit to content"><Maximize2 className="h-3.5 w-3.5" /></button>
              <div className="h-5 w-px bg-border mx-0.5" />
              <button onClick={handleReset} className={TOOLBAR_ICON_BTN} title="Reset canvas"><RotateCcw className="h-3.5 w-3.5" /></button>
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
                <button onClick={() => alignSelection('left')}    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Left"><AlignStartVertical className="h-3.5 w-3.5" /></button>
                <button onClick={() => alignSelection('centerH')} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Centre H"><AlignCenterVertical className="h-3.5 w-3.5" /></button>
                <button onClick={() => alignSelection('right')}   className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Right"><AlignEndVertical className="h-3.5 w-3.5" /></button>
                <div className="h-3.5 w-px bg-border mx-0.5" />
                <button onClick={() => alignSelection('top')}     className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Top"><AlignStartHorizontal className="h-3.5 w-3.5" /></button>
                <button onClick={() => alignSelection('centerV')} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Centre V"><AlignCenterHorizontal className="h-3.5 w-3.5" /></button>
                <button onClick={() => alignSelection('bottom')}  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Align Bottom"><AlignEndHorizontal className="h-3.5 w-3.5" /></button>
              </div>
            )}

            {/* X/Y position inputs — single element only (not multi-select) */}
            {selectedElement && !multiSelectActive && config[selectedElement] && (
              <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <div className="h-6 w-px bg-border mr-1" />
                <span className="text-[10px] text-muted-foreground font-mono">X</span>
                <PositionInput
                  value={config[selectedElement].x || 0}
                  onChange={(v) => {
                    skipRerenderRef.current = true;
                    const obj = elementRefs.current[selectedElement];
                    if (obj) { obj.set('left', v); obj.setCoords(); fabricCanvasRef.current?.requestRenderAll(); }
                    updateElement(selectedElement, { x: v });
                  }}
                  className="w-14 h-7 text-xs text-center px-1 rounded border border-border bg-background font-mono"
                />
                <span className="text-[10px] text-muted-foreground font-mono">Y</span>
                <PositionInput
                  value={config[selectedElement].y || 0}
                  onChange={(v) => {
                    skipRerenderRef.current = true;
                    const obj = elementRefs.current[selectedElement];
                    if (obj) { obj.set('top', v); obj.setCoords(); fabricCanvasRef.current?.requestRenderAll(); }
                    updateElement(selectedElement, { y: v });
                  }}
                  className="w-14 h-7 text-xs text-center px-1 rounded border border-border bg-background font-mono"
                />
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
                      <QuickColorPicker value={config[activeKey]?.color || "#000000"} onChange={(hex) => applyUpdate({ color: hex })} label="Text colour" />
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
                  {(["circle","square","rounded","vertical","horizontal","banner","full-bleed"] as const).map((shape) => (
                    <button key={shape} onClick={() => updateElement("headshot", shape === "full-bleed" ? { shape, x: 0, y: 0 } : shape === "banner" ? { shape, x: 0 } : { shape })} className={`h-7 px-2 text-xs rounded border capitalize ${config.headshot?.shape === shape ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>{shape}</button>
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
                    <QuickColorPicker value={config[selectedElement]?.gradientColor || "#000000"} onChange={(hex) => updateElement(selectedElement, { gradientColor: hex })} label="Gradient colour" />
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

            {/* First-run getting started tip */}
            {showSidebarTip && cardType === 'website' && (
              <div className="w-full px-2">
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5 relative">
                  <button
                    onClick={() => { localStorage.setItem('seamless-card-builder-tip-v1', '1'); setShowSidebarTip(false); }}
                    className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-accent text-muted-foreground"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-[10px] font-semibold text-primary mb-2 pr-4">Getting started</p>
                  <div className="space-y-1.5 pr-3">
                    {[
                      "Click to select, drag to move",
                      "Background colour — section below",
                      "Test photos — right panel",
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[9px] font-bold text-primary mt-px leading-none">{i + 1}</span>
                        <p className="text-[10px] text-muted-foreground leading-tight">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Starter Templates */}
            {cardType === 'website' && (
              <div className="w-full px-2">
                <button
                  onClick={() => { setOnboardingShowShapePicker(true); setShowOnboarding(true); }}
                  className="w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent"
                  title="Starter Templates"
                >
                  <Layers className="h-5 w-5" />
                  <span className="text-xs">Templates</span>
                </button>
              </div>
            )}

            {/* Background — colour + image, unified inline panel */}
            <div className="w-full px-2">
              <button
                onClick={() => setBgPanelOpen(!bgPanelOpen)}
                className={`w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${bgPanelOpen ? 'bg-accent' : 'hover:bg-accent'}`}
                title="Background colour or image"
              >
                <div className="relative">
                  <ImageIcon className="h-5 w-5" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-sm border border-border/80 shadow-sm" style={{ background: bgGradient ? `linear-gradient(135deg, ${bgGradient.from}, ${bgGradient.to})` : bgColor }} />
                </div>
                <span className="text-xs">Background</span>
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
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Solid colour</div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {["#ffffff","#000000","#1e293b","#0f172a","#1d4ed8","#dc2626","#16a34a","#d97706","#7c3aed","#db2777","#0891b2","#374151"].map(c => (
                        <button
                          key={c}
                          onClick={() => { setBgColor(c); setBgGradient(null); setBgGradientStyle(null); setHasUnsavedChanges(true); }}
                          className={`w-5 h-5 rounded border-2 transition-transform hover:scale-110 ${!bgGradient && bgColor === c ? 'border-primary' : 'border-border/60'}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <QuickColorPicker value={bgColor} onChange={(hex) => { setBgColor(hex); setBgGradient(null); setBgGradientStyle(null); setHasUnsavedChanges(true); }} label="Background colour" />
                      <HexColorInput value={bgColor} onChange={(hex) => { setBgColor(hex); setBgGradient(null); setBgGradientStyle(null); setHasUnsavedChanges(true); }} className="flex-1 h-6 text-xs font-mono px-1 rounded border border-border bg-background min-w-0" />
                    </div>
                  </div>

                  {/* Gradient — derives from the current background colour */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Gradient</div>
                      {bgGradient && <button onClick={clearGradient} className="text-[10px] text-muted-foreground hover:text-destructive">✕ Remove</button>}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(["dark", "tonal", "soft"] as const).map((style) => {
                        const preview = deriveGradient(bgColor, style);
                        const isActive = bgGradientStyle === style;
                        return (
                          <button
                            key={style}
                            title={style === "dark" ? "Rich fade to colour" : style === "tonal" ? "Darker → lighter hue" : "Colour → light tint"}
                            onClick={() => applyGradientStyle(style)}
                            className={`flex flex-col items-center gap-1 py-1.5 rounded border-2 transition-colors capitalize text-[10px] ${isActive ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40'}`}
                          >
                            <div className="w-full rounded-sm h-5" style={{ background: `linear-gradient(135deg, ${preview.from}, ${preview.to})` }} />
                            {style}
                          </button>
                        );
                      })}
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
                  className={`${SIDEBAR_ELEM_BTN} ${config.headshot ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'}`}
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
                  {([
                    { shape: "circle",     label: "Circle",     icon: "w-4 h-4 rounded-full" },
                    { shape: "square",     label: "Square",     icon: "w-4 h-4 rounded" },
                    { shape: "vertical",   label: "Vertical",   icon: "w-3 h-4 rounded" },
                    { shape: "horizontal", label: "Horizontal", icon: "w-4 h-3 rounded" },
                    { shape: "rounded",    label: "Rounded",    icon: "w-4 h-4 rounded-xl" },
                    { shape: "full-bleed", label: "Full Bleed", icon: "w-4 h-3", extra: { x: 0, y: 0 } as Record<string, unknown> },
                  ] as Array<{ shape: string; label: string; icon: string; extra?: Record<string, unknown> }>).map(({ shape, label, icon, extra }) => (
                    <button
                      key={shape}
                      onClick={() => addHeadshotShape(shape, extra)}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                    >
                      <div className={`${icon} bg-muted border border-border`} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
              </div>
            )}

            {shouldShowElement("name") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "name")}
                onClick={() => toggleElement("name")}
                className={`${SIDEBAR_ELEM_BTN} ${config.name ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'}`}
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
                className={`${SIDEBAR_ELEM_BTN} ${config.title ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'}`}
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
                className={`${SIDEBAR_ELEM_BTN} ${config.company ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'}`}
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
                className={`${SIDEBAR_ELEM_BTN} ${config.companyLogo ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'}`}
                title={config.companyLogo ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <ImageIcon className={`h-5 w-5 ${config.companyLogo ? 'text-primary' : ''}`} />
                <span className={`text-xs ${config.companyLogo ? 'text-primary font-semibold' : ''}`}>Logo</span>
              </button>
            )}

            <div className="h-px w-12 bg-border" />

            <button
              onClick={() => {
                const newKey = `gradientOverlay_${Date.now()}`;
                setConfig(prev => {
                  const maxZ = Math.max(0, ...Object.values(prev).map(c => c.zIndex || 0));
                  const next = {
                    ...prev,
                    [newKey]: {
                      ...ELEMENT_TEMPLATES.gradientOverlay,
                      x: 0, y: Math.round(canvasHeight / 2),
                      width: canvasWidth, height: Math.round(canvasHeight / 2),
                      gradientDirection: "bottom" as const,
                      overlayOpacity: 0.90,
                      zIndex: maxZ + 1,
                    },
                  };
                  addToHistory(next);
                  return next;
                });
                setHasUnsavedChanges(true);
              }}
              className="w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent"
              title="Add a gradient overlay (can add multiple)"
            >
              <Square className="h-5 w-5" />
              <span className="text-xs">+ Overlay</span>
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
                      className={`${SIDEBAR_ELEM_BTN} ${isActive ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'}`}
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
            onClick={(e) => {
              // Deselect when clicking the grey area outside the card (not the canvas itself)
              if (e.target === e.currentTarget) {
                const canvas = fabricCanvasRef.current;
                if (canvas) { canvas.discardActiveObject(); canvas.renderAll(); }
                setSelectedElement(null);
                setMultiSelectActive(false);
                setMultiSelectedKeys([]);
              }
            }}
            onContextMenu={(e) => {
              // Handler lives here (outside shadow DOM) so preventDefault() reliably suppresses
              // the browser's native context menu, which shadow DOM events cannot guarantee.
              e.preventDefault();
              const canvas = fabricCanvasRef.current;
              if (!canvas) return;
              const target = canvas.findTarget(e.nativeEvent as any, false);
              if (target?.data?.elementKey) {
                canvas.setActiveObject(target);
                canvas.renderAll();
                setSelectedElement(target.data.elementKey);
                setContextMenu({ x: e.clientX, y: e.clientY, elementKey: target.data.elementKey });
              } else {
                setContextMenu(null);
              }
            }}
          >
            {/* Post-template tip modal — website card builder only */}
            {showCanvasTip && cardType === 'website' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 mx-4">
                  <h3 className="text-base font-semibold mb-1">Your template is ready</h3>
                  <div className="space-y-2.5 mb-6">
                    <div className="flex gap-3 items-center">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">1</span>
                      </div>
                      <p className="text-xs">Click any element to select it, then drag to move</p>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">2</span>
                      </div>
                      <p className="text-xs">Edit colours, fonts and size in the toolbar that appears</p>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">3</span>
                      </div>
                      <p className="text-xs">Hit Save in the top bar when you're done</p>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">4</span>
                      </div>
                      <p className="text-xs">Cards are auto-generated for speakers who've submitted — just approve each one from the Speakers tab</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={canvasTipDontShow}
                        onChange={e => setCanvasTipDontShow(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs text-muted-foreground">Don't show again</span>
                    </label>
                    <button
                      onClick={() => {
                        if (canvasTipDontShow) localStorage.setItem('seamless-card-builder-template-tip-v1', '1');
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
                  <p className="text-xs text-muted-foreground mb-4">{cardType === 'website' ? 'Load a template to get started, or add elements from the left panel.' : 'Add elements from the left panel.'}</p>
                  {cardType === 'website' && (
                    <button
                      onClick={() => { setOnboardingShowShapePicker(true); setShowOnboarding(true); }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Browse templates
                    </button>
                  )}
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

          {/* Right Sidebar - Preview */}
          <div className="w-56 border-l bg-card/30 p-4 overflow-y-auto space-y-5">

            {/* Header */}
            <div>
              <h3 className="text-sm font-semibold">Preview</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Upload sample images to see your design with real content. These are never saved.</p>
            </div>

            {/* Headshot */}
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Speaker Headshot</Label>
              <input ref={headshotInputRef} type="file" accept="image/png,image/jpeg" onChange={handleHeadshotUpload} className="hidden" />
              {testHeadshot ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={testHeadshot} alt="Test headshot" className="w-full h-24 object-cover" />
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
              <Label className="text-xs font-medium mb-1.5 block">Company Logo</Label>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="hidden" />
              {testLogo ? (
                <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                  <img src={testLogo} alt="Test logo" className="w-full h-16 object-contain p-2" />
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
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">Logos are free-crop — any aspect ratio.</p>
            </div>

            {/* Tip */}
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Tip:</span> Double-click the headshot or logo placeholder on the canvas to upload directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (() => {
        const menuW = 200, menuH = 340;
        const x = contextMenu.x + menuW > window.innerWidth  ? contextMenu.x - menuW : contextMenu.x;
        const y = contextMenu.y + menuH > window.innerHeight ? contextMenu.y - menuH : contextMenu.y;
        return (
        <div
          className="fixed z-[9999] bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px] text-sm"
          style={{ left: Math.max(4, x), top: Math.max(4, y) }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {/* Text style shortcuts */}
          {(["name","title","company"].includes(contextMenu.elementKey) || config[contextMenu.elementKey]?.type === "dynamic-text") && (
            <>
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Text</div>
              <button className={CTX_MENU_BTN} onClick={() => { updateElement(contextMenu.elementKey, { fontWeight: config[contextMenu.elementKey]?.fontWeight === 700 ? 400 : 700 }); setContextMenu(null); }}>
                <Bold className="h-3.5 w-3.5" />{config[contextMenu.elementKey]?.fontWeight === 700 ? "Remove Bold" : "Bold"}
              </button>
              <button className={CTX_MENU_BTN} onClick={() => { updateElement(contextMenu.elementKey, { fontStyle: config[contextMenu.elementKey]?.fontStyle === "italic" ? "normal" : "italic" }); setContextMenu(null); }}>
                <Italic className="h-3.5 w-3.5" />{config[contextMenu.elementKey]?.fontStyle === "italic" ? "Remove Italic" : "Italic"}
              </button>
              <button className={CTX_MENU_BTN} onClick={() => { updateElement(contextMenu.elementKey, { underline: !config[contextMenu.elementKey]?.underline }); setContextMenu(null); }}>
                <Underline className="h-3.5 w-3.5" />{config[contextMenu.elementKey]?.underline ? "Remove Underline" : "Underline"}
              </button>
              <div className="border-t border-border my-1" />
            </>
          )}

          {/* Upload shortcuts */}
          {contextMenu.elementKey === "headshot" && (
            <>
              <button className={CTX_MENU_BTN} onClick={() => { headshotInputRef.current?.click(); setContextMenu(null); }}>
                <Upload className="h-3.5 w-3.5" />Upload Test Image
              </button>
              <div className="border-t border-border my-1" />
            </>
          )}
          {contextMenu.elementKey === "companyLogo" && (
            <>
              <button className={CTX_MENU_BTN} onClick={() => { logoInputRef.current?.click(); setContextMenu(null); }}>
                <Upload className="h-3.5 w-3.5" />Upload Test Logo
              </button>
              <div className="border-t border-border my-1" />
            </>
          )}

          {/* Arrange */}
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Arrange</div>
          {!FIXED_KEYS.includes(contextMenu.elementKey) && (
            <button className={CTX_MENU_BTN} onClick={() => { duplicateElement(contextMenu.elementKey); setContextMenu(null); }}>
              <Copy className="h-3.5 w-3.5" />Duplicate <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>
            </button>
          )}
          <button className={CTX_MENU_BTN} onClick={() => { bringToFront(contextMenu.elementKey); setContextMenu(null); }}>
            <ChevronsUp className="h-3.5 w-3.5" />Bring to Front
          </button>
          <button className={CTX_MENU_BTN} onClick={() => { bringForward(contextMenu.elementKey); setContextMenu(null); }}>
            <BringForward className="h-3.5 w-3.5" />Bring Forward
          </button>
          <button className={CTX_MENU_BTN} onClick={() => { sendBackward(contextMenu.elementKey); setContextMenu(null); }}>
            <SendBackward className="h-3.5 w-3.5" />Send Backward
          </button>
          <button className={CTX_MENU_BTN} onClick={() => { sendToBack(contextMenu.elementKey); setContextMenu(null); }}>
            <ChevronsDown className="h-3.5 w-3.5" />Send to Back
          </button>
          <div className="border-t border-border my-1" />

          {/* Visibility & lock */}
          <button className={CTX_MENU_BTN} onClick={() => { updateElement(contextMenu.elementKey, { visible: !config[contextMenu.elementKey]?.visible }); setContextMenu(null); }}>
            {config[contextMenu.elementKey]?.visible !== false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {config[contextMenu.elementKey]?.visible !== false ? "Hide" : "Show"}
          </button>
          <button className={CTX_MENU_BTN} onClick={() => { toggleLock(contextMenu.elementKey); setContextMenu(null); }}>
            {config[contextMenu.elementKey]?.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {config[contextMenu.elementKey]?.locked ? "Unlock" : "Lock"}
          </button>
          <div className="border-t border-border my-1" />

          {/* Delete */}
          <button className="w-full text-left px-3 py-1.5 hover:bg-accent text-destructive flex items-center gap-2" onClick={() => { setConfig(prev => { const n = { ...prev }; delete n[contextMenu.elementKey]; return n; }); setSelectedElement(null); setContextMenu(null); }}>
            <X className="h-3.5 w-3.5" />Delete <span className="ml-auto text-xs text-muted-foreground">Del</span>
          </button>
        </div>
        );
      })()}
    </>
  );
}
