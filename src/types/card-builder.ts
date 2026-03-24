export type ElementTemplates = { [key: string]: any };

// Shared preset type — defined before the component so state can reference it
export interface StarterPreset {
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

export interface PresetData {
  name: string;
  description: string;
  thumbnail: string;
  thumbnailShape: "square" | "landscape" | "portrait";
  defaultBg: string;
  defaultTextColor: string;
  canvasW: number;
  canvasH: number;
  allowedHeadshotShapes: string[];
  build: (elementTemplates: ElementTemplates, bg?: string, textColor?: string, font?: string, canvasW?: number, canvasH?: number) => { [key: string]: any };
}