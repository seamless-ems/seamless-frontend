import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, updateSpeaker, emailSpeaker } from "@/lib/api";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronRight, Copy, FileEdit, MoreVertical } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";

export type EmailDraft = {
  speaker: any;
  subject: string;
  body: string;
  signOff?: string;
  ctaLabel?: string;
  fromName: string;
  fromEmail: string;
  copied: boolean;
};

const EMAIL_HEADER_ROW = "flex items-center gap-3 border-b border-border/50 py-2";
const EMAIL_HEADER_LABEL = "text-xs font-medium text-muted-foreground w-16 shrink-0";

export function buildRejectionEmail(firstName: string, eventName: string) {
  return {
    subject: `Your application to speak at ${eventName}`,
    body: `Thank you for taking the time to apply to speak at ${eventName}.\n\nAfter careful consideration, we're unfortunately unable to offer you a speaking slot on this occasion. \n\nWe hope you'll consider applying again in the future, we'd love to have you involved.\n\nThanks again for your interest, and we hope to see you at ${eventName}.\n\nBest regards,\nTeam ${eventName}`,
  };
}

function buildApprovalEmail(firstName: string, eventName: string) {
  return {
    subject: `You're in! Complete your speaker profile for ${eventName}`,
    body: `Congratulations! We're thrilled to let you know that your application to speak at ${eventName} has been accepted.\n\nComplete your speaker profile using the link below. You can update your details at any time by logging in to Seamless Events.\n\nPlease try to complete this as soon as possible so we can promote your session.\n\nIf you have any questions, don't hesitate to get in touch.`,
    signOff: `Best regards,\nTeam ${eventName}`,
    ctaLabel: "Complete your speaker profile",
  };
}

export function buildEmailHtml(firstName: string, body: string, intakeUrl: string, ctaLabel: string | undefined, signOff?: string) {
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
          <p style="margin:0;font-size:11px;color:#9ca3af">Powered by <a href="https://seamlessevents.io" style="color:#9ca3af;text-decoration:underline">Seamless Events</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function resolveAppStatus(speaker: any) {
  const s = speaker.callForSpeakersStatus ?? speaker.call_for_speakers_status ?? "pending";
  if (s === "approved")  return { label: "Approved",  cls: "bg-transparent text-foreground border-success/50" };
  if (s === "rejected")  return { label: "Rejected",  cls: "bg-transparent text-foreground border-destructive/40" };
  if (s === "submitted") return { label: "Submitted", cls: "bg-transparent text-foreground border-blue-500/40" };
  return                        { label: "Pending",   cls: "bg-transparent text-foreground border-warning/50" };
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

export function EmailComposer({
  draft,
  title,
  intakeUrl,
  onClose,
  onDraftChange,
  onSend,
}: {
  draft: EmailDraft;
  title: string;
  intakeUrl?: string;
  onClose: () => void;
  onDraftChange: (patch: Partial<EmailDraft>) => void;
  onSend?: () => Promise<void>;
}) {
  const [sending, setSending] = useState(false);

  const handleCopy = async () => {
    const html = buildEmailHtml(draft.speaker.firstName, draft.body, intakeUrl ?? "", draft.ctaLabel, draft.signOff);
    const from = [draft.fromName, draft.fromEmail ? `<${draft.fromEmail}>` : ""].filter(Boolean).join(" ");
    const ctaLine = draft.ctaLabel && intakeUrl ? `\n\n${draft.ctaLabel}:\n${intakeUrl}` : "";
    const plain = `${from ? `From: ${from}\n` : ""}To: ${draft.speaker.email}\nSubject: ${draft.subject}\n\nHi ${draft.speaker.firstName},\n\n${draft.body}${ctaLine}${draft.signOff ? `\n\n${draft.signOff}` : ""}`;
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
    onDraftChange({ copied: true });
    setTimeout(() => onDraftChange({ copied: false }), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 space-y-0 pt-1">
          <div className="rounded-t-lg border border-border bg-muted/20 px-4">
            <div className={EMAIL_HEADER_ROW}>
              <span className={EMAIL_HEADER_LABEL}>From</span>
              <Input
                value={draft.fromName}
                onChange={(e) => { localStorage.setItem("seamless-email-from-name", e.target.value); onDraftChange({ fromName: e.target.value }); }}
                placeholder="Your name or team"
                className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
              />
            </div>
            <div className={EMAIL_HEADER_ROW}>
              <span className={EMAIL_HEADER_LABEL}>Email</span>
              <Input
                type="email"
                value={draft.fromEmail}
                onChange={(e) => { localStorage.setItem("seamless-email-from-email", e.target.value); onDraftChange({ fromEmail: e.target.value }); }}
                placeholder="you@yourorg.com"
                className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
              />
            </div>
            <div className={EMAIL_HEADER_ROW}>
              <span className={EMAIL_HEADER_LABEL}>To</span>
              <span className="text-sm text-foreground">{draft.speaker.email}</span>
            </div>
            <div className={`${EMAIL_HEADER_ROW} border-b-0`}>
              <span className={EMAIL_HEADER_LABEL}>Subject</span>
              <Input
                value={draft.subject}
                onChange={(e) => onDraftChange({ subject: e.target.value })}
                className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
              />
            </div>
          </div>
          <div className="rounded-b-lg border border-t-0 border-border bg-white px-8 pt-5 pb-4 space-y-3">
            <p className="text-sm text-gray-700">Hi {draft.speaker.firstName},</p>
            <Textarea
              value={draft.body}
              rows={1}
              ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
              onChange={(e) => {
                onDraftChange({ body: e.target.value });
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
              }}
              className="text-sm resize-none overflow-hidden border border-slate-200 bg-transparent shadow-none leading-relaxed focus-visible:border-accent/40"
            />
            {draft.ctaLabel && intakeUrl && (
              <div>
                <span style={{ display: "inline-block", background: "#4F46E5", color: "#fff", fontSize: 14, fontWeight: 600, padding: "11px 22px", borderRadius: 6, cursor: "default" }}>
                  {draft.ctaLabel}
                </span>
              </div>
            )}
            {draft.signOff !== undefined && (
              <Textarea
                value={draft.signOff}
                rows={1}
                ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                onChange={(e) => {
                  onDraftChange({ signOff: e.target.value });
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                }}
                className="text-sm resize-none overflow-hidden border border-slate-200 bg-transparent shadow-none leading-relaxed focus-visible:border-accent/40"
              />
            )}
            <div className="border-t border-gray-100 pt-3 text-center">
              <span className="text-[11px] text-gray-400">Powered by <span className="font-medium">Seamless Events</span></span>
            </div>
          </div>
        </div>
          <div className="flex gap-2 pt-1 shrink-0">
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            {draft.copied ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy Email</>}
          </Button>
          {!draft.ctaLabel && (
            <Button variant="outline" onClick={onClose}>Skip</Button>
          )}
          <Button
            onClick={async () => {
              if (!onSend) {
                onClose();
                return;
              }
              try {
                setSending(true);
                await onSend();
              } finally {
                setSending(false);
              }
            }}
            disabled={sending}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
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

  const [approvalEmail, setApprovalEmail] = useState<EmailDraft | null>(null);
  const [rejectionEmail, setRejectionEmail] = useState<EmailDraft | null>(null);

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
        // move to speaker-info on approval so they show up in Speakers tab; keep as call-for-speakers on rejection so they stay in Applications with their status
        formType: status === "approved" ? "speaker-info" : "call-for-speakers",
        callForSpeakersStatus: status,
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
      toast({
        title: "Failed to update status",
        description: err?.message || err?.responseText || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleSendEmail = async (draft: EmailDraft | null, intakeUrl?: string) => {
    if (!draft) return;
    try {
      const html = buildEmailHtml(draft.speaker.firstName ?? draft.speaker.name ?? "", draft.body, intakeUrl ?? "", draft.ctaLabel, draft.signOff);
      const payload = {
        recipientEmail: draft.speaker.email,
        recipientName: draft.speaker.firstName ?? draft.speaker.name ?? "",
        subject: draft.subject,
        htmlContent: html,
        userName: draft.fromName || "",
        userEmail: draft.fromEmail || "",
      };
      await emailSpeaker(eventId!, draft.speaker.id, payload);
      toast({ title: "Email sent", description: `Message sent to ${payload.recipientEmail}` });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "applications"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
    } catch (err: any) {
      toast({
        title: "Failed to send email",
        description: err?.message || err?.responseText || "Unknown error",
        variant: "destructive",
      });
      throw err;
      }
    };

  return (
    <div className="pt-6">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full table-fixed">
          <colgroup>
            <col />
            <col style={{ width: '110px' }} />
            <col style={{ width: '270px' }} />
          </colgroup>
          <thead className="border-b border-border bg-muted/20">
            <tr className="h-11">
              <th className="px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Search applicants…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[160px] h-7 text-sm"
                  />
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger className="w-[130px] h-7 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All <span className="text-muted-foreground ml-1">{counts.all}</span></SelectItem>
                      <SelectItem value="submitted">Submitted <span className="text-muted-foreground ml-1">{counts.submitted}</span></SelectItem>
                      <SelectItem value="pending">Pending <span className="text-muted-foreground ml-1">{counts.pending}</span></SelectItem>
                      <SelectItem value="approved">Approved <span className="text-muted-foreground ml-1">{counts.approved}</span></SelectItem>
                      <SelectItem value="rejected">Rejected <span className="text-muted-foreground ml-1">{counts.rejected}</span></SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="h-3.5 w-px bg-border shrink-0" />
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 bg-muted/50 hover:bg-muted text-foreground hover:text-foreground whitespace-nowrap" onClick={onEditForm}>
                    <FileEdit className="h-3.5 w-3.5" />Edit Application Form
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 bg-muted/50 hover:bg-muted text-foreground hover:text-foreground whitespace-nowrap" onClick={onCopyFormLink}>
                    {copiedLink ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy Application Form</>}
                  </Button>
                </div>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Submitted</th>
              <th className="px-4 py-2 text-right">
                <HelpTip title="Call for Speakers" side="bottom" align="end" compact>
                  <p>Share the form link so speakers can apply. Approve to move them to your <span className="font-medium text-foreground">Speakers</span> tab; reject to dismiss.</p>
                </HelpTip>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="py-12 text-center text-sm text-muted-foreground">Loading applications…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                {allApplications.length === 0 ? "No applications yet" : "No applications match your filters"}
              </td></tr>
            ) : filtered.map((applicant) => {
              const status = resolveAppStatus(applicant);
              const isApproved = applicant.callForSpeakersStatus === "approved";
              const isRejected = applicant.callForSpeakersStatus === "rejected";
              const isApproving = approvingId === applicant.id;
              const subtitle = [applicant.companyRole, applicant.company].filter(Boolean).join(" · ");

              return (
                <tr
                  key={applicant.id}
                  className="border-b border-border hover:bg-muted/40 transition-colors group cursor-pointer"
                  onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${applicant.id}`}
                >
                  {/* Name + avatar + role · company */}
                  <td className="pl-4 pr-3 py-3 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      {applicant.avatarUrl ? (
                        <img src={applicant.avatarUrl} alt="" className="h-7 w-7 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                          {(applicant.name || "S")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center">
                          <span className="text-sm font-semibold text-foreground leading-tight truncate">{applicant.name}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/70 transition-colors ml-0.5 shrink-0" />
                        </div>
                        {subtitle && (
                          <div className="text-xs text-muted-foreground mt-0.5 leading-tight truncate">{subtitle}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Submitted date */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(applicant.submittedAt) ?? <span className="text-muted-foreground/30">—</span>}
                    </span>
                  </td>

                  {/* Status + Actions merged */}
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {(isApproved || isRejected) && (
                        <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${status.cls}`}>
                          {status.label}
                        </Badge>
                      )}
                      {!isApproved && !isRejected && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive whitespace-nowrap"
                            onClick={() => handleUpdateStatus(applicant, "rejected")}
                            disabled={isApproving}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs whitespace-nowrap"
                            onClick={() => handleUpdateStatus(applicant, "approved")}
                            disabled={isApproving}
                          >
                            {isApproving ? "…" : <><Check className="h-3 w-3 mr-1" />Approve</>}
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${applicant.id}`}>
                            View application
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!isApproved && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(applicant, "approved")}>
                              Approve
                            </DropdownMenuItem>
                          )}
                          {!isRejected && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleUpdateStatus(applicant, "rejected")}>
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
      </div>

      {approvalEmail && (
        <EmailComposer
          draft={approvalEmail}
          title={`Send congratulations to ${approvalEmail.speaker.firstName}`}
          intakeUrl={`${window.location.origin}/login`}
          onClose={() => setApprovalEmail(null)}
          onDraftChange={(patch) => setApprovalEmail(e => e ? { ...e, ...patch } : null)}
          onSend={async () => { await handleSendEmail(approvalEmail, `${window.location.origin}/login`); setApprovalEmail(null); }}
        />
      )}

      {rejectionEmail && (
        <EmailComposer
          draft={rejectionEmail}
          title={`Let ${rejectionEmail.speaker.firstName} know`}
          onClose={() => setRejectionEmail(null)}
          onDraftChange={(patch) => setRejectionEmail(e => e ? { ...e, ...patch } : null)}
          onSend={async () => { await handleSendEmail(rejectionEmail); setRejectionEmail(null); }}
        />
      )}
    </div>
  );
}
