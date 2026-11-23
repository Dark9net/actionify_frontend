/*
  The Bookings page's server side (/api/v1/bookings, backend/src/routes/bookings.js).
  The table is read ten rows at a time: each page answers with `nextCursor`, which asks for the page
  after it. The figures on the lanes (and the sidebar's badges) come from /summary, kept here so every
  part of the panel shows the same numbers.

  A booking: { id, ref, name, email, phone, type, date: "2026-12-05", time: "14:30" | null, venue,
  coverage, crewSize, notes, status, crew: [{ id, name }], event: { id, name } | null, createdAt }
  status: requested → confirmed → dispatched → completed; cancelled can be restored.
*/
import { useSyncExternalStore } from 'react';
import { api } from '../../../lib/auth.js';
import { today } from './team.js';

const BASE = '/bookings';

/** One page: { bookings, pageSize, nextCursor }. status: all | requested | confirmed | dispatched | completed | cancelled. */
export function listBookings({ status = 'all', q = '', cursor = null } = {}) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (q.trim()) params.set('q', q.trim());
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return api(`${BASE}${query ? `?${query}` : ''}`);
}

/** Who can be sent: [{ id, name, role, mobile, off (today, Photographers page), busy: { bookingId, ref, name, venue } | null }]. */
export const bookingCrew = () => api(`${BASE}/crew?day=${today()}`).then((d) => d.crew || []);

/** A booking taken by phone or email (it starts confirmed) → the booking */
export const addBooking = (body) => api(`${BASE}/manual`, { method: 'POST', body }).then((d) => d.booking);

/**
  { status } or { status: 'dispatched', crew: [userId] } → { booking, email }. Sending photographers
  emails the client their names and phones: email { to, sent }; null for any other change.
*/
export const changeBooking = (id, body) =>
  api(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body }).then((d) => ({ booking: d.booking, email: d.email ?? null }));

/** "+9779812345678" → "+977 981 234 5678" */
export const showMobile = (m) => (m && /^\+977\d{10}$/.test(m) ? `+977 ${m.slice(4, 7)} ${m.slice(7, 10)} ${m.slice(10)}` : m || '');

/* the website's kinds of event → the panel's kinds (New event's list and starting categories) */
export const KIND_OF = {
  Wedding: 'Wedding',
  'Concert or festival': 'Concert',
  'Conference or corporate event': 'Conference',
  Sport: 'Sport',
  'Private celebration': 'Celebration',
  'Something else': 'Celebration',
};

/** "2026-12-05" + "14:30" → ms, at the venue's local time (the browser's) */
export const bookingTime = (b) => new Date(`${b.date}T${b.time || '12:00'}`).getTime();

/* ---------- the summary, shared ---------- */

const EMPTY = { all: 0, requested: 0, confirmed: 0, dispatched: 0, completed: 0, cancelled: 0, withinWeek: 0, withoutFolder: 0, crewOut: 0 };
let summary = { ...EMPTY, loaded: false };
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Asks the server again; resolves with the summary (unchanged when it can't be reached). */
export async function refreshBookingSummary() {
  try {
    const d = await api(`${BASE}/summary`);
    summary = { ...EMPTY, ...d.summary, loaded: true };
    listeners.forEach((l) => l());
  } catch {
    /* no permission or offline: keep what we have */
  }
  return summary;
}

export const useBookingSummary = () => useSyncExternalStore(subscribe, () => summary);
