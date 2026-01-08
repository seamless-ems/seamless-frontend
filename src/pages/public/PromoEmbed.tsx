import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { Speaker } from "@/types/event";

// Minimal embed page that shows promo card previews for all speakers in an event, using the PromoEmbedSingle style.
export default function PromoEmbed() {
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
        return Boolean(s?.promo_card_template || s?.promoCardTemplate || s?.headshot || s?.first_name || s?.name);
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
                    <div className="flex flex-wrap gap-6 justify-center">
                        {visibleSpeakers.map((speaker: any) => {
                            const headshot = speaker.headshot ?? speaker.headshot_url ?? (speaker as any).headshotUrl ?? null;
                            const name = speaker.first_name ? `${speaker.first_name} ${speaker.last_name ?? ""}`.trim() : speaker.name ?? "";
                            const companyRole = speaker.company_role ?? speaker.title ?? "";
                            const companyName = speaker.company_name ?? speaker.company ?? "";
                            // Prefer the event's promo_card_template when speaker.events contains multiple events
                            let promoTemplate = speaker.promo_card_template ?? speaker.promoCardTemplate ?? null;
                            if (!promoTemplate && Array.isArray(speaker.events) && id) {
                                const ev = speaker.events.find((e: any) => String(e.id) === String(id));
                                if (ev) promoTemplate = ev.promo_card_template ?? ev.promoCardTemplate ?? null;
                            }
                            const companyLogo = speaker.company_logo ?? speaker.companyLogo ?? null;
                            const containerStyle: React.CSSProperties = promoTemplate
                                ? { backgroundImage: `url(${promoTemplate})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
                                : { background: "linear-gradient(180deg,#fff,#f7f7f9)" };
                            return (
                                <div key={speaker.id} className="rounded-xl overflow-hidden flex flex-col" style={{ ...containerStyle, width: 400, minWidth: 400, height: 490 }}>
                                    <div className="relative w-full h-full flex items-end justify-center text-center p-6 overflow-hidden">
                                        {headshot && (
                                            <img src={headshot} alt={`${name} headshot`} style={{ height: 150, width: 150, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} className="absolute rounded-lg object-cover border-4 border-white z-10" />
                                        )}
                                        <div className="z-20 flex flex-col items-center w-full" style={{ minHeight: 110, maxHeight: 110, justifyContent: 'flex-start', gap: 2, paddingBottom: 8, marginTop: -60 }}>
                                            <h3 className="text-xl font-bold text-black" style={{ lineHeight: '2rem', height: 28, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 220, marginTop: '-18px', position: 'relative', zIndex: 20 }}>{name}</h3>
                                            <p className="text-sm text-black" style={{ lineHeight: '1.5rem', height: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 220, marginTop: 0 }}>{companyRole}{companyName ? ` • ${companyName}` : ""}</p>
                                            {companyLogo && (
                                                <img src={companyLogo} alt="company logo" style={{ marginTop: 4, height: 32, width: 100, objectFit: 'contain', background: 'rgba(255,255,255,0.85)', borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 0, display: 'block' }} />
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
