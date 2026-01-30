import { useState, useEffect, useRef } from "react";
import { Editor } from "tldraw";
import "tldraw/tldraw.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WebsiteCanvas from "@/components/website/WebsiteCanvas";
import { toast } from "@/hooks/use-toast";
import { ImageCropDialog } from "@/components/ImageCropDialog";

interface WebsiteCardBuilderProps {
  eventId?: string;
  onSave?: (template: any) => void;
}

interface TemplateConfig {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor?: string;
  backgroundImage?: string;
  snapshot?: any;
}

export default function WebsiteCardBuilder({ eventId, onSave }: WebsiteCardBuilderProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState("");
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("websiteCardTemplate");
      if (raw) {
        const t: TemplateConfig = JSON.parse(raw);
        if (t.backgroundColor) setBackgroundColor(t.backgroundColor);
        if (t.backgroundImage) setBackgroundImageUrl(t.backgroundImage);
        if (editor && (t.snapshot as any)) {
          try {
            (editor as any).loadSnapshot?.(t.snapshot);
          } catch (e) {
            console.warn("snapshot load failed", e);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load template", e);
    }
  }, [editor]);

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
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
      setBackgroundImageUrl(dataUrl);
    } catch (err) {
      console.error(err);
      toast({ title: "Image error", description: "Failed to process background image", variant: "destructive" });
    } finally {
      setCropDialogOpen(false);
      setCropImageUrl("");
    }
  };

  const handleSave = () => {
    try {
      const snapshot: any = (editor as any)?.store?.getSnapshot
        ? (editor as any).store.getSnapshot()
        : (editor as any).store?.snapshot ?? null;
      const template: TemplateConfig = {
        canvasWidth: 1024,
        canvasHeight: 768,
        backgroundColor,
        backgroundImage: backgroundImageUrl || undefined,
        snapshot,
      };
      localStorage.setItem("websiteCardTemplate", JSON.stringify(template));
      if (onSave) onSave(template);
      toast({ title: "Saved", description: "Template saved" });
    } catch (err) {
      console.error(err);
      toast({ title: "Save failed", description: "Could not save template", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    if (!editor) {
      toast({ title: "Editor not ready", description: "Wait for editor to mount", variant: "destructive" });
      return;
    }
    try {
      const anyEditor = editor as any;
      if (typeof anyEditor.getSvg === "function") {
        const shapeIds = Array.from((anyEditor.getCurrentPageShapeIds?.() ?? []));
        const svg = await anyEditor.getSvg(shapeIds);
        if (!svg) throw new Error("no svg");
        const xml = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 768;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "website-card.png";
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Exported", description: "Downloaded PNG" });
          });
        };
        img.src = `data:image/svg+xml;base64,${btoa(xml)}`;
      } else {
        toast({ title: "Export not supported", description: "This tldraw version doesn't support SVG export", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Export failed", description: "Could not export image", variant: "destructive" });
    }
  };

  return (
    <>
      <ImageCropDialog
        isOpen={cropDialogOpen}
        onClose={() => {
          setCropDialogOpen(false);
          setCropImageUrl("");
        }}
        imageUrl={cropImageUrl}
        onCropComplete={handleCropComplete}
        aspectRatio={undefined}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-2">
          <Label>Background</Label>
          <Button onClick={() => backgroundInputRef.current?.click()} variant="outline" size="sm">Upload</Button>
          <input ref={backgroundInputRef} type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" />
          <Label>Color</Label>
          <Input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-8 w-12" />
          <Button onClick={handleSave} size="sm">Save</Button>
          <Button onClick={handleExport} variant="outline" size="sm">Export PNG</Button>
        </div>

        <div style={{ height: 'calc(100vh - 140px)', position: 'relative' }}>
          <WebsiteCanvas onMount={(e) => setEditor(e)} backgroundColor={backgroundImageUrl ? undefined : backgroundColor} />
          {backgroundImageUrl && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          )}
        </div>
      </div>
    </>
  );
}
