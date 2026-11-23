/*
  The Photographers page's server side (/api/v1/team, backend/src/routes/team.js): every photographer
  and editor account, ten at a time; each page answers with `nextCursor`, which asks for the page after it.

  A member: { id, name, email, mobile, role: { slug, name }, account: active | pending | disabled,
  state: free | onsite | off | inactive, offToday, onsite: booking | null, lastEvent: booking | null,
  completed, lastLoginAt, joinedAt }; a booking here is { id, ref, client, type, date, time, venue }.

  "Today" is this browser's date (the studio's clock), sent as ?day=, so "Off today" turns over at
  local midnight and not at the server's.
*/
import { useSyncExternalStore } from 'react';
import { api } from '../../../lib/auth.js';

const BASE = '/team';

/** "2026-11-19", by this browser's clock */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** One page: { members, pageSize, nextCursor }. status: all | free | onsite | off; role: all | photographer | editor. */
export function listTeam({ status = 'all', role = 'all', q = '', cursor = null } = {}) {
  const params = new URLSearchParams({ day: today() });
  if (status !== 'all') params.set('status', status);
  if (role !== 'all') params.set('role', role);
  if (q.trim()) params.set('q', q.trim());
  if (cursor) params.set('cursor', cursor);
  return api(`${BASE}?${params}`);
}

/** Off today (or back) → the member's card. Yourself, or anyone with team.manage. */
export const setDayOff = (id, off) => api(`${BASE}/${encodeURIComponent(id)}/off`, { method: 'PATCH', body: { off, day: today() } }).then((d) => d.member);

/* ---------- the summary, shared ---------- */

const EMPTY = { all: 0, photographers: 0, editors: 0, free: 0, onsite: 0, off: 0, inactive: 0 };
let summary = { ...EMPTY, loaded: false };
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Asks the server again; resolves with the summary (unchanged when it can't be reached). */
export async function refreshTeamSummary() {
  try {
    const d = await api(`${BASE}/summary?day=${today()}`);
    summary = { ...EMPTY, ...d.summary, loaded: true };
    listeners.forEach((l) => l());
  } catch {
    /* no permission or offline: keep what we have */
  }
  return summary;
}

export const useTeamSummary = () => useSyncExternalStore(subscribe, () => summary);
