import { useState, useEffect } from "react";

export default function FakeLandingPage() {
  const [snippet, setSnippet] = useState("");
  const [bg, setBg] = useState("#ffffff");
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

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
      <div style={{ position: "fixed", bottom: 12, right: 12, background: "rgba(0,0,0,0.55)", color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontFamily: "monospace", zIndex: 9999, pointerEvents: "none" }}>
        {width}px
      </div>
    </div>
  );
}
