'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api, fetcher } from './api';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  trustScore: number;
  verificationLevel: string;
  optedOutCategoryIds: string[];
  isAdmin?: boolean;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem('token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializer instead of an effect: this is a client-only component tree with no
  // server-rendered output that depends on the token, so there's nothing to hydrate-mismatch.
  const [token, setToken] = useState<string | null>(readToken);

  const {
    data: user,
    isLoading,
    mutate,
  } = useSWR<CurrentUser>(token ? '/users/me' : null, fetcher, {
    shouldRetryOnError: false,
    onError: () => {
      window.localStorage.removeItem('token');
      setToken(null);
    },
  });

  const refreshUser = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await api.post<{ accessToken: string }>('/auth/login', { email, password });
    window.localStorage.setItem('token', accessToken);
    setToken(accessToken);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { accessToken } = await api.post<{ accessToken: string }>('/auth/signup', { name, email, password });
    window.localStorage.setItem('token', accessToken);
    setToken(accessToken);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem('token');
    setToken(null);
    void mutate(undefined);
  }, [mutate]);

  return (
    <AuthContext.Provider value={{ user: user ?? null, loading: Boolean(token) && isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Redirects to /login once auth state has settled and there's no user. */
export function useRequireAuth() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  return { user, loading, refreshUser };
}
