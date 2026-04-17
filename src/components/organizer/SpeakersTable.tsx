import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { deleteSpeaker, updateSpeaker } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Download, Copy, Check, ChevronRight, Trash, MoreVertical, ArrowUpDown, X } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  page?: number;
  pageSize?: number;
  setPage?: (p: number) => void;
  setPageSize?: (s: number) => void;
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

export default function SpeakersTable({ speakers, isLoading, eventId, selectedTab, formConfig, websiteCardConfigured = false, promoCardConfigured = false, searchQuery, setSearchQuery, statusFilter, setStatusFilter, sortBy, setSortBy, totalCount, pendingCount, page, pageSize, setPage, setPageSize, onBadgeClick, selectedSpeakerId }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const eventUuid = eventId ?? "";
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [bulkPublishOpen, setBulkPublishOpen] = useState(false);
  const [bulkPublishIds, setBulkPublishIds] = useState<string[]>([]);
  const [bulkUnpublishOpen, setBulkUnpublishOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const isSelectionActive = selectedIds.size > 0;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < speakers.length;
    }
  }, [selectedIds.size, speakers.length]);

  const toggleSelect = (e: React.MouseEvent, speakerId: string) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(speakerId)) next.delete(speakerId);
      else next.add(speakerId);
      return next;
    });
  };

  const toggleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.size === speakers.length ? new Set() : new Set(speakers.map(s => s.id))
    );
  };

  const handleBulkApprove = async (cardType: 'website' | 'promo') => {
    const toApprove = speakers.filter(s => {
      if (!selectedIds.has(s.id)) return false;
      if (getInfoStatus(s)) return false;
      const alreadyApproved = cardType === 'website'
        ? (s.websiteCardApproved ?? s.website_card_approved ?? false)
        : (s.promoCardApproved ?? s.promo_card_approved ?? false);
      return !alreadyApproved;
    });
    if (toApprove.length === 0) {
      toast({ title: 'Nothing to approve', description: 'Selected speakers are already approved or have info pending.' });
      return;
    }
    setIsBulkApproving(true);
    try {
      await Promise.all(toApprove.map(s =>
        updateSpeaker(eventUuid, s.id, {
          id: s.id,
          firstName: s.firstName ?? '',
          lastName: s.lastName ?? '',
          email: s.email ?? '',
          formType: s.formType ?? s.form_type ?? 'speaker-info',
          ...(cardType === 'website' ? { websiteCardApproved: true } : { promoCardApproved: true }),
        })
      ));
      queryClient.invalidateQueries({ queryKey: ['event', eventUuid, 'speakers'] });
      const label = cardType === 'website' ? 'Speaker Card' : 'Social Card';
      toast({ title: `${toApprove.length} ${label}${toApprove.length !== 1 ? 's' : ''} approved` });
      setSelectedIds(new Set());
      if (cardType === 'website') {
        setBulkPublishIds(toApprove.map(s => s.id));
        setBulkPublishOpen(true);
      }
    } catch (err: any) {
      toast({ title: 'Bulk approval failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleBulkPublish = async () => {
    setBulkPublishOpen(false);
    try {
      await Promise.all(bulkPublishIds.map(speakerId => {
        const s = speakers.find(sp => sp.id === speakerId);
        if (!s) return Promise.resolve();
        return updateSpeaker(eventUuid, speakerId, {
          id: speakerId,
          firstName: s.firstName ?? '',
          lastName: s.lastName ?? '',
          email: s.email ?? '',
          formType: s.formType ?? s.form_type ?? 'speaker-info',
          embedEnabled: true,
        });
      }));
      queryClient.invalidateQueries({ queryKey: ['event', eventUuid, 'speakers'] });
      toast({ title: `${bulkPublishIds.length} speaker${bulkPublishIds.length !== 1 ? 's' : ''} published to Speaker Wall` });
    } catch (err: any) {
      toast({ title: 'Failed to publish speakers', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setBulkPublishIds([]);
    }
  };

  const handleBulkUnpublish = async (resetApproval: boolean) => {
    setBulkUnpublishOpen(false);
    const toUnpublish = speakers.filter(s => selectedIds.has(s.id) && (s.embedEnabled ?? s.embed_enabled ?? false));
    if (!toUnpublish.length) return;
    try {
      await Promise.all(toUnpublish.map(s => {
        const patch: any = {
          id: s.id,
          firstName: s.firstName ?? '',
          lastName: s.lastName ?? '',
          email: s.email ?? '',
          formType: s.formType ?? s.form_type ?? 'speaker-info',
          embedEnabled: false,
        };
        if (resetApproval) patch.websiteCardApproved = false;
        return updateSpeaker(eventUuid, s.id, patch);
      }));
      queryClient.invalidateQueries({ queryKey: ['event', eventUuid, 'speakers'] });
      toast({ title: resetApproval ? `${toUnpublish.length} speaker${toUnpublish.length !== 1 ? 's' : ''} unpublished and unapproved` : `${toUnpublish.length} speaker${toUnpublish.length !== 1 ? 's' : ''} removed from Speaker Wall` });
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({ title: 'Failed to unpublish speakers', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleBulkUnapprovePromo = async () => {
    const toUnapprove = speakers.filter(s => selectedIds.has(s.id) && (s.promoCardApproved ?? s.promo_card_approved ?? false));
    if (!toUnapprove.length) return;
    setIsBulkApproving(true);
    try {
      await Promise.all(toUnapprove.map(s => updateSpeaker(eventUuid, s.id, {
        id: s.id,
        firstName: s.firstName ?? '',
        lastName: s.lastName ?? '',
        email: s.email ?? '',
        formType: s.formType ?? s.form_type ?? 'speaker-info',
        promoCardApproved: false,
      })));
      queryClient.invalidateQueries({ queryKey: ['event', eventUuid, 'speakers'] });
      toast({ title: `${toUnapprove.length} social card${toUnapprove.length !== 1 ? 's' : ''} unapproved` });
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({ title: 'Failed to unapprove social cards', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Determine which optional columns to show based on form config.
  // If config not yet loaded, default to showing all.
  const fieldEnabled = (fieldId: string) =>
    !formConfig || formConfig.some((f) => f.id === fieldId && f.enabled);
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
      {showControls && !isSelectionActive && (
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-background">
          <Input
            placeholder="Search…"
            value={searchQuery ?? ""}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            className="w-[180px] h-8 text-sm"
          />
          <Select value={statusFilter ?? "all"} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm">
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
      )}
      <table className="w-full table-fixed">
      <colgroup>{[...(showControls ? [<col key="select" style={{ width: '36px' }} />] : []),
        <col key="name" />,
        <col key="website" style={{ width: '148px' }} />,
        <col key="promo" style={{ width: '148px' }} />,
        <col key="actions" style={{ width: '36px' }} />]}</colgroup>
      <thead className="bg-secondary/30 border-b border-border">
        <tr>
          {showControls && (
            <th className="pl-4 py-2.5 w-9" onClick={(e) => e.stopPropagation()}>
              {isSelectionActive && (
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={selectedIds.size === speakers.length}
                  onChange={() => {}}
                  onClick={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                />
              )}
            </th>
          )}
          <th className="px-5 py-2.5">
            {isSelectionActive ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-foreground whitespace-nowrap">
                  {selectedIds.size} selected
                </span>
                <div className="h-3.5 w-px bg-border mx-0.5 shrink-0" />
                <button
                  onClick={() => handleBulkApprove('website')}
                  disabled={isBulkApproving}
                  className="h-7 px-2.5 text-xs font-medium rounded-md border border-success/40 text-foreground bg-background hover:bg-success/5 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  Approve Speaker Cards
                </button>
                <button
                  onClick={() => handleBulkApprove('promo')}
                  disabled={isBulkApproving}
                  className="h-7 px-2.5 text-xs font-medium rounded-md border border-success/40 text-foreground bg-background hover:bg-success/5 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  Approve Social Cards
                </button>
                <button
                  onClick={() => setBulkUnpublishOpen(true)}
                  disabled={isBulkApproving}
                  className="h-7 px-2.5 text-xs font-medium rounded-md border border-destructive/30 text-foreground bg-background hover:bg-destructive/5 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  Unpublish Speaker Cards
                </button>
                <button
                  onClick={handleBulkUnapprovePromo}
                  disabled={isBulkApproving}
                  className="h-7 px-2.5 text-xs font-medium rounded-md border border-destructive/30 text-foreground bg-background hover:bg-destructive/5 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  Unapprove Social Cards
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto h-7 px-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <X className="h-3 w-3" />Clear
                </button>
              </div>
            ) : null}
          </th>
          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-[120px]">
            {!isSelectionActive && (
              <div className="flex items-center gap-1.5">
                Speaker Card
                <HelpTip title="Speaker Card status" side="bottom" align="start" compact>
                  <p><span className="font-medium text-foreground">Info Pending</span> — awaiting intake form.</p>
                  <p><span className="font-medium text-foreground">Pending Approval</span> — review and approve.</p>
                  <p><span className="font-medium text-foreground">Ready to Publish</span> — toggle live in Speaker Wall.</p>
                  <p><span className="font-medium text-foreground">Published</span> — live on your Speaker Wall.</p>
                </HelpTip>
              </div>
            )}
          </th>
          <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-[120px]">
            {!isSelectionActive && (
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
            )}
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
              {/* Checkbox */}
              {showControls && (
                <td className="pl-4 py-3 w-9" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(speaker.id)}
                    onChange={() => {}}
                    onClick={(e) => toggleSelect(e, speaker.id)}
                    className={`h-3.5 w-3.5 rounded accent-primary cursor-pointer transition-opacity ${isSelectionActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  />
                </td>
              )}
              {/* Speaker info */}
              <td className="pl-3 pr-2 py-3 overflow-hidden">
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
    {/* Bulk publish dialog — shown after bulk speaker card approval */}
    <AlertDialog open={bulkPublishOpen} onOpenChange={(open) => { if (!open) { setBulkPublishOpen(false); setBulkPublishIds([]); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publish {bulkPublishIds.length} speaker{bulkPublishIds.length !== 1 ? 's' : ''} to your Speaker Wall?</AlertDialogTitle>
          <AlertDialogDescription>
            Their Speaker Cards are approved and ready. Publishing makes them visible on your Speaker Wall embed immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setBulkPublishIds([])}>Not now</AlertDialogCancel>
          <AlertDialogAction onClick={handleBulkPublish}>Publish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Bulk unpublish dialog */}
    <Dialog open={bulkUnpublishOpen} onOpenChange={setBulkUnpublishOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from Speaker Wall?</DialogTitle>
          <DialogDescription>{selectedIds.size} speaker{selectedIds.size !== 1 ? 's' : ''} · Speaker Card</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-1">
          <Button className="w-full" onClick={() => handleBulkUnpublish(false)}>
            Unpublish
          </Button>
          <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive" onClick={() => handleBulkUnpublish(true)}>
            Unpublish &amp; Unapprove
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setBulkUnpublishOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Pagination footer */}
    {typeof totalCount === 'number' && typeof page === 'number' && typeof pageSize === 'number' && (setPage || setPageSize) && (
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50">
        <div className="text-sm text-muted-foreground">
          {(() => {
            const start = (page - 1) * pageSize + 1;
            const end = Math.min(start + speakers.length - 1, totalCount);
            return `Showing ${start}–${end} of ${totalCount}`;
          })()}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              className="h-8 px-3 rounded border border-input bg-background hover:bg-muted disabled:opacity-50"
              onClick={() => setPage && setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >Prev</button>
            <button
              className="h-8 px-3 rounded border border-input bg-background hover:bg-muted disabled:opacity-50"
              onClick={() => setPage && setPage(page + 1)}
              disabled={page * pageSize >= totalCount}
            >Next</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Per page</div>
            <Select value={String(pageSize)} onValueChange={(v) => { const n = Number(v); setPageSize && setPageSize(n); setPage && setPage(1); }}>
              <SelectTrigger className="w-[84px] h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )}
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
