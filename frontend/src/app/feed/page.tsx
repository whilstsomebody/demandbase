'use client';

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api';
import type { FeedMessage } from '@/lib/types';
import { useRequireAuth } from '@/lib/auth-context';

interface PreviewMatch {
  itemId: string;
  title: string;
  ownerName: string;
  ownerTrustScore: number;
}
interface PreviewResult {
  isRequest: boolean;
  requirementText?: string;
  matches?: PreviewMatch[];
}

export default function FeedPage() {
  const { user, loading } = useRequireAuth();
  const { data: messages, mutate } = useSWR<FeedMessage[]>('/community-feed/posts', fetcher);
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onReview(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const result = await api.post<PreviewResult>('/community-feed/preview', { body });
      if (!result.isRequest) {
        // not a broadcast request - no preview needed, post it straight away
        await api.post('/community-feed/posts', { body });
        setBody('');
        setPreview(null);
        await mutate();
      } else {
        setPreview(result);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post');
    } finally {
      setBusy(false);
    }
  }

  async function confirmPost() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/community-feed/posts', { body });
      setBody('');
      setPreview(null);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="stack">
      <h1>Community Feed</h1>
      <p className="muted">
        Post anything, or use the exact phrase <code>I need &#123;what you need&#125;, is anyone up for it?</code> to
        broadcast a request to everyone who has a matching item listed.
      </p>

      <div className="card">
        <form className="stack" onSubmit={onReview}>
          <textarea
            placeholder="e.g. I need a cricket bat, is anyone up for it?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={busy || !body.trim()}>
            Post
          </button>
        </form>

        {preview && (
          <div className="card" style={{ marginTop: 12, background: 'var(--bg)' }}>
            <h2>Confirm broadcast</h2>
            {preview.matches && preview.matches.length > 0 ? (
              <>
                <p>
                  This will notify the owners of <strong>{preview.matches.length}</strong> matching item(s) for
                  &quot;{preview.requirementText}&quot;:
                </p>
                <ul>
                  {preview.matches.map((m) => (
                    <li key={m.itemId}>
                      {m.title} - owned by {m.ownerName} (trust {m.ownerTrustScore.toFixed(1)})
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No matching items found right now for &quot;{preview.requirementText}&quot;. Posting will still save your request, but no one will be notified.</p>
            )}
            <div className="row">
              <button onClick={confirmPost} disabled={busy}>
                Confirm &amp; post
              </button>
              <button className="secondary" onClick={() => setPreview(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="stack">
        {messages?.map((m) => (
          <div key={m.id} className="card">
            <div className="row-between">
              <strong>{m.author.name}</strong>
              <span className="muted">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p>{m.body}</p>
            {m.isRequest && m.request && (
              <div className="row">
                <span className="badge">{m.request.status}</span>
                {m.request.offers.length > 0 && (
                  <span className="muted">
                    {m.request.offers.filter((o) => o.status === 'ACCEPTED').length} accepted /{' '}
                    {m.request.offers.length} matched
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {messages?.length === 0 && <p className="empty">No posts yet.</p>}
      </div>
    </div>
  );
}
