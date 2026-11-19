'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api, ApiError, fetcher } from '@/lib/api';
import type { Category, Item } from '@/lib/types';
import { useRequireAuth } from '@/lib/auth-context';

export default function MyItemsPage() {
  const { user, loading } = useRequireAuth();
  const { data: items, mutate } = useSWR<Item[]>('/items/mine', fetcher);
  const { data: categories } = useSWR<Category[]>('/categories', fetcher);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PHYSICAL' | 'DIGITAL'>('PHYSICAL');
  const [categoryId, setCategoryId] = useState('');
  const [maxLoanDurationDays, setMaxLoanDurationDays] = useState(7);
  const [creating, setCreating] = useState(false);

  const effectiveCategoryId = categoryId || categories?.[0]?.id || '';

  async function createItem(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.post('/items', {
        title,
        description: description || undefined,
        type,
        categoryId: effectiveCategoryId,
        maxLoanDurationDays,
      });
      setTitle('');
      setDescription('');
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create item');
    } finally {
      setCreating(false);
    }
  }

  async function toggleAvailability(item: Item) {
    setError(null);
    try {
      await api.patch(`/items/${item.id}`, { status: item.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE' });
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update item');
    }
  }

  async function deleteItem(item: Item) {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.delete(`/items/${item.id}`);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete item');
    }
  }

  if (loading || !user) return null;

  return (
    <div className="stack">
      <h1>My Items</h1>

      <div className="card">
        <h2>List a new item</h2>
        <form className="stack" onSubmit={createItem}>
          <div>
            <label htmlFor="title">Title</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label htmlFor="description">Description (optional)</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label htmlFor="type">Type</label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value as 'PHYSICAL' | 'DIGITAL')}>
                <option value="PHYSICAL">Physical</option>
                <option value="DIGITAL">Digital</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="category">Category</label>
              <select id="category" value={effectiveCategoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="duration">Max loan days</label>
              <input
                id="duration"
                type="number"
                min={1}
                value={maxLoanDurationDays}
                onChange={(e) => setMaxLoanDurationDays(Number(e.target.value))}
              />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={creating || !effectiveCategoryId}>
            {creating ? 'Listing...' : 'List item'}
          </button>
        </form>
      </div>

      {items?.length === 0 && <p className="empty">You haven&apos;t listed anything yet.</p>}

      <div className="stack">
        {items?.map((item) => (
          <ItemRow key={item.id} item={item} onChanged={mutate} onToggle={toggleAvailability} onDelete={deleteItem} />
        ))}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onChanged,
  onToggle,
  onDelete,
}: {
  item: Item;
  onChanged: () => Promise<unknown>;
  onToggle: (item: Item) => Promise<void>;
  onDelete: (item: Item) => Promise<void>;
}) {
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [accessMode, setAccessMode] = useState<'VIEW' | 'DOWNLOAD'>('VIEW');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadPhoto() {
    const file = photoInput.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/items/${item.id}/photos`, form);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload photo');
    } finally {
      setBusy(false);
      if (photoInput.current) photoInput.current.value = '';
    }
  }

  async function uploadFile() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('accessMode', accessMode);
      await api.post(`/items/${item.id}/files`, form);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload file');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div className="card">
      <div className="row-between">
        <div>
          <Link href={`/items/${item.id}`}>
            <h2>{item.title}</h2>
          </Link>
          <p className="muted">{item.category.name}</p>
        </div>
        <span className={`badge ${item.status === 'AVAILABLE' ? 'success' : 'muted'}`}>{item.status}</span>
      </div>

      <div className="row">
        <button className="secondary" onClick={() => onToggle(item)} disabled={busy}>
          {item.status === 'AVAILABLE' ? 'Pause' : 'Mark available'}
        </button>
        <button className="danger" onClick={() => onDelete(item)} disabled={busy}>
          Delete
        </button>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <label style={{ margin: 0 }}>Add photo:</label>
        <input ref={photoInput} type="file" accept="image/*" onChange={uploadPhoto} disabled={busy} />
      </div>

      {item.type === 'DIGITAL' && (
        <div className="row" style={{ marginTop: 6 }}>
          <label style={{ margin: 0 }}>Add file:</label>
          <select value={accessMode} onChange={(e) => setAccessMode(e.target.value as 'VIEW' | 'DOWNLOAD')}>
            <option value="VIEW">View-only (recommended)</option>
            <option value="DOWNLOAD">Download (weaker guarantee)</option>
          </select>
          <input ref={fileInput} type="file" onChange={uploadFile} disabled={busy} />
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
