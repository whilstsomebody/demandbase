'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api';
import type { Category } from '@/lib/types';
import { useRequireAuth, type CurrentUser } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user, loading, refreshUser } = useRequireAuth();
  const { data: categories } = useSWR<Category[]>('/categories', fetcher);

  if (loading || !user) return null;

  return <ProfileInner key={user.id} user={user} categories={categories ?? []} refreshUser={refreshUser} />;
}

function ProfileInner({
  user,
  categories,
  refreshUser,
}: {
  user: CurrentUser;
  categories: Category[];
  refreshUser: () => Promise<void>;
}) {
  // Child component so this local editable copy only initializes once `user` is actually
  // loaded - the parent never mounts this until then, so there's no stale-empty-set issue.
  const [optedOut, setOptedOut] = useState<Set<string>>(() => new Set(user.optedOutCategoryIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(categoryId: string) {
    setOptedOut((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.patch('/users/me/notification-preferences', { optedOutCategoryIds: Array.from(optedOut) });
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save preferences');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <h1>Profile</h1>
      <div className="card">
        <h2>{user.name}</h2>
        <p className="muted">{user.email}</p>
        <p>
          Trust score: <strong>{user.trustScore.toFixed(1)}</strong> / 5
        </p>
        <p className="muted">Verification: {user.verificationLevel}</p>
      </div>

      <div className="card">
        <h2>Broadcast notifications</h2>
        <p className="muted">
          Don&apos;t notify me when someone posts &quot;I need ...&quot; matching these categories, even if I have a
          matching item listed.
        </p>
        <div className="stack">
          {categories.map((c) => (
            <label key={c.id} className="row" style={{ fontWeight: 400 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={optedOut.has(c.id)} onChange={() => toggle(c.id)} />
              {c.name}
            </label>
          ))}
        </div>
        {error && <p className="error-text">{error}</p>}
        <button onClick={save} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}
