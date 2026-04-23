import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { updateSpeaker } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, ArrowUpRight, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { API_BASE } from '@/lib/api';
import SpeakerCardTab from './SpeakerCardTab';
import SpeakerPreviews from './SpeakerPreviews';

export type PanelView = 'info' | 'speaker-card' | 'social-card' | 'speaker-wall';

type Props = {
  speaker: any;
  eventId: string;
  view: PanelView;
  onClose: () => void;
};

export default function SpeakerQuickPanel({ speaker, eventId, view, onClose }: Props) {
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<PanelView>(view);
  const [toggling, setToggling] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);

  // Sync when a badge click changes the view externally
  useEffect(() => { setCurrentView(view); }, [view]);

  const headshotUrl = speaker.headshot || speaker.headshot_url || speaker.avatarUrl || null;
  const speakerName = speaker.name || `${speaker.firstName ?? ''} ${speaker.lastName ?? ''}`.trim() || speaker.email || 'Speaker';
  const initials = speakerName.split(' ').map((p: string) => p?.[0]).filter(Boolean).slice(0, 2).join('');

  const websiteApproved = speaker.websiteCardApproved ?? speaker.website_card_approved ?? false;
  const promoApproved = speaker.promoCardApproved ?? speaker.promo_card_approved ?? false;
  const embedEnabled = speaker.embedEnabled ?? speaker.embed_enabled ?? false;
  const canApprove = !!headshotUrl;

  const base = {
    id: speaker.id,
    firstName: speaker.firstName ?? speaker.first_name ?? '',
    lastName: speaker.lastName ?? speaker.last_name ?? '',
    email: speaker.email ?? '',
    formType: speaker.formType ?? speaker.form_type ?? 'speaker-info',
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['event', eventId, 'speakers'], exact: false });

  const handleToggleWebsite = async () => {
    const approving = !websiteApproved;
    setToggling(true);
    try {
      const payload: any = { ...base, websiteCardApproved: approving };
      if (approving) payload.speakerInformationStatus = 'cards_approved';
      await updateSpeaker(eventId, speaker.id, payload);
      invalidate();
      toast({ title: approving ? 'Speaker card approved' : 'Speaker card unapproved' });
      if (approving) setCurrentView('speaker-wall');
    } catch (err: any) {
      toast({ title: 'Failed to update approval', description: String(err?.message || err) });
    } finally {
      setToggling(false);
    }
  };

  const handleApproveAndPublish = async () => {
    setToggling(true);
    try {
      await updateSpeaker(eventId, speaker.id, {
        ...base,
        websiteCardApproved: true,
        embedEnabled: true,
        speakerInformationStatus: 'cards_approved',
      });
      invalidate();
      toast({ title: 'Speaker card approved and published to Speaker Wall' });
    } catch (err: any) {
      toast({ title: 'Failed to approve and publish', description: String(err?.message || err) });
    } finally {
      setToggling(false);
    }
  };

  const handleTogglePromo = async () => {
    setToggling(true);
    try {
      const payload: any = { ...base, promoCardApproved: !promoApproved };
      if (!promoApproved) payload.speakerInformationStatus = 'cards_approved';
      await updateSpeaker(eventId, speaker.id, payload);
      invalidate();
      toast({ title: promoApproved ? 'Social card unapproved' : 'Social card approved' });
    } catch (err: any) {
      toast({ title: 'Failed to update approval', description: String(err?.message || err) });
    } finally {
      setToggling(false);
    }
  };

  const handleToggleEmbed = async (value: boolean) => {
    if (!value) {
      // Turning off — show dialog so user can choose unpublish-only vs reset approval
      setUnpublishDialogOpen(true);
      return;
    }
    setToggling(true);
    try {
      await updateSpeaker(eventId, speaker.id, { ...base, embedEnabled: true });
      invalidate();
    } catch (err: any) {
      toast({ title: 'Failed to publish speaker', description: String(err?.message || err) });
    } finally {
      setToggling(false);
    }
  };

  const handleUnpublish = async (resetApproval: boolean) => {
    setUnpublishDialogOpen(false);
    setToggling(true);
    try {
      const patch: any = { ...base, embedEnabled: false };
      if (resetApproval) patch.websiteCardApproved = false;
      await updateSpeaker(eventId, speaker.id, patch);
      invalidate();
      toast({ title: resetApproval ? 'Speaker unpublished and approval reset' : 'Speaker removed from Speaker Wall' });
      if (resetApproval) setCurrentView('speaker-card');
    } catch (err: any) {
      toast({ title: 'Failed to unpublish speaker', description: String(err?.message || err) });
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
    <Dialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from Speaker Wall?</DialogTitle>
          <DialogDescription>{speakerName} · Speaker Card</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-1">
          <Button className="w-full" onClick={() => handleUnpublish(false)}>
            Unpublish
          </Button>
          <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive" onClick={() => handleUnpublish(true)}>
            Unpublish &amp; Unapprove
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setUnpublishDialogOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 border-b border-border flex-none bg-muted/20 h-11">
        <span className="text-xs font-medium text-muted-foreground flex-1">
          {currentView === 'social-card' ? 'Social Card' : 'Speaker Card'}
        </span>
        <Link
          to={`/organizer/event/${eventId}/speakers/${speaker.id}`}
          className="text-muted-foreground/40 hover:text-accent transition-colors"
          title="Open full profile"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <button
          onClick={onClose}
          className="text-muted-foreground/40 hover:text-foreground transition-colors rounded p-0.5 hover:bg-muted"
          title="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentView === 'info' && (
          <InfoView
            speaker={speaker}
            eventId={eventId}
          />
        )}
        {currentView === 'speaker-card' && (
          <SpeakerCardTab
            type="website"
            s={speaker}
            isApproved={websiteApproved}
            canApprove={canApprove}
            onToggleApproval={handleToggleWebsite}
            onApproveAndPublish={handleApproveAndPublish}
          />
        )}
        {currentView === 'social-card' && (
          <SpeakerCardTab
            type="promo"
            s={speaker}
            isApproved={promoApproved}
            canApprove={canApprove}
            onToggleApproval={handleTogglePromo}
          />
        )}
        {currentView === 'speaker-wall' && (
          <SpeakerWallView
            speaker={speaker}
            eventId={eventId}
            embedEnabled={embedEnabled}
            websiteApproved={websiteApproved}
            toggling={toggling}
            onToggle={handleToggleEmbed}
          />
        )}
      </div>
    </div>
    </>
  );
}

function InfoView({ speaker, eventId }: { speaker: any; eventId: string }) {
  const headshotUrl = speaker.headshot || speaker.headshot_url || speaker.avatarUrl || null;
  const infoStatus = speaker.speakerInformationStatus ?? speaker.speaker_information_status ?? speaker.intakeFormStatus ?? speaker.intake_form_status ?? 'pending';
  const infoSubmitted = infoStatus !== 'pending';

  const mandatory: { label: string; value?: string; ok: boolean }[] = [
    { label: 'Form submitted', ok: infoSubmitted },
    { label: 'Headshot', ok: !!headshotUrl },
    { label: 'First name', value: speaker.firstName ?? speaker.first_name, ok: !!(speaker.firstName ?? speaker.first_name) },
    { label: 'Last name', value: speaker.lastName ?? speaker.last_name, ok: !!(speaker.lastName ?? speaker.last_name) },
    { label: 'Email', value: speaker.email, ok: !!speaker.email },
  ];

  // Only show optional fields the backend actually returns (undefined = field not in API response)
  const optionalRaw: [string, any][] = [
    ['Job title',   speaker.companyRole ?? speaker.company_role],
    ['Company',     speaker.company ?? speaker.company_name],
    ['Talk title',  speaker.talkTitle ?? speaker.talk_title],
    ['Bio',         speaker.bio !== undefined ? (speaker.bio ? 'Provided' : '') : undefined],
    ['LinkedIn',    speaker.linkedin],
    ['Website',     speaker.website],
  ];
  const optional = optionalRaw
    .filter(([, v]) => v !== undefined)
    .map(([label, v]) => ({ label, value: v || undefined, ok: !!v }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Mandatory</p>
        <div className="space-y-2">
          {mandatory.map(f => <CheckRow key={f.label} ok={f.ok} label={f.label} value={f.value} />)}
        </div>
      </div>

      {optional.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Optional</p>
          <div className="space-y-2">
            {optional.map(f => <CheckRow key={f.label} ok={f.ok} label={f.label} value={f.value} />)}
          </div>
        </div>
      )}

      <Link
        to={`/organizer/event/${eventId}/speakers/${speaker.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
      >
        View full profile <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function CheckRow({ ok, label, value }: { ok: boolean; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {ok
        ? <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
        : <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
      }
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        {value && (
          <p className="text-xs text-foreground font-medium truncate leading-tight">{value}</p>
        )}
        {!ok && !value && (
          <p className="text-xs text-muted-foreground/50 leading-tight">Not provided</p>
        )}
      </div>
    </div>
  );
}

function SpeakerWallView({ speaker, eventId, embedEnabled, websiteApproved, toggling, onToggle }: {
  speaker: any;
  eventId: string;
  embedEnabled: boolean;
  websiteApproved: boolean;
  toggling: boolean;
  onToggle: (value: boolean) => void;
}) {
  const speakerName = speaker.name || `${speaker.firstName ?? ''} ${speaker.lastName ?? ''}`.trim() || 'speaker';
  const cardUrl = `${API_BASE}/embed/${eventId}/speaker/${speaker.id}`;

  const downloadCard = async () => {
    const filename = `${speakerName.replace(/\s+/g, '-').toLowerCase()}-speaker-card.html`;
    try {
      const resp = await fetch(cardUrl);
      if (!resp.ok) throw new Error();
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(cardUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`h-2 w-2 rounded-full shrink-0 ${embedEnabled ? 'bg-success' : 'bg-muted-foreground/30'}`} />
          <span className="text-sm font-medium text-foreground">
            {embedEnabled ? 'Live on Speaker Wall' : 'Hidden from Speaker Wall'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {websiteApproved && (
            <button
              onClick={downloadCard}
              title="Download Speaker Card"
              className="text-muted-foreground/50 hover:text-accent transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          <Switch
            checked={embedEnabled}
            disabled={toggling || !websiteApproved}
            onCheckedChange={onToggle}
          />
        </div>
      </div>
      {!websiteApproved && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
          Approve the Speaker Card first to publish to the wall.
        </p>
      )}
      <SpeakerPreviews s={speaker} type="website" />
    </div>
  );
}
