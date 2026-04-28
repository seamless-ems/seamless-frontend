import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, CheckCircle, Download } from 'lucide-react';
import { CircleLoader } from 'react-spinners';
import { toast } from '@/hooks/use-toast';
import { API_BASE } from '@/lib/api';
import { downloadResource } from '@/lib/utils';
import SpeakerPreviews from './SpeakerPreviews';

type Props = {
  type: 'website' | 'promo';
  s: any;
  isApproved: boolean;
  canApprove: boolean;
  onToggleApproval: () => Promise<void>;
  onApproveAndPublish?: () => Promise<void>;
  showApprovals?: boolean;
  readOnly?: boolean;
};

export default function SpeakerCardTab({ type, s, isApproved, canApprove, onToggleApproval, onApproveAndPublish, showApprovals = true, readOnly = false }: Props) {
  const { id: eventId } = useParams();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Prevent background scroll while modal is open
    const prev = document.body.style.overflow;
    if (downloading) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = prev;
    return () => { document.body.style.overflow = prev; };
  }, [downloading]);

  const cardUrl = type === 'website'
    ? `${API_BASE}/embed/${encodeURIComponent(eventId ?? '')}/speaker/${encodeURIComponent(s?.id ?? '')}`
    : `${API_BASE}/promo-cards/${encodeURIComponent(eventId ?? '')}/speaker/${encodeURIComponent(s?.id ?? '')}`;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const pngUrl = type === 'website'
        ? `${API_BASE}/embed/${encodeURIComponent(eventId ?? '')}/speaker/${encodeURIComponent(s?.id ?? '')}/download`
        : `${API_BASE}/promo-cards/${encodeURIComponent(eventId ?? '')}/speaker/${encodeURIComponent(s?.id ?? '')}/download`;

      await downloadResource(
        pngUrl,
        `${s?.firstName ?? 'speaker'}-${type === 'website' ? 'speaker-card' : 'social-card'}.png`,
      );
    } catch (err) {
      // If PNG endpoint fails, fall back to previous HTML download
      try {
        await downloadResource(
          cardUrl,
          `${s?.firstName ?? 'speaker'}-${type === 'website' ? 'speaker-card' : 'social-card'}.html`,
        );
      } catch (e) {
        toast({ title: 'Download failed', description: String(err || e || 'Unknown error') });
      }
    } finally {
      setDownloading(false);
    }
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardNotFound, setCardNotFound] = useState<boolean | null>(null);

  const label = type === 'website' ? 'Speaker Card' : 'Social Card';

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onToggleApproval();
    } catch (err: any) {
      toast({ title: 'Failed to update approval', description: String(err?.message || err) });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const handleConfirmAndPublish = async () => {
    setLoading(true);
    try {
      await onApproveAndPublish?.();
    } catch (err: any) {
      toast({ title: 'Failed to approve and publish', description: String(err?.message || err) });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Actions row — only shown once we know the card exists */}
      {cardNotFound === false && <div className="flex items-center justify-between">
        <div>
          {type === 'website' && isApproved && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />Approved
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showApprovals && (
            <>
              {!canApprove && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />Upload a headshot to approve
                </span>
              )}
              <Button
                size="sm"
                variant={isApproved ? 'outline' : 'default'}
                disabled={!canApprove || loading || readOnly}
                onClick={() => (type === 'promo' && !isApproved) ? handleConfirm() : setConfirmOpen(true)}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                {isApproved ? 'Unapprove' : `Approve ${label}`}
              </Button>
            </>
          )}
          {type === 'website' && isApproved ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <span className="inline-flex items-center gap-2">
                  <CircleLoader size={14} color="#4e5ca6" />Downloading…
                </span>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />Download
                </>
              )}
            </Button>
          ) : (
            <button
              onClick={handleDownload}
              disabled={downloading}
              title={downloading ? 'Downloading…' : `Download ${label}`}
              className="text-muted-foreground/50 hover:text-accent transition-colors disabled:opacity-40"
            >
              {downloading ? <CircleLoader size={14} color="#4e5ca6" /> : <Download className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>}

      {/* Preview */}
      {s && <SpeakerPreviews s={s} type={type} onNotFound={setCardNotFound} />}

      {/* Confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isApproved ? `Unapprove ${label}?` : `Approve ${label}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isApproved
                ? type === 'website'
                  ? `This removes the speaker card from approved status. ${s?.name ?? 'This speaker'} will no longer appear in the Speaker Wall.`
                  : `This removes the social card from approved status for ${s?.name ?? 'this speaker'}.`
                : type === 'website'
                  ? `Approve the speaker card for ${s?.name ?? 'this speaker'}. You can publish them to your Speaker Wall now or do it later.`
                  : `Approve the social card for ${s?.name ?? 'this speaker'}. Approved cards can be downloaded from the Speakers table.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {isApproved ? (
              <AlertDialogAction onClick={handleConfirm} disabled={loading}>
                Yes, unapprove
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogAction onClick={handleConfirm} disabled={loading} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  {onApproveAndPublish ? 'Approve only' : 'Approve'}
                </AlertDialogAction>
                {onApproveAndPublish && (
                  <AlertDialogAction onClick={handleConfirmAndPublish} disabled={loading}>
                    Approve & Publish to Speaker Wall
                  </AlertDialogAction>
                )}
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocking modal shown while downloading to prevent interaction */}
      {downloading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card p-6 rounded-lg flex flex-col items-center gap-3 shadow-lg">
            <CircleLoader size={48} color="#4e5ca6" />
            <div className="text-lg font-medium">Preparing download…</div>
            <div className="text-sm text-muted-foreground">This may take a moment. Please don’t close this window.</div>
          </div>
        </div>
      )}
    </div>
  );
}
