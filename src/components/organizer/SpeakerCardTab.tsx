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
};

export default function SpeakerCardTab({ type, s, isApproved, canApprove, onToggleApproval }: Props) {
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
                ? `This removes the ${label.toLowerCase()} from approved status. ${s?.name ?? 'This speaker'} will no longer be eligible for the embed until re-approved.`
                : `Approve the ${label.toLowerCase()} for ${s?.name ?? 'this speaker'}. Once both cards are approved they can be toggled live in the embed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {isApproved ? 'Yes, unapprove' : 'Yes, approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
