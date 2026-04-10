import { useParams, useLocation } from 'react-router-dom';
import SpeakerPortalComponent from '@/components/SpeakerPortalComponent';

export default function SpeakerDashboard() {
  const { id, speakerId } = useParams();
  const location = useLocation();

  return (
    <SpeakerPortalComponent
      eventId={id ?? null}
      speakerId={speakerId ?? null}
      initialOpenEdit={Boolean((location.state as any)?.openEdit)}
    />
  );
}
