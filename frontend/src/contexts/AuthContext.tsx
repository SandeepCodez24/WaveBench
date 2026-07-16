import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiLogin, apiSignup, apiGetMe, type User } from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    organization: string,
    role: string,
  ) => Promise<void>;
  logout: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('wb_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On mount: if we have a saved token, validate it and restore the user session
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiGetMe()
      .then((u) => setUser(u))
      .catch(() => {
        // Token is expired or invalid — clear it
        localStorage.removeItem('wb_token');
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function login(email: string, password: string) {
    const resp = await apiLogin(email, password);
    localStorage.setItem('wb_token', resp.token);
    setToken(resp.token);
    setUser(resp.user);
  }

  async function signup(
    email: string,
    password: string,
    displayName: string,
    organization: string,
    role: string,
  ) {
    const resp = await apiSignup(email, password, displayName, organization, role);
    localStorage.setItem('wb_token', resp.token);
    setToken(resp.token);
    setUser(resp.user);
  }

  function logout() {
    localStorage.removeItem('wb_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
