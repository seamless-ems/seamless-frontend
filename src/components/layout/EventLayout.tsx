import { ReactNode } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/api';
import EventHeaderActions from './EventHeaderActions';

export default function EventLayout({ children }: { children: ReactNode }) {
  const { id } = useParams();
  const location = useLocation();

  const { data: eventData } = useQuery<any>({
    queryKey: ['event', id],
    queryFn: () => getJson<any>(`/events/${id}`),
    enabled: !!id,
  });

  const isOnSpeakerPortal = /\/speakers\/(?!applications$|forms$|embed$|content$)[^/]+$/.test(location.pathname);
  const isCardBuilder = location.pathname.endsWith('/website-card-builder') || location.pathname.endsWith('/promo-card-builder');
  const isOnSpeakerModule = !isCardBuilder && !isOnSpeakerPortal && location.pathname.includes('/speakers');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header
        className={`sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border bg-card/95 px-4 shrink-0 ${(isCardBuilder || isOnSpeakerModule) ? 'hidden' : ''}`}
      >
        <Link to="/organizer" className="flex items-center gap-2 leading-none shrink-0">
          <span className="text-[17px] font-semibold text-accent" style={{ letterSpacing: '-0.01em' }}>Seamless</span>
          <span className="text-xs font-normal text-muted-foreground ml-2">Events</span>
        </Link>

        <div className="ml-auto">
          <EventHeaderActions eventData={eventData} id={id} />
        </div>
      </header>

      <main className={`flex-1 bg-background ${isCardBuilder ? 'p-0 overflow-hidden' : isOnSpeakerModule ? 'p-0' : 'p-6'}`}>
        {children}
      </main>
    </div>
  );
}
