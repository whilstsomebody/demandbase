'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api';
import type { ReportRecord } from '@/lib/types';
import { useRequireAuth } from '@/lib/auth-context';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  trustScore: number;
  isAdmin: boolean;
  isSuspended: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !user.isAdmin) router.replace('/');
  }, [loading, user, router]);

  const isAdmin = Boolean(user?.isAdmin);
  const { data: reports, mutate: mutateReports } = useSWR<ReportRecord[]>(isAdmin ? '/admin/reports' : null, fetcher);
  const { data: users, mutate: mutateUsers } = useSWR<AdminUser[]>(isAdmin ? '/admin/users' : null, fetcher);

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function resolve(id: string, resolution: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/admin/reports/${id}/resolve`, { resolution });
      await mutateReports();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resolve report');
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(id: string, resolution: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/admin/reports/${id}/dismiss`, { resolution });
      await mutateReports();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not dismiss report');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSuspend(target: AdminUser) {
    setBusyId(target.id);
    setError(null);
    try {
      await api.patch(`/admin/users/${target.id}/${target.isSuspended ? 'unsuspend' : 'suspend'}`);
      await mutateUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update user');
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !user || !user.isAdmin) return null;

  return (
    <div className="stack">
      <h1>Admin</h1>
      {error && <p className="error-text">{error}</p>}

      <h2>Open reports</h2>
      {reports?.filter((r) => r.status === 'OPEN').length === 0 && <p className="empty">No open reports.</p>}
      {reports
        ?.filter((r) => r.status === 'OPEN')
        .map((r) => (
          <ReportCard key={r.id} report={r} busy={busyId === r.id} onResolve={resolve} onDismiss={dismiss} />
        ))}

      <h2>Resolved / dismissed</h2>
      {reports
        ?.filter((r) => r.status !== 'OPEN')
        .map((r) => (
          <div key={r.id} className="card">
            <div className="row-between">
              <strong>{r.type}</strong>
              <span className="badge muted">{r.status}</span>
            </div>
            <p>{r.description}</p>
            {r.resolution && <p className="muted">Resolution: {r.resolution}</p>}
          </div>
        ))}

      <h2>Users</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Trust</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.trustScore.toFixed(1)}</td>
              <td>
                {u.isAdmin && <span className="badge">admin</span>}{' '}
                {u.isSuspended && <span className="badge danger">suspended</span>}
              </td>
              <td>
                {!u.isAdmin && (
                  <button className="secondary" onClick={() => toggleSuspend(u)} disabled={busyId === u.id}>
                    {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportCard({
  report,
  busy,
  onResolve,
  onDismiss,
}: {
  report: ReportRecord;
  busy: boolean;
  onResolve: (id: string, resolution: string) => void;
  onDismiss: (id: string, resolution: string) => void;
}) {
  const [resolution, setResolution] = useState('');
  return (
    <div className="card">
      <div className="row-between">
        <strong>{report.type}</strong>
        <span className="muted">{new Date(report.createdAt).toLocaleString()}</span>
      </div>
      <p>{report.description}</p>
      <p className="muted">Filed by {report.reporter?.name ?? report.reporterId}</p>
      <div className="row">
        <input placeholder="Resolution note" value={resolution} onChange={(e) => setResolution(e.target.value)} />
        <button onClick={() => onResolve(report.id, resolution)} disabled={busy || !resolution.trim()}>
          Resolve
        </button>
        <button className="secondary" onClick={() => onDismiss(report.id, resolution)} disabled={busy || !resolution.trim()}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
