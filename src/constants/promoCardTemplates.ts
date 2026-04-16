import { PresetData } from "@/types/card-builder";

// Instagram Feed (1080×1080) — full-bleed Overlay:
//   Headshot: full-bleed, x:0, y:0, size:1080
//   Gradient: y:560 → bottom (520px ramp, opacity:0.92)
//   Event logo: top-right, 220×100
//   Names: left-aligned, 76px bold, y:710/800
//   Title/company: left-aligned, 38/36px, y:908/956
export const INSTAGRAM_FEED_PRESETS: PresetData[] = [
  {
    name: "Instagram Feed",
    description: "Square 1:1 announcement — full-bleed portrait with gradient reveal",
    thumbnail: "instagram-feed",
    thumbnailShape: "square",
    defaultBg: "#000000",
    defaultTextColor: "#ffffff",
    canvasW: 1080,
    canvasH: 1080,
    allowedHeadshotShapes: [],
    build: (T, bg = "#000000", textColor = "#ffffff", font = "Montserrat") => ({
      headshot:        { ...T.headshot, shape: "full-bleed", x: 0, y: 0, size: 1080, zIndex: 1 },
      gradientOverlay: { ...T.gradientOverlay, x: 0, y: 560, width: 1080, height: 520, gradientDirection: "bottom", overlayOpacity: 0.92, zIndex: 3 },
      eventLogo:       { ...T.eventLogo, x: 820, y: 30, width: 220, height: 100, zIndex: 6 },
      firstName:       { ...T.firstName, x: 60, y: 710, color: textColor, fontFamily: font, fontSize: 76, fontWeight: 700, textAlign: "left", width: 960, zIndex: 10 },
      lastName:        { ...T.lastName, x: 60, y: 800, color: textColor, fontFamily: font, fontSize: 76, fontWeight: 700, textAlign: "left", width: 960, zIndex: 10 },
      title:           { ...T.title, x: 60, y: 908, color: textColor, fontFamily: font, fontSize: 38, fontWeight: 500, textAlign: "left", width: 760, zIndex: 9 },
      company:         { ...T.company, x: 60, y: 956, color: textColor, fontFamily: font, fontSize: 36, fontWeight: 400, textAlign: "left", width: 760, zIndex: 8 },
    }),
  },
];

// Instagram Story (1080×1920) — bold circle on brand colour:
//   Event logo: top-centre, 300×130, x:390, y:80
//   Headshot: circle, size:840, centred (x:120), y:280 — smaller than full-width so air shows around it
//   Names: centred, 78px bold, y:1170/1266
//   Title/company: centred, 44/40px, y:1368/1420
//   Company logo: centred, 260×120, y:1550 — close to text, same visual weight as event logo above
//   No gradient — solid background reads cleaner in portrait
export const INSTAGRAM_STORY_PRESETS: PresetData[] = [
  {
    name: "Instagram Story",
    description: "Vertical 9:16 announcement — bold circle portrait on brand colour",
    thumbnail: "instagram-story",
    thumbnailShape: "portrait",
    defaultBg: "#0f172a",
    defaultTextColor: "#ffffff",
    canvasW: 1080,
    canvasH: 1920,
    allowedHeadshotShapes: ["circle"],
    build: (T, bg = "#0f172a", textColor = "#ffffff", font = "Montserrat") => ({
      eventLogo:       { ...T.eventLogo, x: 390, y: 80, width: 300, height: 130, zIndex: 6 },
      headshot:        { ...T.headshot, shape: "circle", x: 120, y: 280, size: 840, zIndex: 1 },
      firstName:       { ...T.firstName, x: 90, y: 1170, color: textColor, fontFamily: font, fontSize: 78, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      lastName:        { ...T.lastName, x: 90, y: 1266, color: textColor, fontFamily: font, fontSize: 78, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      title:           { ...T.title, x: 90, y: 1368, color: textColor, fontFamily: font, fontSize: 44, fontWeight: 500, textAlign: "center", width: 900, zIndex: 9 },
      company:         { ...T.company, x: 90, y: 1420, color: textColor, fontFamily: font, fontSize: 40, fontWeight: 400, textAlign: "center", width: 900, zIndex: 8 },
      companyLogo:     { ...T.companyLogo, x: 410, y: 1550, width: 260, height: 120, size: 70, zIndex: 7 },
    }),
  },
];

// LinkedIn (1200×627):
//   Left:  headshot x:40, y:64, size:500 — vertically centred
//   Right: logo y:40→180, name y:218→328, details y:332→384

// LinkedIn / X (1200×627):
//   Headshot: circle x:40, y:40, size:547 — vertically centred left column (equal 40px margins)
//   Company logo: top right  x:1012, y:40  (148×74)
//   Event logo:   bottom right x:1012, y:513 (148×74)
//   Text: x:627, width:365 — centred in gap between logos
export const LINKEDIN_PRESETS: PresetData[] = [
  {
    name: "LinkedIn / X",
    description: "Wide 1.91:1 post for LinkedIn and X — speaker photo left, event branding right",
    thumbnail: "linkedin-post",
    thumbnailShape: "landscape",
    defaultBg: "#0f172a",
    defaultTextColor: "#ffffff",
    canvasW: 1200,
    canvasH: 627,
    allowedHeadshotShapes: ["square", "rounded"],
    build: (T, bg = "#0f172a", textColor = "#ffffff", font = "Montserrat") => ({
      headshot:    { ...T.headshot, shape: "rounded", x: 40, y: 40, size: 547, zIndex: 1 },
      companyLogo: { ...T.companyLogo, x: 1012, y: 40, width: 148, height: 74, size: 70, zIndex: 5 },
      eventLogo:   { ...T.eventLogo, x: 940, y: 477, width: 220, height: 110, zIndex: 6 },
      firstName:   { ...T.firstName, x: 627, y: 215, color: textColor, fontFamily: font, fontSize: 50, fontWeight: 700, textAlign: "left", width: 365, zIndex: 10 },
      lastName:    { ...T.lastName, x: 627, y: 275, color: textColor, fontFamily: font, fontSize: 50, fontWeight: 700, textAlign: "left", width: 365, zIndex: 10 },
      title:       { ...T.title, x: 627, y: 355, color: textColor, fontFamily: font, fontSize: 24, fontWeight: 500, textAlign: "left", width: 365, zIndex: 9 },
      company:     { ...T.company, x: 627, y: 385, color: textColor, fontFamily: font, fontSize: 22, fontWeight: 400, textAlign: "left", width: 365, zIndex: 8 },
    }),
  },
];

