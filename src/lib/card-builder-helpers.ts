import type { StarterPreset } from "@/types/card-builder";
import { createPromoConfig, uploadFile } from "@/lib/api";
import { FIXED_KEYS } from "@/lib/card-builder-utils";

export type CardType = "promo" | "website";

export const deriveInitialCardType = (pathname?: string): CardType => {
  const path =
    (pathname as string) ||
    (typeof window !== "undefined" ? window.location.pathname : "");
  if (path.includes("/website-card-builder")) return "website";
  if (path.includes("/promo-card-builder")) return "promo";
  return "promo";
};

export const getStorageKey = (cardType: string, eventId?: string) =>
  `${cardType}-card-config-${eventId || "default"}`;

export const getPresetsForShape = (
  isPromo: boolean,
  shape: "square" | "landscape" | "portrait",
  SQUARE_PRESETS: StarterPreset[],
  LANDSCAPE_PRESETS: StarterPreset[],
  PORTRAIT_PRESETS: StarterPreset[],
  PROMO_SQUARE_PRESETS: StarterPreset[],
  PROMO_LANDSCAPE_PRESETS: StarterPreset[],
  PROMO_PORTRAIT_PRESETS: StarterPreset[],
) => {
  if (isPromo) {
    return shape === "landscape"
      ? PROMO_LANDSCAPE_PRESETS
      : shape === "portrait"
        ? PROMO_PORTRAIT_PRESETS
        : PROMO_SQUARE_PRESETS;
  }
  return shape === "landscape"
    ? LANDSCAPE_PRESETS
    : shape === "portrait"
      ? PORTRAIT_PRESETS
      : SQUARE_PRESETS;
};

export default {};

// ------- CardBuilder handlers exported for reuse in the component -------
export const handleDragStart = (e: React.DragEvent, elementKey: string) => {
  e.dataTransfer.effectAllowed = "copy";
  e.dataTransfer.setData("text/plain", elementKey);
};

export const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
};

export const handleDrop = (
  e: React.DragEvent,
  params: {
    ELEMENT_TEMPLATES: Record<string, any>;
    cardBuilderFields: any[];
    createDynamicElementTemplate: (f: any, idx: number) => any;
    getCanvasRelativePos: (
      cx: number,
      cy: number,
      canvasEl: HTMLCanvasElement,
      zoom: number,
    ) => { x: number; y: number };
    zoom: number;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    fabricCanvasRef: React.RefObject<any>;
    setShapePopupPosition: (p: { x: number; y: number }) => void;
    setShapePopupOpen: (v: boolean) => void;
    setHasUnsavedChanges: (v: boolean) => void;
    setConfig: (fn: any) => void;
    addToHistory: (cfg: any) => void;
    toast: (opts: any) => void;
  },
) => {
  e.preventDefault();
  const elementKey = e.dataTransfer.getData("text/plain");

  if (!elementKey) return;

  if (elementKey === "headshot") {
    // If caller wants to handle headshot popup they should pass a predicate; for safety we just set drop pos
    params.setShapePopupPosition({ x: e.clientX, y: e.clientY });
    params.setShapePopupOpen(true);
    (window as any).__headshotDropPos = { x: e.clientX, y: e.clientY };
    return;
  }

  const canvas = params.fabricCanvasRef.current;
  const canvasElement = params.canvasRef.current;
  if (!canvas || !canvasElement) return;

  const { x, y } = params.getCanvasRelativePos(
    e.clientX,
    e.clientY,
    canvasElement,
    params.zoom,
  );

  let template = params.ELEMENT_TEMPLATES[elementKey] as any;
  if (!template && elementKey.startsWith("dynamic_")) {
    const fieldId = elementKey.replace("dynamic_", "");
    const field = params.cardBuilderFields.find((f) => f.id === fieldId);
    if (field) template = params.createDynamicElementTemplate(field, 0);
  }
  if (!template) return;

  let adjustedX = x;
  let adjustedY = y;
  if (template.size) {
    adjustedX = x - template.size / 2;
    adjustedY = y - template.size / 2;
  } else if (template.width) {
    adjustedX = x - template.width / 2;
    adjustedY = y - 10;
  }

  params.setHasUnsavedChanges(true);
  params.setConfig((prev: any) => {
    const maxZ = Math.max(
      0,
      ...Object.values(prev).map((c: any) => c.zIndex || 0),
    );
    const newConfig = {
      ...prev,
      [elementKey]: {
        ...template,
        x: adjustedX,
        y: adjustedY,
        zIndex: maxZ + 1,
      },
    };
    params.addToHistory(newConfig);
    return newConfig;
  });

  params.toast({
    title: "Element added",
    description: `${template.label} added to canvas`,
  });
};

export const toggleElement = (
  elementKey: string,
  params: {
    config: any;
    setHasUnsavedChanges: (v: boolean) => void;
    setConfig: (fn: any) => void;
    addElementToCanvas: (key: string, pos?: any, props?: any) => void;
    toast: (opts: any) => void;
  },
) => {
  if (params.config[elementKey]) {
    params.setHasUnsavedChanges(true);
    params.setConfig((prev: any) => {
      const newConfig = { ...prev };
      // If toggling the legacy 'name' control, remove both firstName and lastName
      if (elementKey === "name") {
        delete newConfig.firstName;
        delete newConfig.lastName;
        delete newConfig.name;
      } else {
        delete newConfig[elementKey];
      }
      return newConfig;
    });
    params.toast({
      title: "Element removed",
      description: `Removed ${elementKey}`,
      duration: 2000,
    });
  } else {
    // If toggling the 'name' control, add both firstName and lastName elements
    if (elementKey === "name") {
      params.addElementToCanvas("firstName");
      params.addElementToCanvas("lastName");
    } else {
      params.addElementToCanvas(elementKey);
    }
  }
};

export const addElementToCanvas = (
  elementKey: string,
  params: {
    ELEMENT_TEMPLATES: Record<string, any>;
    customPos?: { x: number; y: number };
    customProps?: any;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    fabricCanvasRef: React.RefObject<any>;
    getCanvasRelativePos: (
      cx: number,
      cy: number,
      canvasEl: HTMLCanvasElement,
      zoom: number,
    ) => { x: number; y: number };
    zoom: number;
    canvasWidth: number;
    canvasHeight: number;
    setHasUnsavedChanges: (v: boolean) => void;
    setConfig: (fn: any) => void;
    addToHistory: (cfg: any) => void;
    toast: (opts: any) => void;
  },
) => {
  const template = params.ELEMENT_TEMPLATES[elementKey];
  if (!template) return;

  let posX: number, posY: number;
  if (params.customPos) {
    const canvas = params.fabricCanvasRef.current;
    const canvasElement = params.canvasRef.current;
    if (canvas && canvasElement) {
      const { x, y } = params.getCanvasRelativePos(
        params.customPos.x,
        params.customPos.y,
        canvasElement,
        params.zoom,
      );
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
      posX = params.canvasWidth / 2;
      posY = params.canvasHeight / 2;
    }
  } else if (template.size) {
    posX = params.canvasWidth / 2 - template.size / 2;
    posY = params.canvasHeight / 2 - template.size / 2;
  } else if (template.width) {
    posX = params.canvasWidth / 2 - template.width / 2;
    posY = params.canvasHeight / 2 - 10;
  } else {
    posX = params.canvasWidth / 2;
    posY = params.canvasHeight / 2;
  }

  params.setHasUnsavedChanges(true);
  params.setConfig((prev: any) => {
    const maxZ = Math.max(
      0,
      ...Object.values(prev).map((c: any) => c.zIndex || 0),
    );
    const newConfig = {
      ...prev,
      [elementKey]: {
        ...template,
        ...params.customProps,
        x: params.customProps?.x !== undefined ? params.customProps.x : posX,
        y: params.customProps?.y !== undefined ? params.customProps.y : posY,
        zIndex: maxZ + 1,
      },
    };
    params.addToHistory(newConfig);
    return newConfig;
  });

  params.toast({
    title: "Element added",
    description: `${template.label} added to canvas`,
  });
};

export const updateElement = (
  elementKey: string,
  updates: Partial<any>,
  params: {
    setHasUnsavedChanges: (v: boolean) => void;
    setConfig: (fn: any) => void;
    elementRefs: React.MutableRefObject<{ [key: string]: any }>;
    fabricCanvasRef: React.RefObject<any>;
    addToHistory: (cfg: any) => void;
  },
) => {
  params.setHasUnsavedChanges(true);
  params.setConfig((prev: any) => {
    const newConfig = {
      ...prev,
      [elementKey]: {
        ...prev[elementKey],
        ...updates,
      },
    };

    const fabricObj = params.elementRefs.current[elementKey];
    if (fabricObj && "fontSize" in fabricObj) {
      const textObj = fabricObj as any;
      if (updates.fontSize !== undefined)
        textObj.set("fontSize", updates.fontSize);
      if (updates.color !== undefined) textObj.set("fill", updates.color);
      if (updates.fontWeight !== undefined)
        textObj.set("fontWeight", updates.fontWeight);
      if (updates.fontStyle !== undefined)
        textObj.set("fontStyle", updates.fontStyle);
      if (updates.fontFamily !== undefined)
        textObj.set("fontFamily", updates.fontFamily);
      if (updates.textAlign !== undefined)
        textObj.set("textAlign", updates.textAlign);
      if (updates.underline !== undefined)
        textObj.set("underline", updates.underline);
      if (updates.lineHeight !== undefined)
        textObj.set("lineHeight", updates.lineHeight);
      if (updates.charSpacing !== undefined)
        textObj.set("charSpacing", updates.charSpacing);
      params.fabricCanvasRef.current?.requestRenderAll();
    }

    params.addToHistory(newConfig);
    return newConfig;
  });
};

export const addToHistory = (
  newConfig: any,
  params: {
    historyIndexRef: React.MutableRefObject<number>;
    setHistory: (fn: any) => void;
    setHistoryIndex: (i: number) => void;
  },
) => {
  const currentIdx = params.historyIndexRef.current;
  const nextIdx = Math.min(currentIdx + 1, 49);
  params.historyIndexRef.current = nextIdx;
  params.setHistory((prev: any[]) => {
    const newHistory = prev.slice(0, currentIdx + 1);
    newHistory.push(JSON.parse(JSON.stringify(newConfig)));
    return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
  });
  params.setHistoryIndex(nextIdx);
};

export const undo = (params: {
  historyIndexRef: React.MutableRefObject<number>;
  history: any[];
  setHistoryIndex: (i: number) => void;
  setConfig: (cfg: any) => void;
}) => {
  const currentIdx = params.historyIndexRef.current;
  if (currentIdx > 0) {
    const newIdx = currentIdx - 1;
    params.historyIndexRef.current = newIdx;
    params.setHistoryIndex(newIdx);
    params.setConfig(JSON.parse(JSON.stringify(params.history[newIdx])));
  }
};

export const redo = (params: {
  historyIndexRef: React.MutableRefObject<number>;
  history: any[];
  setHistoryIndex: (i: number) => void;
  setConfig: (cfg: any) => void;
}) => {
  const currentIdx = params.historyIndexRef.current;
  if (currentIdx < params.history.length - 1) {
    const newIdx = currentIdx + 1;
    params.historyIndexRef.current = newIdx;
    params.setHistoryIndex(newIdx);
    params.setConfig(JSON.parse(JSON.stringify(params.history[newIdx])));
  }
};

export const applyZoom = (
  newZoom: number,
  params: {
    fabricCanvasRef: React.RefObject<any>;
    canvasWidth: number;
    canvasHeight: number;
    setZoom: (z: number) => void;
  },
) => {
  const canvas = params.fabricCanvasRef.current;
  if (!canvas) return;
  canvas.setDimensions({
    width: params.canvasWidth * newZoom,
    height: params.canvasHeight * newZoom,
  });
  canvas.setViewportTransform([newZoom, 0, 0, newZoom, 0, 0]);
  params.setZoom(newZoom);
  canvas.renderAll();
};

export const handleZoomFit = (params: {
  fabricCanvasRef: React.RefObject<any>;
  canvasWidth: number;
  canvasHeight: number;
  setZoom: (z: number) => void;
}) => {
  const canvas = params.fabricCanvasRef.current;
  if (!canvas) return;
  canvas.setZoom(1);
  const objects = canvas.getObjects();
  if (objects.length === 0) {
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    params.setZoom(1);
    canvas.renderAll();
    return;
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  objects.forEach((obj: any) => {
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
  const zoomX = (params.canvasWidth - padding * 2) / contentWidth;
  const zoomY = (params.canvasHeight - padding * 2) / contentHeight;
  const newZoom = Math.min(zoomX, zoomY, 1);
  canvas.setZoom(newZoom);
  const canvasCenterX = params.canvasWidth / 2;
  const canvasCenterY = params.canvasHeight / 2;
  const viewportTransform = canvas.viewportTransform;
  if (viewportTransform) {
    viewportTransform[4] = canvasCenterX - contentCenterX * newZoom;
    viewportTransform[5] = canvasCenterY - contentCenterY * newZoom;
  }
  params.setZoom(newZoom);
  canvas.requestRenderAll();
};

// Additional helpers moved from CardBuilder for reuse and testing
export const alignSelection = (
  direction: any,
  params: {
    multiSelectedKeys: string[];
    selectedElement: string | null;
    config: any;
    elementRefs: React.MutableRefObject<{ [key: string]: any }>;
    canvasWidth: number;
    canvasHeight: number;
    setConfig: (fn: any) => void;
    addToHistory: (cfg: any) => void;
    setHasUnsavedChanges: (v: boolean) => void;
  },
) => {
  const { multiSelectedKeys, selectedElement, config } = params;
  const keys =
    multiSelectedKeys.length > 0
      ? multiSelectedKeys
      : selectedElement
        ? [selectedElement]
        : [];
  if (keys.length === 0) return;

  const items = keys.flatMap((key) => {
    const cfg = config[key];
    if (!cfg) return [];
    const obj = params.elementRefs.current[key];
    const x = cfg.x || 0;
    const y = cfg.y || 0;
    const width =
      cfg.actualWidth ??
      (obj ? Math.round(obj.getScaledWidth()) : (cfg.width ?? cfg.size ?? 100));
    const height =
      cfg.actualHeight ??
      (obj
        ? Math.round(obj.getScaledHeight())
        : (cfg.height ?? cfg.size ?? 100));
    return [{ key, x, y, width, height }];
  });
  if (items.length === 0) return;

  const updates: Record<string, { x: number; y: number }> = {};
  if (items.length === 1) {
    const { key, x, y, width, height } = items[0];
    let newX = x,
      newY = y;
    switch (direction) {
      case "left":
        newX = 0;
        break;
      case "right":
        newX = params.canvasWidth - width;
        break;
      case "centerH":
        newX = (params.canvasWidth - width) / 2;
        break;
      case "top":
        newY = 0;
        break;
      case "bottom":
        newY = params.canvasHeight - height;
        break;
      case "centerV":
        newY = (params.canvasHeight - height) / 2;
        break;
    }
    updates[key] = { x: newX, y: newY };
  } else {
    const selLeft = Math.min(...items.map((i) => i.x));
    const selRight = Math.max(...items.map((i) => i.x + i.width));
    const selTop = Math.min(...items.map((i) => i.y));
    const selBottom = Math.max(...items.map((i) => i.y + i.height));
    const selCenterX = (selLeft + selRight) / 2;
    const selCenterY = (selTop + selBottom) / 2;
    items.forEach(({ key, x, y, width, height }) => {
      let newX = x,
        newY = y;
      switch (direction) {
        case "left":
          newX = selLeft;
          break;
        case "right":
          newX = selRight - width;
          break;
        case "centerH":
          newX = selCenterX - width / 2;
          break;
        case "top":
          newY = selTop;
          break;
        case "bottom":
          newY = selBottom - height;
          break;
        case "centerV":
          newY = selCenterY - height / 2;
          break;
      }
      updates[key] = { x: newX, y: newY };
    });
  }

  params.setConfig((prev: any) => {
    const next = { ...prev };
    Object.entries(updates).forEach(([key, { x, y }]) => {
      next[key] = { ...prev[key], x, y };
    });
    params.addToHistory(next);
    return next;
  });
  params.setHasUnsavedChanges(true);
};

export const duplicateElement = (
  key: string,
  params: {
    config: any;
    setConfig: (fn: any) => void;
    addToHistory: (cfg: any) => void;
    setSelectedElement: (k: string) => void;
    setHasUnsavedChanges: (v: boolean) => void;
  },
) => {
  const cfg = params.config[key];
  if (!cfg || (Array.isArray(FIXED_KEYS) && FIXED_KEYS.includes(key))) return;
  const newKey =
    cfg.type === "gradient-overlay"
      ? `gradientOverlay_${Date.now()}`
      : `dynamic_${Date.now()}`;
  const maxZ = Math.max(
    0,
    ...Object.values(params.config).map((c: any) => c.zIndex || 0),
  );
  const newCfg = {
    ...cfg,
    x: (cfg.x || 0) + 15,
    y: (cfg.y || 0) + 15,
    zIndex: maxZ + 1,
    locked: false,
  };
  params.setConfig((prev: any) => {
    const next = { ...prev, [newKey]: newCfg };
    params.addToHistory(next);
    return next;
  });
  params.setSelectedElement(newKey);
  params.setHasUnsavedChanges(true);
};

export const bringToFront = (
  key: string,
  params: { config: any; updateElement: (k: string, u: any) => void },
) => {
  const maxZ = Math.max(
    0,
    ...Object.values(params.config).map((c: any) => c.zIndex || 0),
  );
  params.updateElement(key, { zIndex: maxZ + 1 });
};

export const sendToBack = (
  key: string,
  params: { config: any; updateElement: (k: string, u: any) => void },
) => {
  const minZ = Math.min(
    0,
    ...Object.values(params.config).map((c: any) => c.zIndex || 0),
  );
  params.updateElement(key, { zIndex: minZ - 1 });
};

export const bringForward = (
  key: string,
  params: {
    config: any;
    setConfig: (fn: any) => void;
    addToHistory: (cfg: any) => void;
    setHasUnsavedChanges: (v: boolean) => void;
  },
) => {
  const currentZ = params.config[key]?.zIndex || 0;
  const above = Object.entries(params.config)
    .filter(([k, v]) => k !== key && (v.zIndex || 0) > currentZ)
    .sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0))[0];
  if (above) {
    const aboveZ = above[1].zIndex || 0;
    params.setConfig((prev: any) => {
      const next = {
        ...prev,
        [key]: { ...prev[key], zIndex: aboveZ },
        [above[0]]: { ...prev[above[0]], zIndex: currentZ },
      };
      params.addToHistory(next);
      return next;
    });
    params.setHasUnsavedChanges(true);
  }
};

export const sendBackward = (
  key: string,
  params: {
    config: any;
    setConfig: (fn: any) => void;
    addToHistory: (cfg: any) => void;
    setHasUnsavedChanges: (v: boolean) => void;
  },
) => {
  const currentZ = params.config[key]?.zIndex || 0;
  const below = Object.entries(params.config)
    .filter(([k, v]) => k !== key && (v.zIndex || 0) < currentZ)
    .sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0))[0];
  if (below) {
    const belowZ = below[1].zIndex || 0;
    params.setConfig((prev: any) => {
      const next = {
        ...prev,
        [key]: { ...prev[key], zIndex: belowZ },
        [below[0]]: { ...prev[below[0]], zIndex: currentZ },
      };
      params.addToHistory(next);
      return next;
    });
    params.setHasUnsavedChanges(true);
  }
};

export const toggleLock = (
  key: string,
  params: { config: any; updateElement: (k: string, u: any) => void },
) => {
  params.updateElement(key, { locked: !params.config[key]?.locked });
};

export const addHeadshotShape = (
  shape: string,
  params: {
    __headshotDropPos?: any;
    addElementToCanvas: (k: string, p?: any, pr?: any) => void;
    setShapePopupOpen: (v: boolean) => void;
  },
) => {
  const dropPos = (window as any).__headshotDropPos;
  params.addElementToCanvas("headshot", dropPos, { shape });
  params.setShapePopupOpen(false);
};

export const selectLayerItem = (
  key: string,
  params: {
    fabricCanvasRef: React.RefObject<any>;
    elementRefs: React.MutableRefObject<{ [key: string]: any }>;
    setSelectedElement: (k: string) => void;
  },
) => {
  const canvas = params.fabricCanvasRef.current;
  const obj = params.elementRefs.current[key];
  if (canvas && obj) {
    canvas.setActiveObject(obj);
    canvas.renderAll();
    params.setSelectedElement(key);
  }
};

export const layerMoveUp = (
  key: string,
  params: { config: any; setConfig: (fn: any) => void },
) => {
  const sorted = Object.entries(params.config).sort(
    (a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0),
  );
  const ci = sorted.findIndex(([k]) => k === key);
  if (ci > 0) {
    const [pk] = sorted[ci - 1];
    const nc = { ...params.config };
    const tz = nc[key].zIndex;
    nc[key].zIndex = nc[pk].zIndex;
    nc[pk].zIndex = tz;
    params.setConfig(nc);
  }
};

export const layerMoveDown = (
  key: string,
  params: { config: any; setConfig: (fn: any) => void },
) => {
  const sorted = Object.entries(params.config).sort(
    (a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0),
  );
  const ci = sorted.findIndex(([k]) => k === key);
  if (ci < sorted.length - 1) {
    const [nk] = sorted[ci + 1];
    const nc = { ...params.config };
    const tz = nc[key].zIndex;
    nc[key].zIndex = nc[nk].zIndex;
    nc[nk].zIndex = tz;
    params.setConfig(nc);
  }
};

export const handleBackgroundUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  params: {
    loadImagePromise: (u: string) => Promise<HTMLImageElement>;
    fabricCanvasRef: React.RefObject<any>;
    setCanvasWidth: (w: number) => void;
    setCanvasHeight: (h: number) => void;
    setZoom: (z: number) => void;
    setTemplateUrl: (u: string | null) => void;
    toast: (opts: any) => void;
  },
) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const allowed = ["image/png", "image/jpeg"];
  if (!allowed.includes(file.type)) {
    params.toast({
      title: "Invalid file type",
      description: "Please upload a PNG or JPEG image",
      variant: "destructive",
    });
    return;
  }
  try {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const img = await params.loadImagePromise(dataUrl);
      params.setCanvasWidth(img.width);
      params.setCanvasHeight(img.height);
      if (params.fabricCanvasRef.current) {
        params.fabricCanvasRef.current.setDimensions({
          width: img.width,
          height: img.height,
        });
        params.fabricCanvasRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      }
      params.setZoom(1);
      params.setTemplateUrl(dataUrl);
      params.toast({
        title: "Background uploaded",
        description: `Canvas: ${img.width}x${img.height}. Use zoom controls if needed.`,
        duration: 3000,
      });
    };
    reader.onerror = () =>
      params.toast({ title: "Upload failed", variant: "destructive" });
    reader.readAsDataURL(file);
  } catch (err) {
    params.toast({ title: "Upload failed", variant: "destructive" });
  }
  e.target.value = "";
};

export const handleHeadshotUpload = (
  e: React.ChangeEvent<HTMLInputElement>,
  params: {
    setCropImageUrl: (u: string) => void;
    setCropMode: (m: any) => void;
    setCropDialogOpen: (v: boolean) => void;
    toast: (o: any) => void;
  },
) => {
  const file = e.target.files?.[0];
  const allowed = ["image/png", "image/jpeg"];
  if (!file) return;
  if (!allowed.includes(file.type)) {
    params.toast({
      title: "Invalid file type",
      description: "Headshot must be PNG or JPEG",
      variant: "destructive",
    });
    e.target.value = "";
    return;
  }
  const url = URL.createObjectURL(file);
  params.setCropImageUrl(url);
  params.setCropMode("headshot");
  params.setCropDialogOpen(true);
};

export const handleLogoUpload = (
  e: React.ChangeEvent<HTMLInputElement>,
  params: {
    setCropImageUrl: (u: string) => void;
    setCropMode: (m: any) => void;
    setCropDialogOpen: (v: boolean) => void;
    toast: (o: any) => void;
  },
) => {
  const file = e.target.files?.[0];
  const allowed = ["image/png", "image/jpeg"];
  if (!file) return;
  if (!allowed.includes(file.type)) {
    params.toast({
      title: "Invalid file type",
      description: "Logo must be PNG or JPEG",
      variant: "destructive",
    });
    e.target.value = "";
    return;
  }
  const url = URL.createObjectURL(file);
  params.setCropImageUrl(url);
  params.setCropMode("logo");
  params.setCropDialogOpen(true);
};

export const handleCropComplete = async (
  blob: Blob,
  params: {
    cropMode: string | null;
    setTemplateUrl: (u: string | null) => void;
    setBgIsGenerated: (v: boolean) => void;
    setTestHeadshot: (u: string | null) => void;
    setTestLogo: (u: string | null) => void;
    config: any;
    addElementToCanvas: (k: string, p?: any, pr?: any) => void;
    setCropDialogOpen: (v: boolean) => void;
    setCropImageUrl: (u: string) => void;
    setCropMode: (m: any) => void;
    toast: (opts: any) => void;
  },
) => {
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onerror = () => reject(new Error("read error"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  if (params.cropMode === "template") {
    params.setTemplateUrl(dataUrl);
    params.setBgIsGenerated(false);
    params.toast({ title: "Background uploaded" });
  } else if (params.cropMode === "headshot") {
    params.setTestHeadshot(dataUrl);
    if (!params.config.headshot) params.addElementToCanvas("headshot");
    params.toast({ title: "Test headshot uploaded" });
  } else if (params.cropMode === "logo") {
    params.setTestLogo(dataUrl);
    if (!params.config.companyLogo) params.addElementToCanvas("companyLogo");
    params.toast({ title: "Test logo uploaded" });
  }

  params.setCropDialogOpen(false);
  params.setCropImageUrl("");
  params.setCropMode(null);
};

export const handleSave = async (
  silent: boolean,
  params: {
    config: any;
    elementRefs: React.MutableRefObject<{ [key: string]: any }>;
    canvasWidth: number;
    canvasHeight: number;
    templateUrl: string | null;
    bgColor: string;
    bgGradient: any;
    cardType: string;
    eventId?: string;
    setTemplateUrl: (u: string | null) => void;
    setBgIsGenerated: (v: boolean) => void;
    setHasUnsavedChanges: (v: boolean) => void;
    toast: (opts: any) => void;
  },
) => {
  const effectiveConfig = { ...params.config };
  const backendConfig = { ...effectiveConfig };
  // ["firstName", "lastName", "title"].forEach((k) => {
  //   const obj = params.elementRefs.current[k] as any | undefined;
  //   if (obj && obj.fontSize && backendConfig[k]) {
  //     backendConfig[k] = { ...backendConfig[k], fontSize: obj.fontSize };
  //   }
  // });

  if (params.eventId) {
    let finalTemplateUrl = params.templateUrl;
    const bgIsGenerated = !params.templateUrl;
    if (bgIsGenerated) {
      try {
        const bgCanvas = document.createElement("canvas");
        bgCanvas.width = params.canvasWidth;
        bgCanvas.height = params.canvasHeight;
        const ctx = bgCanvas.getContext("2d");
        if (ctx) {
          if (params.bgGradient) {
            const grad = ctx.createLinearGradient(
              0,
              0,
              params.canvasWidth,
              params.canvasHeight,
            );
            grad.addColorStop(0, params.bgGradient.from);
            grad.addColorStop(1, params.bgGradient.to);
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = params.bgColor;
          }
          ctx.fillRect(0, 0, params.canvasWidth, params.canvasHeight);
          finalTemplateUrl = bgCanvas.toDataURL("image/png");
        }
      } catch (_bgErr) {
        // non-fatal
      }
    }

    if (
      finalTemplateUrl &&
      (finalTemplateUrl.startsWith("data:") ||
        finalTemplateUrl.startsWith("blob:"))
    ) {
      try {
        const fetched = await fetch(finalTemplateUrl);
        const blob = await fetched.blob();
        const fileName = `template-${Date.now()}`;
        const file = new File(
          [blob],
          `${fileName}.${(blob.type || "image/png").split("/").pop()}`,
          { type: blob.type || "image/png" },
        );
        const uploadRes = await uploadFile(file, undefined, params.eventId);
        const uploadedUrl =
          uploadRes?.public_url ??
          uploadRes?.publicUrl ??
          uploadRes?.url ??
          uploadRes?.id ??
          null;
        if (uploadedUrl) {
          finalTemplateUrl = uploadedUrl;
          if (!bgIsGenerated) {
            params.setTemplateUrl(finalTemplateUrl);
            params.setBgIsGenerated(false);
          }
        }
      } catch (uploadErr) {
        params.toast({
          title: "Upload failed",
          description:
            "Could not upload background image to server. Saved locally instead.",
          variant: "destructive",
        });
      }
    }

    const payloadConfig = {
      ...backendConfig,
      templateUrl: finalTemplateUrl,
      canvasWidth: params.canvasWidth,
      canvasHeight: params.canvasHeight,
      bgColor: params.bgColor,
      bgGradient: params.bgGradient ?? undefined,
      bgIsGenerated,
    };
    const saved = await createPromoConfig({
      eventId: params.eventId,
      promoType: params.cardType,
      config: payloadConfig,
    });
    const serverTemplateUrl =
      saved?.templateUrl ??
      saved?.config?.templateUrl ??
      saved?.config?.template_url ??
      null;
    if (serverTemplateUrl && !bgIsGenerated) {
      params.setTemplateUrl(serverTemplateUrl);
      params.setBgIsGenerated(false);
    }
    if (!silent)
      params.toast({
        title: "Saved",
        description: `${params.cardType === "promo" ? "Promo" : "Website"} card template saved`,
      });
  } else {
    throw new Error("eventId required to save card configuration");
  }

  params.setHasUnsavedChanges(false);
};

export const handleExport = (params: {
  fabricCanvasRef: React.RefObject<any>;
  canvasWidth: number;
  canvasHeight: number;
  cardType: string;
  toast: (o: any) => void;
}) => {
  const canvas = params.fabricCanvasRef.current;
  if (!canvas) return;
  const savedTransform = canvas.viewportTransform
    ? [...canvas.viewportTransform]
    : [1, 0, 0, 1, 0, 0];
  const savedW = canvas.getWidth();
  const savedH = canvas.getHeight();
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.setDimensions({
    width: params.canvasWidth,
    height: params.canvasHeight,
  });
  const dataURL = canvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier: 2,
  });
  canvas.setDimensions({ width: savedW, height: savedH });
  canvas.setViewportTransform(
    savedTransform as [number, number, number, number, number, number],
  );
  canvas.renderAll();
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = `${params.cardType}-card-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  params.toast({ title: "Exported", description: "Card downloaded as PNG" });
};

export const handleReset = (params: {
  setConfig: (fn: any) => void;
  setTemplateUrl: (u: string | null) => void;
  setTestHeadshot: (u: string | null) => void;
  setTestLogo: (u: string | null) => void;
  setSelectedElement: (k: string | null) => void;
  setCanvasWidth: (w: number) => void;
  setCanvasHeight: (h: number) => void;
  setBgColor: (c: string) => void;
  setBgGradient: (g: any) => void;
  setBgGradientStyle: (s: any) => void;
  setBgIsGenerated: (v: boolean) => void;
  setHistory: (h: any) => void;
  historyIndexRef: React.MutableRefObject<number>;
  setHistoryIndex: (i: number) => void;
  setHasUnsavedChanges: (v: boolean) => void;
  fabricCanvasRef: React.RefObject<any>;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  headshotInputRef?: React.RefObject<HTMLInputElement>;
  logoInputRef?: React.RefObject<HTMLInputElement>;
  toast: (o: any) => void;
}) => {
  const confirmed = window.confirm(
    "Are you sure you want to reset the card?\n\nThis will clear all elements and the background. This action cannot be undone.",
  );
  if (!confirmed) return;
  params.setConfig({});
  params.setTemplateUrl(null);
  params.setTestHeadshot(null);
  params.setTestLogo(null);
  params.setSelectedElement(null);
  params.setCanvasWidth(600);
  params.setCanvasHeight(600);
  params.setBgColor("#ffffff");
  params.setBgGradient(null);
  params.setBgGradientStyle(null);
  params.setBgIsGenerated(false);
  params.setHistory([]);
  params.historyIndexRef.current = -1;
  params.setHistoryIndex(-1);
  params.setHasUnsavedChanges(false);
  if (params.fabricCanvasRef.current) {
    params.fabricCanvasRef.current.clear();
    params.fabricCanvasRef.current.setDimensions({ width: 600, height: 600 });
    params.fabricCanvasRef.current.backgroundColor = "#ffffff";
    params.fabricCanvasRef.current.requestRenderAll();
  }
  if (params.fileInputRef?.current) params.fileInputRef.current.value = "";
  if (params.headshotInputRef?.current)
    params.headshotInputRef.current.value = "";
  if (params.logoInputRef?.current) params.logoInputRef.current.value = "";
  params.toast({
    title: "Card reset",
    description: "Started with a fresh canvas",
    duration: 2000,
  });
};

export const handleZoomReset = (params: {
  fabricCanvasRef: React.RefObject<any>;
  canvasWidth: number;
  setZoom: (z: number) => void;
}) => {
  const c = params.fabricCanvasRef.current;
  if (!c) return;
  c.setViewportTransform([1, 0, 0, 1, 0, 0]);
  c.setDimensions({ width: params.canvasWidth, height: params.canvasWidth });
  params.setZoom(1);
  c.renderAll();
};

export const applyGradientStyle = (
  style: "dark" | "tonal" | "soft",
  params: {
    deriveGradient: (c: string, s: any) => any;
    bgColor: string;
    setBgGradient: (g: any) => void;
    setBgGradientStyle: (s: any) => void;
    setHasUnsavedChanges: (v: boolean) => void;
  },
) => {
  const grad = params.deriveGradient(params.bgColor, style);
  params.setBgGradient(grad);
  params.setBgGradientStyle(style);
  params.setHasUnsavedChanges(true);
};

export const clearGradient = (params: {
  setBgGradient: (g: any) => void;
  setBgGradientStyle: (s: any) => void;
  setHasUnsavedChanges: (v: boolean) => void;
}) => {
  params.setBgGradient(null);
  params.setBgGradientStyle(null);
  params.setHasUnsavedChanges(true);
};

export const dismissOnboarding = (params: {
  setShowOnboarding: (v: boolean) => void;
  setOnboardingShowShapePicker: (v: boolean) => void;
  setOnboardingShowTemplates: (v: boolean) => void;
  setOnboardingQuickSetup: (v: boolean) => void;
  setPendingPreset: (p: any) => void;
}) => {
  params.setShowOnboarding(false);
  params.setOnboardingShowShapePicker(false);
  params.setOnboardingShowTemplates(false);
  params.setOnboardingQuickSetup(false);
  params.setPendingPreset(null);
};

export const applyPresetAndDismiss = (
  preset: any,
  params: {
    presetApply: (p: any) => void;
    dismissOnboarding: (p: any) => void;
  },
) => {
  preset.apply(
    preset.defaultBg,
    preset.defaultTextColor,
    "Montserrat",
    preset.canvasW,
    preset.canvasH,
  );
  params.dismissOnboarding(null);
};
