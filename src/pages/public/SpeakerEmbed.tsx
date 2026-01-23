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

  const { data: eventData } = useQuery<any>({
    queryKey: ["event", id],
    queryFn: () => getJson<any>(`/events/${id}`),
    enabled: Boolean(id),
  });

  const visibleSpeakers = speakerList.filter((s: any) => {
    // Only show approved speakers (both website and promo cards must be approved)
    const isApproved = (s?.website_card_approved || s?.websiteCardApproved) && (s?.promo_card_approved || s?.promoCardApproved);
    const hasRequiredData = Boolean(s?.headshot || s?.firstName || s?.name);
    return isApproved && hasRequiredData;
  });

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
              const companyRole = speaker.companyRole ?? speaker.company_role ?? speaker.title ?? "";
              const companyName = speaker.companyName ?? speaker.company_name ?? speaker.company ?? "";
              const companyLogo = speaker.companyLogo ?? speaker.company_logo ?? null;

              // Use event's promo_card_template as the background
              const promoTemplate = eventData?.promo_card_template ?? eventData?.promoCardTemplate ?? null;

              const bgStyle: React.CSSProperties = promoTemplate
                ? {
                    backgroundImage: `url('${promoTemplate}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat"
                  }
                : {
                    background: "linear-gradient(135deg, #4E5BA6 0%, #3D4A8F 100%)"
                  };

              return (
                <div key={speaker.id} className="rounded-xl overflow-hidden shadow-md">
                  <div
                    className="relative w-full aspect-square bg-center bg-no-repeat flex flex-col items-center justify-center text-center p-6"
                    style={bgStyle}
                  >
                    {/* Overlay for better text readability */}
                    <div className="absolute inset-0 bg-black/10"></div>

                    {headshot && (
                      <img
                        src={headshot}
                        alt={`${firstName ?? speaker.name ?? ""} headshot`}
                        className="relative z-10 h-32 w-32 rounded-lg object-cover border-4 border-white shadow-lg mb-4"
                      />
                    )}

                    <div className="relative z-20">
                      <h3 className="text-xl font-bold text-white drop-shadow-md mb-1">
                        {firstName ? `${firstName} ${lastName ?? ""}` : speaker.name}
                      </h3>
                      <p className="text-sm text-white drop-shadow-sm mb-1">{companyRole}</p>
                      <p className="text-sm font-semibold text-white drop-shadow-sm">{companyName}</p>
                      {companyLogo && (
                        <div className="mt-3">
                          <img
                            src={companyLogo}
                            alt="Company logo"
                            className="h-8 mx-auto opacity-90"
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                          />
                        </div>
                      )}
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
