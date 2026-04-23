import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronUp,
  X,
  ClipboardList,
  FileText,
  LayoutTemplate,
  Image,
  Monitor,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  eventId: string;
  applicationFormConfigured: boolean;
  intakeFormConfigured: boolean;
  websiteCardConfigured: boolean;
  promoCardConfigured: boolean;
  embedVisited: boolean;
  hasSpeakers?: boolean;
  onEditForm: (type: "speaker-info" | "call-for-speakers") => void;
  onAddSpeaker?: () => void;
  activeStep?: number;
}

const COLLAPSED_KEY = (id: string) => `seamless-onboarding-checklist-${id}`;
const SKIPPED_KEY = (id: string) => `seamless-checklist-skipped-${id}`;
const DISMISSED_KEY = (id: string) => `seamless-checklist-dismissed-${id}`;

function loadSkipped(eventId: string): Set<number> {
  try {
    const raw = localStorage.getItem(SKIPPED_KEY(eventId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSkipped(eventId: string, skipped: Set<number>) {
  try { localStorage.setItem(SKIPPED_KEY(eventId), JSON.stringify([...skipped])); } catch {}
}

export default function GettingStartedChecklist({
  eventId,
  applicationFormConfigured,
  intakeFormConfigured,
  websiteCardConfigured,
  promoCardConfigured,
  embedVisited,
  hasSpeakers,
  onEditForm,
  onAddSpeaker,
}: Props) {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY(eventId)) === "collapsed"; } catch { return false; }
  });

  const [skipped, setSkipped] = useState<Set<number>>(() => loadSkipped(eventId));

  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY(eventId)) === "true"; } catch { return false; }
  });

  const skipStep = (index: number) => {
    const next = new Set(skipped);
    next.add(index);
    setSkipped(next);
    saveSkipped(eventId, next);
  };

  const steps: {
    label: string;
    cta: string;
    icon: React.ElementType;
    done: boolean;
    action: () => void;
  }[] = [
    {
      label: "Application Form",
      cta: "Set up",
      icon: ClipboardList,
      done: applicationFormConfigured || skipped.has(0),
      action: () => onEditForm("call-for-speakers"),
    },
    {
      label: "Intake Form",
      cta: "Set up",
      icon: FileText,
      done: intakeFormConfigured || skipped.has(1),
      action: () => onEditForm("speaker-info"),
    },
    {
      label: "Speaker Card",
      cta: "Build",
      icon: LayoutTemplate,
      done: websiteCardConfigured || skipped.has(2),
      action: () => navigate(`/organizer/event/${eventId}/website-card-builder`),
    },
    {
      label: "Social Card",
      cta: "Build",
      icon: Image,
      done: promoCardConfigured || skipped.has(3),
      action: () => navigate(`/organizer/event/${eventId}/promo-card-builder`),
    },
    {
      label: "Speaker Wall",
      cta: "Set up",
      icon: Monitor,
      done: embedVisited || skipped.has(4),
      action: () => navigate(`/organizer/event/${eventId}/speakers/embed`),
    },
    {
      label: "Add a Speaker",
      cta: "Add",
      icon: UserPlus,
      done: !!hasSpeakers || skipped.has(5),
      action: () => onAddSpeaker?.(),
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  // Auto-dismiss 2 seconds after all steps complete
  React.useEffect(() => {
    if (!allDone || dismissed) return;
    const t = setTimeout(() => dismiss(), 2000);
    return () => clearTimeout(t);
  }, [allDone, dismissed]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY(eventId), next ? "collapsed" : "open"); } catch {}
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY(eventId), "true"); } catch {}
  };

  if (dismissed) return null;

  if (allDone) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Check className="h-4 w-4 text-success shrink-0" />
          <span className="text-sm font-medium text-foreground">All set — your event is fully configured.</span>
        </div>
        <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors" onClick={dismiss}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      {/* Header */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-foreground">Get started</span>
          <span className="text-xs text-muted-foreground/60">{completedCount} of {steps.length}</span>
        </div>
        {collapsed
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        }
      </button>

      {/* Progress bar */}
      <div className="h-px w-full bg-border">
        <div
          className="h-px bg-accent/60 transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {!collapsed && (
        <div className="grid grid-cols-6 divide-x divide-border">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className={cn(
                  "flex flex-col gap-2 px-4 py-3.5",
                  step.done ? "opacity-40" : ""
                )}
              >
                {/* Icon + label */}
                <div className="flex items-center gap-2">
                  {step.done
                    ? <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    : <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  }
                  <span className="text-xs font-medium text-foreground leading-tight">
                    {step.label}
                  </span>
                </div>

                {/* CTA + Skip */}
                {!step.done && (
                  <div className="flex items-center gap-1.5 pl-[1.375rem]">
                    <button
                      className="text-xs font-medium text-accent hover:text-accent/70 transition-colors"
                      onClick={step.action}
                    >
                      {step.cta}
                    </button>
                    <span className="text-muted-foreground/30 select-none">·</span>
                    <button
                      className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      onClick={() => skipStep(i)}
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
