import { PresetData } from "@/types/card-builder";

// Promo card templates — "SPEAKER" announcement style.
// Layout: large event logo top (centred, ~65% width) → SPEAKER → headshot → speaker details bottom.
// Wide formats (LinkedIn/X): headshot fills left column, logo + SPEAKER + details in right column.
//
// Vertical space budget (feed 1080×1080):
//   Logo zone:   y:50  → y:210  (160px)
//   SPEAKER:     y:228 → y:308  (80px @ fontSize:78)
//   Headshot:    y:325 → y:865  (size:540) — 53% visible above gradient
//   Gradient:    y:620 → bottom (dims lower headshot, frames text)
//   Details:     y:785 → y:955

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
      eventLogo:            { ...T.eventLogo, x: 190, y: 50, width: 700, height: 160, zIndex: 6 },
      dynamic_announcement: { type: "dynamic-text", label: "Announcement", text: "SPEAKER", x: 90, y: 228, color: textColor, fontFamily: font, fontSize: 78, fontWeight: 900, textAlign: "center", width: 900, charSpacing: 350, visible: true, zIndex: 11 },
      headshot:             { ...T.headshot, shape: "circle", x: 270, y: 325, size: 540, zIndex: 1 },
      gradientOverlay:      { ...T.gradientOverlay, x: 0, y: 620, width: 1080, height: 460, gradientDirection: "bottom", overlayOpacity: 0.95, zIndex: 2 },
      firstName:            { ...T.firstName, x: 90, y: 785, color: textColor, fontFamily: font, fontSize: 52, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      lastName:             { ...T.lastName, x: 90, y: 845, color: textColor, fontFamily: font, fontSize: 52, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      title:                { ...T.title, x: 90, y: 905, color: textColor, fontFamily: font, fontSize: 27, fontWeight: 400, textAlign: "center", width: 900, zIndex: 9 },
      company:              { ...T.company, x: 90, y: 942, color: textColor, fontFamily: font, fontSize: 25, fontWeight: 400, textAlign: "center", width: 900, zIndex: 8 },
    }),
  },
];

// Vertical space budget (story 1080×1920):
//   Logo zone:   y:140 → y:340  (200px)
//   SPEAKER:     y:385 → y:491  (106px @ fontSize:96)
//   Headshot:    y:530 → y:1380 (size:850, centred) — visible to gradient at y:1120 = 69%
//   Gradient:    y:1120 → bottom (800px)
//   Details:     y:1400 → y:1660 — ~260px natural bottom padding

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
      eventLogo:            { ...T.eventLogo, x: 190, y: 140, width: 700, height: 200, zIndex: 6 },
      dynamic_announcement: { type: "dynamic-text", label: "Announcement", text: "SPEAKER", x: 90, y: 385, color: textColor, fontFamily: font, fontSize: 96, fontWeight: 900, textAlign: "center", width: 900, charSpacing: 350, visible: true, zIndex: 11 },
      headshot:             { ...T.headshot, shape: "circle", x: 115, y: 530, size: 850, zIndex: 1 },
      gradientOverlay:      { ...T.gradientOverlay, x: 0, y: 1120, width: 1080, height: 800, gradientDirection: "bottom", overlayOpacity: 0.95, zIndex: 2 },
      firstName:            { ...T.firstName, x: 90, y: 1400, color: textColor, fontFamily: font, fontSize: 66, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      lastName:             { ...T.lastName, x: 90, y: 1482, color: textColor, fontFamily: font, fontSize: 66, fontWeight: 700, textAlign: "center", width: 900, zIndex: 10 },
      title:                { ...T.title, x: 90, y: 1560, color: textColor, fontFamily: font, fontSize: 43, fontWeight: 400, textAlign: "center", width: 900, zIndex: 9 },
      company:              { ...T.company, x: 90, y: 1614, color: textColor, fontFamily: font, fontSize: 39, fontWeight: 400, textAlign: "center", width: 900, zIndex: 8 },
    }),
  },
];

// Wide layout budget (LinkedIn 1200×627):
//   Left:  headshot x:40, y:64, size:500 — fills full height
//   Right: logo y:40→180, SPEAKER y:200→265, name/details y:295→455

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
      headshot:             { ...T.headshot, shape: "circle", x: 40, y: 64, size: 500, zIndex: 1 },
      eventLogo:            { ...T.eventLogo, x: 580, y: 40, width: 560, height: 140, zIndex: 6 },
      dynamic_announcement: { type: "dynamic-text", label: "Announcement", text: "SPEAKER", x: 580, y: 200, color: textColor, fontFamily: font, fontSize: 56, fontWeight: 900, textAlign: "left", width: 570, charSpacing: 300, visible: true, zIndex: 11 },
      firstName:            { ...T.firstName, x: 580, y: 290, color: textColor, fontFamily: font, fontSize: 40, fontWeight: 700, textAlign: "left", width: 570, zIndex: 10 },
      lastName:             { ...T.lastName, x: 580, y: 338, color: textColor, fontFamily: font, fontSize: 40, fontWeight: 700, textAlign: "left", width: 570, zIndex: 10 },
      title:                { ...T.title, x: 580, y: 388, color: textColor, fontFamily: font, fontSize: 21, fontWeight: 400, textAlign: "left", width: 570, zIndex: 9 },
      company:              { ...T.company, x: 580, y: 418, color: textColor, fontFamily: font, fontSize: 19, fontWeight: 400, textAlign: "left", width: 570, zIndex: 8 },
    }),
  },
];

// Wide layout budget (X 1200×675):
//   Left:  headshot x:40, y:68, size:530 — fills most of height
//   Right: logo y:40→175, SPEAKER y:196→262, name/details y:292→462

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
      headshot:             { ...T.headshot, shape: "circle", x: 40, y: 68, size: 530, zIndex: 1 },
      eventLogo:            { ...T.eventLogo, x: 620, y: 40, width: 530, height: 135, zIndex: 6 },
      dynamic_announcement: { type: "dynamic-text", label: "Announcement", text: "SPEAKER", x: 620, y: 196, color: textColor, fontFamily: font, fontSize: 58, fontWeight: 900, textAlign: "left", width: 520, charSpacing: 300, visible: true, zIndex: 11 },
      firstName:            { ...T.firstName, x: 620, y: 290, color: textColor, fontFamily: font, fontSize: 42, fontWeight: 700, textAlign: "left", width: 520, zIndex: 10 },
      lastName:             { ...T.lastName, x: 620, y: 340, color: textColor, fontFamily: font, fontSize: 42, fontWeight: 700, textAlign: "left", width: 520, zIndex: 10 },
      title:                { ...T.title, x: 620, y: 393, color: textColor, fontFamily: font, fontSize: 21, fontWeight: 400, textAlign: "left", width: 520, zIndex: 9 },
      company:              { ...T.company, x: 620, y: 423, color: textColor, fontFamily: font, fontSize: 19, fontWeight: 400, textAlign: "left", width: 520, zIndex: 8 },
    }),
  },
];
