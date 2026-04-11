import React from "react";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import type { FormFieldConfig } from "@/components/SpeakerFormBuilder";

type Props = {
  fileFields: FormFieldConfig[];
  formConfig: FormFieldConfig[];
  headshotPreview: string | null;
  companyLogoPreview: string | null;
  headshotInputRef: React.RefObject<HTMLInputElement | null>;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  uploadingHeadshot: boolean;
  uploadingLogo: boolean;
  setCropImageUrl: (url: string | null) => void;
  setCropType: (t: "headshot" | "logo" | null) => void;
  // custom file handlers
  customFilePreviews?: Record<string, string | null>;
  onCustomFileSelected?: (fieldId: string, file: File) => void;
  readOnly?: boolean;
};

export default function Uploads(props: Props) {
  const {
    fileFields,
    formConfig,
    headshotPreview,
    companyLogoPreview,
    headshotInputRef,
    logoInputRef,
    uploadingHeadshot,
    uploadingLogo,
    setCropImageUrl,
    setCropType,
    customFilePreviews,
    onCustomFileSelected,
  } = props;

  return (
    <div className="space-y-4 pt-2">
      <h3 className="text-sm font-semibold text-foreground">Uploads</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Headshot Upload */}
        {fileFields.some(f => f.id === "headshot") && (
          <div className="text-center">
            <Label className="text-xs font-medium block mb-3">
              Headshot
              {formConfig.find(f => f.id === "headshot")?.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            <div className="relative w-full aspect-square rounded-lg border-2 border-border mb-3 overflow-hidden cursor-pointer bg-muted flex items-center justify-center">
              {headshotPreview ? (
                <img src={headshotPreview} alt="headshot preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No image selected</p>
                </div>
              )}
            </div>

            <input
              ref={headshotInputRef}
              type="file"
              accept="image/png,image/jpeg,image/avif"
              className="hidden"
              onChange={(e) => {
                if (props.readOnly) { e.currentTarget.value = ''; return; }
                const file = e.target.files?.[0];
                if (!file) return;
                const allowed = ["image/png", "image/jpeg", "image/avif"];
                if (!allowed.includes(file.type)) {
                  toast({ title: "Invalid file type", description: "Please upload a PNG, JPEG, or AVIF for headshot", variant: "destructive" });
                  e.currentTarget.value = '';
                  return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                  setCropImageUrl(reader.result as string);
                  setCropType("headshot");
                };
                reader.readAsDataURL(file);
              }}
            />

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { if (!props.readOnly) headshotInputRef.current?.click(); }}
              disabled={uploadingHeadshot || props.readOnly}
            >
              {uploadingHeadshot ? "Uploading..." : headshotPreview ? "Replace" : "Upload"}
            </Button>
          </div>
        )}

        {/* Company Logo Upload */}
        {fileFields.some(f => f.id === "company_logo") && (
          <div className="text-center">
            <Label className="text-xs font-medium block mb-3">
              Company Logo
              {formConfig.find(f => f.id === "company_logo")?.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            <div className="relative w-full aspect-square rounded-lg border-2 border-border mb-3 overflow-hidden cursor-pointer bg-white flex items-center justify-center p-3">
              {companyLogoPreview ? (
                <img src={companyLogoPreview} alt="company logo preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-center">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No image selected</p>
                </div>
              )}
            </div>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/avif"
              className="hidden"
              onChange={(e) => {
                if (props.readOnly) { e.currentTarget.value = ''; return; }
                const file = e.target.files?.[0];
                if (!file) return;
                const allowed = ["image/png", "image/jpeg", "image/avif"];
                if (!allowed.includes(file.type)) {
                  toast({ title: "Invalid file type", description: "Please upload a PNG, JPEG, or AVIF for logo", variant: "destructive" });
                  e.currentTarget.value = '';
                  return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                  setCropImageUrl(reader.result as string);
                  setCropType("logo");
                };
                reader.readAsDataURL(file);
              }}
            />

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { if (!props.readOnly) logoInputRef.current?.click(); }}
              disabled={uploadingLogo || props.readOnly}
            >
              {uploadingLogo ? "Uploading..." : companyLogoPreview ? "Replace" : "Upload"}
            </Button>
          </div>
        )}
      </div>
      {/* Generic custom file fields (not headshot/company_logo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
        {fileFields
          .filter(f => f.id !== "headshot" && f.id !== "company_logo")
          .map((field) => (
            <div key={field.id} className="text-center">
              <Label className="text-xs font-medium block mb-3">
                {field.label}
                {formConfig.find(f => f.id === field.id)?.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              <div className="relative w-full aspect-square rounded-lg border-2 border-border mb-3 overflow-hidden cursor-pointer bg-muted flex items-center justify-center">
                {customFilePreviews && customFilePreviews[field.id] ? (
                  // If preview looks like a data URL or an image URL, show an image; otherwise show filename
                  (customFilePreviews[field.id] || "").startsWith("data:") ? (
                    <img src={customFilePreviews[field.id] as string} alt={`${field.label} preview`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center px-4">
                      <p className="text-sm text-muted-foreground">{customFilePreviews[field.id]}</p>
                    </div>
                  )
                ) : (
                  <div className="text-center">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No image selected</p>
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/png,image/jpeg,image/avif"
                className="hidden"
                id={`custom-file-${field.id}`}
                onChange={(e) => {
                  if (props.readOnly) { (e.target as HTMLInputElement).value = ''; return; }
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const allowed = ["image/png", "image/jpeg", "image/avif"];
                  if (!allowed.includes(file.type)) {
                    toast({ title: "Invalid file type", description: "Please upload a PNG, JPEG, or AVIF image", variant: "destructive" });
                    (e.target as HTMLInputElement).value = '';
                    return;
                  }
                  onCustomFileSelected?.(field.id, file);
                }}
              />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (props.readOnly) return;
                  const el = document.getElementById(`custom-file-${field.id}`) as HTMLInputElement | null;
                  el?.click();
                }}
                disabled={props.readOnly}
              >
                {customFilePreviews && customFilePreviews[field.id] ? "Replace" : "Upload"}
              </Button>
            </div>
          ))}
      </div>
    </div>
  );
}
