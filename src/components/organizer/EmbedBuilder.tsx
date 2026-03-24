import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, getJson, updateSpeaker } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export default function EmbedBuilder({ eventId }: { eventId: string | undefined }) {
  const queryClient = useQueryClient();
  const [copiedEmbed, setCopiedEmbed] = useState<"iframe" | "url" | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

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

  // Only speakers with cards approved are eligible for the embed
  const eligibleSpeakers = allSpeakers.filter(s => s.websiteCardApproved && s.promoCardApproved);
  const liveSpeakers = eligibleSpeakers.filter(s => s.embedEnabled);

  const embedUrl = `${API_BASE}/embed/${eventId}`;
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

  return (
    <div className="space-y-0 pt-6">
      {/* Persistent info banner */}
      <div className="rounded-lg border border-border bg-muted/30 px-5 py-3.5 mb-4 text-sm text-muted-foreground leading-relaxed">
        A live speaker wall for your website. Paste the embed code into your site once — it updates automatically as you toggle speakers live.{" "}
        Speakers become available here once their card is approved in the{" "}
        <Link to={`/organizer/event/${eventId}/speakers`} className="text-foreground underline hover:text-primary transition-colors">Speakers</Link> tab.
      </div>

      {/* Single header row */}
      <div className="rounded-t-lg border border-border bg-muted/30 px-5 py-3.5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">Speaker Card Embed</p>
            {eligibleSpeakers.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {liveSpeakers.length} of {eligibleSpeakers.length} live
              </span>
            )}
          </div>
          {liveSpeakers.length === 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {eligibleSpeakers.length === 0 ? (
                <>Go to{" "}
                  <Link to={`/organizer/event/${eventId}/speakers`} className="underline hover:text-foreground transition-colors">Speakers</Link>
                  {" "}and approve a speaker's cards to make them available here
                </>
              ) : (
                "Toggle speakers on below to add them to your website embed"
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                {copiedEmbed
                  ? <><Check className="h-3.5 w-3.5" />Copied</>
                  : <><Copy className="h-3.5 w-3.5" />Copy embed code</>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => copyText(iframeSnippet, "iframe")}>
                {copiedEmbed === "iframe" ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                iFrame <span className="text-muted-foreground ml-1">(transparent)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyText(embedUrl, "url")}>
                {copiedEmbed === "url" ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                URL <span className="text-muted-foreground ml-1">(white)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => window.open(embedUrl, "_blank", "noopener")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>
      </div>

      {/* Speaker list — no separate header */}
      <div className="rounded-b-lg border-x border-b border-border overflow-hidden">

        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading speakers…</div>
        ) : eligibleSpeakers.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No speakers with approved cards yet.{" "}
            <span className="text-muted-foreground/60">Approve cards on a speaker's page to make them available here.</span>
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
                    <td className="px-5 py-3.5 text-right w-16">
                      {isLive && (
                        <span className="text-xs text-success font-medium">Live</span>
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
