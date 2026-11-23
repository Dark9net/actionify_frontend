/*
  The Access codes page's server side (/api/v1/access-codes, backend/src/routes/accesscode.js).
  The table is read ten rows at a time: each page answers with `nextCursor`, which asks for the
  page after it. The figures above the table (and the sidebar's count) come from /summary, kept
  here so every part of the panel shows the same numbers.
*/
import { useSyncExternalStore } from 'react';
import { api } from '../../../lib/auth.js';

const BASE = '/access-codes';

/** One page: { codes, pageSize, nextCursor }. status: all | active | expired | revoked. */
export function listCodes({ status = 'all', q = '', cursor = null } = {}) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (q.trim()) params.set('q', q.trim());
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return api(`${BASE}${query ? `?${query}` : ''}`);
}

/** The events: [{ id, name, date, codeId }]; codeId is set when the event has its code already. */
export const codeEvents = () => api(`${BASE}/events`).then((d) => d.events || []);

/** { eventId, label, maxUsers, days, code } → the new code (one per event: EVENT_HAS_CODE otherwise) */
export const makeCode = (body) => api(BASE, { method: 'POST', body }).then((d) => d.code);

/** A new code in place of the event's current one ({ code } to choose it) → the changed code */
export const regenerateCode = (id, body = {}) =>
  api(`${BASE}/${encodeURIComponent(id)}/regenerate`, { method: 'POST', body }).then((d) => d.code);

/** { revoked } | { extendDays } | { maxUsers } → the changed code */
export const changeCode = (id, body) => api(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body }).then((d) => d.code);

/* ---------- the summary, shared ---------- */

const EMPTY = { all: 0, active: 0, expired: 0, revoked: 0, endingSoon: 0, opens: 0, activeEvents: 0 };
let summary = { ...EMPTY, loaded: false };
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Asks the server again; resolves with the summary (unchanged when it can't be reached). */
export async function refreshSummary() {
  try {
    const d = await api(`${BASE}/summary`);
    summary = { ...EMPTY, ...d.summary, loaded: true };
    listeners.forEach((l) => l());
  } catch {
    /* no permission or offline: keep what we have */
  }
  return summary;
}

export const useCodeSummary = () => useSyncExternalStore(subscribe, () => summary);
