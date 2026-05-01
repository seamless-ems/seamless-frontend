import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";

const BREAKPOINT = 1024;

export default function MobileBlock() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < BREAKPOINT);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINT);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center p-8 text-center">
      <div className="flex items-baseline gap-1.5 mb-10">
        <span className="text-xl font-semibold text-primary tracking-tight">Seamless</span>
        <span className="text-xl font-light text-muted-foreground">Events</span>
      </div>

      <Monitor className="w-10 h-10 text-primary mb-6 opacity-80" />

      <h1 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
        Built for desktop
      </h1>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-8">
        Seamless Events is designed for laptop and desktop screens. For the best experience, open it on a larger device.
      </p>

      <button
        onClick={() => setDismissed(true)}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
      >
        Continue anyway
      </button>
    </div>
  );
}
