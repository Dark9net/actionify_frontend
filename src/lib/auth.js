import { useSyncExternalStore } from 'react';

/*
  Accounts: sign in, create an account, confirm the email, reset a password, open a gallery by its
  code, and who is signed in. Everything goes to the studio's API (backend/, /api/v1/auth).

  The site and the API share one origin: in development Vite forwards /api to the API
  (vite.config.js, API_PROXY); on the live site both sit behind the same domain. VITE_API_URL points
  elsewhere only if the API has its own origin (it must then be same-site, for the cookies).

  Security, from this side:
    - the access token lives in this module's memory only (never localStorage), so a script that
      runs on the page later can't read a token left behind; a reload gets a new one from the
      refresh cookie, which is HttpOnly and only ever sent to /api/v1/auth;
    - every POST/PATCH carries the CSRF token from GET /auth/csrf;
    - signing out in one tab signs out every tab (BroadcastChannel).
*/
export const API = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api/v1`;

/** The API can't be reached (not running, or no network). */
export class NotConnected extends Error {}

/** The API said no: `message` is written for people; `code`, `field` and `errors` are for the form. */
export class AuthError extends Error {
  constructor(message, { status = 0, code, field, errors, retryAfterSeconds, missing } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
    this.errors = errors;
    this.retryAfterSeconds = retryAfterSeconds;
    this.missing = missing; // UPLOAD_INCOMPLETE: the parts of a large file R2 doesn't have yet
  }
}

/* ---------- Who is signed in ---------- */

// status: 'unknown' (not asked yet), 'loading', 'signedIn', 'signedOut' or 'offline'
let state = { status: 'unknown', user: null, galleries: [] };
let accessToken = null;
let refreshTimer = null;
const subs = new Set();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('actionify-auth') : null;

function setState(next) {
  state = { ...state, ...next };
  subs.forEach((f) => f());
}

function applySession(data) {
  accessToken = data.accessToken;
  clearTimeout(refreshTimer);
  // a minute before the token runs out, quietly get the next one
  const ms = Math.max(30, (data.expiresIn || 900) - 60) * 1000;
  refreshTimer = setTimeout(() => restoreSession({ force: true }), ms);
  setState({ status: 'signedIn', user: data.user, galleries: data.galleries || [] });
}

function clearSession(status = 'signedOut') {
  accessToken = null;
  clearTimeout(refreshTimer);
  setState({ status, user: null, galleries: [] });
}

channel?.addEventListener('message', (e) => {
  if (e.data === 'signed-out') clearSession();
  if (e.data === 'signed-in' && state.status !== 'signedIn') restoreSession({ force: true });
});

const subscribe = (f) => {
  subs.add(f);
  return () => subs.delete(f);
};
export const getSession = () => state;
/** { status, user, galleries }; call restoreSession() once to find out who is signed in. */
export const useSession = () => useSyncExternalStore(subscribe, getSession, getSession);

/** The signed-in user may open the photographer panel. */
export const isStaff = (user) => Boolean(user?.role?.isStaff && user.permissions?.includes('panel.access'));
export const can = (user, permission) => Boolean(user?.permissions?.includes(permission));

/* ---------- Talking to the API ---------- */

let csrf = null;
async function csrfToken() {
  if (csrf) return csrf;
  let res;
  try {
    res = await fetch(`${API}/auth/csrf`, { credentials: 'include' });
  } catch {
    throw new NotConnected();
  }
  if (!res.ok) throw new NotConnected();
  csrf = (await res.json()).csrfToken;
  return csrf;
}

/**
 * One call to the API. `auth` sends the access token (and, if it has run out, refreshes once and
 * tries again). Resolves with the JSON body; throws AuthError or NotConnected.
 */
export async function api(path, { method = 'GET', body, raw, auth = true, retry = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // raw: { data: Blob, type }: a file sent as it is (a profile photo)
  if (raw) headers['Content-Type'] = raw.type;
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrfToken();
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: raw ? raw.data : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new NotConnected();
  }
  if (res.status === 204) return {};
  const data = (res.headers.get('content-type') || '').includes('application/json') ? await res.json().catch(() => null) : null;
  // the proxy answering for an API that isn't running
  if (!data) {
    if (res.status >= 500) throw new NotConnected();
    throw new AuthError('Something went wrong. Please try again.', { status: res.status });
  }

  if (retry && res.status === 403 && data.code === 'CSRF_INVALID') {
    csrf = null; // the cookie expired or was cleared: get a fresh pair and try once more
    return api(path, { method, body, raw, auth, retry: false });
  }
  if (retry && auth && res.status === 401 && data.code === 'UNAUTHENTICATED' && accessToken) {
    if (await restoreSession({ force: true })) return api(path, { method, body, raw, auth, retry: false });
  }
  if (!res.ok || data.ok === false) {
    if (res.status === 401 && auth) clearSession();
    throw new AuthError(data.message || 'Something went wrong. Please try again.', { status: res.status, ...data });
  }
  return data;
}

/* ---------- Sessions ---------- */

let restoring = null;
/**
 * Asks the API who is signed in on this browser (the refresh cookie). Called once when a page
 * that cares opens, and again before the access token runs out. Resolves true when signed in.
 */
export function restoreSession({ force = false } = {}) {
  if (restoring) return restoring;
  if (!force && (state.status === 'signedIn' || state.status === 'signedOut')) return Promise.resolve(state.status === 'signedIn');
  if (state.status !== 'signedIn') setState({ status: 'loading' });
  restoring = (async () => {
    try {
      const data = await api('/auth/refresh', { method: 'POST', auth: false, retry: true });
      if (data.accessToken) {
        applySession(data);
        return true;
      }
      clearSession();
      return false;
    } catch (err) {
      clearSession(err instanceof NotConnected ? 'offline' : 'signedOut');
      return false;
    } finally {
      restoring = null;
    }
  })();
  return restoring;
}

export async function signIn({ email, password, remember }) {
  const data = await api('/auth/login', { method: 'POST', auth: false, body: { email, password, remember } });
  applySession(data);
  channel?.postMessage('signed-in');
  return data;
}

/** Ends the session on this device; the caller then goes to /login whatever the answer. */
export async function signOut() {
  try {
    await api('/auth/logout', { method: 'POST', auth: false });
  } finally {
    clearSession();
    channel?.postMessage('signed-out');
  }
}

export async function signOutEverywhere() {
  try {
    await api('/auth/logout-all', { method: 'POST' });
  } finally {
    clearSession();
    channel?.postMessage('signed-out');
  }
}

/* ---------- Accounts ---------- */

export const signUp = ({ name, email, password, code, terms }) =>
  api('/auth/signup', { method: 'POST', auth: false, body: { name, email, password, code: code || undefined, terms } });
export const verifyEmail = (token) => api('/auth/verify-email', { method: 'POST', auth: false, body: { token } });
export const resendVerification = ({ email }) => api('/auth/resend-verification', { method: 'POST', auth: false, body: { email } });
export const requestReset = ({ email }) => api('/auth/forgot-password', { method: 'POST', auth: false, body: { email } });
export const checkResetLink = (token) => api('/auth/reset-password/check', { method: 'POST', auth: false, body: { token } });
export const resetPassword = ({ token, password }) => api('/auth/reset-password', { method: 'POST', auth: false, body: { token, password } });

/** { name, mobile? }: mobile "9812345678" (staff: it goes in the client's email when they're sent); "" removes it. */
export async function updateProfile({ name, mobile }) {
  const data = await api('/auth/me', { method: 'PATCH', body: { name, mobile } });
  setState({ user: data.user, galleries: data.galleries || [] });
  return data.user;
}

/** Your own profile photo (staff): a JPEG, PNG or WebP Blob, at most 2 MB → the user, now with `photo`. */
export async function setProfilePhoto(blob) {
  const data = await api('/auth/me/photo', { method: 'PUT', raw: { data: blob, type: blob.type } });
  setState({ user: data.user });
  return data.user;
}

/** Back to your initials → the user */
export async function removeProfilePhoto() {
  const data = await api('/auth/me/photo', { method: 'DELETE' });
  setState({ user: data.user });
  return data.user;
}

export async function changePassword({ currentPassword, password }) {
  const data = await api('/auth/change-password', { method: 'POST', body: { currentPassword, password } });
  if (data.accessToken) accessToken = data.accessToken;
  return data;
}

/*
  Where to go after signing in, by role: staff (photographer, editor, assistant, studio lead) to the
  photographer panel, a client to their gallery dashboard. ?next= wins when it's a page on this site
  the role may open.
*/
export function landingFor(user, next = '') {
  if (!user) return '';
  const safe = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '';
  const staff = isStaff(user);
  if (safe && (staff || !safe.startsWith('/photographer'))) return safe;
  return staff ? '/photographer' : '/dashboard';
}
