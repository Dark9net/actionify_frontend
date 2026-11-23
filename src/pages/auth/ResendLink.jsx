import { useEffect, useState } from 'react';
import { resendVerification, NotConnected } from '../../lib/auth.js';
import { auth } from '../../data/content.js';

export const RESEND_WAIT = 60; // seconds between links (the API sends at most one a minute)

/*
  "Resend the link": after a confirmation email has gone out. It unlocks after 60 seconds, and every
  resend starts the 60 seconds again. When the API says to wait longer (too many tries), the timer
  waits that long instead.
*/
export default function ResendLink({ email, wait = RESEND_WAIT }) {
  const [left, setLeft] = useState(wait);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  async function resend() {
    setBusy(true);
    setNote('');
    setFailed(false);
    try {
      await resendVerification({ email });
      setNote(`A new link is on its way to ${email}.`);
      setLeft(RESEND_WAIT);
    } catch (err) {
      setFailed(true);
      setNote(err instanceof NotConnected ? auth.offline : err.message);
      setLeft(Math.max(RESEND_WAIT, err.retryAfterSeconds || 0));
    } finally {
      setBusy(false);
    }
  }

  const mins = Math.floor(left / 60);
  const clock = left >= 60 ? `${mins}:${String(left % 60).padStart(2, '0')}` : `${left}s`;
  return (
    <div className="au-resend">
      <button className="glass-btn au-textbtn" type="button" onClick={resend} disabled={busy || left > 0}>
        {busy ? 'Sending…' : left > 0 ? `Resend the link in ${clock}` : 'Resend the link'}
      </button>
      <p className={`au-resend-note${failed ? ' is-error' : ''}`} role="status" aria-live="polite">
        {note}
      </p>
    </div>
  );
}
