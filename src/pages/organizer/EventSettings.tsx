import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
// ...existing code...
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, updateEvent, uploadFile, getGoogleDriveStatus, getTeam, getMe } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FolderOpen, Calendar, MapPin, Mail, FileText, Mic2, Users } from "lucide-react";


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
    fromEmail: "",
    replyEmail: "",
    emailSignature: "",
    googleDriveConnected: false,
    rootFolder: "",
  });

  const [selectedModules, setSelectedModules] = useState<string[]>(["speaker"]);
  const [driveFolders, setDriveFolders] = useState<Array<{ id: string; name: string }>>([]);
  const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam() });
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [promoTemplateFile, setPromoTemplateFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const [promoTemplatePreview, setPromoTemplatePreview] = useState<string | null>(null);
  const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!rawEvent) return;
    setFormData((prev) => ({
      ...prev,
      title: rawEvent.title ?? "",
      startDate: rawEvent.start_date ?? rawEvent.startDate ?? "",
      endDate: rawEvent.end_date ?? rawEvent.endDate ?? "",
      location: rawEvent.location ?? "",
      fromEmail: rawEvent.from_email ?? rawEvent.fromEmail ?? "",
      replyEmail: rawEvent.reply_email ?? rawEvent.replyEmail ?? "",
      emailSignature: rawEvent.email_signature ?? rawEvent.emailSignature ?? "",
      googleDriveConnected: rawEvent.google_drive_connected ?? false,
      rootFolder: rawEvent.root_folder ?? rawEvent.rootFolder ?? "",
    }));

    // modules
    const modulesArray = Array.isArray(rawEvent.modules) ? rawEvent.modules : [];
    setSelectedModules(modulesArray.map((m: any) => m.name || m.id));

    setEventImagePreview(rawEvent.eventImage ?? rawEvent.event_image ?? null);
    setPromoTemplatePreview(rawEvent.promoCardTemplate ?? rawEvent.promo_card_template ?? null);
    setSelectedTeamId(rawEvent.team_id ?? rawEvent.teamId ?? undefined);
  }, [rawEvent]);

  useEffect(() => {
    (async () => {
      try {
        const status = await getGoogleDriveStatus();
        if (status?.connected) {
          setDriveFolders((status as any).folders ?? []);
          setFormData((prev) => ({
            ...prev,
            googleDriveConnected: true,
            rootFolder: (status as any).root_folder ?? ((status as any).folders && (status as any).folders.length ? (status as any).folders[0].id : prev.rootFolder ?? ""),
          }));
        }
      } catch (err) {
        console.debug("Google Drive status check failed", err);
      }
    })();
  }, []);

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

      const payload: any = {
        title: formData.title,
        start_date: formData.startDate || undefined,
        end_date: formData.endDate || undefined,
        location: formData.location || undefined,
        from_email: formData.fromEmail || undefined,
        reply_email: formData.replyEmail || undefined,
        email_signature: formData.emailSignature || undefined,
        modules: selectedModules,
        team_id: selectedTeamId,
      };

      try {
        if (eventImageFile) {
          const res = await uploadFile(eventImageFile, "user", me?.id ?? "", undefined, eventId);
          const imageValue = res?.public_url ?? res?.publicUrl ?? res?.url ?? res?.id ?? null;
          if (imageValue) payload.eventImage = imageValue;
        }
      } catch (err: any) {
        console.error("Event image upload failed", err);
        toast({ title: "Event image upload failed", description: String(err?.message || err) });
      }

      try {
        if (promoTemplateFile) {
          const res2 = await uploadFile(promoTemplateFile, "user", me?.id ?? "", undefined, eventId);
          const promoValue = res2?.public_url ?? res2?.publicUrl ?? res2?.url ?? res2?.id ?? null;
          if (promoValue) payload.promoCardTemplate = promoValue;
        }
      } catch (err: any) {
        console.error("Promo template upload failed", err);
        toast({ title: "Promo template upload failed", description: String(err?.message || err) });
      }

      await updateEvent(id, payload);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast({ title: "Event updated" });
    } catch (err: any) {
      console.error("Update event failed", err);
      toast({ title: "Failed to update event", description: String(err?.message || err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rawEvent && isLoading) return <div className="py-16 text-center">Loading…</div>;

  if (!rawEvent && error) return <div className="py-16 text-center text-destructive">Error loading event: {String(error.message)}</div>;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Edit Event</h1>
          <p className="text-muted-foreground mt-1">Update your event details and assets</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
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

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>'From' Email</Label>
                  <Input type="email" placeholder="events@yourcompany.com" value={formData.fromEmail} onChange={(e) => setFormData((prev) => ({ ...prev, fromEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>'Reply To' Email</Label>
                  <Input type="email" placeholder="hello@yourcompany.com" value={formData.replyEmail} onChange={(e) => setFormData((prev) => ({ ...prev, replyEmail: e.target.value }))} />
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
              <CardTitle className="text-lg">Images & Templates</CardTitle>
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
            <Button variant="teal" type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </div>
  );
}
