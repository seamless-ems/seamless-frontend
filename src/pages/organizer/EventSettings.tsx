import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, updateEvent, getTeam } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Mic2, FileText, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    available: false,
    comingSoon: true,
  },
  {
    id: "content",
    name: "Content",
    description: "Centralized hub for presentations and files",
    icon: FileText,
    color: "content",
    available: false,
    comingSoon: true,
  },
  {
    id: "partners",
    name: "Partners",
    description: "Manage sponsors and partners",
    icon: Users,
    color: "primary",
    available: false,
    comingSoon: true,
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
    eventWebsite: "",
  });

  const [selectedModules, setSelectedModules] = useState<string[]>(["speaker"]);
  const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam() });
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!rawEvent) return;

    const toDateInput = (v: any) => {
      if (v == null) return "";
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
      if (typeof v === "number") {
        const asMs = v > 1e12 ? v : v * 1000;
        const d = new Date(asMs);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return "";
    };

    setFormData({
      title: rawEvent.title ?? "",
      startDate: toDateInput(rawEvent.start_date ?? rawEvent.startDate ?? ""),
      endDate: toDateInput(rawEvent.end_date ?? rawEvent.endDate ?? ""),
      location: rawEvent.location ?? "",
      eventWebsite: rawEvent.event_website ?? rawEvent.eventWebsite ?? "",
    });

    const rawModules = rawEvent.modules;
    let modulesArray: any[] = [];
    if (Array.isArray(rawModules)) modulesArray = rawModules;
    else if (!rawModules) modulesArray = [];
    else if (typeof rawModules === "string") modulesArray = rawModules.split(",").map((name: string) => ({ id: name.trim(), name: name.trim() }));
    else if (typeof rawModules === "object") {
      modulesArray = Object.entries(rawModules).map(([key, val]) => (typeof val === "object" ? { id: key, name: key, ...val } : { id: key, name: key, enabled: !!val }));
    }
    setSelectedModules(modulesArray.map((m: any) => m.name || m.id));
    setSelectedTeamId(rawEvent.teamId ?? rawEvent.team_id ?? undefined);
  }, [rawEvent]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) => (prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      const modulesObj: Record<string, boolean> = {};
      selectedModules.forEach((m) => (modulesObj[m] = true));

      const payload: any = {
        id: rawEvent?.id ?? rawEvent?.event_id ?? id,
        title: formData.title,
        start_date: formData.startDate || undefined,
        end_date: formData.endDate || undefined,
        location: formData.location || undefined,
        event_website: formData.eventWebsite || undefined,
        modules: modulesObj,
      };

      if (selectedTeamId) payload.team_id = selectedTeamId;

      Object.keys(payload).forEach((key) => { if (payload[key] === undefined) delete payload[key]; });

      await updateEvent(id, payload);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast({ title: "Event updated" });
    } catch (err: any) {
      toast({ title: "Failed to update event", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rawEvent && isLoading) return <div className="py-16 text-center">Loading…</div>;
  if (!rawEvent && error) return <div className="py-16 text-center text-destructive">Error loading event: {String(error.message)}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select value={selectedTeamId ?? ""} onValueChange={(val) => setSelectedTeamId(val)}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder={teams && teams.length ? "Select team" : "No teams"} />
                </SelectTrigger>
                <SelectContent>
                  {teams && teams.length ? (
                    teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                  ) : (
                    <SelectItem value="no-teams" disabled>No teams available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                placeholder="e.g., Tech Summit 2025"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, CA"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventWebsite">Event Website</Label>
              <Input
                id="eventWebsite"
                type="text"
                placeholder="www.example.com/event"
                value={formData.eventWebsite}
                onChange={(e) => setFormData((prev) => ({ ...prev, eventWebsite: e.target.value }))}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Modules</CardTitle>
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
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      ) : (
                        <Switch checked={isSelected} disabled={!module.available} />
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

        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" className="border-[1.5px]" onClick={() => navigate(`/organizer/event/${id}/speakers`)}>Cancel</Button>
          <Button variant="outline" type="submit" className="border-[1.5px]" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
