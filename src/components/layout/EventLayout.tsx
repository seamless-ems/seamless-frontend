import { ReactNode } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, ChevronDown, Users, CreditCard, ChevronRight } from 'lucide-react';
import { getMe, getTeam, getJson, createCheckout } from '@/lib/api';
import { getLocaleAndCurrency } from '@/lib/locale';
import { toast } from '@/hooks/use-toast';
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
      <header className={`sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 ${isCardBuilder ? 'hidden' : ''}`}>
        {/* Brand */}
        <Link to="/organizer" className="flex items-baseline gap-1 leading-none shrink-0">
          <span className="text-[17px] font-semibold text-primary" style={{ letterSpacing: '-0.01em' }}>Seamless</span>
          <span className="text-[13px] font-normal text-muted-foreground ml-0.5">Events</span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-1 shrink-0">
          {/* Trial badge (compact) */}
          {(() => {
            const isOrganizer = eventData?.userRole === 'organizer' || eventData?.user_role === 'organizer';
            const paid = eventData?.paid === true || eventData?.is_paid === true || eventData?.paid_until || eventData?.paidUntil || eventData?.purchase_id;
            if (!isOrganizer || paid) return null;

            const parseDate = (d: any) => {
              if (!d) return null;
              const s = typeof d === 'string' ? d : (d?.toString && d.toString()) || null;
              if (!s) return null;
              const t = Date.parse(s);
              return isNaN(t) ? null : new Date(t);
            };

            const trialEnded = eventData?.trialEnded ?? eventData?.trial_ended ?? false;
            const trialEndsAt = parseDate(eventData?.trialEndsAt ?? eventData?.trial_ends_at ?? eventData?.trial_end_at ?? eventData?.trial_end_date ?? null);
            let daysLeft: number | null = null;
            if (trialEndsAt) {
              const now = new Date();
              const diff = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              daysLeft = diff >= 0 ? diff : 0;
            }

            const handleUpgrade = async () => {
              try {
                const { locale, currency } = getLocaleAndCurrency();
                const res = await createCheckout('speaker', String(eventData?.id ?? eventData?.event_id ?? eventData?.uuid ?? id), { currency, locale });
                const url = res?.url || res?.checkout_url || res?.redirect_url || res?.checkoutUrl || (typeof res === 'string' ? res : undefined) || res?.data?.url;
                if (url) window.open(url, '_blank', 'noopener,noreferrer');
                else toast({ title: 'Checkout created', description: 'No redirect URL returned; check billing dashboard.' });
              } catch (err: any) {
                toast({ title: 'Checkout failed', description: String(err?.message || err), variant: 'destructive' });
              }
            };

            const title = trialEnded ? 'Free trial ended' : daysLeft !== null ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Free trial';

            return (
              <div className="flex items-center gap-3 mr-2">
                <Button
                  size="sm"
                  onClick={handleUpgrade}
                  className={`h-8 px-3 ${trialEnded ? 'bg-destructive text-white' : ''}`}
                >
                  {title} <span className="mx-2">|</span> Upgrade
                </Button>
              </div>
            );
          })()}
          {/* Account dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pl-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {teams?.[0]?.name ?? me?.firstName ?? me?.first_name ?? "Account"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-3 py-3 border-b">
                <div className="text-sm font-semibold">
                  {teams?.[0]?.name ?? '—'}
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

              {/* {teams && teams.length > 1 && (
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
              )} */}

              {/* <DropdownMenuItem
                onSelect={() => {
                  if (typeof window !== 'undefined') window.localStorage.setItem('dashboardMode', 'speaker');
                  navigate('/speaker');
                }}
              >
                Switch to Speaker
              </DropdownMenuItem> */}

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
