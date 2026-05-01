import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, getJson, updateSpeaker, createPromoConfig } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { HelpTip } from "@/components/ui/HelpTip";
import { CircleLoader } from "react-spinners";

function ColPicker({
  options,
  value,
  onChange,
  size = "sm",
}: {
  options: number[];
  value: number;
  onChange: (n: number) => void;
  size?: "sm" | "md";
}) {
  const btnCls = size === "md" ? "h-8 w-10 text-sm" : "h-7 w-8 text-xs";
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`${btnCls} font-medium transition-colors border-r border-border last:border-r-0 ${value === n ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "A-Z", label: "A–Z" },
  { value: "Z-A", label: "Z–A" },
  { value: "newest", label: "Newest" },
];

function SortPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`h-8 px-3 text-sm font-medium transition-colors border-r border-border last:border-r-0 ${value === opt.value ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ZoomPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-7 px-2.5 text-xs font-medium transition-colors border-r border-border last:border-r-0 ${value === n ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
        >
          {n}%
        </button>
      ))}
    </div>
  );
}

export default function EmbedBuilder({
  eventId,
  promoCardConfig,
  onAddSpeaker,
}: {
  eventId: string | undefined;
  promoCardConfig?: any;
  onAddSpeaker?: () => void;
}) {
  const queryClient = useQueryClient();
  const [copiedEmbed, setCopiedEmbed] = useState<"iframe" | "url" | "autoresize" | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [postSetupOpen, setPostSetupOpen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);

  const colsKey = eventId ? `seamless-embed-cols-${eventId}` : null;
  const setupKey = eventId ? `seamless-embed-setup-done-${eventId}` : null;

  const readCols = (key: string | null) => {
    if (!key) return { desktop: 2, zoom: 60, platformWidth: 1200, sortOrder: "A-Z" };
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          desktop:       parsed.desktop       ?? 2,
          zoom:          parsed.zoom          ?? 60,
          platformWidth: parsed.platformWidth ?? 1200,
          sortOrder:     parsed.sortOrder     ?? "A-Z",
        };
      }
    } catch {}
    return { desktop: 2, zoom: 60, platformWidth: 1200, sortOrder: "A-Z" };
  };

  const [desktopCols, setDesktopCols] = useState(() => readCols(colsKey).desktop);
  const [embedZoom, setEmbedZoom] = useState(() => {
    const saved = readCols(colsKey).zoom;
    return [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].includes(saved) ? saved : 60;
  });
  const [platformWidth, setPlatformWidth] = useState<number>(() => readCols(colsKey).platformWidth as number);
  const [sortOrder, setSortOrder] = useState<string>(() => readCols(colsKey).sortOrder);
  const [bgColor, setBgColor] = useState<string>("");
  const [previewOpened, setPreviewOpened] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const bcRef = useRef<BroadcastChannel | null>(null);
  const broadcastTimerRef = useRef<number | null>(null);
  const previewWindowRef = useRef<Window | null>(null);
  const savedTimerRef = useRef<number | null>(null);
  const settingsMountedRef = useRef(false);

  useEffect(() => {
    bcRef.current = new BroadcastChannel("seamless-preview");
    return () => { bcRef.current?.close(); };
  }, []);

  useEffect(() => {
    if (!colsKey) return;
    try {
      localStorage.setItem(colsKey, JSON.stringify({ desktop: desktopCols, zoom: embedZoom, platformWidth, sortOrder }));
    } catch {}
  }, [colsKey, desktopCols, embedZoom, platformWidth, sortOrder]);

  // Broadcast live updates to any open preview tab
  // Deps use upstream values (desktopCols/embedZoom/bgColor) — autoResizeSnippet is derived from them
  // and is safe to reference inside the callback (closure captures it from the completed render)
  useEffect(() => {
    if (!previewOpened) return;
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    broadcastTimerRef.current = window.setTimeout(() => {
      bcRef.current?.postMessage({ type: "seamless:preview-update", snippet: previewSnippet, bg: bgColor, contentWidth: platformWidth });
    }, 250);
    return () => { if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktopCols, embedZoom, bgColor, platformWidth, sortOrder, previewOpened]);

  useEffect(() => {
    if (!settingsMountedRef.current) { settingsMountedRef.current = true; return; }
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setShowSaved(true);
    savedTimerRef.current = window.setTimeout(() => setShowSaved(false), 2000);
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, [desktopCols, embedZoom, bgColor, platformWidth, sortOrder]);

  // First visit — open the embed modal directly
  useEffect(() => {
    if (!setupKey) return;
    try {
      if (!localStorage.getItem(setupKey)) {
        setFirstVisit(true);
        setEmbedModalOpen(true);
        localStorage.setItem(setupKey, "true");
      }
    } catch {}
  }, [setupKey]);

  const handleModalOpenChange = (open: boolean) => {
    setEmbedModalOpen(open);
    if (!open) setCopiedEmbed(null);
    if (!open && firstVisit) {
      setFirstVisit(false);
      setPostSetupOpen(true);
    }
  };

  const { data: speakersData, isLoading } = useQuery<any>({
    queryKey: ["event", eventId, "speakers", "embed"],
    queryFn: () => getJson<any>(`/events/${eventId}/speakers?form_type=speaker-info`),
    enabled: Boolean(eventId),
  });

  const allSpeakers: any[] = (() => {
    if (!speakersData) return [];
    let arr: any[] = [];
    if (Array.isArray(speakersData)) arr = speakersData;
    else if (Array.isArray(speakersData.items)) arr = speakersData.items;
    else if (Array.isArray(speakersData.results)) arr = speakersData.results;
    else if (Array.isArray(speakersData.speakers)) arr = speakersData.speakers;
    else if (Array.isArray(speakersData.data)) arr = speakersData.data;
    return arr.map((s: any) => ({
      ...s,
      name:
        [s.first_name ?? s.firstName, s.last_name ?? s.lastName].filter(Boolean).join(" ") ||
        s.name || s.email || "Speaker",
      companyRole: s.company_role ?? s.companyRole ?? "",
      company: s.company_name ?? s.company ?? s.companyName ?? "",
      avatarUrl: s.headshot ?? s.headshot_url ?? s.avatar_url ?? null,
      websiteCardApproved: s.website_card_approved ?? s.websiteCardApproved ?? false,
      embedEnabled: s.embed_enabled ?? s.embedEnabled ?? false,
    }));
  })();

  const eligibleSpeakers = (() => {
    const arr = allSpeakers.filter((s) => s.websiteCardApproved);
    if (sortOrder === "name_desc") return [...arr].sort((a, b) => b.name.localeCompare(a.name));
    if (sortOrder === "newest") {
      return [...arr].sort((a, b) => {
        const aDate = a.created_at ?? a.createdAt ?? "";
        const bDate = b.created_at ?? b.createdAt ?? "";
        return bDate.localeCompare(aDate);
      });
    }
    return [...arr].sort((a, b) => a.name.localeCompare(b.name));
  })();
  const liveSpeakers = eligibleSpeakers.filter((s) => s.embedEnabled);

  let embedUrl = `${API_BASE}/embed/${eventId}?column_amount=${desktopCols}&column_amount_mobile=1&sort=${sortOrder}`;
  if (bgColor) {
    try { embedUrl += `&bg_color=${encodeURIComponent(bgColor)}`; } catch {}
  }

  const iframeId = `seamless-wall-${eventId}`;
  const containerId = `seamless-container-${eventId}`;
  const zoom = embedZoom / 100;
  const scaleInv = 1 / zoom;
  const widthPct = `${parseFloat((scaleInv * 100).toFixed(2))}%`;
  const scaleInvStr = parseFloat(scaleInv.toFixed(4)).toString();
  const containerH = Math.round(800 * zoom);

  const previewH = 5000;
  const previewContainerH = Math.round(previewH * zoom);
  const previewSnippet = `<div id="${containerId}" style="width:100%;height:${previewContainerH}px;overflow:hidden;">
  <iframe id="${iframeId}" src="${embedUrl}" loading="lazy" style="width:${widthPct};height:${previewH}px;transform:scale(${zoom});transform-origin:0 0;border:none;display:block;"></iframe>
</div>
<script>
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'seamless:resize') {
    var f = document.getElementById('${iframeId}');
    var c = document.getElementById('${containerId}');
    if (f) f.style.height = Math.ceil(e.data.height * ${scaleInvStr}) + 'px';
    if (c) c.style.height = e.data.height + 'px';
  }
});
</script>`;

  const iframeSnippet = `<div style="width:100%;height:${containerH}px;overflow:hidden;border-radius:8px;"><iframe id="${iframeId}" src="${embedUrl}" loading="lazy" style="width:${widthPct};height:800px;transform:scale(${zoom});transform-origin:0 0;border:none;display:block;"></iframe></div>`;

  const autoResizeSnippet = `<div id="${containerId}" style="width:100%;height:${containerH}px;overflow:hidden;border-radius:8px;">
  <iframe id="${iframeId}" src="${embedUrl}" loading="lazy" style="width:${widthPct};height:800px;transform:scale(${zoom});transform-origin:0 0;border:none;display:block;"></iframe>
</div>
<script>
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'seamless:resize') {
    var f = document.getElementById('${iframeId}');
    var c = document.getElementById('${containerId}');
    if (f) f.style.height = Math.ceil(e.data.height * ${scaleInvStr}) + 'px';
    if (c) c.style.height = e.data.height + 'px';
  }
});
</script>`;

  const SNIPPETS: { key: "autoresize" | "iframe" | "url"; label: string; note: string; text: string }[] = [
    { key: "autoresize", label: "Auto-resize snippet", note: "recommended", text: autoResizeSnippet },
    { key: "iframe", label: "Basic iFrame", note: "fixed height", text: iframeSnippet },
    { key: "url", label: "Direct URL", note: "white bg", text: embedUrl },
  ];

  const copyText = (text: string, key: "iframe" | "url" | "autoresize") => {
    // Persist the current embed settings to the backend (fire-and-forget)
    if (eventId) {
      const cfg = promoCardConfig?.config ?? promoCardConfig ?? {};
      createPromoConfig({
        eventId: eventId,
        promoType: "website",
        config: cfg,
        embedWidth: platformWidth,
        embedColumns: desktopCols,
        embedZoomPercentage: embedZoom,
        embedBackgroundColor: bgColor || null,
        embedSpeakerOrder: sortOrder,
        embedIncludeBioModal: true,
      }).catch(() => {
        toast({ title: "Failed to save embed settings", variant: "destructive" });
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedEmbed(key);
    setTimeout(() => setCopiedEmbed(null), 2000);
  };

  const handleToggle = async (speaker: any, value: boolean) => {
    setToggling(speaker.id);
    try {
      await updateSpeaker(eventId!, speaker.id, {
        id: speaker.id,
        firstName: speaker.first_name ?? speaker.firstName ?? "",
        lastName: speaker.last_name ?? speaker.lastName ?? "",
        email: speaker.email ?? speaker.email_address ?? "",
        formType: speaker.formType ?? speaker.form_type ?? "speaker-info",
        embedEnabled: value,
      });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
    } catch {
      toast({ title: "Failed to update embed status", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  const openPreview = () => {
    // Persist the current embed settings to the backend (fire-and-forget)
    if (eventId) {
      const cfg = promoCardConfig?.config ?? promoCardConfig ?? {};
      createPromoConfig({
        eventId: eventId,
        promoType: "website",
        config: cfg,
        embedWidth: platformWidth,
        embedColumns: desktopCols,
        embedZoomPercentage: embedZoom,
        embedBackgroundColor: bgColor || null,
        embedSpeakerOrder: sortOrder,
        embedIncludeBioModal: true,
      }).catch(() => {
        toast({ title: "Failed to save embed settings", variant: "destructive" });
      });
    }

    const id = `seamless-preview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try { localStorage.setItem(id, previewSnippet); } catch {}
    const bgParam = bgColor ? `&bg=${encodeURIComponent(bgColor)}` : "";
    const url = `/fake-landing?snippetId=${encodeURIComponent(id)}${bgParam}&contentWidth=${platformWidth}`;
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.location.href = url;
      previewWindowRef.current.focus();
    } else {
      previewWindowRef.current = window.open(url) ?? null;
    }
    setPreviewOpened(true);
  };

  return (
    <div className="space-y-4 pt-6">

      {/* Post-setup next-step dialog */}
      <Dialog open={postSetupOpen} onOpenChange={setPostSetupOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Speaker Wall ready</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your column layout is saved. Ready to add your first speaker?
          </p>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => { setPostSetupOpen(false); onAddSpeaker?.(); }}>
              Add Speaker
            </Button>
            <Button variant="outline" onClick={() => setPostSetupOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Get Embed Code modal */}
      <Dialog open={embedModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Speaker Wall Embed</DialogTitle>
            <div className="flex items-center gap-3">
              <DialogDescription>Preview updates live</DialogDescription>
              <span
                className="flex items-center gap-1 text-xs text-muted-foreground transition-opacity duration-500"
                style={{ opacity: showSaved ? 1 : 0 }}
              >
                <Check className="h-3 w-3 text-green-500" />
                Saved
              </span>
            </div>
          </DialogHeader>

          {/* Controls */}
          <div className="space-y-5">

            {/* Embed width */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Embed width</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={platformWidth}
                  min={200}
                  max={2400}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 200) setPlatformWidth(v);
                  }}
                  className="h-7 w-20 px-2 border border-border rounded bg-background text-sm text-right"
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            </div>

            {/* Columns */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Desktop columns</span>
                <p className="text-xs text-muted-foreground mt-0.5">Mobile always displays 1 column.</p>
              </div>
              <ColPicker options={[1, 2, 3, 4]} value={desktopCols} onChange={setDesktopCols} size="md" />
            </div>

            {/* Card scale */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Card scale</span>
              <ZoomPicker value={embedZoom} onChange={setEmbedZoom} />
            </div>

            {/* Background */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Background</span>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Background color"
                  type="color"
                  value={bgColor || "#ffffff"}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 w-10 p-0 border border-border rounded cursor-pointer"
                />
                <input
                  aria-label="Background hex"
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder="#RRGGBB"
                  className="h-8 px-2 border border-border rounded w-28 bg-background text-sm"
                />
              </div>
            </div>

            {/* Speaker order */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Speaker order</span>
              <SortPicker value={sortOrder} onChange={setSortOrder} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Snippets */}
          <div className="rounded-lg border border-border overflow-hidden">
            {SNIPPETS.map(({ key, label, note, text }) => (
              <div
                key={key}
                className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">{note}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs px-2.5 shrink-0"
                    onClick={() => copyText(text, key)}
                  >
                    {copiedEmbed === key ? (
                      <><Check className="h-3.5 w-3.5" />Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" />Copy</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 text-xs px-2.5"
                    onClick={openPreview}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                </div>
              </div>
            ))}
          </div>

        </DialogContent>
      </Dialog>

      {/* Speaker Wall table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr className="h-11 bg-muted/20">
              <th className="px-4 py-2" colSpan={3}>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs px-2.5"
                    onClick={openPreview}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 text-xs px-2.5"
                    onClick={() => setEmbedModalOpen(true)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Speaker Wall Embed
                  </Button>
                  {eligibleSpeakers.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{liveSpeakers.length}</span>
                      {" "}/ {eligibleSpeakers.length} live
                    </span>
                  )}
                  <div className="ml-auto">
                    <HelpTip title="How Speaker Wall works" side="bottom" align="end" compact>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Toggle speakers on or off — your wall updates instantly</li>
                        <li>Only speakers with an approved <span className="font-medium text-foreground">Speaker Card</span> appear here</li>
                        <li>Paste the embed code into your website once — no changes needed after that</li>
                      </ul>
                      <p className="mt-2 text-muted-foreground">Need help setting up your embed? <a href="mailto:contact@seamlessevents.io" className="text-foreground underline underline-offset-2">contact@seamlessevents.io</a></p>
                    </HelpTip>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3}>
                  <div className="flex justify-center py-8">
                    <CircleLoader size={40} color="#4e5ca6" />
                  </div>
                </td>
              </tr>
            ) : eligibleSpeakers.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center">
                  <p className="text-sm font-medium text-foreground">No speakers ready yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Approve a speaker's cards in the{" "}
                    <Link
                      to={`/organizer/event/${eventId}/speakers`}
                      className="text-foreground underline underline-offset-2 hover:text-accent transition-colors"
                    >
                      Speakers
                    </Link>{" "}
                    tab to make them available here.
                  </p>
                </td>
              </tr>
            ) : (
              eligibleSpeakers.map((speaker) => {
                const isLive = speaker.embedEnabled;
                return (
                  <tr
                    key={speaker.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 w-14">
                      <Switch
                        checked={isLive}
                        disabled={toggling === speaker.id}
                        onCheckedChange={(val) => handleToggle(speaker, val)}
                      />
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-sm font-medium text-foreground leading-tight">{speaker.name}</p>
                      {(speaker.companyRole || speaker.company) && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                          {[speaker.companyRole, speaker.company].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right w-24">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-transparent text-foreground border border-success/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Live
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">Off</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
