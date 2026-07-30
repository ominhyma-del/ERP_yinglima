import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { findMemberByEmail, TeamMember, AccountType, PermissionSet, useTeamStore } from '../team/teamStore';
import { teamApi } from '../../api/teamApi';

/**
 * ── Mock Authentication ───────────────────────────────────────────────────
 *
 * Frontend-only mock auth layer (session id, remember-me persistence,
 * logout) that authenticates against the shared team store in
 * `features/team/teamStore.ts` — the same data Team Members and Roles &
 * Permissions read/write. That means promoting someone to Admin there is
 * immediately reflected here the next time they log in.
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
  login: (email: string, password: string, remember: boolean) => Promise<{ ok: boolean; error?: string }>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { members } = useTeamStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

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
  // changes them elsewhere while logged in.
  useEffect(() => {
    if (!user) return;
    const fresh = members.find((m) => m.id === user.id);
    if (fresh) setUser(toAuthUser(fresh));
    else {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const login = async (email: string, password: string, remember: boolean) => {
    const latestMembers = await teamApi.getMembers();
    const member = latestMembers.find((m) => m.email.toLowerCase() === email.trim().toLowerCase());
    if (!member || member.password !== password) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    if (member.status === 'INACTIVE') {
      return { ok: false, error: 'This account has been deactivated. Contact your administrator.' };
    }
    const newSessionId = genSessionId();
    const session: StoredSession = { sessionId: newSessionId, memberId: member.id, createdAt: new Date().toISOString() };

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

    // Audit trace logging
    const auditLogs = JSON.parse(localStorage.getItem('yinglima_audit_logs') || '[]');
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_email: email,
      action: 'LOGIN_SUCCESS',
      entity: 'USER_AUTH',
      entity_id: member.id,
      role: member.accountType,
      ip_address: '127.0.0.1 (Local Session)',
      status: 'SUCCESS',
      description: `User "${email}" authenticated successfully as ${member.accountType}`,
    };
    localStorage.setItem('yinglima_audit_logs', JSON.stringify([newLog, ...auditLogs]));

    // Always land on a clean, permission-safe screen for the newly signed-in
    // session, instead of whatever route was left in the address bar from a
    // previous user's session.
    navigate('/dashboard', { replace: true });

    return { ok: true };
  };

  const logout = () => {
    if (user) {
      const auditLogs = JSON.parse(localStorage.getItem('yinglima_audit_logs') || '[]');
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_email: user.email,
        action: 'LOGOUT',
        entity: 'USER_AUTH',
        entity_id: user.id,
        role: user.accountType,
        ip_address: '127.0.0.1 (Local Session)',
        status: 'SUCCESS',
        description: `User "${user.email}" logged out`,
      };
      localStorage.setItem('yinglima_audit_logs', JSON.stringify([newLog, ...auditLogs]));
    }

    // Clear every trace of the session — both storage locations (regardless
    // of which one "remember me" used), and all in-memory auth state — so
    // the sign-out is complete rather than leaving a session half-active.
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setSessionId(null);
    setRememberMe(false);

    // Reset the URL back to root so a stale, permission-gated route isn't
    // left in the address bar for whoever signs in next on this device.
    navigate('/', { replace: true });
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
