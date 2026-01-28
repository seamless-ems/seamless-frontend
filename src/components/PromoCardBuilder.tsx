import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  Save,
  Upload,
  X,
  Download,
  ChevronDown,
  Trash2,
  Eye,
  EyeOff,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  MoveUp,
  MoveDown,
  Layers,
  Undo2,
  Redo2,
  Plus,
  ImageIcon,
  Type,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { fabric } from "fabric";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { toast } from "@/hooks/use-toast";

// Default test data - users upload their own headshot and logo
const DEFAULT_TEST_DATA = {
  firstName: "Yakko",
  lastName: "Warner",
  title: "Chief Entertainment Officer",
  company: "ACME Inc",
  headshot: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yakko",
  companyLogo: "https://api.dicebear.com/7.x/icons/svg?seed=acme",
  linkedin: "linkedin.com/in/yakkowarner",
};

// Element templates (not added to canvas by default)
// NOTE: Images (headshot, logo) are DROP ZONES - they define WHERE content goes, not WHAT content
const ELEMENT_TEMPLATES = {
  headshot: {
    label: "Headshot",
    type: "image-dropzone", // This is a placeholder for speaker's headshot
    x: 50,
    y: 50,
    size: 80,
    shape: "circle", // circle, square, horizontal, vertical
    visible: true,
    opacity: 1,
    zIndex: 1,
  },
  name: {
    label: "Name",
    x: 150,
    y: 50,
    fontSize: 32,
    fontFamily: "Inter",
    color: "#000000",
    fontWeight: 700,
    visible: true,
    textAlign: "left",
    width: 300,
    zIndex: 2,
  },
  title: {
    label: "Title",
    x: 150,
    y: 90,
    fontSize: 20,
    fontFamily: "Inter",
    color: "#000000",
    fontWeight: 500,
    visible: true,
    textAlign: "left",
    width: 300,
    zIndex: 3,
  },
  company: {
    label: "Company",
    x: 150,
    y: 115,
    fontSize: 18,
    fontFamily: "Inter",
    color: "#000000",
    fontWeight: 400,
    visible: true,
    textAlign: "left",
    width: 300,
    zIndex: 4,
  },
  companyLogo: {
    label: "Company Logo",
    type: "image-dropzone", // This is a placeholder for company logo
    x: 50,
    y: 150,
    size: 60,
    shape: "square",
    visible: true,
    opacity: 1,
    zIndex: 5,
  },
  linkedin: {
    label: "LinkedIn Button",
    x: 150,
    y: 145,
    visible: true,
    bgColor: "#0A66C2",
    zIndex: 6,
  },
};

// Start with empty canvas
const DEFAULT_CONFIG: CardConfig = {};

const GOOGLE_FONTS = [
  // Modern Sans-Serif
  "Inter",
  "Poppins",
  "Work Sans",
  "Plus Jakarta Sans",
  "Outfit",
  "Sora",
  "Manrope",

  // Classic Sans-Serif
  "Roboto",
  "Open Sans",
  "Lato",
  "Raleway",
  "Nunito",
  "Source Sans Pro",

  // Geometric/Display
  "Montserrat",
  "Quicksand",
  "Dosis",
  "Josefin Sans",
  "Cabinet Grotesk",
  "Space Grotesk",

  // Serif (Elegant)
  "Playfair Display",
  "Libre Baskerville",
  "Merriweather",
  "Lora",
];

interface ElementConfig {
  [key: string]: any;
}

interface CardConfig {
  [key: string]: ElementConfig;
}

interface AlignmentGuide {
  x?: number;
  y?: number;
  type: "left" | "center" | "right" | "top" | "middle" | "bottom";
}

export default function PromoCardBuilder({ eventId }: { eventId?: string }) {
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);

  // Debug logging for config changes
  useEffect(() => {
    console.log("📊 Config state changed:", {
      numElements: Object.keys(config).length,
      elements: Object.keys(config),
      config: config
    });
  }, [config]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedElements, setSelectedElements] = useState<string[]>([]); // For multi-select
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [backgroundZIndex, setBackgroundZIndex] = useState<number>(0); // 0 = bottom, higher = on top

  // TEST IMAGES - These are NOT part of the template config
  // They're just for previewing what the layout will look like with content
  const [testHeadshot, setTestHeadshot] = useState<string | null>(null);
  const [testLogo, setTestLogo] = useState<string | null>(null);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropMode, setCropMode] = useState<"headshot" | "logo" | "template" | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string>("");
  const [templateIsGif, setTemplateIsGif] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [history, setHistory] = useState<CardConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const elementRefs = useRef<{ [key: string]: fabric.Object }>({});
  const guideLineRefs = useRef<fabric.Line[]>([]);
  const [zoom, setZoom] = useState(1);
  const [renderKey, setRenderKey] = useState(0); // Force re-render when needed
  const isUpdatingFromCanvas = useRef(false); // Prevent render loops when syncing from canvas
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isRendering = useRef(false); // Prevent concurrent renders

  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const SNAP_THRESHOLD = 8;

  // Initialize Fabric canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: "#ffffff",
        selection: true,
        preserveObjectStacking: true,
        // Enable multi-select with click (not just drag-box)
        selectionKey: 'shiftKey', // Hold shift to add to selection
      });

      // Clear guide lines helper
      const clearGuideLines = () => {
        guideLineRefs.current.forEach(line => canvas.remove(line));
        guideLineRefs.current = [];
      };

      // Draw guide line helper
      const drawGuideLine = (
        x1: number,
        y1: number,
        x2: number,
        y2: number
      ) => {
        const line = new fabric.Line([x1, y1, x2, y2], {
          stroke: "#ff4081",
          strokeWidth: 1,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
        });
        canvas.add(line);
        guideLineRefs.current.push(line);
      };

      // Enhanced snapping with alignment guidelines
      canvas.on("object:moving", (e) => {
        const obj = e.target;
        if (!obj) return;

        clearGuideLines();

        const objLeft = obj.left!;
        const objTop = obj.top!;
        const objWidth = obj.width! * obj.scaleX!;
        const objHeight = obj.height! * obj.scaleY!;
        const objRight = objLeft + objWidth;
        const objBottom = objTop + objHeight;
        const objCenterX = objLeft + objWidth / 2;
        const objCenterY = objTop + objHeight / 2;

        let snappedX = false;
        let snappedY = false;

        // Snap to canvas edges
        if (Math.abs(objLeft) < SNAP_THRESHOLD) {
          obj.left = 0;
          drawGuideLine(0, 0, 0, canvasHeight);
          snappedX = true;
        }
        if (Math.abs(objRight - canvasWidth) < SNAP_THRESHOLD) {
          obj.left = canvasWidth - objWidth;
          drawGuideLine(canvasWidth, 0, canvasWidth, canvasHeight);
          snappedX = true;
        }
        if (Math.abs(objCenterX - canvasWidth / 2) < SNAP_THRESHOLD) {
          obj.left = canvasWidth / 2 - objWidth / 2;
          drawGuideLine(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);
          snappedX = true;
        }

        if (Math.abs(objTop) < SNAP_THRESHOLD) {
          obj.top = 0;
          drawGuideLine(0, 0, canvasWidth, 0);
          snappedY = true;
        }
        if (Math.abs(objBottom - canvasHeight) < SNAP_THRESHOLD) {
          obj.top = canvasHeight - objHeight;
          drawGuideLine(0, canvasHeight, canvasWidth, canvasHeight);
          snappedY = true;
        }
        if (Math.abs(objCenterY - canvasHeight / 2) < SNAP_THRESHOLD) {
          obj.top = canvasHeight / 2 - objHeight / 2;
          drawGuideLine(0, canvasHeight / 2, canvasWidth, canvasHeight / 2);
          snappedY = true;
        }

        // Snap to other objects
        canvas.forEachObject((target) => {
          if (target === obj || !target.visible || target === guideLineRefs.current.find(l => l === target)) return;

          const targetLeft = target.left!;
          const targetTop = target.top!;
          const targetWidth = target.width! * target.scaleX!;
          const targetHeight = target.height! * target.scaleY!;
          const targetRight = targetLeft + targetWidth;
          const targetBottom = targetTop + targetHeight;
          const targetCenterX = targetLeft + targetWidth / 2;
          const targetCenterY = targetTop + targetHeight / 2;

          // Snap left edges
          if (!snappedX && Math.abs(objLeft - targetLeft) < SNAP_THRESHOLD) {
            obj.left = targetLeft;
            drawGuideLine(targetLeft, 0, targetLeft, canvasHeight);
            snappedX = true;
          }
          // Snap right edges
          if (!snappedX && Math.abs(objRight - targetRight) < SNAP_THRESHOLD) {
            obj.left = targetRight - objWidth;
            drawGuideLine(targetRight, 0, targetRight, canvasHeight);
            snappedX = true;
          }
          // Snap left to right
          if (!snappedX && Math.abs(objLeft - targetRight) < SNAP_THRESHOLD) {
            obj.left = targetRight;
            drawGuideLine(targetRight, 0, targetRight, canvasHeight);
            snappedX = true;
          }
          // Snap right to left
          if (!snappedX && Math.abs(objRight - targetLeft) < SNAP_THRESHOLD) {
            obj.left = targetLeft - objWidth;
            drawGuideLine(targetLeft, 0, targetLeft, canvasHeight);
            snappedX = true;
          }
          // Snap horizontal centers
          if (!snappedX && Math.abs(objCenterX - targetCenterX) < SNAP_THRESHOLD) {
            obj.left = targetCenterX - objWidth / 2;
            drawGuideLine(targetCenterX, 0, targetCenterX, canvasHeight);
            snappedX = true;
          }

          // Snap top edges
          if (!snappedY && Math.abs(objTop - targetTop) < SNAP_THRESHOLD) {
            obj.top = targetTop;
            drawGuideLine(0, targetTop, canvasWidth, targetTop);
            snappedY = true;
          }
          // Snap bottom edges
          if (!snappedY && Math.abs(objBottom - targetBottom) < SNAP_THRESHOLD) {
            obj.top = targetBottom - objHeight;
            drawGuideLine(0, targetBottom, canvasWidth, targetBottom);
            snappedY = true;
          }
          // Snap top to bottom
          if (!snappedY && Math.abs(objTop - targetBottom) < SNAP_THRESHOLD) {
            obj.top = targetBottom;
            drawGuideLine(0, targetBottom, canvasWidth, targetBottom);
            snappedY = true;
          }
          // Snap bottom to top
          if (!snappedY && Math.abs(objBottom - targetTop) < SNAP_THRESHOLD) {
            obj.top = targetTop - objHeight;
            drawGuideLine(0, targetTop, canvasWidth, targetTop);
            snappedY = true;
          }
          // Snap vertical centers
          if (!snappedY && Math.abs(objCenterY - targetCenterY) < SNAP_THRESHOLD) {
            obj.top = targetCenterY - objHeight / 2;
            drawGuideLine(0, targetCenterY, canvasWidth, targetCenterY);
            snappedY = true;
          }
        });

        canvas.renderAll();
      });

      canvas.on("object:modified", (e) => {
        clearGuideLines();

        // Update config silently without triggering re-render
        const obj = e.target;
        if (obj && obj.data?.elementKey) {
          const key = obj.data.elementKey;
          isUpdatingFromCanvas.current = true;
          setConfig(prev => {
            const updated = { ...prev };
            if (updated[key]) {
              const newProps: any = {
                ...updated[key],
                x: Math.round(obj.left || 0),
                y: Math.round(obj.top || 0),
              };

              // Update size for image elements (headshot, logo)
              if (obj instanceof fabric.Image && (key === "headshot" || key === "companyLogo")) {
                const scaledWidth = (obj.width || 0) * (obj.scaleX || 1);
                const scaledHeight = (obj.height || 0) * (obj.scaleY || 1);
                // For square/circle images, use the average as size
                newProps.size = Math.round((scaledWidth + scaledHeight) / 2);
              }

              updated[key] = newProps;
            }
            addToHistory(updated);
            return updated;
          });
          // Reset flag after a short delay to ensure state update completes
          setTimeout(() => { isUpdatingFromCanvas.current = false; }, 0);
        }

        setHasUnsavedChanges(true);
      });

      canvas.on("mouse:up", (e) => {
        clearGuideLines();
        // Keep selection after dragging/modifying
        // Only deselect if clicking on empty canvas
        if (!e.target) {
          canvas.discardActiveObject();
          canvas.renderAll();
          setSelectedElement(null);
        }
      });

      // Track selection changes
      canvas.on("selection:created", (e) => {
        const selected = e.selected;
        if (selected && selected.length === 1 && selected[0].data?.elementKey) {
          setSelectedElement(selected[0].data.elementKey);
          setSelectedElements([selected[0].data.elementKey]);
        } else if (selected && selected.length > 1) {
          const keys = selected.filter(obj => obj.data?.elementKey).map(obj => obj.data.elementKey);
          setSelectedElement("multiple");
          setSelectedElements(keys);
        }
      });

      canvas.on("selection:updated", (e) => {
        const selected = e.selected;
        if (selected && selected.length === 1 && selected[0].data?.elementKey) {
          setSelectedElement(selected[0].data.elementKey);
          setSelectedElements([selected[0].data.elementKey]);
        } else if (selected && selected.length > 1) {
          const keys = selected.filter(obj => obj.data?.elementKey).map(obj => obj.data.elementKey);
          setSelectedElement("multiple");
          setSelectedElements(keys);
        }
      });

      canvas.on("selection:cleared", () => {
        setSelectedElement(null);
        setSelectedElements([]);
      });

      fabricCanvasRef.current = canvas;

      // Initial render
      renderAllElements();
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  // Sync config from canvas objects after user modifies them
  const syncConfigFromCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const newConfig = { ...config };

    canvas.forEachObject((obj) => {
      const key = obj.data?.elementKey;
      if (!key || !newConfig[key]) return;

      newConfig[key] = {
        ...newConfig[key],
        x: Math.round(obj.left || 0),
        y: Math.round(obj.top || 0),
        visible: obj.visible || false,
      };

      // Update type-specific properties
      if (obj instanceof fabric.Image) {
        newConfig[key].size = Math.round(obj.width! * obj.scaleX!);
        newConfig[key].opacity = obj.opacity || 1;
      } else if (obj instanceof fabric.Textbox) {
        newConfig[key].width = Math.round(obj.width! * obj.scaleX!);
      }
    });

    setConfig(newConfig);
  };

  // Render all elements on canvas
  const renderAllElements = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Prevent concurrent renders that cause duplication
    if (isRendering.current) {
      return;
    }
    isRendering.current = true;

    canvas.clear();
    canvas.backgroundColor = backgroundColor;
    elementRefs.current = {};

    // Collect all elements including background template
    const allElements: Array<[string, any]> = [];

    // Add background template as an element if it exists
    if (templateUrl) {
      allElements.push(['_background', { zIndex: backgroundZIndex, isBackground: true }]);
    }

    // Add regular elements
    Object.entries(config).forEach(([key, cfg]) => {
      if (cfg.visible) {
        allElements.push([key, cfg]);
      }
    });

    // Sort all elements by zIndex
    const sortedElements = allElements.sort(
      ([, a], [, b]) => (a.zIndex || 0) - (b.zIndex || 0)
    );

    // Render all elements in z-order
    for (const [key, cfg] of sortedElements) {
      // Render background template
      if (key === '_background' && templateUrl) {
        try {
          const img = await loadImagePromise(templateUrl);
          const fabricImg = new fabric.Image(img, {
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
          });

          // Scale to fit canvas
          const scale = Math.min(canvasWidth / fabricImg.width!, canvasHeight / fabricImg.height!);
          fabricImg.scale(scale);

          canvas.add(fabricImg);
          elementRefs.current['_background'] = fabricImg;
        } catch (err) {
          console.error("Error loading template:", err);
        }
        continue;
      }

      // Skip if not visible or background (already handled)
      if (!cfg.visible || key === '_background') continue;

      if (key === "headshot") {
        try {
          // If there's a test image, use it; otherwise show placeholder
          const imageUrl = testHeadshot || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23e5e7eb' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='12'%3EHeadshot%3C/text%3E%3C/svg%3E";

          const img = await loadImagePromise(imageUrl);
          const shape = cfg.shape || "circle";

          const fabricImg = new fabric.Image(img, {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockRotation: true,
            // Lock uniform scaling for all shapes to maintain aspect ratios
            lockUniScaling: true,
            opacity: cfg.opacity,
            data: { elementKey: "headshot", shape: shape },
          });

          // Apply shape clipping and scaling

          if (shape === "circle") {
            // Circle: scale to size and clip to circle
            fabricImg.scaleToWidth(cfg.size);
            const radius = cfg.size / 2;
            fabricImg.clipPath = new fabric.Circle({
              radius: radius,
              originX: "center",
              originY: "center",
            });
            // For circles, hide middle controls - only show corner controls for uniform scaling
            fabricImg.setControlsVisibility({
              tl: true,  // top-left corner
              tr: true,  // top-right corner
              bl: true,  // bottom-left corner
              br: true,  // bottom-right corner
              ml: false, // middle-left - hide to prevent stretching
              mt: false, // middle-top - hide to prevent stretching
              mr: false, // middle-right - hide to prevent stretching
              mb: false, // middle-bottom - hide to prevent stretching
              mtr: false // rotation control
            });
          } else if (shape === "square") {
            // Square: 1:1 ratio
            fabricImg.scaleToWidth(cfg.size);
            // Crop to square by setting both dimensions
            const scale = cfg.size / Math.max(fabricImg.width!, fabricImg.height!);
            fabricImg.scaleX = scale;
            fabricImg.scaleY = scale;
            // Hide middle controls to prevent stretching - only show corners
            fabricImg.setControlsVisibility({
              tl: true,  // top-left corner
              tr: true,  // top-right corner
              bl: true,  // bottom-left corner
              br: true,  // bottom-right corner
              ml: false, // middle-left - hide to prevent stretching
              mt: false, // middle-top - hide to prevent stretching
              mr: false, // middle-right - hide to prevent stretching
              mb: false, // middle-bottom - hide to prevent stretching
              mtr: false // rotation control
            });
          } else if (shape === "horizontal") {
            // Horizontal rectangle: 1.6:1 ratio (wide)
            const targetWidth = cfg.size * 1.6;
            const targetHeight = cfg.size;
            // Scale to cover the area
            const scaleX = targetWidth / fabricImg.width!;
            const scaleY = targetHeight / fabricImg.height!;
            const scale = Math.max(scaleX, scaleY); // Cover the area
            fabricImg.scaleX = scale;
            fabricImg.scaleY = scale;
            // Clip to rectangle
            fabricImg.clipPath = new fabric.Rect({
              width: targetWidth / scale,
              height: targetHeight / scale,
              originX: "center",
              originY: "center",
            });
            // Hide middle controls to prevent stretching - only show corners
            fabricImg.setControlsVisibility({
              tl: true,  // top-left corner
              tr: true,  // top-right corner
              bl: true,  // bottom-left corner
              br: true,  // bottom-right corner
              ml: false, // middle-left - hide to prevent stretching
              mt: false, // middle-top - hide to prevent stretching
              mr: false, // middle-right - hide to prevent stretching
              mb: false, // middle-bottom - hide to prevent stretching
              mtr: false // rotation control
            });
          } else if (shape === "vertical") {
            // Vertical rectangle: 1:1.6 ratio (tall)
            const targetWidth = cfg.size;
            const targetHeight = cfg.size * 1.6;
            // Scale to cover the area
            const scaleX = targetWidth / fabricImg.width!;
            const scaleY = targetHeight / fabricImg.height!;
            const scale = Math.max(scaleX, scaleY); // Cover the area
            fabricImg.scaleX = scale;
            fabricImg.scaleY = scale;
            // Clip to rectangle
            fabricImg.clipPath = new fabric.Rect({
              width: targetWidth / scale,
              height: targetHeight / scale,
              originX: "center",
              originY: "center",
            });
            // Hide middle controls to prevent stretching - only show corners
            fabricImg.setControlsVisibility({
              tl: true,  // top-left corner
              tr: true,  // top-right corner
              bl: true,  // bottom-left corner
              br: true,  // bottom-right corner
              ml: false, // middle-left - hide to prevent stretching
              mt: false, // middle-top - hide to prevent stretching
              mr: false, // middle-right - hide to prevent stretching
              mb: false, // middle-bottom - hide to prevent stretching
              mtr: false // rotation control
            });
          }

          canvas.add(fabricImg);
          elementRefs.current.headshot = fabricImg;
        } catch (err) {
          console.error("Error loading headshot:", err);
        }
      } else if (key === "name" || key === "title" || key === "company") {
        const text = key === "name"
          ? `${DEFAULT_TEST_DATA.firstName} ${DEFAULT_TEST_DATA.lastName}`
          : DEFAULT_TEST_DATA[key as keyof typeof DEFAULT_TEST_DATA];

        const textbox = new fabric.Textbox(text, {
          left: cfg.x,
          top: cfg.y,
          width: cfg.width,
          fontSize: cfg.fontSize,
          fontFamily: cfg.fontFamily,
          fontWeight: cfg.fontWeight,
          fill: cfg.color,
          textAlign: cfg.textAlign,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          data: { elementKey: key },
        });

        canvas.add(textbox);
        elementRefs.current[key] = textbox;
      } else if (key === "companyLogo") {
        try {
          // If there's a test image, use it; otherwise show placeholder
          const imageUrl = testLogo || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23e5e7eb' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='12'%3ELogo%3C/text%3E%3C/svg%3E";

          const img = await loadImagePromise(imageUrl);
          const fabricImg = new fabric.Image(img, {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockRotation: true,
            lockUniScaling: false, // Allow free resizing - defines "safe space" bounding box
            opacity: cfg.opacity,
            data: { elementKey: "companyLogo" },
          });

          // Scale logo to FIT within the bounding box (maintain aspect ratio)
          // This is the initial fit - user can resize bounding box freely
          const scaleX = cfg.size / fabricImg.width!;
          const scaleY = cfg.size / fabricImg.height!;
          const scale = Math.min(scaleX, scaleY); // Fit (contain) within box
          fabricImg.scaleX = scale;
          fabricImg.scaleY = scale;

          canvas.add(fabricImg);
          elementRefs.current.companyLogo = fabricImg;
        } catch (err) {
          console.error("Error loading logo:", err);
        }
      } else if (key === "linkedin") {
        const rect = new fabric.Rect({
          width: 35,
          height: 35,
          fill: cfg.bgColor,
          rx: 4,
          ry: 4,
        });

        const text = new fabric.Text("in", {
          fontSize: 14,
          fontWeight: "bold",
          fill: "#ffffff",
          fontFamily: "Inter",
          originX: "center",
          originY: "center",
          left: 17.5,
          top: 17.5,
        });

        const group = new fabric.Group([rect, text], {
          left: cfg.x,
          top: cfg.y,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          data: { elementKey: "linkedin" },
        });

        canvas.add(group);
        elementRefs.current.linkedin = group;
      }
    }

    canvas.renderAll();
    isRendering.current = false; // Allow next render
  };

  // Helper to load images as promises
  const loadImagePromise = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  // Update canvas dimensions when they change
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({
        width: canvasWidth,
        height: canvasHeight
      });
      fabricCanvasRef.current.renderAll();
    }
  }, [canvasWidth, canvasHeight]);

  // Re-render canvas when config, images, or render key changes
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    // Skip render if config was updated from canvas interaction (already up to date)
    if (isUpdatingFromCanvas.current) {
      return;
    }
    renderAllElements();
  }, [config, renderKey, testHeadshot, testLogo, templateUrl, backgroundColor]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [config, templateUrl, testHeadshot, testLogo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo (Ctrl/Cmd + Z/Y)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (!selectedElement || selectedElement === "multiple") return;

      // Delete key
      if (e.key === "Delete") {
        e.preventDefault();
        updateElement(selectedElement, { visible: false });
        setSelectedElement(null);
      }

      // Escape - deselect
      if (e.key === "Escape") {
        fabricCanvasRef.current?.discardActiveObject();
        fabricCanvasRef.current?.renderAll();
        setSelectedElement(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElement, historyIndex, history]);

  const updateElement = (element: string, updates: any) => {
    // Check if we need a full re-render (shape changes, visibility) or can update directly
    const needsRerender = updates.shape !== undefined || updates.visible !== undefined;

    if (!needsRerender) {
      // Update Fabric object directly to preserve selection
      const fabricObj = elementRefs.current[element];
      if (fabricObj) {
        if (updates.fontSize !== undefined && fabricObj instanceof fabric.Textbox) {
          fabricObj.set('fontSize', updates.fontSize);
        }
        if (updates.fontWeight !== undefined && fabricObj instanceof fabric.Textbox) {
          fabricObj.set('fontWeight', updates.fontWeight);
        }
        if (updates.color !== undefined && fabricObj instanceof fabric.Textbox) {
          fabricObj.set('fill', updates.color);
        }
        if (updates.textAlign !== undefined && fabricObj instanceof fabric.Textbox) {
          fabricObj.set('textAlign', updates.textAlign);
        }
        if (updates.width !== undefined && fabricObj instanceof fabric.Textbox) {
          fabricObj.set('width', updates.width);
        }
        if (updates.opacity !== undefined) {
          fabricObj.set('opacity', updates.opacity);
        }
        if (updates.size !== undefined && fabricObj instanceof fabric.Image) {
          const scale = updates.size / Math.max(fabricObj.width || 1, fabricObj.height || 1);
          fabricObj.scale(scale);
        }
        if (updates.x !== undefined) {
          fabricObj.set('left', updates.x);
        }
        if (updates.y !== undefined) {
          fabricObj.set('top', updates.y);
        }
        fabricObj.setCoords();
      }
      fabricCanvasRef.current?.renderAll();
    }

    // Update config state
    isUpdatingFromCanvas.current = !needsRerender;
    setConfig(prev => {
      const newConfig = {
        ...prev,
        [element]: { ...prev[element], ...updates },
      };
      addToHistory(newConfig);
      return newConfig;
    });

    if (needsRerender) {
      // Force re-render for shape/visibility changes
      setTimeout(() => setRenderKey(k => k + 1), 10);
    } else {
      setTimeout(() => { isUpdatingFromCanvas.current = false; }, 0);
    }

    setHasUnsavedChanges(true);
  };

  // Batch update multiple elements (for multi-select)
  const updateElements = (elements: string[], updates: any) => {
    // Update Fabric objects directly to preserve selection
    elements.forEach(elementKey => {
      const fabricObj = elementRefs.current[elementKey];
      if (fabricObj) {
        if (updates.fontSize !== undefined && fabricObj instanceof fabric.Textbox) {
          fabricObj.set('fontSize', updates.fontSize);
        }
        if (updates.fontWeight !== undefined && fabricObj instanceof fabric.Textbox) {
          fabricObj.set('fontWeight', updates.fontWeight);
        }
        if (updates.color !== undefined && fabricObj instanceof fabric.Textbox) {
          fabricObj.set('fill', updates.color);
        }
        if (updates.opacity !== undefined) {
          fabricObj.set('opacity', updates.opacity);
        }
      }
    });

    fabricCanvasRef.current?.renderAll();

    // Update config state without triggering re-render
    isUpdatingFromCanvas.current = true;
    setConfig(prev => {
      const newConfig = { ...prev };
      elements.forEach(element => {
        if (newConfig[element]) {
          newConfig[element] = { ...newConfig[element], ...updates };
        }
      });
      addToHistory(newConfig);
      return newConfig;
    });
    setTimeout(() => { isUpdatingFromCanvas.current = false; }, 0);

    setHasUnsavedChanges(true);
  };

  const addToHistory = (newConfig: CardConfig) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newConfig)));
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const addElementToCanvas = (elementKey: string, dropX?: number, dropY?: number) => {
    const template = ELEMENT_TEMPLATES[elementKey as keyof typeof ELEMENT_TEMPLATES];
    if (!template) return;

    // If dropX/dropY provided (from drag-and-drop), use them; otherwise center
    let posX: number;
    let posY: number;

    if (dropX !== undefined && dropY !== undefined) {
      // Use drop position (already accounting for element size centering)
      posX = dropX;
      posY = dropY;
    } else {
      // Center new elements - handle different element types
      if (template.size) {
        // Image elements (headshot, logo)
        posX = canvasWidth / 2 - template.size / 2;
        posY = canvasHeight / 2 - template.size / 2;
      } else if (template.width) {
        // Text elements
        posX = canvasWidth / 2 - template.width / 2;
        posY = canvasHeight / 2 - 10; // Approximate text height
      } else {
        // LinkedIn button or other
        posX = canvasWidth / 2 - 17; // Half of 35px button width
        posY = canvasHeight / 2 - 17;
      }
    }

    // Use functional setState to avoid stale closure
    setConfig(prevConfig => {
      const maxZ = Math.max(0, ...Object.values(prevConfig).map(c => c.zIndex || 0));

      const newElement = {
        ...template,
        zIndex: maxZ + 1,
        x: posX,
        y: posY,
      };

      const newConfig = {
        ...prevConfig,
        [elementKey]: newElement,
      };

      addToHistory(newConfig);
      return newConfig;
    });

    // Force re-render after adding element
    setTimeout(() => setRenderKey(k => k + 1), 10);

    toast({
      title: "Element added",
      description: `${template.label} has been added to the canvas.`,
    });
  };

  const moveLayerUp = (element: string) => {
    const elements = Object.keys(config);
    const currentIndex = elements.findIndex(k => k === element);
    if (currentIndex < elements.length - 1) {
      const currentZ = config[element].zIndex || 0;
      const nextElement = elements[currentIndex + 1];
      const nextZ = config[nextElement].zIndex || 0;

      setConfig(prev => {
        const newConfig = {
          ...prev,
          [element]: { ...prev[element], zIndex: nextZ },
          [nextElement]: { ...prev[nextElement], zIndex: currentZ },
        };
        addToHistory(newConfig);
        return newConfig;
      });

      // Force canvas re-render to update z-order
      setTimeout(() => setRenderKey(k => k + 1), 10);
      setHasUnsavedChanges(true);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, elementKey: string) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", elementKey);
    setDraggingElement(elementKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const elementKey = e.dataTransfer.getData("text/plain");

    if (!elementKey || config[elementKey]) {
      setDraggingElement(null);
      return; // Element already added
    }

    const canvas = fabricCanvasRef.current;
    const canvasContainer = canvasContainerRef.current;
    if (!canvas || !canvasContainer) return;

    // Get canvas bounding rect
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();

    // Calculate position relative to canvas (accounting for zoom)
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Center the element at drop position
    const template = ELEMENT_TEMPLATES[elementKey as keyof typeof ELEMENT_TEMPLATES];
    let adjustedX = x;
    let adjustedY = y;

    if (template.size) {
      // Image elements - center at drop point
      adjustedX = x - template.size / 2;
      adjustedY = y - template.size / 2;
    } else if (template.width) {
      // Text elements - center at drop point
      adjustedX = x - template.width / 2;
      adjustedY = y - 10; // Approximate text height offset
    } else {
      // LinkedIn button
      adjustedX = x - 17;
      adjustedY = y - 17;
    }

    // Clamp to canvas bounds
    adjustedX = Math.max(0, Math.min(canvasWidth - (template.size || template.width || 35), adjustedX));
    adjustedY = Math.max(0, Math.min(canvasHeight - (template.size || 20), adjustedY));

    addElementToCanvas(elementKey, adjustedX, adjustedY);
    setDraggingElement(null);
  };

  const moveLayerDown = (element: string) => {
    const elements = Object.keys(config);
    const currentIndex = elements.findIndex(k => k === element);
    if (currentIndex > 0) {
      const currentZ = config[element].zIndex || 0;
      const prevElement = elements[currentIndex - 1];
      const prevZ = config[prevElement].zIndex || 0;

      setConfig(prev => {
        const newConfig = {
          ...prev,
          [element]: { ...prev[element], zIndex: prevZ },
          [prevElement]: { ...prev[prevElement], zIndex: currentZ },
        };
        addToHistory(newConfig);
        return newConfig;
      });

      // Force canvas re-render to update z-order
      setTimeout(() => setRenderKey(k => k + 1), 10);
      setHasUnsavedChanges(true);
    }
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.1, 3);
    setZoom(newZoom);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom);
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.1, 0.1);
    setZoom(newZoom);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom);
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleZoomFit = () => {
    setZoom(1);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(1);
      fabricCanvasRef.current.renderAll();
    }
  };

  const alignSelected = (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Handle multiple selection (ActiveSelection)
    if (activeObject.type === "activeSelection") {
      const selection = activeObject as fabric.ActiveSelection;
      selection.forEachObject((obj) => {
        const objWidth = obj.width! * obj.scaleX!;
        const objHeight = obj.height! * obj.scaleY!;

        switch (alignment) {
          case "left":
            obj.set({ left: -selection.width! / 2 });
            break;
          case "center":
            obj.set({ left: 0 });
            break;
          case "right":
            obj.set({ left: selection.width! / 2 - objWidth });
            break;
          case "top":
            obj.set({ top: -selection.height! / 2 });
            break;
          case "middle":
            obj.set({ top: 0 });
            break;
          case "bottom":
            obj.set({ top: selection.height! / 2 - objHeight });
            break;
        }
        obj.setCoords();
      });
      canvas.renderAll();
    } else {
      // Single object selection
      const objWidth = activeObject.width! * activeObject.scaleX!;
      const objHeight = activeObject.height! * activeObject.scaleY!;

      switch (alignment) {
        case "left":
          activeObject.left = 0;
          break;
        case "center":
          activeObject.left = canvasWidth / 2 - objWidth / 2;
          break;
        case "right":
          activeObject.left = canvasWidth - objWidth;
          break;
        case "top":
          activeObject.top = 0;
          break;
        case "middle":
          activeObject.top = canvasHeight / 2 - objHeight / 2;
          break;
        case "bottom":
          activeObject.top = canvasHeight - objHeight;
          break;
      }

      activeObject.setCoords();
      canvas.renderAll();
    }

    syncConfigFromCanvas();
    setHasUnsavedChanges(true);
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");

      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        // Set canvas dimensions to match the uploaded image (useEffect will resize Fabric canvas)
        setCanvasWidth(img.width);
        setCanvasHeight(img.height);
        setTemplateIsGif(isGif);
        setTemplateUrl(url);
        toast({
          title: "Background uploaded",
          description: `Canvas resized to ${img.width}x${img.height}px to match your background.`,
        });
      };
      img.src = url;
    }
  };

  const handleRemoveTemplate = () => {
    if (templateUrl && templateUrl.startsWith("blob:")) {
      URL.revokeObjectURL(templateUrl);
    }
    setTemplateUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);

      if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
        setTestHeadshot(url);
        if (headshotInputRef.current) headshotInputRef.current.value = "";
        toast({
          title: "Headshot uploaded",
          description: "GIF animation will be preserved.",
        });
      } else {
        setCropImageUrl(url);
        setCropMode("headshot");
        setCropDialogOpen(true);
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);

      if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
        setTestLogo(url);
        if (logoInputRef.current) logoInputRef.current.value = "";
        toast({
          title: "Logo uploaded",
          description: "GIF animation will be preserved.",
        });
      } else {
        setCropImageUrl(url);
        setCropMode("logo");
        setCropDialogOpen(true);
      }
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const url = URL.createObjectURL(croppedBlob);

    if (cropMode === "headshot") {
      setTestHeadshot(url);
      if (headshotInputRef.current) headshotInputRef.current.value = "";
    } else if (cropMode === "logo") {
      setTestLogo(url);
      if (logoInputRef.current) logoInputRef.current.value = "";
    } else if (cropMode === "template") {
      setTemplateUrl(url);
      setTemplateIsGif(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    setCropDialogOpen(false);
    setCropMode(null);
  };

  const handleSaveConfiguration = () => {
    return new Promise<void>((resolvePromise) => {
      try {
        const convertBlobUrlToDataUrl = (blobUrl: string): Promise<string> => {
          return new Promise((resolve) => {
            if (!blobUrl.startsWith("blob:")) {
              resolve(blobUrl);
              return;
            }

            fetch(blobUrl)
              .then(res => res.blob())
              .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  resolve(reader.result as string);
                };
                reader.readAsDataURL(blob);
              })
              .catch(() => resolve(blobUrl));
          });
        };

        // Only save template background, NOT test images
        // Test images are just for preview - speakers will upload their own
        convertBlobUrlToDataUrl(templateUrl || "").then((template) => {
          const configData = {
            config, // This contains DROP ZONE positions/sizes, NOT image URLs
            templateUrl: template || null,
            backgroundColor: backgroundColor,
            backgroundZIndex: backgroundZIndex,
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            // Test images are intentionally NOT saved - they're preview only
            templateIsGif: templateIsGif,
            savedAt: new Date().toISOString(),
          };

          const storageKey = `promo-card-config-${eventId || "default"}`;
          localStorage.setItem(storageKey, JSON.stringify(configData));

          toast({
            title: "Configuration saved",
            description: "Your promo card layout has been saved successfully.",
          });
          setHasUnsavedChanges(false);
          resolvePromise();
        });
      } catch (err) {
        console.error("Error saving configuration:", err);
        toast({
          title: "Save failed",
          description: "There was an error saving your configuration.",
          variant: "destructive",
        });
        resolvePromise();
      }
    });
  };

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      const storageKey = `promo-card-config-${eventId || "default"}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const configData = JSON.parse(savedData);
        if (configData.config) {
          setConfig(configData.config);
          // Initialize history with loaded config
          setHistory([configData.config]);
          setHistoryIndex(0);
        }
        if (configData.templateUrl) {
          setTemplateUrl(configData.templateUrl);
        }
        if (configData.backgroundColor) {
          setBackgroundColor(configData.backgroundColor);
        }
        if (configData.backgroundZIndex !== undefined) {
          setBackgroundZIndex(configData.backgroundZIndex);
        }
        if (configData.canvasWidth) {
          setCanvasWidth(configData.canvasWidth);
        }
        if (configData.canvasHeight) {
          setCanvasHeight(configData.canvasHeight);
        }
        if (configData.templateIsGif !== undefined) {
          setTemplateIsGif(configData.templateIsGif);
        }
        // Legacy data: testHeadshot, testLogo, headshotCropShape are intentionally NOT loaded
        // Test images are preview-only and should not persist
      } else {
        // Initialize history with empty config
        setHistory([{}]);
        setHistoryIndex(0);
      }
    } catch (err) {
      console.error("Error loading configuration:", err);
      setHistory([{}]);
      setHistoryIndex(0);
    }
    setHasUnsavedChanges(false);
  }, [eventId]);

  const handleDownloadWithCheck = async () => {
    if (hasUnsavedChanges) {
      setShowDownloadConfirm(true);
    } else {
      await handleDownloadPNG();
    }
  };

  const handleDownloadPNG = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setShowDownloadConfirm(false);

    try {
      toast({
        title: "Generating image",
        description: "Please wait while we capture your promo card...",
      });

      // Export canvas as PNG
      const dataURL = canvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 2, // 2x resolution for better quality
      });

      // Download
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = `promo-card-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Downloaded",
        description: "Your promo card has been saved as PNG.",
      });
    } catch (err) {
      console.error("Error downloading PNG:", err);
      toast({
        title: "Download failed",
        description: "There was an error capturing your promo card.",
        variant: "destructive",
      });
    }
  };

  const selectedConfig = selectedElement ? config[selectedElement] : null;

  // Get layers sorted by zIndex
  const layersSorted = Object.entries(config).sort(
    ([, a], [, b]) => (b.zIndex || 0) - (a.zIndex || 0)
  );

  return (
    <div className="h-full w-full bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Promo Card Builder</h2>
        <div className="flex gap-2">
          <Button onClick={handleDownloadWithCheck} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Invite Collaborators
          </Button>
          <Button
            onClick={() => {
              const newConfig = {};
              setConfig(newConfig);
              addToHistory(newConfig);
              toast({
                title: "Canvas cleared",
                description: "All elements have been removed from the canvas.",
              });
            }}
            variant="outline"
            className="gap-2"
          >
            Clear Canvas
          </Button>
          <Button
            onClick={() => {
              const storageKey = `promo-card-config-${eventId || "default"}`;
              localStorage.removeItem(storageKey);
              window.location.reload();
            }}
            variant="outline"
            className="gap-2"
          >
            Clear Cache & Reload
          </Button>
          <Button onClick={handleSaveConfiguration} className="gap-2">
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] gap-4 h-[calc(100vh-180px)]">
        {/* Canvas - Left Side */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Canvas</CardTitle>
              <div className="flex gap-2 items-center">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 border border-border rounded-md p-1">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.1}
                    className="inline-flex items-center justify-center rounded h-6 w-6 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-mono min-w-[3rem] text-center">{(zoom * 100).toFixed(0)}%</span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="inline-flex items-center justify-center rounded h-6 w-6 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleZoomFit}
                    className="inline-flex items-center justify-center rounded h-6 w-6 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    title="Fit to View"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Undo/Redo Controls */}
                <div className="flex items-center gap-1 border border-border rounded-md p-1">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="inline-flex items-center justify-center rounded h-6 w-6 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="inline-flex items-center justify-center rounded h-6 w-6 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg relative p-4 min-h-0">
            <div
              ref={canvasContainerRef}
              className={`w-full h-full flex items-center justify-center ${zoom > 1 ? 'overflow-auto' : 'overflow-hidden'}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <canvas ref={canvasRef} className="border border-border shadow-sm" />
            </div>
            {Object.keys(config).length === 0 && fabricCanvasRef.current && fabricCanvasRef.current.getObjects().filter(obj => obj.data?.elementKey).length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center p-6 bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-sm max-w-sm">
                  <p className="text-sm font-medium mb-2">Empty Canvas</p>
                  <p className="text-xs text-muted-foreground">
                    Add elements from the panel to get started with your promo card design.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Middle Panel - Elements & Layers (Unified) */}
        <div className="space-y-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Elements & Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground italic mb-3">Add elements or manage existing layers</p>

              {/* Upload Background Template */}
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Background</span>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {templateUrl ? "Change Image" : "Upload Image"}
                </button>

                {!templateUrl && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Solid Color:</label>
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => {
                          setBackgroundColor(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        className="h-8 w-16 rounded border border-input cursor-pointer"
                      />
                      <span className="text-xs font-mono text-muted-foreground">{backgroundColor}</span>
                    </div>
                  </div>
                )}

                {templateUrl && (
                  <button
                    onClick={handleRemoveTemplate}
                    className="w-full mt-2 px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Remove Image
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleTemplateUpload}
                  className="hidden"
                />
              </div>

              {/* Headshot */}
              <div className="space-y-2">
                {!config.headshot ? (
                  <button
                    draggable
                    onDragStart={(e) => handleDragStart(e, "headshot")}
                    onClick={() => addElementToCanvas("headshot")}
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent flex items-center gap-2 cursor-move"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Drag or click to add Headshot
                  </button>
                ) : (
                  <>
                    <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                      selectedElement === "headshot"
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                    }`}>
                      <button
                        onClick={() => updateElement("headshot", { visible: !config.headshot.visible })}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {config.headshot.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedElement("headshot");
                          const obj = elementRefs.current["headshot"];
                          if (obj && fabricCanvasRef.current) {
                            fabricCanvasRef.current.setActiveObject(obj);
                            fabricCanvasRef.current.renderAll();
                          }
                        }}
                        className="flex-1 text-left text-xs font-medium"
                      >
                        {config.headshot.label}
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveLayerUp("headshot")}
                          className="text-muted-foreground hover:text-foreground"
                          title="Move up"
                        >
                          <MoveUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveLayerDown("headshot")}
                          className="text-muted-foreground hover:text-foreground"
                          title="Move down"
                        >
                          <MoveDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {/* Shape toggle right below headshot */}
                    <div className="pl-7 grid grid-cols-2 gap-1">
                      <button
                        onClick={() => updateElement("headshot", { shape: "circle" })}
                        className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                          config.headshot.shape === "circle"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                        title="Circle"
                      >
                        ◯
                      </button>
                      <button
                        onClick={() => updateElement("headshot", { shape: "square" })}
                        className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                          config.headshot.shape === "square"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                        title="Square"
                      >
                        ◻
                      </button>
                      <button
                        onClick={() => updateElement("headshot", { shape: "horizontal" })}
                        className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                          config.headshot.shape === "horizontal"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                        title="Horizontal Rectangle"
                      >
                        ▬
                      </button>
                      <button
                        onClick={() => updateElement("headshot", { shape: "vertical" })}
                        className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                          config.headshot.shape === "vertical"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                        title="Vertical Rectangle"
                      >
                        ▮
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Company Logo */}
              <div>
                {!config.companyLogo ? (
                  <button
                    draggable
                    onDragStart={(e) => handleDragStart(e, "companyLogo")}
                    onClick={() => addElementToCanvas("companyLogo")}
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent flex items-center gap-2 cursor-move"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Drag or click to add Logo
                  </button>
                ) : (
                  <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                    selectedElement === "companyLogo"
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  }`}>
                    <button
                      onClick={() => updateElement("companyLogo", { visible: !config.companyLogo.visible })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {config.companyLogo.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedElement("companyLogo");
                        const obj = elementRefs.current["companyLogo"];
                        if (obj && fabricCanvasRef.current) {
                          fabricCanvasRef.current.setActiveObject(obj);
                          fabricCanvasRef.current.renderAll();
                        }
                      }}
                      className="flex-1 text-left text-xs font-medium"
                    >
                      {config.companyLogo.label}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveLayerUp("companyLogo")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move up"
                      >
                        <MoveUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveLayerDown("companyLogo")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move down"
                      >
                        <MoveDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                {!config.name ? (
                  <button
                    draggable
                    onDragStart={(e) => handleDragStart(e, "name")}
                    onClick={() => addElementToCanvas("name")}
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent flex items-center gap-2 cursor-move"
                  >
                    <Type className="h-4 w-4" />
                    Drag or click to add Name
                  </button>
                ) : (
                  <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                    selectedElement === "name"
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  }`}>
                    <button
                      onClick={() => updateElement("name", { visible: !config.name.visible })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {config.name.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedElement("name");
                        const obj = elementRefs.current["name"];
                        if (obj && fabricCanvasRef.current) {
                          fabricCanvasRef.current.setActiveObject(obj);
                          fabricCanvasRef.current.renderAll();
                        }
                      }}
                      className="flex-1 text-left text-xs font-medium"
                    >
                      {config.name.label}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveLayerUp("name")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move up"
                      >
                        <MoveUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveLayerDown("name")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move down"
                      >
                        <MoveDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                {!config.title ? (
                  <button
                    draggable
                    onDragStart={(e) => handleDragStart(e, "title")}
                    onClick={() => addElementToCanvas("title")}
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent flex items-center gap-2 cursor-move"
                  >
                    <Type className="h-4 w-4" />
                    Drag or click to add Title
                  </button>
                ) : (
                  <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                    selectedElement === "title"
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  }`}>
                    <button
                      onClick={() => updateElement("title", { visible: !config.title.visible })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {config.title.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedElement("title");
                        const obj = elementRefs.current["title"];
                        if (obj && fabricCanvasRef.current) {
                          fabricCanvasRef.current.setActiveObject(obj);
                          fabricCanvasRef.current.renderAll();
                        }
                      }}
                      className="flex-1 text-left text-xs font-medium"
                    >
                      {config.title.label}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveLayerUp("title")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move up"
                      >
                        <MoveUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveLayerDown("title")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move down"
                      >
                        <MoveDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Company */}
              <div>
                {!config.company ? (
                  <button
                    draggable
                    onDragStart={(e) => handleDragStart(e, "company")}
                    onClick={() => addElementToCanvas("company")}
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent flex items-center gap-2 cursor-move"
                  >
                    <Type className="h-4 w-4" />
                    Drag or click to add Company
                  </button>
                ) : (
                  <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                    selectedElement === "company"
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  }`}>
                    <button
                      onClick={() => updateElement("company", { visible: !config.company.visible })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {config.company.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedElement("company");
                        const obj = elementRefs.current["company"];
                        if (obj && fabricCanvasRef.current) {
                          fabricCanvasRef.current.setActiveObject(obj);
                          fabricCanvasRef.current.renderAll();
                        }
                      }}
                      className="flex-1 text-left text-xs font-medium"
                    >
                      {config.company.label}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveLayerUp("company")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move up"
                      >
                        <MoveUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveLayerDown("company")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move down"
                      >
                        <MoveDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* LinkedIn Button */}
              <div>
                {!config.linkedin ? (
                  <button
                    draggable
                    onDragStart={(e) => handleDragStart(e, "linkedin")}
                    onClick={() => addElementToCanvas("linkedin")}
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent flex items-center gap-2 cursor-move"
                  >
                    <Type className="h-4 w-4" />
                    Drag or click to add LinkedIn
                  </button>
                ) : (
                  <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                    selectedElement === "linkedin"
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  }`}>
                    <button
                      onClick={() => updateElement("linkedin", { visible: !config.linkedin.visible })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {config.linkedin.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedElement("linkedin");
                        const obj = elementRefs.current["linkedin"];
                        if (obj && fabricCanvasRef.current) {
                          fabricCanvasRef.current.setActiveObject(obj);
                          fabricCanvasRef.current.renderAll();
                        }
                      }}
                      className="flex-1 text-left text-xs font-medium"
                    >
                      {config.linkedin.label}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveLayerUp("linkedin")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move up"
                      >
                        <MoveUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveLayerDown("linkedin")}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move down"
                      >
                        <MoveDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Background Layer - Can be layered for transparent overlays */}
              {(templateUrl || backgroundColor !== "#ffffff") && (
                <div className="pt-3 mt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Background Layer</p>
                  <div className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                    selectedElement === "background"
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  }`}>
                    <div className="text-muted-foreground">
                      <ImageIcon className="h-3 w-3" />
                    </div>
                    <button
                      onClick={() => {
                        setSelectedElement("background");
                      }}
                      className="flex-1 text-left text-xs font-medium"
                    >
                      {templateUrl ? "Background Image" : `Background (${backgroundColor})`}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          // Move background up in z-order
                          const maxZ = Math.max(0, ...Object.values(config).map(c => c.zIndex || 0));
                          setBackgroundZIndex(Math.min(backgroundZIndex + 1, maxZ + 1));
                          setRenderKey(k => k + 1);
                          setHasUnsavedChanges(true);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move layer up"
                      >
                        <MoveUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          // Move background down in z-order
                          const minZ = Math.min(0, ...Object.values(config).map(c => c.zIndex || 0));
                          setBackgroundZIndex(Math.max(backgroundZIndex - 1, minZ - 1));
                          setRenderKey(k => k + 1);
                          setHasUnsavedChanges(true);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Move layer down"
                      >
                        <MoveDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Image Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground italic">Upload sample images to preview your design</p>
              <div className="space-y-2">
                <Label className="text-sm">Test Headshot</Label>
                <button
                  onClick={() => headshotInputRef.current?.click()}
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Upload className="h-4 w-4 inline mr-2" />
                  Upload Headshot
                </button>
                <input
                  ref={headshotInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHeadshotUpload}
                  className="hidden"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Test Company Logo</Label>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Upload className="h-4 w-4 inline mr-2" />
                  Upload Logo
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Properties & Help */}
        <div className="space-y-4 overflow-y-auto">
          {selectedElement === "multiple" ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{selectedElements.length} Elements Selected</CardTitle>
                  <button
                    onClick={() => {
                      fabricCanvasRef.current?.discardActiveObject();
                      fabricCanvasRef.current?.renderAll();
                      setSelectedElement(null);
                      setSelectedElements([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    title="Deselect (Esc)"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-muted-foreground text-xs mb-3">
                  Batch edit common properties for all {selectedElements.length} selected elements.
                </p>

                {/* Check if all selected are text elements */}
                {selectedElements.every(key => ["name", "title", "company"].includes(key)) && (
                  <>
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 text-xs font-medium hover:bg-muted/50 rounded">
                        <ChevronDown className="h-3 w-3 transition-transform" />
                        Typography (Batch Edit)
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pt-2 pl-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Font Size (px)</Label>
                          <Input
                            type="number"
                            placeholder="Enter size..."
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 8 && val <= 72) {
                                updateElements(selectedElements, { fontSize: val });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            min={8}
                            max={72}
                            step={1}
                            className="h-7 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Font Weight</Label>
                          <Select onValueChange={(value) => updateElements(selectedElements, { fontWeight: parseInt(value) })}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Select weight..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="400">Regular</SelectItem>
                              <SelectItem value="500">Medium</SelectItem>
                              <SelectItem value="600">Semi Bold</SelectItem>
                              <SelectItem value="700">Bold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Text Color</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              onChange={(e) => updateElements(selectedElements, { color: e.target.value })}
                              className="w-8 h-7 rounded cursor-pointer border border-input"
                            />
                            <Input
                              type="text"
                              placeholder="#000000"
                              onChange={(e) => updateElements(selectedElements, { color: e.target.value })}
                              className="h-7 text-xs flex-1 font-mono"
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}

                {/* Opacity for images */}
                {selectedElements.some(key => ["headshot", "companyLogo"].includes(key)) && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 text-xs font-medium hover:bg-muted/50 rounded">
                      <ChevronDown className="h-3 w-3 transition-transform" />
                      Opacity (Batch Edit)
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2 pl-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Opacity (%)</Label>
                        <Input
                          type="number"
                          placeholder="0-100"
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 0 && val <= 100) {
                              const imageElements = selectedElements.filter(k => ["headshot", "companyLogo"].includes(k));
                              updateElements(imageElements, { opacity: val / 100 });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          min={0}
                          max={100}
                          step={10}
                          className="h-7 text-xs"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="p-3 bg-muted/30 rounded-lg border border-border mt-3">
                  <p className="text-xs font-medium mb-2">Multi-Select Tips:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Hold <kbd className="px-1 bg-muted rounded">Shift</kbd> + click to add elements</li>
                    <li>Use alignment toolbar to align all at once</li>
                    <li>Changes apply to all selected elements</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : selectedConfig && selectedElement ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{selectedConfig.label}</CardTitle>
                  <button
                    onClick={() => {
                      fabricCanvasRef.current?.discardActiveObject();
                      fabricCanvasRef.current?.renderAll();
                      setSelectedElement(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    title="Deselect (Esc)"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {/* Alignment Toolbar */}
                <div className="p-2 bg-muted/30 rounded-lg border border-border mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground px-1 mr-1">Align:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => alignSelected("left")}
                      className="h-7 w-7 p-0"
                      title="Align Left"
                    >
                      <AlignLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => alignSelected("center")}
                      className="h-7 w-7 p-0"
                      title="Align Center"
                    >
                      <AlignHorizontalJustifyCenter className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => alignSelected("right")}
                      className="h-7 w-7 p-0"
                      title="Align Right"
                    >
                      <AlignRight className="h-3 w-3" />
                    </Button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => alignSelected("top")}
                      className="h-7 w-7 p-0"
                      title="Align Top"
                    >
                      <AlignLeft className="h-3 w-3 rotate-90" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => alignSelected("middle")}
                      className="h-7 w-7 p-0"
                      title="Align Middle"
                    >
                      <AlignVerticalJustifyCenter className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => alignSelected("bottom")}
                      className="h-7 w-7 p-0"
                      title="Align Bottom"
                    >
                      <AlignRight className="h-3 w-3 rotate-90" />
                    </Button>
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border border-muted mb-2">
                  <input
                    type="checkbox"
                    id={`visibility-${selectedElement}`}
                    checked={selectedConfig.visible}
                    onChange={(e) => updateElement(selectedElement, { visible: e.target.checked })}
                    className="w-3 h-3 cursor-pointer"
                  />
                  <Label htmlFor={`visibility-${selectedElement}`} className="text-xs font-medium cursor-pointer flex-1">
                    Visible
                  </Label>
                  <button
                    onClick={() => {
                      updateElement(selectedElement, { visible: false });
                      setSelectedElement(null);
                    }}
                    className="text-destructive hover:text-destructive/80"
                    title="Delete element"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Position */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 text-xs font-medium hover:bg-muted/50 rounded">
                    <ChevronDown className="h-3 w-3 transition-transform" />
                    Position
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2 pl-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">X</Label>
                        <Input
                          type="number"
                          defaultValue={selectedConfig.x}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              updateElement(selectedElement, { x: val });
                            } else {
                              e.target.value = selectedConfig.x.toString();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Y</Label>
                        <Input
                          type="number"
                          defaultValue={selectedConfig.y}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              updateElement(selectedElement, { y: val });
                            } else {
                              e.target.value = selectedConfig.y.toString();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Size - for Images */}
                {(selectedElement === "headshot" || selectedElement === "companyLogo") && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 text-xs font-medium hover:bg-muted/50 rounded">
                      <ChevronDown className="h-3 w-3 transition-transform" />
                      Size & Opacity
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2 pl-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Size (px)</Label>
                        <Input
                          type="number"
                          defaultValue={selectedConfig.size}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 20 && val <= 300) {
                              updateElement(selectedElement, { size: val });
                            } else {
                              e.target.value = selectedConfig.size.toString();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          min={20}
                          max={300}
                          step={5}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Opacity (%)</Label>
                        <Input
                          type="number"
                          defaultValue={Math.round(selectedConfig.opacity * 100)}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 0 && val <= 100) {
                              updateElement(selectedElement, { opacity: val / 100 });
                            } else {
                              e.target.value = Math.round(selectedConfig.opacity * 100).toString();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          min={0}
                          max={100}
                          step={10}
                          className="h-7 text-xs"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Typography - for Text Elements */}
                {(selectedElement === "name" || selectedElement === "title" || selectedElement === "company") && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 text-xs font-medium hover:bg-muted/50 rounded">
                      <ChevronDown className="h-3 w-3 transition-transform" />
                      Typography
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2 pl-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Font</Label>
                        <Select value={selectedConfig.fontFamily} onValueChange={(value) => updateElement(selectedElement, { fontFamily: value })}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GOOGLE_FONTS.map(font => (
                              <SelectItem key={font} value={font}>{font}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Font Size (px)</Label>
                        <Input
                          type="number"
                          defaultValue={selectedConfig.fontSize}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 8 && val <= 72) {
                              updateElement(selectedElement, { fontSize: val });
                            } else {
                              e.target.value = selectedConfig.fontSize.toString();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          min={8}
                          max={72}
                          step={1}
                          className="h-7 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Box Width (px)</Label>
                        <Input
                          type="number"
                          defaultValue={selectedConfig.width || 200}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 50 && val <= 500) {
                              updateElement(selectedElement, { width: val });
                            } else {
                              e.target.value = (selectedConfig.width || 200).toString();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          min={50}
                          max={500}
                          step={10}
                          className="h-7 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Weight</Label>
                        <Select value={String(selectedConfig.fontWeight)} onValueChange={(value) => updateElement(selectedElement, { fontWeight: parseInt(value) })}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="400">Regular</SelectItem>
                            <SelectItem value="500">Medium</SelectItem>
                            <SelectItem value="600">Semi Bold</SelectItem>
                            <SelectItem value="700">Bold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Alignment</Label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => updateElement(selectedElement, { textAlign: "left" })}
                            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              selectedConfig.textAlign === "left"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            ⬅
                          </button>
                          <button
                            type="button"
                            onClick={() => updateElement(selectedElement, { textAlign: "center" })}
                            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              selectedConfig.textAlign === "center"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            ⬍
                          </button>
                          <button
                            type="button"
                            onClick={() => updateElement(selectedElement, { textAlign: "right" })}
                            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              selectedConfig.textAlign === "right"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            ➡
                          </button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Color - for Text */}
                {(selectedElement === "name" || selectedElement === "title" || selectedElement === "company") && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 text-xs font-medium hover:bg-muted/50 rounded">
                      <ChevronDown className="h-3 w-3 transition-transform" />
                      Color
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pt-2 pl-4">
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedConfig.color}
                          onChange={(e) => updateElement(selectedElement, { color: e.target.value })}
                          className="w-8 h-7 rounded cursor-pointer border border-input"
                        />
                        <Input
                          type="text"
                          value={selectedConfig.color}
                          onChange={(e) => updateElement(selectedElement, { color: e.target.value })}
                          className="h-7 text-xs flex-1 font-mono"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* LinkedIn Button Color */}
                {selectedElement === "linkedin" && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 text-xs font-medium hover:bg-muted/50 rounded">
                      <ChevronDown className="h-3 w-3 transition-transform" />
                      Button Color
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pt-2 pl-4">
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedConfig.bgColor}
                          onChange={(e) => updateElement(selectedElement, { bgColor: e.target.value })}
                          className="w-8 h-7 rounded cursor-pointer border border-input"
                        />
                        <Input
                          type="text"
                          value={selectedConfig.bgColor}
                          onChange={(e) => updateElement(selectedElement, { bgColor: e.target.value })}
                          className="h-7 text-xs flex-1 font-mono"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs">Select an element</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Click an element on the canvas or from the layers panel to edit its properties.
                  </p>
                </CardContent>
              </Card>

              {/* Keyboard Shortcuts Help */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs">Shortcuts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Undo</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Z</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Redo</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Y</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Multi-Select</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Shift+Click</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Edit Text</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono whitespace-nowrap">2x Click</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Delete</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Del</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Deselect</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Esc</kbd>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={cropImageUrl}
        aspectRatio={
          cropMode === "headshot"
            ? config.headshot?.shape === "horizontal"
              ? 1.6
              : config.headshot?.shape === "vertical"
                ? 1 / 1.6
                : 1 // circle or square
            : cropMode === "logo"
              ? NaN // free aspect - logos come in all shapes
              : NaN // free aspect for background
        }
        onCropComplete={handleCropComplete}
        cropShape={cropMode === "headshot" ? (config.headshot?.shape || "circle") : "square"}
        imageFormat={cropMode === "logo" ? "png" : "jpeg"}
        title={
          cropMode === "headshot"
            ? "Crop Headshot"
            : cropMode === "logo"
              ? "Crop Logo"
              : "Crop Background"
        }
        instructions={
          cropMode === "headshot"
            ? `Crop the headshot to a ${config.headshot?.shape || "circle"}. Center your face and adjust the frame.`
            : cropMode === "logo"
              ? "Crop the logo to a square."
              : "Crop the background image."
        }
      />

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showDownloadConfirm} onOpenChange={setShowDownloadConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes to your promo card layout. Would you like to save them before downloading?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleDownloadPNG()}>
              Download Without Saving
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleSaveConfiguration();
                await handleDownloadPNG();
              }}
            >
              Save & Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
