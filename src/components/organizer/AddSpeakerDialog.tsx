import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSpeaker, emailSpeaker } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Check, Copy, Plus } from "lucide-react";

type Step = "add" | "email";

type Props = {
  eventId?: string;
  eventName?: string;
  emailDefaults?: { fromName: string; fromEmail: string; replyToEmail: string };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DEFAULT_INTRO = (eventName: string) =>
  `We're looking forward to having you speak at ${eventName}!\n\nPlease submit your speaker details using the link below. You'll need to log in or create a free Seamless account — it only takes a minute. We'll use your details to promote your session and create your speaker assets.`;

const DEFAULT_CLOSING = (eventName: string) =>
  `If you have any questions, don't hesitate to get in touch.\n\nBest regards,\nTeam ${eventName}`;

const CTA_LABEL = "Submit your speaker details";

function buildHtml(
  firstName: string,
  intro: string,
  closing: string,
  intakeUrl: string,
  ctaLabel: string,
  fromEmail: string,
  fromName: string,
  replyTo: string,
  toEmail: string,
  subject: string
) {
  const headerMeta = [
    fromName || fromEmail ? `From: ${[fromName, fromEmail ? `<${fromEmail}>` : ""].filter(Boolean).join(" ")}` : null,
    (replyTo || fromEmail) ? `Reply-To: ${replyTo || fromEmail}` : null,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
  ].filter(Boolean).join("\n");

  const introHtml = intro.split("\n\n").map(p =>
    `<p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`
  ).join("");
  const closingHtml = closing.split("\n\n").map(p =>
    `<p style="margin:0 0 12px 0;color:#374151;font-size:15px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`
  ).join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
        <tr><td style="padding:40px 48px">
          <p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6">Hi ${firstName},</p>
          ${introHtml}
          <table cellpadding="0" cellspacing="0" style="margin:32px 0">
            <tr><td>
              <a href="${intakeUrl}" style="display:inline-block;background:#4F46E5;color:#ffffff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:6px;text-decoration:none">${ctaLabel}</a>
            </td></tr>
          </table>
          ${closingHtml}
        </td></tr>
        <tr><td style="padding:16px 48px 24px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;font-size:11px;color:#9ca3af">Powered by <a href="https://seamlessevents.io" style="color:#9ca3af;text-decoration:underline">Seamless Events</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { headerMeta, html };
}

export default function AddSpeakerDialog({ eventId, eventName = "the event", emailDefaults, open: controlledOpen, onOpenChange: controlledOnOpenChange }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) controlledOnOpenChange?.(val);
    else setInternalOpen(val);
  };
  const [step, setStep] = useState<Step>("add");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdSpeakerId, setCreatedSpeakerId] = useState<string | null>(null);

  const [fields, setFields] = useState({ firstName: "", lastName: "", email: "" });
  const [fromName, setFromName] = useState(emailDefaults?.fromName || localStorage.getItem("seamless-email-from-name") || "");
  const [fromEmail, setFromEmail] = useState(emailDefaults?.fromEmail || localStorage.getItem("seamless-email-from-email") || "");
  const [replyTo, setReplyTo] = useState(emailDefaults?.replyToEmail || "");
  const [emailSubject, setEmailSubject] = useState("");
  const [ctaLabel, setCtaLabel] = useState(CTA_LABEL);
  const [introText, setIntroText] = useState("");
  const [closingText, setClosingText] = useState("");

  const intakeUrl = `${window.location.origin}/login?speakerEmail=${encodeURIComponent(fields.email)}`;

  const reset = () => {
    setStep("add");
    setFields({ firstName: "", lastName: "", email: "" });
    setFromName(emailDefaults?.fromName || localStorage.getItem("seamless-email-from-name") || "");
    setFromEmail(emailDefaults?.fromEmail || localStorage.getItem("seamless-email-from-email") || "");
    setReplyTo(emailDefaults?.replyToEmail || "");
    setEmailSubject("");
    setCtaLabel(CTA_LABEL);
    setIntroText("");
    setClosingText("");
    setCreatedSpeakerId(null);
    setCopied(false);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const doCreate = async () => {
    if (!eventId) return null;
    const speakerId = crypto.randomUUID();
    await createSpeaker(eventId, {
      id: speakerId,
      firstName: fields.firstName,
      lastName: fields.lastName,
      email: fields.email,
      formType: "speaker-info",
    });
    queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
    return speakerId;
  };

  const handleSendForm = async () => {
    setCreating(true);
    try {
      const speakerId = await doCreate();
      if (!speakerId) return;
      setCreatedSpeakerId(speakerId);
      setEmailSubject(`Your speaker details for ${eventName}`);
      setIntroText(DEFAULT_INTRO(eventName));
      setClosingText(DEFAULT_CLOSING(eventName));
      setStep("email");
    } catch (err: any) {
      toast({ title: "Failed to add speaker", description: String(err?.message || err) });
    } finally {
      setCreating(false);
    }
  };

  const handleFillMyself = async () => {
    setCreating(true);
    try {
      const speakerId = await doCreate();
      toast({ title: "Speaker added" });
      setOpen(false);
      reset();
      navigate(`/organizer/event/${eventId}/speakers/${speakerId}`, { state: { openEdit: true } });
    } catch (err: any) {
      toast({ title: "Failed to add speaker", description: String(err?.message || err) });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyEmail = async () => {
    const { headerMeta, html } = buildHtml(
      fields.firstName, introText, closingText, intakeUrl, ctaLabel,
      fromEmail, fromName, replyTo, fields.email, emailSubject
    );
    const plain = `${headerMeta}\n\nHi ${fields.firstName},\n\n${introText}\n\n${ctaLabel}:\n${intakeUrl}\n\n${closingText}`;

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendClick = async () => {
    if (!eventId) {
      toast({ title: "Missing event id" });
      return;
    }
    if (!createdSpeakerId) {
      toast({ title: "Missing speaker id" });
      return;
    }

    const { headerMeta, html } = buildHtml(
      fields.firstName, introText, closingText, intakeUrl, ctaLabel,
      fromEmail, fromName, replyTo, fields.email, emailSubject
    );

    const body = {
      recipient_email: fields.email,
      recipient_name: `${fields.firstName} ${fields.lastName}`.trim(),
      subject: emailSubject || `Your speaker details for ${eventName}`,
      html_content: html,
      userName: fromName || fromEmail || `Team ${eventName}`,
      userEmail: fromEmail,
    };

    try {
      await emailSpeaker(eventId, createdSpeakerId, body);
      toast({ title: "Email sent" });
      setOpen(false);
      reset();
    } catch (err: any) {
      toast({ title: "Failed to send email", description: String(err?.message || err) });
    }
  };

const isStep1Valid = fields.firstName.trim() && fields.lastName.trim() && fields.email.trim();

  // Inline field style for Gmail-style header rows
  const headerRowCls = "flex items-center gap-3 border-b border-border/50 py-2";
  const headerLabelCls = "text-xs font-medium text-muted-foreground w-16 shrink-0";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Speaker
        </Button>
      </DialogTrigger>

      <DialogContent className={step === "email" ? "sm:max-w-3xl" : "sm:max-w-lg"}>
        {step === "add" && (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle>Add Speaker</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First name</label>
                  <Input
                    autoFocus
                    value={fields.firstName}
                    onChange={(e) => setFields((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="Jane"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last name</label>
                  <Input
                    value={fields.lastName}
                    onChange={(e) => setFields((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Smith"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={fields.email}
                  onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@company.com"
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Send Intake Form — primary, left */}
                <div className="space-y-2">
                  <Button
                    className="w-full h-10"
                    disabled={!isStep1Valid || creating}
                    onClick={handleSendForm}
                  >
                    {creating ? "Adding…" : "Send Intake Form"}
                  </Button>
                  <p className="text-[11px] text-slate-400 text-center leading-snug px-1">
                    <span className="font-semibold text-slate-500">Recommended.</span> Speaker logs in or creates a free account to submit their details and access their cards.
                  </p>
                </div>
                {/* Fill in myself — secondary, right */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-10"
                    disabled={!isStep1Valid || creating}
                    onClick={handleFillMyself}
                  >
                    {creating ? "Adding…" : "Fill in myself"}
                  </Button>
                  <p className="text-[11px] text-slate-400 text-center leading-snug px-1">
                    You manage their profile on their behalf — no form sent to the speaker.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {step === "email" && (
          <>
            <DialogHeader>
              <DialogTitle>Send intake form to {fields.firstName}</DialogTitle>
            </DialogHeader>

            <div className="space-y-0 pt-1">
              {/* Email header — Gmail-style rows */}
              <div className="rounded-t-lg border border-border bg-muted/20 px-4">
                <div className={headerRowCls}>
                  <span className={headerLabelCls}>From</span>
                  <Input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder={`${eventName} Speaker Team`}
                    className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
                  />
                  <Input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="you@yourorg.com"
                    className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent w-48"
                  />
                </div>
                <div className={headerRowCls}>
                  <span className={headerLabelCls}>Reply-to</span>
                  <Input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder={fromEmail || "defaults to From email"}
                    className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
                  />
                </div>
                <div className={headerRowCls}>
                  <span className={headerLabelCls}>To</span>
                  <span className="text-sm text-foreground">{fields.email}</span>
                </div>
                <div className={`${headerRowCls} border-b-0`}>
                  <span className={headerLabelCls}>Subject</span>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
                  />
                </div>
              </div>

              {/* Email body preview */}
              <div className="rounded-b-lg border border-t-0 border-border bg-white px-8 pt-6 pb-4 space-y-4">
                <p className="text-sm text-gray-700">Hi {fields.firstName || "…"},</p>

                <Textarea
                  value={introText}
                  rows={6}
                  onChange={(e) => {
                    setIntroText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  className="text-sm resize-none overflow-hidden border border-dashed border-border/60 bg-transparent shadow-none leading-relaxed focus-visible:border-primary/40"
                />

                {/* CTA button */}
                <div className="py-1">
                  <span
                    style={{
                      display: "inline-block",
                      background: "#4F46E5",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      padding: "11px 22px",
                      borderRadius: 6,
                      cursor: "default",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ctaLabel || CTA_LABEL}
                  </span>
                </div>

                <Textarea
                  value={closingText}
                  rows={5}
                  onChange={(e) => {
                    setClosingText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  className="text-sm resize-none overflow-hidden border border-dashed border-border/60 bg-transparent shadow-none leading-relaxed focus-visible:border-primary/40"
                />

                {/* Powered by footer */}
                <div className="border-t border-gray-100 pt-3 text-center">
                  <span className="text-[11px] text-gray-400">Powered by <span className="font-medium">Seamless Events</span></span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleCopyEmail}>
                {copied ? (
                  <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</>
                ) : (
                  <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy Email</>
                )}
              </Button>
              <Button onClick={handleSendClick}>
                Send
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
