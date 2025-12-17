import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Mail,
  Link as LinkIcon,
  Mic2,
  FileText,
  Users,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createEvent } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const availableModules = [
  {
    id: "speaker",
    name: "Speaker Management",
    description: "Manage speakers, intake forms, and promo cards",
    icon: Mic2,
    color: "speaker",
    available: true,
  },
  {
    id: "schedule",
    name: "Schedule Management",
    description: "Create and publish event schedules",
    icon: Calendar,
    color: "schedule",
    available: true,
  },
  {
    id: "content",
    name: "Content Management",
    description: "Centralized hub for presentations and files",
    icon: FileText,
    color: "content",
    available: false,
    comingSoon: true,
  },
  {
    id: "attendee",
    name: "Attendee Management",
    description: "Manage registrations and communications",
    icon: Users,
    color: "attendee",
    available: false,
    comingSoon: true,
  },
];

export default function CreateEvent() {
  const navigate = useNavigate();
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

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, modules: selectedModules };
      const created = await createEvent(payload);
      toast({ title: "Event created", description: `Created ${created.title}` });
      // navigate to the event dashboard if id present
      if (created?.id) {
        navigate(`/event/${created.id}`);
      } else {
        navigate("/events");
      }
    } catch (err: any) {
      console.error("Create event failed", err);
      toast({ title: "Failed to create event", description: String(err?.message || err) });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/events">
              <ChevronLeft className="h-4 w-4" />
              Back to Events
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Create New Event
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up your event details and choose which modules to enable
          </p>
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
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Tech Summit 2025"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
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
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., San Francisco, CA"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                />
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
                  <Label htmlFor="fromEmail">'From' Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    placeholder="events@yourcompany.com"
                    value={formData.fromEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fromEmail: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replyEmail">'Reply To' Email</Label>
                  <Input
                    id="replyEmail"
                    type="email"
                    placeholder="hello@yourcompany.com"
                    value={formData.replyEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        replyEmail: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Email Signature</Label>
                <Textarea
                  id="signature"
                  placeholder="Your default email signature..."
                  value={formData.emailSignature}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      emailSignature: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Google Drive */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Google Drive Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Connect Google Drive
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sync speaker assets and content automatically
                  </p>
                </div>
                <Button variant="outline" type="button">
                  <LinkIcon className="h-4 w-4" />
                  Connect Drive
                </Button>
              </div>

              {formData.googleDriveConnected && (
                <div className="space-y-2">
                  <Label htmlFor="rootFolder">Root Event Folder</Label>
                  <Input
                    id="rootFolder"
                    placeholder="Select or create a folder..."
                    value={formData.rootFolder}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rootFolder: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {availableModules.map((module) => {
                  const Icon = module.icon;
                  const isSelected = selectedModules.includes(module.id);

                  return (
                    <div
                      key={module.id}
                      className={cn(
                        "rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30",
                        !module.available && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() =>
                        module.available && toggleModule(module.id)
                      }
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        {module.comingSoon ? (
                          <Badge variant="secondary" className="text-xs">
                            Coming Soon
                          </Badge>
                        ) : (
                          <Switch
                            checked={isSelected}
                            disabled={!module.available}
                          />
                        )}
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">
                        {module.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" asChild>
              <Link to="/events">Cancel</Link>
            </Button>
            <Button variant="teal" type="submit" size="lg">
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
