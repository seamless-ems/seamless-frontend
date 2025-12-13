import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Mic2,
  Users,
  FileText,
  Settings,
  Link as LinkIcon,
  Mail,
  ExternalLink,
} from "lucide-react";

// Mock event data
const mockEvent = {
  id: "1",
  title: "Tech Summit 2025",
  dates: "Mar 15-17, 2025",
  location: "San Francisco, CA",
  status: "active" as const,
  speakerCount: 24,
  attendeeCount: 450,
  fromEmail: "events@techsummit.com",
  replyEmail: "hello@techsummit.com",
  googleDriveLinked: true,
  rootFolder: "Tech Summit 2025",
  modules: {
    speaker: { enabled: true, count: 24, submitted: 18 },
    schedule: { enabled: true, sessions: 32 },
    content: { enabled: false },
    attendee: { enabled: false },
    app: { enabled: false },
  },
};

export default function EventDashboard() {
  const { id } = useParams();

  return (
    <DashboardLayout eventId={id}>
      <div className="space-y-8">
        {/* Event Header */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl font-bold text-foreground">
                  {mockEvent.title}
                </h1>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 capitalize"
                >
                  {mockEvent.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{mockEvent.dates}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{mockEvent.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{mockEvent.fromEmail}</span>
                </div>
              </div>

              {mockEvent.googleDriveLinked && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className="text-success border-success/30"
                  >
                    <LinkIcon className="h-3 w-3 mr-1" />
                    Google Drive Connected
                  </Badge>
                  <span className="text-muted-foreground">
                    → {mockEvent.rootFolder}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </a>
              </Button>
              <Button variant="teal" asChild>
                <a href={`/event/${id}/settings`}>
                  <Settings className="h-4 w-4" />
                  Settings
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Speakers"
            value={mockEvent.speakerCount}
            subtitle={`${mockEvent.modules.speaker.submitted} forms submitted`}
            icon={<Mic2 className="h-6 w-6" />}
            variant="primary"
          />
          <StatsCard
            title="Sessions"
            value={mockEvent.modules.schedule.sessions}
            icon={<Calendar className="h-6 w-6" />}
            variant="accent"
          />
          <StatsCard
            title="Attendees"
            value={mockEvent.attendeeCount}
            icon={<Users className="h-6 w-6" />}
          />
          <StatsCard
            title="Content Files"
            value={42}
            subtitle="12 pending review"
            icon={<FileText className="h-6 w-6" />}
          />
        </div>

        {/* Modules */}
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
            Event Modules
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ModuleCard
              title="Speaker Management"
              description="Manage speaker intake forms, assets, and promo cards"
              icon={<Mic2 className="h-6 w-6" />}
              href={`/event/${id}/speakers`}
              enabled={mockEvent.modules.speaker.enabled}
              stats={{
                label: "Registered Speakers",
                value: mockEvent.speakerCount,
              }}
              color="speaker"
              index={0}
            />
            <ModuleCard
              title="Schedule Management"
              description="Create and publish your event schedule from Google Sheets"
              icon={<Calendar className="h-6 w-6" />}
              href={`/event/${id}/schedule`}
              enabled={mockEvent.modules.schedule.enabled}
              stats={{
                label: "Sessions",
                value: mockEvent.modules.schedule.sessions,
              }}
              color="schedule"
              index={1}
            />
            <ModuleCard
              title="Content Management"
              description="Centralized hub for presentations, videos, and files"
              icon={<FileText className="h-6 w-6" />}
              href={`/event/${id}/content`}
              enabled={mockEvent.modules.content.enabled}
              color="content"
              comingSoon
              index={2}
            />
            <ModuleCard
              title="Attendee Management"
              description="Manage attendee registrations and communications"
              icon={<Users className="h-6 w-6" />}
              href={`/event/${id}/attendees`}
              enabled={mockEvent.modules.attendee.enabled}
              color="attendee"
              comingSoon
              index={3}
            />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-xl font-semibold text-foreground mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {[
              {
                action: "Speaker form submitted",
                user: "Sarah Johnson",
                time: "2 hours ago",
              },
              {
                action: "Promo card approved",
                user: "Mike Chen",
                time: "4 hours ago",
              },
              {
                action: "Schedule updated",
                user: "You",
                time: "Yesterday",
              },
              {
                action: "New speaker registered",
                user: "Emily Davis",
                time: "2 days ago",
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {activity.action}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    by {activity.user}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
