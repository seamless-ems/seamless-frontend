import { fabric } from "fabric";
import { API_BASE } from "@/lib/api";
import {
  loadImagePromise,
  getAbsoluteUrl,
  hexToRgba,
  getGradientCoords,
  ICON_COLORS,
  ICON_TEXT,
} from "@/lib/card-builder-utils";
import type { CardConfig } from "@/lib/card-builder-utils";

type RenderParams = {
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>;
  renderGenRef: React.MutableRefObject<number>;
  elementRefs: React.MutableRefObject<{ [key: string]: fabric.Object }>;
  config: CardConfig;
  templateUrl: string | null;
  testHeadshot: string | null;
  testLogo: string | null;
  testEventLogo: string | null;
  bgGradient: { from: string; to: string } | null;
  bgColor: string;
  canvasWidth: number;
  canvasHeight: number;
  toast: (opts: any) => void;
  onFontSizeResolved?: (updates: Record<string, number>) => void;
};

export async function renderAllElements(params: RenderParams) {
  const {
    fabricCanvasRef,
    renderGenRef,
    elementRefs,
    config,
    templateUrl,
    testHeadshot,
    testLogo,
    testEventLogo,
    bgGradient,
    bgColor,
    canvasWidth,
    canvasHeight,
    toast,
    onFontSizeResolved,
  } = params;

  // Tracks the actual rendered font size for name/title elements after auto-shrink.
  // Used to sync firstName/lastName to the same size and to update the toolbar.
  const resolvedNameFontSizes: Record<string, number> = {};

  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  const gen = ++renderGenRef.current;

  try {
    await document.fonts.ready;
  } catch (_) {}

  if (gen !== renderGenRef.current) return;

  // Defensive: fabric's internal drawing context can be null briefly if the
  // canvas element isn't attached to the DOM yet. Retry a few times with a
  // short delay before giving up to reduce race conditions where React mounts
  // the component but the canvas isn't ready for drawing yet.
  const hasDrawingContext = (): boolean => {
    try {
      const ctx = (canvas as any).getContext?.() ?? null;
      if (ctx) return true;
    } catch (_) {
      // fallthrough
    }
    // Fallback: check Fabric internals conservatively
    const lower = (canvas as any).lowerCanvasEl;
    if (lower && typeof lower.getContext === "function") {
      try {
        return !!lower.getContext("2d");
      } catch (_) {
        return false;
      }
    }
    const container = (canvas as any).contextContainer;
    return !!container;
  };

  let ready = hasDrawingContext();
  if (!ready) {
    // retry up to 20 times, 50ms apart (1s total) to handle slow DOM/shadow-root mounting
    for (let i = 0; i < 20 && !ready; i++) {
      // small sleep
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 50));
      ready = hasDrawingContext();
    }
  }

  if (!ready) {
    // Log detailed debug info to diagnose why the 2D context isn't available.
    try {
      const lower = (canvas as any).lowerCanvasEl;
      let ctxInfo: any = null;
      try {
        if (lower && typeof lower.getContext === "function") {
          const ctx = lower.getContext("2d");
          ctxInfo = { exists: !!ctx, type: typeof ctx };
        }
      } catch (e) {
        ctxInfo = { error: String(e) };
      }
      console.warn("renderAllElements: canvas drawing context unavailable after retries", {
        seamReady: !!(canvas as any).__seamless_ready,
        lowerExists: !!lower,
        lowerIsConnected: !!(lower && lower.isConnected),
        ctxInfo,
        canvasSummary: String(canvas),
      });
    } catch (e) {
      console.warn("renderAllElements: canvas drawing context unavailable (failed to inspect)", e);
    }
    return;
  }

  try {
    canvas.clear();
  } catch (err) {
    toast({ title: "Canvas error", description: String(err), variant: "destructive" });
    return;
  }
  if (bgGradient) {
    const grad = new fabric.Gradient({
      type: "linear",
      gradientUnits: "pixels",
      coords: { x1: 0, y1: 0, x2: canvasWidth, y2: canvasHeight },
      colorStops: [
        { offset: 0, color: bgGradient.from },
        { offset: 1, color: bgGradient.to },
      ],
    });
    canvas.setBackgroundColor(grad as any, () => {});
  } else {
    canvas.setBackgroundColor(bgColor, () => {});
  }
  elementRefs.current = {};

  if (templateUrl) {
    try {
      const bgUrl = getAbsoluteUrl(templateUrl, API_BASE) || templateUrl;
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
      elementRefs.current["_background"] = fabricImg;
      canvas.renderAll();
    } catch (err) {
      toast({
        title: "Failed to load background",
        description: String(err),
        variant: "destructive",
      });
    }
  }

  const sortedEntries = Object.entries(config).sort((a, b) => {
    return (a[1].zIndex || 0) - (b[1].zIndex || 0);
  });

  for (const [key, cfg] of sortedEntries) {
    if (!cfg.visible) continue;

    if (key === "headshot") {
      if (testHeadshot) {
        const img = await loadImagePromise(testHeadshot);
        const fabricImg = new fabric.Image(img, {
          left: cfg.x,
          top: cfg.y,
          opacity: cfg.opacity ?? 1,
          selectable: true,
          hasControls: true,
          lockRotation: true,
          lockUniScaling: true,
          data: { elementKey: "headshot" },
        });

        fabricImg.setControlsVisibility({ ml: false, mt: false, mr: false, mb: false });

        const scaleX = cfg.scaleX || 1;
        const scaleY = cfg.scaleY || 1;
        const shape = cfg.shape || "circle";

        if (shape === "circle") {
          const actualSize = cfg.size * scaleX;
          const radius = actualSize / 2;
          fabricImg.set({
            clipPath: new fabric.Circle({ radius: radius, originX: "center", originY: "center" }),
          });
          fabricImg.scaleToWidth(actualSize);
        } else if (shape === "square") {
          const actualWidth = cfg.size * scaleX;
          fabricImg.scaleToWidth(actualWidth);
        } else if (shape === "vertical") {
          const actualWidth = cfg.size * scaleX;
          const actualHeight = ((cfg.size * 4) / 3) * scaleY;
          fabricImg.scaleToWidth(actualWidth);
          fabricImg.set({
            clipPath: new fabric.Rect({ width: actualWidth / fabricImg.scaleX!, height: actualHeight / fabricImg.scaleY!, originX: "center", originY: "center" }),
          });
        } else if (shape === "horizontal") {
          const actualWidth = cfg.size * scaleX;
          const actualHeight = ((cfg.size * 3) / 4) * scaleY;
          fabricImg.scaleToWidth(actualWidth);
          fabricImg.set({
            clipPath: new fabric.Rect({ width: actualWidth / fabricImg.scaleX!, height: actualHeight / fabricImg.scaleY!, originX: "center", originY: "center" }),
          });
        } else if (shape === "rounded") {
          const actualWidth = cfg.size * scaleX;
          fabricImg.scaleToWidth(actualWidth);
          const rx = 16 / (fabricImg.scaleX || 1);
          fabricImg.set({
            clipPath: new fabric.Rect({ width: actualWidth / (fabricImg.scaleX || 1), height: actualWidth / (fabricImg.scaleY || 1), rx, ry: rx, originX: "center", originY: "center" }),
          });
        } else if (shape === "full-bleed") {
          const imgNaturalW = img.width || 1;
          const imgNaturalH = img.height || 1;
          const coverScale = Math.max(canvasWidth / imgNaturalW, canvasHeight / imgNaturalH);
          fabricImg.set({ left: 0, top: 0, scaleX: coverScale, scaleY: coverScale, hasControls: false, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true });
        } else if (shape === "banner") {
          const bannerW = canvasWidth;
          const bannerH = (cfg.height ?? cfg.size ?? 260) * (cfg.scaleY || 1);
          const imgNaturalW = img.width || 1;
          const imgNaturalH = img.height || 1;
          const coverScale = Math.max(bannerW / imgNaturalW, bannerH / imgNaturalH);
          fabricImg.set({ left: 0, top: cfg.y ?? 0, scaleX: coverScale, scaleY: coverScale, lockMovementX: true, lockScalingX: true, clipPath: new fabric.Rect({ left: 0, top: cfg.y ?? 0, width: bannerW, height: bannerH, absolutePositioned: true }) });
          fabricImg.setControlsVisibility({ ml: false, mr: false, mt: false, tl: false, tr: false, bl: false, br: false, mb: true, mtr: false });
        }

        canvas.add(fabricImg);
        elementRefs.current.headshot = fabricImg;
      } else {
        const shape = cfg.shape || "circle";
        const scaleX = cfg.scaleX || 1;
        const scaleY = cfg.scaleY || 1;

        let baseWidth = cfg.size;
        let baseHeight = cfg.size;

        if (shape === "vertical") {
          baseHeight = (cfg.size * 4) / 3;
        } else if (shape === "horizontal") {
          baseHeight = (cfg.size * 3) / 4;
        } else if (shape === "full-bleed") {
          baseWidth = canvasWidth;
          baseHeight = canvasHeight;
        } else if (shape === "banner") {
          baseWidth = canvasWidth;
          baseHeight = cfg.height ?? cfg.size;
        }

        const width = baseWidth * scaleX;
        const height = baseHeight * scaleY;

        const rect = new fabric.Rect({ left: 0, top: 0, width: width, height: height, fill: "#e5e7eb", stroke: "#d1d5db", strokeWidth: 2, strokeUniform: true, rx: shape === "circle" ? width / 2 : shape === "rounded" || shape === "full-bleed" ? 16 : 4, ry: shape === "circle" ? height / 2 : shape === "rounded" || shape === "full-bleed" ? 16 : 4, selectable: false, evented: false });

        const text = new fabric.Text("Headshot", { left: width / 2, top: height / 2, fontSize: cfg.fontSize ?? Math.min(Math.max(14, width / 6), 20), fill: "#9ca3af", fontFamily: "Inter", originX: "center", originY: "center", selectable: false, evented: false });

        const group = new fabric.Group([rect, text], { left: cfg.x, top: cfg.y, selectable: true, hasControls: true, lockRotation: true, lockUniScaling: true, subTargetCheck: false, data: { elementKey: "headshot" } });

        group.setControlsVisibility({ ml: false, mt: false, mr: false, mb: false });

        if (shape === "full-bleed") {
          group.set({ left: 0, top: 0, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, hasControls: false });
        }

        if (shape === "banner") {
          group.set({ left: 0, top: cfg.y ?? 0, lockMovementX: true, lockScalingX: true, lockUniScaling: false });
          group.setControlsVisibility({ ml: false, mr: false, mt: false, tl: false, tr: false, bl: false, br: false, mb: true, mtr: false });
        }

        canvas.add(group);
        elementRefs.current.headshot = group;
      }
    } else if (key === "companyLogo") {
      if (testLogo) {
        const img = await loadImagePromise(testLogo);
        const fabricImg = new fabric.Image(img, { left: cfg.x, top: cfg.y, opacity: cfg.opacity ?? 1, selectable: true, hasControls: true, lockRotation: true, lockUniScaling: false, data: { elementKey: "companyLogo" } });

        const LOGO_PAD = 10;
        const dropW = cfg.width || cfg.size;
        const dropH = cfg.height || cfg.size;

        if (cfg.actualWidth) {
          fabricImg.scaleToWidth(cfg.actualWidth);
        } else {
          const naturalW = (fabricImg.width as number) || 1;
          const naturalH = (fabricImg.height as number) || 1;
          const maxW = dropW - LOGO_PAD * 2;
          const maxH = dropH - LOGO_PAD * 2;
          const scale = Math.min(maxW / naturalW, maxH / naturalH);
          fabricImg.set({ scaleX: scale, scaleY: scale });
          const scaledW = naturalW * scale;
          const scaledH = naturalH * scale;
          fabricImg.set({ left: cfg.x + (dropW - scaledW) / 2, top: cfg.y + (dropH - scaledH) / 2 });
        }

        canvas.add(fabricImg);
        elementRefs.current.companyLogo = fabricImg;
      } else {
        const width = cfg.width || cfg.size || 60;
        const height = cfg.height || cfg.size || 60;

        const fillRect = new fabric.Rect({ left: 0, top: 0, width: width, height: height, fill: "#e5e7eb", strokeWidth: 0, rx: 4, ry: 4, selectable: false, evented: false });

        const borderRect = new fabric.Rect({ left: 2, top: 2, width: width - 4, height: height - 4, fill: "transparent", stroke: "#9ca3af", strokeWidth: 1.5, strokeDashArray: [5, 5], strokeUniform: true, rx: 3, ry: 3, selectable: false, evented: false });

        const text = new fabric.Text("Logo Drop Zone", { left: width / 2, top: height / 2, fontSize: cfg.fontSize ?? Math.min(Math.max(11, width / 8), 18), fill: "#6b7280", fontFamily: "Inter", originX: "center", originY: "center", selectable: false, evented: false });

        const group = new fabric.Group([fillRect, borderRect, text], { left: cfg.x, top: cfg.y, selectable: true, hasControls: true, lockRotation: true, subTargetCheck: false, data: { elementKey: "companyLogo" } });

        canvas.add(group);
        elementRefs.current.companyLogo = group;
      }
    } else if (key === "eventLogo") {
      const eventLogoSrc = testEventLogo || (cfg.url as string | undefined) || null;
      if (eventLogoSrc) {
        const img = await loadImagePromise(eventLogoSrc);
        const fabricImg = new fabric.Image(img, { left: cfg.x, top: cfg.y, opacity: cfg.opacity ?? 1, selectable: true, hasControls: true, lockRotation: true, lockUniScaling: false, data: { elementKey: "eventLogo" } });

        const LOGO_PAD = 10;
        const dropW = cfg.width || cfg.size;
        const dropH = cfg.height || cfg.size;

        if (cfg.actualWidth) {
          fabricImg.scaleToWidth(cfg.actualWidth);
        } else {
          const naturalW = (fabricImg.width as number) || 1;
          const naturalH = (fabricImg.height as number) || 1;
          const maxW = dropW - LOGO_PAD * 2;
          const maxH = dropH - LOGO_PAD * 2;
          const scale = Math.min(maxW / naturalW, maxH / naturalH);
          fabricImg.set({ scaleX: scale, scaleY: scale });
          const scaledW = naturalW * scale;
          const scaledH = naturalH * scale;
          fabricImg.set({ left: cfg.x + (dropW - scaledW) / 2, top: cfg.y + (dropH - scaledH) / 2 });
        }

        canvas.add(fabricImg);
        elementRefs.current.eventLogo = fabricImg;
      } else {
        const width = cfg.width || cfg.size || 60;
        const height = cfg.height || cfg.size || 60;

        const fillRect = new fabric.Rect({ left: 0, top: 0, width: width, height: height, fill: "#e5e7eb", strokeWidth: 0, rx: 4, ry: 4, selectable: false, evented: false });
        const borderRect = new fabric.Rect({ left: 2, top: 2, width: width - 4, height: height - 4, fill: "transparent", stroke: "#9ca3af", strokeWidth: 1.5, strokeDashArray: [5, 5], strokeUniform: true, rx: 3, ry: 3, selectable: false, evented: false });
        const text = new fabric.Text("Event Logo", { left: width / 2, top: height / 2, fontSize: cfg.fontSize ?? Math.min(Math.max(11, width / 8), 18), fill: "#6b7280", fontFamily: "Inter", originX: "center", originY: "center", selectable: false, evented: false });

        const group = new fabric.Group([fillRect, borderRect, text], { left: cfg.x, top: cfg.y, selectable: true, hasControls: true, lockRotation: true, subTargetCheck: false, data: { elementKey: "eventLogo" } });

        canvas.add(group);
        elementRefs.current.eventLogo = group;
      }
    } else if (["name", "title", "company", "firstName", "lastName"].includes(key)) {
      let displayText = cfg.text || cfg.label;
      // Backwards compat: single `name` element using two-line format
      if (key === "name" && cfg.nameFormat === "two-line") {
        const parts = displayText.trim().split(/\s+/);
        displayText = parts.length >= 2 ? parts.slice(0, -1).join(" ") + "\n" + parts[parts.length - 1] : displayText;
      }
      const text = new fabric.Textbox(displayText, { left: cfg.x, top: cfg.y, fontSize: cfg.fontSize, fontFamily: cfg.fontFamily, fill: cfg.color, paintFirst: "fill" as any, fontWeight: cfg.fontWeight, fontStyle: cfg.fontStyle || "normal", textAlign: cfg.textAlign, underline: cfg.underline || false, lineHeight: cfg.lineHeight || 1.2, charSpacing: cfg.charSpacing || 0, width: cfg.width, opacity: cfg.opacity ?? 1, selectable: true, editable: true, hasControls: true, lockRotation: true, lockUniScaling: false, data: { elementKey: key } });

      text.setControlsVisibility({ tl: false, tr: false, bl: false, br: false, ml: false, mt: false, mr: true, mb: false, mtr: false });
      text.set({ scaleX: 1, scaleY: 1 });

      // When using separate `firstName`/`lastName`, allow only 1 line each; keep title at up to 2 lines
      if (key === "name" || key === "title" || key === "firstName" || key === "lastName") {
        const maxLines = key === "title" ? 2 : 1;
        const minFontSize = key === "title" ? 14 : 20;
        const boxWidth = cfg.width || 300;
        let fs = cfg.fontSize;

        text.initDimensions();

        while ((text.textLines?.length ?? 0) > maxLines && fs > minFontSize) {
          fs--;
          text.set({ fontSize: fs });
          text.initDimensions();
        }

        const measureEl = document.createElement("span");
        measureEl.style.cssText = `position:absolute;top:-9999px;left:-9999px;white-space:nowrap;font-family:${cfg.fontFamily || "Inter"};font-weight:${cfg.fontWeight || 700};font-size:${fs}px;`;
        document.body.appendChild(measureEl);
        const lines: string[] = (text.textLines as string[]) ?? [];
        let needsWidthShrink = lines.some((line) => {
          measureEl.textContent = line;
          return measureEl.getBoundingClientRect().width > boxWidth - 2;
        });
        while (needsWidthShrink && fs > minFontSize) {
          fs--;
          text.set({ fontSize: fs });
          text.initDimensions();
          measureEl.style.fontSize = `${fs}px`;
          needsWidthShrink = (text.textLines as string[]).some((line) => {
            measureEl.textContent = line;
            return measureEl.getBoundingClientRect().width > boxWidth - 2;
          });
        }
        document.body.removeChild(measureEl);
        text.set({ width: boxWidth });
        text.initDimensions();
        text.setCoords();
        // Record the actual rendered font size so we can sync name pairs and update the toolbar
        resolvedNameFontSizes[key] = fs;
      }

      canvas.add(text);
      elementRefs.current[key] = text;
    } else if (key.startsWith("dynamic_")) {
      if (cfg.type === "icon-link") {
        const color = ICON_COLORS[cfg.iconType] || "#666666";
        const textVal = ICON_TEXT[cfg.iconType] || "🔗";

        const background = new fabric.Rect({ left: 0, top: 0, width: cfg.size, height: cfg.size, fill: color, rx: 4, ry: 4, selectable: false, evented: false });

        const iconLabel = new fabric.Text(textVal, { left: cfg.size / 2, top: cfg.size / 2, fontSize: cfg.size * 0.4, fill: "#ffffff", fontFamily: "Inter", fontWeight: "bold", originX: "center", originY: "center", selectable: false, evented: false });

        const group = new fabric.Group([background, iconLabel], { left: cfg.x, top: cfg.y, selectable: true, hasControls: true, lockRotation: true, lockUniScaling: true, subTargetCheck: false, data: { elementKey: key, type: "icon-link" } });

        group.setControlsVisibility({ ml: false, mt: false, mr: false, mb: false });

        if (cfg.scaleX !== undefined) group.set("scaleX", cfg.scaleX);
        if (cfg.scaleY !== undefined) group.set("scaleY", cfg.scaleY);

        canvas.add(group);
        elementRefs.current[key] = group;
      } else if (cfg.type === "dynamic-text") {
        const text = new fabric.Textbox(cfg.text || cfg.label, { left: cfg.x, top: cfg.y, fontSize: cfg.fontSize, fontFamily: cfg.fontFamily, fill: cfg.color, paintFirst: "fill" as any, fontWeight: cfg.fontWeight, textAlign: cfg.textAlign, width: cfg.width, opacity: cfg.opacity ?? 1, charSpacing: cfg.charSpacing ?? 0, selectable: true, editable: true, hasControls: true, lockRotation: true, lockUniScaling: false, data: { elementKey: key, type: "dynamic-text" } });

        text.setControlsVisibility({ ml: false, mt: false, mr: true, mb: false, mtr: false });

        if (cfg.scaleX !== undefined) text.set("scaleX", cfg.scaleX);
        if (cfg.scaleY !== undefined) text.set("scaleY", cfg.scaleY);

        canvas.add(text);
        elementRefs.current[key] = text;
      }
    } else if (cfg.type === "gradient-overlay") {
      const width = cfg.width || canvasWidth;
      const height = cfg.height || canvasHeight / 2;
      const color = cfg.gradientColor || "#000000";
      const opacity = cfg.overlayOpacity ?? 0.9;
      const direction = cfg.gradientDirection || "bottom";

      const coords = getGradientCoords(direction, width, height);

      const rect = new fabric.Rect({ left: cfg.x || 0, top: cfg.y || 0, width, height, opacity: cfg.opacity ?? 1, fill: new fabric.Gradient({ type: "linear", gradientUnits: "pixels", coords, colorStops: [ { offset: 0, color: hexToRgba(color, 0) }, { offset: 0.2, color: hexToRgba(color, 0) }, { offset: 0.5, color: hexToRgba(color, opacity * 0.55) }, { offset: 0.75, color: hexToRgba(color, opacity * 0.88) }, { offset: 1, color: hexToRgba(color, opacity) }, ], }), selectable: true, hasControls: true, lockRotation: true, data: { elementKey: key, type: "gradient-overlay" } });

      canvas.add(rect);
      elementRefs.current[key] = rect;
    }
  }

  Object.entries(config).forEach(([key, cfg]) => {
    const obj = elementRefs.current[key];
    if (obj && cfg.locked) {
      obj.set({ lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, hasControls: false, hoverCursor: "not-allowed" });
    }
  });

  // Sync firstName/lastName to the same font size so they always match.
  // Whichever one needed more shrinking sets the size for both.
  if (resolvedNameFontSizes.firstName !== undefined && resolvedNameFontSizes.lastName !== undefined) {
    const minFs = Math.min(resolvedNameFontSizes.firstName, resolvedNameFontSizes.lastName);
    for (const nameKey of ["firstName", "lastName"] as const) {
      if (resolvedNameFontSizes[nameKey] !== minFs) {
        const el = elementRefs.current[nameKey] as fabric.Textbox | undefined;
        if (el) {
          el.set({ fontSize: minFs });
          el.initDimensions();
          el.setCoords();
        }
        resolvedNameFontSizes[nameKey] = minFs;
      }
    }
  }

  // Notify the toolbar of any font sizes that were auto-shrunk away from their config value.
  if (onFontSizeResolved) {
    const updates: Record<string, number> = {};
    for (const [k, fs] of Object.entries(resolvedNameFontSizes)) {
      if (config[k]?.fontSize !== fs) {
        updates[k] = fs;
      }
    }
    if (Object.keys(updates).length > 0) {
      onFontSizeResolved(updates);
    }
  }

  canvas.renderAll();
}

export default {};
