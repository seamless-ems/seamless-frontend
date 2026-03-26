import { useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getJson, getFormConfigForEvent, getPromoConfigForEvent } from "@/lib/api";
import { ArrowLeft, Check, Copy, FileEdit, Share2 } from "lucide-react";
import AddSpeakerDialog from "@/components/organizer/AddSpeakerDialog";
import ShareDialog from "@/components/organizer/ShareDialog";
import SpeakersTable from "@/components/organizer/SpeakersTable";
import EmbedBuilder from "@/components/organizer/EmbedBuilder";
import ApplicationsTab from "@/components/organizer/ApplicationsTab";
import CardBuilder from "@/components/CardBuilder";
import SpeakerFormBuilder, { type SpeakerFormBuilderHandle } from "@/components/SpeakerFormBuilder";
import { toast } from "@/hooks/use-toast";

export default function SpeakerModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [shareOpen, setShareOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<"speaker-info" | "call-for-speakers" | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const formBuilderRef = useRef<SpeakerFormBuilderHandle>(null);

  // Derive active tab from URL path
  const pathname = location.pathname;
  const activeTab = pathname.endsWith('/applications') ? 'applications'
    : pathname.endsWith('/embed') ? 'embed'
    : pathname.endsWith('/promo-card-builder') ? 'promo-card-builder'
    : pathname.endsWith('/website-card-builder') ? 'website-card-builder'
    : 'speakers';

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

  const { data: rawSpeakers, isLoading } = useQuery<any, Error>({
    queryKey: ["event", id, "speakers", activeTab],
    queryFn: () => {
      const formType = activeTab === "applications" ? "call-for-speakers" : "speaker-info";
      const qs = `?form_type=${encodeURIComponent(formType)}`;
      return getJson<any>(`/events/${id}/speakers${qs}`);
    },
    enabled: Boolean(id) && (activeTab === "speakers" || activeTab === "applications"),
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

        if (statusFilter === 'published') {
          matchesStatus = speaker.embedEnabled ?? speaker.embed_enabled ?? false;
        } else if (statusFilter === 'cards_approved') {
          const ws = speaker.websiteCardApproved ?? speaker.website_card_approved ?? false;
          const promo = speaker.promoCardApproved ?? speaker.promo_card_approved ?? false;
          const embedded = speaker.embedEnabled ?? speaker.embed_enabled ?? false;
          matchesStatus = ws && promo && !embedded;
        } else if (statusFilter === 'submitted') {
          const ws = speaker.websiteCardApproved ?? speaker.website_card_approved ?? false;
          const promo = speaker.promoCardApproved ?? speaker.promo_card_approved ?? false;
          matchesStatus = ['submitted', 'approved'].includes(effectiveStatus) && !(ws && promo);
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
              Speaker Card Embed
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
        <div className="space-y-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AddSpeakerDialog eventId={id} eventName={eventName} emailDefaults={emailDefaults} />
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditingForm("speaker-info")}>
                <FileEdit className="h-3.5 w-3.5" />Edit Intake Form
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShareOpen(true)}>
                <Share2 className="h-3.5 w-3.5" />Share Speaker List
              </Button>
              <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            {/* @ts-ignore */}
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
            />
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

      {/* Card Builder Tabs */}
      {isCardBuilder && (
        <div style={{ height: '100vh' }}>
          <CardBuilder key={activeTab} eventId={id} fullscreen onBack={() => navigate(-1)} />
        </div>
      )}
      {/* Full-page form editor overlay */}
      {editingForm && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border bg-card/95 px-4 shrink-0">
            <button
              onClick={() => setEditingForm(null)}
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
      )}
    </div>
  );
}
