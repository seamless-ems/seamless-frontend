import { useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, createSpeaker } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import SpeakerFormBuilder from "@/components/SpeakerFormBuilder";
import AddSpeakerDialog from "@/components/organizer/AddSpeakerDialog";
import SpeakersTable from "@/components/organizer/SpeakersTable";
import SpeakersControls from "@/components/organizer/SpeakersControls";
import EmbedBuilder from "@/components/organizer/EmbedBuilder";
import FormsTab from "@/components/organizer/FormsTab";

export default function SpeakerModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const getInitialTab = () => {
    try {
      const params = new URLSearchParams(location.search);
      const t = params.get("tab");
      if (t === "speakers" || t === "applications" || t === "forms" || t === "embed-builder") return t;
    } catch (e) {
      // ignore
    }
    return "speakers";
  };

  const [selectedTab, setSelectedTab] = useState<string>(getInitialTab);
  // dialog and table are extracted into components
  const [addOpen, setAddOpen] = useState(false);

  const { data: rawSpeakers, isLoading } = useQuery<any, Error>({
    queryKey: ["event", id, "speakers", selectedTab],
    queryFn: () => {
      // Filter by form_type: speakers tab should show speaker-info, applications tab should show call-for-speakers
      const formType = selectedTab === "speakers" ? "speaker-info" : (selectedTab === "applications" ? "call-for-speakers" : "speaker-info");
      const qs = `?form_type=${encodeURIComponent(formType)}`;
      return getJson<any>(`/events/${id}/speakers${qs}`);
    },
    enabled: Boolean(id),
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
        matchesStatus = speaker.intakeFormStatus === statusFilter;
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

  const pendingCount = speakerList.filter(s => s.intakeFormStatus === "pending").length;
  const totalCount = speakerList.length;

  return (
    <div className="space-y-0">
      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <div className="flex gap-8 px-0">
          <button
            onClick={() => setSelectedTab("speakers")}
            className={`pb-3 border-b-2 transition-colors text-sm ${
              selectedTab === "speakers"
                ? "border-primary text-foreground font-semibold bg-muted/50 px-3 py-2 rounded-t"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            Speakers
          </button>
          <button
            onClick={() => setSelectedTab("applications")}
            className={`pb-3 border-b-2 transition-colors text-sm ${
              selectedTab === "applications"
                ? "border-primary text-foreground font-semibold bg-muted/50 px-3 py-2 rounded-t"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            Call for Speakers
          </button>
          <button
            onClick={() => setSelectedTab("forms")}
            className={`pb-3 border-b-2 transition-colors text-sm ${
              selectedTab === "forms"
                ? "border-primary text-foreground font-semibold bg-muted/50 px-3 py-2 rounded-t"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            Forms
          </button>
          <button
            onClick={() => setSelectedTab("embed-builder")}
            className={`pb-3 border-b-2 transition-colors text-sm ${
              selectedTab === "embed-builder"
                ? "border-primary text-foreground font-semibold bg-muted/50 px-3 py-2 rounded-t"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            Embed Builder
          </button>
          <button
            onClick={() => navigate(`/organizer/event/${id}/website-card-builder`)}
            className="pb-3 border-b-2 border-transparent text-muted-foreground hover:text-foreground font-medium transition-colors text-sm hover:border-primary"
          >
            Website Card Builder
          </button>
          <button
            onClick={() => navigate(`/organizer/event/${id}/promo-card-builder`)}
            className="pb-3 border-b-2 border-transparent text-muted-foreground hover:text-foreground font-medium transition-colors text-sm hover:border-primary"
          >
            Promo Card Builder
          </button>
        </div>
      </div>

      {/* Speakers Tab Content */}
      {selectedTab === "speakers" && (
        <div className="space-y-6 pt-6">
          {/* Header and Action */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Manage and approve event speakers</p>
            </div>
            {/* Dialog extracted to AddSpeakerDialog component */}
            <div>
              {/* AddSpeakerDialog renders its own trigger */}
              {/* @ts-ignore: dynamic import component */}
              <AddSpeakerDialog eventId={id} />
            </div>
          </div>

          {/* Table Container */}
          <div className="space-y-4">
            {/* Controls Bar (extracted) */}
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

            {/* Speakers table extracted */}
            <div className="rounded-lg border border-border overflow-hidden">
              {/* @ts-ignore */}
              <SpeakersTable speakers={filteredSpeakers} isLoading={isLoading} eventId={id} />
            </div>
          </div>
        </div>
      )}

      {/* Applications Tab */}
      {selectedTab === "applications" && (
        <div className="space-y-6 pt-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground mt-1">Review and approve speaker applications</p>

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

            {/* Applications Table (reuse speakers controls + table but data is filtered by form_type) */}
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
              <SpeakersTable speakers={filteredSpeakers} isLoading={isLoading} eventId={id} />
            </div>
          </div>
        </div>
      )}

      {/* Forms Tab */}
      {selectedTab === "forms" && (
        <FormsTab eventId={id} />
      )}

      {/* Embed Builder Tab */}
      {selectedTab === "embed-builder" && (
        <EmbedBuilder eventId={id} />
      )}

    </div>
  );
}




