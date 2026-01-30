import { useState, useEffect, useRef } from "react";
import { Tldraw, Editor, createShapeId, TLImageShape } from "tldraw";
import "tldraw/tldraw.css";
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
import {
  ImageIcon,
  Type,
  Building2,
  User,
  Save,
  Upload,
  Download,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ImageCropDialog } from "@/components/ImageCropDialog";

// Default test data - matches PromoCardBuilder
const DEFAULT_TEST_DATA = {
  firstName: "Yakko",
  lastName: "Warner",
  title: "Chief Entertainment Officer",
  company: "ACME Inc",
  headshot: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yakko",
  companyLogo: "https://api.dicebear.com/7.x/icons/svg?seed=acme",
};

interface WebsiteCardBuilderProps {
  eventId?: string;
  onSave?: (template: any) => void;
}

interface TemplateConfig {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor?: string;
  backgroundImage?: string;
  snapshot?: any; // tldraw snapshot
}

export default function WebsiteCardBuilder({
  eventId,
  onSave,
}: WebsiteCardBuilderProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundAssetId, setBackgroundAssetId] = useState<string | null>(null);

  // TEST IMAGES - Not part of template, just for preview
  const [testHeadshot, setTestHeadshot] = useState<string | null>(null);
  const [testLogo, setTestLogo] = useState<string | null>(null);
  const [headshotShape, setHeadshotShape] = useState<"circle" | "square" | "rectangle">("circle");

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropMode, setCropMode] = useState<"background" | "headshot" | "logo" | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string>("");

  // File input refs
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load template from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("websiteCardTemplate");
    if (saved) {
      try {
        const template: TemplateConfig = JSON.parse(saved);
        setCanvasWidth(template.canvasWidth);
        setCanvasHeight(template.canvasHeight);
        setBackgroundColor(template.backgroundColor || "#ffffff");
        setBackgroundImageUrl(template.backgroundImage || null);

        // Load tldraw snapshot if available
        if (editor && template.snapshot) {
          editor.loadSnapshot(template.snapshot);
        }
      } catch (err) {
        console.error("Failed to load template:", err);
      }
    }
  }, [editor]);

  // Upload handlers (like PromoCardBuilder)
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setCropImageUrl(url);
      setCropMode("background");
      setCropDialogOpen(true);
    }
  };

  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setCropImageUrl(url);
      setCropMode("headshot");
      setCropDialogOpen(true);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setCropImageUrl(url);
      setCropMode("logo");
      setCropDialogOpen(true);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const url = URL.createObjectURL(croppedBlob);

    if (cropMode === "background") {
      // Load image to get dimensions
      const img = new Image();
      img.onload = async () => {
        setCanvasWidth(img.width);
        setCanvasHeight(img.height);
        setBackgroundImageUrl(url);

        // Add background to tldraw canvas as a locked image
        if (editor) {
          // Convert blob to data URL for tldraw
          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;

            // Create asset
            const assetId = createShapeId();
            await editor.createAssets([
              {
                id: assetId,
                type: 'image',
                typeName: 'asset',
                props: {
                  name: 'background',
                  src: dataUrl,
                  w: img.width,
                  h: img.height,
                  mimeType: 'image/png',
                  isAnimated: false,
                },
                meta: {},
              },
            ]);

            // Create image shape
            const shapeId = createShapeId();
            editor.createShape({
              id: shapeId,
              type: 'image',
              x: 0,
              y: 0,
              props: {
                w: img.width,
                h: img.height,
                assetId: assetId,
              },
            });

            // Lock the background so it can't be edited
            editor.updateShape({
              id: shapeId,
              type: 'image',
              isLocked: true,
            });

            setBackgroundAssetId(assetId.toString());
          };
          reader.readAsDataURL(croppedBlob);
        }

        toast({
          title: "Background uploaded",
          description: `Canvas resized to ${img.width}x${img.height}px`,
        });
      };
      img.src = url;
    } else if (cropMode === "headshot") {
      setTestHeadshot(url);
      if (headshotInputRef.current) headshotInputRef.current.value = "";
      toast({
        title: "Test headshot uploaded",
        description: "Click 'Headshot' to add to canvas",
      });
    } else if (cropMode === "logo") {
      setTestLogo(url);
      if (logoInputRef.current) logoInputRef.current.value = "";
      toast({
        title: "Test logo uploaded",
        description: "Click 'Logo' to add to canvas",
      });
    }

    setCropDialogOpen(false);
    setCropMode(null);
    setCropImageUrl("");
  };

  const handleRemoveBackground = () => {
    if (backgroundImageUrl && backgroundImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(backgroundImageUrl);
    }
    setBackgroundImageUrl(null);
    setBackgroundAssetId(null);
    if (backgroundInputRef.current) {
      backgroundInputRef.current.value = "";
    }
    // TODO: Remove background image from tldraw canvas
  };

  // Add element to canvas with test data
  const addElement = async (type: "name" | "title" | "company" | "headshot" | "logo") => {
    if (!editor) return;

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    switch (type) {
      case "name":
        {
          const id = createShapeId();
          editor.createShape({
            id,
            type: "geo",
            x: centerX - 150,
            y: centerY - 100,
            props: {
              geo: "rectangle",
              w: 300,
              h: 60,
              color: "black",
              fill: "none",
              dash: "draw",
              size: "l",
              font: "sans",
              text: `${DEFAULT_TEST_DATA.firstName} ${DEFAULT_TEST_DATA.lastName}`,
            },
          });
          toast({
            title: "Name added",
            description: "Drag to position, double-click to edit text",
          });
        }
        break;

      case "title":
        {
          const id = createShapeId();
          editor.createShape({
            id,
            type: "geo",
            x: centerX - 150,
            y: centerY - 20,
            props: {
              geo: "rectangle",
              w: 300,
              h: 40,
              color: "black",
              fill: "none",
              dash: "draw",
              size: "m",
              font: "sans",
              text: DEFAULT_TEST_DATA.title,
            },
          });
          toast({
            title: "Title added",
            description: "Drag to position, double-click to edit text",
          });
        }
        break;

      case "company":
        {
          const id = createShapeId();
          editor.createShape({
            id,
            type: "geo",
            x: centerX - 150,
            y: centerY + 40,
            props: {
              geo: "rectangle",
              w: 300,
              h: 40,
              color: "black",
              fill: "none",
              dash: "draw",
              size: "m",
              font: "sans",
              text: DEFAULT_TEST_DATA.company,
            },
          });
          toast({
            title: "Company added",
            description: "Drag to position, double-click to edit text",
          });
        }
        break;

      case "headshot":
        if (!testHeadshot) {
          toast({
            title: "Upload headshot first",
            description: "Please upload a test headshot image",
            variant: "destructive",
          });
          return;
        }

        // Convert blob URL to data URL for tldraw
        const headshotBlob = await fetch(testHeadshot).then(r => r.blob());
        const headshotReader = new FileReader();
        headshotReader.onload = async (e) => {
          const dataUrl = e.target?.result as string;

          // Create asset
          const assetId = createShapeId();
          await editor.createAssets([
            {
              id: assetId,
              type: 'image',
              typeName: 'asset',
              props: {
                name: 'headshot',
                src: dataUrl,
                w: 200,
                h: 200,
                mimeType: 'image/png',
                isAnimated: false,
              },
              meta: {},
            },
          ]);

          // Create image shape
          const shapeId = createShapeId();
          const size = headshotShape === "circle" ? 200 : headshotShape === "square" ? 200 : 300;
          const height = headshotShape === "rectangle" ? 200 : size;

          editor.createShape({
            id: shapeId,
            type: 'image',
            x: centerX - size / 2,
            y: centerY - height / 2,
            props: {
              w: size,
              h: height,
              assetId: assetId,
            },
          });

          toast({
            title: "Headshot added",
            description: `${headshotShape} headshot added to canvas`,
          });
        };
        headshotReader.readAsDataURL(headshotBlob);
        break;

      case "logo":
        if (!testLogo) {
          toast({
            title: "Upload logo first",
            description: "Please upload a test logo image",
            variant: "destructive",
          });
          return;
        }

        // Convert blob URL to data URL for tldraw
        const logoBlob = await fetch(testLogo).then(r => r.blob());
        const logoReader = new FileReader();
        logoReader.onload = async (e) => {
          const dataUrl = e.target?.result as string;

          // Create asset
          const assetId = createShapeId();
          await editor.createAssets([
            {
              id: assetId,
              type: 'image',
              typeName: 'asset',
              props: {
                name: 'logo',
                src: dataUrl,
                w: 150,
                h: 150,
                mimeType: 'image/png',
                isAnimated: false,
              },
              meta: {},
            },
          ]);

          // Create image shape
          editor.createShape({
            id: createShapeId(),
            type: 'image',
            x: centerX + 50,
            y: centerY - 75,
            props: {
              w: 150,
              h: 150,
              assetId: assetId,
            },
          });

          toast({
            title: "Logo added",
            description: "Logo added to canvas",
          });
        };
        logoReader.readAsDataURL(logoBlob);
        break;
    }
  };


  // Save template (layout config only, NOT test images)
  const handleSave = () => {
    if (!editor) return;

    const snapshot = editor.store.getSnapshot();
    const template: TemplateConfig = {
      canvasWidth,
      canvasHeight,
      backgroundColor,
      backgroundImage: backgroundImageUrl || undefined,
      snapshot,
    };

    localStorage.setItem("websiteCardTemplate", JSON.stringify(template));

    if (onSave) {
      onSave(template);
    }

    toast({
      title: "Template saved",
      description: "Website card template saved (test images not included)",
    });
  };

  // Export as image
  const handleExport = async () => {
    if (!editor) return;

    try {
      const svg = await editor.getSvg(Array.from(editor.getCurrentPageShapeIds()));
      if (!svg) {
        throw new Error("Failed to generate SVG");
      }

      // Convert SVG to PNG
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "website-card.png";
            a.click();
            URL.revokeObjectURL(url);
            toast({
              title: "Export successful",
              description: "Website card downloaded as PNG",
            });
          }
        });
      };
      img.src = `data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(svg))}`;
    } catch (err) {
      console.error("Export failed:", err);
      toast({
        title: "Export failed",
        description: "Failed to export website card",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Crop Dialog */}
      <ImageCropDialog
        isOpen={cropDialogOpen}
        onClose={() => {
          setCropDialogOpen(false);
          setCropMode(null);
          setCropImageUrl("");
        }}
        imageUrl={cropImageUrl}
        onCropComplete={handleCropComplete}
        aspectRatio={cropMode === "background" ? undefined : 1}
      />

      <div className="flex h-[calc(100vh-200px)] gap-4">
        {/* Left sidebar - Add Elements & Uploads */}
        <Card className="w-72 flex-shrink-0 overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-sm">Add Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add element buttons */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Click to Add</Label>
              <Button
                onClick={() => addElement("name")}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Type className="mr-2 h-4 w-4" />
                Name (Yakko Warner)
              </Button>
              <Button
                onClick={() => addElement("title")}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Type className="mr-2 h-4 w-4" />
                Title
              </Button>
              <Button
                onClick={() => addElement("company")}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Building2 className="mr-2 h-4 w-4" />
                Company
              </Button>
              <Button
                onClick={() => addElement("headshot")}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={!testHeadshot}
              >
                <User className="mr-2 h-4 w-4" />
                Headshot {!testHeadshot && "(upload first)"}
              </Button>
              <Button
                onClick={() => addElement("logo")}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={!testLogo}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Logo {!testLogo && "(upload first)"}
              </Button>
            </div>

            {/* Background upload */}
            <div className="border-t pt-4 space-y-2">
              <Label className="text-xs font-semibold">Background</Label>
              {backgroundImageUrl ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Canvas: {canvasWidth}x{canvasHeight}px
                  </div>
                  <Button
                    onClick={handleRemoveBackground}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove Background
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    onClick={() => backgroundInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Background
                  </Button>
                  <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <Label className="text-xs">Or set manually:</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Width</Label>
                        <Input
                          type="number"
                          value={canvasWidth}
                          onChange={(e) => setCanvasWidth(Number(e.target.value))}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height</Label>
                        <Input
                          type="number"
                          value={canvasHeight}
                          onChange={(e) => setCanvasHeight(Number(e.target.value))}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Test images upload */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-xs font-semibold">Test Images (Preview Only)</Label>
              <div className="space-y-2">
                <Label className="text-xs">Headshot Shape</Label>
                <Select
                  value={headshotShape}
                  onValueChange={(value: "circle" | "square" | "rectangle") =>
                    setHeadshotShape(value)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="rectangle">Rectangle (Horizontal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Upload Test Headshot</Label>
                <Button
                  onClick={() => headshotInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {testHeadshot ? "Replace Headshot" : "Upload Headshot"}
                </Button>
                <input
                  ref={headshotInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHeadshotUpload}
                  className="hidden"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Upload Test Logo</Label>
                <Button
                  onClick={() => logoInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {testLogo ? "Replace Logo" : "Upload Logo"}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Save/Export */}
            <div className="border-t pt-4 space-y-2">
              <Button onClick={handleSave} size="sm" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export PNG
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main canvas area */}
        <div className="flex-1 border rounded-lg overflow-hidden" style={{ backgroundColor }}>
          <Tldraw
            onMount={(editor) => {
              setEditor(editor);
            }}
          />
        </div>
      </div>
    </>
  );
}
