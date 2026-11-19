'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api';
import type { LoanRecord } from '@/lib/types';
import { useRequireAuth } from '@/lib/auth-context';

export default function LoansPage() {
  const { user, loading } = useRequireAuth();
  const { data: loans, mutate } = useSWR<LoanRecord[]>('/loans/mine', fetcher);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});

  async function act(loanId: string, action: 'confirm-pickup' | 'confirm-return' | 'cancel') {
    setBusyId(loanId);
    setError(null);
    try {
      await api.post(`/loans/${loanId}/${action}`);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function submitReview(loanId: string, score: number, comment: string) {
    setBusyId(loanId);
    setError(null);
    try {
      await api.post(`/loans/${loanId}/reviews`, { score, comment: comment || undefined });
      setReviewed((r) => ({ ...r, [loanId]: true }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit review');
    } finally {
      setBusyId(null);
    }
  }

  async function submitReport(loanId: string, type: string, description: string) {
    setBusyId(loanId);
    setError(null);
    try {
      await api.post('/reports', { type, description, loanId });
      alert('Report filed. A moderator will review it.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not file report');
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="stack">
      <h1>My Loans</h1>
      {error && <p className="error-text">{error}</p>}
      {loans?.length === 0 && <p className="empty">No loans yet.</p>}

      {loans?.map((loan) => {
        const isBorrower = loan.borrowerId === user.id;
        const role = isBorrower ? 'borrowing' : 'lending';
        const myPickupConfirmed = isBorrower ? loan.pickupConfirmedByBorrowerAt : loan.pickupConfirmedByOwnerAt;
        const myReturnConfirmed = isBorrower ? loan.returnConfirmedByBorrowerAt : loan.returnConfirmedByOwnerAt;

        return (
          <div key={loan.id} className="card">
            <div className="row-between">
              <h2>{loan.item.title}</h2>
              <span className="badge">{loan.state}</span>
            </div>
            <p className="muted">
              You are {role} this item{loan.dueAt && ` - due ${new Date(loan.dueAt).toLocaleDateString()}`}
            </p>

            <div className="row">
              {loan.state === 'APPROVED' && (
                <>
                  {!myPickupConfirmed && (
                    <button onClick={() => act(loan.id, 'confirm-pickup')} disabled={busyId === loan.id}>
                      Confirm pickup
                    </button>
                  )}
                  {myPickupConfirmed && <span className="muted">Waiting on the other party to confirm pickup</span>}
                  <button className="secondary" onClick={() => act(loan.id, 'cancel')} disabled={busyId === loan.id}>
                    Cancel
                  </button>
                </>
              )}
              {(loan.state === 'ACTIVE' || loan.state === 'RETURN_REQUESTED') && !myReturnConfirmed && (
                <button onClick={() => act(loan.id, 'confirm-return')} disabled={busyId === loan.id}>
                  Confirm return
                </button>
              )}
              {loan.state === 'RETURN_REQUESTED' && myReturnConfirmed && (
                <span className="muted">Waiting on the other party to confirm return</span>
              )}
            </div>

            {loan.state === 'CLOSED' && !reviewed[loan.id] && (
              <ReviewForm loanId={loan.id} busy={busyId === loan.id} onSubmit={submitReview} />
            )}
            {loan.state === 'CLOSED' && reviewed[loan.id] && <p className="badge success">Review submitted</p>}

            <ReportForm loanId={loan.id} busy={busyId === loan.id} onSubmit={submitReport} />
          </div>
        );
      })}
    </div>
  );
}

function ReviewForm({
  loanId,
  busy,
  onSubmit,
}: {
  loanId: string;
  busy: boolean;
  onSubmit: (loanId: string, score: number, comment: string) => void;
}) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <select value={score} onChange={(e) => setScore(Number(e.target.value))}>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} star{n > 1 ? 's' : ''}
          </option>
        ))}
      </select>
      <input placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="secondary" onClick={() => onSubmit(loanId, score, comment)} disabled={busy}>
        Leave review
      </button>
    </div>
  );
}

function ReportForm({
  loanId,
  busy,
  onSubmit,
}: {
  loanId: string;
  busy: boolean;
  onSubmit: (loanId: string, type: string, description: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('NON_RETURN');
  const [description, setDescription] = useState('');

  if (!open) {
    return (
      <button className="link-button" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
        Report a problem with this loan
      </button>
    );
  }

  return (
    <div className="row" style={{ marginTop: 8 }}>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="NON_RETURN">Item not returned</option>
        <option value="DAMAGE">Item damaged</option>
        <option value="MISUSE">Misuse</option>
        <option value="CONTENT_VIOLATION">Content violation</option>
        <option value="OTHER">Other</option>
      </select>
      <input placeholder="Describe the issue" value={description} onChange={(e) => setDescription(e.target.value)} />
      <button
        className="danger"
        disabled={busy || !description.trim()}
        onClick={() => {
          onSubmit(loanId, type, description);
          setOpen(false);
          setDescription('');
        }}
      >
        File report
      </button>
    </div>
  );
}
