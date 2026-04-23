import React from "react";
import { toast } from "@/hooks/use-toast";
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
  setCropType: (t: string | null) => void;
  customFilePreviews?: Record<string, string | null>;
  onCustomFileSelected?: (fieldId: string, file: File) => void;
  readOnly?: boolean;
};

type UploadRowProps = {
  label: string;
  required?: boolean;
  preview: string | null;
  uploading?: boolean;
  helpText?: string;
  isHeadshot?: boolean;
  onClick: () => void;
  inputEl: React.ReactNode;
};

function UploadRow({ label, required, preview, uploading, helpText, isHeadshot, onClick, inputEl }: UploadRowProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      <button
        type="button"
        onClick={onClick}
        disabled={uploading}
        className="w-full flex items-center gap-2.5 px-3 h-10 rounded-md border border-input bg-background hover:border-accent text-sm text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        <span>{uploading ? "Uploading…" : preview ? "Change file" : "Choose file"}</span>
      </button>
      {preview && (
        <div className={`overflow-hidden border border-border ${isHeadshot ? "w-12 h-12 rounded-full" : "w-16 h-10 rounded-md"}`}>
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        </div>
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

  const makeImageHandler = (type: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const CROP_FIELD_IDS = new Set(["headshot", "company_logo", "company_logo_white"]);

  const hasHeadshot = fileFields.some(f => f.id === "headshot");
  const hasLogo = fileFields.some(f => f.id === "company_logo");
  const customFields = fileFields.filter(f => f.id !== "headshot" && f.id !== "company_logo");

  if (!hasHeadshot && !hasLogo && customFields.length === 0) return null;

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-4">
        {hasHeadshot && (
          <UploadRow
            label={formConfig.find(f => f.id === "headshot")?.label ?? "Headshot"}
            required={formConfig.find(f => f.id === "headshot")?.required}
            helpText={formConfig.find(f => f.id === "headshot")?.helpText}
            preview={headshotPreview}
            uploading={uploadingHeadshot}
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
          const usesCropper = CROP_FIELD_IDS.has(field.id);
          const isImageField = usesCropper;
          const GENERAL_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.html,.zip,.mp3,.wma,.mpg,.flv,.avi,.jpg,.jpeg,.png,.gif";
          return (
            <UploadRow
              key={field.id}
              label={field.label}
              required={configField?.required}
              helpText={configField?.helpText}
              preview={isImagePreview ? preview : null}
              hint={isImageField ? "PNG or JPG" : "PDF, DOC, XLS, MP3, MP4, ZIP and more"}
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
                    accept={isImageField ? "image/png,image/jpeg" : GENERAL_ACCEPT}
                    className="hidden"
                    id={`custom-file-${field.id}`}
                    onChange={usesCropper ? makeImageHandler(field.id) : (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
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
