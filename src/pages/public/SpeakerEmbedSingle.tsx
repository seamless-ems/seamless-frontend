import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { Speaker } from "@/types/event";

// Minimal website-card embed for a single speaker (for iframe).
export default function SpeakerEmbedSingle() {
  const { id, speakerId } = useParams();

  const { data: speaker, isLoading, error } = useQuery<Speaker | null, Error>({
    queryKey: ["event", id, "speaker", speakerId],
    queryFn: () => getJson<Speaker>(`/events/${id}/speakers/${speakerId}`),
    enabled: Boolean(id && speakerId),
  });

  const headshot = (speaker as any)?.headshot ?? (speaker as any)?.headshot_url ?? null;
  const name = (speaker as any)?.first_name ? `${(speaker as any).first_name} ${(speaker as any).last_name ?? ""}`.trim() : (speaker as any)?.name ?? "";
  const title = (speaker as any)?.title ?? "";
  const company = (speaker as any)?.company ?? "";

  return (
    <div className="min-h-screen bg-white text-black p-6">
      {isLoading ? (
        <p>Loading…</p>
      ) : error ? (
        <p className="text-red-600">Failed to load speaker: {String(error.message)}</p>
      ) : (
        <div className="max-w-[420px] mx-auto rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {headshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={headshot} alt={`${name} headshot`} className="h-full w-full object-cover" />
              ) : (
                <div className="text-xl font-semibold text-muted-foreground">{(name || "?")[0]}</div>
              )}
            </div>
            <div>
              <div className="font-semibold text-lg text-foreground">{name}</div>
              <div className="text-sm text-muted-foreground">{title}{company ? ` • ${company}` : ""}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
