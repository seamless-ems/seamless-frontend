import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
  },
  {
    id: "4",
    title: "Developer Day 2025",
    dates: "May 10, 2025",
    location: "Austin, TX",
    status: "draft",
    speakerCount: 12,
    attendeeCount: 0,
    modules: [
      { id: "1", name: "speaker", enabled: true },
      { id: "2", name: "schedule", enabled: true },
      { id: "3", name: "content", enabled: false },
    ],
    googleDriveLinked: false,
  },
];

export default function Events() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredEvents = mockEvents.filter((event) => {
    const matchesSearch = event.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
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
            <Link to="/events/new">
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
        {filteredEvents.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
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
              <Link to="/events/new">
                <Plus className="h-4 w-4" />
                Create Your First Event
              </Link>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
