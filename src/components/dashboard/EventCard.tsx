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
import { createCheckout } from '@/lib/api';
import { useState } from 'react';

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
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const isEventPaid = (ev: any) => {
    if (!ev) return false;
    if (ev.paid === true || ev.is_paid === true || ev.paid === 'true') return true;
    if (ev.paid_until || ev.paidUntil || ev.purchase_id || ev.purchaseId) return true;
    if (ev.subscription || ev.billing || (ev.purchase && typeof ev.purchase === 'object')) return true;
    return false;
  };
  const paid = isEventPaid(event);
  const targetLink = event.userRole === 'speaker' ? `/speaker/${event.speakerId}/event/${event.id}` : `/organizer/event/${event.id}/speakers`;

  const trialEnded = (event as any).trialEnded ?? (event as any).trial_ended ?? false;
  const isOrganizer = event.userRole === 'organizer' || (event as any).user_role === 'organizer';

  const handlePayNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!event?.id) return;
    setCreatingCheckout(true);
    try {
      const res = await createCheckout('speaker', String(event.id));
      const url = res?.url || res?.checkout_url || res?.redirect_url || res?.checkoutUrl || (typeof res === 'string' ? res : undefined) || res?.data?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast({ title: 'Checkout created', description: 'No redirect URL returned; please check your billing dashboard.' });
      }
    } catch (err: any) {
      toast({ title: 'Checkout failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setCreatingCheckout(false);
    }
  };

  return (
    <Link
      to={targetLink}
      className="group block rounded-lg border border-border bg-card p-6 transition-all duration-200 hover:border-primary hover:shadow-sm"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2" style={{ fontSize: 'var(--font-h2)' }}>
          <span>{event.title}</span>
          {paid ? (
            <Badge variant="outline" className="text-success">Paid</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Free</Badge>
          )}
          {event.userRole && (
            <Badge
              variant="outline"
              className={`ml-1 text-xs ${
                event.userRole === 'organizer' ? 'text-primary' : event.userRole === 'speaker' ? 'text-blue-600' : 'text-muted-foreground'
              }`}
            >
              {String(event.userRole).charAt(0).toUpperCase() + String(event.userRole).slice(1)}
            </Badge>
          )}
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
              <Link to={`/organizer/event/${event.id}/speakers`}>Open Event</Link>
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

          {trialEnded && isOrganizer && !paid && (
        <div className="mb-4 p-3 rounded-md border-l-4 border-warning bg-warning/5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-warning">Your trial has ended for this event. Upgrade to continue full access.</div>
            <Button size="sm" onClick={handlePayNow} disabled={creatingCheckout}>
              {creatingCheckout ? 'Processing…' : 'Pay now'}
            </Button>
          </div>
        </div>
      )}

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
