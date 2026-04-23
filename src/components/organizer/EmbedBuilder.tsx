import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, getJson, updateSpeaker } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

export default function EmbedBuilder({ eventId, onAddSpeaker }: { eventId: string | undefined; onAddSpeaker?: () => void }) {
  const queryClient = useQueryClient();
  const [copiedEmbed, setCopiedEmbed] = useState<"iframe" | "url" | "autoresize" | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const colsKey = eventId ? `seamless-embed-cols-${eventId}` : null;
  const setupKey = eventId ? `seamless-embed-setup-done-${eventId}` : null;

  const readCols = (key: string | null) => {
    if (!key) return { desktop: 2, mobile: 1 };
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as { desktop: number; mobile: number };
    } catch {}
    return { desktop: 2, mobile: 1 };
  };

  const [desktopCols, setDesktopCols] = useState(() => readCols(colsKey).desktop);
  const [mobileCols, setMobileCols] = useState(() => readCols(colsKey).mobile);

  useEffect(() => {
    if (!colsKey) return;
    try { localStorage.setItem(colsKey, JSON.stringify({ desktop: desktopCols, mobile: mobileCols })); } catch {}
  }, [colsKey, desktopCols, mobileCols]);

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

  // Only speakers whose Speaker Card is approved are eligible for the embed
  const eligibleSpeakers = allSpeakers.filter(s => s.websiteCardApproved);
  const liveSpeakers = eligibleSpeakers.filter(s => s.embedEnabled);

  const embedUrl = `${API_BASE}/embed/${eventId}?column_amount=${desktopCols}&column_amount_mobile=${mobileCols}`;
  const iframeId = `seamless-wall-${eventId}`;

  // Basic iframe — fixed fallback height. Works everywhere, no JS required.
  const iframeSnippet = `<iframe id="${iframeId}" src="${embedUrl}" loading="lazy" style="width:100%;height:800px;border:none;border-radius:8px;display:block;"></iframe>`;

  // Auto-resize iframe — adjusts height to content via postMessage.
  // TODO (backend): the embed page must broadcast its height on load + resize:
  //   window.addEventListener('load', send); window.addEventListener('resize', send);
  //   function send() { window.parent.postMessage({ type: 'seamless:resize', height: document.body.scrollHeight }, '*'); }
  // TODO (backend): add responsive CSS so speaker cards scale to container width instead of rendering at native resolution (600×600 / 900×600).
  const autoResizeSnippet = `<iframe id="${iframeId}" src="${embedUrl}" loading="lazy" style="width:100%;border:none;border-radius:8px;display:block;"></iframe>
<script>
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'seamless:resize') {
    var f = document.getElementById('${iframeId}');
    if (f) f.style.height = e.data.height + 'px';
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
            <Button onClick={() => { setPostSetupOpen(false); onAddSpeaker?.(); }}>
              Add Speaker
            </Button>
            <Button variant="outline" onClick={() => setPostSetupOpen(false)}>
              Done
            </Button>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="h-7 gap-1.5 text-xs px-2.5">
                        {copiedEmbed ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy Embed Code</>}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => copyText(autoResizeSnippet, "autoresize")}>
                        {copiedEmbed === "autoresize" ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                        Auto-resize snippet <span className="text-muted-foreground ml-1.5 text-xs">recommended</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyText(iframeSnippet, "iframe")}>
                        {copiedEmbed === "iframe" ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                        Basic iFrame <span className="text-muted-foreground ml-1.5 text-xs">fixed 800px height</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyText(embedUrl, "url")}>
                        {copiedEmbed === "url" ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                        Direct URL <span className="text-muted-foreground ml-1.5 text-xs">white bg</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
