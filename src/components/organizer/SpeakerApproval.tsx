import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';

type Props = {
  isApproved: boolean;
  canApprove: boolean;
  onToggleApproval: () => void;
  onOpenStatus: () => void;
};

export default function SpeakerApproval({ isApproved, canApprove, onToggleApproval, onOpenStatus }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 style={{ fontSize: 'var(--font-h3)', fontWeight: 600, marginBottom: '4px' }}>
          Card Approval
        </h3>
        <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>
          Approve this speaker to appear in public embeds (website and promo cards)
        </p>
      </div>
      <div className="flex items-center gap-3">
        {isApproved ? (
          <Button
            variant="outline"
            className="bg-success text-white border-success hover:bg-success/90 hover:text-white"
            onClick={onToggleApproval}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved for Embed
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={onToggleApproval}
            disabled={!canApprove}
          >
            {canApprove ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve for Embed
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Upload headshot to approve
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
