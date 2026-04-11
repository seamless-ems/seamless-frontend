import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '@/lib/api';
import { ZoomIn, ZoomOut } from 'lucide-react';

type Props = {
  s: any;
  type: 'website' | 'promo';
};

export default function SpeakerPreviews({ s, type }: Props) {
  const { id: eventId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [cardDims, setCardDims] = useState<{ w: number; h: number } | null>(null);
  const [userZoom, setUserZoom] = useState(1.0);

  const outerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef<HTMLDivElement | null>(null); // always in DOM — iframe appended here
  const controllerRef = useRef<AbortController | null>(null);
  const appendedIframes = useRef<HTMLIFrameElement[]>([]);

  // Fallback native width used before card dimensions are measured
  const nativeWidth = type === 'website' ? 600 : 1080;

  // Measure container width via ResizeObserver
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fetch and render the card inside an iframe
  useEffect(() => {
    let mounted = true;
    const container = scaleRef.current;
    if (!eventId || !s?.id || !container) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    const url = type === 'website'
      ? `${API_BASE}/embed/${encodeURIComponent(eventId)}/speaker/${encodeURIComponent(s.id)}`
      : `${API_BASE}/promo-cards/${encodeURIComponent(eventId)}/speaker/${encodeURIComponent(s.id)}`;

    const load = async () => {
      setLoading(true);
      setError(null);
      setCardDims(null);
      try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        const text = await resp.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Base href so relative asset URLs resolve correctly
        if (!doc.querySelector('base')) {
          try {
            const baseEl = doc.createElement('base');
            baseEl.setAttribute('href', url);
            if (doc.head) doc.head.insertBefore(baseEl, doc.head.firstChild);
          } catch {}
        }

        // Suppress iframe-internal scrollbars
        try {
          const styleEl = doc.createElement('style');
          styleEl.textContent = 'html,body{overflow:hidden!important;margin:0!important;padding:0!important;}';
          doc.head?.appendChild(styleEl);
        } catch {}

        const serialized = doc.documentElement?.outerHTML || text;

        container.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('title', 'Speaker preview');
        iframe.setAttribute('aria-hidden', 'true');
        // Start oversized — measure actual card dims after load, then resize
        iframe.style.cssText = `width:2000px;height:2000px;border:0;display:block;`;
        iframe.onload = () => {
          try {
            const w = iframe.contentDocument?.documentElement?.scrollWidth || nativeWidth;
            const h = iframe.contentDocument?.documentElement?.scrollHeight || nativeWidth;
            if (mounted) setCardDims({ w, h });
            iframe.style.width = `${w}px`;
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

  // Scale: fit card to container width (cap at 1 — no upscaling at default zoom)
  const cardW = cardDims?.w || nativeWidth;
  const cardH = cardDims?.h || nativeWidth;
  const fitScale = containerWidth > 0 && cardW > 0
    ? Math.min(1, containerWidth / cardW)
    : 1;
  const scale = Math.min(Math.max(fitScale * userZoom, 0.1), 3);
  const displayWidth = Math.round(cardW * scale);
  const displayHeight = Math.round(cardH * scale);
  const scalePct = Math.round(scale * 100);

  // When zoomed wider than the container, centre the scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || displayWidth <= containerWidth) return;
    el.scrollLeft = (displayWidth - containerWidth) / 2;
  }, [displayWidth, containerWidth]);

  return (
    <div ref={outerRef} className="w-full">
      {/* Zoom controls — top bar */}
      {!loading && !error && cardDims && (
        <div className="flex items-center justify-end gap-1 pb-3">
          <button
            onClick={() => setUserZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.25))}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">{scalePct}%</span>
          <button
            onClick={() => setUserZoom(z => Math.min(+(z + 0.25).toFixed(2), 3))}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

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

      {/*
        Scroll wrapper — overflow-x:auto so the card can be scrolled when zoomed
        beyond the container width. scrollRef lets us centre the scroll position.
        Scale wrapper inside is always in DOM so scaleRef is never null.
      */}
      <div ref={scrollRef} style={{ overflowX: 'auto', display: loading || error ? 'none' : 'block' }}>
      <div
        style={{
          width: displayWidth,
          height: displayHeight,
          overflow: 'hidden',
          position: 'relative',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <div
          ref={scaleRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: cardW,
            height: cardH,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
        />
      </div>
      </div>
    </div>
  );
}
