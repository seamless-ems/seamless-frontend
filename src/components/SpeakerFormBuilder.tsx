import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  GripVertical,
  X,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
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
  showInCardBuilder?: boolean; // New: Toggle to show field in card builder
  options?: string[];
}

interface SpeakerFormBuilderProps {
  eventId: string;
  initialConfig?: FormFieldConfig[];
  formType?: string;
  formName?: string;
  eventName?: string;
  onBack?: () => void;
  onSave?: (config: FormFieldConfig[]) => void;
}

export interface SpeakerFormBuilderHandle {
  save: () => void;
  isDirty: boolean;
}

const DEFAULT_FIELDS: FormFieldConfig[] = [
  {
    id: "first_name",
    label: "First Name",
    type: "text",
    required: true,
    enabled: true,
  },
  {
    id: "last_name",
    label: "Last Name",
    type: "text",
    required: true,
    enabled: true,
  },
  { id: "email", label: "Email", type: "email", required: true, enabled: true },
  {
    id: "company_name",
    label: "Company Name",
    type: "text",
    required: false,
    enabled: false,
  },
  {
    id: "company_role",
    label: "Role/Title",
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
  {
    id: "linkedin",
    label: "LinkedIn URL",
    type: "text",
    required: false,
    enabled: false,
  },
  {
    id: "headshot",
    label: "Headshot",
    type: "file",
    required: false,
    enabled: false,
  },
  {
    id: "company_logo",
    label: "Company Logo",
    type: "file",
    required: false,
    enabled: false,
  },
  {
    id: "talk_topic",
    label: "Proposed Talk Topic",
    type: "text",
    required: false,
    enabled: false,
  },
  {
    id: "sample_content",
    label: "Sample Content (e.g., Slide Deck, Video, etc.)",
    type: "file",
    required: false,
    enabled: false,
  }
];

const SpeakerFormBuilder = forwardRef<SpeakerFormBuilderHandle, SpeakerFormBuilderProps>(function SpeakerFormBuilder({
  eventId,
  initialConfig,
  formType = "speaker-info",
  formName,
  eventName,
  onBack,
  onSave,
}, ref) {
  const queryClient = useQueryClient();
  const STALE_TITLES = ["Speaker Information", "Speaker Applications"];
  const defaultTitle = formType === "call-for-speakers"
    ? `Speaker Applications${eventName ? ` | ${eventName}` : ""}`
    : `Speaker Intake${eventName ? ` | ${eventName}` : ""}`;
  const resolveTitle = (saved: string | undefined) =>
    saved && !STALE_TITLES.includes(saved) ? saved : defaultTitle;
  const [fields, setFields] = useState<FormFieldConfig[]>(
    initialConfig ?? DEFAULT_FIELDS,
  );
  const [isDirty, setIsDirty] = useState(false);
  const initializedRef = useRef(false);
  const [customFieldDialog, setCustomFieldDialog] = useState(false);
  const [missingFormDialogOpen, setMissingFormDialogOpen] = useState(false);
  const [saveWarningOpen, setSaveWarningOpen] = useState(false);
  const [formTitle, setFormTitle] = useState<string>(defaultTitle);
  const [formSubtitle, setFormSubtitle] = useState<string>("");
  const [showFormTitle, setShowFormTitle] = useState<boolean>(true);
  const [newCustomField, setNewCustomField] = useState({
    label: "",
    type: "text" as "text" | "textarea" | "email" | "file" | "radio" | "checkbox",
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
            setFields(DEFAULT_FIELDS);
            return;
          }

          try {
            // Support two shapes:
            // - legacy: config is an array of field objects
            // - new: config is an object { fields: [...], metadata: { title, subtitle, showTitle } }
            if (Array.isArray(res.config)) {
              setFields(res.config as FormFieldConfig[]);
              // backward-compatible metadata may live at top-level or in res.metadata
              setFormTitle(
                resolveTitle((res.title as string) || (res.metadata?.title as string)),
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
                : DEFAULT_FIELDS;
              setFields(fieldsFromCfg as FormFieldConfig[]);
              setFormTitle(resolveTitle(cfg.metadata?.title as string));
              setFormSubtitle((cfg.metadata?.subtitle as string) || "");
              setShowFormTitle(
                typeof cfg.metadata?.showTitle === "boolean"
                  ? cfg.metadata.showTitle
                  : true,
              );
            } else {
              setFields(DEFAULT_FIELDS);
            }
          } catch (e) {
            setFields(DEFAULT_FIELDS);
          }
        })
        .catch((err: any) => {
          // If backend returns 404 (no saved form config), prompt user to create and save the form
          if (err && (err.status === 404 || err?.status === 404)) {
            setMissingFormDialogOpen(true);
          }
          setFields(DEFAULT_FIELDS);
        })
        .finally(() => {
          if (mounted) setTimeout(() => { initializedRef.current = true; }, 0);
        });
    });

    return () => {
      mounted = false;
    };
  }, [eventId, formType]);

  const markDirty = () => { if (initializedRef.current) setIsDirty(true); };

  const toggleField = (fieldId: string) => {
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
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, required: !f.required } : f)),
    );
    markDirty();
  };

  const toggleCardBuilder = (fieldId: string) => {
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
    if (!newCustomField.label.trim()) {
      toast({ title: "Label is required", variant: "destructive" });
      return;
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
      options: (newCustomField as any).options?.length ? (newCustomField as any).options : undefined,
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
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    toast({ title: "Field removed" });
    markDirty();
  };

  const moveField = (index: number, direction: "up" | "down") => {
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
      const headshotEnabled = fields.some((f) => f.id === "headshot" && f.enabled);
      const logoEnabled = fields.some((f) => f.id === "company_logo" && f.enabled);
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
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "form-config", formType ?? "speaker-info"] });
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

  return (
    <div className="space-y-6">
      {/* Compact form header config */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs mb-1.5 block">Form Title</Label>
          <Input
            value={formTitle}
            onChange={(e) => { setFormTitle(e.target.value); markDirty(); }}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs mb-1.5 block">Subtitle <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            value={formSubtitle}
            onChange={(e) => { setFormSubtitle(e.target.value); markDirty(); }}
            placeholder="e.g. Please complete all fields"
          />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <Switch
            checked={showFormTitle}
            onCheckedChange={(v) => { setShowFormTitle(Boolean(v)); markDirty(); }}
          />
          <Label className="text-xs whitespace-nowrap">Show title</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Form Builder (titles removed - parent shows main heading) */}
        <div className="lg:col-span-1 space-y-4">
          {/* Default Fields */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Default Fields</h3>
            <div className="space-y-2">
              {fields
                .filter((f) => !f.custom)
                .map((field, index) => {
                  const cannotDisable = [
                    "first_name",
                    "last_name",
                    "email",
                  ].includes(field.id);

                  return (
                    <div
                      key={field.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <Switch
                        checked={field.enabled}
                        disabled={cannotDisable}
                        onCheckedChange={() => toggleField(field.id)}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
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
                          className="w-full"
                        />
                        {field.enabled && (
                          <div className="flex items-center gap-3 flex-wrap">
                            {cannotDisable ? (
                              <span
                                className="text-muted-foreground"
                                style={{ fontSize: "var(--font-tiny)" }}
                              >
                                Always required
                              </span>
                            ) : (
                              <label
                                className="text-muted-foreground flex items-center gap-1 cursor-pointer"
                                style={{ fontSize: "var(--font-tiny)" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={() => toggleRequired(field.id)}
                                  className="rounded"
                                />
                                Required
                              </label>
                            )}
                            {field.id !== "email" && formType !== "call-for-speakers" && (
                              <label
                                className="text-muted-foreground flex items-center gap-1 cursor-pointer"
                                style={{ fontSize: "var(--font-tiny)" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={field.showInCardBuilder || false}
                                  onChange={() => toggleCardBuilder(field.id)}
                                  className="rounded"
                                />
                                Card Builder
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          {/* Custom Fields */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom Fields</h3>
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
                  <div className="space-y-4 mt-4">
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
                            <SelectItem value="checkbox">Checkbox Options</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                      {newCustomField.type !== "file" && newCustomField.type !== "radio" && newCustomField.type !== "checkbox" && (
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

                      {(newCustomField.type === "radio" || newCustomField.type === "checkbox") && (
                        <div className="space-y-2">
                          <Label>Options</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="e.g., Vegetarian"
                              value={(newCustomField as any).newOption}
                              onChange={(e) => setNewCustomField((prev) => ({ ...prev, newOption: e.target.value }))}
                            />
                            <Button size="sm" variant="outline" onClick={() => {
                              const opt = (newCustomField as any).newOption?.trim();
                              if (!opt) return;
                              setNewCustomField((prev) => ({ ...prev, options: [...prev.options, opt], newOption: "" }));
                            }}>
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(newCustomField as any).options.map((opt: string, idx: number) => (
                              <div key={idx} className="inline-flex items-center gap-2 bg-muted/20 px-2 py-1 rounded">
                                <span className="text-sm">{opt}</span>
                                <Button size="sm" variant="ghost" onClick={() => setNewCustomField((prev) => ({ ...prev, options: prev.options.filter((o: string) => o !== opt) }))}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
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
                        variant="outline"
                        onClick={() => setCustomFieldDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={addCustomField}>Add Field</Button>
                    </div>
                  </div>
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
                  .map((field, customIndex) => {
                    const allFieldIndex = fields.findIndex(
                      (f) => f.id === field.id,
                    );
                    const customFields = fields.filter((f) => f.custom);
                    const isFirst = customIndex === 0;
                    const isLast = customIndex === customFields.length - 1;

                    return (
                      <div
                        key={field.id}
                        className="flex items-start gap-2 p-2 rounded bg-muted/30"
                      >
                        <div className="flex flex-col mt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={() => moveField(allFieldIndex, "up")}
                            disabled={isFirst}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={() => moveField(allFieldIndex, "down")}
                            disabled={isLast}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0 space-y-1.5">
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
                            className="w-full"
                          />
                          <div className="flex items-center gap-3 flex-wrap">
                            <span
                              className="text-muted-foreground"
                              style={{ fontSize: "var(--font-tiny)" }}
                            >
                              {field.type === "file" ? "file" : field.type}
                            </span>
                            {field.options && field.options.length > 0 && (
                              <span className="text-muted-foreground" style={{ fontSize: "var(--font-tiny)" }}>{field.options.join(", ")}</span>
                            )}
                            <label
                              className="text-muted-foreground flex items-center gap-1 cursor-pointer"
                              style={{ fontSize: "var(--font-tiny)" }}
                            >
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={() => toggleRequired(field.id)}
                                className="rounded"
                              />
                              Required
                            </label>
                            {formType !== "call-for-speakers" && (
                              <label
                                className="text-muted-foreground flex items-center gap-1 cursor-pointer"
                                style={{ fontSize: "var(--font-tiny)" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={field.showInCardBuilder || false}
                                  onChange={() => toggleCardBuilder(field.id)}
                                  className="rounded"
                                />
                                Card Builder
                              </label>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => removeCustomField(field.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Panel: Live Preview (heading removed - parent shows main heading) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 bg-white">
            <div className="space-y-6">
              {enabledFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      placeholder={
                        field.placeholder ??
                        `Enter ${field.label.toLowerCase()}`
                      }
                      disabled
                      rows={4}
                    />
                  ) : field.type === "file" ? (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                      Click to upload {field.label.toLowerCase()}
                    </div>
                  ) : field.type === 'radio' ? (
                    <div className="space-y-2">
                      {((field as any).options || []).map((opt: string) => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <input type="radio" name={field.id} checked={false} disabled />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <div className="space-y-2">
                      {((field as any).options || []).length > 0 ? (
                        ((field as any).options || []).map((opt: string) => (
                          <label key={opt} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={false} disabled />
                            <span>{opt}</span>
                          </label>
                        ))
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
                      placeholder={
                        field.placeholder ??
                        `Enter ${field.label.toLowerCase()}`
                      }
                      disabled
                    />
                  )}
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">
                      {field.helpText}
                    </p>
                  )}
                </div>
              ))}

              {enabledFields.length === 0 && (
                <p
                  className="text-center text-muted-foreground py-8"
                  style={{ fontSize: "var(--font-body)" }}
                >
                  No fields enabled. Toggle fields on the left to preview them
                  here.
                </p>
              )}

              {enabledFields.length > 0 && (
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
                    <strong>Company Logo</strong> - Needed for branding on cards
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
