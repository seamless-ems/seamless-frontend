import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE, generatePromo as apiGeneratePromo } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Props = {
  s: any;
  eventData: any;
};

export default function SpeakerPreviews({ s, eventData }: Props) {
  const { id: eventId } = useParams();
  const [loading, setLoading] = useState(false);
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const websiteContainerRef = useRef<HTMLDivElement | null>(null);
  const appendedHeadLinks = useRef<HTMLLinkElement[]>([]);
  const appendedScripts = useRef<HTMLScriptElement[]>([]);
  const originalWindowOnclick = useRef<any>(null);
  const controllerRef = useRef<AbortController | null>(null);

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

  // Fetch and embed website card HTML when component mounts or when eventId/s.id changes
  useEffect(() => {
    let mounted = true;
    const container = websiteContainerRef.current;

    if (!eventId || !s?.id || !container) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    const load = async () => {
      setWebsiteLoading(true);
      setWebsiteError(null);
      try {
        const resp = await fetch(`${API_BASE}/embed/${encodeURIComponent(eventId)}/speaker/${encodeURIComponent(s.id)}`, { signal: controller.signal });
        if (!resp.ok) throw new Error(`Failed to load website card: ${resp.status} ${resp.statusText}`);
        const text = await resp.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Append <link> tags from response to head (track for cleanup)
        const links = Array.from(doc.querySelectorAll('link')) as HTMLLinkElement[];
        links.forEach((lnk) => {
          const newLink = document.createElement('link');
          for (let i = 0; i < lnk.attributes.length; i++) {
            const attr = lnk.attributes[i];
            newLink.setAttribute(attr.name, attr.value);
          }
          document.head.appendChild(newLink);
          appendedHeadLinks.current.push(newLink);
        });

        // Clear container and append non-script body nodes
        container.innerHTML = '';
        Array.from(doc.body.childNodes).forEach((node) => {
          if (node.nodeName.toLowerCase() === 'script') return;
          container.appendChild(document.importNode(node, true));
        });

        // Execute scripts by recreating them so they run in page context
        const scripts = Array.from(doc.querySelectorAll('script')) as HTMLScriptElement[];
        // Save original window.onclick to restore on cleanup
        originalWindowOnclick.current = (window as any).onclick;

        for (const sc of scripts) {
          const newScript = document.createElement('script');
          for (let i = 0; i < sc.attributes.length; i++) {
            const attr = sc.attributes[i];
            newScript.setAttribute(attr.name, attr.value);
          }
          if (sc.src) {
            newScript.src = sc.src;
            newScript.async = false;
            container.appendChild(newScript);
            appendedScripts.current.push(newScript);
          } else {
            newScript.textContent = sc.textContent || '';
            container.appendChild(newScript);
            appendedScripts.current.push(newScript);
          }
        }

      } catch (err: any) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setWebsiteError(err?.message || String(err));
        }
      } finally {
        if (mounted) setWebsiteLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      controller.abort();
      // remove appended head links
      appendedHeadLinks.current.forEach((lnk) => lnk.remove());
      appendedHeadLinks.current = [];
      // remove appended scripts
      appendedScripts.current.forEach((sc) => sc.remove());
      appendedScripts.current = [];
      // restore original window onclick handler if we changed it
      try {
        (window as any).onclick = originalWindowOnclick.current;
      } catch (e) {
        // ignore
      }
    };
  }, [eventId, s?.id]);

  return (
    <div className="space-y-6">
      {/* Website Card - fetches embed HTML and injects into container */}
      <div>
        <div className="mb-3">
          <strong style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>
            Website Card
          </strong>
        </div>
        <div className="bg-muted p-8 rounded-lg border-2 border-dashed border-border">
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="w-full">
              <div className="text-sm text-muted-foreground text-center mb-2">
                {websiteLoading ? 'Loading website card...' : websiteError ? 'Failed to load website card' : 'Website card preview:'}
              </div>
              <div className="bg-white p-4 rounded" style={{ minHeight: 120, maxHeight: 600, overflow: 'auto' }}>
                {websiteError && <div className="text-destructive text-sm mb-2">{websiteError}</div>}
                <div ref={websiteContainerRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
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
    </div>
  );
}
