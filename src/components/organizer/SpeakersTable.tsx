import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DropdownMenu as DM } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { updateSpeaker, deleteSpeaker } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type Props = {
  speakers: any[];
  isLoading: boolean;
  eventId?: string | undefined;
};

export default function SpeakersTable({ speakers, isLoading, eventId }: Props) {
  const queryClient = useQueryClient();

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading speakers…</div>;
  }

  if (!speakers || speakers.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">No speakers found</div>;
  }

  return (
    <table className="w-full">
      <thead className="border-b border-border bg-muted/30">
        <tr>
          <th className="px-2 py-3 text-left text-xs font-bold text-muted-foreground">Actions</th>
          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Speaker</th>
          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Company</th>
          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Submitted</th>
          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
        </tr>
      </thead>
      <tbody>
        {speakers.map((speaker) => (
          <tr key={speaker.id} className="border-b border-border hover:bg-muted/40 transition-colors group">
            <td className="px-2 py-2 text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${speaker.id}`}>
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!speaker.status || speaker.status !== "archived" ? (
                    <>
                      <DropdownMenuItem
                        className="text-warning"
                        onClick={async () => {
                          if (!eventId) return;
                          if (confirm(`Archive ${speaker.name}?\n\nSpeaker will be hidden from the active list, but their data is retained. You can restore them anytime.`)) {
                            try {
                              await updateSpeaker(eventId, speaker.id, { status: "archived" });
                              toast({ title: "Speaker archived", description: `${speaker.name} archived. Filter by \"Archived\" to restore.` });
                              queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
                            } catch (err: any) {
                              toast({ title: "Failed to archive speaker", description: String(err?.message || err) });
                            }
                          }
                        }}
                      >
                        Archive Speaker
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={async () => {
                          if (!eventId) return;
                          if (confirm(`Permanently delete ${speaker.name}?\n\nThis action cannot be undone. All speaker data will be permanently deleted.`)) {
                            try {
                              await deleteSpeaker(eventId, speaker.id);
                              toast({ title: "Speaker deleted", description: `${speaker.name} has been permanently deleted` });
                              queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
                            } catch (err: any) {
                              toast({ title: "Failed to delete speaker", description: String(err?.message || err) });
                            }
                          }
                        }}
                      >
                        Delete Speaker
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!eventId) return;
                        if (confirm(`Restore ${speaker.name} to active speakers?`)) {
                          try {
                            await updateSpeaker(eventId, speaker.id, { status: "active" });
                            toast({ title: "Speaker restored", description: `${speaker.name} has been restored` });
                            queryClient.invalidateQueries({ queryKey: ["event", eventId, "speakers"] });
                          } catch (err: any) {
                            toast({ title: "Failed to restore speaker", description: String(err?.message || err) });
                          }
                        }
                      }}
                    >
                      Restore Speaker
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </td>

            <td className="px-5 py-4">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${speaker.id}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm font-medium bg-muted">{speaker.name.charAt(0).toUpperCase()}</AvatarFallback>
                  <AvatarImage src={speaker.avatarUrl} alt={speaker.name} />
                </Avatar>
                <div>
                  <div className="text-sm font-medium text-foreground">{speaker.name}</div>
                  <div className="text-xs text-muted-foreground">{speaker.email}</div>
                </div>
              </div>
            </td>

            <td className="px-5 py-4 text-sm text-foreground cursor-pointer" onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${speaker.id}`}>
              {speaker.company || "-"}
            </td>

            <td className="px-5 py-4 text-sm text-muted-foreground cursor-pointer" onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${speaker.id}`}>
              {speaker.createdAt ? new Date(speaker.createdAt).toLocaleDateString() : "-"}
            </td>

            <td className="px-5 py-4">
              <Badge
                variant="outline"
                className={`text-xs font-medium capitalize cursor-pointer ${
                  speaker.intakeFormStatus === "approved"
                    ? "bg-success/10 text-success border-success/30"
                    : speaker.intakeFormStatus === "pending"
                    ? "bg-warning/10 text-warning border-warning/30"
                    : "bg-muted/50 text-muted-foreground border-muted/50"
                }`}
                onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${speaker.id}`}
              >
                {speaker.intakeFormStatus}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
