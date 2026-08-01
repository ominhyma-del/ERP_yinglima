import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getCurrentUser, setAccessToken, broadcastSessionExpired } from './tokenStore';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}:4000/api/v1`;
  }
  return 'http://localhost:4000/api/v1';
};

// A second instance pointed at the auth routes (which live at /auth, not
// /api/v1/auth) — kept separate so the refresh call below never recurses
// through the same interceptors that trigger it.
const authBaseURL = () => getBaseURL().replace(/\/api\/v1$/, '');

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  // Required so the httpOnly refresh-token cookie is sent/received.
  withCredentials: true,
});

const authApi = axios.create({
  baseURL: authBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// BUG FIX: authApi previously had no request interceptor, so calls like
// GET /auth/me went out with NO Authorization header at all — guaranteeing
// a 401 even immediately after a successful POST /auth/refresh. Attach the
// in-memory access token here too (but skip /auth/refresh itself, which
// intentionally rides on the httpOnly cookie, not a bearer token).
authApi.interceptors.request.use((config) => {
  if (!config.url?.includes('/auth/refresh')) {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Attach the current JWT access token + tenant/user context on every request.
api.interceptors.request.use((config) => {
  const activeCompanyId = localStorage.getItem('activeCompanyId') || '11111111-1111-1111-1111-111111111111';
  config.headers['x-company-id'] = activeCompanyId;

  const token = getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  const user = getCurrentUser();
  if (user) {
    config.headers['x-user-name'] = user.full_name;
    config.headers['x-user-id'] = user.id;
  }

  return config;
});

// Unwrap standardized NestJS API responses.
function unwrap(response: any) {
  if (
    response.data &&
    typeof response.data === 'object' &&
    'success' in response.data &&
    'data' in response.data
  ) {
    const unwrappedData = response.data.data;
    if (response.data.pagination && Array.isArray(unwrappedData)) {
      (unwrappedData as any).pagination = response.data.pagination;
    }
    return { ...response, data: unwrappedData };
  }
  return response;
}

// Single-flight refresh so concurrent 401s don't trigger a refresh stampede.
let refreshPromise: Promise<string | null> | null = null;

// BUG FIX: this used to collapse every failure mode of POST /auth/refresh
// into the same outcome (return null + broadcastSessionExpired()) — so a
// genuinely expired/invalid refresh cookie and a plain network error (the
// API server not answering yet on a cold hard-refresh, a dropped
// connection, a CORS preflight timeout, etc.) both forced an immediate
// logout redirect. Only an actual 401/403 from the server means the
// session is really gone; anything else is a transient failure and should
// NOT nuke the session or fire the "you're logged out" event.
let lastRefreshFailureWasAuthRejection = false;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = authApi
      .post('/auth/refresh', {})
      .then((res) => {
        const newToken = res.data?.data?.accessToken || res.data?.accessToken || null;
        setAccessToken(newToken);
        lastRefreshFailureWasAuthRejection = false;
        return newToken;
      })
      .catch((err) => {
        const status = err?.response?.status;
        const isRealAuthRejection = status === 401 || status === 403;
        lastRefreshFailureWasAuthRejection = isRealAuthRejection;

        setAccessToken(null);
        if (isRealAuthRejection) {
          // Cookie missing, expired, revoked, or the account no longer
          // exists — this really is "you're logged out".
          broadcastSessionExpired();
        }
        // For anything else (network error, timeout, 5xx), we deliberately
        // do NOT broadcast session-expired here. The caller (AuthContext's
        // restore(), or the response interceptor below) decides what to do
        // with a plain null in that case — typically "retry once, then
        // leave the current state alone" rather than force a logout.
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** Whether the most recent failed refreshAccessToken() call was a genuine
 * server-side auth rejection (401/403) as opposed to a network/transient
 * failure. Only meaningful immediately after refreshAccessToken() resolves
 * to null. */
function wasLastRefreshFailureAuthRejection(): boolean {
  return lastRefreshFailureWasAuthRejection;
}

api.interceptors.response.use(
  (response) => unwrap(response),
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        if (typeof (originalRequest.headers as any)?.set === 'function') {
          (originalRequest.headers as any).set('Authorization', `Bearer ${newToken}`);
        } else {
          originalRequest.headers = originalRequest.headers ?? ({} as any);
          (originalRequest.headers as any)['Authorization'] = `Bearer ${newToken}`;
        }
        return api(originalRequest).then(unwrap);
      }
    }

    return Promise.reject(error);
  },
);

// BUG FIX: if a call through authApi (e.g. GET /auth/me) 401s because the
// in-memory access token expired mid-session, retry once via silent
// refresh instead of surfacing a raw 401 — mirrors the `api` instance's
// behavior above. /auth/refresh itself is excluded to avoid recursion.
authApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isRefreshCall) {
      originalRequest._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        if (typeof (originalRequest.headers as any)?.set === 'function') {
          (originalRequest.headers as any).set('Authorization', `Bearer ${newToken}`);
        } else {
          originalRequest.headers = originalRequest.headers ?? ({} as any);
          (originalRequest.headers as any)['Authorization'] = `Bearer ${newToken}`;
        }
        return authApi(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);

export { authApi, refreshAccessToken, wasLastRefreshFailureAuthRejection };
export default api;