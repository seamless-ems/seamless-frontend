import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getJson, createCheckout } from '@/lib/api';
import { getLocaleAndCurrency } from '@/lib/locale';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

function parseDate(d: any): Date | null {
  if (!d) return null;
  const s = typeof d === 'string' ? d : (d?.toString && d.toString()) || null;
  if (!s) return null;
  const t = Date.parse(s);
  return isNaN(t) ? null : new Date(t);
}

export default function TrialOverlay() {
  const { id } = useParams();
  const { data: event, isLoading } = useQuery<any>({
    queryKey: ['event', id],
    queryFn: () => getJson<any>(`/events/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading || !event) return null;

  const isOrganizer = event.userRole === 'organizer' || event.user_role === 'organizer';
  if (!isOrganizer) return null;

  const paid = event.paid === true || event.is_paid === true || event.paid_until || event.paidUntil || event.purchase_id;
  if (paid) return null;

  const trialEnded = event.trialEnded ?? event.trial_ended ?? false;
  const trialEndsAt = parseDate(event.trialEndsAt ?? event.trial_ends_at ?? event.trial_end_at ?? event.trial_end_date ?? null);

  let daysLeft: number | null = null;
  if (trialEndsAt) {
    const now = new Date();
    const diff = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    daysLeft = diff >= 0 ? diff : 0;
  }

  const handleUpgrade = async () => {
    try {
      const { locale, currency } = getLocaleAndCurrency();
      const res = await createCheckout('speaker', String(event.id), { currency, locale });
      const url = res?.url || res?.checkout_url || res?.redirect_url || res?.checkoutUrl || (typeof res === 'string' ? res : undefined) || res?.data?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else toast({ title: 'Checkout created', description: 'No redirect URL returned; check billing dashboard.' });
    } catch (err: any) {
      toast({ title: 'Checkout failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const title = trialEnded ? 'Free trial ended' : daysLeft !== null ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Free trial';
  const subtitle = trialEnded
    ? ''
    : daysLeft !== null
      ? 'Upgrade now to keep full access.'
      : 'Upgrade to unlock full features.';

  return (
    <div style={{ zIndex: 9999 }} className="fixed right-6 bottom-6 max-w-sm w-full">
      <div className={`rounded-lg border p-4 shadow-lg ${trialEnded ? 'bg-destructive border-destructive/30' : 'bg-card border-border'}`}>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className={`text-sm font-semibold ${trialEnded ? 'text-white' : 'text-foreground'}`}>{title}</div>
            {!trialEnded && (
              <div className="text-xs mt-1 text-muted-foreground">{subtitle}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleUpgrade}
              className={trialEnded ? 'bg-white border border-destructive text-destructive hover:bg-white' : undefined}
            >
              {trialEnded ? 'Upgrade to restore access' : 'Upgrade'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
