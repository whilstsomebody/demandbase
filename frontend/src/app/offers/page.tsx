'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api';
import type { OfferRecord } from '@/lib/types';
import { useRequireAuth } from '@/lib/auth-context';

export default function OffersPage() {
  const { user, loading } = useRequireAuth();
  const { data: offers, mutate } = useSWR<OfferRecord[]>('/offers/received', fetcher);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function respond(offerId: string, action: 'accept' | 'decline') {
    setBusyId(offerId);
    setError(null);
    try {
      await api.post(`/offers/${offerId}/${action}`);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not ${action} this offer`);
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="stack">
      <h1>Offers Received</h1>
      <p className="muted">Requests from other people for items you own.</p>
      {error && <p className="error-text">{error}</p>}
      {offers?.length === 0 && <p className="empty">No one has requested your items yet.</p>}

      {offers?.map((offer) => (
        <div key={offer.id} className="card">
          <div className="row-between">
            <h2>{offer.item.title}</h2>
            <span className="badge">{offer.status}</span>
          </div>
          <p className="muted">
            {offer.request?.mode === 'BROADCAST' ? 'From a community post' : 'Direct request'} - from{' '}
            {offer.request?.requester.name} (trust {offer.request?.requester.trustScore.toFixed(1)})
          </p>
          {offer.request?.mode === 'BROADCAST' && offer.status === 'ACCEPTED' && (
            <p className="muted">You accepted - waiting for the requester to pick an offer.</p>
          )}
          {offer.status === 'PENDING' && (
            <div className="row">
              <button onClick={() => respond(offer.id, 'accept')} disabled={busyId === offer.id}>
                Accept
              </button>
              <button className="secondary" onClick={() => respond(offer.id, 'decline')} disabled={busyId === offer.id}>
                Decline
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
