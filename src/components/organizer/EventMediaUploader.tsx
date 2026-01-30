import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/ImageCropDialog";

type Props = {
  eventImageFile: File | null;
  setEventImageFile: (f: File | null) => void;
  eventImagePreview: string | null;
  setEventImagePreview: (p: string | null) => void;
  promoTemplateFile: File | null;
  setPromoTemplateFile: (f: File | null) => void;
  promoTemplatePreview: string | null;
  setPromoTemplatePreview: (p: string | null) => void;
  /** Enable cropping UI when an image is selected */
  enableCrop?: boolean;
  /** Aspect ratio for event image crop (default: undefined = free) */
  eventCropAspect?: number | undefined;
  /** Aspect ratio for promo template crop (default: undefined = free) */
  promoCropAspect?: number | undefined;
};

export default function EventMediaUploader({
  eventImageFile,
  setEventImageFile,
  eventImagePreview,
  setEventImagePreview,
  promoTemplateFile,
  setPromoTemplateFile,
  promoTemplatePreview,
  setPromoTemplatePreview,
  enableCrop = true,
  eventCropAspect,
  promoCropAspect,
}: Props) {
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"event" | "promo" | null>(null);

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      const fileName = cropTarget === "promo" ? "promo.jpg" : "event.jpg";
      const file = new File([croppedBlob], fileName, { type: "image/jpeg" });

      if (cropTarget === "promo") {
        setPromoTemplateFile(file);
        const url = URL.createObjectURL(file);
        setPromoTemplatePreview(url);
      } else {
        setEventImageFile(file);
        const url = URL.createObjectURL(file);
        setEventImagePreview(url);
      }
    } catch (err) {
      console.error("Failed to process cropped image", err);
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
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f) {
                setEventImageFile(null);
                setEventImagePreview(null);
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

        <div className="space-y-2">
          <Label htmlFor="promoTemplate">Promo Template (optional)</Label>
          <Input
            id="promoTemplate"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (!f) {
                setPromoTemplateFile(null);
                setPromoTemplatePreview(null);
                return;
              }

              if (enableCrop) {
                const reader = new FileReader();
                reader.onload = () => {
                  setCropImageUrl(reader.result as string);
                  setCropTarget("promo");
                };
                reader.readAsDataURL(f);
              } else {
                setPromoTemplateFile(f);
                setPromoTemplatePreview(URL.createObjectURL(f));
              }
            }}
            className="cursor-pointer"
          />
          {promoTemplatePreview && (
            <img src={promoTemplatePreview} alt="Promo preview" className="mt-3 max-h-32 rounded border" />
          )}
        </div>
      </div>
      {cropImageUrl && (
        <ImageCropDialog
          open={Boolean(cropImageUrl)}
          onOpenChange={(open) => { if (!open) { setCropImageUrl(null); setCropTarget(null); } }}
          imageUrl={cropImageUrl}
          aspectRatio={cropTarget === "event" ? eventCropAspect ?? NaN : promoCropAspect ?? NaN}
          onCropComplete={handleCropComplete}
          title={cropTarget === "event" ? "Crop Event Image" : "Crop Promo Template"}
          instructions={cropTarget === "event" ? "Crop the main event image." : "Crop the promo template."}
          cropShape={cropTarget === "event" ? "horizontal" : "horizontal"}
        />
      )}
    </div>
  );
}
