import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/api';

function isEventPaid(ev: any) {
  if (!ev) return false;
  if (ev.paid === true || ev.is_paid === true || ev.paid === 'true') return true;
  if (ev.paid_until || ev.paidUntil || ev.purchase_id || ev.purchaseId) return true;
  if (ev.subscription || ev.billing || (ev.purchase && typeof ev.purchase === 'object')) return true;
  return false;
}

export function useEventAccess(eventId?: string | null) {
  const enabled = Boolean(eventId);
  const { data: event, isLoading } = useQuery<any>({
    queryKey: ['event', eventId],
    queryFn: () => getJson(`/events/${eventId}`),
    enabled,
  });

  const trialEnded = (event as any)?.trialEnded ?? (event as any)?.trial_ended ?? false;
  const paid = isEventPaid(event);
  const isReadOnly = Boolean(trialEnded && !paid);

  return { event, isLoading, isReadOnly };
}

export default useEventAccess;
