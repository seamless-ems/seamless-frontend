import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, getFormConfigForEvent, updateSpeaker } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronRight, Copy, FileEdit, MoreVertical, Search } from "lucide-react";

function resolveAppStatus(speaker: any) {
  const s =
    speaker.callForSpeakersStatus ??
    speaker.call_for_speakers_status ??
    "pending";
  if (s === "approved")
    return { label: "Approved", cls: "bg-success/10 text-success border-success/30" };
  if (s === "rejected")
    return { label: "Rejected", cls: "bg-destructive/10 text-destructive border-destructive/30" };
  if (s === "submitted")
    return { label: "Submitted", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
  return { label: "Pending", cls: "bg-warning/10 text-warning border-warning/30" };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function ApplicationsTab({ eventId, onEditForm, onCopyFormLink, copiedLink }: {
  eventId: string | undefined;
  onEditForm?: () => void;
  onCopyFormLink?: () => void;
  copiedLink?: boolean;
}) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "submitted" | "approved" | "rejected">("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Fetch call-for-speakers form config to know which columns to show
  const { data: rawFormConfig } = useQuery<any>({
    queryKey: ["event", eventId, "form-config", "call-for-speakers"],
    queryFn: async () => {
      try {
        const res = await getFormConfigForEvent(eventId!, "call-for-speakers");
        if (!res?.config) return null;
        if (Array.isArray(res.config)) return res.config;
        if (Array.isArray(res.config.fields)) return res.config.fields;
        return null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(eventId),
  });

  const formConfig: any[] | null = rawFormConfig ?? null;
  const fieldEnabled = (fieldId: string) =>
    !formConfig || formConfig.some((f: any) => f.id === fieldId && f.enabled);

  const showHeadshot = fieldEnabled("headshot");
  const showCompany = fieldEnabled("company_name");
  const showRole = fieldEnabled("company_role");
  const showBio = fieldEnabled("bio");
  const showEmail = fieldEnabled("email");

  // Fetch applications
  const { data: rawApplications, isLoading } = useQuery<any>({
    queryKey: ["event", eventId, "applications"],
    queryFn: () => getJson<any>(`/events/${eventId}/speakers?form_type=call-for-speakers`),
    enabled: Boolean(eventId),
  });

  const allApplications: any[] = (() => {
    if (!rawApplications) return [];
    let arr: any[] = [];
    if (Array.isArray(rawApplications)) arr = rawApplications;
    else if (Array.isArray(rawApplications.items)) arr = rawApplications.items;
    else if (Array.isArray(rawApplications.results)) arr = rawApplications.results;
    else if (Array.isArray(rawApplications.speakers)) arr = rawApplications.speakers;
    else if (Array.isArray(rawApplications.data)) arr = rawApplications.data;

    return arr.map((it: any) => ({
      ...it,
      firstName: it.first_name ?? it.firstName ?? "",
      lastName: it.last_name ?? it.lastName ?? "",
      email: it.email ?? "",
      company: it.company_name ?? it.company ?? it.companyName ?? "",
      companyRole: it.company_role ?? it.companyRole ?? "",
      avatarUrl: it.headshot ?? it.headshot_url ?? it.avatar_url ?? null,
      bio: it.bio ?? null,
      callForSpeakersStatus: it.call_for_speakers_status ?? it.callForSpeakersStatus ?? "pending",
      submittedAt: it.registered_at ?? it.created_at ?? it.createdAt ?? null,
      name: `${it.first_name ?? it.firstName ?? ""} ${it.last_name ?? it.lastName ?? ""}`.trim() || (it.email ?? ""),
    }));
  })();

  const filtered = allApplications
    .filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || a.callForSpeakersStatus === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA;
    });

  const counts = {
    all: allApplications.length,
    submitted: allApplications.filter((a) => a.callForSpeakersStatus === "submitted").length,
    pending: allApplications.filter((a) => a.callForSpeakersStatus === "pending").length,
    approved: allApplications.filter((a) => a.callForSpeakersStatus === "approved").length,
    rejected: allApplications.filter((a) => a.callForSpeakersStatus === "rejected").length,
  };

  const handleUpdateStatus = async (speakerId: string, status: "approved" | "rejected") => {
    if (status === "approved") setApprovingId(speakerId);
    try {
      await updateSpeaker(eventId!, speakerId, { call_for_speakers_status: status });
      toast({
        title: status === "approved" ? "Application approved" : "Application rejected",
        description: status === "approved"
          ? "The speaker has been moved to your Speakers list."
          : "The application has been marked as rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const filterBtnClass = (f: typeof statusFilter) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
      statusFilter === f
        ? "bg-primary text-primary-foreground"
        : "bg-muted/50 text-muted-foreground hover:bg-muted"
    }`;

  return (
    <div className="space-y-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {counts.submitted > 0
            ? `${counts.submitted} application${counts.submitted !== 1 ? "s" : ""} awaiting review`
            : "No applications awaiting review"}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onCopyFormLink}>
            {copiedLink ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy Link</>}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onEditForm}>
            <FileEdit className="h-3.5 w-3.5" />Edit Form
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search applicants…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button className={filterBtnClass("all")} onClick={() => setStatusFilter("all")}>
            All <span className="ml-1 opacity-60">{counts.all}</span>
          </button>
          <button className={filterBtnClass("submitted")} onClick={() => setStatusFilter("submitted")}>
            Submitted <span className="ml-1 opacity-60">{counts.submitted}</span>
          </button>
          <button className={filterBtnClass("pending")} onClick={() => setStatusFilter("pending")}>
            Pending <span className="ml-1 opacity-60">{counts.pending}</span>
          </button>
          <button className={filterBtnClass("approved")} onClick={() => setStatusFilter("approved")}>
            Approved <span className="ml-1 opacity-60">{counts.approved}</span>
          </button>
          <button className={filterBtnClass("rejected")} onClick={() => setStatusFilter("rejected")}>
            Rejected <span className="ml-1 opacity-60">{counts.rejected}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading applications…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {allApplications.length === 0 ? "No applications yet" : "No applications match your filters"}
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                {showHeadshot && <th className="px-5 py-4 text-left text-xs font-medium text-muted-foreground w-[68px]"></th>}
                <th className="px-5 py-4 text-left text-xs font-medium text-muted-foreground">Applicant</th>
                {showEmail && <th className="px-5 py-4 text-left text-xs font-medium text-muted-foreground">Email</th>}
                {showCompany && <th className="px-5 py-4 text-left text-xs font-medium text-muted-foreground">Company</th>}
                {showBio && <th className="px-5 py-4 text-left text-xs font-medium text-muted-foreground max-w-[200px]">Bio</th>}
                <th className="px-5 py-4 text-left text-xs font-medium text-muted-foreground w-[130px]">Status</th>
                <th className="px-5 py-4 text-left text-xs font-medium text-muted-foreground w-[120px]">Submitted</th>
                <th className="px-5 py-4 text-right text-xs font-medium text-muted-foreground w-[160px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((applicant) => {
                const initials = applicant.name
                  .split(" ")
                  .map((p: string) => p?.[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("");
                const status = resolveAppStatus(applicant);
                const isApproved = applicant.callForSpeakersStatus === "approved";
                const isRejected = applicant.callForSpeakersStatus === "rejected";
                const isApproving = approvingId === applicant.id;

                return (
                  <tr
                    key={applicant.id}
                    className="border-b border-border hover:bg-muted/40 transition-colors group"
                  >
                    {showHeadshot && (
                      <td className="px-5 py-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={applicant.avatarUrl ?? undefined} alt={applicant.name} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                      </td>
                    )}

                    {/* Name */}
                    <td className="px-5 py-4">
                      <div
                        className="flex items-center gap-1 cursor-pointer group/name"
                        onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${applicant.id}`}
                      >
                        <span className="text-sm font-semibold text-foreground group-hover/name:text-primary transition-colors leading-tight">
                          {applicant.name}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/name:text-muted-foreground/70 transition-colors flex-shrink-0" />
                      </div>
                      {showRole && applicant.companyRole && (
                        <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                          {applicant.companyRole}
                        </div>
                      )}
                    </td>

                    {showEmail && (
                      <td className="px-5 py-4">
                        <span className="text-sm text-muted-foreground">{applicant.email}</span>
                      </td>
                    )}

                    {showCompany && (
                      <td className="px-5 py-4">
                        <span className="text-sm text-muted-foreground">{applicant.company || <span className="text-muted-foreground/30">—</span>}</span>
                      </td>
                    )}

                    {showBio && (
                      <td className="px-5 py-4 max-w-[200px]">
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {applicant.bio || <span className="text-muted-foreground/30">—</span>}
                        </span>
                      </td>
                    )}

                    {/* Status */}
                    <td className="px-5 py-4">
                      <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${status.cls}`}>
                        {status.label}
                      </Badge>
                    </td>

                    {/* Submitted date */}
                    <td className="px-5 py-4">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(applicant.submittedAt) ?? <span className="text-muted-foreground/30">—</span>}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!isApproved && !isRejected && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleUpdateStatus(applicant.id, "approved")}
                            disabled={isApproving}
                          >
                            {isApproving ? (
                              "Approving…"
                            ) : (
                              <><Check className="h-3 w-3 mr-1" />Approve</>
                            )}
                          </Button>
                        )}
                        {isApproved && (
                          <span className="text-xs text-success font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" />Approved
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${applicant.id}`}>
                              View application
                            </DropdownMenuItem>
                            {!isApproved && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(applicant.id, "approved")}>
                                Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!isRejected && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleUpdateStatus(applicant.id, "rejected")}
                              >
                                Reject
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
