import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '@/lib/api';
import { toPng } from 'html-to-image';
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
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const websiteContainerRef = useRef<HTMLDivElement | null>(null);
  const promoContainerRef = useRef<HTMLDivElement | null>(null);
  const appendedHeadLinks = useRef<HTMLLinkElement[]>([]);
  const appendedScripts = useRef<HTMLScriptElement[]>([]);
  const appendedHeadLinksPromo = useRef<HTMLLinkElement[]>([]);
  const appendedScriptsPromo = useRef<HTMLScriptElement[]>([]);
  const originalWindowOnclick = useRef<any>(null);
  const originalWindowOnclickPromo = useRef<any>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const controllerRefPromo = useRef<AbortController | null>(null);

  // Use html-to-image's toPng for exporting DOM nodes to PNG.

  const handleDownloadPromo = async () => {
    if (!promoContainerRef.current) return;
    // find first element node inside container (the embedded card)
    const el = Array.from(promoContainerRef.current.children).find((c) => c.nodeType === 1) as HTMLElement | undefined;
    if (!el) {
      setPromoError('No promo card found to download');
      return;
    }
    setPromoLoading(true);
    try {
      const dataUrl = await toPng(el, { cacheBust: true, useCORS: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = (s?.name || 'promo-card').replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
      a.download = `${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setPromoError(err?.message || String(err));
    } finally {
      setPromoLoading(false);
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

        // Clear container and append only the first non-script body node (show embed once)
        container.innerHTML = '';
        const firstNode = Array.from(doc.body.childNodes).find((node) => node.nodeName.toLowerCase() !== 'script');
        if (firstNode) {
          container.appendChild(document.importNode(firstNode, true));
        }

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

  // Fetch and embed promo card HTML (served by the SPA embed route)
  useEffect(() => {
    let mounted = true;
    const container = promoContainerRef.current;

    if (!eventId || !s?.id || !container) return;

    const controller = new AbortController();
    controllerRefPromo.current = controller;

    const load = async () => {
      setPromoLoading(true);
      setPromoError(null);
      try {
        const url = `${API_BASE}/promo-cards/${encodeURIComponent(eventId)}/speaker/${encodeURIComponent(s.id)}`;
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error(`Failed to load promo card: ${resp.status} ${resp.statusText}`);
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
          appendedHeadLinksPromo.current.push(newLink);
        });

        // Clear container and append only the first non-script body node (show embed once)
        container.innerHTML = '';
        const firstNode = Array.from(doc.body.childNodes).find((node) => node.nodeName.toLowerCase() !== 'script');
        if (firstNode) {
          container.appendChild(document.importNode(firstNode, true));
        }

        // Execute scripts by recreating them so they run in page context
        const scripts = Array.from(doc.querySelectorAll('script')) as HTMLScriptElement[];
        // Save original window.onclick to restore on cleanup
        originalWindowOnclickPromo.current = (window as any).onclick;

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
            appendedScriptsPromo.current.push(newScript);
          } else {
            newScript.textContent = sc.textContent || '';
            container.appendChild(newScript);
            appendedScriptsPromo.current.push(newScript);
          }
        }

      } catch (err: any) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setPromoError(err?.message || String(err));
        }
      } finally {
        if (mounted) setPromoLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      controller.abort();
      // remove appended head links
      appendedHeadLinksPromo.current.forEach((lnk) => lnk.remove());
      appendedHeadLinksPromo.current = [];
      // remove appended scripts
      appendedScriptsPromo.current.forEach((sc) => sc.remove());
      appendedScriptsPromo.current = [];
      // restore original window onclick handler if we changed it
      try {
        (window as any).onclick = originalWindowOnclickPromo.current;
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
            <div className="w-full">
              <div className="text-sm text-muted-foreground text-center mb-2">
                {promoLoading ? 'Loading promo card...' : promoError ? 'Failed to load promo card' : 'Promo card preview:'}
              </div>
              <div className="flex items-center justify-end mb-3">
                <Button variant="outline" size="sm" onClick={handleDownloadPromo} disabled={promoLoading}>
                  {promoLoading ? 'Preparing PNG...' : 'Download PNG'}
                </Button>
              </div>
              <div className="bg-white p-4 rounded" style={{ minHeight: 120, maxHeight: 600, overflow: 'auto' }}>
                {promoError && <div className="text-destructive text-sm mb-2">{promoError}</div>}
                <div ref={promoContainerRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
