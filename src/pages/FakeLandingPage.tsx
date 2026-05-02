import { useState, useEffect } from "react";

export default function FakeLandingPage() {
  const [snippet, setSnippet] = useState("");
  const [bg, setBg] = useState("#ffffff");
  const [width, setWidth] = useState(() => window.innerWidth);
  const [iframes, setIframes] = useState<any[]>([]);
  const [simHeight, setSimHeight] = useState(800);
  const [flexChecks, setFlexChecks] = useState<any[]>([]);
  const [originalWidths, setOriginalWidths] = useState<Map<Element, string>>(new Map());
  const [snippetType, setSnippetType] = useState<"autoresize"|"iframe"|"url"|null>(null);
  const [showOutline, setShowOutline] = useState(true);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const simulateResize = (h: number) => {
    try {
      console.log("Simulating resize to height:", h);
      window.postMessage({ type: 'seamless:resize', height: h }, '*');
    } catch {}
    try {
      // Also directly adjust any iframe & container heights in this preview so visual feedback is immediate
      const els = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
      els.forEach((el) => {
        try {
          el.style.height = `${Math.max(100, h)}px`;
          const c = el.parentElement as HTMLElement | null;
          if (c) c.style.height = `${Math.max(100, h)}px`;
        } catch {}
      });
    } catch (e) {}
  };

  const findFlexContainers = () => {
    try {
      const all = Array.from(document.querySelectorAll('*')) as HTMLElement[];
      const flexEls = all.filter((el) => {
        try {
          const style = window.getComputedStyle(el);
          return style.display === 'flex' && style.flexWrap !== 'nowrap';
        } catch {
          return false;
        }
      });

      const results = flexEls.map((el, idx) => {
        const children = Array.from(el.children).filter((c) => (c as HTMLElement).offsetParent !== null) as HTMLElement[];
        const tops = children.map((c) => Math.round((c as HTMLElement).getBoundingClientRect().top));
        const uniqueTops = Array.from(new Set(tops)).filter((v) => !isNaN(v));
        const wraps = uniqueTops.length > 1;
        const summary = {
          id: el.id || `flex-${idx}`,
          tag: el.tagName.toLowerCase(),
          class: el.className ? String(el.className).split(' ')[0] : '',
          el,
          childrenCount: children.length,
          rows: uniqueTops.length || 0,
          wraps,
        };
        return summary;
      });
      setFlexChecks(results);
      return results;
    } catch (e) {
      setFlexChecks([]);
      return [];
    }
  };

  const simulateMobileWidth = (w = 360) => {
    const checks = flexChecks.length ? flexChecks : findFlexContainers();
    const saved = new Map(originalWidths);
    checks.forEach((c: any) => {
      try {
        const el = c.el as HTMLElement;
        if (!saved.has(el)) saved.set(el, el.style.width || '');
        el.style.width = `${w}px`;
        el.style.minWidth = '';
      } catch {}
    });
    setOriginalWidths(saved);
    // run detection after layout settles
    setTimeout(() => findFlexContainers(), 120);
  };

  const restoreWidths = () => {
    try {
      originalWidths.forEach((val, el) => {
        try { (el as HTMLElement).style.width = val || ''; } catch {}
      });
    } catch {}
    setOriginalWidths(new Map());
    setTimeout(() => findFlexContainers(), 120);
  };

  useEffect(() => {
    // determine snippet type for visual hints and monitor iframe sizes
    try {
      if (snippet.includes('seamless:resize')) setSnippetType('autoresize');
      else if (snippet.includes('<iframe')) setSnippetType('iframe');
      else setSnippetType('url');
    } catch {}

    let mounted = true;
    const update = () => {
      const els = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
      const info = els.map((el, idx) => {
        const rect = el.getBoundingClientRect();
        const transform = (el.style.transform || '') as string;
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
        return {
          id: el.id || `iframe-${idx}`,
          src: el.src,
          height: el.offsetHeight,
          clientHeight: el.clientHeight,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          scale,
        };
      });
      if (mounted) setIframes(info);
      // apply persistent outline to iframe containers when enabled
      try {
        const color = snippetType === 'autoresize' ? '#6678dc' : snippetType === 'iframe' ? '#3b82f6' : '#9ca3af';
        els.forEach((el) => {
          const container = (el.parentElement as HTMLElement) || (el as HTMLElement);
          if (showOutline) {
            container.style.boxShadow = `inset 0 0 0 3px ${color}`;
            container.style.transition = 'box-shadow 200ms ease';
          } else {
            container.style.boxShadow = '';
          }
        });
      } catch {}
    };
    const id = window.setInterval(update, 300);
    update();
    return () => { mounted = false; clearInterval(id); };
  }, [snippet]);

  useEffect(() => {
    const bc = new BroadcastChannel("seamless-preview");
    bc.onmessage = (e) => {
      if (e.data?.type === "seamless:preview-update") {
        if (e.data.snippet !== undefined) setSnippet(e.data.snippet);
        if (e.data.bg !== undefined) setBg(e.data.bg || "#ffffff");
      }
    };
    return () => bc.close();
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      const rawBg = params.get("bg");
      if (rawBg) setBg(decodeURIComponent(rawBg));

      const snippetId = params.get("snippetId");
      if (snippetId) {
        const stored = localStorage.getItem(snippetId);
        if (stored) {
          setSnippet(stored);
          try { localStorage.removeItem(snippetId); } catch {}
          return;
        }
      }

      const inline = params.get("snippet");
      if (inline) setSnippet(decodeURIComponent(inline));
    } catch {}
  }, []);

  return (
    <div style={{ background: bg, minHeight: "100vh", width: "100%" }}>
      {snippet ? (
        <div dangerouslySetInnerHTML={{ __html: snippet }} />
      ) : (
        <div style={{ padding: 40, color: "#888", fontFamily: "sans-serif" }}>
          No snippet provided.
        </div>
      )}
      {/* Visual helper panel */}
      <div style={{ position: "fixed", left: 12, bottom: 12, background: "rgba(255,255,255,0.92)", color: "#111", padding: 12, borderRadius: 8, fontSize: 13, fontFamily: "sans-serif", zIndex: 2147483647, boxShadow: '0 4px 18px rgba(0,0,0,0.12)', pointerEvents: 'auto', transform: 'translateZ(0)' }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Preview helpers</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ padding: '4px 8px', borderRadius: 6, background: snippetType === 'autoresize' ? '#ecfdf5' : snippetType === 'iframe' ? '#eff6ff' : '#f3f4f6', color: snippetType === 'autoresize' ? '#065f46' : '#1e3a8a' }}>{snippetType ?? 'none'}</div>
          <div style={{ fontSize: 12, color: '#333' }}>{iframes.length} iframe(s)</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: '#666' }}>
            <input type="checkbox" checked={showOutline} onChange={(e) => setShowOutline(e.target.checked)} style={{ marginRight: 8 }} />
            Outline iframes
          </label>
        </div>

        {iframes.map((f, i) => (
          <div key={f.id || i} style={{ marginBottom: 6, padding: 6, borderRadius: 6, background: '#fff', border: '1px solid #eee' }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{f.id}</div>
            <div style={{ fontSize: 12, color: '#444' }}>height: {f.height}px • clientHeight: {f.clientHeight}px • scale: {f.scale}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <button onClick={() => {
                const el = document.querySelectorAll('iframe')[i] as HTMLElement | undefined;
                if (!el) return;
                const container = el.parentElement as HTMLElement | undefined;
                if (container) container.style.zIndex = '2147483646';
                el.style.outline = '3px solid rgba(99,102,241,0.95)';
                setTimeout(() => { if (container) container.style.zIndex = ''; el.style.outline = ''; }, 1400);
              }} style={{ fontSize: 12, padding: '6px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}>Highlight</button>
              <button onClick={() => simulateResize(Math.max(200, f.height - 100))} style={{ fontSize: 12, padding: '6px 10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}>Sim shrink</button>
              <button onClick={() => simulateResize(f.height + 200)} style={{ fontSize: 12, padding: '6px 10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}>Sim grow</button>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: '#fff', border: '1px solid #eee' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Flex-wrap check (mobile)</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => findFlexContainers()} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, cursor: 'pointer', background: '#f3f4f6', border: '1px solid #e5e7eb' }}>Find flex containers</button>
            <button onClick={() => simulateMobileWidth(360)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Sim mobile (360px)</button>
            <button onClick={() => simulateMobileWidth(375)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Sim mobile (375px)</button>
            <button onClick={() => restoreWidths()} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, cursor: 'pointer', background: '#fff', border: '1px solid #e5e7eb' }}>Restore widths</button>
          </div>
          <div style={{ maxHeight: 180, overflow: 'auto' }}>
            {flexChecks.length === 0 ? (
              <div style={{ color: '#666', fontSize: 12 }}>No flex containers detected. Click "Find flex containers".</div>
            ) : (
              flexChecks.map((c: any, idx: number) => (
                <div key={c.id || idx} style={{ marginBottom: 8, padding: 6, borderRadius: 6, background: '#fafafa', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{c.tag}{c.class ? ` .${c.class}` : ''}{c.id && c.id.startsWith('flex-') ? '' : ` #${c.id}`}</div>
                  <div style={{ fontSize: 12, color: '#444' }}>{c.childrenCount} children • rows: {c.rows} • wraps: {c.wraps ? 'yes' : 'no'}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <button onClick={() => {
                      try {
                        const el = c.el as HTMLElement;
                        el.style.outline = '2px solid rgba(16,185,129,0.95)';
                        setTimeout(() => { el.style.outline = ''; }, 1400);
                      } catch {}
                    }} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: '#fff', border: '1px solid #e5e7eb' }}>Highlight</button>
                    <button onClick={() => {
                      try { (c.el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
                    }} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: '#fff', border: '1px solid #e5e7eb' }}>Scroll</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="number" value={simHeight} onChange={(e) => setSimHeight(parseInt(e.target.value || '0', 10))} style={{ width: 84, padding: '6px 8px', fontSize: 13 }} />
          <button onClick={() => simulateResize(simHeight)} style={{ padding: '6px 10px' }}>Simulate resize</button>
        </div>
      </div>
      <div style={{ position: "fixed", bottom: 12, right: 12, background: "rgba(0,0,0,0.55)", color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontFamily: "monospace", zIndex: 9999, pointerEvents: "none" }}>
        {width}px
      </div>
    </div>
  );
}
