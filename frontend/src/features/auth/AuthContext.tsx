import React, { createContext, useContext, useState, useEffect } from 'react';
import { findMemberByEmail, TeamMember, AccountType, PermissionSet } from '../team/teamStore';

/**
 * ── Mock Authentication ───────────────────────────────────────────────────
 *
 * Frontend-only mock auth layer (session id, remember-me persistence,
 * logout) that authenticates against the shared team store in
 * `features/team/teamStore.ts` — the same data Team Members and Roles &
 * Permissions read/write. That means promoting someone to Admin there is
 * immediately reflected here the next time they log in.
 *
 * Not wired to a real backend yet. When real auth is added, only the
 * `login()` function below needs replacing — everything else (session
 * storage, remember-me, routing) can stay as-is.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  department: string;
  avatarInitials: string;
  permissions: PermissionSet;
}

interface AuthContextValue {
  user: AuthUser | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  login: (email: string, password: string, remember: boolean) => { ok: boolean; error?: string };
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'yinglima_session_v1';

interface StoredSession {
  sessionId: string;
  memberId: string;
  createdAt: string;
}

function genSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '??';
}

function toAuthUser(member: TeamMember): AuthUser {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    accountType: member.accountType,
    department: member.department,
    avatarInitials: initials(member.name),
    permissions: member.permissions,
  };
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

// Look a member up by id via the same store the rest of the app uses.
// (Kept as a plain import-time function rather than the hook, since this
// runs outside React component render.)
import { useTeamStore } from '../team/teamStore';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { members } = useTeamStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Restore session on load
  useEffect(() => {
    const stored = readStoredSession();
    if (stored) {
      const member = members.find((m) => m.id === stored.memberId);
      if (member) {
        setUser(toAuthUser(member));
        setSessionId(stored.sessionId);
        setRememberMe(!!localStorage.getItem(SESSION_KEY));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the logged-in user's permissions/account type live if an admin
  // changes them elsewhere (e.g. promotes them, or edits their permissions)
  // while they're logged in, without requiring a re-login.
  useEffect(() => {
    if (!user) return;
    const fresh = members.find((m) => m.id === user.id);
    if (fresh) setUser(toAuthUser(fresh));
    else {
      // Member was deleted while logged in -> force logout
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const login = (email: string, password: string, remember: boolean) => {
    const member = findMemberByEmail(email);
    if (!member || member.password !== password) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    if (member.status === 'INACTIVE') {
      return { ok: false, error: 'This account has been deactivated. Contact your administrator.' };
    }
    const newSessionId = genSessionId();
    const session: StoredSession = { sessionId: newSessionId, memberId: member.id, createdAt: new Date().toISOString() };

    // Remember me -> persists across browser restarts (localStorage).
    // Otherwise -> cleared when the browser tab/session ends (sessionStorage).
    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.removeItem(SESSION_KEY);
    }

    setUser(toAuthUser(member));
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

  const refreshUser = () => {
    if (!user) return;
    const fresh = members.find((m) => m.id === user.id);
    if (fresh) setUser(toAuthUser(fresh));
  };

  return (
    <AuthContext.Provider value={{ user, sessionId, isAuthenticated: !!user, rememberMe, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
