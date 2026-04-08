import { PresetData } from "@/types/card-builder";

// Promo card templates — all use circle headshots (matches how platforms display profile photos).
//
// Instagram Feed (1080×1080):
//   Logo:     y:50  → y:210  (160px)
//   Headshot: y:260 → y:840  (size:580, centred x:250) — heroic fill
//   Gradient: y:500 → bottom (580px ramp — text zone is deep in the fade)
//   Details:  y:785 → y:978

export const INSTAGRAM_FEED_PRESETS: PresetData[] = [
  {
    name: "Instagram Feed",
    description: "Square 1:1 announcement card for Instagram and Facebook feeds",
    thumbnail: "instagram-feed",
    thumbnailShape: "square",
    defaultBg: "#0f172a",
    defaultTextColor: "#ffffff",
    canvasW: 1080,
    canvasH: 1080,
    allowedHeadshotShapes: ["circle"],
    build: (T, bg = "#0f172a", textColor = "#ffffff", font = "Montserrat") => ({
      eventLogo:       { ...T.eventLogo, x: 190, y: 50, width: 700, height: 160, zIndex: 6 },
      headshot:        { ...T.headshot, shape: "circle", x: 250, y: 260, size: 580, zIndex: 1 },
      gradientOverlay: { ...T.gradientOverlay, x: 0, y: 500, width: 1080, height: 580, gradientDirection: "bottom", overlayOpacity: 0.95, zIndex: 2 },
      firstName:       { ...T.firstName, x: 90, y: 785, color: textColor, fontFamily: font, fontSize: 52, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      lastName:        { ...T.lastName, x: 90, y: 850, color: textColor, fontFamily: font, fontSize: 52, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      title:           { ...T.title, x: 90, y: 914, color: textColor, fontFamily: font, fontSize: 28, fontWeight: 400, textAlign: "center", width: 900, zIndex: 9 },
      company:         { ...T.company, x: 90, y: 952, color: textColor, fontFamily: font, fontSize: 26, fontWeight: 400, textAlign: "center", width: 900, zIndex: 8 },
    }),
  },
];

// Instagram Story (1080×1920):
//   Logo:     y:130 → y:330  (200px)
//   Headshot: y:400 → y:1300 (size:900, centred x:90) — fills mid-card
//   Gradient: y:980 → bottom (940px ramp)
//   Details:  y:1390 → y:1659

export const INSTAGRAM_STORY_PRESETS: PresetData[] = [
  {
    name: "Instagram Story",
    description: "Vertical 9:16 announcement for Stories, Reels, and TikTok",
    thumbnail: "instagram-story",
    thumbnailShape: "portrait",
    defaultBg: "#0f172a",
    defaultTextColor: "#ffffff",
    canvasW: 1080,
    canvasH: 1920,
    allowedHeadshotShapes: ["circle"],
    build: (T, bg = "#0f172a", textColor = "#ffffff", font = "Montserrat") => ({
      eventLogo:       { ...T.eventLogo, x: 190, y: 130, width: 700, height: 200, zIndex: 6 },
      headshot:        { ...T.headshot, shape: "circle", x: 90, y: 400, size: 900, zIndex: 1 },
      gradientOverlay: { ...T.gradientOverlay, x: 0, y: 980, width: 1080, height: 940, gradientDirection: "bottom", overlayOpacity: 0.95, zIndex: 2 },
      firstName:       { ...T.firstName, x: 90, y: 1390, color: textColor, fontFamily: font, fontSize: 70, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      lastName:        { ...T.lastName, x: 90, y: 1478, color: textColor, fontFamily: font, fontSize: 70, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      title:           { ...T.title, x: 90, y: 1562, color: textColor, fontFamily: font, fontSize: 45, fontWeight: 400, textAlign: "center", width: 900, zIndex: 9 },
      company:         { ...T.company, x: 90, y: 1618, color: textColor, fontFamily: font, fontSize: 41, fontWeight: 400, textAlign: "center", width: 900, zIndex: 8 },
    }),
  },
];

// LinkedIn (1200×627):
//   Left:  headshot x:40, y:64, size:500 — vertically centred
//   Right: logo y:40→180, name y:218→328, details y:332→384

export const LINKEDIN_PRESETS: PresetData[] = [
  {
    name: "LinkedIn Post",
    description: "Wide 1.91:1 announcement for LinkedIn and Facebook link previews",
    thumbnail: "linkedin-post",
    thumbnailShape: "landscape",
    defaultBg: "#0f172a",
    defaultTextColor: "#ffffff",
    canvasW: 1200,
    canvasH: 627,
    allowedHeadshotShapes: ["circle"],
    build: (T, bg = "#0f172a", textColor = "#ffffff", font = "Montserrat") => ({
      headshot:  { ...T.headshot, shape: "circle", x: 40, y: 64, size: 500, zIndex: 1 },
      eventLogo: { ...T.eventLogo, x: 585, y: 40, width: 550, height: 140, zIndex: 6 },
      firstName: { ...T.firstName, x: 585, y: 218, color: textColor, fontFamily: font, fontSize: 46, fontWeight: 700, textAlign: "left", width: 560, zIndex: 10 },
      lastName:  { ...T.lastName, x: 585, y: 273, color: textColor, fontFamily: font, fontSize: 46, fontWeight: 700, textAlign: "left", width: 560, zIndex: 10 },
      title:     { ...T.title, x: 585, y: 332, color: textColor, fontFamily: font, fontSize: 22, fontWeight: 400, textAlign: "left", width: 560, zIndex: 9 },
      company:   { ...T.company, x: 585, y: 364, color: textColor, fontFamily: font, fontSize: 20, fontWeight: 400, textAlign: "left", width: 560, zIndex: 8 },
    }),
  },
];

// X/Twitter (1200×675):
//   Left:  headshot x:40, y:72, size:540 — fills most of height
//   Right: logo y:40→175, name y:215→312, details y:325→377

export const X_PRESETS: PresetData[] = [
  {
    name: "X / Twitter Post",
    description: "16:9 announcement card optimised for X (Twitter) feed",
    thumbnail: "x-post",
    thumbnailShape: "landscape",
    defaultBg: "#0f172a",
    defaultTextColor: "#ffffff",
    canvasW: 1200,
    canvasH: 675,
    allowedHeadshotShapes: ["circle"],
    build: (T, bg = "#0f172a", textColor = "#ffffff", font = "Montserrat") => ({
      headshot:  { ...T.headshot, shape: "circle", x: 40, y: 72, size: 540, zIndex: 1 },
      eventLogo: { ...T.eventLogo, x: 620, y: 40, width: 530, height: 135, zIndex: 6 },
      firstName: { ...T.firstName, x: 620, y: 215, color: textColor, fontFamily: font, fontSize: 44, fontWeight: 700, textAlign: "left", width: 530, zIndex: 10 },
      lastName:  { ...T.lastName, x: 620, y: 268, color: textColor, fontFamily: font, fontSize: 44, fontWeight: 700, textAlign: "left", width: 530, zIndex: 10 },
      title:     { ...T.title, x: 620, y: 325, color: textColor, fontFamily: font, fontSize: 22, fontWeight: 400, textAlign: "left", width: 530, zIndex: 9 },
      company:   { ...T.company, x: 620, y: 357, color: textColor, fontFamily: font, fontSize: 20, fontWeight: 400, textAlign: "left", width: 530, zIndex: 8 },
    }),
  },
];
