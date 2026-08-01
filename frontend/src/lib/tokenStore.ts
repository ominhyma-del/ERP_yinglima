/**
 * ── In-memory access token store ────────────────────────────────────────
 *
 * The JWT access token is intentionally kept ONLY in memory (a module-level
 * variable), never in localStorage/sessionStorage. Anything written to
 * localStorage is readable by any script on the page (XSS = instant token
 * theft); an in-memory value disappears on tab close/reload.
 *
 * The refresh token never touches JS at all — the backend sets it as an
 * httpOnly cookie (see auth.controller.ts), so a hard page reload silently
 * re-authenticates by calling POST /auth/refresh (which rides on that
 * cookie) rather than by reading anything out of storage.
 */

export interface CurrentUserSnapshot {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'EMPLOYEE' | string;
  department?: string | null;
  branch?: string | null;
  permissions: Record<string, { view: boolean; edit: boolean; delete: boolean }>;
}

let accessToken: string | null = null;
let currentUser: CurrentUserSnapshot | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setCurrentUser(user: CurrentUserSnapshot | null) {
  currentUser = user;
  listeners.forEach((l) => l());
}

export function getCurrentUser(): CurrentUserSnapshot | null {
  return currentUser;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSession() {
  accessToken = null;
  currentUser = null;
  listeners.forEach((l) => l());
}

/** Dispatched by the API client when a refresh attempt fails, so AuthContext
 * can react (clear state, redirect to /login) without a circular import. */
export const SESSION_EXPIRED_EVENT = 'yinglima:session-expired';

export function broadcastSessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}
