import { Link, useNavigate } from "react-router-dom";
import { MoreVertical, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteEvent } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import React from "react";
import { Event } from "@/types/event";

interface EventCardProps {
  event: Event;
  index?: number;
  onDelete?: (id: string) => Promise<void> | void;
}

const formatDateRange = (start?: string, end?: string) => {
  try {
    if (!start) return "";
    const startDate = new Date(start);
    if (!end) {
      return startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    const endDate = new Date(end);
    const sameYear = startDate.getFullYear() === endDate.getFullYear();
    const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();

    if (sameMonth) {
      return `${startDate.toLocaleDateString("en-US", { month: "long" })} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
    } else if (sameYear) {
      return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}, ${startDate.getFullYear()}`;
    } else {
      return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    }
  } catch {
    return "";
  }
};

export function EventCard({ event, index = 0, onDelete }: EventCardProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  return (
    <Link
      to={`/organizer/event/${event.id}`}
      className="group block rounded-lg border border-border bg-card p-6 transition-all duration-200 hover:border-primary hover:shadow-sm"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors" style={{ fontSize: 'var(--font-h2)' }}>
          {event.title}
        </h3>

        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => {
              e.preventDefault();
              // Stop the click from bubbling to the parent Link which would navigate
              e.stopPropagation();
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => {
              // Prevent clicks inside the menu from triggering the parent Link
              e.stopPropagation();
            }}
          >
            <DropdownMenuItem asChild>
              <Link to={`/organizer/event/${event.id}`}>Open Event</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/organizer/event/${event.id}/settings`}>Edit Event</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive flex items-center gap-2"
              onSelect={(e) => {
                e.preventDefault();
                // stop propagation so the Link doesn't handle this click
                (e as any).stopPropagation?.();
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                asChild
                onClick={async () => {
                  try {
                    setDeleting(true);
                    if (typeof onDelete === "function") {
                      await onDelete(event.id);
                    } else {
                      await deleteEvent(event.id);
                    }
                    toast({ title: "Event deleted" });
                    setConfirmOpen(false);
                    // If no onDelete handler provided, navigate back to events list
                    if (typeof onDelete !== "function") navigate('/organizer/events');
                  } catch (err: any) {
                    console.error("Failed to delete event", err);
                    toast({ title: "Failed to delete event", description: String(err?.message || err) });
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                <Button variant="destructive" disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-1 mb-4 text-muted-foreground" style={{ fontSize: 'var(--font-small)' }}>
        <div>{formatDateRange(event.startDate, event.endDate)}</div>
        <div>{event.location}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(() => {
          const raw = event.modules;
          let modulesArray: any[] = [];
          if (Array.isArray(raw)) modulesArray = raw;
          else if (!raw) modulesArray = [];
          else if (typeof raw === "string") modulesArray = (raw as any).split(",").map((name: string) => ({ id: name.trim(), name: name.trim(), enabled: true }));
          else if (typeof raw === "object") {
            const entries = Object.entries(raw as any);
            modulesArray = entries.map(([key, val]) => {
              if (val && typeof val === "object") return { id: key, name: key, ...val };
              return { id: key, name: key, enabled: !!val };
            });
          } else modulesArray = [];

          return modulesArray.filter(m => m.enabled).map((module, idx) => (
            <Badge
              key={module.id || `${module.name}-${idx}`}
              className="capitalize bg-primary text-white"
              style={{ fontSize: 'var(--font-tiny)' }}
            >
              {module.name}
            </Badge>
          ));
        })()}
      </div>
    </Link>
  );
}
