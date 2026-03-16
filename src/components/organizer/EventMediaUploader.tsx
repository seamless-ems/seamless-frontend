import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ImageCropDialog } from "@/components/ImageCropDialog";

type Props = {
  eventImageFile: File | null;
  setEventImageFile: (f: File | null) => void;
  eventImagePreview: string | null;
  setEventImagePreview: (p: string | null) => void;
  /** Enable cropping UI when an image is selected */
  enableCrop?: boolean;
  /** Aspect ratio for event image crop (default: undefined = free) */
  eventCropAspect?: number | undefined;
};

export default function EventMediaUploader({
  eventImageFile,
  setEventImageFile,
  eventImagePreview,
  setEventImagePreview,
  enableCrop = true,
  eventCropAspect,
}: Props) {
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"event" | null>(null);

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      const mime = (croppedBlob as Blob & { type?: string }).type || "image/jpeg";
      const rawExt = mime.includes("/") ? mime.split("/")[1] : "jpeg";
      const ext = rawExt.split("+")[0] === "jpeg" ? "jpg" : rawExt.split("+")[0];
      const fileName = cropTarget === "promo" ? `promo.${ext}` : `event.${ext}`;
      const file = new File([croppedBlob], fileName, { type: mime });
      setEventImageFile(file);
      const url = URL.createObjectURL(file);
      setEventImagePreview(url);
    } catch (err) {
      
    } finally {
      setCropImageUrl(null);
      setCropTarget(null);
    }
  };
  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eventImage">Event Image</Label>
          <Input
            id="eventImage"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f) {
                setEventImageFile(null);
                setEventImagePreview(null);
                return;
              }
              const allowed = ["image/png", "image/jpeg"];
              if (!allowed.includes(f.type)) {
                toast({ title: "Invalid file type", description: "Please upload a PNG or JPEG image", variant: "destructive" });
                e.currentTarget.value = '';
                return;
              }

              if (enableCrop) {
                // open crop dialog with selected image
                const reader = new FileReader();
                reader.onload = () => {
                  setCropImageUrl(reader.result as string);
                  setCropTarget("event");
                };
                reader.readAsDataURL(f);
              } else {
                setEventImageFile(f);
                setEventImagePreview(URL.createObjectURL(f));
              }
            }}
            className="cursor-pointer"
          />
          {eventImagePreview && (
            <img src={eventImagePreview} alt="Event preview" className="mt-3 max-h-32 rounded border" />
          )}
        </div>
      </div>
      {cropImageUrl && (
        <ImageCropDialog
          open={Boolean(cropImageUrl)}
          onOpenChange={(open) => { if (!open) { setCropImageUrl(null); setCropTarget(null); } }}
          imageUrl={cropImageUrl}
          aspectRatio={eventCropAspect ?? NaN}
          onCropComplete={handleCropComplete}
          title={"Crop Event Image"}
          instructions={"Crop the main event image."}
          cropShape={"horizontal"}
        />
      )}
    </div>
  );
}
