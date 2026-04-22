import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import MissingFormDialog from "@/components/MissingFormDialog";
import ContentUploads from "@/components/speaker/ContentUploads";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Lock, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface FormFieldConfig {
  id: string;
  label: string;
  type: "text" | "textarea" | "email" | "file" | "url" | "radio" | "checkbox";
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  custom?: boolean;
  helpText?: string;
  showInCardBuilder?: boolean;
  options?: string[];
  formTypes?: string[]; // if set, field only appears on these form types
  locked?: boolean; // always on, cannot be toggled or removed
  sectionStart?: string; // renders a labelled divider before this field
}

interface SpeakerFormBuilderProps {
  eventId: string;
  initialConfig?: FormFieldConfig[];
  formType?: string;
  formName?: string;
  eventName?: string;
  onBack?: () => void;
  onSave?: (config: FormFieldConfig[]) => void;
  readOnly?: boolean;
}

export interface SpeakerFormBuilderHandle {
  save: () => void;
  isDirty: boolean;
}

export const DEFAULT_FIELDS: FormFieldConfig[] = [
  // --- Identity (locked, always on) ---
  {
    id: "first_name",
    label: "First Name",
    type: "text",
    required: true,
    enabled: true,
    locked: true,
  },
  {
    id: "last_name",
    label: "Last Name",
    type: "text",
    required: true,
    enabled: true,
    locked: true,
  },
  {
    id: "email",
    label: "Email",
    type: "email",
    required: true,
    enabled: true,
    locked: true,
  },
  // --- Media (on by default) ---
  {
    id: "headshot",
    label: "Headshot",
    type: "file",
    required: true,
    enabled: true,
  },
  {
    id: "company_logo",
    label: "Company Logo — Colour",
    type: "file",
    required: true,
    enabled: true,
    helpText: "Please submit on a transparent background.",
  },
  {
    id: "company_logo_white",
    label: "Company Logo — White",
    type: "file",
    required: true,
    enabled: true,
    helpText: "Please submit on a transparent background.",
  },
  // --- Profile (on by default) ---
  {
    id: "company_role",
    label: "Title",
    type: "text",
    required: false,
    enabled: true,
  },
  {
    id: "company_name",
    label: "Company Name",
    type: "text",
    required: false,
    enabled: true,
  },
  // --- Off by default ---
  {
    id: "linkedin",
    label: "LinkedIn URL",
    type: "text",
    required: false,
    enabled: false,
  },
  {
    id: "bio",
    label: "Bio",
    type: "textarea",
    required: false,
    enabled: false,
  },
  // --- Talk / Session (off by default) ---
  {
    id: "talk_title",
    label: "Talk / Session Title",
    type: "text",
    required: false,
    enabled: false,
    formTypes: ["speaker-info"],
    sectionStart: "Talk / Session",
  },
  {
    id: "talk_description",
    label: "Talk / Session Description",
    type: "textarea",
    required: false,
    enabled: false,
    formTypes: ["speaker-info"],
  },
  // --- Call for Speakers only ---
  {
    id: "talk_topic",
    label: "Talk / Session Topic",
    type: "text",
    required: false,
    enabled: false,
    formTypes: ["call-for-speakers"],
    sectionStart: "Talk / Session",
  },
  {
    id: "sample_content",
    label: "Content",
    type: "file",
    required: false,
    enabled: false,
    helpText: "Please add a description for each file you upload.",
  },
];

export const FIELD_MIGRATIONS: Record<string, Partial<FormFieldConfig>> = {
  first_name: { locked: true },
  last_name: { locked: true },
  email: { locked: true },
  headshot: { required: true },
  company_logo: {
    label: "Company Logo — Colour",
    helpText: "Please submit on a transparent background.",
    required: true,
  },
  company_logo_white: {
    helpText: "Please submit on a transparent background.",
    required: true,
  },
  talk_topic: {
    formTypes: ["call-for-speakers"],
    sectionStart: "Talk / Session",
    label: "Talk / Session Topic",
  },
  talk_title: { sectionStart: "Talk / Session" },
  sample_content: {
    label: "Content",
    helpText: "Please add a description for each file you upload.",
  },
};

const RESERVED_FIELD_IDS = new Set([
  "company_logo_white",
  "companyLogoWhite",
  "talk_title",
  "talkTitle",
  "talk_description",
  "talkDescription",
]);

const normalize = (s: string | undefined) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export function mergeWithDefaults(saved: FormFieldConfig[]): FormFieldConfig[] {
  const patched = saved
    .filter((f) => {
      // only filter out custom fields that clash with reserved ids/labels
      if (!f.custom) return true;
      if (
        RESERVED_FIELD_IDS.has(f.id) ||
        RESERVED_FIELD_IDS.has((f as any).name)
      )
        return false;
      const nid = normalize(f.id);
      const nlabel = normalize(f.label);
      for (const rid of RESERVED_FIELD_IDS) {
        if (normalize(rid) === nid || normalize(rid) === nlabel) return false;
      }
      return true;
    })
    .map((f) =>
      FIELD_MIGRATIONS[f.id] ? { ...f, ...FIELD_MIGRATIONS[f.id] } : f,
    );
  const savedIds = new Set(patched.map((f) => f.id));
  const newDefaults = DEFAULT_FIELDS.filter((f) => !savedIds.has(f.id));
  return [...patched, ...newDefaults];
}

const CFS_OVERRIDES: Record<string, Partial<FormFieldConfig>> = {
  talk_topic: { enabled: true, required: true },
  sample_content: { enabled: true, required: true },
  company_role: { enabled: true, required: true },
  company_name: { enabled: true, required: true },
  headshot: { enabled: false },
  company_logo: { enabled: false },
  company_logo_white: { enabled: false },
};

function applyFormTypeOverrides(
  fields: FormFieldConfig[],
  ft: string,
): FormFieldConfig[] {
  if (ft !== "call-for-speakers") return fields;
  return fields.map((f) =>
    Object.prototype.hasOwnProperty.call(CFS_OVERRIDES, f.id)
      ? { ...f, ...CFS_OVERRIDES[f.id] }
      : f,
  );
}

function getDefaultsForFormType(ft: string): FormFieldConfig[] {
  return applyFormTypeOverrides(DEFAULT_FIELDS, ft);
}

export const FORM_SECTIONS: Record<
  string,
  { id: string; label: string | null; fieldIds: string[] }[]
> = {
  "call-for-speakers": [
    {
      id: "info",
      label: null,
      fieldIds: [
        "first_name",
        "last_name",
        "email",
        "company_role",
        "company_name",
      ],
    },
    { id: "talk", label: "Talk / Session", fieldIds: ["talk_topic", "sample_content"] },
    {
      id: "media",
      label: null,
      fieldIds: [
        "headshot",
        "company_logo",
        "company_logo_white",
        "linkedin",
        "bio",
      ],
    },
  ],
  "speaker-info": [
    {
      id: "info",
      label: null,
      fieldIds: [
        "first_name",
        "last_name",
        "email",
        "company_role",
        "company_name",
        "headshot",
        "company_logo",
        "company_logo_white",
        "linkedin",
        "bio",
      ],
    },
    {
      id: "talk",
      label: "Talk / Session",
      fieldIds: ["talk_title", "talk_description", "sample_content"],
    },
  ],
};

const SpeakerFormBuilder = forwardRef<
  SpeakerFormBuilderHandle,
  SpeakerFormBuilderProps
>(function SpeakerFormBuilder(
  {
    eventId,
    initialConfig,
    formType = "speaker-info",
    formName,
    eventName,
    onBack,
    onSave,
    readOnly = false,
  },
  ref,
) {
  const queryClient = useQueryClient();
  const STALE_TITLES = ["Speaker Information", "Speaker Applications"];
  const defaultTitle =
    formType === "call-for-speakers"
      ? `Speaker Applications${eventName ? ` | ${eventName}` : ""}`
      : `Speaker Intake${eventName ? ` | ${eventName}` : ""}`;
  const resolveTitle = (saved: string | undefined) =>
    saved && !STALE_TITLES.includes(saved) ? saved : defaultTitle;

  const [fields, setFields] = useState<FormFieldConfig[]>(
    initialConfig ?? getDefaultsForFormType(formType ?? "speaker-info"),
  );
  const [isDirty, setIsDirty] = useState(false);
  const initializedRef = useRef(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [customFieldDialog, setCustomFieldDialog] = useState(false);
  const [missingFormDialogOpen, setMissingFormDialogOpen] = useState(false);
  const [saveWarningOpen, setSaveWarningOpen] = useState(false);
  const [formTitle, setFormTitle] = useState<string>(defaultTitle);
  const [formSubtitle, setFormSubtitle] = useState<string>("");
  const [showFormTitle, setShowFormTitle] = useState<boolean>(true);
  const [newCustomField, setNewCustomField] = useState({
    label: "",
    type: "text" as
      | "text"
      | "textarea"
      | "email"
      | "file"
      | "radio"
      | "checkbox",
    placeholder: "",
    required: true,
    options: [] as string[],
    newOption: "",
  });
  const [copied, setCopied] = useState(false);

  // Load server-saved config for this event/form type when available
  useEffect(() => {
    let mounted = true;
    if (!eventId || !formType) return;

    import("@/lib/api").then(({ getFormConfigForEvent }) => {
      getFormConfigForEvent(eventId, formType)
        .then((res: any) => {
          if (!mounted) return;
          if (!res || !res.config) {
            setFields(getDefaultsForFormType(formType ?? "speaker-info"));
            return;
          }

          try {
            // Support two shapes:
            // - legacy: config is an array of field objects
            // - new: config is an object { fields: [...], metadata: { title, subtitle, showTitle } }
            if (Array.isArray(res.config)) {
              setFields(
                applyFormTypeOverrides(
                  mergeWithDefaults(res.config as FormFieldConfig[]),
                  formType ?? "speaker-info",
                ),
              );
              // backward-compatible metadata may live at top-level or in res.metadata
              setFormTitle(
                resolveTitle(
                  (res.title as string) || (res.metadata?.title as string),
                ),
              );
              setFormSubtitle(
                (res.subtitle as string) ||
                  (res.metadata?.subtitle as string) ||
                  "",
              );
              const show = res.showTitle ?? res.metadata?.showTitle;
              setShowFormTitle(typeof show === "boolean" ? show : true);
            } else if (res.config && typeof res.config === "object") {
              const cfg = res.config as any;
              const fieldsFromCfg = Array.isArray(cfg.fields)
                ? cfg.fields
                : getDefaultsForFormType(formType ?? "speaker-info");
              setFields(
                applyFormTypeOverrides(
                  mergeWithDefaults(fieldsFromCfg as FormFieldConfig[]),
                  formType ?? "speaker-info",
                ),
              );
              setFormTitle(resolveTitle(cfg.metadata?.title as string));
              setFormSubtitle((cfg.metadata?.subtitle as string) || "");
              setShowFormTitle(
                typeof cfg.metadata?.showTitle === "boolean"
                  ? cfg.metadata.showTitle
                  : true,
              );
            } else {
              setFields(getDefaultsForFormType(formType ?? "speaker-info"));
            }
          } catch (e) {
            setFields(getDefaultsForFormType(formType ?? "speaker-info"));
          }
        })
        .catch((err: any) => {
          // If backend returns 404 (no saved form config), prompt user to create and save the form
          if (err && (err.status === 404 || err?.status === 404)) {
            setMissingFormDialogOpen(true);
          }
          setFields(getDefaultsForFormType(formType ?? "speaker-info"));
        })
        .finally(() => {
          if (mounted)
            setTimeout(() => {
              initializedRef.current = true;
            }, 0);
        });
    });

    return () => {
      mounted = false;
    };
  }, [eventId, formType]);

  const markDirty = () => {
    if (initializedRef.current) setIsDirty(true);
  };

  const toggleField = (fieldId: string) => {
    if (readOnly) {
      toast({ title: "Event is read-only", variant: "destructive" });
      return;
    }
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId) {
          // When enabling a field, default it to required
          // When disabling, keep the required state for when it's re-enabled
          return {
            ...f,
            enabled: !f.enabled,
            required: !f.enabled ? true : f.required,
          };
        }
        return f;
      }),
    );
    markDirty();
  };

  const toggleRequired = (fieldId: string) => {
    if (readOnly) {
      toast({ title: "Event is read-only", variant: "destructive" });
      return;
    }
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, required: !f.required } : f)),
    );
    markDirty();
  };

  const toggleCardBuilder = (fieldId: string) => {
    if (readOnly) {
      toast({ title: "Event is read-only", variant: "destructive" });
      return;
    }
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, showInCardBuilder: !f.showInCardBuilder }
          : f,
      ),
    );
    markDirty();
  };

  const addCustomField = () => {
    if (readOnly) {
      toast({ title: "Event is read-only", variant: "destructive" });
      return;
    }
    if (!newCustomField.label.trim()) {
      toast({ title: "Label is required", variant: "destructive" });
      return;
    }

    // Prevent creating custom fields that duplicate newly-supported speaker properties
    const normalizedLabel = normalize(newCustomField.label);
    for (const rid of RESERVED_FIELD_IDS) {
      if (normalize(rid) === normalizedLabel) {
        toast({ title: "This field is now built-in", variant: "destructive" });
        return;
      }
    }

    const customId = `custom_${Date.now()}`;
    const field: FormFieldConfig = {
      id: customId,
      label: newCustomField.label,
      type: newCustomField.type,
      placeholder: newCustomField.placeholder,
      required: newCustomField.required,
      enabled: true,
      custom: true,
      options: (newCustomField as any).options?.length
        ? (newCustomField as any).options
        : undefined,
    };

    setFields((prev) => [...prev, field]);
    setNewCustomField({
      label: "",
      type: "text",
      placeholder: "",
      required: true,
      options: [] as string[],
      newOption: "",
    });
    setCustomFieldDialog(false);
    toast({ title: "Custom field added" });
    markDirty();
  };

  const removeCustomField = (fieldId: string) => {
    if (readOnly) {
      toast({ title: "Event is read-only", variant: "destructive" });
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    toast({ title: "Field removed" });
    markDirty();
  };

  const moveField = (index: number, direction: "up" | "down") => {
    if (readOnly) {
      toast({ title: "Event is read-only", variant: "destructive" });
      return;
    }
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    ) {
      return;
    }

    const newFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index],
    ];
    setFields(newFields);
    markDirty();
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newFields = [...fields];
    const [moved] = newFields.splice(dragIndex, 1);
    newFields.splice(dropIndex, 0, moved);
    setFields(newFields);
    markDirty();
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Fields filtered by formType
  const visibleFields = fields.filter(
    (f) => !f.formTypes || f.formTypes.includes(formType ?? "speaker-info"),
  );
  const sections =
    FORM_SECTIONS[formType ?? "speaker-info"] ?? FORM_SECTIONS["speaker-info"];

  // Content uploads toggle (controls presence of `content` file field)
  const [previewContentItems, setPreviewContentItems] = useState<any[]>([{ id: 'content-1', file: null, preview: null, name: '', contentType: null }]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/speaker-intake/${eventId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    // Card warnings only apply to the speaker intake form, not applications
    if (formType !== "call-for-speakers") {
      const headshotEnabled = fields.some(
        (f) => f.id === "headshot" && f.enabled,
      );
      const logoEnabled = fields.some(
        (f) => f.id === "company_logo" && f.enabled,
      );
      if (!headshotEnabled || !logoEnabled) {
        setSaveWarningOpen(true);
        return;
      }
    }

    proceedWithSave();
  };

  const proceedWithSave = async () => {
    // Try saving to backend; fallback to localStorage on error
    try {
      const { createFormConfig } = await import("@/lib/api");
      // Persist as config object { fields, metadata } to avoid backend contract changes
      const payloadConfig = {
        fields,
        metadata: {
          title: formTitle,
          subtitle: formSubtitle,
          showTitle: showFormTitle,
        },
      };
      await createFormConfig({
        eventId,
        formType: formType ?? "speaker-info",
        config: payloadConfig,
      });
      toast({ title: "Form configuration saved" });
      setIsDirty(false);
      queryClient.invalidateQueries({
        queryKey: ["event", eventId, "form-config", formType ?? "speaker-info"],
      });
      if (onSave) onSave(fields);
    } catch (err) {
      toast({
        title: "Failed to save form configuration",
        variant: "destructive",
      });
    } finally {
      setSaveWarningOpen(false);
    }
  };

  useImperativeHandle(ref, () => ({ save: handleSave, isDirty }));

  const enabledFields = fields.filter((f) => f.enabled);

  const previewFields = enabledFields.filter(
    (f) => !f.formTypes || f.formTypes.includes(formType ?? "speaker-info"),
  );

  return (
    <div className="space-y-6">
      {/* Compact form header config */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/20 p-4">
        <Switch
          checked={showFormTitle}
          onCheckedChange={(v) => {
            setShowFormTitle(Boolean(v));
            markDirty();
          }}
          className="shrink-0 self-center"
        />
        <div
          className={`flex-1 min-w-[180px] transition-opacity ${showFormTitle ? "" : "opacity-40 pointer-events-none"}`}
        >
          <Label className="text-xs mb-1.5 block">Title</Label>
          <Input
            value={formTitle}
            onChange={(e) => {
              setFormTitle(e.target.value);
              markDirty();
            }}
          />
        </div>
        <div
          className={`flex-1 min-w-[180px] transition-opacity ${showFormTitle ? "" : "opacity-40 pointer-events-none"}`}
        >
          <Label className="text-xs mb-1.5 block">
            Subtitle{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Input
            value={formSubtitle}
            onChange={(e) => {
              setFormSubtitle(e.target.value);
              markDirty();
            }}
            placeholder="e.g. Please complete all fields"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Panel: Form Builder (titles removed - parent shows main heading) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Fields by section */}
          <Card className="p-4">
            <div className="space-y-1">
              {sections.map((section, sIdx) => {
                const sectionIdSet = new Set(section.fieldIds);
                const sectionFields = visibleFields.filter(
                  (f) => !f.custom && sectionIdSet.has(f.id),
                );

                if (sectionFields.length === 0) return null;

                return (
                  <React.Fragment key={section.id}>
                    {section.label && (
                      <div
                        className={`flex items-center gap-2 ${sIdx > 0 ? "pt-3" : ""} pb-1`}
                      >
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {section.label}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    {sectionFields.map((field) => {
                      const globalIndex = fields.findIndex(
                        (f) => f.id === field.id,
                      );
                      const isDraggingOver = dragOverIndex === globalIndex;
                      const active = field.enabled || field.locked;

                      return (
                        <div
                          key={field.id}
                          draggable={!field.locked}
                          onDragStart={() =>
                            !field.locked && setDragIndex(globalIndex)
                          }
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverIndex(globalIndex);
                          }}
                          onDragLeave={() => setDragOverIndex(null)}
                          onDrop={() => handleDrop(globalIndex)}
                          onDragEnd={() => {
                            setDragIndex(null);
                            setDragOverIndex(null);
                          }}
                          className={`rounded transition-colors ${isDraggingOver ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
                        >
                          <div
                            className={`group flex items-center gap-2 py-1.5 px-2 rounded ${!isDraggingOver ? "hover:bg-muted/50" : ""}`}
                          >
                            {field.locked ? (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                            ) : (
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 cursor-grab active:cursor-grabbing" />
                            )}
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                setFields((prev) =>
                                  prev.map((f) =>
                                    f.id === field.id
                                      ? { ...f, label: e.target.value }
                                      : f,
                                  ),
                                )
                              }
                              className="flex-1 min-w-0 h-7 text-sm border-transparent bg-transparent shadow-none px-1.5 py-0 hover:border-border focus:bg-background focus-visible:ring-0 transition-colors"
                            />
                            {active &&
                              (field.locked ? (
                                <span className="text-xs text-muted-foreground/40 shrink-0 px-1.5">
                                  Required
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleRequired(field.id)}
                                  className={`text-xs px-1.5 py-0.5 rounded shrink-0 transition-colors ${field.required ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                                >
                                  {field.required ? "Required" : "Optional"}
                                </button>
                              ))}
                            {!field.locked && (
                              <Switch
                                checked={field.enabled}
                                onCheckedChange={() => toggleField(field.id)}
                                className="shrink-0 scale-90"
                              />
                            )}
                          </div>
                          {active && (
                            <div className="pl-6 pr-2 pb-1">
                              {field.helpText !== undefined ? (
                                <Textarea
                                  value={field.helpText}
                                  onChange={(e) =>
                                    setFields((prev) =>
                                      prev.map((f) =>
                                        f.id === field.id
                                          ? { ...f, helpText: e.target.value }
                                          : f,
                                      ),
                                    )
                                  }
                                  onBlur={() => {
                                    if (!field.helpText?.trim())
                                      setFields((prev) =>
                                        prev.map((f) =>
                                          f.id === field.id
                                            ? { ...f, helpText: undefined }
                                            : f,
                                        ),
                                      );
                                  }}
                                  onInput={(e) => {
                                    const el = e.currentTarget;
                                    el.style.height = "auto";
                                    el.style.height = `${el.scrollHeight}px`;
                                  }}
                                  placeholder="Add a note for speakers…"
                                  rows={1}
                                  className="text-xs resize-none overflow-hidden min-h-0"
                                  ref={(el) => {
                                    if (el) {
                                      el.style.height = "auto";
                                      el.style.height = `${el.scrollHeight}px`;
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFields((prev) =>
                                      prev.map((f) =>
                                        f.id === field.id
                                          ? { ...f, helpText: "" }
                                          : f,
                                      ),
                                    )
                                  }
                                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                  + Add a note
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>

          </Card>

          {/* Custom Fields */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom Fields
              </h3>
              <Dialog
                open={customFieldDialog}
                onOpenChange={setCustomFieldDialog}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Field</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addCustomField();
                    }}
                    className="space-y-4 mt-4"
                  >
                    <div className="space-y-2">
                      <Label>Field Label</Label>
                      <Input
                        placeholder="e.g., Dietary Requirements"
                        value={newCustomField.label}
                        onChange={(e) =>
                          setNewCustomField((prev) => ({
                            ...prev,
                            label: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Field Type</Label>
                      <Select
                        value={newCustomField.type}
                        onValueChange={(val: any) =>
                          setNewCustomField((prev) => ({ ...prev, type: val }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short Text</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                          <SelectItem value="radio">Radio Options</SelectItem>
                          <SelectItem value="checkbox">
                            Checkbox Options
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newCustomField.type !== "file" &&
                      newCustomField.type !== "radio" &&
                      newCustomField.type !== "checkbox" && (
                        <div className="space-y-2">
                          <Label>Placeholder (optional)</Label>
                          <Input
                            placeholder="e.g., Any dietary restrictions?"
                            value={newCustomField.placeholder}
                            onChange={(e) =>
                              setNewCustomField((prev) => ({
                                ...prev,
                                placeholder: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}

                    {(newCustomField.type === "radio" ||
                      newCustomField.type === "checkbox") && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="e.g., Vegetarian"
                            value={(newCustomField as any).newOption}
                            onChange={(e) =>
                              setNewCustomField((prev) => ({
                                ...prev,
                                newOption: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const opt = (
                                  newCustomField as any
                                ).newOption?.trim();
                                if (!opt) return;
                                setNewCustomField((prev) => ({
                                  ...prev,
                                  options: [...prev.options, opt],
                                  newOption: "",
                                }));
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const opt = (
                                newCustomField as any
                              ).newOption?.trim();
                              if (!opt) return;
                              setNewCustomField((prev) => ({
                                ...prev,
                                options: [...prev.options, opt],
                                newOption: "",
                              }));
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(newCustomField as any).options.map(
                            (opt: string, idx: number) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-2 bg-muted/20 px-2 py-1 rounded"
                              >
                                <span className="text-sm">{opt}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setNewCustomField((prev) => ({
                                      ...prev,
                                      options: prev.options.filter(
                                        (o: string) => o !== opt,
                                      ),
                                    }))
                                  }
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newCustomField.required}
                        onCheckedChange={(checked) =>
                          setNewCustomField((prev) => ({
                            ...prev,
                            required: checked,
                          }))
                        }
                      />
                      <Label>Required field</Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCustomFieldDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {fields.filter((f) => f.custom).length === 0 ? (
              <p
                className="text-muted-foreground text-center py-4"
                style={{ fontSize: "var(--font-small)" }}
              >
                No custom fields yet
              </p>
            ) : (
              <div className="space-y-2">
                {fields
                  .filter((f) => f.custom)
                  .map((field) => {
                    const allFieldIndex = fields.findIndex(
                      (f) => f.id === field.id,
                    );

                    const isDraggingOver = dragOverIndex === allFieldIndex;
                    return (
                      <div
                        key={field.id}
                        draggable
                        onDragStart={() => setDragIndex(allFieldIndex)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverIndex(allFieldIndex);
                        }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={() => handleDrop(allFieldIndex)}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setDragOverIndex(null);
                        }}
                        className={`rounded transition-colors ${isDraggingOver ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
                      >
                        <div
                          className={`group flex items-center gap-2 py-1.5 px-2 rounded ${!isDraggingOver ? "hover:bg-muted/50" : ""}`}
                        >
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 cursor-grab active:cursor-grabbing" />
                          <Input
                            value={field.label}
                            onChange={(e) =>
                              setFields((prev) =>
                                prev.map((f) =>
                                  f.id === field.id
                                    ? { ...f, label: e.target.value }
                                    : f,
                                ),
                              )
                            }
                            className="flex-1 min-w-0 h-7 text-sm border-transparent bg-transparent shadow-none px-1.5 py-0 hover:border-border focus:bg-background focus-visible:ring-0 transition-colors"
                          />
                          {field.enabled && (
                            <button
                              type="button"
                              onClick={() => toggleRequired(field.id)}
                              className={`text-xs px-1.5 py-0.5 rounded shrink-0 transition-colors ${field.required ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                            >
                              {field.required ? "Required" : "Optional"}
                            </button>
                          )}
                          <Switch
                            checked={field.enabled}
                            onCheckedChange={() => toggleField(field.id)}
                            className="shrink-0 scale-90"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeCustomField(field.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {field.enabled && (
                          <div className="pl-6 pr-2 pb-1">
                            {field.helpText !== undefined ? (
                              <Textarea
                                value={field.helpText}
                                onChange={(e) =>
                                  setFields((prev) =>
                                    prev.map((f) =>
                                      f.id === field.id
                                        ? { ...f, helpText: e.target.value }
                                        : f,
                                    ),
                                  )
                                }
                                onBlur={() => {
                                  if (!field.helpText?.trim())
                                    setFields((prev) =>
                                      prev.map((f) =>
                                        f.id === field.id
                                          ? { ...f, helpText: undefined }
                                          : f,
                                      ),
                                    );
                                }}
                                onInput={(e) => {
                                  const el = e.currentTarget;
                                  el.style.height = "auto";
                                  el.style.height = `${el.scrollHeight}px`;
                                }}
                                placeholder="Add a note for speakers…"
                                rows={1}
                                className="text-xs resize-none overflow-hidden"
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setFields((prev) =>
                                    prev.map((f) =>
                                      f.id === field.id
                                        ? { ...f, helpText: "" }
                                        : f,
                                    ),
                                  )
                                }
                                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                              >
                                + Add a note
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Panel: Live Preview (heading removed - parent shows main heading) */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="p-6 bg-white">
            <div className="space-y-6">
              {previewFields.map((field) => {
                if (field.id === "sample_content") {
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <ContentUploads items={previewContentItems} setItems={setPreviewContentItems} readOnly={true} />
                      {field.helpText && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{field.helpText}</p>}
                    </div>
                  );
                }
                return (
                  <div
                    key={field.id}
                    className={
                      field.type === "file" ? "space-y-1" : "space-y-2"
                    }
                  >
                    <>
                      {field.type === "file" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium leading-none">
                            {field.label}
                            {field.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </span>
                          <div className="inline-flex items-center justify-center text-muted-foreground/60 border border-border rounded p-1 bg-muted/30">
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <Label>
                          {field.label}
                          {field.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                      )}
                      {field.type === "textarea" ? (
                        <Textarea
                          placeholder={field.placeholder}
                          disabled
                          rows={4}
                        />
                      ) : field.type === "file" ? null : field.type ===
                        "radio" ? (
                        <div className="space-y-2">
                          {((field as any).options || []).map((opt: string) => (
                            <label
                              key={opt}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="radio"
                                name={field.id}
                                checked={false}
                                disabled
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === "checkbox" ? (
                        <div className="space-y-2">
                          {((field as any).options || []).length > 0 ? (
                            ((field as any).options || []).map(
                              (opt: string) => (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={false}
                                    disabled
                                  />
                                  <span>{opt}</span>
                                </label>
                              ),
                            )
                          ) : (
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={false} disabled />
                              <span>{field.label}</span>
                            </label>
                          )}
                        </div>
                      ) : (
                        <Input
                          type={field.type === "email" ? "email" : "text"}
                          placeholder={field.placeholder}
                          disabled
                        />
                      )}
                      {field.helpText && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {field.helpText}
                        </p>
                      )}
                    </>
                  </div>
                );
              })}

              {previewFields.length === 0 && (
                <p
                  className="text-center text-muted-foreground py-8"
                  style={{ fontSize: "var(--font-body)" }}
                >
                  No fields enabled. Toggle fields on the left to preview them
                  here.
                </p>
              )}

              {previewFields.length > 0 && (
                <div className="pt-4">
                  <Button className="w-full" disabled>
                    Submit Information
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      {/* Warning Dialog for Missing Files */}
      <Dialog open={saveWarningOpen} onOpenChange={setSaveWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promo & Website Cards Won't Work</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const headshotMissing = !fields.some(
                (f) => f.id === "headshot" && f.enabled,
              );
              const logoMissing = !fields.some(
                (f) => f.id === "company_logo" && f.enabled,
              );
              const missingCount =
                (headshotMissing ? 1 : 0) + (logoMissing ? 1 : 0);

              return (
                <p className="text-sm text-muted-foreground">
                  We noticed your form is missing{" "}
                  {missingCount === 1
                    ? "the following field"
                    : "the following fields"}
                  :
                </p>
              );
            })()}
            <ul className="space-y-2 text-sm">
              {!fields.some((f) => f.id === "headshot" && f.enabled) && (
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  <span>
                    <strong>Headshot</strong> - Needed for speaker headshots on
                    cards
                  </span>
                </li>
              )}
              {!fields.some((f) => f.id === "company_logo" && f.enabled) && (
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  <span>
                    <strong>Company Logo — Colour</strong> - Needed for branding
                    on cards
                  </span>
                </li>
              )}
            </ul>
            <p className="text-sm text-muted-foreground">
              Without these fields, speakers won't be able to generate promo
              cards or website embeds.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSaveWarningOpen(false)}
                className="flex-1"
              >
                Go Back & Enable Fields
              </Button>
              <Button onClick={proceedWithSave} className="flex-1">
                Save Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default SpeakerFormBuilder;
