/**
 * CardBuilder - Unified Card Builder Component
 *
 * A professional Canva-like design tool built with Fabric.js for creating both
 * promo cards and website cards. Replaces the previous separate builders.
 *
 * KEY ARCHITECTURE DECISIONS:
 *
 * 1. DROP ZONE SYSTEM
 *    - Templates define layout (position, size, shape) NOT content
 *    - Test images are preview-only, never saved to config
 *    - Config stores: baseSize, scaleX, scaleY, position, styling
 *    - Actual images will come from real speaker data at runtime
 *
 * 2. DYNAMIC ELEMENTS
 *    - Fetches form config via API (getFormConfigForEvent)
 *    - Creates elements for fields marked with showInCardBuilder: true
 *    - Allows custom form fields to appear as card elements
 *
 * 3. PLACEHOLDER RENDERING
 *    - Headshot: lockUniScaling + corner-only controls (maintains aspect ratio)
 *    - Logo: Free resize with all handles (width/height independent)
 *    - Gray rect fills selection box: rect at (0,0), text centered, selectable:false
 *
 * 4. PERSISTENT SELECTION
 *    - Selection stays active when clicking toolbar controls
 *    - Only clears on: canvas background click, selecting another element, or ESC key
 *    - Prevents toolbar interactions from deselecting elements
 *
 * 5. SCALE MANAGEMENT
 *    - Placeholders render at: actualSize = baseSize × scaleX/Y
 *    - On resize: calculate new scale from getBoundingRect() / baseSize
 *    - Store scale in config for persistence
 *
 * MVP SIMPLIFICATIONS:
 * - Test image uploads disabled (gray placeholders only)
 * - Position alignment removed (too complex, just use drag)
 * - Text alignment simplified (content alignment only, like PowerPoint)
 *
 * @component
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  Upload,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Users,
  Type,
  Briefcase,
  ImageIcon,
  Globe,
  Layers,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  AlignLeft,
  AlignRight,
  AlignCenterHorizontal,
} from "lucide-react";
import { FaLinkedin, FaTwitter, FaFacebook, FaInstagram, FaGithub } from "react-icons/fa";
import { fabric } from "fabric";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFormConfigForEvent } from "@/lib/api";
import type { FormFieldConfig } from "@/components/SpeakerFormBuilder";

type CardType = "promo" | "website";

interface CardBuilderProps {
  eventId?: string;
  fullscreen?: boolean;
}

interface ElementConfig {
  [key: string]: any;
}

interface CardConfig {
  [key: string]: ElementConfig;
}

// Helper to map form field IDs to icons and element types
const getFieldIcon = (fieldId: string) => {
  const iconMap: { [key: string]: any } = {
    linkedin: FaLinkedin,
    twitter: FaTwitter,
    facebook: FaFacebook,
    instagram: FaInstagram,
    github: FaGithub,
    website: Globe,
    // Add more mappings as needed
  };
  return iconMap[fieldId] || Type;
};

// Helper to get brand icon SVG data URLs
const getBrandIconSVG = (iconType: string): string => {
  const icons: { [key: string]: string } = {
    linkedin: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`)}`,
    twitter: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`)}`,
    facebook: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`)}`,
    instagram: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>`)}`,
    github: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`)}`,
  };
  return icons[iconType] || icons.linkedin;
};

// Helper to create dynamic element template from form field
const createDynamicElementTemplate = (field: FormFieldConfig, index: number): ElementConfig => {
  const baseY = 200 + index * 35;

  // For URL fields, create a clickable icon/button element
  if (field.type === "url" || field.id.includes("linkedin") || field.id.includes("twitter") || field.id.includes("website")) {
    return {
      label: field.label,
      type: "icon-link",
      fieldId: field.id,
      x: 50,
      y: baseY,
      size: 32,
      iconType: field.id,
      url: "", // Will be populated with actual speaker data
      visible: true,
      zIndex: 10 + index,
    };
  }

  // For text/textarea fields, create a text element
  return {
    label: field.label,
    type: "dynamic-text",
    fieldId: field.id,
    text: field.label, // Placeholder text
    x: 150,
    y: baseY,
    fontSize: 16,
    fontFamily: "Inter",
    color: "#000000",
    fontWeight: 400,
    visible: true,
    textAlign: "left",
    width: 300,
    zIndex: 10 + index,
  };
};

// Element templates
const ELEMENT_TEMPLATES = {
  headshot: {
    label: "Headshot",
    type: "image-dropzone",
    x: 50,
    y: 50,
    size: 80,
    shape: "circle",
    visible: true,
    opacity: 1,
    zIndex: 1,
  },
  name: {
    label: "Name",
    text: "Wakko Warner",
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
    text: "Chief Executive Officer",
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
    text: "Warner Bros",
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
    type: "image-dropzone",
    x: 50,
    y: 150,
    size: 60,
    shape: "square",
    visible: true,
    opacity: 1,
    zIndex: 5,
  },
};

export default function CardBuilder({ eventId, fullscreen = false }: CardBuilderProps) {
  // State
  const location = useLocation();
  const deriveInitialCardType = (): CardType => {
    const path = (location && location.pathname) || (typeof window !== 'undefined' ? window.location.pathname : '');
    if (path.includes('/website-card-builder')) return 'website';
    if (path.includes('/promo-card-builder')) return 'promo';
    return 'promo';
  };

  const [cardType, setCardType] = useState<CardType>(deriveInitialCardType);
  const [config, setConfig] = useState<CardConfig>({});
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<CardConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Crop dialog
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropMode, setCropMode] = useState<"headshot" | "logo" | "template" | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState("");

  // Shape selector popup
  const [shapePopupOpen, setShapePopupOpen] = useState(false);
  const [shapePopupPosition, setShapePopupPosition] = useState({ x: 0, y: 0 });

  // Drag and drop
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const elementRefs = useRef<{ [key: string]: fabric.Object }>({});

  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(600);

  // Test images (preview only)
  const [testHeadshot, setTestHeadshot] = useState<string | null>(null);
  const [testLogo, setTestLogo] = useState<string | null>(null);

  // Layers panel
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch form configuration to get fields marked for card builder
  const [missingFormDialogOpen, setMissingFormDialogOpen] = useState(false);

  const { data: formConfig } = useQuery<{ config: FormFieldConfig[] }>({
    queryKey: ["formConfig", eventId, "speaker-info"],
    queryFn: async () => {
      try {
        return await getFormConfigForEvent(eventId || "", "speaker-info");
      } catch (err: any) {
        console.log("Error fetching form config:", err);
        if (err && (err.status === 404 || err?.status === 404)) {
          setMissingFormDialogOpen(true);
        }
        throw err;
      }
    },
    enabled: Boolean(eventId),
  });

  // Get fields that are enabled for card builder, excluding default fields
  const DEFAULT_FIELD_IDS = ["headshot", "name", "title", "first_name", "last_name", "company_name", "company_role", "company_logo"];
  const cardBuilderFields = (formConfig?.config || []).filter(
    (field) => field.showInCardBuilder && field.enabled && !DEFAULT_FIELD_IDS.includes(field.id)
  );

  // Helper to check if a hardcoded element should be shown based on form config
  const shouldShowElement = (elementKey: string): boolean => {
    if (!formConfig?.config) return true; // Show all if no config loaded

    const fieldMapping: { [key: string]: string[] } = {
      headshot: ["headshot"],
      name: ["first_name", "last_name"],
      title: ["company_role"],
      company: ["company_name"],
      companyLogo: ["company_logo"],
    };

    const relatedFields = fieldMapping[elementKey] || [];
    // Show if ANY related field has showInCardBuilder enabled
    return relatedFields.some(fieldId => {
      const field = formConfig.config.find(f => f.id === fieldId);
      return field?.showInCardBuilder === true;
    });
  };

  // Initialize Fabric canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: "#ffffff",
        selection: true,
        preserveObjectStacking: true,
      });

      fabricCanvasRef.current = canvas;

      // Selection change handler
      canvas.on("selection:created", (e) => {
        const obj = e.selected?.[0];
        if (obj?.data?.elementKey) {
          setSelectedElement(obj.data.elementKey);
        }
      });

      canvas.on("selection:updated", (e) => {
        const obj = e.selected?.[0];
        if (obj?.data?.elementKey) {
          setSelectedElement(obj.data.elementKey);
        }
      });

      // Don't auto-clear selection - keep it persistent
      // Selection only clears when:
      // 1. User selects another element (handled by selection:created/updated)
      // 2. User presses ESC (handled by keyboard listener below)
      // 3. User clicks canvas background (handled below)

      canvas.on("mouse:down", (e) => {
        // Only clear selection if clicking on empty canvas (not on an object)
        if (!e.target) {
          setSelectedElement(null);
        }
      });

      // PowerPoint-style snapping - snap to CLOSEST object
      let alignmentLines: fabric.Line[] = [];
      const SNAP_THRESHOLD = 15; // Generous threshold like PowerPoint

      canvas.on("object:moving", (e) => {
        const obj = e.target;
        if (!obj) return;

        // Remove old guides
        alignmentLines.forEach((line) => canvas.remove(line));
        alignmentLines = [];

        const objBounds = obj.getBoundingRect();
        const objLeft = objBounds.left;
        const objTop = objBounds.top;
        const objRight = objLeft + objBounds.width;
        const objBottom = objTop + objBounds.height;
        const objCenterX = objLeft + objBounds.width / 2;
        const objCenterY = objTop + objBounds.height / 2;

        // Canvas center
        const canvasCenterX = canvas.width! / 2;
        const canvasCenterY = canvas.height! / 2;

        // Helper to create snap lines
        const createSnapLine = (x1: number, y1: number, x2: number, y2: number) => {
          return new fabric.Line([x1, y1, x2, y2], {
            stroke: "#FF1493",
            strokeWidth: 1,
            strokeDashArray: [4, 4],
            selectable: false,
            evented: false,
            strokeUniform: true,
            opacity: 0.9,
          });
        };

        // Collect all possible snap points with distances
        const snapPointsX: Array<{dist: number, target: number, line: fabric.Line}> = [];
        const snapPointsY: Array<{dist: number, target: number, line: fabric.Line}> = [];

        // Canvas center snaps
        const distToCenterX = Math.abs(objCenterX - canvasCenterX);
        const distToCenterY = Math.abs(objCenterY - canvasCenterY);

        if (distToCenterX < SNAP_THRESHOLD) {
          snapPointsX.push({
            dist: distToCenterX,
            target: canvasCenterX - objCenterX,
            line: createSnapLine(canvasCenterX, 0, canvasCenterX, canvas.height!)
          });
        }

        if (distToCenterY < SNAP_THRESHOLD) {
          snapPointsY.push({
            dist: distToCenterY,
            target: canvasCenterY - objCenterY,
            line: createSnapLine(0, canvasCenterY, canvas.width!, canvasCenterY)
          });
        }

        // Check other objects - find CLOSEST snap for each type
        canvas.forEachObject((other) => {
          if (other === obj || !other.data?.elementKey) return;

          const otherBounds = other.getBoundingRect();
          const otherLeft = otherBounds.left;
          const otherTop = otherBounds.top;
          const otherRight = otherLeft + otherBounds.width;
          const otherBottom = otherTop + otherBounds.height;
          const otherCenterX = otherLeft + otherBounds.width / 2;
          const otherCenterY = otherTop + otherBounds.height / 2;

          const minY = Math.min(objTop, otherTop);
          const maxY = Math.max(objBottom, otherBottom);
          const minX = Math.min(objLeft, otherLeft);
          const maxX = Math.max(objRight, otherRight);

          // X-axis snaps
          const snapChecksX = [
            { dist: Math.abs(objLeft - otherLeft), target: otherLeft - objLeft, pos: otherLeft },
            { dist: Math.abs(objRight - otherRight), target: otherRight - objRight, pos: otherRight },
            { dist: Math.abs(objCenterX - otherCenterX), target: otherCenterX - objCenterX, pos: otherCenterX },
          ];

          for (const check of snapChecksX) {
            if (check.dist < SNAP_THRESHOLD) {
              snapPointsX.push({
                dist: check.dist,
                target: check.target,
                line: createSnapLine(check.pos, minY, check.pos, maxY)
              });
            }
          }

          // Y-axis snaps
          const snapChecksY = [
            { dist: Math.abs(objTop - otherTop), target: otherTop - objTop, pos: otherTop },
            { dist: Math.abs(objBottom - otherBottom), target: otherBottom - objBottom, pos: otherBottom },
            { dist: Math.abs(objCenterY - otherCenterY), target: otherCenterY - objCenterY, pos: otherCenterY },
          ];

          for (const check of snapChecksY) {
            if (check.dist < SNAP_THRESHOLD) {
              snapPointsY.push({
                dist: check.dist,
                target: check.target,
                line: createSnapLine(minX, check.pos, maxX, check.pos)
              });
            }
          }
        });

        // Apply ONLY the closest snap in each direction
        if (snapPointsX.length > 0) {
          snapPointsX.sort((a, b) => a.dist - b.dist);
          const closest = snapPointsX[0];
          obj.set({ left: obj.left! + closest.target });
          obj.setCoords();
          alignmentLines.push(closest.line);
        }

        if (snapPointsY.length > 0) {
          snapPointsY.sort((a, b) => a.dist - b.dist);
          const closest = snapPointsY[0];
          obj.set({ top: obj.top! + closest.target });
          obj.setCoords();
          alignmentLines.push(closest.line);
        }

        // Add guide lines to canvas
        alignmentLines.forEach((line) => canvas.add(line));
        canvas.renderAll();
      });

      // Remove guides after moving
      canvas.on("object:modified", (e) => {
        alignmentLines.forEach((line) => canvas.remove(line));
        alignmentLines = [];
        canvas.renderAll();
      });

      // Update config when objects are moved/modified/resized
      canvas.on("object:modified", (e) => {
        const obj = e.target;
        if (obj?.data?.elementKey) {
          const elementKey = obj.data.elementKey;
          const updates: any = {
            x: obj.left || 0,
            y: obj.top || 0,
          };

          // Save scale for images
          if (obj.type === "image") {
            updates.scaleX = obj.scaleX || 1;
            updates.scaleY = obj.scaleY || 1;
          }

          // Save scale for groups (placeholders)
          // Calculate scale from actual dimensions vs base size
          if (obj.type === "group") {
            setConfig(prev => {
              const baseSize = prev[elementKey]?.size || 60;
              const bounds = obj.getBoundingRect();

              // Calculate scale from actual pixel dimensions
              const newScaleX = bounds.width / baseSize;
              const newScaleY = bounds.height / baseSize;

              const newConfig = {
                ...prev,
                [elementKey]: {
                  ...prev[elementKey],
                  x: obj.left || 0,
                  y: obj.top || 0,
                  scaleX: newScaleX,
                  scaleY: newScaleY,
                },
              };

              setHasUnsavedChanges(true);
              addToHistory(newConfig);
              return newConfig;
            });
            return; // Early return since we handled setConfig above
          }

          // Save width for text elements
          if (obj.type === "textbox") {
            updates.width = obj.width || 300;
            updates.scaleX = obj.scaleX || 1;
            updates.scaleY = obj.scaleY || 1;
          }

          setHasUnsavedChanges(true); // Mark as unsaved when elements are modified
          setConfig(prev => {
            const newConfig = {
              ...prev,
              [elementKey]: {
                ...prev[elementKey],
                ...updates,
              },
            };
            addToHistory(newConfig); // Add to undo/redo history
            return newConfig;
          });
        }
      });
    }

    return () => {
      fabricCanvasRef.current?.dispose();
    };
  }, []);

  // Render canvas elements
  const renderAllElements = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;


    // Clear canvas
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    elementRefs.current = {};

    // Render background if exists (1:1 scale, canvas is sized to match)
    if (templateUrl) {
      try {
        const img = await loadImagePromise(templateUrl);
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
        elementRefs.current['_background'] = fabricImg;
        canvas.renderAll();
      } catch (err) {
        toast({ title: "Failed to load background", description: String(err), variant: "destructive" });
      }
    }

    // Render elements
    for (const [key, cfg] of Object.entries(config)) {
      if (!cfg.visible) continue;

      if (key === "headshot") {
        if (testHeadshot) {
          // Render actual image
          const img = await loadImagePromise(testHeadshot);
          const fabricImg = new fabric.Image(img, {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: true, // Maintain aspect ratio
            data: { elementKey: "headshot" },
          });

          // Hide middle edge controls - force corner-only resizing
          fabricImg.setControlsVisibility({
            ml: false,
            mt: false,
            mr: false,
            mb: false,
          });

          // Use actual size (base size × scale) to match the resized placeholder
          const scaleX = cfg.scaleX || 1;
          const scaleY = cfg.scaleY || 1;
          const shape = cfg.shape || "circle";

          if (shape === "circle") {
            const actualSize = cfg.size * scaleX;
            const radius = actualSize / 2;
            fabricImg.set({
              clipPath: new fabric.Circle({
                radius: radius,
                originX: 'center',
                originY: 'center',
              }),
            });
            fabricImg.scaleToWidth(actualSize);
          } else if (shape === "square") {
            const actualWidth = cfg.size * scaleX;
            fabricImg.scaleToWidth(actualWidth);
          } else if (shape === "vertical") {
            // 3:4 aspect ratio (portrait)
            const actualWidth = cfg.size * scaleX;
            const actualHeight = (cfg.size * 4 / 3) * scaleY;
            fabricImg.scaleToWidth(actualWidth);
            fabricImg.set({
              clipPath: new fabric.Rect({
                width: actualWidth / fabricImg.scaleX!,
                height: actualHeight / fabricImg.scaleY!,
                originX: 'center',
                originY: 'center',
              }),
            });
          } else if (shape === "horizontal") {
            // 4:3 aspect ratio (landscape)
            const actualWidth = cfg.size * scaleX;
            const actualHeight = (cfg.size * 3 / 4) * scaleY;
            fabricImg.scaleToWidth(actualWidth);
            fabricImg.set({
              clipPath: new fabric.Rect({
                width: actualWidth / fabricImg.scaleX!,
                height: actualHeight / fabricImg.scaleY!,
                originX: 'center',
                originY: 'center',
              }),
            });
          }

          canvas.add(fabricImg);
          elementRefs.current.headshot = fabricImg;
        } else {
          // Render placeholder - calculate actual size from base size × scale
          const shape = cfg.shape || "circle";
          const scaleX = cfg.scaleX || 1;
          const scaleY = cfg.scaleY || 1;

          let baseWidth = cfg.size;
          let baseHeight = cfg.size;

          if (shape === "vertical") {
            baseHeight = cfg.size * 4 / 3;
          } else if (shape === "horizontal") {
            baseHeight = cfg.size * 3 / 4;
          }

          // Calculate actual dimensions (base × scale)
          const width = baseWidth * scaleX;
          const height = baseHeight * scaleY;

          const rect = new fabric.Rect({
            left: 0,
            top: 0,
            width: width,
            height: height,
            fill: '#e5e7eb',
            stroke: '#d1d5db',
            strokeWidth: 2,
            strokeUniform: true,
            rx: shape === "circle" ? width / 2 : 4,
            ry: shape === "circle" ? height / 2 : 4,
            selectable: false,
            evented: false,
          });

          const text = new fabric.Text("Headshot", {
            left: width / 2,
            top: height / 2,
            fontSize: Math.min(Math.max(14, width / 6), 20), // Cap at 20px
            fill: '#9ca3af',
            fontFamily: 'Inter',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });

          const group = new fabric.Group([rect, text], {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: true, // Force uniform scaling to maintain aspect ratio
            subTargetCheck: false,
            data: { elementKey: "headshot" },
          });

          // Hide middle edge controls - force corner-only resizing (maintains aspect ratio)
          group.setControlsVisibility({
            ml: false,
            mt: false,
            mr: false,
            mb: false,
          });

          canvas.add(group);
          elementRefs.current.headshot = group;
        }
      } else if (key === "companyLogo") {
        if (testLogo) {
          // Render actual logo - scaled to fit the drop zone
          const img = await loadImagePromise(testLogo);
          const fabricImg = new fabric.Image(img, {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: true, // Maintain aspect ratio
            data: { elementKey: "companyLogo" },
          });

          // Hide middle edge controls - force corner-only resizing
          fabricImg.setControlsVisibility({
            ml: false,
            mt: false,
            mr: false,
            mb: false,
          });

          // Use actual size (base size × scale) to match the resized placeholder
          const scaleX = cfg.scaleX || 1;
          const actualWidth = cfg.size * scaleX;
          fabricImg.scaleToWidth(actualWidth);

          canvas.add(fabricImg);
          elementRefs.current.companyLogo = fabricImg;
        } else {
          // Render placeholder - calculate actual size from base size × scale
          const baseSize = cfg.size;
          const scaleX = cfg.scaleX || 1;
          const scaleY = cfg.scaleY || 1;

          // Calculate actual dimensions (base × scale)
          const width = baseSize * scaleX;
          const height = baseSize * scaleY;

          const rect = new fabric.Rect({
            left: 0,
            top: 0,
            width: width,
            height: height,
            fill: '#e5e7eb',
            stroke: '#d1d5db',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            strokeUniform: true,
            rx: 4,
            ry: 4,
            selectable: false,
            evented: false,
          });

          const text = new fabric.Text("Logo Drop Zone", {
            left: width / 2,
            top: height / 2,
            fontSize: Math.min(Math.max(11, width / 8), 18), // Cap at 18px
            fill: '#9ca3af',
            fontFamily: 'Inter',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });

          const group = new fabric.Group([rect, text], {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            subTargetCheck: false,
            data: { elementKey: "companyLogo" },
          });

          // Logo: Allow all resize handles (free drag, no aspect ratio lock)
          // Don't hide any controls - user can resize width/height independently

          canvas.add(group);
          elementRefs.current.companyLogo = group;
        }
      } else if (["name", "title", "company"].includes(key)) {
        const text = new fabric.Textbox(cfg.text || cfg.label, {
          left: cfg.x,
          top: cfg.y,
          fontSize: cfg.fontSize,
          fontFamily: cfg.fontFamily,
          fill: cfg.color,
          fontWeight: cfg.fontWeight,
          fontStyle: cfg.fontStyle || "normal",
          textAlign: cfg.textAlign,
          underline: cfg.underline || false,
          lineHeight: cfg.lineHeight || 1.2,
          charSpacing: cfg.charSpacing || 0,
          width: cfg.width,
          // fabric.Textbox options don't include `textBaseline` in the TypeScript defs;
          // the default baseline is acceptable, so omit this option to satisfy typings.
          selectable: true,
          editable: true,
          hasControls: true,
          lockRotation: true,
          lockUniScaling: true, // Maintain aspect ratio
          data: { elementKey: key },
        });

        // Hide middle edge controls - force corner-only resizing
        text.setControlsVisibility({
          ml: false, // Hide middle-left
          mt: false, // Hide middle-top
          mr: false, // Hide middle-right
          mb: false, // Hide middle-bottom
        });

        // Apply saved scale if exists (from user resizing)
        if (cfg.scaleX !== undefined) text.set('scaleX', cfg.scaleX);
        if (cfg.scaleY !== undefined) text.set('scaleY', cfg.scaleY);

        canvas.add(text);
        elementRefs.current[key] = text;
      } else if (key.startsWith("dynamic_")) {
        // Handle dynamic fields from form builder
        if (cfg.type === "icon-link") {
          // Render social media icon/link - simple text approach like v1
          const iconColors: { [key: string]: string } = {
            linkedin: "#0A66C2", // LinkedIn official blue
            twitter: "#1DA1F2",
            facebook: "#1877F2",
            instagram: "#E4405F",
            github: "#333333",
          };

          const iconText: { [key: string]: string } = {
            linkedin: "in",
            twitter: "x",
            facebook: "f",
            instagram: "📷",
            github: "gh",
          };

          const color = iconColors[cfg.iconType] || "#666666";
          const text = iconText[cfg.iconType] || "🔗";

          const background = new fabric.Rect({
            left: 0,
            top: 0,
            width: cfg.size,
            height: cfg.size,
            fill: color,
            rx: 4,
            ry: 4,
            selectable: false,
            evented: false,
          });

          const iconLabel = new fabric.Text(text, {
            left: cfg.size / 2,
            top: cfg.size / 2,
            fontSize: cfg.size * 0.4,
            fill: '#ffffff',
            fontFamily: 'Inter',
            fontWeight: 'bold',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
          });

          const group = new fabric.Group([background, iconLabel], {
            left: cfg.x,
            top: cfg.y,
            selectable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: true, // Maintain aspect ratio
            subTargetCheck: false,
            data: { elementKey: key, type: "icon-link" },
          });

          // Corner-only controls - hide middle edge controls
          group.setControlsVisibility({
            ml: false,
            mt: false,
            mr: false,
            mb: false,
          });

          // Apply saved scale if exists
          if (cfg.scaleX !== undefined) group.set('scaleX', cfg.scaleX);
          if (cfg.scaleY !== undefined) group.set('scaleY', cfg.scaleY);

          canvas.add(group);
          elementRefs.current[key] = group;
        } else if (cfg.type === "dynamic-text") {
          // Render text field
          const text = new fabric.Textbox(cfg.text || cfg.label, {
            left: cfg.x,
            top: cfg.y,
            fontSize: cfg.fontSize,
            fontFamily: cfg.fontFamily,
            fill: cfg.color,
            fontWeight: cfg.fontWeight,
            textAlign: cfg.textAlign,
            width: cfg.width,
            selectable: true,
            editable: true,
            hasControls: true,
            lockRotation: true,
            lockUniScaling: true,
            data: { elementKey: key, type: "dynamic-text" },
          });

          // Hide middle edge controls
          text.setControlsVisibility({
            ml: false,
            mt: false,
            mr: false,
            mb: false,
          });

          // Apply saved scale if exists
          if (cfg.scaleX !== undefined) text.set('scaleX', cfg.scaleX);
          if (cfg.scaleY !== undefined) text.set('scaleY', cfg.scaleY);

          canvas.add(text);
          elementRefs.current[key] = text;
        }
      }
    }

    canvas.renderAll();
  };

  // Helper to load images
  const loadImagePromise = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  // Re-render when config changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      renderAllElements();
    }
  }, [config, templateUrl, testHeadshot, testLogo]);

  // Keyboard shortcuts for undo/redo and arrow key nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Undo: Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac)
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // ESC: Deselect (clear selection)
      if (e.key === 'Escape') {
        e.preventDefault();
        const canvas = fabricCanvasRef.current;
        if (canvas) {
          canvas.discardActiveObject();
          canvas.renderAll();
        }
        setSelectedElement(null);
        return;
      }

      // Arrow key nudging (PowerPoint-style)
      const canvas = fabricCanvasRef.current;
      const activeObject = canvas?.getActiveObject();
      if (!activeObject || !canvas) return;

      const nudgeAmount = e.shiftKey ? 10 : 1; // Shift for larger steps
      let moved = false;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          activeObject.set('left', (activeObject.left || 0) - nudgeAmount);
          moved = true;
          break;
        case 'ArrowRight':
          e.preventDefault();
          activeObject.set('left', (activeObject.left || 0) + nudgeAmount);
          moved = true;
          break;
        case 'ArrowUp':
          e.preventDefault();
          activeObject.set('top', (activeObject.top || 0) - nudgeAmount);
          moved = true;
          break;
        case 'ArrowDown':
          e.preventDefault();
          activeObject.set('top', (activeObject.top || 0) + nudgeAmount);
          moved = true;
          break;
      }

      if (moved) {
        activeObject.setCoords();
        canvas.requestRenderAll();

        // Update config
        if (activeObject.data?.elementKey) {
          updateElement(activeObject.data.elementKey, {
            x: activeObject.left || 0,
            y: activeObject.top || 0,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load saved config on mount: prefer server config for eventId, fallback to localStorage
  useEffect(() => {
    const storageKey = `${cardType}-card-config-${eventId || "default"}`;

    const loadFromLocal = () => {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      try {
        const { config: savedConfig, templateUrl: savedTemplateUrl, canvasWidth: savedWidth, canvasHeight: savedHeight } = JSON.parse(saved);
        if (savedConfig) {
          setConfig(savedConfig);
          setHasUnsavedChanges(false);
        }

        // Load canvas dimensions if saved (preferred method)
        if (savedWidth && savedHeight) {
          setCanvasWidth(savedWidth);
          setCanvasHeight(savedHeight);
          if (fabricCanvasRef.current) {
            fabricCanvasRef.current.setDimensions({
              width: savedWidth,
              height: savedHeight,
            });
          }
        }

        if (savedTemplateUrl) {
          // Load background image to get its dimensions (fallback if dimensions not saved)
          const img = new Image();
          img.onerror = (err) => {
            
            toast({ title: "Background load failed", description: "Could not load background image due to CORS or network error. Try re-uploading the image.", variant: "destructive" });
            // clear template to avoid broken image state
            setTemplateUrl(null);
          };
          img.onload = () => {
            // Update canvas dimensions to match background (only if not already set from saved data)
            if (!savedWidth || !savedHeight) {
              setCanvasWidth(img.width);
              setCanvasHeight(img.height);

              // Resize Fabric canvas
              if (fabricCanvasRef.current) {
                fabricCanvasRef.current.setDimensions({
                  width: img.width,
                  height: img.height,
                });
              }
            }

            // Set background URL (will trigger re-render)
            setTemplateUrl(savedTemplateUrl);
          };
          img.src = savedTemplateUrl;
        }
        toast({ title: "Loaded", description: "Restored your previous card", duration: 2000 });
      } catch (err) {
        
      }
    };

    // If we have an eventId, prefer fetching server config
    if (eventId) {
      (async () => {
        try {
          const api = await import("@/lib/api");
          const res = await api.getPromoConfigForEvent(eventId, cardType);

          // server may return { config: {...}, ... } or the config directly
          const serverConfig = res?.config ?? res;

          // If server returned a config object, use it
          if (serverConfig && typeof serverConfig === "object") {
            // serverConfig may be the saved config object (with templateUrl, canvasWidth/Height)
            const savedConfig = serverConfig;
            const savedTemplateUrl = serverConfig.templateUrl ?? null;
            const savedWidth = serverConfig.canvasWidth ?? serverConfig.canvas_width ?? null;
            const savedHeight = serverConfig.canvasHeight ?? serverConfig.canvas_height ?? null;

            if (savedConfig) {
              setConfig(savedConfig);
              setHasUnsavedChanges(false);
            }

            if (savedWidth && savedHeight) {
              setCanvasWidth(savedWidth);
              setCanvasHeight(savedHeight);
              if (fabricCanvasRef.current) {
                fabricCanvasRef.current.setDimensions({ width: savedWidth, height: savedHeight });
              }
            }

            if (savedTemplateUrl) {
              const img = new Image();
              img.onload = () => {
                if (!savedWidth || !savedHeight) {
                  setCanvasWidth(img.width);
                  setCanvasHeight(img.height);
                  if (fabricCanvasRef.current) {
                    fabricCanvasRef.current.setDimensions({ width: img.width, height: img.height });
                  }
                }
                setTemplateUrl(savedTemplateUrl);
              };
              img.src = savedTemplateUrl;
            }

            toast({ title: "Loaded", description: "Loaded template from event", duration: 2000 });
            return;
          }

          // If no server config found, fall back to localStorage
          loadFromLocal();
        } catch (err) {
          
          // fallback
          loadFromLocal();
        }
      })();
    } else {
      // No eventId -> use local storage
      loadFromLocal();
    }
  }, [eventId, cardType]); // Load when eventId or cardType changes

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

    if (!elementKey) {
      setDraggingElement(null);
      return;
    }

    // If headshot and not yet added, show shape selector at drop position
    if (elementKey === "headshot" && !config.headshot) {
      setShapePopupPosition({ x: e.clientX, y: e.clientY });
      setShapePopupOpen(true);
      setDraggingElement(null);

      // Store the drop position for when shape is selected
      (window as any).__headshotDropPos = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvas = fabricCanvasRef.current;
    const canvasElement = canvasRef.current;
    if (!canvas || !canvasElement) return;

    // Calculate position relative to canvas (accounting for zoom)
    const rect = canvasElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Get template (from static templates or create dynamic one)
    let template = ELEMENT_TEMPLATES[elementKey as keyof typeof ELEMENT_TEMPLATES];

    // Handle dynamic fields
    if (!template && elementKey.startsWith("dynamic_")) {
      const fieldId = elementKey.replace("dynamic_", "");
      const field = cardBuilderFields.find(f => f.id === fieldId);
      if (field) {
        template = createDynamicElementTemplate(field, 0);
      }
    }

    if (!template) {
      
      setDraggingElement(null);
      return;
    }

    // Center the element at drop position
    let adjustedX = x;
    let adjustedY = y;

    if (template.size) {
      // Image elements - center at drop point
      adjustedX = x - template.size / 2;
      adjustedY = y - template.size / 2;
    } else if (template.width) {
      // Text elements - center at drop point
      adjustedX = x - template.width / 2;
      adjustedY = y - 10;
    }

    // Add element at calculated position
    setHasUnsavedChanges(true);
    setConfig(prev => {
      const maxZ = Math.max(0, ...Object.values(prev).map(c => c.zIndex || 0));
      const newConfig = {
        ...prev,
        [elementKey]: {
          ...template,
          x: adjustedX,
          y: adjustedY,
          zIndex: maxZ + 1,
        },
      };

      addToHistory(newConfig);
      return newConfig;
    });

    setDraggingElement(null);
    toast({ title: "Element added", description: `${template.label} added to canvas` });
  };

  // Add element to canvas
  // Toggle element - remove if exists, add if not
  const toggleElement = (elementKey: string) => {
    if (config[elementKey]) {
      // Element exists - remove it
      setHasUnsavedChanges(true);
      setConfig(prev => {
        const newConfig = { ...prev };
        delete newConfig[elementKey];
        return newConfig;
      });
      toast({ title: "Element removed", description: `Removed ${elementKey}`, duration: 2000 });
    } else {
      // Element doesn't exist - add it
      addElementToCanvas(elementKey);
    }
  };

  const addElementToCanvas = (elementKey: string, customPos?: { x: number, y: number }, customProps?: any) => {
    const template = ELEMENT_TEMPLATES[elementKey as keyof typeof ELEMENT_TEMPLATES];
    if (!template) return;

    // Use custom position if provided, otherwise center element
    let posX: number, posY: number;
    if (customPos) {
      const canvas = fabricCanvasRef.current;
      const canvasElement = canvasRef.current;
      if (canvas && canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const x = (customPos.x - rect.left) / zoom;
        const y = (customPos.y - rect.top) / zoom;

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
        posX = canvasWidth / 2;
        posY = canvasHeight / 2;
      }
    } else if (template.size) {
      posX = canvasWidth / 2 - template.size / 2;
      posY = canvasHeight / 2 - template.size / 2;
    } else if (template.width) {
      posX = canvasWidth / 2 - template.width / 2;
      posY = canvasHeight / 2 - 10;
    } else {
      posX = canvasWidth / 2;
      posY = canvasHeight / 2;
    }

    setHasUnsavedChanges(true);
    setConfig(prev => {
      const maxZ = Math.max(0, ...Object.values(prev).map(c => c.zIndex || 0));
      const newConfig = {
        ...prev,
        [elementKey]: {
          ...template,
          ...customProps, // Apply custom properties like shape
          x: posX,
          y: posY,
          zIndex: maxZ + 1,
        },
      };

      // Add to history with the NEW config
      addToHistory(newConfig);
      return newConfig;
    });

    toast({ title: "Element added", description: `${template.label} added to canvas` });
  };

  // Update element properties
  const updateElement = (elementKey: string, updates: Partial<ElementConfig>) => {
    setHasUnsavedChanges(true);
    setConfig(prev => {
      const newConfig = {
        ...prev,
        [elementKey]: {
          ...prev[elementKey],
          ...updates,
        },
      };

      // Update the fabric object directly for immediate visual feedback
      const fabricObj = elementRefs.current[elementKey];
      if (fabricObj && 'fontSize' in fabricObj) {
        const textObj = fabricObj as fabric.Text;

        if (updates.fontSize !== undefined) textObj.set('fontSize', updates.fontSize);
        if (updates.color !== undefined) textObj.set('fill', updates.color);
        if (updates.fontWeight !== undefined) textObj.set('fontWeight', updates.fontWeight);
        if (updates.fontStyle !== undefined) textObj.set('fontStyle', updates.fontStyle);
        if (updates.fontFamily !== undefined) textObj.set('fontFamily', updates.fontFamily);
        if (updates.textAlign !== undefined) textObj.set('textAlign', updates.textAlign);
        if (updates.underline !== undefined) textObj.set('underline', updates.underline);
        if (updates.lineHeight !== undefined) textObj.set('lineHeight', updates.lineHeight);
        if (updates.charSpacing !== undefined) textObj.set('charSpacing', updates.charSpacing);

        fabricCanvasRef.current?.requestRenderAll();
      }

      addToHistory(newConfig);
      return newConfig;
    });
  };

  // History management
  const addToHistory = (newConfig: CardConfig) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newConfig)));
      return newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setConfig(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const newZoom = Math.min(zoom + 0.1, 3);

    // Resize canvas display dimensions
    canvas.setDimensions({
      width: canvasWidth * newZoom,
      height: canvasHeight * newZoom
    });

    // Set zoom from top-left (0,0) to keep content positioned correctly
    canvas.setViewportTransform([newZoom, 0, 0, newZoom, 0, 0]);
    setZoom(newZoom);
    canvas.renderAll();
  };

  const handleZoomOut = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const newZoom = Math.max(zoom - 0.1, 0.1);

    // Resize canvas display dimensions
    canvas.setDimensions({
      width: canvasWidth * newZoom,
      height: canvasHeight * newZoom
    });

    // Set zoom from top-left (0,0) to keep content positioned correctly
    canvas.setViewportTransform([newZoom, 0, 0, newZoom, 0, 0]);
    setZoom(newZoom);
    canvas.renderAll();
  };

  const handleZoomFit = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setZoom(1);
    const objects = canvas.getObjects();

    if (objects.length === 0) {
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      setZoom(1);
      canvas.renderAll();
      return;
    }

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
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
    const zoomX = (canvasWidth - padding * 2) / contentWidth;
    const zoomY = (canvasHeight - padding * 2) / contentHeight;
    const newZoom = Math.min(zoomX, zoomY, 1);

    canvas.setZoom(newZoom);

    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;
    const viewportTransform = canvas.viewportTransform;
    if (viewportTransform) {
      viewportTransform[4] = canvasCenterX - contentCenterX * newZoom;
      viewportTransform[5] = canvasCenterY - contentCenterY * newZoom;
    }

    setZoom(newZoom);
    canvas.requestRenderAll();
  };

  // Background upload - no crop needed, canvas adjusts to image size
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }

    try {
      // Convert to data URL
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;

        // Load image to get dimensions
        const img = await loadImagePromise(dataUrl);

        // Update canvas dimensions to match background
        setCanvasWidth(img.width);
        setCanvasHeight(img.height);

        // Resize Fabric canvas
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.setDimensions({
            width: img.width,
            height: img.height,
          });
        }

        // Set background URL (will trigger re-render)
        setTemplateUrl(dataUrl);

        toast({
          title: "Background uploaded",
          description: `Canvas: ${img.width}x${img.height}. Use zoom controls if needed.`,
          duration: 3000
        });
      };
      reader.onerror = () => {
        
        toast({ title: "Upload failed", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      
      toast({ title: "Upload failed", variant: "destructive" });
    }

    // Clear file input so same file can be selected again
    e.target.value = '';
  };

  // Headshot upload
  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
    setCropMode("headshot");
    setCropDialogOpen(true);
  };

  // Logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
    setCropMode("logo");
    setCropDialogOpen(true);
  };

  const handleCropComplete = async (blob: Blob) => {
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(new Error("read error"));
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      if (cropMode === "template") {
        setTemplateUrl(dataUrl);
        toast({ title: "Background uploaded" });
      } else if (cropMode === "headshot") {
        setTestHeadshot(dataUrl);

        // Auto-add headshot element if it doesn't exist
        if (!config.headshot) {
          addElementToCanvas("headshot");
        }

        toast({ title: "Test headshot uploaded" });
      } else if (cropMode === "logo") {
        setTestLogo(dataUrl);

        // Auto-add logo element if it doesn't exist
        if (!config.companyLogo) {
          addElementToCanvas("companyLogo");
        }

        toast({ title: "Test logo uploaded" });
      }
    } catch (err) {
      
      toast({ title: "Image error", variant: "destructive" });
    } finally {
      setCropDialogOpen(false);
      setCropImageUrl("");
      setCropMode(null);
    }
  };

  // Save
  const handleSave = async () => {
    const storageKey = `${cardType}-card-config-${eventId || "default"}`;
    localStorage.setItem(storageKey, JSON.stringify({ config, templateUrl, canvasWidth, canvasHeight }));

    // Also save to backend if eventId exists
    if (eventId) {
      try {
        // Dynamically import API helpers so this file doesn't eagerly bundle all api methods
        const api = await import("@/lib/api");
        const { createPromoConfig, uploadFile } = api;

        // If templateUrl is a data: or blob: URL, upload it to the /uploads endpoint
        // and replace it with the returned public URL when saving to the server.
        let finalTemplateUrl = templateUrl;

        if (templateUrl && (templateUrl.startsWith("data:") || templateUrl.startsWith("blob:"))) {
          try {
            // Convert data/blob URL to a Blob, then to a File for upload
            const fetched = await fetch(templateUrl);
            const blob = await fetched.blob();
            const fileName = `template-${Date.now()}`;
            const file = new File([blob], `${fileName}.${(blob.type || "image/png").split("/").pop()}`, { type: blob.type || "image/png" });

            const uploadRes = await uploadFile(file, undefined, eventId);
            const uploadedUrl = uploadRes?.public_url ?? uploadRes?.publicUrl ?? uploadRes?.url ?? uploadRes?.id ?? null;

            if (uploadedUrl) {
              finalTemplateUrl = uploadedUrl;
              // update local state so UI reflects the server URL
              setTemplateUrl(finalTemplateUrl);
            }
          } catch (uploadErr) {
            
            // Continue and attempt to save the data URL if upload fails; notify user
            toast({ title: "Upload failed", description: "Could not upload background image to server. Saved locally instead.", variant: "destructive" });
          }
        }

        // Save the full config to the promo-cards API (include canvas dimensions for proper scaling)
        await createPromoConfig({
          eventId,
          promoType: cardType,
          config: {
            ...config,
            templateUrl: finalTemplateUrl, // Use uploaded URL when available
            canvasWidth, // Save canvas dimensions for scaling
            canvasHeight,
          },
        });

        toast({ title: "Saved", description: `${cardType === "promo" ? "Promo" : "Website"} card template saved` });
      } catch (err: any) {
        
        toast({ title: "Saved locally", description: "Template saved to browser, but failed to sync with server" });
      }
    } else {
      toast({ title: "Saved", description: `${cardType === "promo" ? "Promo" : "Website"} card saved locally` });
    }

    setHasUnsavedChanges(false);
  };

  // Export PNG
  const handleExport = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `${cardType}-card-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Exported", description: "Card downloaded as PNG" });
  };

  // Reset - clear everything and start fresh
  const handleReset = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset the card?\n\nThis will clear all elements and the background. This action cannot be undone."
    );

    if (!confirmed) return;

    // Clear config and template
    setConfig({});
    setTemplateUrl(null);
    setTestHeadshot(null);
    setTestLogo(null);
    setSelectedElement(null);

    // Clear localStorage
    const storageKey = `${cardType}-card-config-${eventId || "default"}`;
    localStorage.removeItem(storageKey);

    // Reset history
    setHistory([]);
    setHistoryIndex(-1);
    setHasUnsavedChanges(false);

    // Clear canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = "#ffffff";
      fabricCanvasRef.current.requestRenderAll();
    }

    toast({
      title: "Card reset",
      description: "Started with a fresh canvas",
      duration: 2000
    });
  };

  return (
    <>
      <Dialog open={missingFormDialogOpen} onOpenChange={setMissingFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Speaker Form Missing</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              A saved "Speaker Information" form wasn't found for this event. Please create and save the form first in your event's Forms tab.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMissingFormDialogOpen(false)}>Close</Button>
              <Button variant="destructive" onClick={() => { window.location.href = `/organizer/event/${eventId}/speakers?tab=forms`; }}>Open Forms</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={(open) => {
          setCropDialogOpen(open);
          if (!open) {
            setCropImageUrl("");
            setCropMode(null);
          }
        }}
        imageUrl={cropImageUrl}
        onCropComplete={handleCropComplete}
        aspectRatio={
          cropMode === "headshot"
            ? (config.headshot?.shape === "vertical" ? 3/4 : config.headshot?.shape === "horizontal" ? 4/3 : 1)
            : undefined
        }
        cropShape={
          cropMode === "headshot"
            ? (config.headshot?.shape || "circle")
            : "square"
        }
      />

      <div className="h-full w-full flex flex-col bg-background">
        {/* Top Bar - Canva Style */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-card/30">
          {/* Left: Card Type Toggle (hidden in fullscreen mode) */}
          {!fullscreen && (
            <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
              <button
                onClick={() => setCardType("promo")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  cardType === "promo"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Promo Card
              </button>
              <button
                onClick={() => setCardType("website")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  cardType === "website"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Website Card
              </button>
            </div>
          )}
          {fullscreen && <div></div>}

          {/* Center: Zoom + Undo/Redo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-md">
              <button onClick={handleZoomOut} disabled={zoom <= 0.1} className="p-1.5 rounded hover:bg-accent disabled:opacity-30">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium min-w-[3.5rem] text-center">{(zoom * 100).toFixed(0)}%</span>
              <button onClick={handleZoomIn} disabled={zoom >= 3} className="p-1.5 rounded hover:bg-accent disabled:opacity-30">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={handleZoomFit} className="p-1.5 rounded hover:bg-accent">
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded hover:bg-accent disabled:opacity-30">
                <Undo2 className="h-4 w-4" />
              </button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded hover:bg-accent disabled:opacity-30">
                <Redo2 className="h-4 w-4" />
              </button>
            </div>

            {/* Layers Panel */}
            <div className="relative">
              <button
                onClick={() => setLayersPanelOpen(!layersPanelOpen)}
                className="p-2 rounded hover:bg-accent"
                title="Layers"
              >
                <Layers className="h-4 w-4" />
              </button>

              {layersPanelOpen && (
                <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-lg shadow-xl p-3 z-50 w-64">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Layers</h3>
                    <button onClick={() => setLayersPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {Object.entries(config)
                      .sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0))
                      .map(([key, element]) => (
                        <div
                          key={key}
                          className={`flex items-center justify-between p-2 rounded text-sm hover:bg-accent cursor-pointer ${
                            selectedElement === key ? 'bg-accent' : ''
                          }`}
                          onClick={() => {
                            const canvas = fabricCanvasRef.current;
                            const obj = elementRefs.current[key];
                            if (canvas && obj) {
                              canvas.setActiveObject(obj);
                              canvas.renderAll();
                            }
                          }}
                        >
                          <span className="flex-1 truncate">{element.label || key}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateElement(key, { visible: !element.visible });
                              }}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {element.visible !== false ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3" />
                              )}
                            </button>
                            <div className="flex flex-col">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const entries = Object.entries(config);
                                  const currentIndex = entries.findIndex(([k]) => k === key);
                                  if (currentIndex > 0) {
                                    const [prevKey] = entries[currentIndex - 1];
                                    const newConfig = { ...config };
                                    const tempZ = newConfig[key].zIndex;
                                    newConfig[key].zIndex = newConfig[prevKey].zIndex;
                                    newConfig[prevKey].zIndex = tempZ;
                                    setConfig(newConfig);
                                  }
                                }}
                                className="p-0.5 hover:bg-muted rounded"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const entries = Object.entries(config);
                                  const currentIndex = entries.findIndex(([k]) => k === key);
                                  if (currentIndex < entries.length - 1) {
                                    const [nextKey] = entries[currentIndex + 1];
                                    const newConfig = { ...config };
                                    const tempZ = newConfig[key].zIndex;
                                    newConfig[key].zIndex = newConfig[nextKey].zIndex;
                                    newConfig[nextKey].zIndex = tempZ;
                                    setConfig(newConfig);
                                  }
                                }}
                                className="p-0.5 hover:bg-muted rounded"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Text Formatting - always visible, disabled when no text selected */}
            <>
              <div className="h-6 w-px bg-border" />

              {/* Text Style Controls - prevent canvas interference */}
              <div
                className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded-md"
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                  {/* Font Family */}
                  <select
                    value={selectedElement && config[selectedElement] ? (config[selectedElement].fontFamily || "Inter") : "Inter"}
                    onChange={(e) => selectedElement && updateElement(selectedElement, { fontFamily: e.target.value })}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className="h-7 px-2 text-xs border border-border rounded bg-background disabled:opacity-50"
                  >
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Raleway">Raleway</option>
                    <option value="Noto Sans">Noto Sans</option>
                    <option value="Source Sans Pro">Source Sans Pro</option>
                    <option value="Merriweather">Merriweather</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Nunito">Nunito</option>
                    <option value="Ubuntu">Ubuntu</option>
                    <option value="PT Sans">PT Sans</option>
                    <option value="Karla">Karla</option>
                    <option value="Oswald">Oswald</option>
                    <option value="Fira Sans">Fira Sans</option>
                    <option value="Work Sans">Work Sans</option>
                    <option value="Inconsolata">Inconsolata</option>
                    <option value="Josefin Sans">Josefin Sans</option>
                    <option value="Alegreya">Alegreya</option>
                    <option value="Cabin">Cabin</option>
                    <option value="Titillium Web">Titillium Web</option>
                    <option value="Mulish">Mulish</option>
                    <option value="Quicksand">Quicksand</option>
                    <option value="Anton">Anton</option>
                    <option value="Droid Sans">Droid Sans</option>
                    <option value="Archivo">Archivo</option>
                    <option value="Hind">Hind</option>
                    <option value="Bitter">Bitter</option>
                    <option value="Libre Franklin">Libre Franklin</option>
                  </select>

                  {/* Font Size */}
                  <Input
                    type="number"
                    value={selectedElement && config[selectedElement] ? (config[selectedElement].fontSize || 16) : 16}
                    onChange={(e) => {
                      if (!selectedElement) return;
                      // Allow free typing - update immediately
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        updateElement(selectedElement, { fontSize: val });
                      }
                    }}
                    onBlur={(e) => {
                      if (!selectedElement) return;
                      // Validate on blur - clamp to valid range
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        const clamped = Math.max(8, Math.min(120, val));
                        updateElement(selectedElement, { fontSize: clamped });
                      }
                    }}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className="w-14 h-7 text-xs text-center disabled:opacity-50"
                    min={8}
                    max={120}
                  />

                  <div className="h-4 w-px bg-border" />

                  {/* Bold */}
                  <button
                    onClick={() => {
                      if (!selectedElement) return;
                      const current = config[selectedElement]?.fontWeight || 400;
                      updateElement(selectedElement, { fontWeight: current === 700 ? 400 : 700 });
                    }}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className={`h-7 w-7 flex items-center justify-center rounded font-bold disabled:opacity-50 ${
                      selectedElement && config[selectedElement]?.fontWeight === 700 ? 'bg-primary text-primary-foreground' : 'hover:bg-accent border border-border'
                    }`}
                    title="Bold"
                  >
                    B
                  </button>
                  {/* Italic */}
                  <button
                    onClick={() => {
                      if (!selectedElement) return;
                      const current = config[selectedElement]?.fontStyle || "normal";
                      updateElement(selectedElement, { fontStyle: current === "italic" ? "normal" : "italic" });
                    }}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className={`h-7 w-7 flex items-center justify-center rounded italic disabled:opacity-50 ${
                      selectedElement && config[selectedElement]?.fontStyle === "italic" ? 'bg-primary text-primary-foreground' : 'hover:bg-accent border border-border'
                    }`}
                    title="Italic"
                  >
                    I
                  </button>
                  {/* Underline */}
                  <button
                    onClick={() => {
                      if (!selectedElement) return;
                      const current = config[selectedElement]?.underline || false;
                      updateElement(selectedElement, { underline: !current });
                    }}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className={`h-7 w-7 flex items-center justify-center rounded underline disabled:opacity-50 ${
                      selectedElement && config[selectedElement]?.underline ? 'bg-primary text-primary-foreground' : 'hover:bg-accent border border-border'
                    }`}
                    title="Underline"
                  >
                    U
                  </button>

                  <div className="h-4 w-px bg-border" />

                  {/* Text Align */}
                  <button
                    onClick={() => selectedElement && updateElement(selectedElement, { textAlign: "left" })}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className={`h-7 px-2 flex items-center justify-center rounded text-xs disabled:opacity-50 ${
                      selectedElement && config[selectedElement]?.textAlign === "left" ? 'bg-primary text-primary-foreground' : 'hover:bg-accent border border-border'
                    }`}
                    title="Align Text Left"
                  >
                    <AlignLeft className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => selectedElement && updateElement(selectedElement, { textAlign: "center" })}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className={`h-7 px-2 flex items-center justify-center rounded text-xs disabled:opacity-50 ${
                      selectedElement && config[selectedElement]?.textAlign === "center" ? 'bg-primary text-primary-foreground' : 'hover:bg-accent border border-border'
                    }`}
                    title="Align Text Center"
                  >
                    <AlignCenterHorizontal className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => selectedElement && updateElement(selectedElement, { textAlign: "right" })}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className={`h-7 px-2 flex items-center justify-center rounded text-xs disabled:opacity-50 ${
                      selectedElement && config[selectedElement]?.textAlign === "right" ? 'bg-primary text-primary-foreground' : 'hover:bg-accent border border-border'
                    }`}
                    title="Align Text Right"
                  >
                    <AlignRight className="h-3 w-3" />
                  </button>

                  <div className="h-4 w-px bg-border" />

                  {/* Color Picker */}
                  <input
                    type="color"
                    value={selectedElement && config[selectedElement] ? (config[selectedElement].color || "#000000") : "#000000"}
                    onChange={(e) => selectedElement && updateElement(selectedElement, { color: e.target.value })}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className="w-7 h-7 rounded border border-border cursor-pointer disabled:opacity-50"
                    title="Text Color"
                  />

                  <div className="h-4 w-px bg-border" />

                  {/* Line Height */}
                  <Input
                    type="number"
                    value={selectedElement && config[selectedElement] ? (config[selectedElement].lineHeight || 1.2) : 1.2}
                    onChange={(e) => {
                      if (!selectedElement) return;
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0.5 && val <= 3) {
                        updateElement(selectedElement, { lineHeight: val });
                      }
                    }}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className="w-12 h-7 text-xs text-center disabled:opacity-50"
                    step={0.1}
                    min={0.5}
                    max={3}
                    title="Line Height"
                  />

                  {/* Letter Spacing */}
                  <Input
                    type="number"
                    value={selectedElement && config[selectedElement] ? (config[selectedElement].charSpacing || 0) : 0}
                    onChange={(e) => {
                      if (!selectedElement) return;
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= -100 && val <= 500) {
                        updateElement(selectedElement, { charSpacing: val });
                      }
                    }}
                    disabled={!selectedElement || !["name", "title", "company"].includes(selectedElement)}
                    className="w-12 h-7 text-xs text-center disabled:opacity-50"
                    min={-100}
                    max={500}
                    title="Letter Spacing"
                  />
                </div>
              </>
          </div>

          {/* Right: Actions - Always visible */}
          <div className="flex gap-2">
            <Button onClick={handleReset} size="sm" variant="outline" className="text-destructive hover:text-destructive">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} size="sm" variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleExport} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Elements */}
          <div className="w-20 border-r bg-card/30 flex flex-col items-center py-4 gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors"
              title="Upload Background"
            >
              <ImageIcon className="h-5 w-5" />
              <span className="text-xs">Background</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" />

            <div className="h-px w-12 bg-border" />

            {shouldShowElement("headshot") && (
              <div className="relative">
                <button
                  draggable
                  onDragStart={(e) => handleDragStart(e, "headshot")}
                  onClick={() => setShapePopupOpen(!shapePopupOpen)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors cursor-move ${
                    config.headshot ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                  }`}
                  title="Drag to canvas or click for options"
                >
                  <Users className={`h-5 w-5 ${config.headshot ? 'text-primary' : ''}`} />
                  <span className={`text-xs ${config.headshot ? 'text-primary font-semibold' : ''}`}>Headshot</span>
                </button>

              {/* Shape selector popup */}
              {shapePopupOpen && (
                <div
                  className="fixed bg-card border border-border rounded-lg shadow-xl p-2 z-50 w-36"
                  style={{ left: shapePopupPosition.x, top: shapePopupPosition.y }}
                >
                  <div className="text-xs font-semibold mb-2 px-1">Select Shape</div>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "circle" });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded-full bg-muted border border-border"></div>
                    Circle
                  </button>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "square" });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded bg-muted border border-border"></div>
                    Square
                  </button>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "vertical" });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-3 h-4 rounded bg-muted border border-border"></div>
                    Vertical
                  </button>
                  <button
                    onClick={() => {
                      const dropPos = (window as any).__headshotDropPos;
                      addElementToCanvas("headshot", dropPos, { shape: "horizontal" });
                      setShapePopupOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2"
                  >
                    <div className="w-4 h-3 rounded bg-muted border border-border"></div>
                    Horizontal
                  </button>
                </div>
              )}
              </div>
            )}

            {shouldShowElement("name") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "name")}
                onClick={() => toggleElement("name")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors cursor-move ${
                  config.name ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                }`}
                title={config.name ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <Type className={`h-5 w-5 ${config.name ? 'text-primary' : ''}`} />
                <span className={`text-xs ${config.name ? 'text-primary font-semibold' : ''}`}>Name</span>
              </button>
            )}

            {shouldShowElement("title") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "title")}
                onClick={() => toggleElement("title")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors cursor-move ${
                  config.title ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                }`}
                title={config.title ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <Type className={`h-5 w-5 ${config.title ? 'text-primary' : ''}`} />
                <span className={`text-xs ${config.title ? 'text-primary font-semibold' : ''}`}>Title</span>
              </button>
            )}

            {shouldShowElement("company") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "company")}
                onClick={() => toggleElement("company")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors cursor-move ${
                  config.company ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                }`}
                title={config.company ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <Briefcase className={`h-5 w-5 ${config.company ? 'text-primary' : ''}`} />
                <span className={`text-xs ${config.company ? 'text-primary font-semibold' : ''}`}>Company</span>
              </button>
            )}

            {shouldShowElement("companyLogo") && (
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, "companyLogo")}
                onClick={() => toggleElement("companyLogo")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors cursor-move ${
                  config.companyLogo ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                }`}
                title={config.companyLogo ? "Click to remove" : "Drag to canvas or click to add"}
              >
                <ImageIcon className={`h-5 w-5 ${config.companyLogo ? 'text-primary' : ''}`} />
                <span className={`text-xs ${config.companyLogo ? 'text-primary font-semibold' : ''}`}>Logo</span>
              </button>
            )}

            {/* Dynamic fields from form builder */}
            {cardBuilderFields.length > 0 && (
              <>
                <div className="h-px w-12 bg-border" />
                {cardBuilderFields.map((field) => {
                  const Icon = getFieldIcon(field.id);
                  const fieldKey = `dynamic_${field.id}`;
                  const isActive = config[fieldKey];

                  return (
                    <button
                      key={field.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, fieldKey)}
                      onClick={() => {
                        if (isActive) {
                          // Remove if already exists
                          setHasUnsavedChanges(true);
                          setConfig(prev => {
                            const newConfig = { ...prev };
                            delete newConfig[fieldKey];
                            return newConfig;
                          });
                          toast({ title: "Element removed", description: `Removed ${field.label}`, duration: 2000 });
                        } else {
                          // Add if doesn't exist
                          const template = createDynamicElementTemplate(field, 0);
                          addElementToCanvas(fieldKey, undefined, template);
                        }
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors cursor-move ${
                        isActive ? 'bg-primary/10 border-2 border-primary/30' : 'hover:bg-accent'
                      }`}
                      title={isActive ? "Click to remove" : `Drag ${field.label} to canvas or click to add`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                      <span className={`text-xs ${isActive ? 'text-primary font-semibold' : ''}`}>
                        {field.label.length > 8 ? field.label.substring(0, 7) + '...' : field.label}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Center - Canvas */}
          <div
            ref={canvasContainerRef}
            className="flex-1 flex items-center justify-center bg-muted/10 p-8 relative overflow-auto"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Floating Zoom Controls - always visible */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg p-1.5 z-10">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.1}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium min-w-[3.5rem] text-center px-2">{(zoom * 100).toFixed(0)}%</span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-1.5 rounded hover:bg-accent disabled:opacity-30"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={handleZoomFit}
                className="p-1.5 rounded hover:bg-accent"
                title="Fit to View"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            <div className="border-2 border-border rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: "#f5f5f5" }}>
              <canvas ref={canvasRef} style={{ display: "block" }} />
            </div>

          </div>

          {/* Right Sidebar - Test Images */}
          {/*
            DEVELOPER NOTE (MVP): Test image uploads temporarily disabled for MVP.
            Gray placeholder boxes will be used for card design instead.

            Issue: Drop zone sizing and test image scaling need further refinement.
            When re-enabling, ensure:
            1. Gray placeholder fills entire selection box
            2. Test images match resized drop zone dimensions
            3. Scale compound logic works correctly on resize

            To re-enable: Uncomment the div below and test thoroughly.
          */}
          {/* <div className="w-64 border-l bg-card/30 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Test Images</h3>
              <p className="text-xs text-muted-foreground mb-3">Preview only (not saved)</p>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Headshot</Label>
              <input ref={headshotInputRef} type="file" accept="image/*" onChange={handleHeadshotUpload} className="hidden" />
              <Button onClick={() => headshotInputRef.current?.click()} variant="outline" size="sm" className="w-full">
                <Upload className="h-3 w-3 mr-2" />
                Upload Test Image
              </Button>
              {testHeadshot && (
                <div className="mt-2 relative">
                  <img src={testHeadshot} alt="Test headshot" className="w-full h-20 object-cover rounded" />
                  <button
                    onClick={() => setTestHeadshot(null)}
                    className="absolute top-1 right-1 p-1 bg-background rounded-full shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1 block">Company Logo</Label>
              <p className="text-xs text-muted-foreground mb-2">Drop zone for logos (free crop)</p>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <Button onClick={() => logoInputRef.current?.click()} variant="outline" size="sm" className="w-full">
                <Upload className="h-3 w-3 mr-2" />
                Upload Test Image
              </Button>
              {testLogo && (
                <div className="mt-2 relative">
                  <img src={testLogo} alt="Test logo" className="w-full h-20 object-cover rounded" />
                  <button
                    onClick={() => setTestLogo(null)}
                    className="absolute top-1 right-1 p-1 bg-background rounded-full shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div> */}
        </div>
      </div>
    </>
  );
}
