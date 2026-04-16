import { PresetData } from "@/types/card-builder";

// Website card templates exported as build functions that accept an `elementTemplates` object.
// The component wraps these with `makeApply` so the build can merge with local ELEMENT_TEMPLATES.

export const SQUARE_PRESETS_DATA: PresetData[] = [
  {
    name: "Overlay",
    description: "Full-bleed photo, gradient reveals text at the bottom",
    thumbnail: "overlay",
    thumbnailShape: "square",
    defaultBg: "#000000",
    defaultTextColor: "#ffffff",
    canvasW: 800,
    canvasH: 800,
    allowedHeadshotShapes: [],
    build: (T, bg = "#000000", textColor = "#ffffff", font = "Montserrat") => ({
      headshot:        { ...T.headshot, shape: "full-bleed", x: 0, y: 0, size: 800, zIndex: 1 },
      gradientOverlay: { ...T.gradientOverlay, x: 0, y: 420, width: 800, height: 380, gradientDirection: "bottom", overlayOpacity: 0.90, zIndex: 3 },
      companyLogo:     { ...T.companyLogo, x: 632, y: 20, width: 148, height: 74, size: 70, zIndex: 6 },
      // y-positions sized for max font (55px, lineHeight 1.2 = 66px/line) so wide text never overlaps.
      // company sits 1 line below title (28px × 1.2 ≈ 34px gap); backend pushes it down if title wraps.
      firstName:       { ...T.firstName, x: 36, y: 520, color: textColor, fontFamily: font, fontSize: 55, width: 728, fontWeight: 700, zIndex: 10 },
      lastName:        { ...T.lastName, x: 36, y: 590, color: textColor, fontFamily: font, fontSize: 55, width: 728, fontWeight: 700, zIndex: 10 },
      title:           { ...T.title, x: 36, y: 664, color: textColor, fontFamily: font, fontSize: 28, width: 728, fontWeight: 500, zIndex: 8 },
      company:         { ...T.company, x: 36, y: 700, color: textColor, fontFamily: font, fontSize: 28, width: 500, fontWeight: 400, zIndex: 7 },
    }),
  },
  {
    name: "Classic",
    description: "Full-width square photo at top, bold centred name and details on a clean white band below",
    thumbnail: "classic",
    thumbnailShape: "portrait",
    defaultBg: "#ffffff",
    defaultTextColor: "#111827",
    canvasW: 600,
    canvasH: 900,
    allowedHeadshotShapes: ["square", "rounded"],
    build: (T, bg = "#ffffff", textColor = "#111827", font = "Montserrat") => ({
      headshot:  { ...T.headshot, shape: "square", x: 0, y: 0, size: 600, zIndex: 1 },
      firstName: { ...T.firstName, x: 36, y: 652, color: textColor, fontFamily: font, fontSize: 42, width: 528, fontWeight: 700, zIndex: 4 },
      lastName:  { ...T.lastName,  x: 36, y: 706, color: textColor, fontFamily: font, fontSize: 42, width: 528, fontWeight: 700, zIndex: 4 },
      // company (organisation) sits above title — name → org → role hierarchy
      company:   { ...T.company,   x: 36, y: 772, color: textColor, fontFamily: font, fontSize: 24, width: 528, fontWeight: 500, zIndex: 3 },
      title:     { ...T.title,     x: 36, y: 804, color: textColor, fontFamily: font, fontSize: 24, width: 528, fontWeight: 400, zIndex: 2 },
    }),
  },
];

export const LANDSCAPE_PRESETS_DATA: PresetData[] = [
  {
    name: "Side by Side",
    description: "Large square photo left, event logo and speaker info right",
    thumbnail: "side-by-side",
    thumbnailShape: "landscape",
    defaultBg: "#000000",
    defaultTextColor: "#ffffff",
    canvasW: 900,
    canvasH: 600,
    allowedHeadshotShapes: ["square", "rounded", "circle"],
    build: (T, bg = "#000000", textColor = "#ffffff", font = "Montserrat") => ({
      headshot:    { ...T.headshot, shape: "rounded", x: 36, y: 36, size: 480, zIndex: 1 },
      companyLogo: { ...T.companyLogo, x: 732, y: 36, width: 148, height: 74, size: 70, zIndex: 5 },
      // 44px names (Fabric lineHeight ≈ 51px). Names tight (4px gap), 20px break to details.
      // Vertically centred to headshot midpoint (y=276): group y:180→367 → midpoint 274.
      firstName:   { ...T.firstName, x: 556, y: 180, color: textColor, fontFamily: font, fontSize: 44, width: 308, fontWeight: 700, zIndex: 4 },
      lastName:    { ...T.lastName, x: 556, y: 235, color: textColor, fontFamily: font, fontSize: 44, width: 308, fontWeight: 700, zIndex: 4 },
      title:       { ...T.title, x: 556, y: 306, color: textColor, fontFamily: font, fontSize: 24, width: 308, fontWeight: 500, zIndex: 3 },
      company:     { ...T.company, x: 556, y: 339, color: textColor, fontFamily: font, fontSize: 22, width: 308, fontWeight: 400, zIndex: 2 },
    }),
  },
];

export const STARTER_PRESETS_DATA = [...SQUARE_PRESETS_DATA, ...LANDSCAPE_PRESETS_DATA];

export default {
  SQUARE_PRESETS_DATA,
  LANDSCAPE_PRESETS_DATA,
  STARTER_PRESETS_DATA,
};
