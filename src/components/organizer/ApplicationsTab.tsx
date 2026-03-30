import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, getFormConfigForEvent, updateSpeaker } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Check, ChevronRight, Copy, FileEdit, MoreVertical, Search, Share2 } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";

function buildRejectionEmail(firstName: string, eventName: string) {
  return {
    subject: `Your application to speak at ${eventName}`,
    body: `Thank you for taking the time to apply to speak at ${eventName}.\n\nAfter careful consideration, we're unfortunately unable to offer you a speaking slot on this occasion. We had a high volume of applications and the decision was a difficult one.\n\nWe hope you'll consider applying again in the future — we'd love to have you involved.\n\nThanks again for your interest, and we hope to see you at ${eventName}.\n\nBest regards,\nTeam ${eventName}`,
  };
}

function buildApprovalEmail(firstName: string, eventName: string) {
  return {
    subject: `You're in! Complete your speaker profile for ${eventName}`,
    body: `Congratulations! We're thrilled to let you know that your application to speak at ${eventName} has been accepted.\n\nTo get started, please complete your speaker profile using the link below. You'll need to log in or create a free Seamless account — this is where you'll manage your profile, view your speaker cards, and update your details.\n\nPlease try to complete this as soon as possible so we can promote your session.\n\nIf you have any questions, don't hesitate to get in touch.`,
    signOff: `Best regards,\nTeam ${eventName}`,
    ctaLabel: "Complete your speaker profile",
  };
}

function buildEmailHtml(firstName: string, body: string, intakeUrl: string, ctaLabel: string | undefined, signOff?: string) {
  const bodyHtml = body.split("\n\n").map(p =>
    `<p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`
  ).join("");
  const btnHtml = ctaLabel && intakeUrl
    ? `<table cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td><a href="${intakeUrl}" style="display:inline-block;background:#4F46E5;color:#fff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:6px;text-decoration:none">${ctaLabel}</a></td></tr></table>`
    : "";
  const signOffHtml = signOff
    ? signOff.split("\n\n").map(p =>
        `<p style="margin:0 0 12px 0;color:#374151;font-size:15px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`
      ).join("")
    : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border:1px solid #e5e7eb">
        <tr><td style="padding:40px 48px">
          <p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6">Hi ${firstName},</p>
          ${bodyHtml}${btnHtml}${signOffHtml}
        </td></tr>
        <tr><td style="padding:16px 48px 24px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;font-size:11px;color:#9ca3af">Powered by <a href="https://seamlessevents.ai" style="color:#9ca3af;text-decoration:underline">Seamless Events</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

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

export default function ApplicationsTab({ eventId, eventName = "", emailDefaults, onEditForm, onCopyFormLink, copiedLink }: {
  eventId: string | undefined;
  eventName?: string;
  emailDefaults?: { fromName: string; fromEmail: string; replyToEmail: string };
  onEditForm?: () => void;
  onCopyFormLink?: () => void;
  copiedLink?: boolean;
}) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "submitted" | "approved" | "rejected">("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  type EmailDraft = {
    speaker: any;
    subject: string;
    body: string;
    signOff?: string;
    ctaLabel?: string;
    fromName: string;
    fromEmail: string;
    copied: boolean;
  };
  const [approvalEmail, setApprovalEmail] = useState<EmailDraft | null>(null);
  const [rejectionEmail, setRejectionEmail] = useState<EmailDraft | null>(null);

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
  const fieldEnabled = (fieldId: string) => {
    if (!formConfig) return true; // no form config -> show field by default
    // Normalize unexpected shapes (defensive): prefer array, otherwise try .fields
    const cfgArray = Array.isArray(formConfig)
      ? formConfig
      : (Array.isArray((formConfig as any).fields) ? (formConfig as any).fields : null);
    if (!cfgArray) return true; // unknown shape -> show field
    return cfgArray.some((f: any) => f.id === fieldId && f.enabled);
  };

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

  const handleUpdateStatus = async (speaker: any, status: "approved" | "rejected") => {
    if (status === "approved") setApprovingId(speaker.id);
    try {
      // Backend requires all fields on PATCH — include required fields alongside status
      await updateSpeaker(eventId!, speaker.id, {
        id: speaker.id,
        firstName: speaker.firstName,
        lastName: speaker.lastName,
        email: speaker.email,
        formType: "call-for-speakers",
        call_for_speakers_status: status,
      });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
      const savedFromName = emailDefaults?.fromName || localStorage.getItem("seamless-email-from-name") || "";
      const savedFromEmail = emailDefaults?.fromEmail || localStorage.getItem("seamless-email-from-email") || "";
      if (status === "approved") {
        const tpl = buildApprovalEmail(speaker.firstName, eventName);
        setApprovalEmail({
          speaker,
          subject: tpl.subject,
          body: tpl.body,
          signOff: tpl.signOff,
          ctaLabel: tpl.ctaLabel,
          fromName: savedFromName,
          fromEmail: savedFromEmail,
          copied: false,
        });
      } else {
        const tpl = buildRejectionEmail(speaker.firstName, eventName);
        setRejectionEmail({
          speaker,
          subject: tpl.subject,
          body: tpl.body,
          fromName: savedFromName,
          fromEmail: savedFromEmail,
          copied: false,
        });
      }
    } catch (err: any) {
      console.error("updateSpeaker error:", err);
      toast({
        title: "Failed to update status",
        description: err?.message || err?.responseText || "Unknown error",
        variant: "destructive",
      });
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
      {/* Single header row: search + filters left, actions right */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search applicants…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm w-[180px]"
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
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onEditForm}>
            <FileEdit className="h-3.5 w-3.5" />Edit Application Form
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onCopyFormLink}>
            {copiedLink ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy Link</>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              const url = `${window.location.origin}/call-for-speakers/${eventId}`;
              if (navigator.share) {
                try { await navigator.share({ title: "Call for Speakers", url }); } catch {}
              } else {
                await navigator.clipboard.writeText(url);
                toast({ title: "Application link copied" });
              }
            }}
          >
            <Share2 className="h-3.5 w-3.5" />Share
          </Button>
          <HelpTip title="Call for Speakers" side="bottom" align="end">
            <p>Share the form link so speakers can apply. Approve to move them to your <span className="font-medium text-foreground">Speakers</span> tab; reject to dismiss (optional rejection email included).</p>
          </HelpTip>
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
            <thead className="border-b border-border bg-secondary/30">
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
                        {isApproved && (
                          <span className="text-xs text-success font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" />Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-xs text-destructive font-medium">Rejected</span>
                        )}
                        {!isApproved && !isRejected && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleUpdateStatus(applicant, "rejected")}
                              disabled={isApproving}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleUpdateStatus(applicant, "approved")}
                              disabled={isApproving}
                            >
                              {isApproving ? "Approving…" : <><Check className="h-3 w-3 mr-1" />Approve</>}
                            </Button>
                          </>
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
                            {!isApproved && <DropdownMenuSeparator />}
                            {isApproved && (
                              <DropdownMenuItem className="text-destructive" onClick={() => handleUpdateStatus(applicant, "rejected")}>
                                Reject
                              </DropdownMenuItem>
                            )}
                            {isRejected && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(applicant, "approved")}>
                                Approve
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

      {/* Approval email dialog */}
      {approvalEmail && (() => {
        const intakeUrl = `${window.location.origin}/speaker-intake/${eventId}`;
        const headerRowCls = "flex items-center gap-3 border-b border-border/50 py-2";
        const headerLabelCls = "text-xs font-medium text-muted-foreground w-16 shrink-0";

        const handleCopy = async () => {
          const html = buildEmailHtml(approvalEmail.speaker.firstName, approvalEmail.body, intakeUrl, approvalEmail.ctaLabel, approvalEmail.signOff);
          const from = [approvalEmail.fromName, approvalEmail.fromEmail ? `<${approvalEmail.fromEmail}>` : ""].filter(Boolean).join(" ");
          const plain = `${from ? `From: ${from}\n` : ""}To: ${approvalEmail.speaker.email}\nSubject: ${approvalEmail.subject}\n\nHi ${approvalEmail.speaker.firstName},\n\n${approvalEmail.body}\n\n${approvalEmail.ctaLabel}:\n${intakeUrl}${approvalEmail.signOff ? `\n\n${approvalEmail.signOff}` : ""}`;
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([plain], { type: "text/plain" }),
              }),
            ]);
          } catch {
            await navigator.clipboard.writeText(plain);
          }
          setApprovalEmail((e) => e ? { ...e, copied: true } : null);
          setTimeout(() => setApprovalEmail((e) => e ? { ...e, copied: false } : null), 2000);
        };

        return (
          <Dialog open onOpenChange={() => setApprovalEmail(null)}>
            <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
              <DialogHeader className="shrink-0">
                <DialogTitle>Send congratulations to {approvalEmail.speaker.firstName}</DialogTitle>
              </DialogHeader>

              <div className="overflow-y-auto flex-1 space-y-0 pt-1">
                {/* Email header */}
                <div className="rounded-t-lg border border-border bg-muted/20 px-4">
                  <div className={headerRowCls}>
                    <span className={headerLabelCls}>From</span>
                    <Input
                      value={approvalEmail.fromName}
                      onChange={(e) => { localStorage.setItem("seamless-email-from-name", e.target.value); setApprovalEmail((s) => s ? { ...s, fromName: e.target.value } : null); }}
                      placeholder="Your name or team"
                      className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
                    />
                    <Input
                      type="email"
                      value={approvalEmail.fromEmail}
                      onChange={(e) => { localStorage.setItem("seamless-email-from-email", e.target.value); setApprovalEmail((s) => s ? { ...s, fromEmail: e.target.value } : null); }}
                      placeholder="you@yourorg.com"
                      className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent w-48"
                    />
                  </div>
                  <div className={headerRowCls}>
                    <span className={headerLabelCls}>To</span>
                    <span className="text-sm text-foreground">{approvalEmail.speaker.email}</span>
                  </div>
                  <div className={`${headerRowCls} border-b-0`}>
                    <span className={headerLabelCls}>Subject</span>
                    <Input
                      value={approvalEmail.subject}
                      onChange={(e) => setApprovalEmail((s) => s ? { ...s, subject: e.target.value } : null)}
                      className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
                    />
                  </div>
                </div>

                {/* Email body */}
                <div className="rounded-b-lg border border-t-0 border-border bg-white px-8 pt-6 pb-4 space-y-4">
                  <p className="text-sm text-gray-700">Hi {approvalEmail.speaker.firstName},</p>

                  <Textarea
                    value={approvalEmail.body}
                    rows={10}
                    onChange={(e) => {
                      setApprovalEmail((s) => s ? { ...s, body: e.target.value } : null);
                      e.currentTarget.style.height = "auto";
                      e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                    }}
                    className="text-sm resize-none overflow-hidden border border-dashed border-border/60 bg-transparent shadow-none leading-relaxed focus-visible:border-primary/40"
                  />

                  <div className="py-1">
                    <span style={{ display: "inline-block", background: "#4F46E5", color: "#fff", fontSize: 14, fontWeight: 600, padding: "11px 22px", borderRadius: 6, cursor: "default" }}>
                      {approvalEmail.ctaLabel}
                    </span>
                  </div>

                  {approvalEmail.signOff !== undefined && (
                    <Textarea
                      value={approvalEmail.signOff}
                      rows={2}
                      onChange={(e) => {
                        setApprovalEmail((s) => s ? { ...s, signOff: e.target.value } : null);
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                      }}
                      className="text-sm resize-none overflow-hidden border border-dashed border-border/60 bg-transparent shadow-none leading-relaxed focus-visible:border-primary/40"
                    />
                  )}

                  <div className="border-t border-gray-100 pt-3 text-center">
                    <span className="text-[11px] text-gray-400">Powered by <span className="font-medium">Seamless Events</span></span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1 shrink-0">
                <Button variant="outline" className="flex-1" onClick={handleCopy}>
                  {approvalEmail.copied
                    ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</>
                    : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy Email</>}
                </Button>
                <Button onClick={() => setApprovalEmail(null)}>Send</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Rejection email dialog */}
      {rejectionEmail && (() => {
        const headerRowCls = "flex items-center gap-3 border-b border-border/50 py-2";
        const headerLabelCls = "text-xs font-medium text-muted-foreground w-16 shrink-0";

        const handleCopy = async () => {
          const html = buildEmailHtml(rejectionEmail.speaker.firstName, rejectionEmail.body, "", undefined);
          const from = [rejectionEmail.fromName, rejectionEmail.fromEmail ? `<${rejectionEmail.fromEmail}>` : ""].filter(Boolean).join(" ");
          const plain = `${from ? `From: ${from}\n` : ""}To: ${rejectionEmail.speaker.email}\nSubject: ${rejectionEmail.subject}\n\nHi ${rejectionEmail.speaker.firstName},\n\n${rejectionEmail.body}`;
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([plain], { type: "text/plain" }),
              }),
            ]);
          } catch {
            await navigator.clipboard.writeText(plain);
          }
          setRejectionEmail((e) => e ? { ...e, copied: true } : null);
          setTimeout(() => setRejectionEmail((e) => e ? { ...e, copied: false } : null), 2000);
        };

        return (
          <Dialog open onOpenChange={() => setRejectionEmail(null)}>
            <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
              <DialogHeader className="shrink-0">
                <DialogTitle>Let {rejectionEmail.speaker.firstName} know</DialogTitle>
              </DialogHeader>

              <div className="overflow-y-auto flex-1 space-y-0 pt-1">
                <div className="rounded-t-lg border border-border bg-muted/20 px-4">
                  <div className={headerRowCls}>
                    <span className={headerLabelCls}>From</span>
                    <Input
                      value={rejectionEmail.fromName}
                      onChange={(e) => { localStorage.setItem("seamless-email-from-name", e.target.value); setRejectionEmail((s) => s ? { ...s, fromName: e.target.value } : null); }}
                      placeholder="Your name or team"
                      className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
                    />
                    <Input
                      type="email"
                      value={rejectionEmail.fromEmail}
                      onChange={(e) => { localStorage.setItem("seamless-email-from-email", e.target.value); setRejectionEmail((s) => s ? { ...s, fromEmail: e.target.value } : null); }}
                      placeholder="you@yourorg.com"
                      className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent w-48"
                    />
                  </div>
                  <div className={headerRowCls}>
                    <span className={headerLabelCls}>To</span>
                    <span className="text-sm text-foreground">{rejectionEmail.speaker.email}</span>
                  </div>
                  <div className={`${headerRowCls} border-b-0`}>
                    <span className={headerLabelCls}>Subject</span>
                    <Input
                      value={rejectionEmail.subject}
                      onChange={(e) => setRejectionEmail((s) => s ? { ...s, subject: e.target.value } : null)}
                      className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
                    />
                  </div>
                </div>

                <div className="rounded-b-lg border border-t-0 border-border bg-white px-8 pt-6 pb-4 space-y-4">
                  <p className="text-sm text-gray-700">Hi {rejectionEmail.speaker.firstName},</p>
                  <Textarea
                    value={rejectionEmail.body}
                    rows={10}
                    onChange={(e) => {
                      setRejectionEmail((s) => s ? { ...s, body: e.target.value } : null);
                      e.currentTarget.style.height = "auto";
                      e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                    }}
                    className="text-sm resize-none overflow-hidden border border-dashed border-border/60 bg-transparent shadow-none leading-relaxed focus-visible:border-primary/40"
                  />
                  <div className="border-t border-gray-100 pt-3 text-center">
                    <span className="text-[11px] text-gray-400">Powered by <span className="font-medium">Seamless Events</span></span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1 shrink-0">
                <Button variant="outline" className="flex-1" onClick={handleCopy}>
                  {rejectionEmail.copied
                    ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</>
                    : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy Email</>}
                </Button>
                <Button variant="outline" onClick={() => setRejectionEmail(null)}>Skip</Button>
                <Button onClick={() => setRejectionEmail(null)}>Send</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
