import { ReactNode } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronRight, Settings, ChevronDown, Users, CreditCard } from 'lucide-react';
import { getMe, getTeam, getJson } from '@/lib/api';
import { clearTokenAndNotify } from '@/lib/session';
import { signOut as firebaseSignOut } from '@/lib/firebase';

export default function EventLayout({ children }: { children: ReactNode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: me } = useQuery<any>({ queryKey: ['me'], queryFn: () => getMe() });
  const { data: teams } = useQuery<any[]>({ queryKey: ['teams'], queryFn: () => getTeam() });
  const { data: eventData } = useQuery<any>({
    queryKey: ['event', id],
    queryFn: () => getJson<any>(`/events/${id}`),
    enabled: !!id,
  });

  const eventName = eventData?.title || eventData?.name || '…';

  const isOnSpeakerPortal = /\/speakers\/(?!applications$|forms$|embed$)[^/]+$/.test(location.pathname);
  const isCardBuilder = location.pathname.endsWith('/website-card-builder') || location.pathname.endsWith('/promo-card-builder');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar — hidden when card builder is active (it has its own full toolbar) */}
      <header className={`sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 ${isCardBuilder ? 'hidden' : ''}`}>
        <nav className="flex items-center gap-1.5 text-sm">
          <Link to="/organizer" className="text-muted-foreground hover:text-foreground transition-colors">
            Events
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
          {isOnSpeakerPortal ? (
            <>
              <Link
                to={`/organizer/event/${id}/speakers`}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[220px]"
              >
                {eventName}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
              <span className="font-semibold text-foreground">Speakers</span>
            </>
          ) : (
            <span className="font-semibold text-foreground truncate max-w-[300px]">{eventName}</span>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/organizer/event/${id}/settings`}>
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Link>
          </Button>

          {/* Account dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pl-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={me?.avatarUrl ?? me?.avatar_url ?? ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {(((me?.firstName ?? me?.first_name)?.[0] ?? '') + ((me?.lastName ?? me?.last_name)?.[0] ?? '')).toUpperCase() || (me?.email?.[0] ?? '').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-3 py-3 border-b">
                <div className="text-sm font-semibold">
                  {me?.organization?.name || me?.organization_name || 'Team Seamless'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {me ? `${me.firstName ?? me.first_name ?? ''} ${me.lastName ?? me.last_name ?? ''}`.trim() : 'User'}
                  {me?.role === 'admin' || me?.isAdmin ? ' (Admin)' : ' (Member)'}
                </div>
              </div>

              {(me?.role === 'admin' || me?.isAdmin) && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Organization</div>
                  <DropdownMenuItem asChild>
                    <Link to="/organizer/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Organization Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/organizer/team">
                      <Users className="h-4 w-4 mr-2" />
                      Team
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/organizer/subscription">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Personal</div>
              <DropdownMenuItem asChild>
                <Link to="/organizer/settings">
                  <Users className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {teams && teams.length > 1 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Switch Team</div>
                  {teams.map((t: any) => (
                    <DropdownMenuItem key={t.id} onSelect={() => navigate(`/team?team=${encodeURIComponent(t.id)}`)}>
                      <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{t.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                onSelect={() => {
                  if (typeof window !== 'undefined') window.localStorage.setItem('dashboardMode', 'speaker');
                  navigate('/speaker');
                }}
              >
                Switch to Speaker
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive"
                onSelect={async () => {
                  try {
                    await firebaseSignOut();
                  } catch (e) {
                    try { clearTokenAndNotify(); } catch {}
                  }
                  navigate('/login');
                }}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className={`flex-1 bg-background ${isCardBuilder ? 'p-0 overflow-hidden' : 'p-6'}`}>
        {children}
      </main>
    </div>
  );
}
