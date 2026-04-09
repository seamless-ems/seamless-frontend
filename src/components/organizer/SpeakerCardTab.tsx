import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Check, CheckCircle, Share2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import SpeakerPreviews from './SpeakerPreviews';

type Props = {
  type: 'website' | 'promo';
  s: any;
  isApproved: boolean;
  canApprove: boolean;
  onToggleApproval: () => Promise<void>;
  onApproveAndPublish?: () => Promise<void>;
};

export default function SpeakerCardTab({ type, s, isApproved, canApprove, onToggleApproval, onApproveAndPublish }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const label = type === 'website' ? 'Speaker Card' : 'Social Card';

  const copyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      {/* Actions row */}
      <div className="flex items-center justify-between">
        <div>
          {isApproved ? (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />Approved
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
              Pending approval
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!canApprove && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />Upload a headshot to approve
            </span>
          )}
          <Button
            size="sm"
            variant={isApproved ? 'outline' : 'default'}
            disabled={!canApprove || loading}
            onClick={() => setConfirmOpen(true)}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            {isApproved ? 'Unapprove' : `Approve ${label}`}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copyShare}>
            {copied
              ? <><Check className="h-3.5 w-3.5" />Copied</>
              : <><Share2 className="h-3.5 w-3.5" />Share</>}
          </Button>
        </div>
      </div>

      {/* Preview */}
      {s && <SpeakerPreviews s={s} type={type} />}

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
                    Approve & Publish to Wall
                  </AlertDialogAction>
                )}
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
