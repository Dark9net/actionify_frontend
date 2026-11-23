/* The pieces every panel page is built from. */
import { useEffect, useId, useRef, useState } from 'react';
import useDialog, { dialogProps } from '../../hooks/useDialog.js';
import Icon from './icons.jsx';
import { initials } from './lib/format.js';

export function PageHead({ kicker, title, text, actions, children }) {
  useEffect(() => {
    document.title = `${title} · Actionify`;
  }, [title]);
  return (
    <header className="pn-head">
      <div className="pn-head-text">
        {kicker && <p className="pn-kicker">{kicker}</p>}
        <h1 className="pn-title">{title}</h1>
        {text && <p className="pn-lede">{text}</p>}
        {children}
      </div>
      {actions && <div className="pn-head-actions">{actions}</div>}
    </header>
  );
}

/* a button: tone 'primary' (rust glass), 'glass' (paper glass), 'ghost', 'danger'; icon on the left */
export function Btn({ tone = 'glass', icon, children, className = '', size, ...rest }) {
  return (
    <button type="button" className={`pn-btn pn-btn--${tone}${size ? ` pn-btn--${size}` : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconBtn({ icon, label, tone = '', className = '', ...rest }) {
  return (
    <button type="button" className={`pn-ib ${tone ? `pn-ib--${tone}` : ''} ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

export function Pane({ title, aside, children, className = '', pad = true, id }) {
  return (
    <section className={`pn-pane ${pad ? '' : 'pn-pane--flush'} ${className}`} aria-labelledby={title ? `${id || title}-h` : undefined}>
      {(title || aside) && (
        <div className="pn-pane-head">
          {title && (
            <h2 className="pn-pane-title" id={`${id || title}-h`}>
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/* tone: neutral | pending | onsite | done | paid | warn | bad | info */
export function Badge({ tone = 'neutral', children, dot = true }) {
  return (
    <span className={`pn-badge pn-badge--${tone}`}>
      {dot && <i aria-hidden="true" />}
      {children}
    </span>
  );
}

/* a profile photo, or the initials when there is none (or its link has stopped working) */
export function Avatar({ name, photo, size = 32 }) {
  const [broken, setBroken] = useState(null); // the link that failed to load
  return photo && broken !== photo ? (
    <img className="pn-av" src={photo} alt="" width={size} height={size} loading="lazy" decoding="async" style={{ width: size, height: size }} onError={() => setBroken(photo)} />
  ) : (
    <span className="pn-av pn-av--text" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </span>
  );
}

export function Empty({ icon = 'folder', title, text, children }) {
  return (
    <div className="pn-empty">
      <span className="pn-empty-ico">
        <Icon name={icon} />
      </span>
      <p className="pn-empty-title">{title}</p>
      {text && <p className="pn-empty-text">{text}</p>}
      {children}
    </div>
  );
}

export function Search({ value, onChange, label = 'Search', placeholder = 'Search' }) {
  return (
    <label className="pn-search">
      <Icon name="search" />
      <span className="sr-only">{label}</span>
      <input type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" className="pn-search-x" aria-label="Clear the search" onClick={() => onChange('')}>
          <Icon name="close" />
        </button>
      )}
    </label>
  );
}

/* a row of filters with counts, one chosen: [{ id, label, count }] */
export function Segments({ items, value, onChange, label }) {
  return (
    <div className="pn-seg" role="tablist" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          className={value === it.id ? 'is-on' : ''}
          onClick={() => onChange(it.id)}
        >
          {it.label}
          {it.count != null && <span className="pn-seg-n">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* Small or large previews: value 'small' | 'large' (one choice for the whole panel, lib/media.js) */
export function SizeToggle({ value, onChange, label = 'Preview size' }) {
  return (
    <div className="pn-seg pn-size" role="group" aria-label={label}>
      {[
        ['mini', 'Mini', 'gridMini'],
        ['small', 'Small', 'gridSmall'],
        ['large', 'Large', 'gridLarge'],
      ].map(([id, text, icon]) => (
        <button key={id} type="button" aria-pressed={value === id} aria-label={text} title={text} className={value === id ? 'is-on' : ''} onClick={() => onChange(id)}>
          <Icon name={icon} />
        </button>
      ))}
    </div>
  );
}

/* a stat: label, the number, a note under it; tone colours the small icon */
export function Stat({ icon, label, value, note, tone = 'rust', to, onClick, trend }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`pn-stat${onClick ? ' is-link' : ''}`} type={onClick ? 'button' : undefined} onClick={onClick} data-to={to}>
      <span className={`pn-stat-ico pn-stat-ico--${tone}`}>
        <Icon name={icon} />
      </span>
      <span className="pn-stat-label">{label}</span>
      <span className="pn-stat-value">{value}</span>
      {note && (
        <span className={`pn-stat-note${trend ? ` is-${trend}` : ''}`}>
          {trend === 'up' && <Icon name="trend" />}
          {note}
        </span>
      )}
    </Tag>
  );
}

/*
  A window over the panel (native <dialog>: Esc, the focus trap and returning focus come free).
  footer: the buttons along its foot. onSubmit makes the body a form.
*/
export function Modal({ open, onClose, title, text, children, footer, onSubmit, size = 'md', className = '' }) {
  const ref = useDialog(open, 240);
  const id = useId();
  const Body = onSubmit ? 'form' : 'div';
  return (
    <dialog ref={ref} className={`pn-modal pn-modal--${size} ${className}`} aria-labelledby={`${id}-t`} {...dialogProps(open, onClose)}>
      <Body
        className="pn-modal-card"
        onSubmit={
          onSubmit
            ? (e) => {
                e.preventDefault();
                onSubmit(e);
              }
            : undefined
        }
        noValidate={onSubmit ? true : undefined}
      >
        <div className="pn-modal-head">
          <div>
            <h2 className="pn-modal-title" id={`${id}-t`}>
              {title}
            </h2>
            {text && <p className="pn-modal-text">{text}</p>}
          </div>
          <IconBtn icon="close" label="Close" onClick={onClose} />
        </div>
        <div className="pn-modal-body">{children}</div>
        {footer && <div className="pn-modal-foot">{footer}</div>}
      </Body>
    </dialog>
  );
}

/* "Are you sure?" with one clear action */
export function Confirm({ open, onClose, onConfirm, title, text, action = 'Confirm', tone = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      text={text}
      size="sm"
      footer={
        <>
          <Btn tone="ghost" onClick={onClose}>
            Keep it
          </Btn>
          <Btn
            tone={tone}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {action}
          </Btn>
        </>
      }
    />
  );
}

/* a labelled field; children get the id */
export function Field({ label, hint, error, children, optional }) {
  const id = useId();
  return (
    <div className={`pn-field${error ? ' has-error' : ''}`}>
      <label className="pn-label" htmlFor={id}>
        {label}
        {optional && <span className="pn-opt"> optional</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-e` : hint ? `${id}-h` : undefined })}
      {error ? (
        <p className="pn-error" id={`${id}-e`}>
          {error}
        </p>
      ) : (
        hint && (
          <p className="pn-hint" id={`${id}-h`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/* a progress bar; value 0..1 */
export function Bar({ value, tone = '', label }) {
  return (
    <span className={`pn-bar ${tone}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <i style={{ transform: `scaleX(${Math.max(0, Math.min(1, value))})` }} />
    </span>
  );
}

/* calls fn when a click lands outside ref */
export function useOutside(ref, fn, on = true) {
  const live = useRef(fn);
  live.current = fn;
  useEffect(() => {
    if (!on) return;
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) live.current(e);
    };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [ref, on]);
}
