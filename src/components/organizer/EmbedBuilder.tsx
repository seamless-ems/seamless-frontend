import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, getJson, updateSpeaker } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { HelpTip } from "@/components/ui/HelpTip";

function ColPicker({ options, value, onChange, size = "sm" }: {
  options: number[];
  value: number;
  onChange: (n: number) => void;
  size?: "sm" | "md";
}) {
  const btnCls = size === "md" ? "h-8 w-10 text-sm" : "h-7 w-8 text-xs";
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {options.map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`${btnCls} font-medium transition-colors border-r border-border last:border-r-0 ${value === n ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function ZoomPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {[30, 40, 50, 60, 70, 80].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`h-8 px-3 text-sm font-medium transition-colors border-r border-border last:border-r-0 ${value === n ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
          {n}%
        </button>
      ))}
    </div>
  );
}

export default function EmbedBuilder({ eventId, onAddSpeaker }: { eventId: string | undefined; onAddSpeaker?: () => void }) {
  const queryClient = useQueryClient();
  const [copiedEmbed, setCopiedEmbed] = useState<"iframe" | "url" | "autoresize" | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);

  const colsKey = eventId ? `seamless-embed-cols-${eventId}` : null;
  const setupKey = eventId ? `seamless-embed-setup-done-${eventId}` : null;

  const readCols = (key: string | null) => {
    if (!key) return { desktop: 2, mobile: 1, zoom: 60 };
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as { desktop: number; mobile: number; zoom: number };
    } catch {}
    return { desktop: 2, mobile: 1, zoom: 60 };
  };

  const [desktopCols, setDesktopCols] = useState(() => readCols(colsKey).desktop);
  const [mobileCols, setMobileCols] = useState(() => readCols(colsKey).mobile);
  const [embedZoom, setEmbedZoom] = useState(() => {
    const saved = readCols(colsKey).zoom;
    return [30, 40, 50, 60, 70, 80].includes(saved) ? saved : 60;
  });

  useEffect(() => {
    if (!colsKey) return;
    try { localStorage.setItem(colsKey, JSON.stringify({ desktop: desktopCols, mobile: mobileCols, zoom: embedZoom })); } catch {}
  }, [colsKey, desktopCols, mobileCols, embedZoom]);

  const [setupOpen, setSetupOpen] = useState(false);
  const [postSetupOpen, setPostSetupOpen] = useState(false);
  const [setupDesktop, setSetupDesktop] = useState(() => readCols(colsKey).desktop);
  const [setupMobile, setSetupMobile] = useState(() => readCols(colsKey).mobile);

  useEffect(() => {
    if (!setupKey) return;
    try {
      if (!localStorage.getItem(setupKey)) setSetupOpen(true);
    } catch {}
  }, [setupKey]);

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
      name: [s.first_name ?? s.firstName, s.last_name ?? s.lastName].filter(Boolean).join(" ") || s.name || s.email || "Speaker",
      companyRole: s.company_role ?? s.companyRole ?? "",
      company: s.company_name ?? s.company ?? s.companyName ?? "",
      avatarUrl: s.headshot ?? s.headshot_url ?? s.avatar_url ?? null,
      websiteCardApproved: s.website_card_approved ?? s.websiteCardApproved ?? false,
      embedEnabled: s.embed_enabled ?? s.embedEnabled ?? false,
    }));
  })();

  const eligibleSpeakers = allSpeakers.filter(s => s.websiteCardApproved);
  const liveSpeakers = eligibleSpeakers.filter(s => s.embedEnabled);

  const embedUrl = `${API_BASE}/embed/${eventId}?column_amount=${desktopCols}&column_amount_mobile=${mobileCols}`;
  const iframeId = `seamless-wall-${eventId}`;
  const containerId = `seamless-container-${eventId}`;

  const zoom = embedZoom / 100;
  const scaleInv = 1 / zoom;
  const widthPct = `${parseFloat((scaleInv * 100).toFixed(2))}%`;
  const scaleInvStr = parseFloat(scaleInv.toFixed(4)).toString();
  const containerH = Math.round(800 * zoom);

  // ─── Backend TODO (embed page) ───────────────────────────────────────────
  // 1. ZOOM — accept ?zoom=0.x and apply `body { zoom: X }` so content scales
  //    properly inside the iframe. Replaces the current CSS transform approach,
  //    which clips content due to overflow clipping on layout (not visual) coords.
  // 2. RESPONSIVE LAYOUT — remove any max-width / margin:auto centering so the
  //    card grid fills whatever width the iframe is given (fluid columns).
  // 3. AUTO-RESIZE HEIGHT — broadcast scrollHeight via postMessage on load + resize:
  //    function send() { window.parent.postMessage({ type:'seamless:resize', height:document.body.scrollHeight },'*'); }
  //    window.addEventListener('load', send); window.addEventListener('resize', send);
  // ─────────────────────────────────────────────────────────────────────────

  // Basic iframe — fixed 800px content height, zoom via CSS transform (see TODO 1).
  const iframeSnippet = `<div style="width:100%;height:${containerH}px;overflow:hidden;border-radius:8px;"><iframe id="${iframeId}" src="${embedUrl}" loading="lazy" style="width:${widthPct};height:800px;transform:scale(${zoom});transform-origin:0 0;border:none;display:block;"></iframe></div>`;

  // Auto-resize — falls back to 800px; height auto-adjusts once backend ships TODO 3.
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

  const copyText = (text: string, key: "iframe" | "url" | "autoresize") => {
    navigator.clipboard.writeText(text);
    setCopiedEmbed(key);
    setTimeout(() => setCopiedEmbed(null), 2000);
  };

  const handleToggle = async (speaker: any, value: boolean) => {
    setToggling(speaker.id);
    try {
      const payload: any = {
        id: speaker.id,
        firstName: speaker.first_name ?? speaker.firstName ?? '',
        lastName: speaker.last_name ?? speaker.lastName ?? '',
        email: speaker.email ?? speaker.email_address ?? '',
        formType: speaker.formType ?? speaker.form_type ?? 'speaker-info',
        embedEnabled: value,
      };
      await updateSpeaker(eventId!, speaker.id, payload);
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
    } catch {
      toast({ title: "Failed to update embed status", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  const handleSetupDone = () => {
    setDesktopCols(setupDesktop);
    setMobileCols(setupMobile);
    setSetupOpen(false);
    if (setupKey) { try { localStorage.setItem(setupKey, "true"); } catch {} }
    setPostSetupOpen(true);
  };

  const SNIPPETS: { key: "autoresize" | "iframe" | "url"; label: string; note: string; text: string }[] = [
    { key: "autoresize", label: "Auto-resize snippet", note: "recommended", text: autoResizeSnippet },
    { key: "iframe",     label: "Basic iFrame",        note: "fixed height",  text: iframeSnippet },
    { key: "url",        label: "Direct URL",           note: "white bg",      text: embedUrl },
  ];

  // Preview iframe dimensions — fills the modal preview area at the chosen zoom
  const previewH = 400;
  const previewIframeH = Math.round(previewH / zoom);

  return (
    <div className="space-y-4 pt-6">
      {/* First-visit setup modal */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set up your Speaker Wall</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Choose how many speaker cards to show per row. You can adjust this any time from the table header.</p>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Desktop columns</span>
              <ColPicker options={[2, 3, 4]} value={setupDesktop} onChange={setSetupDesktop} size="md" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Mobile columns</span>
              <ColPicker options={[1, 2]} value={setupMobile} onChange={setSetupMobile} size="md" />
            </div>
          </div>
          <Button className="w-full" onClick={handleSetupDone}>Save</Button>
        </DialogContent>
      </Dialog>

      {/* Post-setup next-step dialog */}
      <Dialog open={postSetupOpen} onOpenChange={setPostSetupOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Speaker Wall ready</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Your column layout is saved. Ready to add your first speaker?</p>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => { setPostSetupOpen(false); onAddSpeaker?.(); }}>Add Speaker</Button>
            <Button variant="outline" onClick={() => setPostSetupOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Get Embed Code modal */}
      <Dialog open={embedModalOpen} onOpenChange={(open) => { setEmbedModalOpen(open); if (!open) setCopiedEmbed(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Get Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Live preview */}
            <div
              className="w-full rounded-lg border border-border overflow-hidden bg-muted/20"
              style={{ height: previewH }}
            >
              <iframe
                key={embedUrl}
                src={embedUrl}
                style={{
                  width: widthPct,
                  height: previewIframeH,
                  transform: `scale(${zoom})`,
                  transformOrigin: '0 0',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>

            {/* Zoom picker */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Zoom</span>
              <ZoomPicker value={embedZoom} onChange={setEmbedZoom} />
            </div>

            {/* Copy options */}
            <div className="rounded-lg border border-border overflow-hidden">
              {SNIPPETS.map(({ key, label, note, text }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{note}</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs px-2.5 shrink-0" onClick={() => copyText(text, key)}>
                    {copiedEmbed === key ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">Paste once. If you change zoom later, return here and replace the snippet on your site.</p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr className="h-11 bg-muted/20">
              <th className="px-4 py-2" colSpan={3}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Desktop</span>
                    <ColPicker options={[2, 3, 4]} value={desktopCols} onChange={setDesktopCols} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Mobile</span>
                    <ColPicker options={[1, 2]} value={mobileCols} onChange={setMobileCols} />
                  </div>
                  <div className="h-3.5 w-px bg-border mx-1 shrink-0" />
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs px-2.5" onClick={() => window.open(embedUrl, "_blank", "noopener")}>
                    <ExternalLink className="h-3.5 w-3.5" />Preview
                  </Button>
                  <Button size="sm" className="h-7 gap-1.5 text-xs px-2.5" onClick={() => setEmbedModalOpen(true)}>
                    <Copy className="h-3.5 w-3.5" />Get Embed Code
                  </Button>
                  {eligibleSpeakers.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{liveSpeakers.length}</span> / {eligibleSpeakers.length} live
                    </span>
                  )}
                  <div className="ml-auto">
                    <HelpTip title="How Speaker Wall works" side="bottom" align="end" compact>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Toggle speakers on or off — your wall updates instantly</li>
                        <li>Only speakers with an approved <span className="font-medium text-foreground">Speaker Card</span> appear here</li>
                        <li>Paste the embed code into your website once — no changes needed after that</li>
                      </ul>
                    </HelpTip>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-sm text-muted-foreground">Loading speakers…</td>
              </tr>
            ) : eligibleSpeakers.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center">
                  <p className="text-sm font-medium text-foreground">No speakers ready yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Approve a speaker's cards in the{" "}
                    <Link to={`/organizer/event/${eventId}/speakers`} className="text-foreground underline underline-offset-2 hover:text-accent transition-colors">Speakers</Link>
                    {" "}tab to make them available here.
                  </p>
                </td>
              </tr>
            ) : (
              eligibleSpeakers.map((speaker) => {
                const isLive = speaker.embedEnabled;
                return (
                  <tr key={speaker.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
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
