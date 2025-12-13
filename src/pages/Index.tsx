import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EventCard } from "@/components/dashboard/EventCard";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Mic2, FileText, Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Event } from "@/types/event";

// Mock data
const mockEvents: Event[] = [
  {
    id: "1",
    title: "Tech Summit 2025",
    dates: "Mar 15-17, 2025",
    location: "San Francisco, CA",
    status: "active",
    speakerCount: 24,
    attendeeCount: 450,
    modules: [
      { id: "1", name: "speaker", enabled: true },
      { id: "2", name: "schedule", enabled: true },
      { id: "3", name: "content", enabled: false },
    ],
    googleDriveLinked: true,
    rootFolder: "Tech Summit 2025",
  },
  {
    id: "2",
    title: "Product Launch Event",
    dates: "Apr 5, 2025",
    location: "New York, NY",
    status: "draft",
    speakerCount: 8,
    attendeeCount: 0,
    modules: [
      { id: "1", name: "speaker", enabled: true },
      { id: "2", name: "schedule", enabled: false },
      { id: "3", name: "content", enabled: false },
    ],
    googleDriveLinked: false,
  },
  {
    id: "3",
    title: "Annual Conference 2024",
    dates: "Nov 20-22, 2024",
    location: "London, UK",
    status: "completed",
    speakerCount: 45,
    attendeeCount: 1200,
    modules: [
      { id: "1", name: "speaker", enabled: true },
      { id: "2", name: "schedule", enabled: true },
      { id: "3", name: "content", enabled: true },
    ],
    googleDriveLinked: true,
    rootFolder: "Annual Conference 2024",
  },
];

export default function Index() {
  const totalSpeakers = mockEvents.reduce((sum, e) => sum + e.speakerCount, 0);
  const totalAttendees = mockEvents.reduce((sum, e) => sum + e.attendeeCount, 0);
  const activeEvents = mockEvents.filter((e) => e.status === "active").length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Welcome back, James
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your events
            </p>
          </div>
          <Button variant="teal" size="lg" asChild>
            <Link to="/events/new">
              <Plus className="h-5 w-5" />
              Create New Event
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Events"
            value={mockEvents.length}
            subtitle={`${activeEvents} active`}
            icon={<Calendar className="h-6 w-6" />}
            variant="primary"
          />
          <StatsCard
            title="Total Speakers"
            value={totalSpeakers}
            icon={<Mic2 className="h-6 w-6" />}
            trend={{ value: 12, label: "from last month" }}
            variant="primary"
          />
          <StatsCard
            title="Total Attendees"
            value={totalAttendees.toLocaleString()}
            icon={<Users className="h-6 w-6" />}
            variant="accent"
          />
          <StatsCard
            title="Content Uploads"
            value={156}
            subtitle="Across all events"
            icon={<FileText className="h-6 w-6" />}
          />
        </div>

        {/* Recent Events */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Your Events
            </h2>
            <Button variant="ghost" asChild>
              <Link to="/events" className="flex items-center gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {mockEvents.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-xl font-semibold text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="soft" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/events/new">
                <Plus className="h-5 w-5" />
                <span>Create Event</span>
              </Link>
            </Button>
            <Button variant="soft" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/team">
                <Users className="h-5 w-5" />
                <span>Invite Team</span>
              </Link>
            </Button>
            <Button variant="soft" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/subscription">
                <FileText className="h-5 w-5" />
                <span>Manage Plan</span>
              </Link>
            </Button>
            <Button variant="soft" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/settings">
                <Calendar className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
