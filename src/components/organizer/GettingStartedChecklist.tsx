import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  eventId: string;
  applicationFormConfigured: boolean;
  intakeFormConfigured: boolean;
  websiteCardConfigured: boolean;
  promoCardConfigured: boolean;
  embedVisited: boolean;
  onEditForm: (type: "speaker-info" | "call-for-speakers") => void;
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
  onEditForm,
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

  const steps: { label: string; done: boolean; action: () => void }[] = [
    {
      label: "Set up your Application form",
      done: applicationFormConfigured || skipped.has(0),
      action: () => onEditForm("call-for-speakers"),
    },
    {
      label: "Set up your Speaker Intake form",
      done: intakeFormConfigured || skipped.has(1),
      action: () => onEditForm("speaker-info"),
    },
    {
      label: "Build your Speaker Card template",
      done: websiteCardConfigured || skipped.has(2),
      action: () => navigate(`/organizer/event/${eventId}/website-card-builder`),
    },
    {
      label: "Build your Social Card template",
      done: promoCardConfigured || skipped.has(3),
      action: () => navigate(`/organizer/event/${eventId}/promo-card-builder`),
    },
    {
      label: "Set up your Speaker Wall",
      done: embedVisited || skipped.has(4),
      action: () => navigate(`/organizer/event/${eventId}/speakers/embed`),
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

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
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white shrink-0">
            <Check className="h-3 w-3" />
          </div>
          <span className="text-sm font-medium text-foreground">
            All set — your event is fully configured.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
          onClick={dismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5">
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-primary">Get started</span>
          <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">
            {completedCount} of {steps.length} complete
          </span>
        </div>
        {collapsed
          ? <ChevronDown className="h-4 w-4 text-primary/60 shrink-0" />
          : <ChevronUp className="h-4 w-4 text-primary/60 shrink-0" />
        }
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          {/* Progress bar */}
          <div className="h-1 bg-primary/10 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>

          <div className="space-y-1">
            {steps.map((step, i) => {
              const isSkipped = skipped.has(i);
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between py-2 gap-3",
                    i < steps.length - 1 && "border-b border-primary/10"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                        step.done && !isSkipped
                          ? "bg-primary border-primary text-primary-foreground"
                          : isSkipped
                          ? "bg-muted border-muted-foreground/30 text-muted-foreground"
                          : "border-primary/30 text-primary/60"
                      )}
                    >
                      {step.done && !isSkipped ? (
                        <Check className="h-3 w-3" />
                      ) : isSkipped ? (
                        <span>–</span>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm",
                        step.done
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {!step.done && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 px-2"
                        onClick={step.action}
                      >
                        Let's Go
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-muted-foreground hover:bg-muted px-2"
                        onClick={() => skipStep(i)}
                      >
                        Skip
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
