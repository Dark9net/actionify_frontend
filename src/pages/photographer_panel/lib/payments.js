/*
  The Payments page's server side (/api/v1/payments, backend/src/routes/payments.js): every payment
  (bookings_payment), ten rows at a time, newest first; each page answers with `nextCursor`, which asks
  for the page after it. Money is in Nepalese rupees.

  A row: { id, bookingId, kind: advance | full, amount, status: requested | paid | cancelled | refunded,
  method: cash | bank | esewa | khalti | fonepay | null (paid through the QR), note, emailTo, emailedAt,
  requestedBy, paidAt, paidBy, refundedAt, refundedBy, createdAt,
  booking: { id, ref, name, email, phone, type, date, venue, status } }
*/
import { useSyncExternalStore } from 'react';
import { api } from '../../../lib/auth.js';

const BASE = '/payments';

export const METHODS = { cash: 'Cash', bank: 'Bank transfer', esewa: 'eSewa', khalti: 'Khalti', fonepay: 'Fonepay' };

/** One page: { payments, pageSize, nextCursor }. status: all | requested | paid | cancelled | refunded. */
export function listPayments({ status = 'all', q = '', cursor = null, limit = null } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (status !== 'all') params.set('status', status);
  if (q.trim()) params.set('q', q.trim());
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return api(`${BASE}${query ? `?${query}` : ''}`);
}

/** Every payment in the list (all pages), for the CSV. Stops at `max` rows. */
export async function allPayments({ status, q }, max = 5000) {
  const rows = [];
  let cursor = null;
  do {
    const d = await listPayments({ status, q, cursor });
    rows.push(...d.payments);
    cursor = d.nextCursor;
  } while (cursor && rows.length < max);
  return rows;
}

/** Bookings (not cancelled) to record a payment for: [{ id, ref, name, email, type, date, venue, paid, due }] */
export const findBookings = (q) => api(`${BASE}/bookings?${new URLSearchParams({ q: q.trim() })}`).then((d) => d.bookings);

/** { bookingId, amount, kind, method, note? } → { payment }: already received, nobody is emailed */
export const recordPayment = (body) => api(BASE, { method: 'POST', body });

/** paid | cancelled | refunded | requested → { payment } */
export const changePayment = (id, status) => api(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } });

/* ---------- the summary, shared with the sidebar ---------- */

const ZERO = { n: 0, npr: 0 };
const EMPTY = { all: 0, requested: ZERO, paid: ZERO, cancelled: ZERO, refunded: ZERO, last30: ZERO, prev30: ZERO, months: [] };
let summary = { ...EMPTY, loaded: false };
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Asks the server again; resolves with the summary (unchanged when it can't be reached). */
export async function refreshPaymentSummary() {
  try {
    // months and "the last 30 days" by this browser's clock (Nepal: +345 minutes)
    const d = await api(`${BASE}/summary?tz=${-new Date().getTimezoneOffset()}`);
    summary = { ...EMPTY, ...d.summary, loaded: true };
    listeners.forEach((l) => l());
  } catch {
    /* no permission or offline: keep what we have */
  }
  return summary;
}

export const usePaymentSummary = () => useSyncExternalStore(subscribe, () => summary);
