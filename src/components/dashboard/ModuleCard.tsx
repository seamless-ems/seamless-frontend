import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  enabled: boolean;
  stats?: {
    label: string;
    value: string | number;
  };
  color: "speaker" | "schedule" | "content" | "attendee";
  comingSoon?: boolean;
  index?: number;
}

const colorStyles = {
  speaker: {
    bg: "bg-speaker/10",
    text: "text-speaker",
    border: "border-speaker/20 hover:border-speaker/50",
    icon: "bg-speaker",
  },
  schedule: {
    bg: "bg-schedule/10",
    text: "text-schedule",
    border: "border-schedule/20 hover:border-schedule/50",
    icon: "bg-schedule",
  },
  content: {
    bg: "bg-content/10",
    text: "text-content",
    border: "border-content/20 hover:border-content/50",
    icon: "bg-content",
  },
  attendee: {
    bg: "bg-attendee/10",
    text: "text-attendee",
    border: "border-attendee/20 hover:border-attendee/50",
    icon: "bg-attendee",
  },
};

export function ModuleCard({
  title,
  description,
  icon,
  href,
  enabled,
  stats,
  color,
  comingSoon,
  index = 0,
}: ModuleCardProps) {
  const styles = colorStyles[color];

  const content = (
    <div
      className={cn(
        "group relative rounded-xl border-2 bg-card p-6 transition-all duration-300 animate-slide-up",
        enabled
          ? `${styles.border} hover:shadow-medium cursor-pointer`
          : "border-border opacity-60 cursor-not-allowed",
        comingSoon && "opacity-50"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {!enabled && !comingSoon && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5" />
            <span className="font-medium">Not in your plan</span>
          </div>
        </div>
      )}

      {comingSoon && (
        <Badge className="absolute top-4 right-4 bg-muted text-muted-foreground">
          Coming Soon
        </Badge>
      )}

      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl mb-4 text-primary-foreground transition-transform group-hover:scale-110",
          styles.icon
        )}
      >
        {icon}
      </div>

      <h3 className="font-display text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      {stats && enabled && (
        <div className={cn("rounded-lg p-3 mb-4", styles.bg)}>
          <p className={cn("text-2xl font-bold", styles.text)}>{stats.value}</p>
          <p className="text-xs text-muted-foreground">{stats.label}</p>
        </div>
      )}

      {enabled && !comingSoon && (
        <div
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-transform group-hover:translate-x-1",
            styles.text
          )}
        >
          <span>Open Module</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  if (enabled && !comingSoon) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
