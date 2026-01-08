import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { Speaker } from "@/types/event";

// Minimal promo-card embed for a single speaker (for iframe).
export default function PromoEmbedSingle() {
  const { id, speakerId } = useParams();

  const { data: speaker, isLoading, error } = useQuery<Speaker | null, Error>({
    queryKey: ["event", id, "speaker", speakerId],
    queryFn: () => getJson<Speaker>(`/events/${id}/speakers/${speakerId}`),
    enabled: Boolean(id && speakerId),
  });

  const headshot = (speaker as any)?.headshot ?? (speaker as any)?.headshotUrl ?? (speaker as any)?.headshot_url ?? null;
  const name = (speaker as any)?.firstName ? `${(speaker as any).firstName} ${(speaker as any).lastName ?? ""}`.trim() : (speaker as any)?.name ?? "";
  const companyRole = (speaker as any)?.companyRole ?? "";
  const companyName = (speaker as any)?.companyName ?? "";

  // Prefer the event's promo_card_template when speaker.events contains multiple events
  let promoTemplate = (speaker as any)?.promoCardTemplate ?? (speaker as any)?.promo_card_template ?? null;
  if (!promoTemplate && Array.isArray((speaker as any)?.events) && id) {
    const ev = (speaker as any).events.find((e: any) => String(e.id) === String(id));
    if (ev) promoTemplate = ev.promoCardTemplate ?? ev.promo_card_template ?? null;
  }

  const containerStyle: React.CSSProperties = promoTemplate
    ? { backgroundImage: `url(${promoTemplate})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
    : { background: "linear-gradient(180deg,#fff,#f7f7f9)" };

  return (
    <div className="min-h-screen bg-white text-black p-6">
      {isLoading ? (
        <p>Loading…</p>
      ) : error ? (
        <p className="text-red-600">Failed to load speaker: {String(error.message)}</p>
      ) : (
        <div className="mx-auto max-w-[420px] rounded-xl overflow-hidden" style={containerStyle}>
          <div className="relative aspect-[6/7] w-[360px] md:w-[420px] flex items-end justify-center text-center p-6">
            {headshot && (
              <img src={headshot} alt={`${name} headshot`} className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full object-cover border-4 border-white z-10" />
            )}

            <div className="z-20 pb-4">
              <h3 className="text-xl font-bold text-black">{name}</h3>
              <p className="text-sm text-black">{companyRole}{companyName ? ` • ${companyName}` : ""}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
