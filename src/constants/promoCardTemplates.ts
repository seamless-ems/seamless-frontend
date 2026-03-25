import { PresetData } from "@/types/card-builder";

// Social Media Promo Presets
// 1080x1080 (Square), 1080x1920 (Stories), 1200x628 (Shared Link)

export const SOCIAL_SQUARE_PRESETS: PresetData[] = [
  {
    name: "Social Hero",
    description: "High-impact square for LinkedIn/Instagram feeds",
    thumbnail: "social-hero",
    thumbnailShape: "square",
    defaultBg: "#000000",
    defaultTextColor: "#ffffff",
    canvasW: 1080,
    canvasH: 1080,
    allowedHeadshotShapes: ["circle", "square"],
    build: (T, bg = "#000000", textColor = "#ffffff", font = "Montserrat") => ({
      headshot:    { ...T.headshot, shape: "square", x: 0, y: 0, size: 1080, zIndex: 1 },
      gradientOverlay: { ...T.gradientOverlay, x: 0, y: 540, width: 1080, height: 540, gradientDirection: "bottom", overlayOpacity: 0.85, zIndex: 2 },
      companyLogo: { ...T.companyLogo, x: 50, y: 50, width: 200, height: 100, size: 90, zIndex: 5 },
      firstName:   { ...T.firstName, x: 60, y: 720, color: textColor, fontFamily: font, fontSize: 80, width: 960, fontWeight: 800, zIndex: 10 },
      lastName:    { ...T.lastName, x: 60, y: 810, color: textColor, fontFamily: font, fontSize: 80, width: 960, fontWeight: 800, zIndex: 10 },
      title:       { ...T.title, x: 60, y: 890, color: textColor, fontFamily: font, fontSize: 36, width: 960, fontWeight: 500, zIndex: 8 },
      company:     { ...T.company, x: 60, y: 940, color: textColor, fontFamily: font, fontSize: 36, width: 960, fontWeight: 400, zIndex: 7 },
    }),
  }
];

export const SOCIAL_STORY_PRESETS: PresetData[] = [
  {
    name: "Story Spotlight",
    description: "Vertical 9:16 format for IG Stories and TikTok",
    thumbnail: "story-spotlight",
    thumbnailShape: "portrait",
    defaultBg: "#000000",
    defaultTextColor: "#ffffff",
    canvasW: 1080,
    canvasH: 1920,
    allowedHeadshotShapes: ["circle"],
    build: (T, bg = "#000000", textColor = "#ffffff", font = "Montserrat") => ({
      // Centered headshot with room at top and bottom for platform UI (poll stickers, etc)
      companyLogo: { ...T.companyLogo, x: 340, y: 150, width: 400, height: 150, size: 120, zIndex: 5 },
      headshot:    { ...T.headshot, shape: "circle", x: 240, y: 450, size: 600, zIndex: 1 },
      firstName:   { ...T.firstName, x: 90, y: 1150, color: textColor, fontFamily: font, fontSize: 90, textAlign: "center", width: 900, fontWeight: 800, zIndex: 10 },
      lastName:    { ...T.lastName, x: 90, y: 1250, color: textColor, fontFamily: font, fontSize: 90, textAlign: "center", width: 900, fontWeight: 800, zIndex: 10 },
      title:       { ...T.title, x: 90, y: 1350, color: textColor, fontFamily: font, fontSize: 42, textAlign: "center", width: 900, fontWeight: 500, zIndex: 8 },
      company:     { ...T.company, x: 90, y: 1410, color: textColor, fontFamily: font, fontSize: 42, textAlign: "center", width: 900, fontWeight: 400, zIndex: 7 },
      cta:         { ...T.text, content: "JOIN US LIVE", x: 90, y: 1650, color: textColor, fontSize: 40, textAlign: "center", width: 900, fontWeight: 700, zIndex: 11 }
    }),
  }
];

export const NEWSLETTER_PRESETS: PresetData[] = [
  {
    name: "Newsletter Banner",
    description: "Wide aspect ratio optimized for email clients (Gmail/Outlook)",
    thumbnail: "newsletter-banner",
    thumbnailShape: "landscape",
    defaultBg: "#ffffff",
    defaultTextColor: "#000000",
    canvasW: 1200,
    canvasH: 400,
    allowedHeadshotShapes: ["circle"],
    build: (T, bg = "#ffffff", textColor = "#000000", font = "Montserrat") => ({
      headshot:    { ...T.headshot, shape: "circle", x: 50, y: 50, size: 300, zIndex: 1 },
      firstName:   { ...T.firstName, x: 400, y: 100, color: textColor, fontFamily: font, fontSize: 60, width: 500, fontWeight: 700, zIndex: 4 },
      lastName:    { ...T.lastName, x: 400, y: 168, color: textColor, fontFamily: font, fontSize: 60, width: 500, fontWeight: 700, zIndex: 4 },
      title:       { ...T.title, x: 400, y: 180, color: textColor, fontFamily: font, fontSize: 30, width: 500, fontWeight: 500, zIndex: 3 },
      companyLogo: { ...T.companyLogo, x: 950, y: 160, width: 200, height: 80, size: 60, zIndex: 5 },
    }),
  }
];