import { useEffect, useId, useRef, useState } from 'react';
import Field, { FormSent } from './Field.jsx';
import { Arrow } from './Icons.jsx';
import useForm from '../hooks/useForm.js';
import { sendEnquiry } from '../lib/enquiry.js';
import { FORM_FIELD, sendBookingRequest } from '../lib/booking.js';
import { NotConnected } from '../lib/auth.js';
import { hire, studio } from '../data/content.js';
import '../styles/forms.css';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  type: '',
  date: '',
  time: '',
  venue: '',
  hours: '',
  crew: '1',
  notes: '',
  website: '', // a field people never see: only bots fill it in
};

const pad = (n) => String(n).padStart(2, '0');
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function longDate(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function validate(v) {
  const e = {};
  const email = v.email.trim();
  if (!v.name.trim()) e.name = 'Enter your name.';
  if (!email) e.email = 'Enter an email address so we can reply.';
  else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'This email address looks incomplete.';
  if (!v.type) e.type = 'Choose the kind of shoot.';
  if (!v.date) e.date = 'Choose the date of the shoot.';
  else if (v.date < todayISO()) e.date = 'That date has passed. Choose today or later.';
  if (!v.venue.trim()) e.venue = 'Enter the venue or the city.';
  return e;
}

const summary = (v) => [
  ['Name', v.name.trim()],
  ['Email', v.email.trim()],
  ['Phone', v.phone.trim()],
  ['Event', v.type],
  ['Date', longDate(v.date)],
  ['Start time', v.time],
  ['Venue', v.venue.trim()],
  ['Coverage', v.hours],
  ['Crew', v.crew],
  ['Notes', v.notes.trim()],
];

/*
  Asks a client for everything needed to book a shoot. Used in the booking sheet and on Hire Us.
  The request goes straight to the studio (POST /api/v1/bookings) and shows its reference. If the
  studio's server can't be reached, the details can still go by email.
*/
export default function BookingForm() {
  const uid = useId();
  const { values: v, errors, set, check, showErrors, formRef } = useForm(EMPTY, validate);
  const [sent, setSent] = useState(null); // { ref } once the studio has it
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null); // { text, offline }
  const sentRef = useRef(null);

  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  // a coverage card on Hire Us chooses its length of day here
  useEffect(() => {
    const pick = (e) => set({ target: { name: 'hours', value: e.detail } });
    window.addEventListener('northlight:coverage', pick);
    return () => window.removeEventListener('northlight:coverage', pick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy || !check()) return;
    setBusy(true);
    setProblem(null);
    try {
      const booking = await sendBookingRequest(v);
      setSent({ ref: booking.ref });
    } catch (err) {
      if (err instanceof NotConnected) {
        setProblem({ text: "We can't reach the studio's booking service right now. Try again in a moment, or send the details by email.", offline: true });
      } else if (err.errors && Object.keys(err.errors).some((k) => k !== 'form')) {
        const found = {};
        for (const [k, msg] of Object.entries(err.errors)) found[FORM_FIELD[k] || k] = msg;
        showErrors(found);
      } else {
        setProblem({ text: err.message || 'The request could not be sent. Please try again.' });
      }
    } finally {
      setBusy(false);
    }
  }

  const byEmail = () => sendEnquiry(`Booking request: ${v.type}, ${longDate(v.date)}`, summary(v));

  if (sent) {
    return (
      <FormSent
        innerRef={sentRef}
        label="Request sent"
        title={`Booking ${sent.ref} is with us`}
        note="We read every request and reply by email within a day, with a quote and the crew we suggest for the shoot. Keep the reference above if you write to us about it."
        rows={summary(v)}
        email={studio.email}
        alt={
          <>
            Something to add? Write to{' '}
            <a className="tlink" href={`mailto:${studio.email}?subject=${encodeURIComponent(`Booking ${sent.ref}`)}`}>
              {studio.email}
            </a>{' '}
            and quote {sent.ref}.
          </>
        }
        editLabel="Send another request"
        onEdit={() => setSent(null)}
      />
    );
  }

  return (
    <form className="form" ref={formRef} onSubmit={onSubmit} noValidate aria-busy={busy || undefined}>
      {/* only bots fill this in: people never see it, and screen readers skip it */}
      <div className="form-trap" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set} />
        </label>
      </div>
      <Field uid={uid} name="name" label="Your name" error={errors.name}>
        {(p) => <input {...p} type="text" autoComplete="name" value={v.name} onChange={set} />}
      </Field>
      <Field uid={uid} name="email" label="Email" error={errors.email}>
        {(p) => <input {...p} type="email" autoComplete="email" value={v.email} onChange={set} />}
      </Field>
      <Field uid={uid} name="phone" label="Phone" optional>
        {(p) => <input {...p} type="tel" autoComplete="tel" value={v.phone} onChange={set} />}
      </Field>
      <Field uid={uid} name="type" label="Kind of shoot" error={errors.type}>
        {(p) => (
          <select {...p} value={v.type} onChange={set} data-empty={v.type ? undefined : ''}>
            <option value="">Choose one</option>
            {hire.eventTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        )}
      </Field>
      <Field uid={uid} name="date" label="Date of the shoot" error={errors.date}>
        {(p) => <input {...p} type="date" min={todayISO()} value={v.date} onChange={set} />}
      </Field>
      <Field uid={uid} name="time" label="Start time" optional>
        {(p) => <input {...p} type="time" value={v.time} onChange={set} />}
      </Field>
      <Field uid={uid} name="venue" label="Venue and city" error={errors.venue} wide>
        {(p) => (
          <input {...p} type="text" autoComplete="off" value={v.venue} onChange={set} />
        )}
      </Field>
      <Field uid={uid} name="hours" label="Coverage" optional>
        {(p) => (
          <select {...p} value={v.hours} onChange={set} data-empty={v.hours ? undefined : ''}>
            <option value="">Choose one</option>
            {hire.coverage.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </Field>

      <fieldset className="field seg">
        <legend className="label">Crew</legend>
        <div className="seg-row">
          {['1', '2', '3', '4'].map((n) => (
            <label key={n}>
              <input type="radio" name="crew" value={n} checked={v.crew === n} onChange={set} />
              <span>{n}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field uid={uid} name="notes" label="About the shoot" optional wide>
        {(p) => <textarea {...p} rows={4} value={v.notes} onChange={set} />}
      </Field>

      {problem && (
        <div className="form-problem" role="alert">
          <p>{problem.text}</p>
          {problem.offline && (
            <button className="tlink" type="button" onClick={byEmail}>
              Send the details by email instead
            </button>
          )}
        </div>
      )}

      <div className="form-end">
        <button className="btn" type="submit" disabled={busy}>
          <span>{busy ? 'Sending…' : 'Send booking request'}</span>
          <Arrow />
        </button>
      </div>
    </form>
  );
}
