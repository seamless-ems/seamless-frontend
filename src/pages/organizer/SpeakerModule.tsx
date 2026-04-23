import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EventHeaderActions from "@/components/layout/EventHeaderActions";
import { useQuery } from "@tanstack/react-query";
import { getJson, getFormConfigForEvent, getPromoConfigForEvent } from "@/lib/api";
import { ArrowLeft, Check, Copy, Plus } from "lucide-react";
import AddSpeakerDialog from "@/components/organizer/AddSpeakerDialog";
import SpeakerQuickPanel, { type PanelView } from "@/components/organizer/SpeakerQuickPanel";
import SpeakersTable from "@/components/organizer/SpeakersTable";
import EmbedBuilder from "@/components/organizer/EmbedBuilder";
import ApplicationsTab from "@/components/organizer/ApplicationsTab";
import CardBuilder from "@/components/CardBuilder";
import SpeakerFormBuilder, { type SpeakerFormBuilderHandle } from "@/components/SpeakerFormBuilder";
import GettingStartedChecklist from "@/components/organizer/GettingStartedChecklist";
import EventContentTab from "@/components/organizer/EventContentTab";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";

export default function SpeakerModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [addSpeakerOpen, setAddSpeakerOpen] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<any | null>(null);
  const [panelView, setPanelView] = useState<PanelView | null>(null);
  const [editingForm, setEditingForm] = useState<"speaker-info" | "call-for-speakers" | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [formSaved, setFormSaved] = useState(false);
  const [copiedFormLink, setCopiedFormLink] = useState(false);
  const [confirmFormLeave, setConfirmFormLeave] = useState(false);
  const formBuilderRef = useRef<SpeakerFormBuilderHandle>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

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
    queryKey: ["event", id, "speakers", speakerQueryTab, page, pageSize, searchQuery, statusFilter, sortBy],
    queryFn: () => {
      const formType = activeTab === "applications" ? "call-for-speakers" : "speaker-info";
      const params = new URLSearchParams();
      params.set("form_type", formType);
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (sortBy) params.set("sort", sortBy);
      const qs = `?${params.toString()}`;
      return getJson<any>(`/events/${id}/speakers${qs}`);
    },
    enabled: Boolean(id) && (activeTab === "speakers" || activeTab === "applications" || activeTab === "content"),
    keepPreviousData: true,
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
        const embedded = speaker.embedEnabled ?? speaker.embed_enabled ?? false;

        if (statusFilter === 'pending') {
          // Info Pending: either intake form not submitted or headshot missing
          matchesStatus = !infoComplete;
        } else if (statusFilter === 'submitted') {
          // Pending Approval: info complete but speaker card not yet approved
          matchesStatus = infoComplete && !ws;
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
  // Use server-provided total when available (rawSpeakers.total), otherwise fall back to client length.
  const totalCount = rawSpeakers && typeof rawSpeakers.total === 'number' ? rawSpeakers.total : speakerList.length;

  const tabClass = (tab: string) =>
    `py-3 border-b-2 transition-colors text-sm font-medium whitespace-nowrap ${
      activeTab === tab
        ? "border-accent text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
    }`;

  const isCardBuilder = activeTab === "promo-card-builder" || activeTab === "website-card-builder";

  // Always derive the panel speaker from the live list so it reflects approval changes immediately
  const panelSpeaker = selectedSpeaker
    ? speakerList.find(s => s.id === selectedSpeaker.id) ?? selectedSpeaker
    : null;

  // Reset to first page when search, filter or sort changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, sortBy, activeTab]);

  const handleBadgeClick = (speaker: any, view: PanelView) => {
    setSelectedSpeaker(speaker);
    setPanelView(view);
  };

  return (
    <div className="space-y-0">
      {!isCardBuilder && (
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-card/95 flex items-end px-4 gap-0">
          <Link to="/organizer" className="flex items-center gap-1.5 py-3 border-b-2 border-transparent shrink-0 mr-6">
            <span className="text-sm font-semibold text-accent" style={{ letterSpacing: '-0.01em' }}>Seamless</span>
            <span className="text-sm font-normal text-muted-foreground">Events</span>
          </Link>
          <div className="flex items-end h-full gap-6 flex-1">
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
          <EventHeaderActions eventData={eventData} id={id} />
        </header>
      )}

      {/* Speakers Tab Content */}
      {activeTab === "speakers" && (
        <div className="space-y-4 px-6 pt-6 pb-6">
          {id && (
            <GettingStartedChecklist
              eventId={id}
              applicationFormConfigured={!!cfsFormConfig}
              intakeFormConfigured={!!formConfig && formConfig.length > 0}
              websiteCardConfigured={!!websiteCardConfig}
              promoCardConfigured={!!promoCardConfig}
              embedVisited={embedVisited}
              hasSpeakers={speakerList.length > 0}
              onEditForm={(type) => setEditingForm(type)}
              onAddSpeaker={() => setAddSpeakerOpen(true)}
              activeStep={1}
            />
          )}
          {/* Split layout: table + persistent quick panel */}
          <AddSpeakerDialog eventId={id} eventName={eventName} emailDefaults={emailDefaults} open={addSpeakerOpen} onOpenChange={setAddSpeakerOpen} />
          <div className="rounded-lg border border-border overflow-hidden flex items-start divide-x divide-border">
            <div className="flex-1 min-w-0 overflow-hidden">
              <SpeakersTable
                speakers={filteredSpeakers}
                isLoading={isLoading}
                eventId={id}
                eventName={eventName}
                emailDefaults={emailDefaults}
                selectedTab={activeTab}
                formConfig={formConfig}
                websiteCardConfigured={!!websiteCardConfig}
                promoCardConfigured={!!promoCardConfig}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                setPage={setPage}
                setPageSize={setPageSize}
                pendingCount={pendingCount}
                onBadgeClick={handleBadgeClick}
                selectedSpeakerId={selectedSpeaker?.id}
                hasAnySpeakers={speakerList.length > 0}
                onEditIntakeForm={() => { setEditingForm("speaker-info"); setFormSaved(false); }}
                onAddSpeaker={() => setAddSpeakerOpen(true)}
              />
            </div>

            {/* Quick panel — always visible, blank until a badge is clicked */}
            <div className="w-[560px] shrink-0 overflow-hidden self-stretch flex flex-col">
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
        <div className="px-6 pb-6">
          {id && (
            <GettingStartedChecklist
              eventId={id}
              applicationFormConfigured={!!cfsFormConfig}
              intakeFormConfigured={!!formConfig && formConfig.length > 0}
              websiteCardConfigured={!!websiteCardConfig}
              promoCardConfigured={!!promoCardConfig}
              embedVisited={embedVisited}
              hasSpeakers={speakerList.length > 0}
              onEditForm={(type) => setEditingForm(type)}
              onAddSpeaker={() => { navigate(`/organizer/event/${id}/speakers`); setAddSpeakerOpen(true); }}
              activeStep={0}
            />
          )}
          <ApplicationsTab
            eventId={id}
            eventName={eventName}
            emailDefaults={emailDefaults}
            onEditForm={() => { setEditingForm("call-for-speakers"); setFormSaved(false); }}
            onCopyFormLink={() => handleCopyFormLink("call-for-speakers")}
            copiedLink={copiedLink}
          />
        </div>
      )}

      {/* Embed Builder Tab */}
      {activeTab === "embed" && (
        <div className="px-6 pb-6">
          {id && (
            <GettingStartedChecklist
              eventId={id}
              applicationFormConfigured={!!cfsFormConfig}
              intakeFormConfigured={!!formConfig && formConfig.length > 0}
              websiteCardConfigured={!!websiteCardConfig}
              promoCardConfigured={!!promoCardConfig}
              embedVisited={embedVisited}
              hasSpeakers={speakerList.length > 0}
              onEditForm={(type) => setEditingForm(type)}
              onAddSpeaker={() => { navigate(`/organizer/event/${id}/speakers`); setAddSpeakerOpen(true); }}
              activeStep={4}
            />
          )}
          <EmbedBuilder eventId={id} onAddSpeaker={() => { navigate(`/organizer/event/${id}/speakers`); setAddSpeakerOpen(true); }} />
        </div>
      )}

      {/* Content Tab */}
      {activeTab === "content" && id && (
        <div className="px-6 pb-6">
          <GettingStartedChecklist
            eventId={id}
            applicationFormConfigured={!!cfsFormConfig}
            intakeFormConfigured={!!formConfig && formConfig.length > 0}
            websiteCardConfigured={!!websiteCardConfig}
            promoCardConfigured={!!promoCardConfig}
            embedVisited={embedVisited}
            hasSpeakers={speakerList.length > 0}
            onEditForm={(type) => setEditingForm(type)}
            onAddSpeaker={() => { navigate(`/organizer/event/${id}/speakers`); setAddSpeakerOpen(true); }}
          />
          <EventContentTab eventId={id} />
        </div>
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
              <span className="text-sm font-semibold text-accent" style={{ letterSpacing: "-0.01em" }}>Seamless</span>
              <span className="text-xs font-normal text-muted-foreground">Forms</span>
            </div>
            <span className="text-border">|</span>
            <span className="text-sm font-medium text-foreground truncate">
              {editingForm === "speaker-info" ? `Speaker Intake | ${eventName}` : `Speaker Applications | ${eventName}`}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" onClick={() => formBuilderRef.current?.save()}>
                Save Changes
              </Button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1400px] mx-auto px-8 py-6">
              <SpeakerFormBuilder
                ref={formBuilderRef}
                eventId={id}
                formType={editingForm}
                eventName={eventName}
                onSave={() => setFormSaved(true)}
              />
            </div>
          </div>
        </div>

        {/* Post-save dialog */}
        <Dialog open={formSaved} onOpenChange={(v) => { if (!v) setFormSaved(false); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingForm === "call-for-speakers" ? "Application Form saved" : "Speaker Intake Form saved"}
              </DialogTitle>
            </DialogHeader>
            {editingForm === "call-for-speakers" ? (
              <>
                <p className="text-sm text-muted-foreground">Your form is ready. Share the link so speakers can apply.</p>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/call-for-speakers/${id}`);
                      setCopiedFormLink(true);
                      toast({ title: "Link copied!" });
                      setTimeout(() => setCopiedFormLink(false), 2000);
                    }}
                  >
                    {copiedFormLink ? <><Check className="h-4 w-4 mr-2" />Copied</> : <><Copy className="h-4 w-4 mr-2" />Copy link</>}
                  </Button>
                  <Button variant="outline" onClick={() => { setFormSaved(false); setEditingForm(null); }}>Done</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Your Speaker Intake Form is ready. Next up: build your Speaker Card template.</p>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setFormSaved(false); setEditingForm(null); setAddSpeakerOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" />Add Speaker
                  </Button>
                  <Button onClick={() => { setFormSaved(false); setEditingForm(null); navigate(`/organizer/event/${id}/website-card-builder`); }}>
                    Build Speaker Card Template
                  </Button>
                  <Button variant="outline" onClick={() => { setFormSaved(false); setEditingForm(null); }}>Done</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        </>
      )}
    </div>
  );
}
