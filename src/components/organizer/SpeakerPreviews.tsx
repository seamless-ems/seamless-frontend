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

        Array.from(doc.querySelectorAll('link') as NodeListOf<HTMLLinkElement>).forEach((lnk) => {
          const newLink = document.createElement('link');
          for (let i = 0; i < lnk.attributes.length; i++) {
            newLink.setAttribute(lnk.attributes[i].name, lnk.attributes[i].value);
          }
          document.head.appendChild(newLink);
          appendedHeadLinks.current.push(newLink);
        });

        container.innerHTML = '';
        const firstNode = Array.from(doc.body.childNodes).find(n => n.nodeName.toLowerCase() !== 'script');
        if (firstNode) container.appendChild(document.importNode(firstNode, true));

        originalWindowOnclick.current = (window as any).onclick;
        Array.from(doc.querySelectorAll('script') as NodeListOf<HTMLScriptElement>).forEach((sc) => {
          const newScript = document.createElement('script');
          for (let i = 0; i < sc.attributes.length; i++) {
            newScript.setAttribute(sc.attributes[i].name, sc.attributes[i].value);
          }
          if (sc.src) { newScript.src = sc.src; newScript.async = false; }
          else { newScript.textContent = sc.textContent || ''; }
          container.appendChild(newScript);
          appendedScripts.current.push(newScript);
        });
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
      appendedHeadLinks.current.forEach(l => l.remove());
      appendedHeadLinks.current = [];
      appendedScripts.current.forEach(s => s.remove());
      appendedScripts.current = [];
      try { (window as any).onclick = originalWindowOnclick.current; } catch {}
    };
  }, [eventId, s?.id, type]);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
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
        className={loading || error ? 'hidden' : ''}
        style={{ background: '#fff', padding: '16px' }}
      />
    </div>
  );
}
