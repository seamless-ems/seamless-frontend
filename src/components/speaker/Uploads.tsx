import React from "react";
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
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
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
              onClick={() => headshotInputRef.current?.click()}
              disabled={uploadingHeadshot}
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
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
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
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? "Uploading..." : companyLogoPreview ? "Replace" : "Upload"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
