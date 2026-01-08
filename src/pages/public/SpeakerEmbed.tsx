import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { Speaker } from "@/types/event";

// Minimal embed page that shows promo card previews for all speakers in an event.
export default function SpeakerEmbed() {
  const { id } = useParams();

  const location = useLocation();
  const search = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const intakeStatus = search.get("intake_status") ?? undefined;

  const { data: rawSpeakers, isLoading, error } = useQuery<any, Error>({
    queryKey: ["event", id, "speakers", intakeStatus],
    queryFn: () => {
      const qs = intakeStatus ? `?intake_status=${encodeURIComponent(intakeStatus)}` : "";
      return getJson<any>(`/events/${id}/speakers${qs}`);
    },
    enabled: Boolean(id),
  });

  const speakerList: Speaker[] = React.useMemo(() => {
    if (!rawSpeakers) return [];
    if (Array.isArray(rawSpeakers)) return rawSpeakers as Speaker[];
    if (Array.isArray((rawSpeakers as any).items)) return (rawSpeakers as any).items as Speaker[];
    if (Array.isArray((rawSpeakers as any).results)) return (rawSpeakers as any).results as Speaker[];
    if (Array.isArray((rawSpeakers as any).speakers)) return (rawSpeakers as any).speakers as Speaker[];
    if (Array.isArray((rawSpeakers as any).data)) return (rawSpeakers as any).data as Speaker[];
    const firstArray = Object.values(rawSpeakers).find((v: any) => Array.isArray(v));
    if (Array.isArray(firstArray)) return firstArray as Speaker[];
    return [];
  }, [rawSpeakers]);

  const visibleSpeakers = speakerList.filter((s: any) => {
    return Boolean(s?.promoCardTemplate || s?.promo_card_template || s?.headshot || s?.firstName || s?.name);
  });

  const [dims, setDims] = React.useState<Record<string, { w: number; h: number }>>({});

  React.useEffect(() => {
    visibleSpeakers.forEach((speaker: any) => {
      const promoTemplate = speaker.promo_card_template ?? (speaker as any).promoCardTemplate ?? (speaker.event && (speaker.event as any).promo_card_template) ?? null;
      if (!promoTemplate) return;
      if (dims[speaker.id]) return;

      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width || 1;
        const h = img.naturalHeight || img.height || 1;
        setDims((prev) => ({ ...prev, [speaker.id]: { w, h } }));
      };
      img.onerror = () => {
        setDims((prev) => ({ ...prev, [speaker.id]: { w: 6, h: 7 } }));
      };
      img.src = promoTemplate;
    });
  }, [visibleSpeakers, dims]);

  return (
    <div className="min-h-screen bg-white text-black p-4">
      <div className="mx-auto max-w-6xl">
        {isLoading ? (
          <p>Loading…</p>
        ) : error ? (
          <p className="text-red-600">Failed to load speakers: {String(error.message)}</p>
        ) : visibleSpeakers.length === 0 ? (
          <p className="text-muted-foreground">No promo cards available.</p>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visibleSpeakers.map((speaker: any) => {
              const headshot = speaker.headshot ?? speaker.headshotUrl ?? speaker.headshot_url ?? null;
              const firstName = speaker.firstName ?? (speaker as any).first_name ?? null;
              const lastName = speaker.lastName ?? (speaker as any).last_name ?? null;
              const promoTemplate = speaker.promoCardTemplate ?? speaker.promo_card_template ?? (speaker.event && (speaker.event as any).promoCardTemplate) ?? null;

              const d = dims[speaker.id];
              const aspectStyle: React.CSSProperties = d
                ? { aspectRatio: `${d.w}/${d.h}` }
                : { aspectRatio: `6/7` };

              const bgStyle: React.CSSProperties = promoTemplate
                ? { backgroundImage: `url(${promoTemplate})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
                : {};

              return (
                <div key={speaker.id} className="rounded-xl overflow-hidden border border-border bg-card">
                  <div
                    className="relative w-full bg-center bg-no-repeat flex items-end justify-center text-center p-6"
                    style={{ ...aspectStyle, ...bgStyle }}
                  >
                    {headshot && (
                      <img
                        src={headshot}
                        alt={`${firstName ?? speaker.name ?? ""} headshot`}
                        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-36 w-36 rounded-full object-cover border-4 border-white z-10"
                      />
                    )}

                    <div className="z-20 pb-4">
                      <h3 className="text-lg font-bold text-black">
                        {firstName ? `${firstName} ${lastName ?? ""}` : speaker.name}
                      </h3>
                      {speaker.title && <p className="text-sm text-black">{speaker.title}{speaker.company ? ` • ${speaker.company}` : ""}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
// Implementation lives in this file under src/pages/public
