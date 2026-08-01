import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountType, PermissionSet } from '../team/teamStore';
import { authApi, refreshAccessToken, wasLastRefreshFailureAuthRejection } from '../../lib/api';
import {
  setAccessToken,
  setCurrentUser,
  getCurrentUser,
  clearSession,
  subscribe,
  SESSION_EXPIRED_EVENT,
  CurrentUserSnapshot,
} from '../../lib/tokenStore';
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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(m: CurrentUserSnapshot): AuthUser {
  const parts = (m.full_name || '').trim().split(/\s+/).filter(Boolean);
  let initials = 'U';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    initials = parts[0].slice(0, 2).toUpperCase();
  }

  const accountType: AccountType = m.role === 'ADMIN' || m.role === 'SUPER_ADMIN' ? 'ADMIN' : 'EMPLOYEE';

  return {
    id: m.id,
    name: m.full_name,
    email: m.email,
    accountType,
    department: m.department || '',
    avatarInitials: initials,
    permissions: (m.permissions || {}) as PermissionSet,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true,
  );

  const navigate = useNavigate();

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

  // Keep local React state in sync with the shared token store (which the
  // axios interceptor in lib/api.ts also writes to after a silent refresh).
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const snapshot = getCurrentUser();
      setUser(snapshot ? toAuthUser(snapshot) : null);
    });
    return unsubscribe;
  }, []);

  // If a silent token refresh ever fails outright (refresh cookie expired,
  // revoked, or the account was deleted/deactivated), the api client
  // broadcasts this event so we can cleanly drop the user back to /login
  // instead of leaving the UI in a half-authenticated state.
  useEffect(() => {
    const handleExpired = () => {
      clearSession();
      setSessionId(null);
      navigate('/login', { replace: true });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [navigate]);

  // On first load, there is no access token in memory yet (by design — it is
  // never persisted). Try a silent refresh against the httpOnly cookie; if
  // that succeeds, fetch the real /auth/me profile.
  useEffect(() => {
    let cancelled = false;

    // BUG FIX (hard browser refresh specifically): a full page reload tears
    // down the whole JS runtime, so this is a cold start — no in-memory
    // token, a cookie that may not have finished round-tripping yet, and
    // (on some hosts) the dev/API server still warming up. The original
    // code treated ANY failure here — a real "you're not logged in" 401,
    // or a transient network hiccup/CORS preflight timeout/DNS blip that
    // has nothing to do with the session — identically: clearSession() and
    // drop to /login. That second case is a false logout.
    //
    // Fix: only treat a genuine 401/403 from the server as "not logged in".
    // Anything else (no response at all, 5xx, network error) is retried
    // once after a short delay before giving up, and even then we do NOT
    // nuke a session the server never actually rejected — we just stop
    // initializing and let the normal per-request 401 handling in api.ts
    // take over from here.
    async function attemptRestore(): Promise<'ok' | 'unauthenticated' | 'transient-failure'> {
      try {
        const token = await refreshAccessToken();
        if (!token) {
          // refreshAccessToken() distinguishes a real server rejection
          // (401/403 — cookie missing/expired/revoked) from a transient
          // failure (network error, timeout, 5xx). Only the former means
          // "no session"; the latter should be retried, not treated as a
          // logout.
          return wasLastRefreshFailureAuthRejection() ? 'unauthenticated' : 'transient-failure';
        }
        if (cancelled) return 'ok';

        const meResponse = await authApi.get('/auth/me');
        if (cancelled) return 'ok';

        const profile = meResponse.data?.data || meResponse.data;
        if (profile?.id) {
          setCurrentUser(profile);
          setSessionId('sess_' + profile.id.slice(0, 12));
          setRememberMe(true);
          return 'ok';
        }
        // Got a 200 with no usable profile body — treat as unauthenticated
        // rather than silently leaving the UI half-initialized.
        return 'unauthenticated';
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          return 'unauthenticated';
        }
        // No status at all (network error, timeout, CORS failure) or a
        // 5xx from the server — this is NOT proof the session is invalid.
        return 'transient-failure';
      }
    }

    async function restore() {
      let outcome = await attemptRestore();

      // One short, silent retry for transient failures only — covers the
      // common hard-refresh case where the API server/cookie jar hasn't
      // settled yet. We do not retry 'unauthenticated', since that's a
      // real answer from the server, not a fluke.
      if (outcome === 'transient-failure' && !cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (!cancelled) {
          outcome = await attemptRestore();
        }
      }

      if (cancelled) return;

      if (outcome === 'unauthenticated') {
        clearSession();
      }
      // On persistent 'transient-failure' we deliberately do NOT clear an
      // existing session — there may not be one to clear anyway on a cold
      // load, but if there is (e.g. this effect re-ran after a flaky
      // reconnect), we leave it alone rather than logging the user out
      // for a problem that wasn't theirs.

      setIsInitializing(false);
    }

    restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      try {
        const response = await authApi.post('/auth/login', {
          email: email.trim(),
          password,
          rememberMe: remember,
        });
        const result = response.data?.data || response.data;

        setAccessToken(result.accessToken);
        setCurrentUser(result.user);
        setSessionId(result.sessionId || null);
        setRememberMe(remember);

        navigate('/dashboard', { replace: true });
        return { ok: true };
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error?.message ||
          'Invalid email or password.';
        return { ok: false, error: Array.isArray(message) ? message[0] : message };
      }
    },
    [navigate],
  );

  const logout = useCallback(() => {
    authApi.post('/auth/logout', { sessionId }).catch(() => { });
    clearSession();
    setSessionId(null);
    setRememberMe(false);
    navigate('/login', { replace: true });
  }, [navigate, sessionId]);

  const refreshUser = useCallback(async () => {
    try {
      const meResponse = await authApi.get('/auth/me');
      const profile = meResponse.data?.data || meResponse.data;
      if (profile?.id) {
        setCurrentUser(profile);
      }
    } catch {
      // If this fails because the token expired mid-session, the response
      // interceptor in lib/api.ts already tried a silent refresh for us on
      // any /api/v1 call; /auth/me itself is unauthenticated-tolerant here
      // since AuthController#me requires the JwtAuthGuard, so a genuine
      // failure means the session really is gone.
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, sessionId, isAuthenticated: !!user, rememberMe, isInitializing, isOnline, login, logout, refreshUser }}
    >
      {children}

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