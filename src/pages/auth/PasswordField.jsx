import { useState } from 'react';

/* How strong a new password is, 0 to 4, from its length and the kinds of character in it. */
export function strength(pw) {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  let score = 2;
  if (pw.length >= 12) score++;
  if (kinds >= 3) score++;
  return Math.min(4, score);
}
const WORDS = ['', 'Too short', 'Fair', 'Good', 'Strong'];

const Eye = ({ open }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
    <path className={`eye-slash${open ? '' : ' on'}`} d="M4 4l16 16" />
  </svg>
);

/*
  A password field: a button shows or hides what was typed, a note warns while Caps Lock is on, and,
  for a new password, a four-step meter fills as it gets stronger. Paste and password managers work
  as normal (the autocomplete hint tells them which password this is).
*/
export default function PasswordField({ uid, name, label, value, onChange, autoComplete, error, meter = false }) {
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const id = `${uid}-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const score = meter ? strength(value) : 0;
  const describedBy = [error && errorId, meter && hintId].filter(Boolean).join(' ') || undefined;
  const readCaps = (e) => setCaps(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div className={`field au-pw${error ? ' has-error' : ''}`}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="au-pw-box">
        <input
          id={id}
          name={name}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onKeyDown={readCaps}
          onKeyUp={readCaps}
          onBlur={() => setCaps(false)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          spellCheck={false}
        />
        <button
          type="button"
          className="glass-btn au-eye"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-controls={id}
        >
          <Eye open={shown} />
        </button>
      </div>
      {caps && (
        <p className="au-caps" role="status">
          Caps Lock is on
        </p>
      )}
      {meter && (
        <div className="au-meter" data-score={score}>
          <span className="au-meter-bars" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="au-meter-word" id={hintId}>
            {value ? WORDS[score] : 'At least 8 characters'}
            {value && score < 4 && score > 1 ? ' · add length, capitals, numbers or symbols' : ''}
          </span>
        </div>
      )}
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
