import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, Copy, Download, Edit, X } from "lucide-react";
import { Speaker } from "@/types/event";
import { getJson, updateSpeaker, uploadFile, getFormConfigForEvent, emailSpeaker } from "@/lib/api";
import { EmailDraft, EmailComposer, buildRejectionEmail, buildEmailHtml } from "@/components/organizer/ApplicationsTab";
import { useEventAccess } from '@/contexts/EventAccessContext';
import { ImageCropDialog } from "@/components/ImageCropDialog";
import SpeakerForm from "@/components/SpeakerForm";
import SpeakerCardTab from "@/components/organizer/SpeakerCardTab";
import SpeakerContentTab from "@/components/organizer/SpeakerContentTab";
import { toast } from "@/hooks/use-toast";

type Props = {
  eventId?: string | null;
  speakerId?: string | null;
  initialOpenEdit?: boolean;
};

export default function SpeakerPortalComponent({ eventId, speakerId, initialOpenEdit }: Props) {
  const params = useParams();
  const id = eventId ?? params.id ?? null;
  const spkId = speakerId ?? params.speakerId ?? null;
  const navigate = useNavigate();
  const location = useLocation();

  // support both organizer and speaker-facing routes
  const isSpeakerView = location.pathname.split('/')[1] === 'speaker';
  const isOrganizerView = location.pathname.includes('/organizer');
  const baseSpeakerPath = isSpeakerView ? `/speaker/${spkId}/event/${id}` : `/organizer/event/${id}/speakers/${spkId}`;
  const backPath = isSpeakerView ? `/` : `/organizer/event/${id}/speakers`;

  const activeTab = location.pathname.endsWith('/speaker-card') ? 'speaker-card'
    : location.pathname.endsWith('/social-card') ? 'social-card'
    : 'info';

  const { data: speaker, isLoading } = useQuery<Speaker | null>({
    queryKey: ["event", id, "speaker", spkId],
    queryFn: () => getJson<Speaker>(`/events/${id}/speakers/${spkId}`),
    enabled: Boolean(id && spkId),
  });

  const { data: eventData } = useQuery<any>({
    queryKey: ['event', id],
    queryFn: () => getJson<any>(`/events/${id}`),
    enabled: Boolean(id),
  });
  const eventName: string = eventData?.title || eventData?.name || '';

  const rawFormType = (speaker as any)?.form_type ?? (speaker as any)?.formType ?? 'speaker-info';
  const isApplication = rawFormType === 'call-for-speakers';

  const { data: formConfig } = useQuery<any>({
    queryKey: ["formConfig", id, isApplication ? "call-for-speakers" : "speaker-info"],
    queryFn: async () => {
      try {
        return await getFormConfigForEvent(id!, isApplication ? "call-for-speakers" : "speaker-info");
      } catch {
        return null;
      }
    },
    enabled: Boolean(id) && !!speaker,
  });

  const configFields: any[] = (() => {
    if (!formConfig) return [];
    if (Array.isArray(formConfig)) return formConfig;
    if (Array.isArray(formConfig.config)) return formConfig.config;
    if (Array.isArray(formConfig.fields)) return formConfig.fields;
    if (Array.isArray(formConfig.config?.fields)) return formConfig.config.fields;
    return [];
  })();

  const DEFAULT_EDIT_FIELDS = [
    { id: 'first_name', label: 'First Name', type: 'text', enabled: true, required: true },
    { id: 'last_name', label: 'Last Name', type: 'text', enabled: true, required: true },
    { id: 'email', label: 'Email', type: 'email', enabled: true, required: true },
    { id: 'company_role', label: 'Title', type: 'text', enabled: true, required: false },
    { id: 'company_name', label: 'Company', type: 'text', enabled: true, required: false },
    { id: 'linkedin', label: 'LinkedIn', type: 'url', enabled: true, required: false },
    { id: 'talk_topic', label: 'Talk / Session Topic', type: 'text', enabled: true, required: false },
    { id: 'bio', label: 'Bio', type: 'textarea', enabled: true, required: false },
  ];
  const editFormFields = configFields.length > 0 ? configFields : DEFAULT_EDIT_FIELDS;

  // Use the canonical Speaker type and derive a few display helpers
  const s = (speaker as Speaker) ?? null;
  const fullName = s ? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || (s as any).name || '' : '';
  const headshotUrl = s?.headshot ?? null;
  const websiteApproved = s?.websiteCardApproved ?? false;
  const promoApproved = s?.promoCardApproved ?? false;

  const { isReadOnly } = useEventAccess(id);
  const effectiveReadOnly = isOrganizerView && isReadOnly;

  const canApprove = Boolean(s?.headshot);

  const queryClient = useQueryClient();
  const [rejectionEmail, setRejectionEmail] = useState<EmailDraft | null>(null);
  const [editOpen, setEditOpen] = useState(() => initialOpenEdit ?? !!(location.state as any)?.openEdit);
  const [bioOpen, setBioOpen] = useState(false);
  // const [notesOpen, setNotesOpen] = useState(false); // Internal Notes — not MVP
  // const [internalNotes, setInternalNotes] = useState(''); // Internal Notes — not MVP
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'headshot' | 'logo' | 'logoWhite' | null>(null);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoWhite, setUploadingLogoWhite] = useState(false);
  const [updatingAppStatus, setUpdatingAppStatus] = useState(false);
  const headshotInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const logoWhiteInputRef = useRef<HTMLInputElement | null>(null);

  const handleWebsiteApproval = async () => {
    if (!id || !spkId || !canApprove) return;
    const payload: any = {
      id: spkId,
      firstName: s?.firstName ?? '',
      lastName: s?.lastName ?? '',
      email: s?.email ?? '',
      formType: s?.formType ?? 'speaker-info',
      websiteCardApproved: !websiteApproved,
    };
    if (!websiteApproved) payload.speakerInformationStatus = 'cards_approved';
    await updateSpeaker(id, spkId, payload);
    queryClient.invalidateQueries({ queryKey: ['event', id, 'speaker', spkId] });
    queryClient.invalidateQueries({ queryKey: ['event', id, 'speakers'], exact: false });
    toast({ title: websiteApproved ? 'Speaker card unapproved' : 'Speaker card approved' });
  };

  const handleWebsiteApprovalAndPublish = async () => {
    if (!id || !spkId || !canApprove) return;
    const payload: any = {
      id: spkId,
      firstName: s?.firstName ?? '',
      lastName: s?.lastName ?? '',
      email: s?.email ?? '',
      formType: s?.formType ?? 'speaker-info',
      websiteCardApproved: true,
      embedEnabled: true,
      speakerInformationStatus: 'cards_approved',
    };
    await updateSpeaker(id, spkId, payload);
    queryClient.invalidateQueries({ queryKey: ['event', id, 'speaker', spkId] });
    queryClient.invalidateQueries({ queryKey: ['event', id, 'speakers'], exact: false });
    toast({ title: 'Speaker card approved and published to Speaker Wall' });
  };

  const handlePromoApproval = async () => {
    if (!id || !spkId || !canApprove) return;
    const payload: any = {
      id: spkId,
      firstName: s?.firstName ?? '',
      lastName: s?.lastName ?? '',
      email: s?.email ?? '',
      formType: s?.formType ?? 'speaker-info',
      promoCardApproved: !promoApproved,
    };
    await updateSpeaker(id, spkId, payload);
    queryClient.invalidateQueries({ queryKey: ['event', id, 'speaker', spkId] });
    queryClient.invalidateQueries({ queryKey: ['event', id, 'speakers'], exact: false });
    toast({ title: promoApproved ? 'Social card unapproved' : 'Social card approved' });
  };

  const handleApplicationStatus = async (status: 'approved' | 'rejected') => {
    if (!id || !spkId) return;
    setUpdatingAppStatus(true);
    try {
      await updateSpeaker(id, spkId, {
        id: spkId,
        firstName: s?.firstName ?? '',
        lastName: s?.lastName ?? '',
        email: s?.email ?? '',
        formType: status === 'approved' ? 'speaker-info' : 'call-for-speakers',
        callForSpeakersStatus: status,
      });
      queryClient.invalidateQueries({ queryKey: ['event', id, 'speaker', spkId] });
      queryClient.invalidateQueries({ queryKey: ['event', id, 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['event', id, 'speakers'], exact: false });
      if (status === 'rejected') {
        const tpl = buildRejectionEmail(s?.firstName ?? '', eventName);
        const savedFromName = eventData?.from_name ?? eventData?.fromName ?? localStorage.getItem('seamless-email-from-name') ?? '';
        const savedFromEmail = eventData?.from_email ?? eventData?.fromEmail ?? localStorage.getItem('seamless-email-from-email') ?? '';
        setRejectionEmail({ speaker: s, subject: tpl.subject, body: tpl.body, fromName: savedFromName, fromEmail: savedFromEmail, copied: false });
      } else {
        toast({ title: 'Application approved — speaker added to your Speakers list' });
      }
    } catch (err: any) {
      toast({ title: 'Failed to update application', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setUpdatingAppStatus(false);
    }
  };

  const handleSendRejectionEmail = async () => {
    if (!rejectionEmail || !id || !spkId) return;
    try {
      const html = buildEmailHtml(rejectionEmail.speaker?.firstName ?? '', rejectionEmail.body, '', undefined, undefined);
      await emailSpeaker(id, spkId, {
        recipientEmail: rejectionEmail.speaker?.email ?? '',
        recipientName: rejectionEmail.speaker?.firstName ?? '',
        subject: rejectionEmail.subject,
        htmlContent: html,
        userName: rejectionEmail.fromName || '',
        userEmail: rejectionEmail.fromEmail || '',
      });
      toast({ title: 'Email sent' });
      setRejectionEmail(null);
    } catch (err: any) {
      toast({ title: 'Failed to send email', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!id || !spkId) return;
    const ct = cropType;
    const isHeadshot = ct === 'headshot';
    const isLogoWhite = ct === 'logoWhite';
    try {
      if (isHeadshot) setUploadingHeadshot(true);
      else if (isLogoWhite) setUploadingLogoWhite(true);
      else setUploadingLogo(true);
      const mime = (croppedBlob as any).type || 'image/jpeg';
      const rawExt = mime.split('/')[1] || 'jpeg';
      const ext = rawExt.split('+')[0] === 'jpeg' ? 'jpg' : rawExt.split('+')[0];
      const file = new File([croppedBlob], `${ct}.${ext}`, { type: mime });
      let res: any;
      try {
        res = await uploadFile(file, undefined, spkId, id);
      } catch (uploadErr: any) {
        throw new Error(`Upload failed: ${String(uploadErr?.message || uploadErr)}`);
      }
      const url = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
      if (!url) throw new Error('Upload did not return a file url');
      const patch: any = {
        id: spkId,
        firstName: s?.firstName,
        lastName: s?.lastName,
        email: s?.email,
        formType: s?.formType || 'speaker-info',
      };
      if (isHeadshot) {
        patch.headshot = url;
        patch.websiteCardApproved = false;
        patch.promoCardApproved = false;
      } else if (isLogoWhite) {
        patch.companyLogoWhite = url;
      } else {
        patch.companyLogoColour = url;
      }
      try {
        await updateSpeaker(id, spkId, patch);
      } catch (patchErr: any) {
        throw new Error(`Save failed: ${String(patchErr?.message || patchErr)}`);
      }
      queryClient.invalidateQueries({ queryKey: ['event', id, 'speaker', spkId] });
      queryClient.invalidateQueries({ queryKey: ['event', id, 'speakers'], exact: false });
      toast({ title: isHeadshot ? 'Headshot updated — approval reset' : isLogoWhite ? 'White logo updated' : 'Company logo updated' });
    } catch (err: any) {
      toast({ title: `Failed to upload ${isHeadshot ? 'headshot' : isLogoWhite ? 'white logo' : 'logo'}`, description: String(err?.message || err) });
    } finally {
      if (isHeadshot) { setUploadingHeadshot(false); if (headshotInputRef.current) headshotInputRef.current.value = ''; }
      else if (isLogoWhite) { setUploadingLogoWhite(false); if (logoWhiteInputRef.current) logoWhiteInputRef.current.value = ''; }
      else { setUploadingLogo(false); if (logoInputRef.current) logoInputRef.current.value = ''; }
      setCropImageUrl(null);
      setCropType(null);
    }
  };

  const tabClass = (tab: string) =>
    `py-3 border-b-2 transition-colors text-sm font-medium whitespace-nowrap ${
      activeTab === tab
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    }`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border bg-card/95 px-4 shrink-0">
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
          title="Back to speakers"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[17px] font-semibold text-primary shrink-0" style={{ letterSpacing: '-0.01em' }}>Seamless</span>
        <span className="text-sm text-muted-foreground shrink-0">Events</span>
        {fullName && (
          <>
            <span className="text-muted-foreground/40 text-sm shrink-0">—</span>
            <span className="text-sm text-muted-foreground truncate max-w-[220px]">{fullName}</span>
          </>
        )}
        <div className="flex-1" />
        {isOrganizerView && isApplication && s?.callForSpeakersStatus !== 'approved' && (
          <div className="flex items-center gap-2">
            {s?.callForSpeakersStatus === 'rejected' ? (
              <Button size="sm" onClick={() => handleApplicationStatus('approved')} disabled={updatingAppStatus}>
                <Check className="h-3.5 w-3.5 mr-1.5" />Approve
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleApplicationStatus('rejected')} disabled={updatingAppStatus}>
                  <X className="h-3.5 w-3.5 mr-1.5" />Reject
                </Button>
                <Button size="sm" onClick={() => handleApplicationStatus('approved')} disabled={updatingAppStatus}>
                  <Check className="h-3.5 w-3.5 mr-1.5" />{updatingAppStatus ? 'Approving…' : 'Approve'}
                </Button>
              </>
            )}
          </div>
        )}
        {isOrganizerView && isApplication && s?.callForSpeakersStatus === 'approved' && (
          <span className="text-sm text-success font-medium flex items-center gap-1.5">
            <Check className="h-4 w-4" />Approved
          </span>
        )}
      </header>

      {!isApplication && (
        <div className="border-b border-border bg-card/50 px-6 shrink-0">
          <div className="flex gap-6">
            <button onClick={() => navigate(baseSpeakerPath, { replace: true })} className={tabClass('info')}>
              Info & Content
            </button>
            <button onClick={() => navigate(`${baseSpeakerPath}/speaker-card`, { replace: true })} className={tabClass('speaker-card')}>
              Speaker Card
            </button>
            <button onClick={() => navigate(`${baseSpeakerPath}/social-card`, { replace: true })} className={tabClass('social-card')}>
              Social Card
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-auto${activeTab === 'speaker-card' || activeTab === 'social-card' ? ' bg-white' : ''}`}>
        <div className="px-6 py-6">

          {activeTab === 'info' && (() => {
            const fieldEnabled = (id: string) =>
              !configFields.length || configFields.some(f => f.id === id && f.enabled);

            const Field = ({ label, value, href }: { label: string; value?: string | null; href?: string }) => (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
                {href && value ? (
                  <a href={href} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline truncate block">{value}</a>
                ) : (
                  <p className="text-sm text-foreground">{value || <span className="text-muted-foreground/40">—</span>}</p>
                )}
              </div>
            );

            const makeFileHandler = (type: 'headshot' | 'logo' | 'logoWhite') => (e: React.ChangeEvent<HTMLInputElement>) => {
              if (effectiveReadOnly) return;
              const file = e.target.files?.[0];
              if (!file) return;
              if (!['image/png', 'image/jpeg', 'image/avif'].includes(file.type)) {
                toast({ title: 'Must be PNG, JPEG, or AVIF', variant: 'destructive' });
                e.currentTarget.value = '';
                return;
              }
              const reader = new FileReader();
              reader.onloadend = () => { setCropImageUrl(reader.result as string); setCropType(type); };
              reader.readAsDataURL(file);
            };

            // All enabled fields not in the hardcoded core set
            // `sample_content` is handled by the SpeakerContentTab component now
            const CORE_IDS = new Set(['first_name', 'last_name', 'company_role', 'company_name', 'email', 'linkedin', 'bio', 'headshot', 'company_logo', 'company_logo_white', 'talk_topic', 'talk_title', 'talk_description', 'sample_content']);
            // Inline: text/url/email/radio/checkbox fields shown in the 2-col grid
            const extraInlineFields = configFields.filter(f => f.enabled && !CORE_IDS.has(f.id) && f.type !== 'file' && f.type !== 'textarea');
            // Block: textarea fields shown as full-width blocks (like bio)
            const extraBlockFields = configFields.filter(f => f.enabled && !CORE_IDS.has(f.id) && f.type === 'textarea');
            // Extra file fields — images (logo white) shown in right column, others as download links
            const extraFileFields = configFields.filter(f => f.enabled && f.type === 'file' && !CORE_IDS.has(f.id));
            const getCustomValue = (field: any) => {
              const cf = s?.customFields || {};
              return cf[field.id] || cf[field.id.replace(/_/g, '')] || null;
            };

            return (
              <div className='grid grid-cols-2 gap-6 items-start'>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Details</p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => {
                      const lines = [
                        fullName && `Name: ${fullName}`,
                        s?.companyRole && `Title: ${s.companyRole}`,
                        s?.companyName && `Company: ${s.companyName}`,
                        s?.email && `Email: ${s.email}`,
                        s?.linkedin && `LinkedIn: ${s.linkedin}`,
                        s?.talkTopic && `Talk / Session Topic: ${s.talkTopic}`,
                        s?.bio && `Bio: ${s.bio}`,
                      ].filter(Boolean).join('\n');
                      navigator.clipboard.writeText(lines);
                      toast({ title: 'Details copied' });
                    }}>
                      <Copy className="h-3.5 w-3.5" />Copy
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setEditOpen(true)} disabled={effectiveReadOnly}>
                      <Edit className="h-3.5 w-3.5" />Edit
                    </Button>
                  </div>
                </div>

                <div className="flex gap-0 divide-x divide-border">
                  <div className="flex-1 px-6 py-6 space-y-5 min-w-0">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <Field label="First Name" value={s?.firstName} />
                      <Field label="Last Name" value={s?.lastName} />
                      {fieldEnabled('company_role') && <Field label="Title" value={s?.companyRole} />}
                      {fieldEnabled('company_name') && <Field label="Company" value={s?.companyName} />}
                      {fieldEnabled('email') && <Field label="Email" value={s?.email} href={s?.email ? `mailto:${s.email}` : undefined} />}
                      {fieldEnabled('linkedin') && s?.linkedin && <Field label="LinkedIn" value={s.linkedin} href={s.linkedin} />}
                      {(fieldEnabled('talk_topic') || s?.talkTopic) && (
                        <Field label="Talk / Session Topic" value={s?.talkTopic} />
                      )}
                      {(fieldEnabled('talk_title') || s?.talkTitle) && (
                        <Field label="Talk Title" value={s?.talkTitle} />
                      )}
                      {extraInlineFields.map(field => (
                        <Field
                          key={field.id}
                          label={field.label}
                          value={getCustomValue(field)}
                          href={field.type === 'url' ? getCustomValue(field) ?? undefined : undefined}
                        />
                      ))}
                    </div>

                    {fieldEnabled('bio') && s?.bio && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Bio</p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {s.bio.length > 300 ? `${s.bio.substring(0, 300)}…` : s.bio}
                        </p>
                        {s.bio.length > 300 && (
                          <button className="text-xs text-primary hover:underline mt-1" onClick={() => setBioOpen(true)}>
                            Read more
                          </button>
                        )}
                      </div>
                    )}

                    {(fieldEnabled('talk_description') || s?.talkDescription) && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Talk Description</p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {s?.talkDescription || <span className="text-muted-foreground/40">—</span>}
                        </p>
                      </div>
                    )}

                    {extraBlockFields.map(field => {
                      const val = getCustomValue(field);
                      return (
                        <div key={field.id} className="pt-4 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">{field.label}</p>
                          <p className="text-sm text-foreground leading-relaxed">
                            {val || <span className="text-muted-foreground/40">—</span>}
                          </p>
                        </div>
                      );
                    })}

                    {/* Internal Notes — commented out, not MVP
                    {isOrganizerView && (
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Internal Notes <span className="font-normal opacity-60">(not visible to speaker)</span></p>
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => { setInternalNotes(s?.internalNotes || ''); setNotesOpen(true); }}
                        >
                          {s?.internalNotes ? 'Edit' : 'Add'}
                        </button>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {s?.internalNotes || <span className="text-muted-foreground/40">No notes added</span>}
                      </p>
                    </div>
                    )}
                    */}
                  </div>

                  {(fieldEnabled('headshot') || fieldEnabled('company_logo') || extraFileFields.length > 0) && (
                  <div className="w-[260px] shrink-0 px-6 py-6 flex flex-col items-center gap-6">
                    {fieldEnabled('headshot') && (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <p className="text-xs font-medium text-muted-foreground self-start mb-1">Headshot</p>
                      <div className="w-[120px] h-[120px] rounded-lg border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                        {headshotUrl
                          ? <img src={headshotUrl} alt={fullName ?? ''} className="w-full h-full object-cover" />
                          : <span className="text-3xl font-semibold text-muted-foreground">{s?.firstName?.[0] ?? '?'}</span>
                        }
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => { if (!effectiveReadOnly) headshotInputRef.current?.click(); }}
                          disabled={uploadingHeadshot || effectiveReadOnly}
                        >
                          {uploadingHeadshot ? 'Uploading…' : headshotUrl ? 'Replace' : 'Upload'}
                        </button>
                        {headshotUrl && (
                          <button title="Download headshot" className="text-muted-foreground hover:text-primary transition-colors" onClick={() => window.open(headshotUrl, '_blank')}>
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input ref={headshotInputRef} type="file" accept="image/png,image/jpeg,image/avif" className="hidden" onChange={makeFileHandler('headshot')} />
                    </div>
                    )}

                    {fieldEnabled('company_logo') && (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <p className="text-xs font-medium text-muted-foreground self-start mb-1">Company Logo — Colour</p>
                      <div className="w-full h-[64px] rounded-lg border border-border bg-white flex items-center justify-center p-2.5">
                        {(s?.companyLogoColour ?? s?.companyLogo)
                          ? <img src={s?.companyLogoColour ?? s?.companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                          : <span className="text-xs text-muted-foreground/50 text-center leading-tight">{s?.companyName || 'No logo'}</span>
                        }
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => { if (!effectiveReadOnly) logoInputRef.current?.click(); }}
                          disabled={uploadingLogo || effectiveReadOnly}
                        >
                          {uploadingLogo ? 'Uploading…' : (s?.companyLogoColour ?? s?.companyLogo) ? 'Replace' : 'Upload'}
                        </button>
                        {(s?.companyLogoColour ?? s?.companyLogo) && (
                          <button title="Download logo" className="text-muted-foreground hover:text-primary transition-colors" onClick={() => window.open(s?.companyLogoColour ?? s?.companyLogo, '_blank')}>
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/avif" className="hidden" onChange={makeFileHandler('logo')} />
                    </div>
                    )}

                    {(fieldEnabled('company_logo_white') || s?.companyLogoWhite) && (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <p className="text-xs font-medium text-muted-foreground self-start mb-1">Company Logo — White</p>
                      <div className="w-full h-[64px] rounded-lg border border-border flex items-center justify-center p-2.5" style={{ background: '#1f2937' }}>
                        {s?.companyLogoWhite
                          ? <img src={s.companyLogoWhite} alt="Logo (white)" className="max-w-full max-h-full object-contain" />
                          : <span className="text-xs text-white/40 text-center leading-tight">No logo</span>
                        }
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => { if (!effectiveReadOnly) logoWhiteInputRef.current?.click(); }}
                          disabled={uploadingLogoWhite || effectiveReadOnly}
                        >
                          {uploadingLogoWhite ? 'Uploading…' : s?.companyLogoWhite ? 'Replace' : 'Upload'}
                        </button>
                        {s?.companyLogoWhite && (
                          <button title="Download white logo" className="text-muted-foreground hover:text-primary transition-colors" onClick={() => window.open(s.companyLogoWhite, '_blank')}>
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input ref={logoWhiteInputRef} type="file" accept="image/png,image/jpeg,image/avif" className="hidden" onChange={makeFileHandler('logoWhite')} />
                    </div>
                    )}

                    {extraFileFields.map(field => {
                      const val = getCustomValue(field);
                      const isImage = field.id === 'company_logo_white' || (val && /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(val));
                      const isDarkBg = field.id === 'company_logo_white';
                      return (
                        <div key={field.id} className="flex flex-col items-center gap-1.5 w-full">
                          <p className="text-xs font-medium text-muted-foreground self-start mb-1">{field.label}</p>
                          {isImage ? (
                            <div
                              className="w-full h-[64px] rounded-lg border border-border flex items-center justify-center p-2.5"
                              style={{ background: isDarkBg ? '#1f2937' : undefined }}
                            >
                              {val
                                ? <img src={val} alt={field.label} className="max-w-full max-h-full object-contain" />
                                : <span className="text-xs text-muted-foreground/50 text-center leading-tight">Not uploaded</span>
                              }
                            </div>
                          ) : (
                            <div className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2">
                              {val
                                ? <a href={val} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Download file</a>
                                : <span className="text-xs text-muted-foreground/50">Not uploaded</span>
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}

                    
                  </div>
                  )}
                </div>
              </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <SpeakerContentTab eventId={id!} speakerId={spkId!} speakerName={fullName || undefined} showApprovals={isOrganizerView} readOnly={effectiveReadOnly} />
                </div>
              </div>
            );
          })()}

          {activeTab === 'speaker-card' && (
            <SpeakerCardTab
              type="website"
              s={s}
              isApproved={websiteApproved}
              canApprove={canApprove}
              onToggleApproval={handleWebsiteApproval}
              onApproveAndPublish={!websiteApproved ? handleWebsiteApprovalAndPublish : undefined}
              showApprovals={isOrganizerView}
              readOnly={isReadOnly}
            />
          )}

          {activeTab === 'social-card' && (
            <SpeakerCardTab
              type="promo"
              s={s}
              isApproved={promoApproved}
              canApprove={canApprove}
              onToggleApproval={handlePromoApproval}
              showApprovals={isOrganizerView}
              readOnly={isReadOnly}
            />
          )}

        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{isApplication ? 'Edit Application' : 'Edit Speaker'}</DialogTitle>
          </DialogHeader>
          <SpeakerForm
            initialValues={{
              firstName: s?.firstName ?? '',
              lastName: s?.lastName ?? '',
              email: s?.email ?? '',
              companyName: s?.companyName ?? '',
              companyRole: s?.companyRole ?? '',
              linkedin: s?.linkedin ?? '',
              bio: s?.bio ?? '',
              talkTopic: s?.talkTopic ?? '',
              talkTitle: s?.talkTitle ?? '',
              talkDescription: s?.talkDescription ?? '',
              ...(() => {
                const vals: Record<string, any> = {};
                editFormFields.forEach((field: any) => {
                  if (field.custom && field.enabled && field.type !== 'file') {
                    const cf = s?.customFields || {};
                    vals[field.id] = cf[field.id] || cf[field.id.replace(/_/g, '')] || '';
                  }
                });
                return vals;
              })(),
            }}
            formConfig={editFormFields}
            submitLabel="Save"
            onCancel={() => setEditOpen(false)}
            onSubmit={async (values) => {
              if (!id || !spkId) return;
              try {
                const standardKeys = ['firstName', 'lastName', 'email', 'companyName', 'companyRole', 'linkedin', 'bio', 'talkTopic', 'talkTitle', 'talkDescription'];
                const customFields: Record<string, any> = {};
                Object.keys(values).forEach(key => {
                  if (!standardKeys.includes(key)) customFields[key] = values[key];
                });
                const requiredFields = editFormFields.filter((f: any) => f.required && f.enabled);
                const allRequiredFilled = requiredFields.every((field: any) => {
                  const key = field.id === 'first_name' ? 'firstName'
                    : field.id === 'last_name' ? 'lastName'
                    : field.id === 'company_name' ? 'companyName'
                    : field.id === 'company_role' ? 'companyRole'
                    : field.id === 'talk_topic' ? 'talkTopic'
                    : field.id === 'talk_title' ? 'talkTitle'
                    : field.id === 'talk_description' ? 'talkDescription'
                    : field.id;
                  const value = standardKeys.includes(key) ? (values as any)[key] : customFields[key];
                  return value && value.trim() !== '';
                });
                const payload: any = {
                  id: spkId,
                  firstName: values.firstName,
                  lastName: values.lastName,
                  email: values.email,
                  companyName: (values as any).companyName || null,
                  companyRole: (values as any).companyRole || null,
                  linkedin: (values as any).linkedin || null,
                  bio: (values as any).bio || null,
                  talkTopic: (values as any).talkTopic || null,
                  talkTitle: (values as any).talkTitle || null,
                  talkDescription: (values as any).talkDescription || null,
                  formType: s?.formType || 'speaker-info',
                  intakeFormStatus: allRequiredFilled ? 'submitted' : 'pending',
                };
                if (Object.keys(customFields).length > 0) payload.customFields = customFields;
                if (payload.customFields) {
                  const cf = payload.customFields as Record<string, any>;
                  if (cf["company_logo_white"]) { payload.companyLogoWhite = cf["company_logo_white"]; delete cf["company_logo_white"]; }
                  if (cf["companylogowhite"]) { payload.companyLogoWhite = cf["companylogowhite"]; delete cf["companylogowhite"]; }
                  if (Object.keys(cf).length === 0) delete payload.customFields;
                }
                await updateSpeaker(id, spkId, payload);
                queryClient.invalidateQueries({ queryKey: ['event', id, 'speaker', spkId] });
                queryClient.invalidateQueries({ queryKey: ['event', id, 'speakers'], exact: false });
                setEditOpen(false);
                toast({ title: 'Speaker updated' });
              } catch (err: any) {
                toast({ title: 'Failed to update speaker', description: String(err?.message || err) });
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={bioOpen} onOpenChange={setBioOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bio</DialogTitle></DialogHeader>
          <Textarea value={s?.bio ?? ''} readOnly className="min-h-[200px]" />
        </DialogContent>
      </Dialog>

      {/* Internal Notes dialog — commented out, not MVP
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Internal Notes</DialogTitle>
            <DialogDescription>Only visible to your team</DialogDescription>
          </DialogHeader>
          <Textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Add internal notes about this speaker…"
            className="min-h-[150px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNotesOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!id || !spkId) return;
              try {
                const payload: any = { ...s, internalNotes };
                if (payload.customFields) {
                  const cf = payload.customFields as Record<string, any>;
                  if (cf["company_logo_white"]) { payload.companyLogoWhite = cf["company_logo_white"]; delete cf["company_logo_white"]; }
                  if (cf["companylogowhite"]) { payload.companyLogoWhite = cf["companylogowhite"]; delete cf["companylogowhite"]; }
                  if (cf["talk_topic"]) { payload.talkTopic = cf["talk_topic"]; delete cf["talk_topic"]; }
                  if (cf["talk_title"]) { payload.talkTitle = cf["talk_title"]; delete cf["talk_title"]; }
                  if (cf["talk_description"]) { payload.talkDescription = cf["talk_description"]; delete cf["talk_description"]; }
                  if (Object.keys(cf).length === 0) delete payload.customFields;
                }
                await updateSpeaker(id, spkId, payload);
                queryClient.invalidateQueries({ queryKey: ['event', id, 'speaker', spkId] });
                toast({ title: 'Notes saved' });
                setNotesOpen(false);
              } catch (err: any) {
                toast({ title: 'Failed to save notes', description: String(err?.message || err) });
              }
            }}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      */}

      {rejectionEmail && (
        <EmailComposer
          draft={rejectionEmail}
          title={`Let ${rejectionEmail.speaker?.firstName} know`}
          onClose={() => setRejectionEmail(null)}
          onDraftChange={(patch) => setRejectionEmail(e => e ? { ...e, ...patch } : null)}
          onSend={handleSendRejectionEmail}
        />
      )}

      {cropImageUrl && (
        <ImageCropDialog
          open={Boolean(cropImageUrl)}
          onOpenChange={(open) => { if (!open) { setCropImageUrl(null); setCropType(null); } }}
          imageUrl={cropImageUrl}
          aspectRatio={cropType === 'headshot' ? 1 : NaN}
          onCropComplete={handleCropComplete}
          title={cropType === 'headshot' ? 'Crop Headshot' : cropType === 'logoWhite' ? 'Crop White Logo' : 'Crop Company Logo'}
          instructions={cropType === 'headshot'
            ? 'Drag to reposition, scroll to zoom. Crop to square format.'
            : 'Drag to reposition, scroll to zoom.'}
        />
      )}
    </div>
  );
}
