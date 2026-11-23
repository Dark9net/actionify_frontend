import { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Arrow } from '../../components/Icons.jsx';
import PasswordField from './PasswordField.jsx';
import AuthCard, { Tick, ToSignIn } from './AuthCard.jsx';
import { checkResetLink, resetPassword, NotConnected } from '../../lib/auth.js';
import { auth } from '../../data/content.js';

/*
  /reset-password?token=… : the link from "Forgot password?". The link is checked on load (and taken
  out of the address); then a new password, typed twice. Saving it signs every device out, so the
  next step is signing in again.
*/
export default function ResetPassword() {
  const uid = useId();
  const [params, setParams] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [step, setStep] = useState(token ? 'checking' : 'failed'); // checking, form, done, failed
  const [message, setMessage] = useState(token ? '' : 'This page needs the link from your email.');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const formRef = useRef(null);
  const asked = useRef(false);

  const failText = (err) => (err instanceof NotConnected ? auth.offline : err.message);

  useEffect(() => {
    if (params.has('token')) setParams({}, { replace: true });
    if (!token || asked.current) return;
    asked.current = true;
    checkResetLink(token)
      .then((out) => {
        setEmail(out.email || '');
        setStep('form');
      })
      .catch((err) => {
        setMessage(failText(err));
        setStep('failed');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e) {
    e.preventDefault();
    setFail('');
    const found = {};
    if (password.length < 8) found.password = password ? 'Use at least 8 characters.' : 'Choose a password.';
    if (!found.password && again !== password) found.again = 'The two passwords are different.';
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      formRef.current?.elements[first]?.focus();
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ token, password });
      setStep('done');
    } catch (err) {
      if (err.errors?.password) {
        setErrors({ password: err.errors.password });
        formRef.current?.elements.password?.focus();
      } else if (err.code === 'TOKEN_EXPIRED' || err.code === 'TOKEN_INVALID') {
        setMessage(err.message);
        setStep('failed');
      } else setFail(failText(err));
    } finally {
      setBusy(false);
    }
  }

  const r = auth.reset;
  if (step === 'checking')
    return (
      <AuthCard title={r.title}>
        <p className="au-note" role="status">
          <span className="au-spin au-spin--inline" aria-hidden="true" /> Checking your link…
        </p>
      </AuthCard>
    );

  if (step === 'failed')
    return (
      <AuthCard title={r.failTitle}>
        <p className="au-alert" role="alert">
          {message}
        </p>
        <div className="au-done-actions au-card-actions">
          <ToSignIn label="Back to sign in" />
        </div>
      </AuthCard>
    );

  if (step === 'done')
    return (
      <AuthCard title={r.done}>
        <div className="au-done au-card-done" role="status">
          <Tick />
          <p className="au-done-note">{r.doneNote}</p>
          <div className="au-done-actions">
            <ToSignIn />
          </div>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard title={r.title}>
      <p className="au-note">
        {email && (
          <>
            For <strong>{email}</strong>.{' '}
          </>
        )}
        {r.note}
      </p>
      <form className="au-form" ref={formRef} onSubmit={save} noValidate>
        {/* the address, for password managers to file the new password under */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <PasswordField
          uid={uid}
          name="password"
          label="New password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
          autoComplete="new-password"
          error={errors.password}
          meter
        />
        <PasswordField
          uid={uid}
          name="again"
          label="Type it again"
          value={again}
          onChange={(e) => {
            setAgain(e.target.value);
            if (errors.again) setErrors({ ...errors, again: undefined });
          }}
          autoComplete="new-password"
          error={errors.again}
        />
        {fail && (
          <p className="au-alert" role="alert">
            {fail}
          </p>
        )}
        <button className="btn glass-btn au-submit" type="submit" aria-busy={busy} disabled={busy}>
          <span>{busy ? 'Saving' : r.submit}</span>
          {busy ? <span className="au-spin" aria-hidden="true" /> : <Arrow />}
        </button>
        <Link className="au-link au-card-back" to="/login">
          Back to sign in
        </Link>
      </form>
    </AuthCard>
  );
}
