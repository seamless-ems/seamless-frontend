import { fabric } from "fabric";
import type React from "react";
import type { AlignDirection } from "@/lib/card-builder-utils";

type CreateCanvasParams = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  fabricCanvasRef: React.MutableRefObject<fabric.Canvas | null>;
  canvasWidth: number;
  canvasHeight: number;
  setSelectedElement: (k: string | null) => void;
  setMultiSelectActive: (v: boolean) => void;
  setMultiSelectedKeys: (ks: string[]) => void;
  setContextMenu: (c: { x: number; y: number; elementKey: string } | null) => void;
  headshotInputRef: React.RefObject<HTMLInputElement | null>;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  eventLogoInputRef: React.RefObject<HTMLInputElement | null>;
  createSnapLineUtil: (x1: number, y1: number, x2: number, y2: number) => any;
  clearLines: (canvas: fabric.Canvas, lines: any[]) => void;
  computeSnapMatches: (...args: any[]) => any;
  clampRectToCanvas: (...args: any[]) => any;
  setConfig: (fn: any) => void;
  setHasUnsavedChanges: (b: boolean) => void;
  addToHistory: (cfg: any) => void;
  elementRefs: React.MutableRefObject<{ [key: string]: fabric.Object }>;
  /** Called once the Fabric canvas is fully initialised and ready to render. */
  onReady?: () => void;
};

export const createFabricCanvas = (params: CreateCanvasParams) => {
  const {
    canvasRef,
    fabricCanvasRef,
    canvasWidth,
    canvasHeight,
    setSelectedElement,
    setMultiSelectActive,
    setMultiSelectedKeys,
    setContextMenu,
    headshotInputRef,
    logoInputRef,
    eventLogoInputRef,
    createSnapLineUtil,
    clearLines,
    computeSnapMatches,
    clampRectToCanvas,
    setConfig,
    setHasUnsavedChanges,
    addToHistory,
    elementRefs,
    onReady,
  } = params;

  // Only log init attempts the first time (reduce noisy repeated calls).
  if (!fabricCanvasRef.current) {
    try {
      console.warn("createFabricCanvas: init attempt", {
        canvasRefCurrent: !!canvasRef.current,
        fabricCanvasRefCurrent: !!fabricCanvasRef.current,
        stack: new Error().stack?.split("\n").slice(1, 6),
      });
    } catch (e) {
      // ignore
    }
  }

  if (!canvasRef.current || fabricCanvasRef.current) {
    if (!canvasRef.current) {
      console.warn("createFabricCanvas: no canvasRef.current - will retry");
    }
    return false;
  }
  // If the canvas DOM node isn't connected to the document (e.g., Shadow DOM
  // portal hasn't attached yet), don't create the Fabric instance — signal
  // caller to retry by returning false.
  if (canvasRef.current && !(canvasRef.current.isConnected)) {
    try {
      const root = (canvasRef.current.getRootNode && canvasRef.current.getRootNode()) || null;
      console.warn("createFabricCanvas: canvas not connected", {
        isConnected: canvasRef.current.isConnected,
        rootType: root && root instanceof ShadowRoot ? "ShadowRoot" : typeof root,
        parent: canvasRef.current.parentElement?.tagName,
      });
    } catch (e) {
      // ignore
    }
    return false;
  }

  const canvas = new fabric.Canvas(canvasRef.current, {
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor: "#ffffff",
    selection: true,
    preserveObjectStacking: true,
    enableRetinaScaling: true,
    renderOnAddRemove: false,
  });
  // Start a short async poll to ensure Fabric's internal `lowerCanvasEl` is
  // present and has a usable 2D context before we expose the instance to
  // consumers. This prevents other code paths from seeing a partially
  // initialized Fabric instance and calling drawing APIs too early.
  (canvas as any).__seamless_ready = false;
  let attempts = 0;
  const maxAttempts = 40; // ~2s at 50ms
  const iv = window.setInterval(() => {
    attempts++;
    try {
      const lower = (canvas as any).lowerCanvasEl;
      let ctx: CanvasRenderingContext2D | null = null;
      if (lower && typeof lower.getContext === "function") {
        try {
          ctx = lower.getContext("2d");
        } catch (e) {
          ctx = null;
        }
      }
      // only mark ready if lower exists, is connected, and has a 2D context
      if (lower && lower.isConnected && ctx) {
        (canvas as any).__seamless_ready = true;
        fabricCanvasRef.current = canvas;
        console.debug("createFabricCanvas: readiness confirmed", { attempts, lowerCanvasEl: lower });
        onReady?.();
        clearInterval(iv);
      } else if (attempts >= maxAttempts) {
        console.warn("createFabricCanvas: readiness not confirmed after retries", { attempts, lowerExists: !!lower, lowerIsConnected: !!(lower && lower.isConnected) });
        try {
          canvas.dispose();
        } catch (e) {}
        clearInterval(iv);
      }
    } catch (e) {
      if (attempts >= maxAttempts) {
        try {
          canvas.dispose();
        } catch (er) {}
        clearInterval(iv);
      }
    }
  }, 50);

  // If the instance is ready synchronously (rare), set smoothing now. If not
  // ready yet, the interval above will have set `fabricCanvasRef.current`
  // and `__seamless_ready` once the lower canvas is available.
  const ctx = (canvas as any).getContext ? (canvas as any).getContext() : null;
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = "high";
  }

  fabric.Object.prototype.cornerSize = 8;
  fabric.Object.prototype.cornerStyle = "circle";
  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.cornerColor = "#ffffff";
  fabric.Object.prototype.cornerStrokeColor = "#4F9CFB";
  fabric.Object.prototype.borderColor = "#4F9CFB";
  fabric.Object.prototype.borderScaleFactor = 1;
  fabric.Object.prototype.padding = 6;

  canvas.selectionColor = "rgba(79,156,251,0.08)";
  canvas.selectionBorderColor = "#4F9CFB";
  canvas.selectionLineWidth = 1;

  canvas.on("selection:created", (e: any) => {
    const all = canvas.getActiveObjects();
    if (all.length > 1) {
      setSelectedElement(null);
      setMultiSelectActive(true);
      setMultiSelectedKeys(all.map((o: any) => o.data?.elementKey).filter(Boolean));
    } else {
      const obj = e.selected?.[0];
      if (obj?.data?.elementKey) setSelectedElement(obj.data.elementKey);
      setMultiSelectActive(false);
      setMultiSelectedKeys([]);
    }
  });

  canvas.on("selection:updated", (e: any) => {
    const all = canvas.getActiveObjects();
    if (all.length > 1) {
      setSelectedElement(null);
      setMultiSelectActive(true);
      setMultiSelectedKeys(all.map((o: any) => o.data?.elementKey).filter(Boolean));
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

  canvas.on("mouse:down", (e: any) => {
    setContextMenu(null);
    if (!e.target) {
      setSelectedElement(null);
      setMultiSelectActive(false);
      setMultiSelectedKeys([]);
    }
  });

  canvas.on("mouse:dblclick", (e: any) => {
    if (e.target?.data?.elementKey === "headshot") {
      headshotInputRef.current?.click();
    } else if (e.target?.data?.elementKey === "companyLogo") {
      logoInputRef.current?.click();
    } else if (e.target?.data?.elementKey === "eventLogo") {
      eventLogoInputRef.current?.click();
    }
  });

  let alignmentLines: fabric.Line[] = [];
  let snapClearTimer: number | null = null;
  const SNAP_THRESHOLD = 16;
  const SNAP_RELEASE = 22;
  let snapLockedX: number | null = null;
  let snapLockedY: number | null = null;

  const createSnapLine = (x1: number, y1: number, x2: number, y2: number) =>
    createSnapLineUtil(x1, y1, x2, y2);

  const clearSnapLines = () => {
    clearLines(canvas, alignmentLines);
    alignmentLines = [];
    canvas.renderAll();
  };

  canvas.on("object:moving", (e: any) => {
    const obj = e.target;
    if (!obj) return;

    if (snapClearTimer) {
      clearTimeout(snapClearTimer);
      snapClearTimer = null;
    }
    clearSnapLines();

    const b = obj.getBoundingRect();
    const oL = b.left,
      oT = b.top,
      oR = b.left + b.width,
      oB = b.top + b.height;
    const oCX = oL + b.width / 2,
      oCY = oT + b.height / 2;
    const cW = canvas.width!,
      cH = canvas.height!;

    const others: any[] = [];
    canvas.forEachObject((other: any) => {
      if (other === obj || !other.data?.elementKey) return;
      const ob = other.getBoundingRect();
      others.push({ left: ob.left, top: ob.top, width: ob.width, height: ob.height, elementKey: other.data?.elementKey });
    });

    const { snapX, snapY } = computeSnapMatches({ left: b.left, top: b.top, width: b.width, height: b.height }, cW, cH, others, SNAP_THRESHOLD);

    if (snapX.length > 0) {
      snapX.sort((a: any, b: any) => a.dist - b.dist);
      const s = snapX[0];
      snapLockedX = s.pos;
      obj.set({ left: (obj.left || 0) + s.delta });
      obj.setCoords();
      alignmentLines.push(createSnapLine(s.pos, 0, s.pos, cH));
    } else if (snapLockedX !== null) {
      const distFromLock = Math.min(Math.abs(oL - snapLockedX), Math.abs(oR - snapLockedX), Math.abs(oCX - snapLockedX));
      if (distFromLock < SNAP_RELEASE) {
        const delta = snapLockedX - oL < 0 ? snapLockedX - oR : snapLockedX - oCX < 0 ? snapLockedX - oCX : snapLockedX - oL;
        obj.set({ left: (obj.left || 0) + delta });
        obj.setCoords();
        alignmentLines.push(createSnapLine(snapLockedX, 0, snapLockedX, cH));
      } else {
        snapLockedX = null;
      }
    }

    if (snapY.length > 0) {
      snapY.sort((a: any, b: any) => a.dist - b.dist);
      const s = snapY[0];
      snapLockedY = s.pos;
      obj.set({ top: (obj.top || 0) + s.delta });
      obj.setCoords();
      alignmentLines.push(createSnapLine(0, s.pos, cW, s.pos));
    } else if (snapLockedY !== null) {
      const distFromLock = Math.min(Math.abs(oT - snapLockedY), Math.abs(oB - snapLockedY), Math.abs(oCY - snapLockedY));
      if (distFromLock < SNAP_RELEASE) {
        const delta = snapLockedY - oT < 0 ? snapLockedY - oB : snapLockedY - oCY < 0 ? snapLockedY - oCY : snapLockedY - oT;
        obj.set({ top: (obj.top || 0) + delta });
        obj.setCoords();
        alignmentLines.push(createSnapLine(0, snapLockedY, cW, snapLockedY));
      } else {
        snapLockedY = null;
      }
    }

    {
      const SAFE_ZONE_H = 50;
      const cb = obj.getBoundingRect();
      const clamped = clampRectToCanvas({ left: cb.left, top: cb.top, width: cb.width, height: cb.height }, cW, cH, SAFE_ZONE_H);
      const deltaX = clamped.left - cb.left;
      const deltaY = clamped.top - cb.top;
      if (deltaX !== 0 || deltaY !== 0) {
        obj.set({ left: (obj.left || 0) + deltaX, top: (obj.top || 0) + deltaY });
        obj.setCoords();
      }
    }

    alignmentLines.forEach((l) => canvas.add(l));
    canvas.renderAll();
  });

  canvas.on("after:render", () => {
    const ctx = canvas.getContext() as CanvasRenderingContext2D | null;
    if (!ctx) return;
    const cH = canvas.getHeight();
    const cW = canvas.getWidth();
    // Use viewport zoom so the safe zone line stays fixed at the same content
    // position (50px from the bottom of the card) regardless of zoom level.
    const zoom = ((canvas as any).viewportTransform?.[0] as number) || 1;
    const safeY = cH - 50 * zoom;
    ctx.save();
    ctx.strokeStyle = "rgba(79, 156, 251, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, safeY);
    ctx.lineTo(cW, safeY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "rgba(79, 156, 251, 0.7)";
    ctx.textAlign = "right";
    ctx.fillText("safe zone", cW - 6, safeY - 4);
    ctx.restore();
  });

  canvas.on("mouse:up", () => {
    snapLockedX = null;
    snapLockedY = null;
    if (snapClearTimer) clearTimeout(snapClearTimer);
    snapClearTimer = window.setTimeout(() => {
      clearSnapLines();
      snapClearTimer = null;
    }, 600);
  });

  canvas.on("object:modified", (e: any) => {
    if (snapClearTimer) clearTimeout(snapClearTimer);
    snapClearTimer = window.setTimeout(() => {
      clearSnapLines();
      snapClearTimer = null;
    }, 600);
  });

  canvas.on("object:modified", (e: any) => {
    const obj = e.target;
    if (obj?.data?.elementKey) {
      const elementKey = obj.data.elementKey;
      const updates: any = { x: obj.left || 0, y: obj.top || 0 };

      if (obj.type === "image") {
        if (elementKey === "headshot") {
          // Renderer uses cfg.size * cfg.scaleX for display size.
          // Storing raw Fabric scaleX here causes compounding shrink on every resize
          // (size * fabricScaleX = size * size/naturalW → far smaller each cycle).
          // Fix: normalise to size = actual displayed width, scaleX = scaleY = 1.
          updates.size = Math.round(obj.getScaledWidth());
          updates.scaleX = 1;
          updates.scaleY = 1;
        } else {
          // Normalise logo images same as headshot: store actual display size as
          // width/height and reset scale to 1. This keeps fit-to-zone behaviour
          // consistent across reloads (no compounding scale accumulation).
          updates.width = Math.round(obj.getScaledWidth());
          updates.height = Math.round(obj.getScaledHeight());
          updates.scaleX = 1;
          updates.scaleY = 1;
        }
      }

      if (obj.type === "group") {
        setConfig((prev: any) => {
          let elementUpdates: any;
          if (elementKey === "headshot") {
            // Renderer uses cfg.size; save size not width to prevent snap-back on re-render.
            // Mirrors the IMAGE case fix above.
            elementUpdates = { x: obj.left || 0, y: obj.top || 0, size: Math.round(obj.getScaledWidth()), scaleX: 1, scaleY: 1 };
          } else {
            elementUpdates = { x: obj.left || 0, y: obj.top || 0, width: Math.round(obj.getScaledWidth()), height: Math.round(obj.getScaledHeight()), scaleX: 1, scaleY: 1 };
          }
          const newConfig = { ...prev, [elementKey]: { ...prev[elementKey], ...elementUpdates } };
          setHasUnsavedChanges(true);
          addToHistory(newConfig);
          return newConfig;
        });
        return;
      }

      if (obj.type === "rect") {
        updates.width = Math.round((obj.width || 300) * (obj.scaleX || 1));
        updates.height = Math.round((obj.height || 300) * (obj.scaleY || 1));
      }

      if (obj.type === "textbox") {
        updates.width = obj.width || 300;
        updates.text = obj.text ?? "";
      }

      setHasUnsavedChanges(true);
      setConfig((prev: any) => {
        const newConfig = { ...prev, [elementKey]: { ...prev[elementKey], ...updates } };
        addToHistory(newConfig);
        return newConfig;
      });
    }
  });

  // Sync text content back to config when the user finishes editing a textbox in-place.
  // object:modified doesn't always fire after text-only edits, so this is the reliable hook.
  canvas.on("text:editing:exited", (e: any) => {
    const obj = e.target;
    const elementKey = obj?.data?.elementKey;
    if (!elementKey) return;
    setConfig((prev: any) => {
      if (!prev[elementKey]) return prev;
      const newConfig = { ...prev, [elementKey]: { ...prev[elementKey], text: obj.text ?? "" } };
      addToHistory(newConfig);
      return newConfig;
    });
    setHasUnsavedChanges(true);
  });

  return true;
};

export default {};
