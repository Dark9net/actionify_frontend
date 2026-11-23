import { useEffect, useId, useRef, useState } from 'react';
import useDialog, { dialogProps } from '../../hooks/useDialog.js';
import Field from '../../components/Field.jsx';
import { Arrow } from '../../components/Icons.jsx';
import { requestReset, NotConnected } from '../../lib/auth.js';
import { auth } from '../../data/content.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WAIT = 60; // seconds before the link can be sent again (the API sends one a minute)

/*
  "Forgot password?": a small window over the sign-in page. Step one asks for the email (filled in
  from the sign-in form when there is one); step two says a link is on its way, with a resend that
  unlocks after 30 seconds. Esc, a click outside or the close button closes it; it starts afresh
  each time it opens.
*/
export default function ForgotPassword({ open, onClose, email: given = '' }) {
  const ref = useDialog(open, 300);
  const uid = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [left, setLeft] = useState(0);
  const inputRef = useRef(null);

  // every opening starts at step one, with the address from the sign-in form
  useEffect(() => {
    if (!open) return;
    setEmail(given);
    setError('');
    setNotice('');
    setSent(false);
    setBusy(false);
    // the window focuses its first control (the close button); the email field is where to start
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // the resend countdown
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  async function send(e) {
    e?.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError(value ? 'Enter an email address like name@example.com.' : 'Enter your email address.');
      return;
    }
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await requestReset({ email: value });
      setSent(true);
      setLeft(WAIT);
    } catch (err) {
      setNotice(err instanceof NotConnected ? auth.offline : err.message);
    } finally {
      setBusy(false);
    }
  }

  const f = auth.forgot;
  return (
    <dialog ref={ref} className="au-dialog" aria-labelledby={`${uid}-title`} {...dialogProps(open, onClose)}>
      <div className="au-dlg-in">
        <button className="glass-btn au-dlg-close" type="button" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>

        {!sent ? (
          <div className="au-dlg-step" key="ask">
            <span className="au-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="8" cy="15" r="4" />
                <path d="M11 12.2L19.5 3.7M16.5 6.7l2.6 2.6M14.3 8.9l2 2" />
              </svg>
            </span>
            <h2 className="au-dlg-title display" id={`${uid}-title`}>
              {f.title}
            </h2>
            <p className="au-dlg-note">{f.note}</p>
            <form className="au-dlg-form" onSubmit={send} noValidate>
              <Field uid={uid} name="email" label="Email" error={error}>
                {(p) => (
                  <input
                    {...p}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    ref={inputRef}
                    autoFocus
                  />
                )}
              </Field>
              {notice && (
                <p className="au-alert" role="alert">
                  {notice}
                </p>
              )}
              <button className="btn glass-btn au-submit" type="submit" aria-busy={busy} disabled={busy}>
                <span>{busy ? 'Sending' : f.submit}</span>
                {busy ? <span className="au-spin" aria-hidden="true" /> : <Arrow />}
              </button>
            </form>
          </div>
        ) : (
          <div className="au-dlg-step au-dlg-sent" key="sent" role="status">
            <span className="au-badge au-badge--sent" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M3.5 6.5h17v11h-17z" />
                <path className="au-mail-flap" d="M3.8 6.8l8.2 6.4 8.2-6.4" />
              </svg>
              <span className="au-badge-tick">
                <svg viewBox="0 0 12 12">
                  <path d="M2.5 6.3l2.3 2.3L9.5 3.8" />
                </svg>
              </span>
            </span>
            <h2 className="au-dlg-title display" id={`${uid}-title`}>
              {f.sentTitle}
            </h2>
            <p className="au-dlg-note">
              We sent it to <strong>{email.trim()}</strong>. {f.sentNote}
            </p>
            <div className="au-dlg-actions">
              <button className="btn glass-btn au-submit" type="button" onClick={onClose}>
                <span>Back to sign in</span>
                <Arrow />
              </button>
              <button className="glass-btn au-textbtn" type="button" onClick={() => send()} disabled={left > 0 || busy}>
                {busy ? 'Sending…' : left > 0 ? `Send again in ${left}s` : 'Send the link again'}
              </button>
              <button className="glass-btn au-textbtn" type="button" onClick={() => setSent(false)}>
                Use a different email
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
