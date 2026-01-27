import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, GripVertical, X, Copy, Check, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface FormFieldConfig {
  id: string;
  label: string;
  type: "text" | "textarea" | "email" | "file" | "url";
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  custom?: boolean;
  helpText?: string;
}

interface SpeakerFormBuilderProps {
  eventId: string;
  initialConfig?: FormFieldConfig[];
  onSave?: (config: FormFieldConfig[]) => void;
}

const DEFAULT_FIELDS: FormFieldConfig[] = [
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

export default function SpeakerFormBuilder({
  eventId,
  initialConfig,
  onSave,
}: SpeakerFormBuilderProps) {
  const [fields, setFields] = useState<FormFieldConfig[]>(
    initialConfig ?? DEFAULT_FIELDS
  );
  const [customFieldDialog, setCustomFieldDialog] = useState(false);
  const [saveWarningOpen, setSaveWarningOpen] = useState(false);
  const [newCustomField, setNewCustomField] = useState({
    label: "",
    type: "text" as "text" | "textarea" | "email" | "file",
    placeholder: "",
    required: true,
  });
  const [copied, setCopied] = useState(false);

  const toggleField = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId) {
          // When enabling a field, default it to required
          // When disabling, keep the required state for when it's re-enabled
          return { ...f, enabled: !f.enabled, required: !f.enabled ? true : f.required };
        }
        return f;
      })
    );
  };

  const toggleRequired = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId ? { ...f, required: !f.required } : f
      )
    );
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
    };

    setFields((prev) => [...prev, field]);
    setNewCustomField({ label: "", type: "text", placeholder: "", required: true });
    setCustomFieldDialog(false);
    toast({ title: "Custom field added" });
  };

  const removeCustomField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    toast({ title: "Field removed" });
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
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/speaker-intake/${eventId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const headshotEnabled = fields.some(f => f.id === "headshot" && f.enabled);
    const logoEnabled = fields.some(f => f.id === "company_logo" && f.enabled);
    
    // Show warning if either headshot or company logo is missing
    if (!headshotEnabled || !logoEnabled) {
      setSaveWarningOpen(true);
      return;
    }
    
    proceedWithSave();
  };

  const proceedWithSave = () => {
    // Save to localStorage as bridge until backend API endpoint is ready
    localStorage.setItem(`speaker_form_config_${eventId}`, JSON.stringify(fields));
    
    if (onSave) {
      onSave(fields);
    }
    toast({ title: "Form configuration saved" });
    setSaveWarningOpen(false);
  };

  const enabledFields = fields.filter((f) => f.enabled);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel: Form Builder (titles removed - parent shows main heading) */}
      <div className="lg:col-span-1 space-y-4">

        {/* Default Fields */}
        <Card className="p-4">
          <div className="space-y-2">
            {fields
              .filter((f) => !f.custom)
              .map((field, index) => {
                const cannotDisable = ["first_name", "last_name", "email"].includes(
                  field.id
                );

                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <Switch
                        checked={field.enabled}
                        disabled={cannotDisable}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <span className="font-medium" style={{ fontSize: "var(--font-small)" }}>
                        {field.label}
                      </span>
                      {cannotDisable && (
                        <span className="text-muted-foreground" style={{ fontSize: "var(--font-tiny)" }}>
                          (Required)
                        </span>
                      )}
                    </div>
                    {field.enabled && !cannotDisable && (
                      <div className="flex items-center gap-2">
                        <label className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "var(--font-tiny)" }}>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={() => toggleRequired(field.id)}
                            className="rounded"
                          />
                          Required
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>

        {/* Custom Fields */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div />
            <Dialog open={customFieldDialog} onOpenChange={setCustomFieldDialog}>
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
                      </SelectContent>
                    </Select>
                  </div>

                  {newCustomField.type !== "file" && (
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

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newCustomField.required}
                      onCheckedChange={(checked) =>
                        setNewCustomField((prev) => ({ ...prev, required: checked }))
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
            <p className="text-muted-foreground text-center py-4" style={{ fontSize: "var(--font-small)" }}>
              No custom fields yet
            </p>
          ) : (
            <div className="space-y-2">
              {fields
                .filter((f) => f.custom)
                .map((field, customIndex) => {
                  const allFieldIndex = fields.findIndex((f) => f.id === field.id);
                  const customFields = fields.filter((f) => f.custom);
                  const isFirst = customIndex === 0;
                  const isLast = customIndex === customFields.length - 1;

                  return (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 p-2 rounded bg-muted/30"
                    >
                      <div className="flex flex-col">
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
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="font-medium" style={{ fontSize: "var(--font-small)" }}>
                          {field.label}
                        </span>
                        <span className="text-muted-foreground ml-2" style={{ fontSize: "var(--font-tiny)" }}>
                          ({field.type === "file" ? "file" : field.type})
                        </span>
                      </div>
                      {field.required && (
                        <span className="text-muted-foreground" style={{ fontSize: "var(--font-tiny)" }}>
                          Required
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
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

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button onClick={handleCopyLink} variant="outline" className="flex-1">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Form Link
              </>
            )}
          </Button>
          <Button onClick={handleSave} variant="outline" className="border-[1.5px]">
            Save Changes
          </Button>
        </div>
      </div>

      {/* Right Panel: Live Preview (heading removed - parent shows main heading) */}
      <div className="lg:col-span-2 space-y-4">

        <Card className="p-6 bg-white">
          <div className="space-y-6">
            {enabledFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                    disabled
                    rows={4}
                  />
                ) : field.type === "file" ? (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                    Click to upload {field.label.toLowerCase()}
                  </div>
                ) : (
                  <Input
                    type={field.type === "email" ? "email" : "text"}
                    placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                    disabled
                  />
                )}
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                )}
              </div>
            ))}

            {enabledFields.length === 0 && (
              <p className="text-center text-muted-foreground py-8" style={{ fontSize: "var(--font-body)" }}>
                No fields enabled. Toggle fields on the left to preview them here.
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

      {/* Warning Dialog for Missing Files */}
      <Dialog open={saveWarningOpen} onOpenChange={setSaveWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promo & Website Cards Won't Work</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const headshotMissing = !fields.some(f => f.id === "headshot" && f.enabled);
              const logoMissing = !fields.some(f => f.id === "company_logo" && f.enabled);
              const missingCount = (headshotMissing ? 1 : 0) + (logoMissing ? 1 : 0);
              
              return (
                <p className="text-sm text-muted-foreground">
                  We noticed your form is missing {missingCount === 1 ? 'the following field' : 'the following fields'}:
                </p>
              );
            })()}
            <ul className="space-y-2 text-sm">
              {!fields.some(f => f.id === "headshot" && f.enabled) && (
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  <span><strong>Headshot</strong> - Needed for speaker headshots on cards</span>
                </li>
              )}
              {!fields.some(f => f.id === "company_logo" && f.enabled) && (
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">•</span>
                  <span><strong>Company Logo</strong> - Needed for branding on cards</span>
                </li>
              )}
            </ul>
            <p className="text-sm text-muted-foreground">
              Without these fields, speakers won't be able to generate promo cards or website embeds.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSaveWarningOpen(false)} className="flex-1">
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
}
