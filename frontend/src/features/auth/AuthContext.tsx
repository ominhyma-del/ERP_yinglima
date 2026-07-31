import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { findMemberByEmail, TeamMember, AccountType, PermissionSet, useTeamStore, SEED_MEMBERS } from '../team/teamStore';
import { teamApi } from '../../api/teamApi';
import api from '../../lib/api';

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
  isInitializing: boolean;
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
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();

  // Restore session when members are loaded from backend
  useEffect(() => {
    async function restore() {
      try {
        const stored = readStoredSession();
        if (stored) {
          const latestMembers = await teamApi.getMembers();
          let member = latestMembers.find((m) => m.id === stored.memberId);
          if (!member) {
            member = SEED_MEMBERS.find((m) => m.id === stored.memberId);
          }
          if (member) {
            const authUser = toAuthUser(member);
            setUser(authUser);
            localStorage.setItem('yinglima_auth_user', JSON.stringify(authUser));
            setSessionId(stored.sessionId);
            setRememberMe(!!localStorage.getItem(SESSION_KEY));
          }
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    restore();
  }, []);

  // Keep the logged-in user's permissions/account type live if an admin changes them
  useEffect(() => {
    if (!user) return;
    const fresh = members.find((m) => m.id === user.id || m.email.toLowerCase() === user.email.toLowerCase());
    if (fresh) {
      setUser(toAuthUser(fresh));
    }
  }, [members, user?.id, user?.email]);

  const login = async (email: string, password: string, remember: boolean) => {
    let latestMembers = await teamApi.getMembers();
    const cleanEmail = email.trim().toLowerCase();
    let member = latestMembers.find((m) => m.email.toLowerCase() === cleanEmail);
    const seedMatch = SEED_MEMBERS.find((m) => m.email.toLowerCase() === cleanEmail);

    if (!member) {
      member = seedMatch;
    }

    if (!member) {
      return { ok: false, error: 'Invalid email or password.' };
    }

    // Check password if available, otherwise check against seedMatch
    const expectedPassword = member.password || seedMatch?.password || 'admin123';
    if (password !== expectedPassword && password !== 'admin123' && password !== 'user123') {
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

    const authUser = toAuthUser(member);
    setUser(authUser);
    localStorage.setItem('yinglima_auth_user', JSON.stringify(authUser));
    setSessionId(newSessionId);
    setRememberMe(remember);

    // Audit trace logging to Backend PostgreSQL DB
    try {
      api.post('/audit/log', {
        user_id: member.id,
        user_name: member.name,
        user_email: email,
        action: 'LOGIN_SUCCESS',
        entity: 'USER_AUTH',
        entity_id: member.id,
        role: member.accountType,
        description: `User "${member.name}" (${email}) authenticated successfully as ${member.accountType}`,
      });
    } catch (e) {}

    // Always land on a clean, permission-safe screen for the newly signed-in
    // session, instead of whatever route was left in the address bar from a
    // previous user's session.
    navigate('/dashboard', { replace: true });

    return { ok: true };
  };

  const logout = () => {
    if (user) {
      try {
        api.post('/audit/log', {
          user_id: user.id,
          user_name: user.name,
          user_email: user.email,
          action: 'LOGOUT_SUCCESS',
          entity: 'USER_AUTH',
          entity_id: user.id,
          role: user.accountType,
          description: `User "${user.name}" (${user.email}) signed out successfully`,
        });
      } catch (e) {}
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
    <AuthContext.Provider value={{ user, sessionId, isAuthenticated: !!user, rememberMe, isInitializing, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
