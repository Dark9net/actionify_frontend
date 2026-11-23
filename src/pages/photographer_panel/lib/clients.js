/*
  The Clients page's server side (/api/v1/clients, backend/src/routes/clients.js): every booking with
  its client and what they have been asked to pay, ten rows at a time; each page answers with
  `nextCursor`, which asks for the page after it. Money is in Nepalese rupees.

  A row: { id, ref, name, email, phone, type, date, time, venue, status (the booking's), hasAccount,
  payment: { state: none | requested | advance | paid, paid, due, advancePaid, fullPaid, requests },
  event: { id, name, hasCode } | null, createdAt }
  A payment: { id, kind: advance | full, amount, status: requested | paid | cancelled, note, emailTo,
  emailedAt, requestedBy, paidAt, paidBy, createdAt }
*/
import { useSyncExternalStore } from 'react';
import { api } from '../../../lib/auth.js';

const BASE = '/clients';

/** One page: { clients, pageSize, nextCursor }. payment: all | none | requested | advance | paid. */
export function listClients({ payment = 'all', q = '', cursor = null } = {}) {
  const params = new URLSearchParams();
  if (payment !== 'all') params.set('payment', payment);
  if (q.trim()) params.set('q', q.trim());
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return api(`${BASE}${query ? `?${query}` : ''}`);
}

/** { client, payments } */
export const bookingPayments = (bookingId) => api(`${BASE}/${encodeURIComponent(bookingId)}/payments`);

/** { amount, kind, note? } → { payment, client, email: { to, sent } }: emails the client the amount and the studio's QR */
export const requestPayment = (bookingId, body) => api(`${BASE}/${encodeURIComponent(bookingId)}/payments`, { method: 'POST', body });

/** paid | cancelled | requested → { payment, client } */
export const setPaymentStatus = (bookingId, paymentId, status) =>
  api(`${BASE}/${encodeURIComponent(bookingId)}/payments/${encodeURIComponent(paymentId)}`, { method: 'PATCH', body: { status } });

/* ---------- the studio's payment QR (Settings) ---------- */

/** { url, updatedAt, updatedBy } | null */
export const getPaymentQr = () => api(`${BASE}/payment-qr`).then((d) => d.qr);
/** a PNG, JPEG or WebP File, as it is (never cropped: it has to scan) → the QR */
export const uploadPaymentQr = (file) => api(`${BASE}/payment-qr`, { method: 'PUT', raw: { data: file, type: file.type } }).then((d) => d.qr);
export const removePaymentQr = () => api(`${BASE}/payment-qr`, { method: 'DELETE' }).then((d) => d.qr);

/* ---------- the summary, shared ---------- */

const EMPTY = { bookings: 0, clients: 0, ahead: 0, paid: 0, due: 0, none: 0, requested: 0, advance: 0, fullyPaid: 0 };
let summary = { ...EMPTY, loaded: false };
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Asks the server again; resolves with the summary (unchanged when it can't be reached). */
export async function refreshClientSummary() {
  try {
    const d = await api(`${BASE}/summary`);
    summary = { ...EMPTY, ...d.summary, loaded: true };
    listeners.forEach((l) => l());
  } catch {
    /* no permission or offline: keep what we have */
  }
  return summary;
}

export const useClientSummary = () => useSyncExternalStore(subscribe, () => summary);
