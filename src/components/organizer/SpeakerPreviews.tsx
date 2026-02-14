import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { generatePromo as apiGeneratePromo } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Props = {
  s: any;
  eventData: any;
};

export default function SpeakerPreviews({ s, eventData }: Props) {
  const { id: eventId } = useParams();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  if (!eventId) {
    return (
      <div className="text-sm text-muted-foreground">
        No event ID available
      </div>
    );
  }

  const generatePromo = async () => {
    if (!eventId || !s?.id) return;
    setLoading(true);
    setError(null);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }

    try {
      const resp = await apiGeneratePromo(eventId, s.id);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      setImageUrl(objUrl);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
      if (readerRef.current) readerRef.current = null;
    }
  };

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
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="w-full flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Generate a promo card for this speaker</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={generatePromo} disabled={loading}>
                  {loading ? 'Generating...' : 'Generate'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!imageUrl) return;
                    const a = document.createElement('a');
                    a.href = imageUrl;
                    a.download = `promo-${s?.id ?? 'card'}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  disabled={!imageUrl}
                >
                  Download PNG
                </Button>
              </div>
            </div>

            {error && <div className="text-destructive text-sm">{error}</div>}

            {/* If an image was returned, show it */}
            {imageUrl ? (
              <div className="w-full flex items-center justify-center" style={{ minHeight: 240 }}>
                <img src={imageUrl} alt="Promo" style={{ maxWidth: '50%', height: 'auto', borderRadius: 6 }} />
              </div>
            ) : (
              <div className="w-full">
                <div className="text-sm text-muted-foreground text-center mb-2">
                  {loading ? 'Generating preview...' : 'Card generation output will appear here.'}
                </div>
                <div className="bg-white p-4 rounded" style={{ minHeight: 120, maxHeight: 360, overflow: 'auto' }}>
                  <div className="text-sm text-muted-foreground text-center">{error ? error : ''}</div>
                </div>
              </div>
            )}
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
