import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWarnOnLeave } from "@/hooks/useWarnOnLeave";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, updateEvent, getTeam, createCheckout } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, FileText, Mail, Mic2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const activeModules = [
  {
    id: "speaker",
    name: "Speakers",
    description: "Manage speakers, intake forms, and promo cards",
    icon: Mic2,
    color: "speaker",
  },
  {
    id: "content",
    name: "Content",
    description: "Centralized hub for presentations and files",
    icon: FileText,
    color: "content",
  },
];

const comingSoonModules = [
  {
    id: "schedule",
    name: "Schedule",
    description: "Create and publish event schedules",
    icon: Calendar,
    color: "schedule",
  },
  {
    id: "partners",
    name: "Partners",
    description: "Manage sponsors and partners",
    icon: Users,
    color: "primary",
  },
  {
    id: "attendee",
    name: "Attendees",
    description: "Manage registrations and communications",
    icon: Users,
    color: "attendee",
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
    id: "",
    title: "",
    startDate: "",
    endDate: "",
    location: "",
    website: "",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    emailSignature: "",
  });

  const [selectedModules, setSelectedModules] = useState<string[]>(["speaker"]);
  const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam() });
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const initializedRef = useRef(false);
  useWarnOnLeave(isDirty);

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
      id: rawEvent.id ?? rawEvent.event_id ?? "",
      title: rawEvent.title ?? "",
      startDate: toDateInput(rawEvent.start_date ?? rawEvent.startDate ?? ""),
      endDate: toDateInput(rawEvent.end_date ?? rawEvent.endDate ?? ""),
      location: rawEvent.location ?? "",
      website: rawEvent.website ?? "",
      fromName: rawEvent.from_name ?? rawEvent.fromName ?? "",
      fromEmail: rawEvent.from_email ?? rawEvent.fromEmail ?? "",
      replyToEmail: rawEvent.reply_to_email ?? rawEvent.replyToEmail ?? "",
      emailSignature: rawEvent.email_signature ?? rawEvent.emailSignature ?? "",
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
    setSelectedTeamId(rawEvent.teamId ?? rawEvent.team_id ?? undefined);
    // Mark clean after initial server data loads; any user change after this = dirty
    setTimeout(() => { initializedRef.current = true; }, 0);
  }, [rawEvent]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]));
    if (initializedRef.current) setIsDirty(true);
  };

  const doSave = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const eventId = rawEvent?.id ?? rawEvent?.event_id ?? id;
      const modulesObj: Record<string, boolean> = {};
      selectedModules.forEach((m) => (modulesObj[m] = true));
      const payload: any = {
        id: eventId,
        title: formData.title,
        start_date: formData.startDate || undefined,
        end_date: formData.endDate || undefined,
        location: formData.location || undefined,
        website: formData.website || undefined,
        modules: modulesObj,
        from_name: formData.fromName || undefined,
        from_email: formData.fromEmail || undefined,
        // If replyToEmail is not provided, default to fromEmail (trim and ignore empty strings)
        reply_to_email: (formData.replyToEmail && formData.replyToEmail.trim()) ? formData.replyToEmail.trim() : (formData.fromEmail && formData.fromEmail.trim() ? formData.fromEmail.trim() : undefined),
        email_signature: formData.emailSignature || undefined,
      };
      if (selectedTeamId) payload.team_id = selectedTeamId;
      // Remove undefined or empty-string values so we don't send "" for optional fields
      Object.keys(payload).forEach(key => {
        const v = payload[key];
        if (v === undefined) { delete payload[key]; return; }
        if (typeof v === "string" && v.trim() === "") { delete payload[key]; }
      });
      await updateEvent(id, payload);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      setIsDirty(false);
      toast({ title: "Event updated" });
    } catch (err: any) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSave();
  };

  if (!rawEvent && isLoading) return <div className="py-16 text-center">Loading…</div>;

  if (!rawEvent && error) return <div className="py-16 text-center text-destructive">Error loading event: {String(error.message)}</div>;

  return (
      <div className="max-w-4xl mx-auto space-y-6">
      <UnsavedChangesDialog
        open={showLeaveDialog}
        onSave={async () => { setShowLeaveDialog(false); await doSave(); navigate(`/organizer/event/${id}`); }}
        onDiscard={() => { setShowLeaveDialog(false); navigate(`/organizer/event/${id}`); }}
        onCancel={() => setShowLeaveDialog(false)}
      />
        <div>
          <h1 style={{ fontSize: 'var(--font-h1)', fontWeight: 600 }}>Edit Event</h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: 'var(--font-body)' }}>Update your event details and assets</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

            {/* Billing / Checkout */}
            {id && selectedModules.includes("speaker") && (
              <Card>
                <CardHeader>
                  <CardTitle style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Billing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Subscribe to the Speakers &amp; Content module for this event.</p>
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" type="button" onClick={async () => {
                      if (!id) return;
                      try {
                        const res = await createCheckout("speaker", id);
                        const url = res?.url || res?.checkout_url || res?.redirect_url || res?.checkoutUrl || (typeof res === "string" ? res : undefined) || res?.data?.url;
                        if (url) {
                          window.location.href = url;
                          return;
                        }
                        toast({ title: "Checkout created", description: "No redirect URL returned; please check your billing dashboard." });
                      } catch (err: any) {
                        toast({ title: "Checkout failed", description: String(err?.message || err) });
                      }
                    }}>Subscribe</Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
                <Input placeholder="e.g., Tech Summit 2025" value={formData.title} onChange={(e) => { setFormData((prev) => ({ ...prev, title: e.target.value })); setIsDirty(true); }} required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={(e) => { setFormData((prev) => ({ ...prev, startDate: e.target.value })); setIsDirty(true); }} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formData.endDate} onChange={(e) => { setFormData((prev) => ({ ...prev, endDate: e.target.value })); setIsDirty(true); }} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="e.g., San Francisco, CA" value={formData.location} onChange={(e) => { setFormData((prev) => ({ ...prev, location: e.target.value })); setIsDirty(true); }} />
              </div>

              <div className="space-y-2">
                <Label>Event Website</Label>
                <Input type="text" placeholder="www.example.com/event" value={formData.website} onChange={(e) => { setFormData((prev) => ({ ...prev, website: e.target.value })); setIsDirty(true); }} required />
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
                <Input placeholder="e.g., Your Company Events" value={formData.fromName}
                  onChange={(e) => { setFormData((prev) => ({ ...prev, fromName: e.target.value })); setIsDirty(true); }} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>'From' Email</Label>
                  <Input type="email" placeholder="events@yourcompany.com" value={formData.fromEmail}
                    onChange={(e) => { setFormData((prev) => ({ ...prev, fromEmail: e.target.value })); setIsDirty(true); }} />
                </div>
                <div className="space-y-2">
                  <Label>'Reply To' Email</Label>
                  <Input type="email" placeholder="Optional — defaults to From Email" value={formData.replyToEmail}
                    onChange={(e) => { setFormData((prev) => ({ ...prev, replyToEmail: e.target.value })); setIsDirty(true); }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Signature</Label>
                <Textarea placeholder="Your default email signature…" value={formData.emailSignature}
                  onChange={(e) => { setFormData((prev) => ({ ...prev, emailSignature: e.target.value })); setIsDirty(true); }} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Module Selection */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>Event Modules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Row 1: active modules */}
              <div className="grid gap-3 grid-cols-2">
                {activeModules.map((module) => {
                  const Icon = module.icon;
                  const isSelected = selectedModules.includes(module.id);
                  return (
                    <div
                      key={module.id}
                      className={cn("rounded-lg border p-3 transition-all duration-200 cursor-pointer", isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Switch checked={isSelected} onCheckedChange={() => toggleModule(module.id)} />
                        </div>
                      </div>
                      <h4 className="font-medium text-foreground text-sm mb-1">{module.name}</h4>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                  );
                })}
              </div>
              {/* Row 2: coming soon */}
              <div className="grid gap-3 sm:grid-cols-3">
                {comingSoonModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div key={module.id} className="rounded-lg border p-3 opacity-50 cursor-not-allowed border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                      <h4 className="font-medium text-foreground text-sm mb-1">{module.name}</h4>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => {
              if (isDirty) { setShowLeaveDialog(true); return; }
              navigate(`/organizer/event/${id}`);
            }}>Cancel</Button>
            <Button variant="outline" type="submit" className="border-[1.5px]" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </div>
  );
}
