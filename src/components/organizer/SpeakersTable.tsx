import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { updateSpeaker, deleteSpeaker } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

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
          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-[64px]">Headshot</th>
          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Speaker</th>
          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Title</th>
          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Company</th>
          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Last Updated</th>
          <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
        </tr>
      </thead>
      <tbody>
        {speakers.map((speaker) => (
          <tr key={speaker.id} className="border-b border-border hover:bg-muted/40 transition-colors group">
            <td className="px-4 py-4">
              <div className="w-10 h-10">
                <Avatar>
                  <AvatarImage src={speaker.headshot || speaker.headshotUrl || speaker.headshot_url || undefined} alt={speaker.name || "headshot"} />
                  <AvatarFallback>
                    {((speaker.name || "") as string).split(" ").map((p: string) => p?.[0]).filter(Boolean).slice(0,2).join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
            </td>

            <td className="px-5 py-4">
              <div
                className="text-sm font-medium text-foreground cursor-pointer"
                onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${speaker.id}`}
              >
                {speaker.name}
              </div>
            </td>

            <td className="px-5 py-4 text-sm text-foreground cursor-pointer" onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${speaker.id}`}>
              {speaker.companyRole || "-"}
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
                className={`text-xs font-medium cursor-pointer ${
                  speaker.intakeFormStatus === "approved"
                    ? "bg-success/10 text-success border-success/30"
                    : speaker.intakeFormStatus === "submitted"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    : speaker.intakeFormStatus === "pending"
                    ? "bg-warning/10 text-warning border-warning/30"
                    : "bg-muted/50 text-muted-foreground border-muted/50"
                }`}
                onClick={() => window.location.href = `/organizer/event/${eventId}/speakers/${speaker.id}`}
              >
                {speaker.intakeFormStatus === "pending" && "Info Pending"}
                {speaker.intakeFormStatus === "submitted" && "Info Submitted"}
                {speaker.intakeFormStatus === "approved" && "Cards Approved"}
                {!["pending", "submitted", "approved"].includes(speaker.intakeFormStatus) && speaker.intakeFormStatus}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
