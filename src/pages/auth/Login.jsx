import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Field from '../../components/Field.jsx';
import { Arrow } from '../../components/Icons.jsx';
import PasswordField, { strength } from './PasswordField.jsx';
import ForgotPassword from './ForgotPassword.jsx';
import SlideToOpen from './SlideToOpen.jsx';
import QrScanner from './QrScanner.jsx';
import ResendLink from './ResendLink.jsx';
import useForm from '../../hooks/useForm.js';
import useFontsReady from '../../hooks/useFontsReady.js';
import {
  signIn,
  signUp,
  landingFor,
  restoreSession,
  getSession,
  useSession,
  isStaff,
  NotConnected,
} from '../../lib/auth.js';
import { openByCode, VISIT_HOURS } from '../../lib/gallery.js';
import { CODE_LENGTH, formatCode, isCode } from '../../lib/galleryCode.js';
import { auth, brand } from '../../data/content.js';
import '../../styles/forms.css';
import '../../styles/auth.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailError = (v) => (!v.trim() ? 'Enter your email address.' : EMAIL.test(v.trim()) ? '' : 'Enter an email address like name@example.com.');
const failText = (err) => (err instanceof NotConnected ? auth.offline : err.message);

/*
  A failed request on a form: a problem with one of its fields goes under that field (the API names
  it, with the same wording the form uses); anything else goes in the alert above the button.
*/
function report(err, form, fields, setFail) {
  const errors = err?.errors && Object.fromEntries(Object.entries(err.errors).filter(([k]) => fields.includes(k)));
  if (errors && Object.keys(errors).length) form.showErrors(errors);
  else setFail(failText(err));
}
// the page's name: the browser tab, and the heading screen readers announce (the card shows none)
const PAGE_TITLE = auth.title || 'Access your photos';

/* The submit button: its label, then a spinner while the request runs. */
function Submit({ busy, label, busyLabel }) {
  return (
    <button className="btn glass-btn au-submit" type="submit" aria-busy={busy} disabled={busy}>
      <span>{busy ? busyLabel : label}</span>
      {busy ? <span className="au-spin" aria-hidden="true" /> : <Arrow />}
    </button>
  );
}

/* What a form turns into once it has gone through: a tick that draws itself, a line and a way on. */
function Done({ title, note, onBack, children }) {
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="au-done" ref={ref} tabIndex={-1} role="status">
      <span className="au-done-tick" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" />
          <path d="M12.5 20.5l5 5 10-11" />
        </svg>
      </span>
      <h2 className="au-done-title display">{title}</h2>
      <p className="au-done-note">{note}</p>
      {children}
      <div className="au-done-actions">
        <Link className="btn glass-btn au-submit" to="/services">
          <span>How galleries work</span>
          <Arrow />
        </Link>
        <button className="glass-btn au-textbtn" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

function SignIn({ onForgot }) {
  const uid = useId();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useForm(
    { email: '', password: '', remember: true },
    (x) => {
      const e = {};
      const em = emailError(x.email);
      if (em) e.email = em;
      if (!x.password) e.password = 'Enter your password.';
      return e;
    }
  );
  const { values: v, errors, set, check, formRef } = form;
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(''); // the address waiting to be confirmed

  async function submit(e) {
    e.preventDefault();
    setFail('');
    setUnconfirmed('');
    if (!check()) return;
    setBusy(true);
    try {
      const { user } = await signIn({ email: v.email.trim(), password: v.password, remember: v.remember });
      // by role: a client to the gallery dashboard, staff (a photographer…) to the panel; ?next= when given
      navigate(landingFor(user, params.get('next') || ''), { replace: true });
    } catch (err) {
      report(err, form, ['email', 'password'], setFail);
      // the API has just emailed a new confirmation link: offer another once a minute
      if (err.code === 'EMAIL_NOT_VERIFIED') setUnconfirmed(v.email.trim());
      setBusy(false);
    }
  }

  return (
    <form className="au-form" ref={formRef} onSubmit={submit} noValidate>
      <Field uid={uid} name="email" label="Email" error={errors.email}>
        {(p) => <input {...p} type="email" inputMode="email" autoComplete="username" value={v.email} onChange={set} />}
      </Field>
      <PasswordField
        uid={uid}
        name="password"
        label="Password"
        value={v.password}
        onChange={set}
        autoComplete="current-password"
        error={errors.password}
      />
      <div className="au-row">
        <label className="au-check">
          <input
            type="checkbox"
            name="remember"
            checked={v.remember}
            onChange={(e) => set({ target: { name: 'remember', value: e.target.checked } })}
          />
          <span className="au-box" aria-hidden="true">
            <svg viewBox="0 0 12 12">
              <path d="M2.5 6.3l2.3 2.3L9.5 3.8" />
            </svg>
          </span>
          Keep me signed in
        </label>
        <button className="glass-btn au-textbtn au-forgot" type="button" onClick={() => onForgot(v.email.trim())} aria-haspopup="dialog">
          Forgot password?
        </button>
      </div>
      {fail && (
        <p className="au-alert" role="alert">
          {fail}
        </p>
      )}
      {unconfirmed && <ResendLink key={unconfirmed} email={unconfirmed} />}
      <Submit busy={busy} label={auth.signin.submit} busyLabel="Signing in" />
    </form>
  );
}

function SignUp() {
  const uid = useId();
  const form = useForm(
    { name: '', email: '', password: '', code: '', terms: false },
    (x) => {
      const e = {};
      if (!x.name.trim()) e.name = 'Enter your name.';
      const em = emailError(x.email);
      if (em) e.email = em;
      if (x.password.length < 8) e.password = x.password ? 'Use at least 8 characters.' : 'Choose a password.';
      else if (strength(x.password) < 2) e.password = 'Choose a stronger password.';
      if (!x.terms) e.terms = 'Accept the terms of service to create an account.';
      return e;
    }
  );
  const { values: v, errors, set, check, formRef } = form;
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const [done, setDone] = useState('');

  async function submit(e) {
    e.preventDefault();
    setFail('');
    if (!check()) return;
    setBusy(true);
    try {
      const out = await signUp({ name: v.name.trim(), email: v.email.trim(), password: v.password, code: v.code.trim(), terms: v.terms });
      setDone(out.email || v.email.trim());
    } catch (err) {
      report(err, form, ['name', 'email', 'password', 'code', 'terms'], setFail);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Done title={auth.signup.done} note={auth.signup.doneNote} onBack={() => setDone('')}>
        <p className="au-done-note au-done-sub">
          We have sent a link to <strong>{done}</strong> to confirm your email. No email? Check your spam folder, or
          send it again.
        </p>
        <ResendLink email={done} />
      </Done>
    );

  return (
    <form className="au-form" ref={formRef} onSubmit={submit} noValidate>
      <Field uid={uid} name="name" label="Full name" error={errors.name}>
        {(p) => <input {...p} type="text" autoComplete="name" value={v.name} onChange={set} />}
      </Field>
      <Field uid={uid} name="email" label="Email" error={errors.email}>
        {(p) => <input {...p} type="email" inputMode="email" autoComplete="email" value={v.email} onChange={set} />}
      </Field>
      <PasswordField
        uid={uid}
        name="password"
        label="Password"
        value={v.password}
        onChange={set}
        autoComplete="new-password"
        error={errors.password}
        meter
      />
      <Field uid={uid} name="code" label="Gallery code" optional error={errors.code}>
        {(p) => (
          <input {...p} type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={v.code} onChange={set} />
        )}
      </Field>
      <div className={`au-terms${errors.terms ? ' has-error' : ''}`}>
        <label className="au-check">
          <input
            type="checkbox"
            name="terms"
            checked={v.terms}
            onChange={(e) => set({ target: { name: 'terms', value: e.target.checked } })}
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={errors.terms ? `${uid}-terms-error` : undefined}
          />
          <span className="au-box" aria-hidden="true">
            <svg viewBox="0 0 12 12">
              <path d="M2.5 6.3l2.3 2.3L9.5 3.8" />
            </svg>
          </span>
          <span>
            I accept the{' '}
            {/* a new tab, so what was typed in the form stays where it is */}
            <Link className="au-link" to="/terms" target="_blank" rel="noopener">
              terms of service
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
          </span>
        </label>
        {errors.terms && (
          <p className="field-error" id={`${uid}-terms-error`}>
            {errors.terms}
          </p>
        )}
      </div>
      {fail && (
        <p className="au-alert" role="alert">
          {fail}
        </p>
      )}
      <Submit busy={busy} label={auth.signup.submit} busyLabel="Creating your account" />
    </form>
  );
}

/*
  A gallery code from the printed card or the email: the way in without an account. Type it (it takes
  only the code's shape, 4-4-4-2 letters and numbers, and puts the dashes in) or scan its QR code with
  the camera, then slide the handle across (or press Enter). A code the API accepts opens the gallery
  on the dashboard as a client (the API keeps that in a cookie); wrong codes count towards a block.
*/
/*
  ask: the dashboard sent the client here for the code: 'ended' (?gallery=ended, their 24 hours with
  the gallery are up) or 'code' (?gallery=code, their account has never had the code entered). A
  note says which above the code, and the cursor waits in the code field once the card shows.
*/
function CodeForm({ ask = null, shown = true }) {
  const uid = useId();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const [scan, setScan] = useState(false);
  const [scanned, setScanned] = useState(false);
  const inputRef = useRef(null);
  const ready = isCode(code);

  useEffect(() => {
    if (ask && shown) inputRef.current?.focus({ preventScroll: true });
  }, [ask, shown]);

  async function open() {
    setFail('');
    const c = code;
    if (!isCode(c)) {
      setError(c ? 'A gallery code has 14 letters and numbers in groups of 4, 4, 4 and 2, like ANNA-LEO1-JUNE-24.' : 'Enter the code from your card or email.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await openByCode(c);
      navigate('/dashboard');
    } catch (err) {
      // a code the API doesn't know (or that has run out) belongs under the code field
      if (err?.errors?.code) setError(err.errors.code);
      else setFail(failText(err));
      setBusy(false);
    }
  }

  return (
    <form
      className="au-code"
      onSubmit={(e) => {
        e.preventDefault();
        open();
      }}
      noValidate
    >
      <div className="au-or" aria-hidden="true">
        <span />
      </div>
      <h2 className="au-h2 display">{auth.code.heading}</h2>
      {ask && (
        <p className="au-ended" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          {ask === 'ended' ? (
            <span>
              <b>Your {VISIT_HOURS} hours with the gallery are up.</b> Enter your gallery code again, or scan its QR code,
              to keep viewing your photos.
            </span>
          ) : (
            <span>
              <b>Enter your gallery code to open your photos.</b> Your gallery stays open for {VISIT_HOURS} hours each time
              its code is entered.
            </span>
          )}
        </p>
      )}
      <p className="au-note au-code-note">{auth.code.note}</p>
      <label className="label" htmlFor={`${uid}-code`}>
        {auth.code.label}
      </label>
      <div className={`au-code-row${error ? ' has-error' : ''}${ready ? ' is-ready' : ''}${scanned ? ' is-scanned' : ''}`}>
        <svg className="au-code-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM16 16h2v2h-2z" />
        </svg>
        <input
          ref={inputRef}
          id={`${uid}-code`}
          name="code"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. ANNA-LEO1-JUNE-24"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => {
            setCode(formatCode(e.target.value));
            setScanned(false);
            if (error) setError('');
            if (fail) setFail('');
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${uid}-code-hint${error ? ` ${uid}-code-error` : ''}`}
          disabled={busy}
        />
        <span className="au-code-ok" aria-hidden="true">
          <svg viewBox="0 0 12 12">
            <path d="M2.5 6.3l2.3 2.3L9.5 3.8" />
          </svg>
        </span>
        <button
          className="glass-btn au-scan-btn"
          type="button"
          onClick={() => setScan(true)}
          aria-haspopup="dialog"
          aria-label="Scan the QR code with your camera"
          title="Scan the QR code"
          disabled={busy}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16" />
            <path d="M7.5 7.5h3v3h-3zM13.5 7.5h3v3h-3zM7.5 13.5h3v3h-3zM13.5 13.5h1.2v1.2h-1.2zM15.3 15.3h1.2v1.2h-1.2z" />
          </svg>
        </button>
      </div>
      {error && (
        <p className="field-error" id={`${uid}-code-error`}>
          {error}
        </p>
      )}
      {/* <p className="au-code-hint" id={`${uid}-code-hint`}>
        {auth.code.hint}
      </p> */}
      <SlideToOpen ready={ready} busy={busy} onOpen={open} lockedLabel="Enter or scan your code" />
      {fail && (
        <p className="au-alert" role="alert">
          {fail}
        </p>
      )}
      <QrScanner
        open={scan}
        onClose={() => setScan(false)}
        onCode={(c) => {
          setCode(c);
          setScanned(true);
          setError('');
          setFail('');
          setScan(false);
          // back on the form, the slide is the next thing to do
          setTimeout(() => document.querySelector('.au-slide-knob')?.focus(), 350);
        }}
      />
    </form>
  );
}

/*
  The sign-in page (/login, opened from "Access your gallery" in the header). A landscape film fills the
  screen behind a frosted card in the middle: two tabs, Sign in and Create account (?mode=signup opens
  the second), a code for those without an account (typed or scanned), and "Forgot password?" in a
  small window. Everything arrives once on load; the tabs slide, the forms cross over.
*/
export default function Login() {
  const ready = useFontsReady();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const [forgot, setForgot] = useState(null); // null when closed, else the email to start from
  const uid = useId();
  const tabRefs = useRef({});
  const filmRef = useRef(null);
  const [filmReady, setFilmReady] = useState(false);

  // already signed in on this browser (the sign-in cookie, kept for 30 days with "Keep me signed in"):
  // straight on to the panel (staff) or the dashboard (a client), as after signing in; ?next= is kept,
  // so the page that sent them here opens
  const navigate = useNavigate();
  const next = params.get('next') || '';
  // the gallery's 24 hours are up: a signed-in client stays here to enter the code again (the
  // dashboard would only send them back); staff still go on to their panel
  const ask = ['ended', 'code'].includes(params.get('gallery')) ? params.get('gallery') : null;
  const ended = Boolean(ask);
  useEffect(() => {
    let live = true;
    restoreSession().then((signedIn) => {
      if (!live || !signedIn) return;
      const { user } = getSession();
      if (ended && !isStaff(user)) return;
      const to = landingFor(user, next);
      if (to) navigate(to, { replace: true });
    });
    return () => {
      live = false;
    };
  }, [navigate, next, ended]);

  // The card waits until we know nobody is signed in here, so a remembered visitor never sees the
  // form on the way through; signed out, it plays its entrance as before. A slow or missing API
  // never keeps it away for long: after 2.5 s it shows whatever the answer.
  const { status, user } = useSession();
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 2500);
    return () => clearTimeout(t);
  }, []);
  const goingOn = status === 'signedIn' && !(ended && !isStaff(user)); // signed in, and about to be sent on
  const checking = !waited && (status === 'unknown' || status === 'loading' || goingOn);

  useEffect(() => {
    document.title = `${PAGE_TITLE} · ${brand.name}`;
    // asked for less motion: the film holds its first frame
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) filmRef.current?.pause();
  }, []);

  const choose = (m) =>
    setParams({ ...(m === 'signup' && { mode: 'signup' }), ...(ask && { gallery: ask }) }, { replace: true, preventScrollReset: true });

  // arrow keys move between the two tabs, as tabs should
  function onTabKey(e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 'signin' : e.key === 'End' ? 'signup' : mode === 'signin' ? 'signup' : 'signin';
    choose(next);
    tabRefs.current[next]?.focus();
  }

  const copy = auth[mode];
  return (
    <main id="main" className={`au${ready && !checking ? ' in' : ''}${checking ? ' au--checking' : ''}`} aria-busy={checking}>
      {/* the background: a landscape film across the whole screen, framed from the bottom, no overlay */}
      <div className={`au-bg${filmReady ? ' is-ready' : ''}`} aria-hidden="true">
        <video
          ref={filmRef}
          src={auth.film}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={(e) => {
            setFilmReady(true);
            // some phones hold back autoplay until asked; a muted film is always allowed to play
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) e.currentTarget.play().catch(() => {});
          }}
        />
      </div>

      <section className="au-side" aria-labelledby={`${uid}-h`}>
        <h1 className="sr-only" id={`${uid}-h`}>
          {PAGE_TITLE}
        </h1>
        <div className="au-inner">
          {/* the top row: what this side of the card is for, and the two tabs opposite it */}
          <div className="au-top au-rise" style={{ '--i': 0 }}>
            <div className="au-top-text au-swap" key={`head-${mode}`} data-from={mode === 'signup' ? 'right' : 'left'}>
              <h2 className="au-h2 display">{copy.heading}</h2>
              <p className="au-note">{copy.note}</p>
            </div>
            <div className="au-tabs" role="tablist" aria-label="Sign in or create an account" data-mode={mode}>
              <span className="au-tab-pill" aria-hidden="true" />
              {auth.tabs.map(([key, label]) => (
                <button
                  key={key}
                  ref={(el) => (tabRefs.current[key] = el)}
                  className="au-tab"
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${key}`}
                  aria-selected={mode === key}
                  aria-controls={`${uid}-panel`}
                  tabIndex={mode === key ? 0 : -1}
                  onClick={() => choose(key)}
                  onKeyDown={onTabKey}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* two columns: the account form, and the gallery code beside it */}
          <div className="au-cols">
            <div
              className="au-panel au-rise"
              role="tabpanel"
              id={`${uid}-panel`}
              aria-labelledby={`${uid}-tab-${mode}`}
              style={{ '--i': 1 }}
            >
              <div className="au-swap" key={mode} data-from={mode === 'signup' ? 'right' : 'left'}>
                {mode === 'signin' ? <SignIn onForgot={(email) => setForgot(email)} /> : <SignUp />}
              </div>
            </div>

            <div className="au-code-col au-rise" style={{ '--i': 2 }}>
              <CodeForm ask={ask} shown={!checking} />
            </div>
          </div>
        </div>
      </section>


      <ForgotPassword open={forgot !== null} email={forgot ?? ''} onClose={() => setForgot(null)} />
    </main>
  );
}
