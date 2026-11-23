import { useEffect, useRef, useState } from 'react';
import Icon from './icons.jsx';
import { dismiss, useToasts } from './lib/toast.js';

const ICON = { success: 'check', error: 'alert', info: 'info' };

/* The toasts, top right (along the foot on a phone). Read out politely; an error is read out at once. */
export default function Toaster() {
  const list = useToasts();
  return (
    <div className="pn-toasts" aria-live="polite" aria-relevant="additions">
      {list.map((t) => (
        <Toast key={t.id} t={t} />
      ))}
    </div>
  );
}

function Toast({ t }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(t.life);
  const since = useRef(0);

  useEffect(() => {
    if (paused || t.leaving) return;
    since.current = Date.now();
    const timer = setTimeout(() => dismiss(t.id), left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - since.current;
    };
  }, [paused, t.id, t.leaving]);

  return (
    <div
      className={`pn-toast pn-toast--${t.tone}${t.leaving ? ' is-leaving' : ''}${paused ? ' is-paused' : ''}`}
      role={t.tone === 'error' ? 'alert' : 'status'}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{ '--life': `${t.life}ms` }}
    >
      <span className="pn-toast-ico">
        <Icon name={ICON[t.tone]} />
      </span>
      <div className="pn-toast-text">
        <p className="pn-toast-title">{t.title}</p>
        {t.text && <p className="pn-toast-note">{t.text}</p>}
      </div>
      {t.action && (
        <button
          type="button"
          className="pn-toast-act"
          onClick={() => {
            t.action.run();
            dismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
      <button type="button" className="pn-toast-x" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
        <Icon name="close" />
      </button>
      <span className="pn-toast-life" aria-hidden="true" />
    </div>
  );
}
