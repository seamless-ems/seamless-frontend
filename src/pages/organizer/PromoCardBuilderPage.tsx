import { useParams } from "react-router-dom";
import CardBuilder from "@/components/CardBuilder";

export default function PromoCardBuilderPage() {
  const { id } = useParams();

  return (
    <div className="h-full overflow-hidden -m-6">
      <CardBuilder eventId={id} fullscreen />
    </div>
  );
}
