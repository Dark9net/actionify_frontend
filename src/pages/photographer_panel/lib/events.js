/*
  Events on the server (/api/v1/events, backend/src/routes/events.js). Creating one makes its row,
  its categories and, when asked, its guest gallery code, which then opens on the sign-in page.
*/
import { api } from '../../../lib/auth.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only server records have UUIDs; the panel's sample bookings and clients stay local. */
export const serverId = (id) => (id && UUID.test(id) ? id : undefined);

/** { name, date: "YYYY-MM-DD", kind, venue, bookingId, clientId, categories: string[], withCode } → { event, code } */
export const createEventOnServer = (body) => api('/events', { method: 'POST', body });
