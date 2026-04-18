import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HelpTipProps {
  title?: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  /** compact: icon-only trigger for tight spaces (e.g. table column headers) */
  compact?: boolean;
  /** label shown on the pill trigger — default "How this works" */
  label?: string;
}

export function HelpTip({
  title,
  children,
  side = "bottom",
  align = "start",
  className,
  compact = false,
  label = "How this works",
}: HelpTipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {compact ? (
          <button
            type="button"
            className="inline-flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors focus-visible:outline-none"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary/50 border border-secondary text-primary/60 hover:bg-secondary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <HelpCircle className="h-3 w-3" />
            {label}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className={cn("w-max max-w-lg p-0 overflow-hidden border border-primary/25 shadow-lg", className)}>
        <div className="h-1 bg-primary/50 w-full" />
        <div className="p-4">
          {title && (
            <p className="text-sm font-semibold text-foreground mb-3">{title}</p>
          )}
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            {children}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
