/*
  The website's booking form (components/BookingForm.jsx, in the booking sheet and on Hire Us) sends
  here: POST /api/v1/bookings (backend/src/routes/bookings.js). The request lands in the studio's
  panel under Bookings, as "requested". Signed in, it is linked to the account.
*/
import { api } from './auth.js';

/** The form's values → { ref, type, date, venue }. Field errors come back on `error.errors`. */
export async function sendBookingRequest(v) {
  const d = await api('/bookings', {
    method: 'POST',
    body: {
      name: v.name,
      email: v.email,
      phone: v.phone,
      type: v.type,
      date: v.date,
      time: v.time,
      venue: v.venue,
      coverage: v.hours,
      crew: Number(v.crew) || 1,
      notes: v.notes,
      website: v.website || undefined,
    },
  });
  return d.booking;
}

// the server's field names → the form's (Coverage is `hours` in the form)
export const FORM_FIELD = { coverage: 'hours' };
