import { EventCard } from "@/components/dashboard/EventCard";
import { Event } from "@/types/event";
import { useQuery } from "@tanstack/react-query";
import { getJson, getMe } from "@/lib/api";
import { useState } from "react";

async function fetchEvents(): Promise<Event[]> {
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
  return arr as Event[];
}

export default function Index() {
  const { data, isLoading } = useQuery<Event[]>({ queryKey: ["events"], queryFn: fetchEvents });
  const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });
  const [activeTab, setActiveTab] = useState<"current" | "past">("current");

  const events: Event[] = Array.isArray(data) ? data : (data ? (data as any).items ?? (data as any).results ?? (data as any).data ?? [] : []);

  const now = new Date();
  const currentEvents = events.filter(e => {
    const endDate = e.endDate ? new Date(e.endDate) : (e.startDate ? new Date(e.startDate) : null);
    return endDate ? endDate >= now : true;
  });
  const pastEvents = events.filter(e => {
    const endDate = e.endDate ? new Date(e.endDate) : (e.startDate ? new Date(e.startDate) : null);
    return endDate ? endDate < now : false;
  });

  const displayEvents = activeTab === "current" ? currentEvents : pastEvents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 'var(--font-h1)', fontWeight: 600 }}>
          Welcome back{(me?.firstName ?? me?.first_name) ? `, ${me?.firstName ?? me?.first_name}` : ""}
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("current")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "current"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 'var(--font-body)' }}
          >
            Current
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "past"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 'var(--font-body)' }}
          >
            Past
          </button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div>Loading...</div>
        ) : displayEvents.length > 0 ? (
          displayEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} />)
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No {activeTab} events
          </div>
        )}
      </div>
    </div>
  );
}
