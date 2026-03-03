import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ShadowContainerProps {
  children: React.ReactNode;
  injectStyles?: string;
  className?: string;
}

export default function ShadowContainer({ children, injectStyles, className }: ShadowContainerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let sr = hostRef.current.shadowRoot as ShadowRoot | null;
    if (!sr) {
      sr = hostRef.current.attachShadow({ mode: "open" });
    }

    // Inject a style tag to reset app styles inside Shadow DOM and optionally load fonts
    if (injectStyles) {
      const existing = sr.querySelector('style[data-injected]');
      if (!existing) {
        const style = document.createElement("style");
        style.setAttribute("data-injected", "true");
        style.textContent = injectStyles;
        sr.appendChild(style);
      }
    }

    setShadowRoot(sr);

    return () => {
      // don't remove shadow root on unmount to avoid tearing down mounted portal unexpectedly
    };
  }, [injectStyles]);

  return (
    <div ref={hostRef} className={className}>
      {shadowRoot ? createPortal(children, shadowRoot) : null}
    </div>
  );
}
