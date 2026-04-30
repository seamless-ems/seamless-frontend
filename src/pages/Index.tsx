import { EventCard } from "@/components/dashboard/EventCard";
import { Event } from "@/types/event";
import { useQuery } from "@tanstack/react-query";
import { getJson, getMe } from "@/lib/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CircleLoader } from 'react-spinners';
import { Link } from "react-router-dom";

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseEventDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const currentEvents = events.filter(e => {
    const dateStr = e.endDate || e.startDate;
    if (!dateStr) return true;
    return parseEventDate(dateStr) >= today;
  });
  const pastEvents = events.filter(e => {
    const dateStr = e.endDate || e.startDate;
    if (!dateStr) return false;
    return parseEventDate(dateStr) < today;
  });

  const displayEvents = activeTab === "current" ? currentEvents : pastEvents;

  return (
    <div className="space-y-6">
      {/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 style={{ fontSize: 'var(--font-h1)', fontWeight: 600 }}>
						Welcome back{(me?.firstName ?? me?.first_name) ? `, ${me?.firstName ?? me?.first_name}` : ""}
					</h1>
				</div>
				<Button variant="default" size="lg" asChild>
					<Link to="/organizer/events/new">Create Event</Link>
				</Button>
			</div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("current")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "current"
                ? "border-accent text-accent font-medium"
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
                ? "border-accent text-accent font-medium"
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
          <div className="col-span-full flex justify-center py-8">
            <CircleLoader size={40} color="#4e5ca6" />
          </div>
        ) : displayEvents.length > 0 ? (
          displayEvents.map((event, index) => {
            // Resolve speakerId from `me` for this event, if present
            const speakerId = (() => {
              if (!me) return undefined;
              const top = me.speakerId ?? me.speaker_id ?? null;
              const topEvent = me.eventId ?? me.event_id ?? null;
              if (top && (!topEvent || String(topEvent) === String(event.id))) return top;
              if (Array.isArray(me.speakers)) {
                for (const s of me.speakers) {
                  const sid = s.id ?? s.speakerId ?? s.speaker_id ?? null;
                  const eid = s.eventId ?? s.event_id ?? s.event ?? null;
                  if (sid && (!eid || String(eid) === String(event.id))) return sid;
                }
              }
              return undefined;
            })();
            return <EventCard key={event.id} event={event} index={index} me={me} speakerId={speakerId} />
          })
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No {activeTab} events
          </div>
        )}
      </div>
    </div>
  );
}
