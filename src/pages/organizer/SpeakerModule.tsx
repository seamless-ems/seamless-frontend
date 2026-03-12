import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import AddSpeakerDialog from "@/components/organizer/AddSpeakerDialog";
import SpeakersTable from "@/components/organizer/SpeakersTable";
import SpeakersControls from "@/components/organizer/SpeakersControls";
import EmbedBuilder from "@/components/organizer/EmbedBuilder";
import FormsTab from "@/components/organizer/FormsTab";
import CardBuilder from "@/components/CardBuilder_SPX";

export default function SpeakerModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  // Derive active tab from URL path
  const pathname = location.pathname;
  const activeTab = pathname.endsWith('/applications') ? 'applications'
    : pathname.endsWith('/forms') ? 'forms'
    : pathname.endsWith('/embed') ? 'embed'
    : pathname.endsWith('/promo-card-builder') ? 'promo-card-builder'
    : pathname.endsWith('/website-card-builder') ? 'website-card-builder'
    : 'speakers';

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

        if (statusFilter === 'approved' || statusFilter === 'cards_approved') {
          matchesStatus = ['approved', 'cards_approved'].includes(effectiveStatus);
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
    `pb-3 border-b-2 transition-colors text-sm font-medium ${
      activeTab === tab
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  const isCardBuilder = activeTab === "promo-card-builder" || activeTab === "website-card-builder";

  return (
    <div className="space-y-0">
      {/* Tabs Navigation — hidden when card builder is active */}
      {!isCardBuilder && (
      <div className="border-b border-border">
        <div className="flex gap-6 px-0">
          <button onClick={() => navigate(`/organizer/event/${id}/speakers`)} className={tabClass("speakers")}>
            Confirmed Speakers
          </button>
          <button onClick={() => navigate(`/organizer/event/${id}/speakers/applications`)} className={tabClass("applications")}>
            Applications
          </button>
          <button onClick={() => navigate(`/organizer/event/${id}/speakers/forms`)} className={tabClass("forms")}>
            Forms
          </button>
          <button onClick={() => navigate(`/organizer/event/${id}/speakers/embed`)} className={tabClass("embed")}>
            Embeds
          </button>
          <button onClick={() => navigate(`/organizer/event/${id}/website-card-builder`)} className={tabClass("website-card-builder")}>
            Website Card Builder
          </button>
          <button onClick={() => navigate(`/organizer/event/${id}/promo-card-builder`)} className={tabClass("promo-card-builder")}>
            Promo Card Builder
          </button>
        </div>
      </div>
      )}

      {/* Speakers Tab Content */}
      {activeTab === "speakers" && (
        <div className="space-y-6 pt-6">
          <div className="flex justify-end">
            {/* @ts-ignore: dynamic import component */}
            <AddSpeakerDialog eventId={id} />
          </div>

          <div className="space-y-4">
            <SpeakersControls
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              totalCount={totalCount}
              pendingCount={pendingCount}
            />

            <div className="rounded-lg border border-border overflow-hidden">
              {/* @ts-ignore */}
              <SpeakersTable speakers={filteredSpeakers} isLoading={isLoading} eventId={id} selectedTab={activeTab} />
            </div>
          </div>
        </div>
      )}

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <div className="space-y-6 pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground mt-1">Review and approve applications</p>

              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">{totalCount} applications</div>
                {id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                      const url = `${origin}/call-for-speakers/${id}`;
                      window.open(url, '_blank', 'noopener');
                    }}
                  >
                    Open public intake form
                  </Button>
                )}
              </div>
            </div>

            <SpeakersControls
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              totalCount={totalCount}
              pendingCount={pendingCount}
            />

            <div className="rounded-lg border border-border overflow-hidden">
              {/* @ts-ignore */}
              <SpeakersTable speakers={filteredSpeakers} isLoading={isLoading} eventId={id} selectedTab={activeTab} />
            </div>
          </div>
        </div>
      )}

      {/* Forms Tab */}
      {activeTab === "forms" && (
        <FormsTab eventId={id} />
      )}

      {/* Embed Builder Tab */}
      {activeTab === "embed" && (
        <EmbedBuilder eventId={id} />
      )}

      {/* Card Builder Tabs */}
      {isCardBuilder && (
        <div style={{ height: '100vh' }}>
          <CardBuilder key={activeTab} eventId={id} fullscreen onBack={() => navigate(`/organizer/event/${id}/speakers`)} />
        </div>
      )}
    </div>
  );
}
