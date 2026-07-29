import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * ── Mock Authentication ───────────────────────────────────────────────────
 *
 * This is a frontend-only mock auth layer. It behaves like a real login
 * system (session id, remember-me persistence, logout) but does not call a
 * real backend yet — the database schema already expects Supabase Auth
 * (see backend/prisma/schema.prisma -> User.supabase_id), so when that's
 * wired up, only the `login()` function below needs to be replaced with a
 * real Supabase call. Everything else (session storage, remember-me,
 * routing) can stay as-is.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  login: (email: string, password: string, remember: boolean) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'yinglima_session_v1';

interface StoredSession {
  sessionId: string;
  user: AuthUser;
  createdAt: string;
}

// Demo credential store. In a real system this lives server-side (Supabase).
// Kept here only so the mock login has something to check against.
const DEMO_ACCOUNTS: { email: string; password: string; user: AuthUser }[] = [
  {
    email: 'admin@yinglima.com',
    password: 'Admin@123',
    user: { id: 't1', name: 'Yinglima Admin', email: 'admin@yinglima.com', role: 'Super Admin', avatarInitials: 'YA' },
  },
  {
    email: 'david@fb-uganda.com',
    password: 'David@123',
    user: { id: 't2', name: 'David Musoke', email: 'david@fb-uganda.com', role: 'Uganda Procurement Manager', avatarInitials: 'DM' },
  },
  {
    email: 'zhang@yinglima.cn',
    password: 'Zhang@123',
    user: { id: 't3', name: 'John Zhang', email: 'zhang@yinglima.cn', role: 'China Sourcing Specialist', avatarInitials: 'JZ' },
  },
];

function genSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function readStoredSession(): StoredSession | null {
  try {
    const fromLocal = localStorage.getItem(SESSION_KEY);
    if (fromLocal) return JSON.parse(fromLocal);
    const fromSession = sessionStorage.getItem(SESSION_KEY);
    if (fromSession) return JSON.parse(fromSession);
  } catch {
    // ignore corrupted storage
  }
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Restore session on load
  useEffect(() => {
    const stored = readStoredSession();
    if (stored) {
      setUser(stored.user);
      setSessionId(stored.sessionId);
      setRememberMe(!!localStorage.getItem(SESSION_KEY));
    }
  }, []);

  const login = (email: string, password: string, remember: boolean) => {
    const match = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
    );
    if (!match) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    const newSessionId = genSessionId();
    const session: StoredSession = { sessionId: newSessionId, user: match.user, createdAt: new Date().toISOString() };

    // Remember me -> persists across browser restarts (localStorage).
    // Otherwise -> cleared when the browser tab/session ends (sessionStorage).
    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.removeItem(SESSION_KEY);
    }

    setUser(match.user);
    setSessionId(newSessionId);
    setRememberMe(remember);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setSessionId(null);
    setRememberMe(false);
  };

  return (
    <AuthContext.Provider value={{ user, sessionId, isAuthenticated: !!user, rememberMe, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { DEMO_ACCOUNTS };
