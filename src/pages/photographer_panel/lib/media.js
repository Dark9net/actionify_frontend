/*
  Events and their photographs and videos, on the server (/api/v1/events, backend/src/routes/events.js
  and routes/media.js). The files themselves go from this browser straight to R2 (lib/uploads.js);
  this is everything around them: the list of events with what's in them, one event's files a page
  at a time, categories, moving and deleting.

  The events list is shared (the Uploads page and the sidebar's storage meter read the same one),
  and uploads tell it when a file has arrived, so counts follow along.
*/
import { useSyncExternalStore } from 'react';
import { api } from '../../../lib/auth.js';

const path = (eventId, rest = '') => `/events/${encodeURIComponent(eventId)}${rest}`;

/* ---------- Events ---------- */

/** One event: { …, categories: [{ id, name, slug, files, bytes }], uncategorised: { files, bytes }, stats }. */
export const getEvent = (eventId) => api(path(eventId)).then((d) => d.event);

export const renameEvent = (eventId, name) => api(path(eventId), { method: 'PATCH', body: { name } }).then((d) => d.event);

/**
 * Deletes the event with every file in it (from R2 too), its categories and its gallery codes.
 * `confirmName`: its name typed again (the server checks it). → { name, files, bytes }
 */
export const deleteEvent = (eventId, confirmName) => api(path(eventId), { method: 'DELETE', body: { confirmName } });

/** A category by name; one with the same folder name is returned instead of a second. → { category, created, event } */
export const addCategory = (eventId, name) => api(path(eventId, '/categories'), { method: 'POST', body: { name } });

export const renameCategory = (eventId, categoryId, name) =>
  api(path(eventId, `/categories/${encodeURIComponent(categoryId)}`), { method: 'PATCH', body: { name } }).then((d) => d.event);

export const removeCategory = (eventId, categoryId) =>
  api(path(eventId, `/categories/${encodeURIComponent(categoryId)}`), { method: 'DELETE' }).then((d) => d.event);

/* ---------- One event's files ---------- */

/** One page by name: { media, nextCursor, pageSize }. category: all | none | id; kind: all | photo | video | audio | graphic | model. */
export function listMedia(eventId, { category = 'all', kind = 'all', cursor = null, limit = 60 } = {}) {
  const q = new URLSearchParams({ limit: String(limit) });
  if (category !== 'all') q.set('category', category);
  if (kind !== 'all') q.set('kind', kind);
  if (cursor) q.set('cursor', cursor);
  return api(path(eventId, `/media?${q}`));
}

/** One file with fresh links; with `download`, also a link that saves it under its original name. */
export const getMedia = (eventId, mediaId, { download = false } = {}) =>
  api(path(eventId, `/media/${encodeURIComponent(mediaId)}${download ? '?download=1' : ''}`)).then((d) => d.media);

/**
 * [{ name, size, categoryId, lastModified, previewSize }] → [{ id, name, contentType, url, parts, resumed, previewUrl }].
 * A file over 64 MB has parts: { size, count } instead of a url (lib/parts.js).
 */
export const startUploads = (eventId, files) => api(path(eventId, '/media'), { method: 'POST', body: { files } }).then((d) => d.uploads);

/** A large file's parts: which R2 already has → { partSize, partCount, done: [numbers], restarted? } */
export const partsDone = (eventId, mediaId) => api(path(eventId, `/media/${encodeURIComponent(mediaId)}/parts`));

/** Links for some of its parts (≤ 100) → [{ number, size, url }] */
export const signParts = (eventId, mediaId, parts) =>
  api(path(eventId, `/media/${encodeURIComponent(mediaId)}/parts`), { method: 'POST', body: { parts } }).then((d) => d.parts);

export const completeUpload = (eventId, mediaId, meta) =>
  api(path(eventId, `/media/${encodeURIComponent(mediaId)}/complete`), { method: 'POST', body: meta }).then((d) => d.media);

export const abortUpload = (eventId, mediaId) => api(path(eventId, `/media/${encodeURIComponent(mediaId)}/abort`), { method: 'POST', body: {} });

export const moveMedia = (eventId, ids, categoryId) => api(path(eventId, '/media'), { method: 'PATCH', body: { ids, categoryId } });

export const removeMedia = (eventId, ids) => api(path(eventId, '/media/remove'), { method: 'POST', body: { ids } });

/* ---------- Files that just arrived ---------- */

const arrivals = new Set();
/** fn(media) for every file that reaches R2, whichever page started it. Returns the unsubscribe. */
export function onArrived(fn) {
  arrivals.add(fn);
  return () => arrivals.delete(fn);
}
export function arrived(media) {
  arrivals.forEach((fn) => fn(media));
  refreshSoon();
}

/* ---------- The events list, shared ---------- */

let store = { status: 'idle', events: [], error: '' };
const listeners = new Set();
let loading = null;

function set(next) {
  store = { ...store, ...next };
  listeners.forEach((l) => l());
}

/**
  The event's gallery code while it still opens the gallery, or null. It comes with the event from the
  server (GET /events and /events/:id add `code` for roles with access_code.view), so a code made on
  another device or on the Access codes page shows too.
*/
export function liveCode(ev, now = Date.now()) {
  const c = ev?.code;
  if (!c?.code || c.state !== 'active') return null;
  return c.expiresAt && Date.parse(c.expiresAt) <= now ? null : c;
}

/** Asks the server again (one request at a time); resolves with the events. */
export function refreshEvents() {
  if (loading) return loading;
  if (store.status === 'idle' || store.status === 'error') set({ status: 'loading', error: '' });
  loading = api('/events')
    .then((d) => {
      set({ status: 'ready', events: d.events || [], error: '' });
      return store.events;
    })
    .catch((e) => {
      set({ status: store.events.length ? 'ready' : 'error', error: e.message || 'The events could not be loaded.' });
      return store.events;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

// While files keep arriving, the counts are asked for once a second at most.
let soon = null;
function refreshSoon() {
  clearTimeout(soon);
  soon = setTimeout(refreshEvents, 1200);
}

const subscribe = (l) => {
  listeners.add(l);
  if (store.status === 'idle') refreshEvents();
  return () => listeners.delete(l);
};

/** { status: idle | loading | ready | error, events, error } — loads on first use. */
export const useEvents = () => useSyncExternalStore(subscribe, () => store);

/* ---------- Mini, small or large previews (a per-browser choice) ---------- */

const SIZES = ['mini', 'small', 'large'];
const sizeOf = (v) => (SIZES.includes(v) ? v : 'small');

const SIZE_KEY = 'actionify:preview-size';
let size = (() => {
  try {
    return sizeOf(localStorage.getItem(SIZE_KEY));
  } catch {
    return 'small';
  }
})();
const sizeListeners = new Set();
export function setPreviewSize(next) {
  size = sizeOf(next);
  try {
    localStorage.setItem(SIZE_KEY, size);
  } catch {
    /* blocked: it holds until the tab closes */
  }
  sizeListeners.forEach((l) => l());
}
export const usePreviewSize = () =>
  useSyncExternalStore(
    (l) => {
      sizeListeners.add(l);
      return () => sizeListeners.delete(l);
    },
    () => size
  );
