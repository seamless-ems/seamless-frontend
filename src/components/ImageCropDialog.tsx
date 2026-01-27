import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  aspectRatio?: number; // 1 for square, NaN for free aspect
  onCropComplete: (croppedImageBlob: Blob) => void;
  title?: string;
  instructions?: string;
  cropShape?: "circle" | "square";
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  aspectRatio = 1,
  onCropComplete,
  title = "Crop Image",
  instructions = "Drag to reposition, scroll to zoom, adjust to fit perfectly.",
  cropShape = "square",
}: ImageCropDialogProps) {
  const cropperRef = useRef<any>(null);

  useEffect(() => {
    // Auto-zoom out for large images when cropper is ready
    if (open && cropperRef.current?.cropper) {
      const cropper = cropperRef.current.cropper;
      
      // Use setTimeout to ensure cropper is fully initialized
      const timer = setTimeout(() => {
        try {
          if (typeof cropper.ready === 'function') {
            cropper.ready(() => {
              const imageData = cropper.getImageData();
              const containerData = cropper.getContainerData();

              // If image is much larger than container, zoom out for better view
              if (
                imageData.naturalWidth > containerData.width * 2 ||
                imageData.naturalHeight > containerData.height * 2
              ) {
                cropper.zoomTo(0.3); // Zoom out to 30% for very large images
              }
            });
          } else {
            // Fallback if ready method doesn't exist
            const imageData = cropper.getImageData();
            const containerData = cropper.getContainerData();
            if (
              imageData.naturalWidth > containerData.width * 2 ||
              imageData.naturalHeight > containerData.height * 2
            ) {
              cropper.zoomTo(0.3);
            }
          }
        } catch (err) {
          console.error('Error in cropper initialization:', err);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
      width: 800,
      height: aspectRatio === 1 ? 800 : undefined,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    if (!canvas) {
      console.error('Failed to get cropped canvas');
      return;
    }

    canvas.toBlob(
      (blob: Blob | null) => {
        if (blob) {
          onCropComplete(blob);
          onOpenChange(false);
        } else {
          console.error('Failed to convert canvas to blob');
        }
      },
      "image/jpeg",
      0.95
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p style={{ fontSize: 'var(--font-small)', color: 'var(--primary)' }}>
            {instructions}
          </p>
        </div>

        <style>{cropShape === "circle" ? `
          .cropper-crop-box {
            border-radius: 50% !important;
          }
          .cropper-view-box {
            border-radius: 50% !important;
          }
        ` : ''}</style>

        <div className="max-h-[500px] overflow-hidden rounded-lg bg-muted relative">
          <Cropper
            ref={cropperRef}
            src={imageUrl}
            style={{ height: 500, width: "100%" }}
            aspectRatio={aspectRatio}
            viewMode={1}
            dragMode="move"
            autoCropArea={0.65}
            restore={false}
            guides={cropShape === "circle" ? false : true}
            center={true}
            highlight={false}
            cropBoxMovable={true}
            cropBoxResizable={true}
            toggleDragModeOnDblclick={false}
            minContainerWidth={200}
            minContainerHeight={200}
            zoomable={true}
            zoomOnWheel={true}
            wheelZoomRatio={0.1}
            background={false}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCrop}>Apply Crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
