import { useEffect, useRef, useState } from 'react';
import { Btn, Field, Modal } from '../ui.jsx';
import Icon from '../icons.jsx';
import { deleteEvent, refreshEvents } from '../lib/media.js';
import { forgetEvent } from '../lib/store.js';
import { cancelAll } from '../lib/uploads.js';
import { toast } from '../lib/toast.js';
import { NotConnected } from '../../../lib/auth.js';
import { formatBytes, plural } from '../lib/format.js';

const errText = (e) => (e instanceof NotConnected ? 'The studio API cannot be reached. Check that it is running.' : e?.message || 'Something went wrong.');

/*
  Deleting a whole event (editors, photographers and the studio lead: event.delete): the event, every
  photo, video and file in it (from R2 too), its categories and its gallery code. The window says what
  goes, and the Delete button only wakes once the event's name is typed again exactly; the server
  checks the name as well (DELETE /api/v1/events/:id). Uploads still going to the event are stopped
  first. `going`: how many are; `hasCode`: whether it has a live gallery code. onDone(ev) once it is gone.
*/
export default function DeleteEvent({ ev, going = 0, hasCode = false, onClose, onDone }) {
  const open = Boolean(ev);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // the event stays shown while the window closes (ev is null by then)
  const last = useRef(ev);
  if (ev) last.current = ev;
  const e = last.current;

  useEffect(() => {
    if (!open) return;
    setTyped('');
    setErr('');
    setBusy(false);
  }, [open, ev?.id]);

  if (!e) return null;
  const matches = typed.trim() === e.name;
  const files = e.stats?.files ?? 0;

  async function submit() {
    if (!matches || busy) return;
    setBusy(true);
    setErr('');
    try {
      if (going) cancelAll(e.id);
      const r = await deleteEvent(e.id, typed.trim());
      done(r.files);
    } catch (x) {
      // already gone (deleted in another tab): the same outcome
      if (x.status === 404) return done(files);
      setErr(errText(x));
      setBusy(false);
      refreshEvents(); // R2 may have let go of some files: show what is left
    }
  }

  function done(n) {
    forgetEvent(e.id);
    refreshEvents();
    toast({ tone: 'info', title: `${e.name} deleted`, text: n ? `${plural(n, 'file')} removed from R2, with its categories and gallery code.` : 'With its categories and gallery code.' });
    onDone?.(e);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      size="sm"
      className="pn-del"
      title={`Delete ${e.name}?`}
      text="The event and everything in it is deleted for good. This can't be undone."
      onSubmit={submit}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>
            Keep it
          </Btn>
          <Btn tone="danger" type="submit" icon="trash" disabled={!matches || busy} aria-busy={busy}>
            {busy ? 'Deleting…' : 'Delete event'}
          </Btn>
        </>
      }
    >
      <div className="pn-form">
        <ul className="pn-del-list">
          <li>
            <Icon name="image" />
            {files ? `${plural(files, 'file')} (${formatBytes(e.stats.bytes)}), deleted from R2` : 'No files in it yet'}
          </li>
          <li>
            <Icon name="folder" />
            {plural(e.categories?.length ?? 0, 'category', 'categories')} and the folder {e.folder}
          </li>
          <li>
            <Icon name="key" />
            {hasCode ? 'Its gallery code: guests and the client can no longer open the gallery' : 'Its gallery code, if it has one'}
          </li>
          {going > 0 && (
            <li>
              <Icon name="alert" />
              {plural(going, 'upload')} still going to it, stopped first
            </li>
          )}
        </ul>
        <Field
          label={
            <>
              Type <b className="pn-del-name">{e.name}</b> to confirm
            </>
          }
          error={err}
          hint={typed && !matches ? 'Not yet: type the name exactly as shown, capitals and all.' : undefined}
        >
          {(p) => (
            <input
              {...p}
              className="pn-input"
              value={typed}
              onChange={(x) => {
                setTyped(x.target.value);
                setErr('');
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={200}
              placeholder={e.name}
              disabled={busy}
              autoFocus
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}
