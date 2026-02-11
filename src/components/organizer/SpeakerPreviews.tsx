import React from 'react';
import { useParams } from 'react-router-dom';

type Props = {
  s: any;
  eventData: any;
};

export default function SpeakerPreviews({ s, eventData }: Props) {
  const { id: eventId } = useParams();

  if (!eventId) {
    return (
      <div className="text-sm text-muted-foreground">
        No event ID available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Promo Card - Waiting for backend generation endpoint */}
      <div>
        <div className="mb-3">
          <strong style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>
            Promo Card
          </strong>
        </div>
        <div className="bg-muted p-8 rounded-lg border-2 border-dashed border-border">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="text-sm text-muted-foreground text-center">
              Card generation will be available once backend image generation is implemented.
              <br />
              See API_GAPS.md for backend specification.
            </div>
          </div>
        </div>
      </div>

      {/* Website Card - Placeholder for future */}
      <div>
        <div className="mb-3">
          <strong style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>
            Website Card
          </strong>
        </div>
        <div className="bg-muted p-8 rounded-lg border-2 border-dashed border-border">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="text-sm text-muted-foreground text-center">
              Website card generation will be available once backend image generation is implemented.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
