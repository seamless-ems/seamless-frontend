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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Users, Save, Upload, X, Download, Copy, Trash2, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import Draggable from "react-draggable";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { toast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

// Default test data - users upload their own headshot and logo
const DEFAULT_TEST_DATA = {
  firstName: "Jane",
  lastName: "Smith",
  title: "VP of Marketing",
  company: "Your Company",
  headshot: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
  companyLogo: "https://api.dicebear.com/7.x/icons/svg?seed=yourcompany",
  linkedin: "linkedin.com/in/janesmith",
};

// Default element configurations
const DEFAULT_CONFIG = {
  headshot: {
    label: "Headshot",
    x: 50,
    y: 50,
    size: 80,
    visible: true,
    opacity: 1,
  },
  name: {
    label: "Name",
    x: 150,
    y: 50,
    fontSize: 24,
    fontFamily: "Inter",
    color: "#000000",
    fontWeight: 700,
    visible: true,
  },
  title: {
    label: "Title",
    x: 150,
    y: 90,
    fontSize: 14,
    fontFamily: "Inter",
    color: "#666666",
    fontWeight: 400,
    visible: true,
  },
  company: {
    label: "Company",
    x: 150,
    y: 115,
    fontSize: 12,
    fontFamily: "Inter",
    color: "#999999",
    fontWeight: 400,
    visible: true,
  },
  companyLogo: {
    label: "Company Logo",
    x: 50,
    y: 150,
    size: 60,
    visible: true,
    opacity: 1,
  },
  linkedin: {
    label: "LinkedIn Button",
    x: 150,
    y: 145,
    visible: true,
    bgColor: "#0A66C2",
  },
};

const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Libre Baskerville",
];

interface ElementConfig {
  [key: string]: any;
}

interface CardConfig {
  [key: string]: ElementConfig;
}

export default function PromoCardBuilder({ eventId }: { eventId?: string }) {
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [testHeadshot, setTestHeadshot] = useState<string>(DEFAULT_TEST_DATA.headshot);
  const [testLogo, setTestLogo] = useState<string>(DEFAULT_TEST_DATA.companyLogo);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropMode, setCropMode] = useState<"headshot" | "logo" | "template" | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string>("");
  const [templateIsGif, setTemplateIsGif] = useState(false);
  const [headshotCropShape, setHeadshotCropShape] = useState<"circle" | "square">("circle");
  const [alignGuides, setAlignGuides] = useState<{ x?: number; y?: number }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [elementZIndex, setElementZIndex] = useState<Record<string, number>>({
    headshot: 0,
    name: 1,
    title: 2,
    company: 3,
    companyLogo: 4,
    linkedin: 5,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const SNAP_THRESHOLD = 10; // pixels

  // Track unsaved changes whenever config changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [config, templateUrl, testHeadshot, testLogo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElement) return;

      // Delete key - remove element
      if (e.key === "Delete") {
        e.preventDefault();
        updateElement(selectedElement, { visible: false });
        setSelectedElement(null);
      }

      // Ctrl+D - duplicate element
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        const elem = config[selectedElement];
        updateElement(selectedElement, {
          x: elem.x + 10,
          y: elem.y + 10,
        });
      }

      // Arrow keys - nudge position
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        updateElement(selectedElement, { y: config[selectedElement].y - step });
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        updateElement(selectedElement, { y: config[selectedElement].y + step });
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        updateElement(selectedElement, { x: config[selectedElement].x - step });
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        updateElement(selectedElement, { x: config[selectedElement].x + step });
      }

      // Escape - deselect
      if (e.key === "Escape") {
        setSelectedElement(null);
        setEditingElement(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElement, config]);

  const updateElement = (element: string, updates: any) => {
    setConfig(prev => ({
      ...prev,
      [element]: { ...prev[element], ...updates },
    }));
  };

  const handleDragStop = (element: string, data: any) => {
    let finalX = data.x;
    let finalY = data.y;

    // Check alignment with other elements
    Object.entries(config).forEach(([key, cfg]) => {
      if (key === element) return;

      // Horizontal alignment (X)
      if (Math.abs(cfg.x - finalX) < SNAP_THRESHOLD) {
        finalX = cfg.x; // Snap to aligned element
      }

      // Vertical alignment (Y)
      if (Math.abs(cfg.y - finalY) < SNAP_THRESHOLD) {
        finalY = cfg.y; // Snap to aligned element
      }
    });

    updateElement(element, { x: finalX, y: finalY });
    setAlignGuides({}); // Clear guides after dropping
  };

  const handleDrag = (element: string, data: any) => {
    // Show alignment guides during drag
    const guides: { x?: number; y?: number } = {};

    Object.entries(config).forEach(([key, cfg]) => {
      if (key === element) return;

      // Check horizontal alignment
      if (Math.abs(cfg.x - data.x) < SNAP_THRESHOLD) {
        guides.x = cfg.x;
      }

      // Check vertical alignment
      if (Math.abs(cfg.y - data.y) < SNAP_THRESHOLD) {
        guides.y = cfg.y;
      }
    });

    setAlignGuides(guides);
  };

  const bringForward = (element: string) => {
    setElementZIndex(prev => ({
      ...prev,
      [element]: Math.max(...Object.values(prev)) + 1,
    }));
  };

  const sendBack = (element: string) => {
    setElementZIndex(prev => ({
      ...prev,
      [element]: Math.min(...Object.values(prev)) - 1,
    }));
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      
      // Check if it's a GIF by file extension and MIME type
      const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
      
      // For extra confidence on GIF detection, read first few bytes to check magic number
      if (!isGif && file.name.toLowerCase().endsWith(".gif")) {
        setTemplateIsGif(true);
      } else {
        setTemplateIsGif(isGif);
      }
      
      // Skip crop for background - let user define the shape
      // Use directly for all image types (GIF, PNG, JPG, etc.)
      setTemplateUrl(url);
      toast({
        title: "Background uploaded",
        description: "Your background will display at its natural aspect ratio.",
      });
    }
  };

  const handleRemoveTemplate = () => {
    if (templateUrl && templateUrl.startsWith("blob:")) {
      URL.revokeObjectURL(templateUrl);
    }
    setTemplateUrl(null);
    setTemplateFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      try {
        const url = URL.createObjectURL(file);
        
        // Check if it's a GIF - use directly without cropping to preserve animation
        if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
          setTestHeadshot(url);
          if (headshotInputRef.current) headshotInputRef.current.value = "";
          toast({
            title: "Headshot uploaded",
            description: "GIF animation will be preserved.",
          });
        } else {
          // For non-GIF images, show crop dialog
          setCropImageUrl(url);
          setCropMode("headshot");
          setCropDialogOpen(true);
        }
      } catch (err) {
        console.error("Error uploading headshot:", err);
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      try {
        const url = URL.createObjectURL(file);
        
        // Check if it's a GIF - use directly without cropping to preserve animation
        if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
          setTestLogo(url);
          if (logoInputRef.current) logoInputRef.current.value = "";
          toast({
            title: "Logo uploaded",
            description: "GIF animation will be preserved.",
          });
        } else {
          // For non-GIF images, show crop dialog
          setCropImageUrl(url);
          setCropMode("logo");
          setCropDialogOpen(true);
        }
      } catch (err) {
        console.error("Error uploading logo:", err);
      }
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    try {
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
    } catch (err) {
      console.error("Error completing crop:", err);
    }
  };

  const handleSaveConfiguration = () => {
    return new Promise<void>((resolvePromise) => {
      try {
        // Convert blob URLs to data URLs for persistence
        const convertBlobUrlToDataUrl = (blobUrl: string): Promise<string> => {
          return new Promise((resolve) => {
            if (!blobUrl.startsWith("blob:")) {
              // Already a data URL or regular URL
              resolve(blobUrl);
              return;
            }
            
            // Fetch the blob and convert to data URL
            fetch(blobUrl)
              .then(res => res.blob())
              .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  resolve(reader.result as string);
                };
                reader.readAsDataURL(blob);
              })
              .catch(() => {
                // If conversion fails, just use the blob URL (won't persist)
                resolve(blobUrl);
              });
          });
        };

        // Convert all blob URLs before saving
        Promise.all([
          convertBlobUrlToDataUrl(templateUrl || ""),
          convertBlobUrlToDataUrl(testHeadshot),
          convertBlobUrlToDataUrl(testLogo),
        ]).then(([template, headshot, logo]) => {
          const configData = {
            config,
            templateUrl: template || null,
            testHeadshot: headshot,
            testLogo: logo,
            templateIsGif: templateIsGif,
            headshotCropShape: headshotCropShape,
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
          // Ensure companyLogo is visible
          const updatedConfig = { ...configData.config };
          if (updatedConfig.companyLogo) {
            updatedConfig.companyLogo = { ...updatedConfig.companyLogo, visible: true };
          }
          setConfig(updatedConfig);
        }
        if (configData.templateUrl) {
          setTemplateUrl(configData.templateUrl);
        }
        if (configData.templateIsGif !== undefined) {
          setTemplateIsGif(configData.templateIsGif);
        }
        if (configData.headshotCropShape) {
          setHeadshotCropShape(configData.headshotCropShape);
        }
        if (configData.testHeadshot) {
          setTestHeadshot(configData.testHeadshot);
        }
        if (configData.testLogo) {
          setTestLogo(configData.testLogo);
        } else {
          // Fallback to default if not in storage
          setTestLogo(DEFAULT_TEST_DATA.companyLogo);
        }
      }
    } catch (err) {
      console.error("Error loading configuration:", err);
    }
    setHasUnsavedChanges(false); // Clear unsaved flag on initial load
  }, [eventId]);

  const handleDownloadWithCheck = async () => {
    if (hasUnsavedChanges) {
      setShowDownloadConfirm(true);
    } else {
      await handleDownloadPNG();
    }
  };

  const handleDownloadPNG = async () => {
    if (!canvasRef.current) return;
    setShowDownloadConfirm(false);
    
    try {
      toast({
        title: "Generating image",
        description: "Please wait while we capture your promo card...",
      });

      // Create an SVG representation of the card
      const svgWidth = 320;
      const svgHeight = 320;
      
      // Build SVG string with defs for clip paths
      let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`;
      
      // Add clip path definitions if headshot is circular
      if (config.headshot.visible && headshotCropShape === "circle") {
        const headshot = config.headshot;
        const radius = headshot.size / 2;
        svgContent += `<defs><clipPath id="clip-headshot"><circle cx="${headshot.x + radius}" cy="${headshot.y + radius}" r="${radius}"/></clipPath></defs>`;
      }
      
      // Add background
      if (templateUrl) {
        svgContent += `<image x="0" y="0" width="${svgWidth}" height="${svgHeight}" xlink:href="${templateUrl}" preserveAspectRatio="xMidYMid slice"/>`;
      } else {
        svgContent += `<rect width="${svgWidth}" height="${svgHeight}" fill="white"/>`;
      }
      
      // Add headshot
      if (config.headshot.visible && testHeadshot) {
        const size = config.headshot.size;
        const clipPath = headshotCropShape === "circle" ? ` clip-path="url(#clip-headshot)"` : "";
        svgContent += `<image x="${config.headshot.x}" y="${config.headshot.y}" width="${size}" height="${size}" xlink:href="${testHeadshot}" preserveAspectRatio="xMidYMid slice" opacity="${config.headshot.opacity}"${clipPath}/>`;
      }
      
      // Add name text
      if (config.name.visible) {
        svgContent += `<text x="${config.name.x}" y="${config.name.y + config.name.fontSize}" font-family="${config.name.fontFamily}" font-size="${config.name.fontSize}" font-weight="${config.name.fontWeight}" fill="${config.name.color}">${`${DEFAULT_TEST_DATA.firstName} ${DEFAULT_TEST_DATA.lastName}`}</text>`;
      }
      
      // Add title text
      if (config.title.visible) {
        svgContent += `<text x="${config.title.x}" y="${config.title.y + config.title.fontSize}" font-family="${config.title.fontFamily}" font-size="${config.title.fontSize}" font-weight="${config.title.fontWeight}" fill="${config.title.color}">${DEFAULT_TEST_DATA.title}</text>`;
      }
      
      // Add company text
      if (config.company.visible) {
        svgContent += `<text x="${config.company.x}" y="${config.company.y + config.company.fontSize}" font-family="${config.company.fontFamily}" font-size="${config.company.fontSize}" font-weight="${config.company.fontWeight}" fill="${config.company.color}">${DEFAULT_TEST_DATA.company}</text>`;
      }
      
      // Add company logo
      if (config.companyLogo.visible && testLogo) {
        const size = config.companyLogo.size;
        svgContent += `<image x="${config.companyLogo.x}" y="${config.companyLogo.y}" width="${size}" height="${size}" xlink:href="${testLogo}" preserveAspectRatio="xMidYMid slice" opacity="${config.companyLogo.opacity}"/>`;
      }
      
      // Add LinkedIn button
      if (config.linkedin.visible) {
        svgContent += `<rect x="${config.linkedin.x}" y="${config.linkedin.y}" width="35" height="35" rx="4" fill="${config.linkedin.bgColor}"/>`;
        svgContent += `<text x="${config.linkedin.x + 17.5}" y="${config.linkedin.y + 22}" font-family="Inter" font-size="14" font-weight="700" fill="white" text-anchor="middle">in</text>`;
      }
      
      svgContent += `</svg>`;
      
      // Convert SVG to canvas and then to PNG
      const canvas = document.createElement('canvas');
      canvas.width = svgWidth * 2;
      canvas.height = svgHeight * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (!blob) return;
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `promo-card-${new Date().getTime()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast({
            title: "Downloaded",
            description: "Your promo card has been saved as PNG.",
          });
        }, 'image/png');
      };
      img.onerror = () => {
        console.error("Error loading SVG for PNG conversion");
        toast({
          title: "Download failed",
          description: "There was an error converting your card to PNG.",
          variant: "destructive",
        });
      };
      
      // Convert SVG string to data URL
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      img.src = URL.createObjectURL(blob);
      
    } catch (err) {
      console.error("Error downloading PNG:", err);
      toast({
        title: "Download failed",
        description: "There was an error capturing your promo card.",
        variant: "destructive",
      });
    }
  };
  const selectedConfig = config[selectedElement];

  return (
    <div className="h-full w-full bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Promo Card Builder</h2>
        <div className="flex gap-2">
          <Button onClick={handleDownloadWithCheck} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download {templateIsGif ? "GIF" : "PNG"}
          </Button>
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Invite Collaborators
          </Button>
          <Button onClick={handleSaveConfiguration} className="gap-2">
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] gap-4 h-[calc(100vh-150px)]">
        {/* Canvas - Left Side (50%) */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Canvas</CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1"
                >
                  <Upload className="h-3 w-3" />
                  Background
                </button>
                {templateUrl && (
                  <button
                    onClick={handleRemoveTemplate}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <X className="h-3 w-3" />
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
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg overflow-auto">
            {/* Template Background */}
            <div
              ref={canvasRef}
              className="relative"
              style={{
                backgroundImage: templateUrl ? `url('${templateUrl}')` : "white",
                backgroundColor: "white",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                width: templateUrl ? "auto" : "320px",
                height: templateUrl ? "auto" : "320px",
                minWidth: "320px",
                minHeight: "320px",
                maxWidth: "600px",
                maxHeight: "600px",
                aspectRatio: "1",
              }}
            >
              {/* Headshot */}
              {config.headshot.visible && (
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <Draggable
                      position={{ x: config.headshot.x, y: config.headshot.y }}
                      onStop={(e, data) => handleDragStop("headshot", data)}
                      onDrag={(e, data) => handleDrag("headshot", data)}
                    >
                      <div
                        onClick={() => setSelectedElement("headshot")}
                        onMouseEnter={() => setHoveredElement("headshot")}
                        onMouseLeave={() => setHoveredElement(null)}
                        className={`absolute cursor-move border-2 overflow-hidden transition-all ${
                          headshotCropShape === "circle" ? "rounded-full" : "rounded-lg"
                        } ${
                          selectedElement === "headshot"
                            ? "border-blue-500 shadow-lg"
                            : hoveredElement === "headshot"
                              ? "border-blue-300 shadow-md"
                              : "border-transparent shadow-sm"
                        }`}
                        style={{
                          width: `${config.headshot.size}px`,
                          height: `${config.headshot.size}px`,
                          opacity: config.headshot.opacity,
                          zIndex: elementZIndex.headshot,
                        }}
                        title="Headshot"
                      >
                        <img
                          src={testHeadshot}
                          alt="Headshot"
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      </div>
                    </Draggable>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => updateElement("headshot", { visible: false })}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => bringForward("headshot")}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Bring Forward
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => sendBack("headshot")}>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Send Back
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )}

              {/* Name */}
              {config.name.visible && (
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <Draggable
                      position={{ x: config.name.x, y: config.name.y }}
                      onStop={(e, data) => handleDragStop("name", data)}
                      onDrag={(e, data) => handleDrag("name", data)}
                    >
                      <div
                        onClick={() => setSelectedElement("name")}
                        onDoubleClick={() => {
                          setEditingElement("name");
                          setEditText(`${DEFAULT_TEST_DATA.firstName} ${DEFAULT_TEST_DATA.lastName}`);
                        }}
                        onMouseEnter={() => setHoveredElement("name")}
                        onMouseLeave={() => setHoveredElement(null)}
                        className={`absolute cursor-move px-2 py-1 rounded border-2 transition-all ${
                          selectedElement === "name"
                            ? "border-blue-500 bg-blue-50"
                            : hoveredElement === "name"
                              ? "border-blue-300 bg-blue-25"
                              : "border-transparent"
                        }`}
                        style={{ zIndex: elementZIndex.name }}
                        title="Name (Double-click to edit)"
                      >
                      {editingElement === "name" ? (
                          <input
                            autoFocus
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => {
                              if (editText.trim()) {
                                updateElement("name", { 
                                  firstName: editText.split(" ")[0] || DEFAULT_TEST_DATA.firstName,
                                  lastName: editText.split(" ").slice(1).join(" ") || DEFAULT_TEST_DATA.lastName,
                                });
                              }
                              setEditingElement(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (editText.trim()) {
                                  updateElement("name", { 
                                    firstName: editText.split(" ")[0] || DEFAULT_TEST_DATA.firstName,
                                    lastName: editText.split(" ").slice(1).join(" ") || DEFAULT_TEST_DATA.lastName,
                                  });
                                }
                                setEditingElement(null);
                              }
                              if (e.key === "Escape") setEditingElement(null);
                            }}
                            className="bg-transparent border-none outline-none font-bold"
                            style={{
                              fontSize: `${config.name.fontSize}px`,
                              fontFamily: config.name.fontFamily,
                              color: config.name.color,
                              fontWeight: config.name.fontWeight,
                              margin: 0,
                            }}
                          />
                        ) : (
                          <p
                            style={{
                              fontSize: `${config.name.fontSize}px`,
                              fontFamily: config.name.fontFamily,
                              color: config.name.color,
                              fontWeight: config.name.fontWeight,
                              margin: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {`${DEFAULT_TEST_DATA.firstName} ${DEFAULT_TEST_DATA.lastName}`}
                          </p>
                        )}
                      </div>
                    </Draggable>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => updateElement("name", { visible: false })}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => bringForward("name")}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Bring Forward
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => sendBack("name")}>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Send Back
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )}

              {/* Title */}
              {config.title.visible && (
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <Draggable
                      position={{ x: config.title.x, y: config.title.y }}
                      onStop={(e, data) => handleDragStop("title", data)}
                      onDrag={(e, data) => handleDrag("title", data)}
                    >
                      <div
                        onClick={() => setSelectedElement("title")}
                        onDoubleClick={() => {
                          setEditingElement("title");
                          setEditText(DEFAULT_TEST_DATA.title);
                        }}
                        onMouseEnter={() => setHoveredElement("title")}
                        onMouseLeave={() => setHoveredElement(null)}
                        className={`absolute cursor-move px-2 py-1 rounded border-2 transition-all ${
                          selectedElement === "title"
                            ? "border-blue-500 bg-blue-50"
                            : hoveredElement === "title"
                              ? "border-blue-300 bg-blue-25"
                              : "border-transparent"
                        }`}
                        style={{ zIndex: elementZIndex.title }}
                        title="Title (Double-click to edit)"
                      >
                        {editingElement === "title" ? (
                          <input
                            autoFocus
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => setEditingElement(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingElement(null);
                              if (e.key === "Escape") setEditingElement(null);
                            }}
                            className="bg-transparent border-none outline-none"
                            style={{
                              fontSize: `${config.title.fontSize}px`,
                              fontFamily: config.title.fontFamily,
                              color: config.title.color,
                              margin: 0,
                            }}
                          />
                        ) : (
                          <p
                            style={{
                              fontSize: `${config.title.fontSize}px`,
                              fontFamily: config.title.fontFamily,
                              color: config.title.color,
                              fontWeight: config.title.fontWeight,
                              margin: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {DEFAULT_TEST_DATA.title}
                          </p>
                        )}
                      </div>
                    </Draggable>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => updateElement("title", { visible: false })}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => bringForward("title")}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Bring Forward
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => sendBack("title")}>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Send Back
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )}

              {/* Company */}
              {config.company.visible && (
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <Draggable
                      position={{ x: config.company.x, y: config.company.y }}
                      onStop={(e, data) => handleDragStop("company", data)}
                      onDrag={(e, data) => handleDrag("company", data)}
                    >
                      <div
                        onClick={() => setSelectedElement("company")}
                        onDoubleClick={() => {
                          setEditingElement("company");
                          setEditText(DEFAULT_TEST_DATA.company);
                        }}
                        onMouseEnter={() => setHoveredElement("company")}
                        onMouseLeave={() => setHoveredElement(null)}
                        className={`absolute cursor-move px-2 py-1 rounded border-2 transition-all ${
                          selectedElement === "company"
                            ? "border-blue-500 bg-blue-50"
                            : hoveredElement === "company"
                              ? "border-blue-300 bg-blue-25"
                              : "border-transparent"
                        }`}
                        style={{ zIndex: elementZIndex.company }}
                        title="Company (Double-click to edit)"
                      >
                        {editingElement === "company" ? (
                          <input
                            autoFocus
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => setEditingElement(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingElement(null);
                              if (e.key === "Escape") setEditingElement(null);
                            }}
                            className="bg-transparent border-none outline-none"
                            style={{
                              fontSize: `${config.company.fontSize}px`,
                              fontFamily: config.company.fontFamily,
                              color: config.company.color,
                              margin: 0,
                            }}
                          />
                        ) : (
                          <p
                            style={{
                              fontSize: `${config.company.fontSize}px`,
                              fontFamily: config.company.fontFamily,
                              color: config.company.color,
                              fontWeight: config.company.fontWeight,
                              margin: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {DEFAULT_TEST_DATA.company}
                          </p>
                        )}
                      </div>
                    </Draggable>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => updateElement("company", { visible: false })}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => bringForward("company")}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Bring Forward
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => sendBack("company")}>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Send Back
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )}

              {/* Company Logo */}
              {config.companyLogo.visible && (
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <Draggable
                      position={{ x: config.companyLogo.x, y: config.companyLogo.y }}
                      onStop={(e, data) => handleDragStop("companyLogo", data)}
                      onDrag={(e, data) => handleDrag("companyLogo", data)}
                    >
                      <div
                        onClick={() => setSelectedElement("companyLogo")}
                        onMouseEnter={() => setHoveredElement("companyLogo")}
                        onMouseLeave={() => setHoveredElement(null)}
                        className={`absolute cursor-move rounded-lg overflow-hidden bg-white border-2 transition-all ${
                          selectedElement === "companyLogo"
                            ? "border-blue-500 shadow-lg"
                            : hoveredElement === "companyLogo"
                              ? "border-blue-300 shadow-md"
                              : "border-transparent"
                        }`}
                        style={{
                          width: `${config.companyLogo.size}px`,
                          height: `${config.companyLogo.size}px`,
                          opacity: config.companyLogo.opacity,
                          zIndex: elementZIndex.companyLogo,
                        }}
                      >
                        <img
                          src={testLogo}
                          alt="Company Logo"
                          className="w-full h-full object-contain p-1"
                          crossOrigin="anonymous"
                        />
                      </div>
                    </Draggable>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => updateElement("companyLogo", { visible: false })}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => bringForward("companyLogo")}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Bring Forward
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => sendBack("companyLogo")}>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Send Back
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )}

              {/* LinkedIn Button */}
              {config.linkedin.visible && (
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <Draggable
                      position={{ x: config.linkedin.x, y: config.linkedin.y }}
                      onStop={(e, data) => handleDragStop("linkedin", data)}
                      onDrag={(e, data) => handleDrag("linkedin", data)}
                    >
                      <div
                        onClick={() => setSelectedElement("linkedin")}
                        onMouseEnter={() => setHoveredElement("linkedin")}
                        onMouseLeave={() => setHoveredElement(null)}
                        className={`absolute cursor-move px-2 py-1.5 rounded border-2 transition-all ${
                          selectedElement === "linkedin"
                            ? "border-blue-500"
                            : hoveredElement === "linkedin"
                              ? "border-blue-300"
                              : "border-transparent"
                        }`}
                        style={{ backgroundColor: config.linkedin.bgColor, zIndex: elementZIndex.linkedin }}
                        title="LinkedIn Button"
                      >
                        <span style={{ color: "white", fontSize: "14px", fontWeight: 700, margin: 0 }}>in</span>
                      </div>
                    </Draggable>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => updateElement("linkedin", { visible: false })}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => bringForward("linkedin")}>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Bring Forward
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => sendBack("linkedin")}>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Send Back
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )}

              {/* Alignment Guides */}
              {alignGuides.x !== undefined && (
                <div
                  style={{
                    position: "absolute",
                    left: `${alignGuides.x}px`,
                    top: 0,
                    width: "1px",
                    height: "100%",
                    backgroundColor: "#ff6b6b",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
              )}
              {alignGuides.y !== undefined && (
                <div
                  style={{
                    position: "absolute",
                    top: `${alignGuides.y}px`,
                    left: 0,
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#ff6b6b",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Middle Panel - Elements & Uploads */}
        <div className="space-y-4 overflow-y-auto">
          {/* Element Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(config).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`toggle-${key}`}
                    checked={config[key].visible}
                    onChange={(e) => updateElement(key, { visible: e.target.checked })}
                    className="w-3 h-3 cursor-pointer"
                  />
                  <button
                    onClick={() => setSelectedElement(key)}
                    className={`flex-1 px-2 py-1 rounded text-left text-xs font-medium transition-colors ${
                      selectedElement === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {config[key].label}
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Test Image Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* Headshot Crop Shape Toggle */}
              <div className="space-y-2 border-t pt-3 mt-3">
                <Label className="text-xs font-medium">Headshot Crop</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHeadshotCropShape("circle")}
                    className={`flex-1 px-2 py-1 rounded border-2 text-xs font-medium transition-colors ${
                      headshotCropShape === "circle"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    ◯ Circle
                  </button>
                  <button
                    onClick={() => setHeadshotCropShape("square")}
                    className={`flex-1 px-2 py-1 rounded border-2 text-xs font-medium transition-colors ${
                      headshotCropShape === "square"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    ◻ Square
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Properties & Help */}
        <div className="space-y-4 overflow-y-auto">

          {selectedConfig && selectedElement ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{selectedConfig.label}</CardTitle>
                  <button
                    onClick={() => setSelectedElement(null)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Deselect (Esc)"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {/* Visibility Toggle - Always Visible */}
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
                </div>

                {/* Position - Collapsible Section */}
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
                          value={selectedConfig.x}
                          onChange={(e) => updateElement(selectedElement, { x: parseFloat(e.target.value) })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Y</Label>
                        <Input
                          type="number"
                          value={selectedConfig.y}
                          onChange={(e) => updateElement(selectedElement, { y: parseFloat(e.target.value) })}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Size - Collapsible for Images */}
                {(selectedElement === "headshot" || selectedElement === "companyLogo") && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-1.5 text-xs font-medium hover:bg-muted/50 rounded">
                      <ChevronDown className="h-3 w-3 transition-transform" />
                      Size & Opacity
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2 pl-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Size</Label>
                        <Slider
                          value={[selectedConfig.size]}
                          onValueChange={(value) => updateElement(selectedElement, { size: value[0] })}
                          min={20}
                          max={200}
                          step={5}
                        />
                        <p className="text-xs text-muted-foreground text-right">{selectedConfig.size}px</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Opacity</Label>
                        <Slider
                          value={[selectedConfig.opacity]}
                          onValueChange={(value) => updateElement(selectedElement, { opacity: value[0] })}
                          min={0}
                          max={1}
                          step={0.1}
                        />
                        <p className="text-xs text-muted-foreground text-right">{(selectedConfig.opacity * 100).toFixed(0)}%</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Typography - Collapsible for Text Elements */}
                {(selectedElement === "name" || selectedElement === "title" || selectedElement === "company") && (
                  <Collapsible>
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
                        <Label className="text-xs text-muted-foreground">Size</Label>
                        <Slider
                          value={[selectedConfig.fontSize]}
                          onValueChange={(value) => updateElement(selectedElement, { fontSize: value[0] })}
                          min={8}
                          max={48}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground text-right">{selectedConfig.fontSize}px</p>
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
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Color - Collapsible Section */}
                {(selectedElement === "name" || selectedElement === "title" || selectedElement === "company") && (
                  <Collapsible>
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
                  <Collapsible>
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
                    Pick from the list to edit
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
                    <span className="text-muted-foreground">Edit</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono whitespace-nowrap">2x Click</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Delete</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Del</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Duplicate</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+D</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Nudge</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Arrows</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Nudge 10px</span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Shift+↑</kbd>
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
        aspectRatio={NaN}
        onCropComplete={handleCropComplete}
        cropShape={cropMode === "headshot" ? headshotCropShape : "square"}
        title={
          cropMode === "headshot"
            ? "Crop Headshot"
            : cropMode === "logo"
              ? "Crop Logo"
              : "Crop Background"
        }
        instructions={
          cropMode === "headshot"
            ? `Crop the headshot to a ${headshotCropShape}. Center your face and adjust the frame.`
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
