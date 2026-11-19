'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <div className="stack">
        <h1>Borrow</h1>
        <p className="muted">
          Share things you own with people who need them - a cricket bat, a laptop, lecture notes - and borrow what
          you need from others.
        </p>
        <div className="row">
          <Link href="/signup">
            <button>Sign up</button>
          </Link>
          <Link href="/login">
            <button className="secondary">Log in</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Welcome back, {user.name}</h1>
      <div className="grid">
        <Link href="/browse" className="card">
          <h2>Browse items</h2>
          <p className="muted">Search for something to borrow</p>
        </Link>
        <Link href="/feed" className="card">
          <h2>Community feed</h2>
          <p className="muted">Post &quot;I need ...&quot; and get matched</p>
        </Link>
        <Link href="/my-items" className="card">
          <h2>My items</h2>
          <p className="muted">List something you can lend</p>
        </Link>
        <Link href="/loans" className="card">
          <h2>My loans</h2>
          <p className="muted">Track active borrows and lends</p>
        </Link>
      </div>
    </div>
  );
}
