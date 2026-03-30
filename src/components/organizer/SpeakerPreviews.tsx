import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '@/lib/api';

type Props = {
  s: any;
  type: 'website' | 'promo';
};

export default function SpeakerPreviews({ s, type }: Props) {
  const { id: eventId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appendedHeadLinks = useRef<HTMLLinkElement[]>([]);
  const appendedScripts = useRef<HTMLScriptElement[]>([]);
  const originalWindowOnclick = useRef<any>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const appendedIframes = useRef<HTMLIFrameElement[]>([]);

  useEffect(() => {
    let mounted = true;
    const container = containerRef.current;
    if (!eventId || !s?.id || !container) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    const url = type === 'website'
      ? `${API_BASE}/embed/${encodeURIComponent(eventId)}/speaker/${encodeURIComponent(s.id)}`
      : `${API_BASE}/promo-cards/${encodeURIComponent(eventId)}/speaker/${encodeURIComponent(s.id)}`;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        const text = await resp.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Use an isolated iframe for the preview so styles and scripts from the
        // fetched HTML do not affect the host page. We inject a <base> tag so
        // relative URLs resolve against the original fetch URL.
        // Ensure a base href exists so relative asset URLs resolve correctly.
        if (!doc.querySelector('base')) {
          try {
            const baseEl = doc.createElement('base');
            baseEl.setAttribute('href', url);
            if (doc.head) doc.head.insertBefore(baseEl, doc.head.firstChild);
          } catch (e) {
            // ignore
          }
        }

        const serialized = doc.documentElement?.outerHTML || text;

        // Create iframe with the fetched HTML as srcdoc to fully isolate it.
        container.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('title', 'Speaker preview');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.width = '100%';
        iframe.style.minHeight = '1200px';
        iframe.style.border = '0';
        // Setting srcdoc runs the HTML in an isolated browsing context.
        iframe.srcdoc = serialized;
        container.appendChild(iframe);
        appendedIframes.current.push(iframe);

        // Preview rendered inside an isolated iframe (srcdoc); no DOM/script
        // injection into the host page is performed.
      } catch (err: any) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          if (mounted) setError(err?.message || String(err));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      controller.abort();
      appendedIframes.current.forEach(i => i.remove());
      appendedIframes.current = [];
      try { (window as any).onclick = originalWindowOnclick.current; } catch {}
    };
  }, [eventId, s?.id, type]);

  return (
    <div className="w-full rounded-lg border border-border overflow-auto">
      {loading && (
        <div className="p-8 flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-muted-foreground">Loading preview…</p>
        </div>
      )}
      {!loading && error && (
        <div className="p-8 flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {/* Always in DOM so ref is never null when the effect runs */}
      <div
        ref={containerRef}
        className={loading || error ? 'hidden' : 'w-full flex justify-center'}
        style={{ background: '#fff', padding: '16px', width: '100%', display: 'flex', justifyContent: 'center' }}
      />
    </div>
  );
}
