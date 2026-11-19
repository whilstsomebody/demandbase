'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/feed', label: 'Feed' },
  { href: '/my-items', label: 'My Items' },
  { href: '/requests', label: 'Requests' },
  { href: '/offers', label: 'Offers' },
  { href: '/loans', label: 'Loans' },
  { href: '/notifications', label: 'Notifications' },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) {
    return (
      <header className="nav">
        <Link href="/" className="brand">
          Borrow
        </Link>
        <nav className="nav-links">
          <Link href="/login">Log in</Link>
          <Link href="/signup">Sign up</Link>
        </nav>
      </header>
    );
  }

  return (
    <header className="nav">
      <Link href="/browse" className="brand">
        Borrow
      </Link>
      <nav className="nav-links">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={pathname?.startsWith(link.href) ? 'active' : ''}>
            {link.label}
          </Link>
        ))}
        {user.isAdmin && (
          <Link href="/admin" className={pathname?.startsWith('/admin') ? 'active' : ''}>
            Admin
          </Link>
        )}
        <Link href="/profile" className={pathname?.startsWith('/profile') ? 'active' : ''}>
          {user.name}
        </Link>
        <button
          className="link-button"
          onClick={() => {
            logout();
            router.push('/login');
          }}
        >
          Log out
        </button>
      </nav>
    </header>
  );
}
