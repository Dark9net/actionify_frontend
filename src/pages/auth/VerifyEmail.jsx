import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Field from '../../components/Field.jsx';
import { Arrow } from '../../components/Icons.jsx';
import AuthCard, { Tick, ToSignIn } from './AuthCard.jsx';
import { verifyEmail, resendVerification, NotConnected } from '../../lib/auth.js';
import { auth } from '../../data/content.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
  /verify-email?token=… : the link in the sign-up email. The token is checked once on load (and taken
  out of the address, so it isn't left in the history); then the account is ready to sign in. A link
  that has run out or was used offers a new one.
*/
export default function VerifyEmail() {
  const [params, setParams] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [step, setStep] = useState(token ? 'checking' : 'failed'); // checking, done, failed
  const [message, setMessage] = useState(token ? '' : 'This page needs the link from your email.');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    if (params.has('token')) setParams({}, { replace: true });
    if (!token || asked.current) return;
    asked.current = true; // once, even when React runs effects twice in development
    verifyEmail(token)
      .then((out) => {
        setEmail(out.email || '');
        setPending(Boolean(out.pending));
        setStep('done');
      })
      .catch((err) => {
        setMessage(err instanceof NotConnected ? auth.offline : err.message);
        setStep('failed');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const v = auth.verify;
  if (step === 'checking')
    return (
      <AuthCard title={v.checking}>
        <p className="au-note" role="status">
          <span className="au-spin au-spin--inline" aria-hidden="true" /> One moment…
        </p>
      </AuthCard>
    );

  if (step === 'done')
    return (
      <AuthCard title={v.done}>
        <div className="au-done au-card-done" role="status">
          <Tick />
          <p className="au-done-note">
            {email && `${email} is confirmed. `}
            {pending ? v.pendingNote : v.doneNote}
          </p>
          <div className="au-done-actions">
            <ToSignIn label={pending ? 'Back to sign in' : 'Sign in'} />
          </div>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard title={v.failTitle}>
      <p className="au-alert" role="alert">
        {message}
      </p>
      <Resend />
    </AuthCard>
  );
}

/* "Send a new link": the same answer whatever the address, as on the API. */
function Resend() {
  const uid = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [fail, setFail] = useState('');

  async function send(e) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError(value ? 'Enter an email address like name@example.com.' : 'Enter your email address.');
      return;
    }
    setError('');
    setFail('');
    setBusy(true);
    try {
      await resendVerification({ email: value });
      setSent(true);
    } catch (err) {
      setFail(err instanceof NotConnected ? auth.offline : err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="au-done au-card-done" role="status">
        <p className="au-done-note">If {email.trim()} still needs confirming, a new link is on its way. It works for 24 hours.</p>
        <div className="au-done-actions">
          <ToSignIn label="Back to sign in" />
        </div>
      </div>
    );

  return (
    <form className="au-form" onSubmit={send} noValidate>
      <p className="au-note">{auth.verify.resendNote}</p>
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
          />
        )}
      </Field>
      {fail && (
        <p className="au-alert" role="alert">
          {fail}
        </p>
      )}
      <button className="btn glass-btn au-submit" type="submit" aria-busy={busy} disabled={busy}>
        <span>{busy ? 'Sending' : 'Send a new link'}</span>
        {busy ? <span className="au-spin" aria-hidden="true" /> : <Arrow />}
      </button>
    </form>
  );
}
