import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { findMemberByEmail, TeamMember, AccountType, PermissionSet, useTeamStore, SEED_MEMBERS } from '../team/teamStore';
import { teamApi } from '../../api/teamApi';
import api from '../../lib/api';
import { WifiOff } from 'lucide-react';

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
  isOnline: boolean;
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

function toAuthUser(m: TeamMember): AuthUser {
  const parts = m.name.trim().split(/\s+/);
  let initials = 'U';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  return {
    id: m.id,
    name: m.name,
    email: m.email,
    accountType: m.accountType,
    department: m.department,
    avatarInitials: initials,
    permissions: m.permissions,
  };
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.sessionId === 'string' && typeof parsed.memberId === 'string') {
      return parsed;
    }
  } catch (err) {
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

  // Network Offline / Online Monitoring State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true,
  );

  const navigate = useNavigate();

  // Listen to Network Disconnect / Reconnect Events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Restore session when members are loaded from backend (or from offline cache)
  useEffect(() => {
    async function restore() {
      try {
        const stored = readStoredSession();
        const cachedUserStr = localStorage.getItem('yinglima_auth_user');

        if (stored || cachedUserStr) {
          // 1. Immediately restore cached auth user so user NEVER gets logged out on network outage
          if (cachedUserStr) {
            try {
              const cachedUser = JSON.parse(cachedUserStr);
              setUser(cachedUser);
              setSessionId(stored?.sessionId || 'sess_offline');
              setRememberMe(!!localStorage.getItem(SESSION_KEY));
            } catch (e) {}
          }

          // 2. Try fetching latest member details from network if online
          try {
            const latestMembers = await teamApi.getMembers();
            if (Array.isArray(latestMembers) && stored?.memberId) {
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
          } catch (netErr) {
            console.warn('Network offline or DB unreachable during restore — keeping cached session active.');
          }
        }
      } catch (err) {
        console.error('Session restore error:', err);
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
      const authUser = toAuthUser(fresh);
      setUser(authUser);
      localStorage.setItem('yinglima_auth_user', JSON.stringify(authUser));
    }
  }, [members, user?.id, user?.email]);

  const login = async (email: string, password: string, remember: boolean) => {
    let latestMembers = await teamApi.getMembers();
    const cleanEmail = email.trim().toLowerCase();
    let member = latestMembers?.find((m) => m.email.toLowerCase() === cleanEmail);
    const seedMatch = SEED_MEMBERS.find((m) => m.email.toLowerCase() === cleanEmail);

    if (!member) {
      member = seedMatch;
    }

    if (!member) {
      return { ok: false, error: 'Invalid email or password.' };
    }

    if (member.password && member.password !== password) {
      return { ok: false, error: 'Invalid email or password.' };
    }

    if (member.status === 'INACTIVE') {
      return { ok: false, error: 'This account has been deactivated. Please contact an administrator.' };
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

    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('yinglima_auth_user');
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setSessionId(null);
    setRememberMe(false);

    navigate('/login', { replace: true });
  };

  const refreshUser = () => {
    if (!user) return;
    const fresh = members.find((m) => m.id === user.id);
    if (fresh) {
      const authUser = toAuthUser(fresh);
      setUser(authUser);
      localStorage.setItem('yinglima_auth_user', JSON.stringify(authUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, sessionId, isAuthenticated: !!user, rememberMe, isInitializing, isOnline, login, logout, refreshUser }}
    >
      {children}

      {/* FLOATING NETWORK DISCONNECT INDICATOR (PRESERVES USER LOGGED IN STATE) */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 z-[99999] bg-amber-500 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-amber-300">
          <WifiOff size={20} className="shrink-0" />
          <div>
            <p className="font-extrabold text-sm">Network Not Connected</p>
            <p className="text-[11px] font-medium opacity-95">Working Offline — User Session Preserved</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
