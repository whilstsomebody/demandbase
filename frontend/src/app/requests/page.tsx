'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api';
import type { RequestRecord } from '@/lib/types';
import { useRequireAuth } from '@/lib/auth-context';

export default function RequestsPage() {
  const { user, loading } = useRequireAuth();
  const { data: requests, mutate } = useSWR<RequestRecord[]>('/requests/mine', fetcher);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function selectOffer(offerId: string) {
    setBusyId(offerId);
    setError(null);
    try {
      await api.post(`/offers/${offerId}/select`);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not select this offer');
    } finally {
      setBusyId(null);
    }
  }

  async function cancelRequest(id: string) {
    if (!confirm('Cancel this request?')) return;
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/requests/${id}/cancel`);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this request');
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="stack">
      <h1>My Requests</h1>
      {error && <p className="error-text">{error}</p>}
      {requests?.length === 0 && <p className="empty">You haven&apos;t requested anything yet.</p>}

      {requests?.map((req) => (
        <div key={req.id} className="card">
          <div className="row-between">
            <h2>{req.mode === 'DIRECT' ? req.offers[0]?.item.title ?? 'Direct request' : req.requirementText}</h2>
            <span className="badge">{req.status}</span>
          </div>
          <p className="muted">
            {req.mode} - posted {new Date(req.createdAt).toLocaleString()}
          </p>

          {req.offers.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {req.offers.map((offer) => (
                  <tr key={offer.id}>
                    <td>{offer.item.title}</td>
                    <td>{offer.item.owner.name}</td>
                    <td>
                      <span className="badge">{offer.status}</span>
                    </td>
                    <td>
                      {req.mode === 'BROADCAST' && offer.status === 'ACCEPTED' && req.status === 'OPEN' && (
                        <button onClick={() => selectOffer(offer.id)} disabled={busyId === offer.id}>
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {req.status === 'OPEN' && (
            <button className="secondary" onClick={() => cancelRequest(req.id)} disabled={busyId === req.id}>
              Cancel request
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
