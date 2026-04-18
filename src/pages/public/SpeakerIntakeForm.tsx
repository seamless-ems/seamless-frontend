
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getJson, createSpeakerIntake, presignUpload, uploadFile, updateSpeaker, checkSpeakerExistsForEvent } from "@/lib/api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin } from "lucide-react";
import { useState } from "react";
import React from "react";
import { CircleLoader } from 'react-spinners';
import ContentUploads from "@/components/speaker/ContentUploads";
import { type FormFieldConfig, DEFAULT_FIELDS, mergeWithDefaults } from "@/components/SpeakerFormBuilder";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { useRef } from "react";
import { generateUuid } from "@/lib/utils";
import MissingFormDialog from "@/components/MissingFormDialog";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
const DUPLICATE_EMAIL_MESSAGE = "A speaker with this email already exists for this event.";


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
      case "radio":
        fieldSchema = z.string();
        break;
      case "checkbox":
        // If checkbox has options it's a multi-select array, otherwise a boolean
        if ((field as any).options && Array.isArray((field as any).options) && (field as any).options.length > 0) {
          fieldSchema = z.array(z.string());
        } else {
          fieldSchema = z.boolean();
        }
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

  // passthrough preserves fields that aren't in the initial schema (e.g. talk_title,
  // talk_description) — the form config loads async so useForm initialises before
  // those fields are enabled, and Zod's default behaviour strips unknown keys.
  return z.object(shape).passthrough();
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
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[]>(DEFAULT_FIELDS);
  const [formTitle, setFormTitle] = useState<string | null>(null);
  const [formSubtitle, setFormSubtitle] = useState<string | null>(null);
  const [showFormTitle, setShowFormTitle] = useState<boolean>(true);
  const [missingFormDialogOpen, setMissingFormDialogOpen] = useState<boolean>(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropType, setCropType] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>("Speaker Information");
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [existingEmailError, setExistingEmailError] = useState<string | null>(null);
  const [isCheckingExistingEmail, setIsCheckingExistingEmail] = useState(false);
  const [duplicateEmailModalOpen, setDuplicateEmailModalOpen] = useState(false);
  const headshotInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const emailCheckTimeoutRef = useRef<number | null>(null);
  const emailCheckRequestRef = useRef(0);
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
    const [missingDialogOpenSetter] = [null];
    import("@/lib/api").then(({ getFormConfigForEvent }) => {
      getFormConfigForEvent(eventId, backendFormType)
        .then((res: any) => {
          if (!mounted) return;
          if (!res || !res.config) {
            setFormConfig(DEFAULT_FIELDS);
            return;
          }
          try {
            // support legacy array shape or new object shape { fields, metadata }
            if (Array.isArray(res.config)) {
              setFormConfig(mergeWithDefaults(res.config as FormFieldConfig[]));
              // read optional metadata from top-level
              setFormTitle((res.title as string) || null);
              setFormSubtitle((res.subtitle as string) || null);
              const show = typeof res.showTitle === 'boolean' ? res.showTitle : (res.metadata?.showTitle ?? true);
              setShowFormTitle(Boolean(show));
            } else if (typeof res.config === 'object') {
              const cfg = res.config as any;
              const fieldsFromCfg = Array.isArray(cfg.fields) ? cfg.fields : DEFAULT_FIELDS;
              setFormConfig(mergeWithDefaults(fieldsFromCfg as FormFieldConfig[]));
              setFormTitle((cfg.metadata?.title as string) || null);
              setFormSubtitle((cfg.metadata?.subtitle as string) || null);
              setShowFormTitle(typeof cfg.metadata?.showTitle === 'boolean' ? cfg.metadata.showTitle : true);
            } else {
              setFormConfig(DEFAULT_FIELDS);
            }
          } catch (e) {
            setFormConfig(DEFAULT_FIELDS);
          }
        })
        .catch((err) => {
          if (err && (err.status === 404 || err?.status === 404)) {
            setMissingFormDialogOpen(true);
          }
          setFormConfig(DEFAULT_FIELDS);
        });
    }).catch((err) => {
      setFormConfig(DEFAULT_FIELDS);
    });

    return () => { mounted = false; };
  }, [eventId, backendFormType]);

  // Missing form dialog state handled above with `missingFormDialogOpen`/`setMissingFormDialogOpen`

  // Update the visible form name based on page type
  React.useEffect(() => {
    // only set default form name when not provided by config metadata
    if (!formTitle) setFormName(pageType === "speaker-intake" ? "Speaker Information" : "Call for Speakers");
  }, [pageType]);

  // Build dynamic schema based on enabled fields
  const dynamicSchema = buildDynamicSchema(formConfig);
  const defaultValues: Record<string, any> = {};
  formConfig.filter(f => f.enabled).forEach(field => {
    if (field.type === 'checkbox') {
      if ((field as any).options && Array.isArray((field as any).options) && (field as any).options.length > 0) {
        defaultValues[field.id] = [];
      } else {
        defaultValues[field.id] = false;
      }
    } else {
      defaultValues[field.id] = "";
    }
  });

  const form = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const emailFieldEnabled = React.useMemo(
    () => formConfig.some((field) => field.enabled && field.id === "email"),
    [formConfig]
  );
  const watchedEmail = String(form.watch("email" as any) ?? "");

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

  React.useEffect(() => {
    return () => {
      if (emailCheckTimeoutRef.current) {
        window.clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!eventId || !emailFieldEnabled) {
      emailCheckRequestRef.current += 1;
      setExistingEmailError(null);
      setIsCheckingExistingEmail(false);
      setDuplicateEmailModalOpen(false);
      return;
    }

    const cleanEmail = watchedEmail.trim().toLowerCase();
    const isValidEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail);
    const originalEmail = String((fetchedSpeaker as any)?.email ?? "").trim().toLowerCase();

    if (!cleanEmail || !isValidEmail || (isEditing && originalEmail && cleanEmail === originalEmail)) {
      emailCheckRequestRef.current += 1;
      setExistingEmailError(null);
      setIsCheckingExistingEmail(false);
      setDuplicateEmailModalOpen(false);
      if (emailCheckTimeoutRef.current) {
        window.clearTimeout(emailCheckTimeoutRef.current);
      }
      return;
    }

    if (emailCheckTimeoutRef.current) {
      window.clearTimeout(emailCheckTimeoutRef.current);
    }

    setIsCheckingExistingEmail(true);
    const requestId = emailCheckRequestRef.current + 1;
    emailCheckRequestRef.current = requestId;

    emailCheckTimeoutRef.current = window.setTimeout(async () => {
      try {
        const existsResult = await checkSpeakerExistsForEvent(eventId, cleanEmail);
        const exists = Boolean(existsResult?.exists);
        if (requestId !== emailCheckRequestRef.current) return;
        setExistingEmailError(exists ? DUPLICATE_EMAIL_MESSAGE : null);
        if (exists) setDuplicateEmailModalOpen(true);
      } catch {
        if (requestId !== emailCheckRequestRef.current) return;
        setExistingEmailError(null);
      } finally {
        if (requestId === emailCheckRequestRef.current) {
          setIsCheckingExistingEmail(false);
        }
      }
    }, 600);
  }, [eventId, emailFieldEnabled, watchedEmail, isEditing, fetchedSpeaker]);

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      const isHeadshot = cropType === "headshot";
      const isLogo = cropType === "logo";

      // Convert blob to file and preserve original mime/extension when possible
      const mime = (croppedBlob as Blob & { type?: string }).type || "image/jpeg";
      const rawExt = mime.includes("/") ? mime.split("/")[1] : "jpeg";
      const ext = rawExt.split("+")[0] === "jpeg" ? "jpg" : rawExt.split("+")[0];
      const fileName = `${cropType}.${ext}`;
      const file = new File([croppedBlob], fileName, { type: mime });

      if (isHeadshot) {
        setHeadshot(file);
      } else if (isLogo) {
        setCompanyLogo(file);
      } else if (cropType) {
        // Custom image field (e.g. company_logo_white)
        setCustomFiles((prev) => ({ ...prev, [cropType]: file }));
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isHeadshot) {
          setHeadshotPreview(reader.result as string);
        } else if (isLogo) {
          setCompanyLogoPreview(reader.result as string);
        } else if (cropType) {
          setCustomFilePreviews((prev) => ({ ...prev, [cropType]: reader.result as string }));
        }
        const label = isHeadshot ? "Headshot" : isLogo ? "Company logo" : formConfig.find(f => f.id === cropType)?.label ?? "Image";
        toast.success(`${label} ready to submit`);
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      toast.error(`Failed to process image`);
    } finally {
      setCropImageUrl(null);
      setCropType(null);
    }
  };

  const handleCustomFileSelected = (fieldId: string, file: File) => {
    setCustomFiles((prev) => ({ ...prev, [fieldId]: file }));
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

  const CROP_FIELD_IDS = new Set(["headshot", "company_logo", "company_logo_white"]);
  const GENERAL_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.html,.zip,.mp3,.wma,.mpg,.flv,.avi,.jpg,.jpeg,.png,.gif";

  const makeImageHandler = (type: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Please upload a PNG or JPEG");
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

  const onValidationError = (errors: Record<string, any>) => {
    const firstErrorId = formConfig
      .filter(f => f.enabled)
      .find(f => errors[f.id])?.id;
    if (firstErrorId) {
      const el = document.querySelector(`[name="${firstErrorId}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
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

      if (existingEmailError) {
        setDuplicateEmailModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      if (isCheckingExistingEmail) {
        toast.error("Please wait while we verify that email.");
        setIsSubmitting(false);
        return;
      }

      const submittedEmail = String(data.email ?? "").trim().toLowerCase();
      const isValidSubmittedEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(submittedEmail);
      const originalEmail = String((fetchedSpeaker as any)?.email ?? "").trim().toLowerCase();
      if (emailFieldEnabled && submittedEmail && isValidSubmittedEmail && !(isEditing && originalEmail && submittedEmail === originalEmail)) {
        const existsResult = await checkSpeakerExistsForEvent(eventId, submittedEmail);
        const exists = Boolean(existsResult?.exists);
        if (exists) {
          setExistingEmailError(DUPLICATE_EMAIL_MESSAGE);
          setDuplicateEmailModalOpen(true);
          setIsSubmitting(false);
          return;
        }
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
          // But map newly-first-class properties (company_logo_white) to top-level keys
          const fid = String(field.id || "").toLowerCase();
          if (fid === "company_logo_white" || fid === "companylogowhite") {
            payload.companyLogoWhite = val;
          } else if (fid === "talk_title") {
            payload.talkTitle = val;
          } else if (fid === "talk_description") {
            payload.talkDescription = val;
          } else {
            customFields[field.id] = val;
          }
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
      const otherFileFields = formConfig.filter(f => f.enabled && f.type === "file" && f.id !== "headshot" && f.id !== "company_logo" && f.id !== 'sample_content');
      for (const field of otherFileFields) {
        const file = customFiles[field.id];
        if (file) {
            try {
              
              const res = await uploadFile(file, speakerId, eventId!, speakerDisplayName);
              const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
              // If this file corresponds to a newly-supported top-level property, map it accordingly
              const fid = String(field.id || "").toLowerCase();
              if (fid === "company_logo_white" || fid === "companylogowhite") {
                payload.companyLogoWhite = url;
              } else if (fid === "talk_title") {
                payload.talkTitle = url;
              } else if (fid === "talk_description") {
                payload.talkDescription = url;
              } else {
                customFields[field.id] = url;
              }
              
            } catch (err) {
              
            }
        }

            // Handle contentItems (CreateContentSchema array)
            if (contentItems && contentItems.length > 0) {
              payload.content = payload.content || [];
              for (const it of contentItems) {
                if (it.file) {
                  try {
                    const res = await uploadFile(it.file, speakerId, eventId!, speakerDisplayName);
                    const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
                    if (!url) continue;
                    payload.content.push({ content: url, contentType: it.contentType || it.file.type || 'application/octet-stream', name: it.name || it.file.name });
                  } catch (err) {
                    // ignore individual content upload failures
                  }
                }
              }
            }
      }

      // Attach customFields if any
      // Move any remaining reserved keys out of customFields into top-level properties
      if (customFields["company_logo_white"]) {
        payload.companyLogoWhite = customFields["company_logo_white"];
        delete customFields["company_logo_white"];
      }
      if (customFields["talk_title"]) {
        payload.talkTitle = customFields["talk_title"];
        delete customFields["talk_title"];
      }
      if (customFields["talk_description"]) {
        payload.talkDescription = customFields["talk_description"];
        delete customFields["talk_description"];
      }

      if (Object.keys(customFields).length > 0) {
        payload.customFields = customFields;
      }

      // Tell backend which form this submission is for (backend expects underscored form types)
      payload.formType = backendFormType;
      payload.id = speakerId; // Include the generated speaker ID in the payload for updates

      

      if (isEditing && speakerId) {
        await updateSpeaker(eventId, speakerId, payload);
        toast.success("Speaker updated successfully!");
      } else {
        await createSpeakerIntake(eventId, payload);
        toast.success("Submission received successfully.");
      }
      navigate(`/organizer/event/${eventId}/speakers`);
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

  const enabledFields = formConfig.filter(f => f.enabled);

  return (
    <div className="min-h-screen bg-background">
      <MissingFormDialog open={missingFormDialogOpen} onOpenChange={setMissingFormDialogOpen} eventId={String(eventId)} />
      {/* Full-screen uploading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 bg-card/90 border border-border rounded-lg p-6">
            <CircleLoader size={60} color="#4e5ca6" />
            <div className="text-lg font-semibold">We are uploading — please wait</div>
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="p-6 lg:p-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {showFormTitle && (
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">{formTitle ?? formName}</h1>
              {formSubtitle && <p className="text-sm text-muted-foreground">{formSubtitle}</p>}
            </div>
          )}
          <form onSubmit={form.handleSubmit(onSubmit, onValidationError)} className="bg-card rounded-lg border border-border p-8 space-y-6">
                <Form {...form}>
                  {enabledFields.map(field => {
                    if (field.id === 'sample_content') {
                      return (
                        <div key={field.id} className="space-y-1.5">
                          <label className="text-sm font-medium leading-none">
                            {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
                          </label>
                          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                          <ContentUploads items={contentItems} setItems={setContentItems} readOnly={false} />
                        </div>
                      );
                    }

                    if (field.type === 'file') {
                      const isHeadshot = field.id === 'headshot';
                      const isLogo = field.id === 'company_logo';
                      const isCropField = CROP_FIELD_IDS.has(field.id);
                      const preview = isHeadshot ? headshotPreview : isLogo ? companyLogoPreview : (customFilePreviews?.[field.id] ?? null);
                      const uploading = isHeadshot ? uploadingHeadshot : isLogo ? uploadingLogo : false;
                      const isImagePreview = (isHeadshot || isLogo) ? !!preview : (preview?.startsWith('data:image') ?? false);
                      return (
                        <div key={field.id} className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">
                            {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
                          </label>
                          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                          <button
                            type="button"
                            onClick={() => {
                              if (isHeadshot) headshotInputRef.current?.click();
                              else if (isLogo) logoInputRef.current?.click();
                              else (document.getElementById(`custom-file-${field.id}`) as HTMLInputElement | null)?.click();
                            }}
                            disabled={uploading}
                            className="w-full flex items-center gap-2.5 px-3 h-10 rounded-md border border-input bg-background hover:border-primary text-sm text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <span>{uploading ? "Uploading…" : preview ? "Change file" : "Choose file"}</span>
                          </button>
                          {isImagePreview && preview && (
                            <div className={`overflow-hidden border border-border ${isHeadshot ? "w-12 h-12 rounded-full" : "w-16 h-10 rounded-md"}`}>
                              <img src={preview} alt={field.label} className="w-full h-full object-cover" />
                            </div>
                          )}
                          {!isImagePreview && preview && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{preview}</p>
                          )}
                          {isHeadshot && <input ref={headshotInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={makeImageHandler("headshot")} />}
                          {isLogo && <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={makeImageHandler("logo")} />}
                          {!isHeadshot && !isLogo && (
                            <input
                              type="file"
                              accept={isCropField ? "image/png,image/jpeg" : GENERAL_ACCEPT}
                              className="hidden"
                              id={`custom-file-${field.id}`}
                              onChange={isCropField ? makeImageHandler(field.id) : (e) => {
                                const f = e.target.files?.[0];
                                if (f) handleCustomFileSelected(field.id, f);
                              }}
                            />
                          )}
                        </div>
                      );
                    }

                    return (
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
                                <Textarea className="text-sm" placeholder={field.placeholder} rows={4} {...formField} />
                              ) : field.type === 'radio' ? (
                                <div className="space-y-2">
                                  {((field as any).options || []).map((opt: string) => (
                                    <label key={opt} className="flex items-center gap-2 text-sm">
                                      <input type="radio" name={field.id} value={opt} checked={formField.value === opt} onChange={() => formField.onChange(opt)} />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : field.type === 'checkbox' ? (
                                <div className="space-y-2">
                                  {((field as any).options || []).length > 0 ? (
                                    ((field as any).options || []).map((opt: string) => (
                                      <label key={opt} className="flex items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          name={`${field.id}.${opt}`}
                                          checked={Array.isArray(formField.value) && formField.value.includes(opt)}
                                          onChange={(e) => {
                                            const cur = Array.isArray(formField.value) ? [...formField.value] : [];
                                            if (e.target.checked) cur.push(opt); else { const idx = cur.indexOf(opt); if (idx > -1) cur.splice(idx, 1); }
                                            formField.onChange(cur);
                                          }}
                                        />
                                        <span>{opt}</span>
                                      </label>
                                    ))
                                  ) : (
                                    <label className="flex items-center gap-2 text-sm">
                                      <input type="checkbox" checked={Boolean(formField.value)} onChange={(e) => formField.onChange(e.target.checked)} />
                                      <span>{field.label}</span>
                                    </label>
                                  )}
                                </div>
                              ) : (
                                <Input className="text-sm" placeholder={field.placeholder} {...formField} />
                              )}
                            </FormControl>
                            <FormMessage />
                            {field.helpText && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{field.helpText}</p>}
                          </FormItem>
                        )}
                      />
                    );
                  })}
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
                    title={cropType === "headshot" ? "Crop Headshot" : `Crop ${formConfig.find(f => f.id === cropType)?.label ?? "Logo"}`}
                    cropShape={(() => {
                      // Default fallbacks
                      if (cropType === "headshot") {
                        return (websiteConfig?.config?.headshot?.shape as any) ?? "square";
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
        </div>
      </div>

      <AlertDialog open={duplicateEmailModalOpen} onOpenChange={setDuplicateEmailModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Speaker already exists</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive">
              A speaker with this email already exists for this event. Please log in and update your profile from the speaker dashboard instead of submitting a new intake form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const email = String(form.getValues("email" as any) ?? "").trim();
                const qs = email ? `?speakerEmail=${encodeURIComponent(email)}` : "";
                navigate(`/login${qs}`);
              }}
            >
              Log in to update profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
