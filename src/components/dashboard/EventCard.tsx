import { Link } from "react-router-dom";
import { Calendar, MapPin, Users, Mic2, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Event } from "@/types/event";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: Event;
  index?: number;
}

const statusStyles = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
};

export function EventCard({ event, index = 0 }: EventCardProps) {
  return (
    <div
      className="group rounded-xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-medium hover:border-primary/30 animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <Badge
              variant="outline"
              className={cn("capitalize", statusStyles[event.status])}
            >
              {event.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{event.dates}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/event/${event.id}`}>Open Event</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/event/${event.id}/settings`}>Edit Event</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Delete Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-speaker/10 text-speaker">
            <Mic2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {event.speakerCount}
            </p>
            <p className="text-xs text-muted-foreground">Speakers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attendee/10 text-attendee">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {event.attendeeCount}
            </p>
            <p className="text-xs text-muted-foreground">Attendees</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(event.modules ?? []).map((module) => (
          <Badge
            key={module.id}
            variant={module.enabled ? "default" : "outline"}
            className={cn(
              "capitalize",
              module.enabled &&
                module.name === "speaker" &&
                "bg-speaker text-primary-foreground",
              module.enabled &&
                module.name === "schedule" &&
                "bg-schedule text-accent-foreground",
              module.enabled &&
                module.name === "content" &&
                "bg-content text-foreground",
              !module.enabled && "opacity-50"
            )}
          >
            {module.name}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          {event.googleDriveLinked ? (
            <Badge variant="outline" className="text-success border-success/30">
              Google Drive Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Drive Not Linked
            </Badge>
          )}
        </div>
        <Button variant="teal" size="sm" asChild>
          <Link to={`/event/${event.id}`}>Manage Event</Link>
        </Button>
      </div>
    </div>
  );
}
