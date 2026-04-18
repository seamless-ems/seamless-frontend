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
          className={`${btnCls} font-medium transition-colors border-r border-border last:border-r-0 ${value === n ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

export default function EmbedBuilder({ eventId, onAddSpeaker }: { eventId: string | undefined; onAddSpeaker?: () => void }) {
  const queryClient = useQueryClient();
  const [copiedEmbed, setCopiedEmbed] = useState<"iframe" | "url" | null>(null);
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
      promoCardApproved: s.promo_card_approved ?? s.promoCardApproved ?? false,
      embedEnabled: s.embed_enabled ?? s.embedEnabled ?? false,
    }));
  })();

  // Only speakers whose Speaker Card is approved are eligible for the embed
  const eligibleSpeakers = allSpeakers.filter(s => s.websiteCardApproved);
  const liveSpeakers = eligibleSpeakers.filter(s => s.embedEnabled);

  const embedUrl = `${API_BASE}/embed/${eventId}?column_amount=${desktopCols}&column_amount_mobile=${mobileCols}`;
  const iframeSnippet = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" allowtransparency="true" style="border:none;border-radius:8px;background:transparent;"></iframe>`;

  const copyText = (text: string, key: "iframe" | "url") => {
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
          <p className="text-sm text-muted-foreground">Choose how many speaker cards to show per row. You can adjust this any time from the toolbar above.</p>
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

      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Desktop</span>
          <ColPicker options={[2, 3, 4]} value={desktopCols} onChange={setDesktopCols} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Mobile</span>
          <ColPicker options={[1, 2]} value={mobileCols} onChange={setMobileCols} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => window.open(embedUrl, "_blank", "noopener")}>
            <ExternalLink className="h-3.5 w-3.5" />Preview
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8">
                {copiedEmbed ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy Embed Code</>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => copyText(iframeSnippet, "iframe")}>
                {copiedEmbed === "iframe" ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                iFrame snippet <span className="text-muted-foreground ml-1.5 text-xs">transparent bg</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyText(embedUrl, "url")}>
                {copiedEmbed === "url" ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                Direct URL <span className="text-muted-foreground ml-1.5 text-xs">white bg</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <HelpTip title="How Speaker Wall works" side="bottom" align="end">
            <ul className="space-y-1 list-disc list-inside">
              <li>Toggle speakers on or off — your wall updates instantly</li>
              <li>Only speakers with an approved <span className="font-medium text-foreground">Speaker Card</span> appear here</li>
              <li>Paste the embed code into your website once — no changes needed after that</li>
            </ul>
          </HelpTip>
        </div>
      </div>

      {/* Speaker list */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-secondary/30 border-b border-border px-5 py-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Speakers</span>
          {eligibleSpeakers.length > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{liveSpeakers.length}</span> of {eligibleSpeakers.length} live
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading speakers…</div>
        ) : eligibleSpeakers.length === 0 ? (
          <div className="py-12 text-center space-y-1">
            <p className="text-sm font-medium text-foreground">No speakers ready yet</p>
            <p className="text-sm text-muted-foreground">
              Approve a speaker's cards in the{" "}
              <Link to={`/organizer/event/${eventId}/speakers`} className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">Speakers</Link>
              {" "}tab to make them available here.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {eligibleSpeakers.map((speaker) => {
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
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Live
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">Off</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
