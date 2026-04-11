import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { updateSpeaker, deleteSpeaker } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Download, ExternalLink, Copy, Check, ChevronRight, Trash } from "lucide-react";
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
};

// Download a remote image by fetching it as a blob (handles CORS-proxied URLs).
// Falls back to opening in a new tab if fetch fails.
async function downloadAsset(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    // No fallback — surface the error to the caller for handling/logging
    console.error("Failed to download asset for url:", url);
    throw new Error("Failed to download asset");
  }
}

function AssetButton({
  label,
  url,
  filename,
  disabled,
  disabledReason,
  external,
}: {
  label: string;
  url: string | null | undefined;
  filename?: string;
  disabled?: boolean;
  disabledReason?: string;
  external?: boolean; // open in new tab instead of download
}) {
  const isDisabled = disabled || !url;
  const title = isDisabled ? (disabledReason ?? "Not available") : `Download ${label}`;

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      {label && <span className="text-[10px] text-muted-foreground leading-none">{label}</span>}
      <div title={title} className="mt-0.5">
        <button
          onClick={() => {
            if (!url) return;
            if (external) {
              window.open(url, "_blank", "noopener");
            } else {
              downloadAsset(url, filename ?? label.toLowerCase().replace(/\s+/g, "-"));
            }
          }}
          className={`rounded p-1.5 transition-colors ${
            isDisabled
              ? "text-muted-foreground/30 cursor-not-allowed pointer-events-none"
              : "text-muted-foreground hover:text-primary hover:bg-primary/8 cursor-pointer"
          }`}
        >
          {external ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

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

function resolveStatus(speaker: any, selectedTab?: string) {
  const infoStatus =
    speaker.speakerInformationStatus ??
    speaker.speaker_information_status ??
    speaker.intakeFormStatus ??
    speaker.intake_form_status ??
    "pending";

  const websiteApproved =
    speaker.websiteCardApproved ?? speaker.website_card_approved ?? false;

  const promoApproved =
    speaker.promoCardApproved ?? speaker.promo_card_approved ?? false;

  if (selectedTab === "applications") {
    const appStatus =
      speaker.callForSpeakersStatus ??
      speaker.call_for_speakers_status ??
      "pending";
    if (appStatus === "approved" || appStatus === "cards_approved")
      return { label: "Approved", cls: "bg-success/10 text-success border-success/30", tooltip: "Application approved" };
    if (appStatus === "submitted")
      return { label: "Submitted", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", tooltip: "Review this application and approve or decline" };
    return { label: "Pending Review", cls: "bg-warning/10 text-warning border-warning/30", tooltip: "Awaiting application submission" };
  }

  const headshotUrl = speaker.headshot || speaker.headshotUrl || speaker.headshot_url || null;
  const embedEnabled = speaker.embedEnabled ?? speaker.embed_enabled ?? false;

  if (infoStatus === "pending" || !headshotUrl)
    return { label: "Info Pending", cls: "bg-warning/10 text-warning border-warning/30", tooltip: "Waiting for the speaker to submit their information" };

  if (!websiteApproved || !promoApproved)
    return { label: "Card Approval Pending", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30", tooltip: "Review and approve this speaker's cards" };

  if (!embedEnabled)
    return { label: "Cards Approved", cls: "bg-success/10 text-success border-success/30", tooltip: "Cards approved — add to your embed to publish" };

  return { label: "Published", cls: "bg-success/10 text-success border-success/30", tooltip: "Live on your website embed" };
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

export default function SpeakersTable({ speakers, isLoading, eventId, selectedTab, formConfig, websiteCardConfigured = false, promoCardConfigured = false, searchQuery, setSearchQuery, statusFilter, setStatusFilter, sortBy, setSortBy, totalCount, pendingCount }: Props) {
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
  const showLogo = fieldEnabled("company_logo");

  const showControls = !!setSearchQuery;

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
        <div className="bg-secondary/30 border-b border-border px-5 py-2.5 flex items-center gap-2">
          <Input
            placeholder="Search speakers…"
            value={searchQuery ?? ""}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            className="w-[180px] h-8 text-sm"
          />
          <Select value={statusFilter ?? "all"} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Info Pending</SelectItem>
              <SelectItem value="submitted">Card Approval Pending</SelectItem>
              <SelectItem value="cards_approved">Cards Approved</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy ?? "newest"} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="py-12 text-center text-sm text-muted-foreground">No speakers yet — add your first one above.</div>
      </div>
    );
  }

  return (
    <>
      <table className="w-full">
      <thead className="bg-secondary/30 border-b border-border">
        <tr>
          {/* Avatar + name columns merged — controls sit flush with the table left edge */}
          <th colSpan={2} className="px-5 py-2.5">
            {showControls ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search speakers…"
                  value={searchQuery ?? ""}
                  onChange={(e) => setSearchQuery?.(e.target.value)}
                  className="w-[180px] h-8 text-sm"
                />
                <Select value={statusFilter ?? "all"} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] h-8 text-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Info Pending</SelectItem>
                    <SelectItem value="submitted">Card Approval Pending</SelectItem>
                    <SelectItem value="cards_approved">Cards Approved</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy ?? "newest"} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px] h-8 text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                  </SelectContent>
                </Select>
                {(pendingCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning rounded text-xs font-medium whitespace-nowrap">
                    ⚠ {pendingCount} pending
                  </span>
                )}
              </div>
            ) : null}
          </th>
          <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground w-[140px]">
            <div className="flex items-center gap-1.5">
              Status
              <HelpTip title="Status" side="bottom" align="start" compact>
                <p><span className="font-medium text-foreground">Info Pending</span> — awaiting intake form.</p>
                <p><span className="font-medium text-foreground">Approval Pending</span> — approve their cards.</p>
                <p><span className="font-medium text-foreground">Cards Approved</span> — toggle live in Embed.</p>
                <p><span className="font-medium text-foreground">Published</span> — live on your site.</p>
              </HelpTip>
            </div>
          </th>
          {showBio && <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground w-[52px]">Bio</th>}
          <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground w-[80px]">Speaker Card</th>
          <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground w-[80px]">Social Card</th>
          <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground w-[72px]">Headshot</th>
          {showLogo && <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground w-[72px]">Logo</th>}
          <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground w-[130px]">Updated</th>
          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-[56px]"> </th>
        </tr>
      </thead>
      <tbody>
        {speakers.map((speaker) => {
          const headshotUrl = speaker.headshot || speaker.headshotUrl || speaker.headshot_url || null;
          const headshotDownloadUrl = speaker.headshotDownloadUrl || headshotUrl;
          const logoUrl = speaker.companyLogo || speaker.company_logo || null;
          const logoDownloadUrl = speaker.logoDownloadUrl || logoUrl;
          const speakerName = speaker.name || `${speaker.firstName ?? ""} ${speaker.lastName ?? ""}`.trim() || speaker.email || "Speaker";
          const initials = speakerName.split(" ").map((p: string) => p?.[0]).filter(Boolean).slice(0, 2).join("");

          // Card embed URLs — backend renders these as HTML embeds.
          // TODO: replace with direct PNG download URLs once backend exposes them (see API_GAPS.md)
          const websiteCardUrl = `${API_BASE}/embed/${eventUuid}/speaker/${speaker.id}`;
          const promoCardUrl = `${API_BASE}/promo-cards/${eventUuid}/speaker/${speaker.id}`;

          const websiteApproved = speaker.websiteCardApproved ?? speaker.website_card_approved ?? false;
          const promoApproved = speaker.promoCardApproved ?? speaker.promo_card_approved ?? false;

          const status = resolveStatus(speaker, selectedTab);
          const updatedDate = formatDate(speaker.updatedAt ?? speaker.updated_at ?? speaker.createdAt);

          return (
            <tr
              key={speaker.id}
              className="border-b border-border hover:bg-muted/40 transition-colors group"
            >
              {/* Headshot — click to download */}
              <td className="pl-5 pr-2 py-4 w-14">
                <button
                  title={headshotUrl ? "Download headshot" : "No headshot uploaded"}
                  disabled={!headshotUrl}
                  onClick={() => headshotUrl && downloadAsset(headshotUrl, `${speakerName.replace(/\s+/g, "-").toLowerCase()}-headshot.jpg`)}
                  className={`relative rounded-full block group/avatar ${headshotUrl ? "cursor-pointer" : "cursor-default"}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={headshotUrl ?? undefined} alt={speakerName} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  {headshotUrl && (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-background border border-border rounded-full p-0.5 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                      <Download className="h-2.5 w-2.5 text-muted-foreground" />
                    </span>
                  )}
                </button>
              </td>

              {/* Speaker info — selectable text for copy-paste */}
              <td className="pr-5 pl-2 py-4">
                <div className="flex items-center">
                  <div
                    className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors leading-tight"
                    onClick={() => navigate(`/organizer/event/${eventId}/speakers/${speaker.id}`)}
                  >
                    {speakerName}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/70 transition-colors ml-1 flex-shrink-0" />
                  <CopyButton text={[speakerName, speaker.companyRole, speaker.company].filter(Boolean).join("\n")} />
                </div>
                {speaker.companyRole && (
                  <div className="text-xs text-muted-foreground mt-1 leading-tight select-all cursor-text">
                    {speaker.companyRole}
                  </div>
                )}
                {speaker.company && (
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight select-all cursor-text">
                    {speaker.company}
                  </div>
                )}
              </td>

              {/* Status */}
              <td className="px-5 py-4">
                <div title={status.tooltip}>
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium cursor-pointer whitespace-nowrap ${status.cls}`}
                    onClick={() => navigate(`/organizer/event/${eventId}/speakers/${speaker.id}`)}
                  >
                    {status.label}
                  </Badge>
                </div>
              </td>

              {/* Bio */}
              {showBio && (
                <td className="px-3 py-4">
                  <div className="flex justify-center">
                    <BioCopyButton bio={speaker.bio} />
                  </div>
                </td>
              )}

              {/* Website Card */}
              <td className="px-3 py-4">
                <div className="flex justify-center">
                  <AssetButton
                    label=""
                    url={websiteCardConfigured && websiteApproved ? websiteCardUrl : null}
                    filename={`${speakerName.replace(/\s+/g, "-").toLowerCase()}-website-card.html`}
                    disabledReason={
                      !websiteCardConfigured
                        ? "Configure your website card first"
                        : !websiteApproved
                        ? "Website card not yet approved"
                        : undefined
                    }
                  />
                </div>
              </td>

              {/* Promo Card */}
              <td className="px-3 py-4">
                <div className="flex justify-center">
                  <AssetButton
                    label=""
                    url={promoCardConfigured && promoApproved ? promoCardUrl : null}
                    filename={`${speakerName.replace(/\s+/g, "-").toLowerCase()}-promo-card.html`}
                    disabledReason={
                      !promoCardConfigured
                        ? "Configure your promo card first"
                        : !promoApproved
                        ? "Promo card not yet approved"
                        : undefined
                    }
                  />
                </div>
              </td>

              {/* Headshot download button */}
              <td className="px-3 py-4">
                <div className="flex justify-center">
                  <AssetButton
                    label=""
                    url={headshotDownloadUrl}
                    filename={`${speakerName.replace(/\s+/g, "-").toLowerCase()}-headshot.jpg`}
                    disabledReason="No headshot uploaded"
                  />
                </div>
              </td>

              {/* Company Logo */}
              {showLogo && (
                <td className="px-3 py-4">
                  <div className="flex justify-center">
                    <AssetButton
                      label=""
                      url={logoDownloadUrl}
                      filename={`${(speaker.company ?? speakerName).replace(/\s+/g, "-").toLowerCase()}-logo.png`}
                      disabledReason="No company logo uploaded"
                    />
                  </div>
                </td>
              )}

              {/* Last updated — shown as plain text */}
              <td className="px-5 py-4">
                <span className="text-xs text-muted-foreground">
                  {updatedDate ?? <span className="text-muted-foreground/30">—</span>}
                </span>
              </td>

              {/* Actions: delete speaker */}
              <td className="px-3 py-4">
                <div className="flex items-center">
                  <button
                    title="Delete speaker"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!eventId) {
                        toast({ title: "Missing event id" });
                        return;
                      }
                      setConfirmTarget({ id: speaker.id, name: speakerName });
                      setConfirmOpen(true);
                    }}
                    className={`rounded p-1.5 transition-colors text-muted-foreground hover:text-red-600 hover:bg-red-50 ${deletingId === speaker.id ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
        {speakers.length === 0 && (
          <tr>
            <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
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
