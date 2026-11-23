import { useEffect, useState } from 'react';
import { Btn, Field, Modal } from '../ui.jsx';
import Icon from '../icons.jsx';
import { addServerEvent, byId, useStudio } from '../lib/store.js';
import { createEventOnServer, serverId } from '../lib/events.js';
import { NotConnected } from '../../../lib/auth.js';
import { auth } from '../../../data/content.js';
import { KINDS, STARTER_CATEGORIES } from '../lib/eventKinds.js';
import { toast } from '../lib/toast.js';
import { slugify } from '../lib/format.js';

const toInput = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/*
  A new event, which is a new folder on R2: its name (the folder and the gallery's title), the day,
  the venue, the kind (which sets the categories it starts with, each one renamable), the client and
  the booking it belongs to, and whether to make a guest access code for it now. It is made on the
  server (POST /api/v1/events), which checks it again and makes the real gallery code.
  `from`: a booking to fill it in from. onDone(event) after it is made.
*/
export default function NewEvent({ open, onClose, onDone, from }) {
  const s = useStudio();
  const blank = () => ({ name: '', date: toInput(Date.now()), venue: '', kind: 'Wedding', clientId: '', bookingId: '', cats: STARTER_CATEGORIES.Wedding.join(', '), withCode: true });
  const [v, setV] = useState(blank);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr({});
    setBusy(false);
    if (from) {
      setV({
        name: from.title.replace(/\s+wedding$/i, '').trim(), // "Tom & Priya wedding" → "Tom & Priya"
        date: toInput(from.date),
        venue: from.venue,
        kind: from.kind,
        clientId: from.clientId,
        bookingId: from.id,
        cats: STARTER_CATEGORIES[from.kind].join(', '),
        withCode: true,
      });
    } else setV(blank());
  }, [open, from]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setV((o) => {
      const n = { ...o, [k]: value };
      // a new kind brings its own starting categories, unless they were changed by hand
      if (k === 'kind' && o.cats === STARTER_CATEGORIES[o.kind].join(', ')) n.cats = STARTER_CATEGORIES[value].join(', ');
      if (k === 'bookingId' && value) {
        const b = byId(s.bookings, value);
        if (b) Object.assign(n, { clientId: b.clientId, venue: o.venue || b.venue, kind: b.kind, date: toInput(b.date) });
      }
      return n;
    });
  };

  async function submit() {
    if (busy) return;
    const e = {};
    const name = v.name.trim();
    if (!name) e.name = 'Give the event a name. It becomes the folder and the gallery title.';
    else if (s.events.some((x) => x.name.toLowerCase() === name.toLowerCase())) e.name = 'There is already an event with this name. Add the year or the venue.';
    if (!v.date) e.date = 'Choose the day of the event.';
    setErr(e);
    if (Object.keys(e).length) return;
    const cats = v.cats
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    setBusy(true);
    try {
      const out = await createEventOnServer({
        name,
        date: v.date,
        venue: v.venue,
        kind: v.kind,
        // the panel's sample bookings and clients aren't on the server yet: those stay linked here only
        bookingId: serverId(v.bookingId),
        clientId: serverId(v.clientId),
        categories: cats,
        withCode: v.withCode,
      });
      const { event, code } = addServerEvent(out.event, out.code, { bookingId: v.bookingId || null, clientId: v.clientId || null });
      toast({ tone: 'success', title: `${event.name} created`, text: code ? `Folder ${out.event.folder} is ready. Guest code ${code.code}.` : `Folder ${out.event.folder} is ready.` });
      onClose();
      onDone?.(event);
    } catch (error) {
      setBusy(false);
      if (error instanceof NotConnected) return setErr({ form: auth.offline });
      const fields = {};
      for (const [k, msg] of Object.entries(error.errors || {})) fields[k.split('.')[0]] = msg;
      setErr(Object.keys(fields).length ? fields : { form: error.message });
    }
  }

  const open_ = s.bookings.filter((b) => !b.eventId && b.status !== 'cancelled');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New event"
      text="Each event is its own folder on R2. Name it first; its photographs go in after."
      onSubmit={submit}
      size="lg"
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Btn>
          <Btn tone="primary" type="submit" icon="folder" disabled={busy} aria-busy={busy}>
            {busy ? 'Creating…' : 'Create event'}
          </Btn>
        </>
      }
    >
      <div className="pn-form">
        {err.form && (
          <p className="pn-note pn-note--warn" role="alert">
            <Icon name="info" />
            {err.form}
          </p>
        )}
        <Field label="Event name" error={err.name} hint={v.name.trim() ? `Folder: events/${slugify(v.name)}/` : 'For example: Anna & Leo, Brightwave Summit 2026'}>
          {(p) => <input {...p} className="pn-input" value={v.name} onChange={set('name')} autoComplete="off" maxLength={80} autoFocus />}
        </Field>
        <div className="pn-form-row">
          <Field label="Date" error={err.date}>
            {(p) => <input {...p} type="date" className="pn-input" value={v.date} onChange={set('date')} />}
          </Field>
          <Field label="Kind of event" error={err.kind}>
            {(p) => (
              <select {...p} className="pn-input" value={v.kind} onChange={set('kind')}>
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Venue" optional error={err.venue}>
          {(p) => <input {...p} className="pn-input" value={v.venue} onChange={set('venue')} placeholder="The Old Mill, Bath" />}
        </Field>
        <div className="pn-form-row">
          <Field label="Booking" optional error={err.bookingId}>
            {(p) => (
              <select {...p} className="pn-input" value={v.bookingId} onChange={set('bookingId')}>
                <option value="">Not linked</option>
                {(from ? [from] : open_).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ref} · {b.title}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Client" optional error={err.clientId}>
            {(p) => (
              <select {...p} className="pn-input" value={v.clientId} onChange={set('clientId')}>
                <option value="">No client yet</option>
                {s.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Categories" error={err.categories} hint="Separated by commas. Each is a folder inside the event and an album in the gallery; rename them any time.">
          {(p) => <input {...p} className="pn-input" value={v.cats} onChange={set('cats')} />}
        </Field>
        <label className="pn-check">
          <input type="checkbox" checked={v.withCode} onChange={set('withCode')} />
          <span>
            <b>Make a guest access code now</b>
            <small>Guests open the gallery with it on the sign-in page. More codes can be made under Access codes.</small>
          </span>
        </label>
      </div>
    </Modal>
  );
}
