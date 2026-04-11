import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { deleteSpeaker } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Download, ExternalLink, Copy, Check, ChevronRight, Trash, MoreVertical, ArrowUpDown } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { HelpTip } from "@/components/ui/HelpTip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  speakers: any[];
  isLoading: boolean;
  eventId?: string | undefined; // may be a slugId or bare UUID
  selectedTab?: string;
  formConfig?: any[] | null;
  websiteCardConfigured?: boolean;
  promoCardConfigured?: boolean;
  // Controls
  searchQuery?: string;
  setSearchQuery?: (s: string) => void;
  statusFilter?: string;
  setStatusFilter?: (s: string) => void;
  sortBy?: string;
  setSortBy?: (s: string) => void;
  totalCount?: number;
  pendingCount?: number;
  // Quick panel
  onBadgeClick?: (speaker: any, view: 'info' | 'speaker-card' | 'social-card' | 'speaker-wall') => void;
  selectedSpeakerId?: string;
};


function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      title="Copy name, title & company"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-muted-foreground/50 hover:text-primary hover:bg-primary/8 cursor-pointer"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function BioCopyButton({ bio }: { bio: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      title={bio ? "Copy bio" : "No bio submitted"}
      disabled={!bio}
      onClick={() => {
        if (!bio) return;
        navigator.clipboard.writeText(bio).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={`rounded p-1.5 transition-colors ${
        bio
          ? "text-muted-foreground hover:text-primary hover:bg-primary/8 cursor-pointer"
          : "text-muted-foreground/30 cursor-not-allowed"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function getInfoStatus(speaker: any) {
  const infoStatus = speaker.speakerInformationStatus ?? speaker.speaker_information_status ?? speaker.intakeFormStatus ?? speaker.intake_form_status ?? "pending";
  const headshotUrl = speaker.headshot || speaker.headshotUrl || speaker.headshot_url || null;
  return infoStatus === "pending" || !headshotUrl;
}

function resolveSpeakerCardStatus(speaker: any) {
  if (getInfoStatus(speaker))
    return { label: "Info Pending", cls: "bg-warning/10 text-warning border-warning/30", tooltip: "Waiting for the speaker to submit their information" };
  const websiteApproved = speaker.websiteCardApproved ?? speaker.website_card_approved ?? false;
  const embedEnabled = speaker.embedEnabled ?? speaker.embed_enabled ?? false;
  if (!websiteApproved)
    return { label: "Pending Approval", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", tooltip: "Review and approve this speaker's Speaker Card" };
  if (!embedEnabled)
    return { label: "Ready to Publish", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", tooltip: "Approved — toggle live in Speaker Wall to publish" };
  return { label: "Published", cls: "bg-success/10 text-success border-success/30", tooltip: "Live on your Speaker Wall" };
}

function resolveSocialCardStatus(speaker: any) {
  if (getInfoStatus(speaker))
    return { label: "Info Pending", cls: "bg-warning/10 text-warning border-warning/30", tooltip: "Waiting for the speaker to submit their information" };
  const promoApproved = speaker.promoCardApproved ?? speaker.promo_card_approved ?? false;
  if (!promoApproved)
    return { label: "Pending Approval", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", tooltip: "Review and approve this speaker's Social Card" };
  return { label: "Ready to Download", cls: "bg-success/10 text-success border-success/30", tooltip: "Approved — download available" };
}

function resolveApplicationStatus(speaker: any) {
  const appStatus = speaker.callForSpeakersStatus ?? speaker.call_for_speakers_status ?? "pending";
  if (appStatus === "approved" || appStatus === "cards_approved")
    return { label: "Approved", cls: "bg-success/10 text-success border-success/30", tooltip: "Application approved" };
  if (appStatus === "submitted")
    return { label: "Submitted", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", tooltip: "Review this application and approve or decline" };
  return { label: "Pending Review", cls: "bg-warning/10 text-warning border-warning/30", tooltip: "Awaiting application submission" };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function SpeakersTable({ speakers, isLoading, eventId, selectedTab, formConfig, websiteCardConfigured = false, promoCardConfigured = false, searchQuery, setSearchQuery, statusFilter, setStatusFilter, sortBy, setSortBy, totalCount, pendingCount, onBadgeClick, selectedSpeakerId }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const eventUuid = eventId ?? "";
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  // Determine which optional columns to show based on form config.
  // If config not yet loaded, default to showing all.
  const fieldEnabled = (fieldId: string) =>
    !formConfig || formConfig.some((f) => f.id === fieldId && f.enabled);
  const showBio = fieldEnabled("bio");

  const showControls = !!setSearchQuery;

  const approvedSocialSpeakers = speakers.filter(s => s.promoCardApproved ?? s.promo_card_approved ?? false);

  const downloadCard = async (url: string, filename: string) => {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadAllSocialCards = async () => {
    for (const s of approvedSocialSpeakers) {
      const url = `${API_BASE}/promo-cards/${eventUuid}/speaker/${s.id}`;
      const name = (s.name || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'speaker').replace(/\s+/g, '-').toLowerCase();
      await downloadCard(url, `${name}-social-card.html`);
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading speakers…</div>;
  }

  if (!showControls && (!speakers || speakers.length === 0)) {
    return <div className="py-12 text-center text-sm text-muted-foreground">No speakers found</div>;
  }

  // When controls are shown but there are no speakers, render controls + empty state (no column headers)
  if (showControls && speakers.length === 0) {
    return (
      <div>
        <div className="bg-secondary/30 border-b border-border px-5 py-2.5 flex items-center gap-1.5">
          <Input
            placeholder="Search…"
            value={searchQuery ?? ""}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            className="w-[130px] h-8 text-sm"
          />
          <Select value={statusFilter ?? "all"} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Info Pending</SelectItem>
              <SelectItem value="submitted">Pending Approval</SelectItem>
              <SelectItem value="cards_approved">Ready to Publish</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors shrink-0">
                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={() => setSortBy?.('newest')}>
                {(sortBy ?? 'newest') === 'newest' ? <Check className="h-3 w-3 mr-2 text-primary" /> : <span className="h-3 w-3 mr-2 inline-block" />}
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy?.('oldest')}>
                {sortBy === 'oldest' ? <Check className="h-3 w-3 mr-2 text-primary" /> : <span className="h-3 w-3 mr-2 inline-block" />}
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy?.('name')}>
                {sortBy === 'name' ? <Check className="h-3 w-3 mr-2 text-primary" /> : <span className="h-3 w-3 mr-2 inline-block" />}
                Name A–Z
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="py-12 text-center text-sm text-muted-foreground">No speakers yet — add your first one above.</div>
      </div>
    );
  }

  return (
    <>
      <table className="w-full table-fixed">
      <colgroup>
        <col />                               {/* name — absorbs remaining */}
        {showBio && <col style={{ width: '44px' }} />}
        <col style={{ width: '148px' }} />   {/* speaker card — fixed */}
        <col style={{ width: '148px' }} />   {/* social card — fixed */}
        <col style={{ width: '36px' }} />    {/* 3-dot */}
      </colgroup>
      <thead className="bg-secondary/30 border-b border-border">
        <tr>
          <th className="px-5 py-2.5">
            {showControls ? (
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Search…"
                  value={searchQuery ?? ""}
                  onChange={(e) => setSearchQuery?.(e.target.value)}
                  className="w-[120px] h-8 text-sm"
                />
                <Select value={statusFilter ?? "all"} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Info Pending</SelectItem>
                    <SelectItem value="submitted">Pending Approval</SelectItem>
                    <SelectItem value="cards_approved">Ready to Publish</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      title={`Sort: ${sortBy === 'name' ? 'Name A–Z' : sortBy === 'oldest' ? 'Oldest first' : 'Newest first'}`}
                      className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted transition-colors shrink-0"
                    >
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={() => setSortBy?.('newest')}>
                      {(sortBy ?? 'newest') === 'newest' ? <Check className="h-3 w-3 mr-2 text-primary" /> : <span className="h-3 w-3 mr-2 inline-block" />}
                      Newest first
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy?.('oldest')}>
                      {sortBy === 'oldest' ? <Check className="h-3 w-3 mr-2 text-primary" /> : <span className="h-3 w-3 mr-2 inline-block" />}
                      Oldest first
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy?.('name')}>
                      {sortBy === 'name' ? <Check className="h-3 w-3 mr-2 text-primary" /> : <span className="h-3 w-3 mr-2 inline-block" />}
                      Name A–Z
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {(pendingCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-warning/10 text-warning rounded text-xs font-medium whitespace-nowrap">
                    ⚠ {pendingCount}
                  </span>
                )}
              </div>
            ) : null}
          </th>
          {showBio && <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground w-[52px]">Bio</th>}
          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-[120px]">
            <div className="flex items-center gap-1.5">
              Speaker Card
              <HelpTip title="Speaker Card status" side="bottom" align="start" compact>
                <p><span className="font-medium text-foreground">Info Pending</span> — awaiting intake form.</p>
                <p><span className="font-medium text-foreground">Pending Approval</span> — review and approve.</p>
                <p><span className="font-medium text-foreground">Ready to Publish</span> — toggle live in Speaker Wall.</p>
                <p><span className="font-medium text-foreground">Published</span> — live on your Speaker Wall.</p>
              </HelpTip>
            </div>
          </th>
          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-[120px]">
            <div className="flex items-center gap-1.5">
              Social Card
              {approvedSocialSpeakers.length > 0 && (
                <button
                  onClick={handleDownloadAllSocialCards}
                  title={`Download all ${approvedSocialSpeakers.length} social cards`}
                  className="text-muted-foreground/40 hover:text-primary transition-colors"
                >
                  <Download className="h-3 w-3" />
                </button>
              )}
              <HelpTip title="Social Card status" side="bottom" align="start" compact>
                <p><span className="font-medium text-foreground">Info Pending</span> — awaiting intake form.</p>
                <p><span className="font-medium text-foreground">Pending Approval</span> — review and approve.</p>
                <p><span className="font-medium text-foreground">Ready to Download</span> — click the badge to download.</p>
              </HelpTip>
            </div>
          </th>
          <th className="px-3 py-2.5 w-10"> </th>
        </tr>
      </thead>
      <tbody>
        {speakers.map((speaker) => {
          const speakerName = speaker.name || `${speaker.firstName ?? ""} ${speaker.lastName ?? ""}`.trim() || speaker.email || "Speaker";

          // Card embed URLs — backend renders these as HTML embeds.
          // TODO: replace with direct PNG download URLs once backend exposes them (see API_GAPS.md)
          const websiteCardUrl = `${API_BASE}/embed/${eventUuid}/speaker/${speaker.id}`;
          const promoCardUrl = `${API_BASE}/promo-cards/${eventUuid}/speaker/${speaker.id}`;

          const websiteApproved = speaker.websiteCardApproved ?? speaker.website_card_approved ?? false;
          const promoApproved = speaker.promoCardApproved ?? speaker.promo_card_approved ?? false;

          const speakerCardStatus = selectedTab === "applications" ? resolveApplicationStatus(speaker) : resolveSpeakerCardStatus(speaker);
          const socialCardStatus = resolveSocialCardStatus(speaker);
          const updatedDate = formatDate(speaker.updatedAt ?? speaker.updated_at ?? speaker.createdAt);

          return (
            <tr
              key={speaker.id}
              className={`border-b border-border transition-colors group cursor-pointer ${
                selectedSpeakerId === speaker.id
                  ? 'bg-primary/5 hover:bg-primary/8'
                  : 'hover:bg-muted/40'
              }`}
              onClick={() => navigate(`/organizer/event/${eventId}/speakers/${speaker.id}`)}
            >
              {/* Speaker info */}
              <td className="pl-5 pr-2 py-3 overflow-hidden">
                <div className="flex items-center min-w-0">
                  <div className="text-sm font-semibold text-foreground leading-tight truncate">
                    {speakerName}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/70 transition-colors ml-0.5 flex-shrink-0" />
                  <CopyButton text={[speakerName, speaker.companyRole, speaker.company].filter(Boolean).join("\n")} />
                </div>
                {(speaker.companyRole || speaker.company) && (
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight truncate">
                    {[speaker.companyRole, speaker.company].filter(Boolean).join(' · ')}
                  </div>
                )}
              </td>

              {/* Bio */}
              {showBio && (
                <td className="px-3 py-3">
                  <div className="flex justify-center">
                    <BioCopyButton bio={speaker.bio} />
                  </div>
                </td>
              )}

              {/* Speaker Card */}
              <td className="px-3 py-3">
                <div className="flex items-center gap-1.5" title={speakerCardStatus.tooltip}>
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium cursor-pointer w-[132px] justify-center whitespace-nowrap ${speakerCardStatus.cls}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onBadgeClick) {
                        const view =
                          speakerCardStatus.label === 'Info Pending' ? 'info'
                          : speakerCardStatus.label === 'Ready to Publish' || speakerCardStatus.label === 'Published' ? 'speaker-wall'
                          : 'speaker-card';
                        onBadgeClick(speaker, view);
                      } else if (speakerCardStatus.label === 'Ready to Publish') {
                        navigate(`/organizer/event/${eventId}/speakers/embed`);
                      } else {
                        navigate(`/organizer/event/${eventId}/speakers/${speaker.id}/speaker-card`);
                      }
                    }}
                  >
                    {speakerCardStatus.label}
                  </Badge>
                  {websiteApproved && (
                    <a href={websiteCardUrl} target="_blank" rel="noreferrer" title="View Speaker Card" className="text-muted-foreground/30 hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </td>

              {/* Social Card */}
              <td className="px-3 py-3">
                <div className="flex items-center gap-1.5" title={socialCardStatus.tooltip}>
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium cursor-pointer w-[132px] justify-center whitespace-nowrap ${socialCardStatus.cls}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onBadgeClick) {
                        const view = socialCardStatus.label === 'Info Pending' ? 'info' : 'social-card';
                        onBadgeClick(speaker, view);
                      } else if (socialCardStatus.label === 'Ready to Download') {
                        downloadCard(promoCardUrl, `${speakerName.replace(/\s+/g, "-").toLowerCase()}-social-card.html`);
                      } else {
                        navigate(`/organizer/event/${eventId}/speakers/${speaker.id}/social-card`);
                      }
                    }}
                  >
                    {socialCardStatus.label}
                  </Badge>
                </div>
              </td>

              {/* 3-dot menu: updated date + delete */}
              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {updatedDate && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Updated {updatedDate}</div>
                    )}
                    {updatedDate && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!eventId) { toast({ title: "Missing event id" }); return; }
                        setConfirmTarget({ id: speaker.id, name: speakerName });
                        setConfirmOpen(true);
                      }}
                    >
                      <Trash className="h-3.5 w-3.5 mr-2" />Delete speaker
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          );
        })}
        {speakers.length === 0 && (
          <tr>
            <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
              No speakers found
            </td>
          </tr>
        )}
      </tbody>
    </table>
    {/* Danger confirmation modal for deletions */}
    <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!open) { setConfirmTarget(null); } setConfirmOpen(open); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete speaker?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the speaker{confirmTarget ? ` — ${confirmTarget.name}` : ""}. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={async () => {
              if (!eventId || !confirmTarget) return;
              const id = confirmTarget.id;
              try {
                setDeletingId(id);
                await deleteSpeaker(eventId, id);
                queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
                toast({ title: "Speaker deleted" });
              } catch (err: any) {
                toast({ title: "Failed to delete speaker", description: String(err?.message || err) });
              } finally {
                setDeletingId(null);
                setConfirmOpen(false);
                setConfirmTarget(null);
              }
            }}
          >
            Delete speaker
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
