/*
  The studio's records for the photographer panel: events (one folder each on R2) with their categories,
  the photographs in them, gallery access codes, bookings, clients, payments and the team.

  Kept on this device (localStorage), starting empty: nothing here is sample data. Bookings, clients,
  payments and the team come from the API on their own pages; this keeps what the server sent for
  events and their codes. Every change goes through one of the actions below. Other tabs on the same
  device follow along (the storage event).
*/
import { useSyncExternalStore } from 'react';
import { slugify, uid } from './format.js';

const KEY = 'actionify:studio:v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const listeners = new Set();

const empty = () => ({ version: 2, team: [], clients: [], bookings: [], events: [], photos: [], codes: [], payments: [] });

/*
  What this device kept. A version 1 copy was filled with the old sample studio: only what came from
  the server stays (records with the server's UUIDs: events, their photos and codes); the sample
  bookings, clients, payments and team go.
*/
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 2) return { ...empty(), ...s };
      if (s && s.version === 1) {
        const events = (s.events || []).filter((e) => UUID.test(e.id));
        const kept = new Set(events.map((e) => e.id));
        return {
          ...empty(),
          events: events.map((e) => ({ ...e, bookingId: UUID.test(e.bookingId || '') ? e.bookingId : null, clientId: UUID.test(e.clientId || '') ? e.clientId : null })),
          photos: (s.photos || []).filter((p) => kept.has(p.eventId)),
          codes: (s.codes || []).filter((c) => UUID.test(c.id) && kept.has(c.eventId)),
        };
      }
    }
  } catch {
    /* blocked or broken: start again */
  }
  return empty();
}

let state = load();
save();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* full or blocked: the change still holds until the tab closes */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function set(fn) {
  state = fn(state);
  save();
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      state = JSON.parse(e.newValue);
      emit();
    } catch {
      /* ignore a half-written value */
    }
  });
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getStudio = () => state;
export const useStudio = () => useSyncExternalStore(subscribe, getStudio);

/* ---------- lookups ---------- */
export const byId = (list, id) => list.find((x) => x.id === id);

export function photographerStatus(s, memberId) {
  const at = s.bookings.find((b) => b.status === 'onsite' && b.team.includes(memberId));
  if (at) return { state: 'onsite', booking: at };
  const m = byId(s.team, memberId);
  if (m?.off) return { state: 'off' };
  return { state: 'free' };
}

/* ---------- events and categories ---------- */
/*
  An event the server made (POST /api/v1/events), kept here with the server's id, folder and
  categories, and its guest code (a real one, which opens the gallery). `bookingId` / `clientId`:
  the local records it was made from, when they aren't on the server.
*/
export function addServerEvent(ev, code, { bookingId, clientId } = {}) {
  const event = {
    id: ev.id,
    name: ev.name,
    slug: ev.slug,
    kind: ev.kind,
    date: new Date(`${ev.date}T12:00`).getTime(),
    venue: ev.venue || '',
    clientId: ev.client?.id || clientId || null,
    bookingId: ev.bookingId || bookingId || null,
    categories: ev.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    createdAt: Date.parse(ev.createdAt) || Date.now(),
  };
  const local = code && {
    id: code.id,
    code: code.code,
    eventId: ev.id,
    label: code.label || 'Guests',
    createdAt: Date.parse(code.createdAt) || Date.now(),
    expiresAt: code.expiresAt ? Date.parse(code.expiresAt) : null,
    revoked: false,
    opens: 0,
  };
  set((s) => {
    const next = { ...s, events: [event, ...s.events.filter((e) => e.id !== ev.id)] };
    if (event.bookingId) next.bookings = s.bookings.map((b) => (b.id === event.bookingId ? { ...b, eventId: ev.id } : b));
    if (local) next.codes = [local, ...s.codes];
    return next;
  });
  return { event, code: local };
}

function uniqueCategories(names, eventId) {
  const seen = new Set();
  const out = [];
  for (const raw of names) {
    const name = String(raw).trim();
    const slug = slugify(name);
    if (!name || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ id: `${eventId}_${slug}_${Math.random().toString(36).slice(2, 6)}`, name, slug });
  }
  return out;
}

export function renameEvent(eventId, name) {
  set((s) => ({ ...s, events: s.events.map((e) => (e.id === eventId ? { ...e, name: name.trim() } : e)) }));
}

/* adds a category (or finds the one of the same name) and returns its id */
export function ensureCategory(eventId, name) {
  const ev = byId(state.events, eventId);
  if (!ev) return null;
  const slug = slugify(name);
  const found = ev.categories.find((c) => c.slug === slug);
  if (found) return found.id;
  const [cat] = uniqueCategories([name], eventId);
  set((s) => ({
    ...s,
    events: s.events.map((e) => (e.id === eventId ? { ...e, categories: [...e.categories, cat] } : e)),
  }));
  return cat.id;
}

/*
  Renames a category. Its slug (the folder on R2) stays as it was: the photographs keep their keys,
  only the name the gallery shows changes.
*/
export function renameCategory(eventId, categoryId, name) {
  const clean = name.trim();
  if (!clean) return false;
  const ev = byId(state.events, eventId);
  if (ev?.categories.some((c) => c.id !== categoryId && c.name.toLowerCase() === clean.toLowerCase())) return false;
  set((s) => ({
    ...s,
    events: s.events.map((e) =>
      e.id === eventId ? { ...e, categories: e.categories.map((c) => (c.id === categoryId ? { ...c, name: clean } : c)) } : e
    ),
  }));
  return true;
}

/* removes a category; its photographs stay in the event, without a category */
export function removeCategory(eventId, categoryId) {
  set((s) => ({
    ...s,
    events: s.events.map((e) => (e.id === eventId ? { ...e, categories: e.categories.filter((c) => c.id !== categoryId) } : e)),
    photos: s.photos.map((p) => (p.categoryId === categoryId ? { ...p, categoryId: null } : p)),
  }));
}

/* an event deleted on the server leaves here too, with its photographs and codes; its booking is free again */
export function forgetEvent(eventId) {
  set((s) => ({
    ...s,
    events: s.events.filter((e) => e.id !== eventId),
    photos: s.photos.filter((p) => p.eventId !== eventId),
    codes: s.codes.filter((c) => c.eventId !== eventId),
    bookings: s.bookings.map((b) => (b.eventId === eventId ? { ...b, eventId: null } : b)),
  }));
}

/* ---------- photographs ---------- */
export function addPhoto(photo) {
  set((s) => ({ ...s, photos: [photo, ...s.photos.filter((p) => p.id !== photo.id)] }));
}

export function movePhotos(ids, categoryId) {
  const pick = new Set(ids);
  set((s) => ({ ...s, photos: s.photos.map((p) => (pick.has(p.id) ? { ...p, categoryId } : p)) }));
}

export function removePhotos(ids) {
  const pick = new Set(ids);
  const gone = state.photos.filter((p) => pick.has(p.id));
  set((s) => ({ ...s, photos: s.photos.filter((p) => !pick.has(p.id)) }));
  return gone;
}

export function restorePhotos(list) {
  set((s) => ({ ...s, photos: [...list, ...s.photos] }));
}

/* ---------- access codes ---------- */
/*
  Codes are made, revoked and extended on the server (Access codes page, /api/v1/access-codes); this
  keeps a copy of each one for its event, so Uploads and the event folder show the live code. A code
  for an event this device doesn't have is left out.
*/
export function syncServerCode(code) {
  if (!byId(state.events, code.eventId)) return;
  const local = {
    id: code.id,
    code: code.code,
    eventId: code.eventId,
    label: code.label || 'Guests',
    createdAt: Date.parse(code.createdAt) || Date.now(),
    expiresAt: code.expiresAt ? Date.parse(code.expiresAt) : null,
    revoked: code.state === 'revoked',
    opens: code.opens || 0,
  };
  set((s) => ({ ...s, codes: [local, ...s.codes.filter((c) => c.id !== code.id)] }));
}

export const codeState = (c, now = Date.now()) =>
  c.revoked ? 'revoked' : c.expiresAt && c.expiresAt < now ? 'expired' : 'active';

/* ---------- bookings ---------- */
export function dispatchBooking(bookingId, team) {
  set((s) => ({
    ...s,
    bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, team, status: 'onsite', sentAt: Date.now() } : b)),
  }));
}

export function setBookingStatus(bookingId, status) {
  set((s) => ({ ...s, bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b)) }));
}

export function createBooking(data) {
  const ref = `NL-${1040 + state.bookings.length + Math.round(Math.random() * 9)}`;
  const b = { id: uid('bk'), ref, team: [], status: 'pending', createdAt: Date.now(), eventId: null, ...data };
  set((s) => ({ ...s, bookings: [b, ...s.bookings] }));
  return b;
}

/* ---------- clients ---------- */
export function createClient({ name, email, city }) {
  const c = { id: uid('cl'), name: name.trim(), email: email.trim(), city: city?.trim() || '', registeredAt: Date.now() };
  set((s) => ({ ...s, clients: [c, ...s.clients] }));
  return c;
}

/* ---------- payments ---------- */
export function recordPayment(data) {
  const n = state.payments.length + 1;
  const p = { id: uid('pm'), ref: `INV-${2300 + n + Math.round(Math.random() * 20)}`, date: Date.now(), ...data };
  set((s) => ({ ...s, payments: [p, ...s.payments] }));
  return p;
}

export function setPaymentStatus(paymentId, status) {
  set((s) => ({
    ...s,
    payments: s.payments.map((p) => (p.id === paymentId ? { ...p, status, ...(status === 'paid' ? { date: Date.now() } : {}) } : p)),
  }));
}

/* ---------- team ---------- */
export function setOff(memberId, off) {
  set((s) => ({ ...s, team: s.team.map((m) => (m.id === memberId ? { ...m, off } : m)) }));
}
