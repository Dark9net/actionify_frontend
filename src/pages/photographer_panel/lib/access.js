/*
  The Access page's server side (/api/v1/access, backend/src/routes/access.js): every account with its
  role, status, email and mobile, 25 at a time and newest first; each page answers with `nextCursor`,
  which asks for the page after it. Studio leads only: anyone else gets 403.

  An account: { id, name, email, mobile, photo, role: { slug, name, isStaff }, status: pending | active |
  disabled, emailVerified, lastLoginAt, createdAt, isMe, locked: null | 'self' | 'rank' }.
*/
import { useSyncExternalStore } from 'react';
import { api } from '../../../lib/auth.js';

const BASE = '/access';
const one = (id) => `${BASE}/${encodeURIComponent(id)}`;

/** Only this role opens the page (the server checks the same on every call). */
export const LEAD = 'studio_lead';
export const isLead = (user) => user?.role?.slug === LEAD;

/** One page: { users, pageSize, nextCursor }. status: all | pending | active | disabled; role: all | a slug. */
export function listAccounts({ status = 'all', role = 'all', q = '', cursor = null } = {}) {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (role !== 'all') params.set('role', role);
  if (q.trim()) params.set('q', q.trim());
  if (cursor) params.set('cursor', cursor);
  const qs = params.toString();
  return api(`${BASE}${qs ? `?${qs}` : ''}`);
}

/** A new role and/or status (active | disabled) → the account as listed. */
export const changeAccount = (id, change) => api(one(id), { method: 'PATCH', body: change }).then((d) => d.user);

/** Deletes the account for good; the server checks the email typed again. → { id, name, email } */
export const deleteAccount = (id, confirmEmail) => api(one(id), { method: 'DELETE', body: { confirmEmail } }).then((d) => d.deleted);

/* ---------- the summary (the filters' counts, the roles), shared with the sidebar ---------- */

const EMPTY = { all: 0, staff: 0, pending: 0, active: 0, disabled: 0, roles: {} };
let state = { summary: EMPTY, roles: [], loaded: false };
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Asks the server again; resolves with { summary, roles, loaded } (unchanged when it can't be reached). */
export async function refreshAccessSummary() {
  try {
    const d = await api(`${BASE}/summary`);
    state = { summary: { ...EMPTY, ...d.summary }, roles: d.roles, loaded: true };
    listeners.forEach((l) => l());
  } catch {
    /* not a studio lead, or offline: keep what we have */
  }
  return state;
}

export const useAccessSummary = () => useSyncExternalStore(subscribe, () => state);
