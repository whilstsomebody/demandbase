'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Item } from '@/lib/types';
import { useRequireAuth } from '@/lib/auth-context';

export default function BrowsePage() {
  const { user, loading } = useRequireAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSearching(true);
    try {
      const items = await api.get<Item[]>(`/search?q=${encodeURIComponent(query)}`);
      setResults(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="stack">
      <h1>Browse</h1>
      <form className="row" onSubmit={onSearch}>
        <input
          placeholder="Search by item name, e.g. bat, laptop, notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={searching}>
          Search
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}

      {results === null && <p className="muted">Search for something to see who has it available.</p>}
      {results !== null && results.length === 0 && <p className="empty">No available items match &quot;{query}&quot;.</p>}

      <div className="grid">
        {results?.map((item) => (
          <Link key={item.id} href={`/items/${item.id}`} className="card">
            {item.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photos[0].url} alt={item.title} className="photo" />
            ) : (
              <div className="photo" />
            )}
            <h2>{item.title}</h2>
            <p className="muted">{item.category.name}</p>
            <p className="muted">
              Owner: {item.owner.name} - trust {item.owner.trustScore.toFixed(1)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
