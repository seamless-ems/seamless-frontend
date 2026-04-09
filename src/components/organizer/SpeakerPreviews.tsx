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
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const appendedIframes = useRef<HTMLIFrameElement[]>([]);

  // Native card width: website = 600px, social/promo = 1080px
  const nativeWidth = type === 'website' ? 600 : 1080;

  // Track outer container width via ResizeObserver
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = containerWidth > 0 ? Math.min(1, containerWidth / nativeWidth) : 1;

  useEffect(() => {
    let mounted = true;
    const container = innerRef.current;
    if (!eventId || !s?.id || !container) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    const url = type === 'website'
      ? `${API_BASE}/embed/${encodeURIComponent(eventId)}/speaker/${encodeURIComponent(s.id)}`
      : `${API_BASE}/promo-cards/${encodeURIComponent(eventId)}/speaker/${encodeURIComponent(s.id)}`;

    const load = async () => {
      setLoading(true);
      setError(null);
      setContentHeight(0);
      try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        const text = await resp.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        if (!doc.querySelector('base')) {
          try {
            const baseEl = doc.createElement('base');
            baseEl.setAttribute('href', url);
            if (doc.head) doc.head.insertBefore(baseEl, doc.head.firstChild);
          } catch {}
        }

        const serialized = doc.documentElement?.outerHTML || text;

        container.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('title', 'Speaker preview');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.cssText = `width:${nativeWidth}px;height:1px;border:0;display:block;`;
        iframe.onload = () => {
          try {
            const h =
              iframe.contentDocument?.documentElement?.scrollHeight ||
              iframe.contentDocument?.body?.scrollHeight ||
              nativeWidth;
            if (mounted) setContentHeight(h);
            iframe.style.height = `${h}px`;
          } catch {}
        };
        iframe.srcdoc = serialized;
        container.appendChild(iframe);
        appendedIframes.current.push(iframe);
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
    };
  }, [eventId, s?.id, type]);

  return (
    <div ref={outerRef} className="w-full rounded-lg border border-border overflow-hidden bg-white">
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
      {/* Scale wrapper: outer clips to scaled height, inner transforms to native width */}
      {!loading && !error && (
        <div
          style={{
            width: '100%',
            overflow: 'hidden',
            height: contentHeight ? Math.round(contentHeight * scale) : undefined,
          }}
        >
          <div
            ref={innerRef}
            style={{
              width: nativeWidth,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
            }}
          />
        </div>
      )}
    </div>
  );
}
