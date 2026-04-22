import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSpeaker, emailSpeaker, checkSpeakerExistsForEvent } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Check, Copy, Mail, Plus, ClipboardList } from "lucide-react";

type Step = "choose" | "add" | "email";

type Props = {
  eventId?: string;
  eventName?: string;
  emailDefaults?: { fromName: string; fromEmail: string; replyToEmail: string };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DEFAULT_INTRO = (eventName: string) =>
  `We're looking forward to having you speak at ${eventName}!\n\nPlease submit your speaker details using the link below. After submitting, you can log in to Seamless Events to update your profile and manage your content.`;

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
  const [step, setStep] = useState<Step>("choose");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdSpeakerId, setCreatedSpeakerId] = useState<string | null>(null);
  const [isCheckingExistingEmail, setIsCheckingExistingEmail] = useState(false);
  const [emailExistsForEvent, setEmailExistsForEvent] = useState(false);
  const [existingSpeakerId, setExistingSpeakerId] = useState<string | null>(null);
  const emailCheckTimeoutRef = useRef<number | null>(null);
  const emailCheckRequestRef = useRef(0);

  const [fields, setFields] = useState({ firstName: "", lastName: "", email: "" });
  const [fromName, setFromName] = useState(emailDefaults?.fromName || localStorage.getItem("seamless-email-from-name") || "");
  const [fromEmail, setFromEmail] = useState(emailDefaults?.fromEmail || localStorage.getItem("seamless-email-from-email") || "");
  const [replyTo, setReplyTo] = useState(emailDefaults?.replyToEmail || "");
  const [emailSubject, setEmailSubject] = useState("");
  const [ctaLabel] = useState(CTA_LABEL);
  const [introText, setIntroText] = useState("");
  const [closingText, setClosingText] = useState("");

  const intakeUrl = createdSpeakerId
    ? `${window.location.origin}/speaker-intake/${eventId}?speakerId=${createdSpeakerId}`
    : `${window.location.origin}/speaker-intake/${eventId}`;

  const reset = () => {
    setStep("choose");
    setFields({ firstName: "", lastName: "", email: "" });
    setFromName(emailDefaults?.fromName || localStorage.getItem("seamless-email-from-name") || "");
    setFromEmail(emailDefaults?.fromEmail || localStorage.getItem("seamless-email-from-email") || "");
    setReplyTo(emailDefaults?.replyToEmail || "");
    setEmailSubject("");
    setIntroText("");
    setClosingText("");
    setCreatedSpeakerId(null);
    setIsCheckingExistingEmail(false);
    setEmailExistsForEvent(false);
    setExistingSpeakerId(null);
    setCopied(false);
  };

  useEffect(() => {
    return () => {
      if (emailCheckTimeoutRef.current) window.clearTimeout(emailCheckTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== "add" || !eventId) {
      emailCheckRequestRef.current += 1;
      setIsCheckingExistingEmail(false);
      setEmailExistsForEvent(false);
      setExistingSpeakerId(null);
      return;
    }

    const email = fields.email.trim().toLowerCase();
    const isValidEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

    if (!email || !isValidEmail) {
      emailCheckRequestRef.current += 1;
      setIsCheckingExistingEmail(false);
      setEmailExistsForEvent(false);
      setExistingSpeakerId(null);
      if (emailCheckTimeoutRef.current) window.clearTimeout(emailCheckTimeoutRef.current);
      return;
    }

    if (emailCheckTimeoutRef.current) window.clearTimeout(emailCheckTimeoutRef.current);

    setIsCheckingExistingEmail(true);
    const requestId = emailCheckRequestRef.current + 1;
    emailCheckRequestRef.current = requestId;

    emailCheckTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await checkSpeakerExistsForEvent(eventId, email);
        if (requestId !== emailCheckRequestRef.current) return;
        setEmailExistsForEvent(Boolean(res?.exists));
        setExistingSpeakerId(res?.exists ? (res.speakerId ?? null) : null);
      } catch {
        if (requestId !== emailCheckRequestRef.current) return;
        setEmailExistsForEvent(false);
        setExistingSpeakerId(null);
      } finally {
        if (requestId === emailCheckRequestRef.current) setIsCheckingExistingEmail(false);
      }
    }, 600);
  }, [step, eventId, fields.email]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const doCreate = async () => {
    if (!eventId) return null;
    const email = fields.email.trim().toLowerCase();
    if (email) {
      const res = await checkSpeakerExistsForEvent(eventId, email);
      if (res?.exists) {
        setEmailExistsForEvent(true);
        setExistingSpeakerId(res.speakerId ?? null);
        return null;
      }
    }

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

  const headerRowCls = "flex items-center gap-3 border-b border-border/50 py-2";
  const headerLabelCls = "text-xs font-medium text-muted-foreground w-16 shrink-0";

  const dialogWidth = step === "email" ? "sm:max-w-3xl" : step === "add" ? "sm:max-w-2xl" : "sm:max-w-2xl";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 bg-muted/50 hover:bg-muted text-foreground hover:text-foreground">
          <Plus className="h-4 w-4" />
          Add Speaker
        </Button>
      </DialogTrigger>

      <DialogContent className={dialogWidth}>

        {/* Step 1: Choose route */}
        {step === "choose" && (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle>Add Speaker</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Send to Speaker */}
              <button
                onClick={() => setStep("add")}
                className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-5 text-left hover:border-primary hover:shadow-sm transition-all"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                  <Mail className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Send to Speaker</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-block mb-2">Recommended</span>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Share the form link. When they submit, an account is created automatically so they can log in to edit their profile and upload content.
                  </p>
                </div>
              </button>

              {/* Fill in myself */}
              <button
                onClick={() => {
                  setOpen(false);
                  reset();
                  navigate(`/speaker-intake/${eventId}`);
                }}
                className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-5 text-left hover:border-primary hover:shadow-sm transition-all"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <ClipboardList className="h-4.5 w-4.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Fill in myself</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-transparent bg-transparent px-1.5 py-0.5 rounded inline-block mb-2">Placeholder</span>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Fill in their intake form on their behalf.
                  </p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Step 2: Name / email entry (send-to-speaker path) */}
        {step === "add" && (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle>Send to Speaker</DialogTitle>
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
                {isCheckingExistingEmail && (
                  <p className="text-xs text-muted-foreground">Checking for existing speaker…</p>
                )}
                {!isCheckingExistingEmail && emailExistsForEvent && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 space-y-2">
                    <p className="text-xs text-destructive">A speaker with this email already exists for this event.</p>
                    {existingSpeakerId && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-destructive"
                        onClick={() => {
                          setOpen(false);
                          reset();
                          navigate(`/organizer/event/${eventId}/speakers/${existingSpeakerId}`);
                        }}
                      >
                        Open existing speaker portal
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setStep("choose")}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!isStep1Valid || creating || isCheckingExistingEmail || emailExistsForEvent}
                  onClick={handleSendForm}
                >
                  {creating ? "Adding…" : "Next — Compose Email"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Email compose */}
        {step === "email" && (
          <>
            <DialogHeader>
              <DialogTitle>Send intake form to {fields.firstName}</DialogTitle>
            </DialogHeader>

            <div className="space-y-0">
              <div className="rounded-t-lg border border-border bg-muted/20 px-4">
                <div className={headerRowCls}>
                  <span className={headerLabelCls}>From name</span>
                  <Input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder={`${eventName} Speaker Team`}
                    className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
                  />
                </div>
                <div className={headerRowCls}>
                  <span className={headerLabelCls}>From email</span>
                  <Input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="you@yourorg.com"
                    className="h-8 text-sm border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent flex-1"
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

              <div className="rounded-b-lg border border-t-0 border-border bg-white px-8 pt-5 pb-4 space-y-3">
                <p className="text-sm text-gray-700">Hi {fields.firstName || "…"},</p>

                <Textarea
                  value={introText}
                  rows={1}
                  ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                  onChange={(e) => {
                    setIntroText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  className="text-sm resize-none overflow-hidden border border-slate-200 bg-transparent shadow-none leading-relaxed focus-visible:border-primary/40"
                />

                <div>
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
                    {ctaLabel}
                  </span>
                </div>

                <Textarea
                  value={closingText}
                  rows={1}
                  ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                  onChange={(e) => {
                    setClosingText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  className="text-sm resize-none overflow-hidden border border-slate-200 bg-transparent shadow-none leading-relaxed focus-visible:border-primary/40"
                />

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
