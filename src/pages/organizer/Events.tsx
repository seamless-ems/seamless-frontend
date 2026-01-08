import { useState } from "react";
import { EventCard } from "@/components/dashboard/EventCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { Event } from "@/types/event";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, deleteEvent } from "@/lib/api";

// Fetch events from API

export default function Events() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: rawEvents, isLoading, error } = useQuery<any, Error>({
    queryKey: ["events"],
    queryFn: () => getJson<any>("/events"),
  });

  const qc = useQueryClient();

  // Normalize a variety of possible API shapes into an Event[]
  const events: Event[] = (() => {
    if (!rawEvents) return [];
    // Common paginated shapes: { items: [...]} or { results: [...] } or { events: [...] }
    let arr: any[] = [];
  // rawEvents might be directly an array
  console.debug("rawEvents:", rawEvents);
  if (Array.isArray(rawEvents)) arr = rawEvents;
    else if (Array.isArray(rawEvents.items)) arr = rawEvents.items;
    else {
      const firstArray = Object.values(rawEvents).find((v) => Array.isArray(v));
      if (Array.isArray(firstArray)) arr = firstArray;
    }
    // Recursively map all snake_case keys to camelCase
    function toCamel(str: string) {
      return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    }
    function deepCamel(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(deepCamel);
      } else if (obj && typeof obj === 'object' && obj.constructor === Object) {
        const mapped: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = toCamel(key);
            mapped[camelKey] = deepCamel(obj[key]);
          }
        }
        return mapped;
      }
      return obj;
    }
    const mapped = arr.map(deepCamel) as Event[];
    return mapped;
  })();

  const filteredEvents = (events ?? []).filter((event) => {
    const matchesSearch = event.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Events
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage all your events in one place
            </p>
          </div>
          <Button variant="teal" size="lg" asChild>
            <Link to="/organizer/events/new">
              <Plus className="h-5 w-5" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="py-16 text-center">Loading events…</div>
        ) : error ? (
          <div className="py-16 text-center text-destructive">Error loading events: {String(error.message)}</div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onDelete={async (id: string) => {
                  if (!confirm("Delete this event? This cannot be undone.")) return;
                  try {
                    await deleteEvent(id);
                    // refetch events
                    qc.invalidateQueries({ queryKey: ["events"] });
                  } catch (err: any) {
                    console.error("Failed to delete event", err);
                    alert("Failed to delete event: " + String(err?.message || err));
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              No events found
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button variant="teal" asChild>
              <Link to="/organizer/events/new">
                <Plus className="h-4 w-4" />
                Create Your First Event
              </Link>
            </Button>
          </div>
        )}
      </div>
  );
}

