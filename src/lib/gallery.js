import { api } from './auth.js';

/*
  Galleries opened with a code (backend/src/routes/gallerycode.js, /api/v1/gallery-codes).

  Opening a code makes this browser a client of that one gallery: the API keeps the session in an
  HttpOnly cookie (sent only to /api/v1/gallery-codes), so nothing here stores the code or a token.
  The dashboard checks in every minute; while it does, it holds one of the gallery's seats (a code
  may allow only so many browsers at once).

  Wrong codes count against this connection: after a few, the API blocks codes for a while and
  answers 429 with retryAfterSeconds.
*/

/** A typed or scanned code → { role: 'client', gallery, session }. */
export const openByCode = (code) => api('/gallery-codes/open', { method: 'POST', body: { code } });

/** Is a gallery open in this browser? The same answer, or 401 / 410. Also the minute-by-minute check-in. */
export const checkGallery = () => api('/gallery-codes/session', { auth: false });

/** Frees the seat and forgets the gallery in this browser. */
export const leaveGallery = () => api('/gallery-codes/leave', { method: 'POST', auth: false }).catch(() => {});

/** A signed-in client's own galleries. */
export const myGalleries = () => api('/gallery-codes/mine').then((d) => d.galleries || []);

/** Opens one of a signed-in client's galleries in this browser. */
export const enterGallery = (id) => api(`/gallery-codes/${encodeURIComponent(id)}/enter`, { method: 'POST' });

/** How often the open dashboard checks in (the API frees a seat after three quiet minutes). */
export const CHECK_IN_MS = 60_000;

/*
  A visit lasts 24 hours from when the code was entered (the API's GALLERY_SESSION_HOURS); then the
  dashboard goes back to the sign-in page, which asks for the code again (VISIT_ENDED). This browser
  keeps only when its visit ends (a time, never the code), so that a visit that ran out while the
  page was closed is told apart from one that never began.
*/
export const VISIT_HOURS = 24;
export const VISIT_ENDED = '/login?gallery=ended';
// a client account that never entered its gallery's code: the sign-in page asks for it (no "time's up")
export const CODE_FIRST = '/login?gallery=code';
const VISIT_KEY = 'actionify:gallery-visit-ends';

export function rememberVisit(expiresAt) {
  const t = Date.parse(expiresAt);
  try {
    if (t) localStorage.setItem(VISIT_KEY, String(t));
  } catch {
    /* storage off: the check-in still ends the visit */
  }
}
export function forgetVisit() {
  try {
    localStorage.removeItem(VISIT_KEY);
  } catch {
    /* nothing kept */
  }
}
/** A visit this browser had has run out. */
export function visitRanOut() {
  try {
    const t = Number(localStorage.getItem(VISIT_KEY));
    return t > 0 && t <= Date.now();
  } catch {
    return false;
  }
}
