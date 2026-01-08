import { StatsCard } from "@/components/dashboard/StatsCard";
import { EventCard } from "@/components/dashboard/EventCard";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Mic2, FileText, Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Event } from "@/types/event";
import { useQuery } from "@tanstack/react-query";
import { getJson, getMe } from "@/lib/api";

async function fetchEvents(): Promise<Event[]> {
  // Normalize response shape if backend returns items/results/data
  const res = await getJson<any>(`/events`);
  let arr: any[] = [];
  if (Array.isArray(res)) arr = res;
  else if (Array.isArray(res.items)) arr = res.items;
  else if (Array.isArray(res.results)) arr = res.results;
  else if (Array.isArray(res.data)) arr = res.data;
  else {
    const firstArray = Object.values(res).find((v: any) => Array.isArray(v));
    if (Array.isArray(firstArray)) arr = firstArray as any[];
  }

  // deep camelize keys
  function toCamel(str: string) { return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
  function deepCamel(obj: any): any {
    if (Array.isArray(obj)) return obj.map(deepCamel);
    if (obj && typeof obj === 'object' && obj.constructor === Object) {
      const out: any = {};
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          out[toCamel(k)] = deepCamel(obj[k]);
        }
      }
      return out;
    }
    return obj;
  }

  const mapped = arr.map(deepCamel) as Event[];
  return mapped;
}

export default function Index() {
  const { data, isLoading } = useQuery<Event[]>({ queryKey: ["events"], queryFn: fetchEvents });
  const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });

  // ensure we always operate on an array - backend may return objects sometimes
  const events: Event[] = Array.isArray(data) ? data : (data ? (data as any).items ?? (data as any).results ?? (data as any).data ?? [] : []);

  const totalSpeakers = events.reduce((sum, e) => sum + (e.speakerCount ?? 0), 0);
  const totalAttendees = events.reduce((sum, e) => sum + (e.attendeeCount ?? 0), 0);
  const activeEvents = events.filter((e) => e.status === "active").length;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome back{me?.first_name ? `, ${me.first_name}` : ", User"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your events
          </p>
        </div>
        <Button variant="teal" size="lg" asChild>
          <Link to="/organizer/events/new">
            <Plus className="h-5 w-5" />
            Create New Event
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        <StatsCard
          title="Total Events"
          value={events.length}
          subtitle={`${activeEvents} active`}
          icon={<Calendar className="h-6 w-6" />}
          variant="primary"
        />
        <StatsCard
          title="Total Speakers"
          value={totalSpeakers}
          subtitle="Across all events"
          icon={<Mic2 className="h-6 w-6" />}
          // trend={{ value: 12, label: "from last month" }}
          variant="primary"
        />
        {/* <StatsCard
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
          /> */}
      </div>

      {/* Recent Events */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Your Events
          </h2>
          <Button variant="ghost" asChild>
            <Link to="/organizer/events" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            events.map((event, index) => <EventCard key={event.id} event={event} index={index} />)
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-xl font-semibold text-foreground mb-4">
          Quick Actions
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="soft" className="h-auto py-4 flex-col gap-2" asChild>
            <Link to="/organizer/events/new">
              <Plus className="h-5 w-5" />
              <span>Create Event</span>
            </Link>
          </Button>
          <Button variant="soft" className="h-auto py-4 flex-col gap-2" asChild>
            <Link to="/organizer/team">
              <Users className="h-5 w-5" />
              <span>Invite Team</span>
            </Link>
          </Button>
          <Button variant="soft" className="h-auto py-4 flex-col gap-2" asChild>
            <Link to="/organizer/subscription">
              <FileText className="h-5 w-5" />
              <span>Manage Plan</span>
            </Link>
          </Button>
          <Button variant="soft" className="h-auto py-4 flex-col gap-2" asChild>
            <Link to="/organizer/settings">
              <Calendar className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>

  );
}
