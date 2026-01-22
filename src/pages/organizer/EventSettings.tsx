import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, updateEvent, uploadFile, getGoogleDriveStatus, getIntegrationUrl, deleteIntegration, getTeam, getMe } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FolderOpen, Calendar, MapPin, Mail, FileText, Mic2, Users, Link as LinkIcon, FormInput } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SpeakerFormBuilder, { FormFieldConfig } from "@/components/SpeakerFormBuilder";

const availableModules = [
  {
    id: "speaker",
    name: "Speakers",
    description: "Manage speakers, intake forms, and promo cards",
    icon: Mic2,
    color: "speaker",
    available: true,
  },
  {
    id: "schedule",
    name: "Schedule",
    description: "Create and publish event schedules",
    icon: Calendar,
    color: "schedule",
    available: true,
  },
  {
    id: "content",
    name: "Content",
    description: "Centralized hub for presentations and files",
    icon: FileText,
    color: "content",
    available: true,
  },
  {
    id: "partners",
    name: "Partners",
    description: "Manage sponsors and partners",
    icon: Users,
    color: "primary",
    available: true,
  },
  {
    id: "attendee",
    name: "Attendees",
    description: "Manage registrations and communications",
    icon: Users,
    color: "attendee",
    available: false,
    comingSoon: true,
  },
];

export default function EventSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: rawEvent, isLoading, error } = useQuery<any, Error>({
    queryKey: ["event", id],
    queryFn: () => getJson<any>(`/events/${id}`),
    enabled: Boolean(id),
  });

  const [formData, setFormData] = useState({
    title: "",
    startDate: "",
    endDate: "",
    location: "",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    emailSignature: "",
    googleDriveConnected: false,
    rootFolder: "",
  });

  const [selectedModules, setSelectedModules] = useState<string[]>(["speaker"]);
  const [driveFolders, setDriveFolders] = useState<any[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string[]>([]);
  const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam() });
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [promoTemplateFile, setPromoTemplateFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const [promoTemplatePreview, setPromoTemplatePreview] = useState<string | null>(null);
  const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formConfig, setFormConfig] = useState<FormFieldConfig[] | undefined>(undefined);

  useEffect(() => {
    if (!rawEvent) return;
    // helper to coerce various date formats (ISO or timestamps) into YYYY-MM-DD for <input type="date" />
    const toDateInput = (v: any) => {
      if (v == null) return "";
      // If already in YYYY-MM-DD, return as-is
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      // If ISO datetime, extract date portion
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
      // If numeric timestamp (seconds or ms)
      if (typeof v === "number") {
        // assume seconds if 10 digits
        const asMs = v > 1e12 ? v : v * 1000;
        const d = new Date(asMs);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
      // last resort: try Date parse
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return "";
    };

    setFormData((prev) => ({
      ...prev,
      title: rawEvent.title ?? "",
      startDate: toDateInput(rawEvent.start_date ?? rawEvent.startDate ?? ""),
      endDate: toDateInput(rawEvent.end_date ?? rawEvent.endDate ?? ""),
      location: rawEvent.location ?? "",
      fromName: rawEvent.from_name ?? rawEvent.fromName ?? "",
      fromEmail: rawEvent.from_email ?? rawEvent.fromEmail ?? "",
      replyToEmail: rawEvent.reply_to_email ?? rawEvent.replyToEmail ?? "",
      emailSignature: rawEvent.email_signature ?? rawEvent.emailSignature ?? "",
      googleDriveConnected: rawEvent.google_drive_connected ?? false,
      rootFolder: rawEvent.root_folder ?? rawEvent.rootFolder ?? "",
    }));

    // modules - support new object shape { speaker: true } or older array/string formats
    const rawModules = rawEvent.modules;
    let modulesArray: any[] = [];
    if (Array.isArray(rawModules)) modulesArray = rawModules;
    else if (!rawModules) modulesArray = [];
    else if (typeof rawModules === "string") modulesArray = (rawModules as any).split(",").map((name: string) => ({ id: name.trim(), name: name.trim(), enabled: true }));
    else if (typeof rawModules === "object") {
      modulesArray = Object.entries(rawModules).map(([key, val]) => (typeof val === "object" ? { id: key, name: key, ...val } : { id: key, name: key, enabled: !!val }));
    }

    setSelectedModules(modulesArray.map((m: any) => m.name || m.id));

  setEventImagePreview(rawEvent.eventImage ?? rawEvent.event_image ?? null);
  setPromoTemplatePreview(rawEvent.promoCardTemplate ?? rawEvent.promo_card_template ?? null);
  setSelectedTeamId(rawEvent.teamId ?? rawEvent.team_id ?? undefined);
  }, [rawEvent]);

  useEffect(() => {
    (async () => {
      try {
        const status = await getGoogleDriveStatus();
        if (status?.connected) {
          const folders = (status as any).folders ?? [];
          setDriveFolders(folders);
          // if a root folder already exists on the event, compute selectedFolderPath to pre-select cascading selects
          const rootId = (status as any).root_folder ?? (folders.length ? folders[0].id : undefined) ?? undefined;
          setFormData((prev) => ({
            ...prev,
            googleDriveConnected: true,
            rootFolder: rootId ?? prev.rootFolder ?? "",
          }));
          // if formData.rootFolder already populated (from rawEvent), compute full path
          const initialRoot = (status as any).root_folder ?? undefined;
          if (formData.rootFolder) {
            // find path to the existing rootFolder within the fetched folders
            const findPathToFolder = (foldersList: any[], targetId: string): string[] => {
              if (!foldersList || !targetId) return [];
              for (const f of foldersList) {
                if (f.id === targetId) return [f.id];
                if (f.children && f.children.length) {
                  const childPath = findPathToFolder(f.children, targetId);
                  if (childPath.length) return [f.id, ...childPath];
                }
              }
              return [];
            };
            const path = findPathToFolder(folders, formData.rootFolder);
            if (path && path.length) {
              setSelectedFolderPath(path);
              // set currentDepth to allow user to continue drilling from deepest preselected level
              setCurrentDepth(Math.max(0, path.length - 1));
            }
          }
        }
      } catch (err) {
        console.debug("Google Drive status check failed", err);
      }
    })();
  }, []);

  const renderFolderOptions = (folders: any[], depth = 0): React.ReactNode[] => {
    if (!folders || !Array.isArray(folders)) return [];
    return folders.flatMap((f: any) => {
      const item = (
        <SelectItem key={f.id} value={f.id}>
          <span style={{ paddingLeft: depth * 12 }}>{f.name}</span>
        </SelectItem>
      );
      const children = f.children && f.children.length ? renderFolderOptions(f.children, depth + 1) : [];
      return [item, ...children];
    });
  };

  // cascading helpers (mirrors CreateEvent)
  const findPathToFolder = (folders: any[], targetId: string): string[] => {
    if (!folders || !targetId) return [];
    for (const f of folders) {
      if (f.id === targetId) return [f.id];
      if (f.children && f.children.length) {
        const childPath = findPathToFolder(f.children, targetId);
        if (childPath.length) return [f.id, ...childPath];
      }
    }
    return [];
  };

  // helper to find folder object by id
  const findFolderById = (folders: any[], id?: string): any | null => {
    if (!id) return null;
    for (const f of folders) {
      if (f.id === id) return f;
      if (f.children && f.children.length) {
        const res = findFolderById(f.children, id);
        if (res) return res;
      }
    }
    return null;
  };

  const getFoldersForDepth = (depth: number): any[] => {
    if (depth === 0) return driveFolders;
    let current = null as any;
    for (let i = 0; i < depth; i++) {
      const id = selectedFolderPath[i];
      if (!id) return [];
      const list = current ? current.children ?? [] : driveFolders;
      current = list.find((x: any) => x.id === id);
      if (!current) return [];
    }
    return current?.children ?? [];
  };

  const [currentDepth, setCurrentDepth] = useState<number>(0);

  const handleSelectAtDepth = (depth: number, val: string) => {
    setSelectedFolderPath((prev) => {
      const next = prev.slice(0, depth);
      next[depth] = val;
      return next;
    });
    setFormData((f) => ({ ...f, rootFolder: val }));
    const opts = getFoldersForDepth(depth);
    const selected = opts.find((o: any) => o.id === val);
    if (selected && selected.children && selected.children.length) setCurrentDepth(depth + 1);
    else setCurrentDepth(depth);
  };

  const renderCascadingSelects = () => {
    const options = getFoldersForDepth(currentDepth);
    if (!options || options.length === 0) return (
      <Select>
        <SelectTrigger className="w-full sm:w-[300px]">
          <SelectValue placeholder="No folders available" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-folders" disabled>No folders available</SelectItem>
        </SelectContent>
      </Select>
    );

    const value = selectedFolderPath[currentDepth] ?? "";
    return (
      <div>
        <div className="text-xs text-muted-foreground mb-1">{currentDepth === 0 ? "Top level" : `Level ${currentDepth + 1}`}</div>
        <Select value={value} aria-label={`Folder level ${currentDepth + 1}`} onValueChange={(val) => handleSelectAtDepth(currentDepth, val)}>
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder={currentDepth === 0 ? "Select folder" : "Select subfolder"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((f: any) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      // Generate an event id if none present so uploads can be associated (keep existing id if server provided one)
      const eventId = rawEvent?.id ?? rawEvent?.event_id ?? id;

      // convert selectedModules (array) -> modules object expected by API
      const modulesObj: Record<string, boolean> = {};
      selectedModules.forEach((m) => (modulesObj[m] = true));

      const payload: any = {
        title: formData.title,
        start_date: formData.startDate || undefined,
        end_date: formData.endDate || undefined,
        location: formData.location || undefined,
        from_name: formData.fromName || undefined,
        from_email: formData.fromEmail || undefined,
        reply_to_email: formData.replyToEmail || undefined,
        email_signature: formData.emailSignature || undefined,
        modules: modulesObj,
      };

      // Only include team_id if it's actually set
      if (selectedTeamId) {
        payload.team_id = selectedTeamId;
      }

      try {
        if (eventImageFile) {
          const res = await uploadFile(eventImageFile, "user", me?.id ?? "", undefined, eventId);
          const imageValue = res?.public_url ?? res?.publicUrl ?? res?.url ?? res?.id ?? null;
          if (imageValue) payload.event_image = imageValue;
        }
      } catch (err: any) {
        console.error("Event image upload failed", err);
        toast({ title: "Event image upload failed", description: String(err?.message || err) });
      }

      try {
        if (promoTemplateFile) {
          const res2 = await uploadFile(promoTemplateFile, "user", me?.id ?? "", undefined, eventId);
          const promoValue = res2?.public_url ?? res2?.publicUrl ?? res2?.url ?? res2?.id ?? null;
          if (promoValue) (payload as any).promo_card_template = promoValue;
        }
      } catch (err: any) {
        console.error("Promo template upload failed", err);
        toast({ title: "Promo template upload failed", description: String(err?.message || err) });
      }

      // Remove undefined values from payload
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      await updateEvent(id, payload);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast({ title: "Event updated" });
    } catch (err: any) {
      console.error("Update event failed", err);
      const errorMsg = err?.message || String(err);
      toast({
        title: "Failed to update event",
        description: errorMsg.includes('fetch') ? 'Network error - check console for details' : errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rawEvent && isLoading) return <div className="py-16 text-center">Loading…</div>;

  if (!rawEvent && error) return <div className="py-16 text-center text-destructive">Error loading event: {String(error.message)}</div>;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 style={{ fontSize: 'var(--font-h1)', fontWeight: 600 }}>Edit Event</h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: 'var(--font-body)' }}>Update your event details and assets</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Google Drive */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>
                <FolderOpen className="h-5 w-5 text-primary" />
                Google Drive Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Connect Google Drive</p>
                  <p className="text-sm text-muted-foreground">Sync speaker assets and content automatically</p>
                </div>
                {formData.googleDriveConnected ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" type="button" disabled>
                      <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Connected
                    </Button>
                    <Button variant="destructive" type="button" onClick={async () => {
                      try {
                        await deleteIntegration("google");
                        setDriveFolders([]);
                        setFormData((prev) => ({ ...prev, googleDriveConnected: false, rootFolder: "" }));
                        setSelectedFolderPath([]);
                        toast({ title: "Disconnected", description: "Google Drive integration removed" });
                      } catch (err: any) {
                        console.error("Failed to disconnect", err);
                        toast({ title: "Failed to disconnect", description: String(err?.message || err) });
                      }
                    }}>Disconnect</Button>
                  </div>
                ) : (
                  <Button variant="outline" type="button" onClick={async () => {
                    try {
                      const res = await getIntegrationUrl("google");
                      if (res?.url) window.location.href = res.url;
                      else toast({ title: "Failed to start integration", description: "No URL returned from server" });
                    } catch (err: any) {
                      console.error("Integration link failed", err);
                      toast({ title: "Failed to start integration", description: String(err?.message || err) });
                    }
                  }}>
                    <LinkIcon className="h-4 w-4" />
                    Connect Drive
                  </Button>
                )}
              </div>

              {formData.googleDriveConnected && (
                <div className="space-y-2">
                  <Label>Root Event Folder</Label>
                  {renderCascadingSelects()}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="text-sm text-muted-foreground">{selectedFolderPath && selectedFolderPath.length ? selectedFolderPath.map(id => findFolderById(driveFolders, id)?.name ?? id).join(" / ") : "No folder selected"}</div>
                      {selectedFolderPath && selectedFolderPath.length > 0 && (
                        <Button variant="ghost" size="sm" type="button" onClick={() => { setSelectedFolderPath([]); setFormData((f) => ({ ...f, rootFolder: "" })); setCurrentDepth(0); }}>
                          Clear selection
                        </Button>
                      )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>
                <Calendar className="h-5 w-5 text-primary" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Event Title</Label>
                <Input placeholder="e.g., Tech Summit 2025" value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formData.endDate} onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="e.g., San Francisco, CA" value={formData.location} onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          {/* Module Selection */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Event Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableModules.map((module) => {
                  const Icon = module.icon;
                  const isSelected = selectedModules.includes(module.id);

                  return (
                    <div
                      key={module.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all duration-200 cursor-pointer",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                        !module.available && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => module.available && toggleModule(module.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {module.comingSoon ? (
                          <Badge variant="secondary" className="text-xs">Soon</Badge>
                        ) : (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={isSelected}
                              disabled={!module.available}
                              onCheckedChange={() => module.available && toggleModule(module.id)}
                            />
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-foreground text-sm mb-1">{module.name}</h4>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>
                <Mail className="h-5 w-5 text-primary" />
                Email Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>'From' Name</Label>
                <Input placeholder="Your Company Name" value={formData.fromName} onChange={(e) => setFormData((prev) => ({ ...prev, fromName: e.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>'From' Email</Label>
                  <Input type="email" placeholder="events@yourcompany.com" value={formData.fromEmail} onChange={(e) => setFormData((prev) => ({ ...prev, fromEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>'Reply To' Email</Label>
                  <Input type="email" placeholder="hello@yourcompany.com" value={formData.replyToEmail} onChange={(e) => setFormData((prev) => ({ ...prev, replyToEmail: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Signature</Label>
                <Textarea placeholder="Your default email signature..." value={formData.emailSignature} onChange={(e) => setFormData((prev) => ({ ...prev, emailSignature: e.target.value }))} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Images & Templates */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Images & Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 items-start">
                <div className="space-y-2">
                  <Label>Event Image</Label>
                  <input id="eventImage" type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] ?? null; setEventImageFile(f); if (f) setEventImagePreview(URL.createObjectURL(f)); else setEventImagePreview(null); }} />
                  {eventImagePreview && (<img src={eventImagePreview} alt="Event" className="mt-2 max-h-40 rounded" />)}
                </div>

                <div className="space-y-2">
                  <Label>Promo Card Template (PNG/PDF)</Label>
                  <input id="promoTemplate" type="file" accept="image/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0] ?? null; setPromoTemplateFile(f); if (f && f.type.startsWith("image/")) setPromoTemplatePreview(URL.createObjectURL(f)); else setPromoTemplatePreview(null); }} />
                  {promoTemplatePreview && (<img src={promoTemplatePreview} alt="Promo template" className="mt-2 max-h-40 rounded" />)}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => navigate(`/organizer/event/${id}`)}>Cancel</Button>
            <Button variant="outline" type="submit" className="border-[1.5px]" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>

        {/* Speaker Intake Form Builder */}
        {selectedModules.includes("speaker") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>
                <FormInput className="h-5 w-5 text-primary" />
                Speaker Intake Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpeakerFormBuilder
                eventId={id!}
                initialConfig={formConfig}
                onSave={(config) => {
                  setFormConfig(config);
                  // TODO: Save to backend when API is ready
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
  );
}
