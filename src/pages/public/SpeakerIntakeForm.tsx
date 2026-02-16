
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  MapPin,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import React from "react";
const Uploads = React.lazy(() => import("@/components/speaker/Uploads"));
import type { FormFieldConfig } from "@/components/SpeakerFormBuilder";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { useRef } from "react";
import { generateUuid } from "@/lib/utils";

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

export default function SpeakerIntakeForm(props: { formPageType?: "speaker-intake" | "call-for-speakers" } = {}) {
  const { formPageType } = props;
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [headshot, setHeadshot] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
  const [customFiles, setCustomFiles] = useState<Record<string, File | null>>({});
  const [customFilePreviews, setCustomFilePreviews] = useState<Record<string, string | null>>({});
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

  // Determine page type from prop or URL. Defaults to `speaker-intake`.
  const pageType: "speaker-intake" | "call-for-speakers" = formPageType
    ?? (location.pathname.includes("/call-for-speakers") ? "call-for-speakers" : (location.pathname.includes("/speaker-intake") ? "speaker-intake" : "speaker-intake"));

  // Map the page type to the backend formType value
  const backendFormType = pageType === "speaker-intake" ? "speaker-info" : "call-for-speakers";

  // Load form config from backend for this event (fall back to defaults on error)
  React.useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    import("@/lib/api").then(({ getFormConfigForEvent }) => {
      getFormConfigForEvent(eventId, backendFormType)
        .then((res: any) => {
          if (!mounted) return;
          if (!res || !Array.isArray(res.config)) {
            setFormConfig(DEFAULT_FORM_FIELDS);
            return;
          }
          try {
            setFormConfig(res.config as FormFieldConfig[]);
          } catch (e) {
            setFormConfig(DEFAULT_FORM_FIELDS);
          }
        })
        .catch((err) => {
          setFormConfig(DEFAULT_FORM_FIELDS);
        });
    }).catch((err) => {
      setFormConfig(DEFAULT_FORM_FIELDS);
    });

    return () => { mounted = false; };
  }, [eventId, backendFormType]);

  // Load website/promo config for this event (used to pick crop shapes)
  React.useEffect(() => {
    if (!eventId) return;
    let mounted = true;
    import("@/lib/api").then(({ getWebsiteConfigForEvent }) => {
      getWebsiteConfigForEvent(eventId)
        .then((res) => {
          if (!mounted) return;
          setWebsiteConfig(res ?? null);
        })
        .catch(() => {
          if (!mounted) return;
          setWebsiteConfig(null);
        });
    }).catch(() => {
      if (!mounted) return;
      setWebsiteConfig(null);
    });

    return () => { mounted = false; };
  }, [eventId]);

  // Update the visible form name based on page type
  React.useEffect(() => {
    setFormName(pageType === "speaker-intake" ? "Speaker Information" : "Call for Speakers");
  }, [pageType]);

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

  // Use react-query to load website/promo config for this event (avoids race conditions)
  const { data: websiteConfig } = useQuery({
    queryKey: ["event", eventId, "websiteConfig"],
    queryFn: async () => getJson<any>(`/promo-cards/config/${encodeURIComponent(eventId!)}?promo_type=website`),
    enabled: Boolean(eventId),
    staleTime: 1000 * 60 * 5,
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

  const handleCustomFileSelected = (fieldId: string, file: File) => {
    setCustomFiles((prev) => ({ ...prev, [fieldId]: file }));
    // For preview, prefer filename. If image, also read data URL.
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomFilePreviews((prev) => ({ ...prev, [fieldId]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setCustomFilePreviews((prev) => ({ ...prev, [fieldId]: file.name }));
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);

    const speakerId = generateUuid(); // Generate a unique ID for the speaker (used for file uploads before we have a speaker record)

    try {
      if (!eventId) {
        toast.error("Invalid event");
        setIsSubmitting(false);
        return;
      }

      const payload: Record<string, any> = {};

      // Gather custom fields separately
      const customFields: Record<string, any> = {};

      // Map form data to API payload based on enabled fields (non-file fields)
      formConfig.filter(f => f.enabled).forEach(field => {
        if (field.type === "file") return;
        const val = data[field.id];
        if (val === undefined) return;

        // Standard top-level fields expected by backend
        if (field.id === "first_name") payload.firstName = val;
        else if (field.id === "last_name") payload.lastName = val;
        else if (field.id === "email") payload.email = val;
        else if (field.id === "company_name") payload.companyName = val;
        else if (field.id === "company_role") payload.companyRole = val;
        else if (field.id === "bio") payload.bio = val;
        else if (field.id === "linkedin") payload.linkedin = val;
        else {
          // Custom (non-file) fields go into customFields
          customFields[field.id] = val;
        }
      });

      // Prepare speaker display name for upload metadata
      const speakerDisplayName = `${data.first_name ?? payload.firstName ?? ""} ${data.last_name ?? payload.lastName ?? ""}`.trim();

      // Upload headshot if provided
      if (headshot) {
          try {
          
          const res = await uploadFile(headshot, speakerId, eventId!, speakerDisplayName);
          const headshotUrl = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
          payload.headshot = headshotUrl;
        } catch (err) {
          
        }
      }

      // Upload company logo if provided
      if (companyLogo) {
        try {
          
          const res = await uploadFile(companyLogo, speakerId, eventId!, speakerDisplayName);
          const logoUrl = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
          
          // Backend expects companyLogo (camelCase) as the alias
          payload.companyLogo = logoUrl;
        } catch (err) {
          
        }
      }

      // Upload any custom file fields (not headshot/company_logo) and attach to customFields
      const otherFileFields = formConfig.filter(f => f.enabled && f.type === "file" && f.id !== "headshot" && f.id !== "company_logo");
      for (const field of otherFileFields) {
        const file = customFiles[field.id];
        if (file) {
            try {
              
              const res = await uploadFile(file, speakerId, eventId!, speakerDisplayName);
              const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
              customFields[field.id] = url;
              
            } catch (err) {
              
            }
        }
      }

      // Attach customFields if any
      if (Object.keys(customFields).length > 0) {
        payload.customFields = customFields;
      }

      // Tell backend which form this submission is for (backend expects underscored form types)
      payload.formType = backendFormType;
      payload.id = speakerId; // Include the generated speaker ID in the payload for updates

      

      if (isEditing && speakerId) {
        await updateSpeaker(eventId, speakerId, payload);
        toast.success("Speaker updated successfully!");
        navigate(`/organizer/event/${eventId}/speakers`);
      } else {
        await createSpeakerIntake(eventId, payload);
        setIsSubmitted(true);
      }
    } catch (e) {
      
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
  const otherFields = formConfig.filter(f => f.enabled && !["first_name", "last_name", "email", "linkedin", "company_name", "company_role", "bio"].includes(f.id) && f.type !== "file");

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
                      <div className="grid grid-cols-1 gap-4">
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
                      <div className="grid grid-cols-1 gap-4">
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

                  {/* Additional / Custom Fields */}
                  {otherFields.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <h3 className="text-sm font-semibold text-foreground">Additional Information</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {otherFields.map(field => (
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
                                  {field.type === 'textarea' ? (
                                    <Textarea className="text-sm" placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`} rows={4} {...formField} />
                                  ) : (
                                    <Input className="text-sm" placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`} {...formField} />
                                  )}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Uploads */}
                  {fileFields.length > 0 && (
                    <>
                      {/* Lazy-loaded upload component to keep file smaller */}
                      <React.Suspense fallback={<div>Loading uploads…</div>}>
                        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                        {/* @ts-ignore-next-line */}
                        <Uploads
                          fileFields={fileFields}
                          formConfig={formConfig}
                          headshotPreview={headshotPreview}
                          companyLogoPreview={companyLogoPreview}
                          headshotInputRef={headshotInputRef}
                          logoInputRef={logoInputRef}
                          uploadingHeadshot={uploadingHeadshot}
                          uploadingLogo={uploadingLogo}
                          setCropImageUrl={setCropImageUrl}
                          setCropType={setCropType}
                          customFilePreviews={customFilePreviews}
                          onCustomFileSelected={handleCustomFileSelected}
                        />
                      </React.Suspense>
                    </>
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
                    cropShape={(() => {
                      // Default fallbacks
                      if (cropType === "headshot") {
                        return (websiteConfig?.config?.headshot?.shape as any) ?? "circle";
                      }
                      if (cropType === "logo") {
                        return (websiteConfig?.config?.companyLogo?.shape as any) ?? "square";
                      }
                      return "square";
                    })()}
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
