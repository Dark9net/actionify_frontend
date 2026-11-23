/*
  Sharing an event's gallery (/api/v1/share-gallery, backend/src/routes/sharegallery.js): the share
  window on the Uploads page.
*/
import { api } from '../../../lib/auth.js';

const BASE = '/share-gallery';

/**
 * → { event, gallery, client }
 *   gallery: { id, code, link, qr, state, expiresAt, maxUsers, opens } for a live code,
 *            { id, state: 'revoked' | 'expired' } for a closed one, null for none
 *   client:  { name, email, verified (true / false / null), source: 'account' | 'booking' } | null
 */
export const shareDetails = (eventId) => api(`${BASE}/${encodeURIComponent(eventId)}`);

/** { email, confirmed: true, message? } → { to, toClient, printed } */
export const shareByEmail = (eventId, body) =>
  api(`${BASE}/${encodeURIComponent(eventId)}/email`, { method: 'POST', body });
