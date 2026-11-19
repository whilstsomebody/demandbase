'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api';
import type { Item, ItemFile } from '@/lib/types';
import { useRequireAuth } from '@/lib/auth-context';

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useRequireAuth();
  const router = useRouter();

  const { data: item } = useSWR<Item>(`/items/${id}`, fetcher);
  const { data: files } = useSWR<ItemFile[]>(item?.type === 'DIGITAL' ? `/items/${id}/files` : null, fetcher);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  async function requestToBorrow() {
    setError(null);
    setMessage(null);
    setRequesting(true);
    try {
      await api.post('/requests', { itemId: id });
      setMessage('Request sent. Check the Requests page for updates.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send request');
    } finally {
      setRequesting(false);
    }
  }

  async function viewFile(fileId: string) {
    setError(null);
    try {
      const { url } = await api.get<{ url: string }>(`/items/${id}/files/${fileId}/access`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open file');
    }
  }

  if (loading || !user || !item) return null;

  const isOwner = item.ownerId === user.id;

  return (
    <div className="stack">
      <button className="secondary" onClick={() => router.back()}>
        &larr; Back
      </button>

      {item.photos.length > 0 && (
        <div className="row">
          {item.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={photo.id} src={photo.url} alt={item.title} className="photo" style={{ maxWidth: 260 }} />
          ))}
        </div>
      )}

      <div className="card">
        <div className="row-between">
          <h1>{item.title}</h1>
          <span className={`badge ${item.status === 'AVAILABLE' ? 'success' : 'muted'}`}>{item.status}</span>
        </div>
        <p className="muted">
          {item.category.name} - {item.type}
        </p>
        {item.description && <p>{item.description}</p>}
        <p className="muted">
          Owner: {item.owner.name} - trust score {item.owner.trustScore.toFixed(1)}
        </p>
        <p className="muted">Max loan duration: {item.maxLoanDurationDays} day(s)</p>

        {!isOwner && item.status === 'AVAILABLE' && (
          <button onClick={requestToBorrow} disabled={requesting}>
            {requesting ? 'Sending...' : 'Request to borrow'}
          </button>
        )}
        {isOwner && <p className="muted">This is your item - manage it from My Items.</p>}
        {message && <p className="badge success">{message}</p>}
        {error && <p className="error-text">{error}</p>}
      </div>

      {item.type === 'DIGITAL' && (
        <div className="card">
          <h2>Files</h2>
          {!files || files.length === 0 ? (
            <p className="muted">No files uploaded yet.</p>
          ) : (
            <ul className="stack">
              {files.map((file) => (
                <li key={file.id} className="row-between">
                  <span>
                    {file.originalFilename}{' '}
                    <span className="badge muted">{file.accessMode === 'VIEW' ? 'view-only' : 'download'}</span>
                    {file.flaggedForReview && <span className="badge danger">under review</span>}
                  </span>
                  <button className="secondary" onClick={() => viewFile(file.id)}>
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="muted">
            Only the owner and someone with an active loan on this item can open a file. Links expire after 10
            minutes and are watermarked with your name.
          </p>
        </div>
      )}
    </div>
  );
}
