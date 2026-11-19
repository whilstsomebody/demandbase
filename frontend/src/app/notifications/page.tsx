'use client';

import useSWR from 'swr';
import { api, fetcher } from '@/lib/api';
import type { NotificationRecord } from '@/lib/types';
import { useRequireAuth } from '@/lib/auth-context';

const TYPE_LABELS: Record<string, string> = {
  OFFER_RECEIVED: 'Someone wants to borrow your item',
  OFFER_ACCEPTED: 'Your request was accepted',
  OFFER_DECLINED: 'Your request was declined',
  LOAN_PICKUP_CONFIRMED: 'Pickup confirmed - your turn',
  LOAN_ACTIVATED: 'Loan is now active',
  LOAN_RETURN_REQUESTED: 'Return confirmed - your turn',
  LOAN_CLOSED: 'Loan closed',
  LOAN_CANCELLED: 'Loan cancelled',
  LOAN_DUE_SOON: 'A borrowed item is due soon',
  LOAN_OVERDUE: 'A borrowed item is overdue',
  REQUEST_NO_MATCH: 'No matches found for your request',
  BROADCAST_OFFER_ACCEPTED: 'Someone can lend you what you need',
  REQUEST_CANCELLED: 'A request you matched was cancelled',
};

export default function NotificationsPage() {
  const { user, loading } = useRequireAuth();
  const { data: items, mutate } = useSWR<NotificationRecord[]>('/notifications/mine', fetcher);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    await mutate();
  }

  if (loading || !user) return null;

  return (
    <div className="stack">
      <h1>Notifications</h1>
      {items?.length === 0 && <p className="empty">Nothing yet.</p>}
      {items?.map((n) => (
        <div key={n.id} className="card row-between" style={{ opacity: n.readAt ? 0.6 : 1 }}>
          <div>
            <strong>{TYPE_LABELS[n.type] ?? n.type}</strong>
            <p className="muted">{new Date(n.createdAt).toLocaleString()}</p>
          </div>
          {!n.readAt && (
            <button className="secondary" onClick={() => markRead(n.id)}>
              Mark read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
