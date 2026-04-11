import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getJson, getFormConfigForEvent, getPromoConfigForEvent } from "@/lib/api";
import { ArrowLeft, Check, Copy, FileEdit, Share2, Download } from "lucide-react";
import JSZip from "jszip";
import AddSpeakerDialog from "@/components/organizer/AddSpeakerDialog";
import ShareDialog from "@/components/organizer/ShareDialog";
import SpeakerQuickPanel, { type PanelView } from "@/components/organizer/SpeakerQuickPanel";
import SpeakersTable from "@/components/organizer/SpeakersTable";
import EmbedBuilder from "@/components/organizer/EmbedBuilder";
import ApplicationsTab from "@/components/organizer/ApplicationsTab";
import CardBuilder from "@/components/CardBuilder";
import SpeakerFormBuilder, { type SpeakerFormBuilderHandle } from "@/components/SpeakerFormBuilder";
import GettingStartedChecklist from "@/components/organizer/GettingStartedChecklist";
import EventContentTab from "@/components/organizer/EventContentTab";
import { toast } from "@/hooks/use-toast";
import { HelpTip } from "@/components/ui/HelpTip";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";

export default function SpeakerModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [shareOpen, setShareOpen] = useState(false);
  const [addSpeakerOpen, setAddSpeakerOpen] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<any | null>(null);
  const [panelView, setPanelView] = useState<PanelView | null>(null);
  const [editingForm, setEditingForm] = useState<"speaker-info" | "call-for-speakers" | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmFormLeave, setConfirmFormLeave] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const formBuilderRef = useRef<SpeakerFormBuilderHandle>(null);
  

  async function handleDownloadAllAssets() {
    const assets: { url: string; filename: string }[] = [];
    for (const speaker of speakerList) {
      const name = (speaker.name || speaker.email || "speaker").replace(/\s+/g, "-").toLowerCase();
      const headshotUrl = speaker.headshotDownloadUrl || speaker.headshot || speaker.headshotUrl || speaker.headshot_url || null;
      const logoUrl = speaker.logoDownloadUrl || speaker.companyLogo || speaker.company_logo || null;
      if (headshotUrl) assets.push({ url: headshotUrl, filename: `${name}-headshot.jpg` });
      if (logoUrl) assets.push({ url: logoUrl, filename: `${name}-logo.png` });
    }
    if (assets.length === 0) {
      toast({ title: "No assets to download", description: "None of your speakers have uploaded a headshot or logo yet." });
      return;
    }
    setIsDownloadingAll(true);
    const zip = new JSZip();
    let failed = 0;
    await Promise.all(
      assets.map(async (asset) => {
        try {
          const res = await fetch(asset.url);
          if (!res.ok) throw new Error("fetch failed");
          const blob = await res.blob();
          zip.file(asset.filename, blob);
        } catch {
          failed++;
        }
      })
    );
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = `${eventName.replace(/\s+/g, "-").toLowerCase() || "speakers"}-assets.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    setIsDownloadingAll(false);
    if (failed === 0) {
      toast({ title: `Zipped ${assets.length} asset${assets.length !== 1 ? "s" : ""}` });
    } else {
      toast({ title: `Zipped ${assets.length - failed} of ${assets.length} assets`, description: `${failed} failed — check CORS settings.`, variant: "destructive" });
    }
  }

  // Derive active tab from URL path
  const pathname = location.pathname;
  const activeTab = pathname.endsWith('/applications') ? 'applications'
    : pathname.endsWith('/embed') ? 'embed'
    : pathname.endsWith('/content') ? 'content'
    : pathname.endsWith('/promo-card-builder') ? 'promo-card-builder'
    : pathname.endsWith('/website-card-builder') ? 'website-card-builder'
    : 'speakers';

  const EMBED_VISITED_KEY = id ? `seamless-embed-visited-${id}` : null;
  const [embedVisited, setEmbedVisited] = useState(() => {
    try { return EMBED_VISITED_KEY ? localStorage.getItem(EMBED_VISITED_KEY) === "true" : false; } catch { return false; }
  });

  // Mark embed tab as visited (step 5 of checklist)
  useEffect(() => {
    if (activeTab === "embed" && EMBED_VISITED_KEY && !embedVisited) {
      setEmbedVisited(true);
      try { localStorage.setItem(EMBED_VISITED_KEY, "true"); } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Open form editor directly if ?edit-form=<type> is in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editForm = params.get("edit-form");
    if (editForm === "speaker-info" || editForm === "call-for-speakers") {
      setEditingForm(editForm);
      navigate(`/organizer/event/${id}/speakers`, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleCopyFormLink = (formType: "speaker-info" | "call-for-speakers") => {
    const slug = formType === "speaker-info" ? "speaker-intake" : "call-for-speakers";
    navigator.clipboard.writeText(`${window.location.origin}/${slug}/${id}`);
    setCopiedLink(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyForm = async () => {
    if (!formConfig) {
      toast({ title: "No form configured to copy", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(formConfig, null, 2));
      toast({ title: "Form JSON copied to clipboard" });
    } catch (err) {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };
  

  const { data: eventData } = useQuery<any>({
    queryKey: ['event', id],
    queryFn: () => getJson<any>(`/events/${id}`),
    enabled: !!id,
  });
  const eventName = eventData?.title || eventData?.name || '';
  const emailDefaults = {
    fromName: eventData?.from_name ?? eventData?.fromName ?? '',
    fromEmail: eventData?.from_email ?? eventData?.fromEmail ?? '',
    replyToEmail: eventData?.reply_to_email ?? eventData?.replyToEmail ?? '',
  };

  const { data: formConfig } = useQuery<any[], Error>({
    queryKey: ["event", id, "form-config", "speaker-info"],
    queryFn: async () => {
      try {
        const res = await getFormConfigForEvent(id!, "speaker-info");
        if (!res?.config) return null;
        if (Array.isArray(res.config)) return res.config;
        if (Array.isArray(res.config.fields)) return res.config.fields;
        return null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(id),
  });

  const { data: cfsFormConfig } = useQuery<any, Error>({
    queryKey: ["event", id, "form-config", "call-for-speakers"],
    queryFn: async () => {
      try {
        const res = await getFormConfigForEvent(id!, "call-for-speakers");
        if (!res?.config) return null;
        return res;
      } catch {
        return null;
      }
    },
    enabled: Boolean(id),
  });

  const { data: websiteCardConfig } = useQuery<any>({
    queryKey: ["event", id, "card-config", "website"],
    queryFn: async () => {
      try { return await getPromoConfigForEvent(id!, "website"); } catch { return null; }
    },
    enabled: Boolean(id),
  });
  const { data: promoCardConfig } = useQuery<any>({
    queryKey: ["event", id, "card-config", "promo"],
    queryFn: async () => {
      try { return await getPromoConfigForEvent(id!, "promo"); } catch { return null; }
    },
    enabled: Boolean(id),
  });

  const speakerQueryTab = activeTab === "applications" ? "applications" : "speakers";
  const { data: rawSpeakers, isLoading } = useQuery<any, Error>({
    queryKey: ["event", id, "speakers", speakerQueryTab],
    queryFn: () => {
      const formType = activeTab === "applications" ? "call-for-speakers" : "speaker-info";
      const qs = `?form_type=${encodeURIComponent(formType)}`;
      return getJson<any>(`/events/${id}/speakers${qs}`);
    },
    enabled: Boolean(id) && (activeTab === "speakers" || activeTab === "applications" || activeTab === "content"),
  });

  // Normalize response shapes into any[]
  const speakerList: any[] = (() => {
    if (!rawSpeakers) return [];
    let arr: any[] = [];
    if (Array.isArray(rawSpeakers)) arr = rawSpeakers;
    else if (Array.isArray(rawSpeakers.items)) arr = rawSpeakers.items;
    else if (Array.isArray(rawSpeakers.results)) arr = rawSpeakers.results;
    else if (Array.isArray(rawSpeakers.speakers)) arr = rawSpeakers.speakers;
    else if (Array.isArray(rawSpeakers.data)) arr = rawSpeakers.data;

    return arr.map((it: any) => {
      const firstName = it.first_name ?? it.firstName ?? "";
      const lastName = it.last_name ?? it.lastName ?? "";
      const email = it.email ?? "";
      const company = it.company_name ?? it.company ?? it.companyName ?? "";
      const companyRole = it.company_role ?? it.companyRole ?? "";
      const headshot = it.headshot ?? it.headshot_url ?? it.avatar_url ?? null;
      const intakeFormStatus = it.intake_form_status ?? it.intakeFormStatus ?? "pending";
      const speakerInformationStatus = it.speaker_information_status ?? it.speakerInformationStatus ?? null;
      const callForSpeakersStatus = it.call_for_speakers_status ?? it.callForSpeakersStatus ?? null;
      const createdAt = it.registered_at ?? it.created_at ?? it.createdAt ?? null;
      const name = `${firstName} ${lastName}`.trim() || email;

      return {
        ...it,
        firstName,
        lastName,
        email,
        company,
        companyRole,
        avatarUrl: headshot,
        intakeFormStatus,
        speakerInformationStatus,
        callForSpeakersStatus,
        createdAt,
        name,
      };
    });
  })();

  const filteredSpeakers = speakerList
    .filter((speaker) => {
      const matchesSearch =
        speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.company.toLowerCase().includes(searchQuery.toLowerCase());

      const isArchived = speaker.status === "archived";
      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = !isArchived;
      } else if (statusFilter === "archived") {
        matchesStatus = isArchived;
      } else if (statusFilter !== "all") {
        const effectiveStatus = activeTab === 'applications'
          ? (speaker.callForSpeakersStatus ?? speaker.call_for_speakers_status)
          : (speaker.speakerInformationStatus ?? speaker.speaker_information_status ?? speaker.intakeFormStatus ?? speaker.intake_form_status);

        // Derive card-column statuses to match what the table shows
        const headshot = speaker.headshot ?? speaker.headshot_url ?? speaker.avatarUrl ?? null;
        const infoComplete = effectiveStatus !== 'pending' && !!headshot;
        const ws = speaker.websiteCardApproved ?? speaker.website_card_approved ?? false;
        const promo = speaker.promoCardApproved ?? speaker.promo_card_approved ?? false;
        const embedded = speaker.embedEnabled ?? speaker.embed_enabled ?? false;

        if (statusFilter === 'pending') {
          // Info Pending: either intake form not submitted or headshot missing
          matchesStatus = !infoComplete;
        } else if (statusFilter === 'submitted') {
          // Pending Approval: info complete but either card not yet approved
          matchesStatus = infoComplete && (!ws || !promo);
        } else if (statusFilter === 'cards_approved') {
          // Ready to Publish: speaker card approved, not yet live
          matchesStatus = infoComplete && ws && !embedded;
        } else if (statusFilter === 'published') {
          matchesStatus = embedded;
        } else {
          matchesStatus = effectiveStatus === statusFilter;
        }
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === "oldest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  const pendingCount = speakerList.filter(s => {
    const effectiveStatus = activeTab === 'applications'
      ? (s.callForSpeakersStatus ?? s.call_for_speakers_status)
      : (s.speakerInformationStatus ?? s.speaker_information_status ?? s.intakeFormStatus ?? s.intake_form_status);
    return effectiveStatus === 'pending';
  }).length;
  const totalCount = speakerList.length;

  const tabClass = (tab: string) =>
    `py-3 border-b-2 transition-colors text-sm font-medium whitespace-nowrap ${
      activeTab === tab
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
    }`;

  const isCardBuilder = activeTab === "promo-card-builder" || activeTab === "website-card-builder";

  // Always derive the panel speaker from the live list so it reflects approval changes immediately
  const panelSpeaker = selectedSpeaker
    ? speakerList.find(s => s.id === selectedSpeaker.id) ?? selectedSpeaker
    : null;

  const handleBadgeClick = (speaker: any, view: PanelView) => {
    setSelectedSpeaker(speaker);
    setPanelView(view);
  };

  return (
    <div className="space-y-0">
      {/* Tabs Navigation — hidden when card builder is active */}
      {!isCardBuilder && (
      <div className="border-b border-border bg-card/50">
        <div className="flex items-center justify-between px-0">
          <div className="flex gap-6">
            <button onClick={() => navigate(`/organizer/event/${id}/speakers`)} className={tabClass("speakers")}>
              Speakers
            </button>
            <button onClick={() => navigate(`/organizer/event/${id}/speakers/applications`)} className={tabClass("applications")}>
              Applications
            </button>
            <button onClick={() => navigate(`/organizer/event/${id}/speakers/embed`)} className={tabClass("embed")}>
              Speaker Wall
            </button>
            <button onClick={() => navigate(`/organizer/event/${id}/speakers/content`)} className={tabClass("content")}>
              Content
            </button>
            <button onClick={() => navigate(`/organizer/event/${id}/website-card-builder`)} className={tabClass("website-card-builder")}>
              Speaker Card Template
            </button>
            <button onClick={() => navigate(`/organizer/event/${id}/promo-card-builder`)} className={tabClass("promo-card-builder")}>
              Social Card Template
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Speakers Tab Content */}
      {activeTab === "speakers" && (
        <div className="space-y-4 pt-6">
          {id && (
            <GettingStartedChecklist
              eventId={id}
              applicationFormConfigured={!!cfsFormConfig}
              intakeFormConfigured={!!formConfig && formConfig.length > 0}
              websiteCardConfigured={!!websiteCardConfig}
              promoCardConfigured={!!promoCardConfig}
              embedVisited={embedVisited}
              onEditForm={(type) => setEditingForm(type)}
            />
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AddSpeakerDialog eventId={id} eventName={eventName} emailDefaults={emailDefaults} open={addSpeakerOpen} onOpenChange={setAddSpeakerOpen} />
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditingForm("speaker-info") }>
                <FileEdit className="h-3.5 w-3.5" />Edit Speaker Intake Form
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <HelpTip title="How speakers work" side="bottom" align="end">
                <p>Add speakers manually or accept them from <span className="font-medium text-foreground">Applications</span>. Send each one their intake form to collect a headshot, bio, and logo.</p>
                <p>Once submitted, approve their <span className="font-medium text-foreground">speaker card</span> and <span className="font-medium text-foreground">social card</span> from their profile, then publish them live via <span className="font-medium text-foreground">Speaker Wall</span>.</p>
              </HelpTip>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShareOpen(true)}>
                <Share2 className="h-3.5 w-3.5" />Share All Speakers
              </Button>
              <ShareDialog
                open={shareOpen}
                onOpenChange={setShareOpen}
                title="Share All Speakers"
                description="Give teammates access to view or manage speakers for this event."
              />
            </div>
          </div>

          {/* Split layout: table + persistent quick panel */}
          <div className="flex gap-4 items-start">
            <div className="flex-1 min-w-0 rounded-lg border border-border overflow-hidden">
              <SpeakersTable
                speakers={filteredSpeakers}
                isLoading={isLoading}
                eventId={id}
                selectedTab={activeTab}
                formConfig={formConfig}
                websiteCardConfigured={!!websiteCardConfig}
                promoCardConfigured={!!promoCardConfig}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                totalCount={totalCount}
                pendingCount={pendingCount}
                onBadgeClick={handleBadgeClick}
                selectedSpeakerId={selectedSpeaker?.id}
              />
            </div>

            {/* Quick panel — always visible, blank until a badge is clicked */}
            <div className="w-[600px] shrink-0 rounded-lg border border-border overflow-hidden sticky top-4 max-h-[calc(100vh-140px)]">
              {panelSpeaker && panelView ? (
                <SpeakerQuickPanel
                  speaker={panelSpeaker}
                  eventId={id!}
                  view={panelView}
                  onClose={() => { setSelectedSpeaker(null); setPanelView(null); }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-center min-h-[200px]">
                  <p className="text-sm text-muted-foreground">Click a status badge to quick-view a speaker</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <ApplicationsTab
          eventId={id}
          eventName={eventName}
          emailDefaults={emailDefaults}
          onEditForm={() => setEditingForm("call-for-speakers")}
          onCopyFormLink={() => handleCopyFormLink("call-for-speakers")}
          copiedLink={copiedLink}
        />
      )}

      {/* Embed Builder Tab */}
      {activeTab === "embed" && (
        <EmbedBuilder eventId={id} />
      )}

      {/* Content Tab */}
      {activeTab === "content" && id && (
        <EventContentTab eventId={id} />
      )}

      {/* Card Builder Tabs */}
      {isCardBuilder && (
        <div style={{ height: '100vh' }}>
          <CardBuilder key={activeTab} eventId={id} fullscreen onBack={() => navigate(-1)} />
        </div>
      )}
      {/* Full-page form editor overlay */}
      {editingForm && (
        <>
        <UnsavedChangesDialog
          open={confirmFormLeave}
          onSave={() => { setConfirmFormLeave(false); formBuilderRef.current?.save(); }}
          onDiscard={() => { setConfirmFormLeave(false); setEditingForm(null); }}
          onCancel={() => setConfirmFormLeave(false)}
        />
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border bg-card/95 px-4 shrink-0">
            <button
              onClick={() => {
                if (formBuilderRef.current?.isDirty) {
                  setConfirmFormLeave(true);
                } else {
                  setEditingForm(null);
                }
              }}
              className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-baseline gap-1.5 leading-none select-none">
              <span className="text-sm font-semibold text-primary" style={{ letterSpacing: "-0.01em" }}>Seamless</span>
              <span className="text-xs font-normal text-muted-foreground">Forms</span>
            </div>
            <span className="text-border">|</span>
            <span className="text-sm font-medium text-foreground truncate">
              {editingForm === "speaker-info" ? `Speaker Intake | ${eventName}` : `Speaker Applications | ${eventName}`}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleCopyFormLink(editingForm)}>
                {copiedLink ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy Link</>}
              </Button>
              <Button size="sm" onClick={() => formBuilderRef.current?.save()}>
                Save Changes
              </Button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-6 py-6">
              <SpeakerFormBuilder
                ref={formBuilderRef}
                eventId={id}
                formType={editingForm}
                eventName={eventName}
                onSave={() => setEditingForm(null)}
              />
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
