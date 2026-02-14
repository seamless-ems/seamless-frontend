import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import CardBuilder from "@/components/CardBuilder";

export default function WebsiteCardBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Top navigation bar with card type toggle and actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/organizer/event/${id}/speakers`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Button>
        <div className="flex-1 px-6">
          <h1 className="text-lg font-semibold">Website Card Builder</h1>
        </div>
      </div>

      {/* Card builder takes full remaining space */}
      <div className="flex-1 overflow-hidden">
        <CardBuilder eventId={id} fullscreen />
      </div>
    </div>
  );
}
