import React from "react";
import { toast } from "@/hooks/use-toast";
import { UploadCloud } from "lucide-react";
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
  customFilePreviews?: Record<string, string | null>;
  onCustomFileSelected?: (fieldId: string, file: File) => void;
};

type UploadRowProps = {
  label: string;
  required?: boolean;
  preview: string | null;
  uploading?: boolean;
  hint?: string;
  helpText?: string;
  isHeadshot?: boolean;
  onClick: () => void;
  inputEl: React.ReactNode;
};

function UploadRow({ label, required, preview, uploading, hint = "PNG or JPG", helpText, isHeadshot, onClick, inputEl }: UploadRowProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>

      <button
        type="button"
        onClick={onClick}
        disabled={uploading}
        className="w-full flex items-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className={`shrink-0 flex items-center justify-center overflow-hidden bg-background border border-border ${isHeadshot ? "w-12 h-12 rounded-full" : "w-16 h-10 rounded-md"}`}>
          {preview ? (
            <img src={preview} alt={label} className="w-full h-full object-cover" />
          ) : (
            <UploadCloud className="h-5 w-5 text-muted-foreground/50" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {uploading ? (
            <p className="text-sm text-muted-foreground">Uploading…</p>
          ) : preview ? (
            <>
              <p className="text-sm font-medium text-foreground">Image uploaded</p>
              <p className="text-xs text-muted-foreground mt-0.5">Click to replace</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Click to upload</p>
              <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
            </>
          )}
        </div>
      </button>

      {helpText && (
        <p className="text-xs text-muted-foreground leading-snug whitespace-pre-wrap">{helpText}</p>
      )}

      {inputEl}
    </div>
  );
}

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

  const makeImageHandler = (type: "headshot" | "logo") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PNG or JPEG", variant: "destructive" });
      e.currentTarget.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropImageUrl(reader.result as string);
      setCropType(type);
    };
    reader.readAsDataURL(file);
  };

  const hasHeadshot = fileFields.some(f => f.id === "headshot");
  const hasLogo = fileFields.some(f => f.id === "company_logo");
  const customFields = fileFields.filter(f => f.id !== "headshot" && f.id !== "company_logo");

  if (!hasHeadshot && !hasLogo && customFields.length === 0) return null;

  return (
    <div className="space-y-4 pt-2">
      <h3 className="text-sm font-semibold text-foreground">Uploads</h3>

      <div className="space-y-4">
        {hasHeadshot && (
          <UploadRow
            label={formConfig.find(f => f.id === "headshot")?.label ?? "Headshot"}
            required={formConfig.find(f => f.id === "headshot")?.required}
            helpText={formConfig.find(f => f.id === "headshot")?.helpText}
            preview={headshotPreview}
            uploading={uploadingHeadshot}
            hint="PNG or JPG"
            isHeadshot
            onClick={() => headshotInputRef.current?.click()}
            inputEl={
              <input
                ref={headshotInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={makeImageHandler("headshot")}
              />
            }
          />
        )}

        {hasLogo && (
          <UploadRow
            label={formConfig.find(f => f.id === "company_logo")?.label ?? "Company Logo"}
            required={formConfig.find(f => f.id === "company_logo")?.required}
            helpText={formConfig.find(f => f.id === "company_logo")?.helpText}
            preview={companyLogoPreview}
            uploading={uploadingLogo}
            hint="PNG or JPG"
            onClick={() => logoInputRef.current?.click()}
            inputEl={
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={makeImageHandler("logo")}
              />
            }
          />
        )}

        {customFields.map((field) => {
          const preview = customFilePreviews?.[field.id] ?? null;
          const isImagePreview = preview?.startsWith("data:image") || false;
          const configField = formConfig.find(f => f.id === field.id);
          return (
            <UploadRow
              key={field.id}
              label={field.label}
              required={configField?.required}
              helpText={configField?.helpText}
              preview={isImagePreview ? preview : null}
              hint="PNG or JPG"
              onClick={() => {
                const el = document.getElementById(`custom-file-${field.id}`) as HTMLInputElement | null;
                el?.click();
              }}
              inputEl={
                <>
                  {!isImagePreview && preview && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{preview}</p>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    id={`custom-file-${field.id}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!["image/png", "image/jpeg"].includes(file.type)) {
                        toast({ title: "Invalid file type", description: "Please upload a PNG or JPEG", variant: "destructive" });
                        (e.target as HTMLInputElement).value = "";
                        return;
                      }
                      onCustomFileSelected?.(field.id, file);
                    }}
                  />
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
