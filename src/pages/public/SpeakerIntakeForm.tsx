
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getJson, createSpeakerIntake, presignUpload, uploadFile, updateSpeaker } from "@/lib/api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  User,
  MapPin,
  CheckCircle,
  Upload,
} from "lucide-react";
import { useState } from "react";
import React from "react";
import type { FormFieldConfig } from "@/components/SpeakerFormBuilder";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { useRef } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Default fields for fallback when no form config exists
const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
  { id: "first_name", label: "First Name", type: "text", required: true, enabled: true },
  { id: "last_name", label: "Last Name", type: "text", required: true, enabled: true },
  { id: "email", label: "Email", type: "email", required: true, enabled: true },
  { id: "company_name", label: "Company Name", type: "text", required: false, enabled: false },
  { id: "company_role", label: "Role/Title", type: "text", required: false, enabled: false },
  { id: "bio", label: "Bio", type: "textarea", required: false, enabled: false },
  { id: "linkedin", label: "LinkedIn URL", type: "text", required: false, enabled: false },
  { id: "headshot", label: "Headshot", type: "file", required: false, enabled: false },
  { id: "company_logo", label: "Company Logo", type: "file", required: false, enabled: false },
];

// Build dynamic Zod schema based on enabled fields from form config
function buildDynamicSchema(fields: FormFieldConfig[]): z.ZodSchema {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.filter(f => f.enabled).forEach(field => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case "email":
        fieldSchema = z.string().email("Invalid email address");
        break;
      case "textarea":
        fieldSchema = z.string().min(10, `${field.label} must be at least 10 characters`).max(500);
        break;
      case "text":
      case "url":
        fieldSchema = z.string().min(1, `${field.label} is required`).max(250);
        break;
      case "file":
        // File fields are handled separately via state
        fieldSchema = z.any().optional();
        break;
      default:
        fieldSchema = z.string();
    }

    // Apply required check
    if (field.required) {
      // Already required via min(1)
    } else {
      fieldSchema = fieldSchema.optional();
    }

    shape[field.id] = fieldSchema;
  });

  return z.object(shape);
}

export default function SpeakerIntakeForm() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [headshot, setHeadshot] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>(DEFAULT_FORM_FIELDS);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"headshot" | "logo" | null>(null);
  const [formName, setFormName] = useState<string>("Speaker Information");
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const headshotInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const speakerId = search.get("speakerId") ?? undefined;
  const isEditing = Boolean(speakerId);

  // Load form config from localStorage (bridge until backend endpoint)
  React.useEffect(() => {
    if (eventId) {
      const savedConfig = localStorage.getItem(`speaker_form_config_${eventId}`);
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig) as FormFieldConfig[];
          setFormConfig(config);
        } catch (err) {
          console.error("Failed to parse form config", err);
          setFormConfig(DEFAULT_FORM_FIELDS);
        }
      } else {
        setFormConfig(DEFAULT_FORM_FIELDS);
      }
    }
  }, [eventId]);

  // Build dynamic schema based on enabled fields
  const dynamicSchema = buildDynamicSchema(formConfig);
  const defaultValues: Record<string, any> = {};
  formConfig.filter(f => f.enabled).forEach(field => {
    defaultValues[field.id] = "";
  });

  const form = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues,
  });

  const { data: fetchedSpeaker } = useQuery<any, Error>({
    queryKey: ["event", eventId, "speaker", speakerId],
    queryFn: () => getJson<any>(`/events/${eventId}/speakers/${speakerId}`),
    enabled: Boolean(eventId && speakerId),
  });

  React.useEffect(() => {
    const s = fetchedSpeaker as any;
    if (!s) return;
    const resetData: Record<string, any> = {};
    formConfig.forEach(f => {
      if (f.id === "first_name") resetData[f.id] = s.first_name ?? "";
      else if (f.id === "last_name") resetData[f.id] = s.last_name ?? "";
      else if (f.id === "email") resetData[f.id] = s.email ?? "";
      else if (f.id === "company_name") resetData[f.id] = s.company_name ?? "";
      else if (f.id === "company_role") resetData[f.id] = s.company_role ?? "";
      else if (f.id === "bio") resetData[f.id] = s.bio ?? "";
      else if (f.id === "linkedin") resetData[f.id] = s.linkedin ?? "";
    });
    form.reset(resetData);
    setHeadshotPreview(s.headshot_url ?? null);
    setCompanyLogoPreview(s.company_logo ?? null);
  }, [fetchedSpeaker, formConfig]);

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      const isHeadshot = cropType === "headshot";
      
      // Convert blob to file
      const file = new File([croppedBlob], `${cropType}.jpg`, { type: "image/jpeg" });
      
      if (isHeadshot) {
        setHeadshot(file);
      } else {
        setCompanyLogo(file);
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isHeadshot) {
          setHeadshotPreview(reader.result as string);
        } else {
          setCompanyLogoPreview(reader.result as string);
        }
        toast.success(`${isHeadshot ? "Headshot" : "Company logo"} ready to submit`);
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      toast.error(`Failed to process ${cropType}`);
    } finally {
      setCropImageUrl(null);
      setCropType(null);
    }
  };

  const onSubmit = async (data: any) => {
    console.log("Form data received:", data);
    console.log("Form config enabled fields:", formConfig.filter(f => f.enabled).map(f => f.id));
    setIsSubmitting(true);
    try {
      if (!eventId) {
        toast.error("Invalid event");
        setIsSubmitting(false);
        return;
      }

      const payload: Record<string, any> = {};

      // Map form data to API payload based on enabled fields
      formConfig.filter(f => f.enabled && f.type !== "file").forEach(field => {
        if (data[field.id] !== undefined) {
          // Transform snake_case to camelCase
          if (field.id === "first_name") {
            payload.firstName = data[field.id];
          } else if (field.id === "last_name") {
            payload.lastName = data[field.id];
          } else if (field.id === "company_name") {
            payload.companyName = data[field.id];
          } else if (field.id === "company_role") {
            payload.companyRole = data[field.id];
          } else {
            payload[field.id] = data[field.id];
          }
        }
      });

      if (headshot) {
        try {
          console.log("Uploading headshot:", headshot);
          const res = await uploadFile(headshot, "speaker", eventId!);
          const headshotUrl = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
          console.log("Headshot upload response:", res, "URL:", headshotUrl);
          payload.headshot = headshotUrl;
        } catch (err) {
          console.error("headshot upload failed", err);
        }
      }

      if (companyLogo) {
        try {
          console.log("Uploading company logo:", companyLogo);
          const res = await uploadFile(companyLogo, "speaker", eventId!);
          const logoUrl = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
          console.log("Logo upload response:", res, "URL:", logoUrl);
          payload.company_logo = logoUrl;
        } catch (err) {
          console.error("company logo upload failed", err);
        }
      }

      console.log("Final payload:", payload);

      if (isEditing && speakerId) {
        await updateSpeaker(eventId, speakerId, payload);
        toast.success("Speaker updated successfully!");
        navigate(`/organizer/event/${eventId}/speakers`);
      } else {
        await createSpeakerIntake(eventId, payload);
        setIsSubmitted(true);
      }
    } catch (e) {
      console.error("intake submit error", e);
      toast.error(String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data: eventData, isLoading: loadingEvent } = useQuery(
    {
      queryKey: ["event", eventId],
      queryFn: () => getJson<any>(`/events/${eventId}`),
      enabled: Boolean(eventId),
    }
  );

  // Group fields by section for better organization
  const personalFields = formConfig.filter(f => f.enabled && ["first_name", "last_name", "email", "linkedin"].includes(f.id));
  const companyFields = formConfig.filter(f => f.enabled && ["company_name", "company_role"].includes(f.id));
  const bioFields = formConfig.filter(f => f.enabled && f.id === "bio");
  const fileFields = formConfig.filter(f => f.enabled && f.type === "file");

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="p-6 lg:p-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Screen */}
          {isSubmitted ? (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
              <div className="w-full max-w-md space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-foreground">
                    Thank You!
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Your information has been successfully submitted. The event organizer will review your details and contact you about next steps.
                  </p>
                </div>
                <div className="pt-6">
                  <p className="text-xs text-muted-foreground">Powered by Seamless Events</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Form Header */}
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {formName} | {eventData?.title ?? (loadingEvent ? "Loading…" : "Event")}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Submit your information for use in the {eventData?.title ?? "event"} promotion
                </p>
                {(eventData?.location || eventData?.type) && (
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    {eventData?.location && (
                      <>
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{eventData.location}</span>
                      </>
                    )}
                    {eventData?.type && eventData?.location && <span>•</span>}
                    {eventData?.type && <span>{eventData.type}</span>}
                  </div>
                )}
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card rounded-lg border border-border p-8 space-y-6">
                <Form {...form}>
                  {/* Personal Details */}
                  {personalFields.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {personalFields.map(field => (
                          field.type !== "file" && (
                            <FormField
                              key={field.id}
                              control={form.control}
                              name={field.id}
                              render={({ field: formField }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium">
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                  </FormLabel>
                                  <FormControl>
                                    <Input className="text-sm" placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`} {...formField} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Company Details */}
                  {companyFields.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <h3 className="text-sm font-semibold text-foreground">Company Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {companyFields.map(field => (
                          <FormField
                            key={field.id}
                            control={form.control}
                            name={field.id}
                            render={({ field: formField }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium">
                                  {field.label}
                                  {field.required && <span className="text-destructive ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                  <Input className="text-sm" placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`} {...formField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {bioFields.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {bioFields.map(field => (
                        <FormField
                          key={field.id}
                          control={form.control}
                          name={field.id}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                              </FormLabel>
                              <FormControl>
                                <Textarea className="text-sm" placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`} rows={4} {...formField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Uploads */}
                  {fileFields.length > 0 && (
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
                            
                            {/* Preview Box */}
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

                            {/* Hidden File Input */}
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

                            {/* Upload/Replace Button */}
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
                            
                            {/* Preview Box - White bg for logos */}
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

                            {/* Hidden File Input */}
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

                            {/* Upload/Replace Button */}
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
                  )}
                </Form>
                {/* Crop Dialog */}
                {cropImageUrl && (
                  <ImageCropDialog
                    open={Boolean(cropImageUrl)}
                    onOpenChange={(open) => {
                      if (!open) {
                        setCropImageUrl(null);
                        setCropType(null);
                      }
                    }}
                    imageUrl={cropImageUrl}
                    aspectRatio={cropType === "headshot" ? 1 : NaN}
                    onCropComplete={handleCropComplete}
                    title={cropType === "headshot" ? "Crop Headshot" : "Crop Company Logo"}
                  />
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (isEditing ? "Updating…" : "Submitting…") : isEditing ? "Update" : "Submit"}
                  </Button>
                </div>
              </form>

              <p className="text-xs text-muted-foreground text-center">Powered by Seamless Events</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
