import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { AccountUser } from './types';

type AuthValue = {
  user: AccountUser | null;
  loading: boolean;
  login: (identity: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function accountFrom(payload: any): AccountUser | null {
  return payload?.user || payload?.account || (payload?.id ? payload : null);
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const token = await api.getToken();
    if (!token) { setUser(null); return; }
    try { setUser(accountFrom(await api.request('/api/me'))); }
    catch { await api.setToken(null); setUser(null); }
  }, []);
  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);
  const login = useCallback(async (identity: string, password: string) => {
    const result = await api.request<{ token: string; user: AccountUser }>('/api/auth/login', { auth: false, method: 'POST', body: JSON.stringify({ identity, password }) });
    await api.setToken(result.token); setUser(result.user);
  }, []);
  const register = useCallback(async (email: string, username: string, password: string) => {
    const result = await api.request<{ token: string; user: AccountUser }>('/api/auth/register', { auth: false, method: 'POST', body: JSON.stringify({ email, username, password }) });
    await api.setToken(result.token); setUser(result.user);
  }, []);
  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    await api.setToken(null); setUser(null);
  }, []);
  const value = useMemo(() => ({ user, loading, login, register, logout, refresh }), [user, loading, login, register, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AUTH_PROVIDER_REQUIRED');
  return value;
}
