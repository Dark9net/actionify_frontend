/*
  One labelled form field. The child is a function that receives the props the control needs
  (id, name and the error wiring), so any input, select or textarea can sit inside.
*/
export default function Field({ uid, name, label, optional, error, wide, children }) {
  const id = `${uid}-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className={`field${wide ? ' field--wide' : ''}${error ? ' has-error' : ''}`}>
      <label className="label" htmlFor={id}>
        {label}
        {optional && <span className="opt"> · optional</span>}
      </label>
      {children({
        id,
        name,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
      })}
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

/* What a form shows once its details have been handed to the email app. */
/*
  After a form: by default the details went to the visitor's email app (the contact form); `label`,
  `note`, `alt` and `editLabel` tell another story (the booking form, sent straight to the studio).
*/
export function FormSent({ title, rows, email, onEdit, innerRef, label = 'One last step', note, alt, editLabel = 'Edit the details' }) {
  return (
    <div className="form-sent" ref={innerRef} tabIndex={-1} role="status">
      <div className="label">{label}</div>
      <h3 className="display">{title}</h3>
      <p>
        {note ??
          'Your email app has opened with these details filled in. Press send there and the request is on its way to us.'}
      </p>
      <dl className="sum">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div className="sum-row" key={label}>
              <dt className="label">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      <p className="form-alt">
        {alt ?? (
          <>
            No email app on this device? Write to{' '}
            <a className="tlink" href={`mailto:${email}`}>
              {email}
            </a>{' '}
            and include the details above.
          </>
        )}
      </p>
      <button className="btn btn--ghost" type="button" onClick={onEdit}>
        <span>{editLabel}</span>
      </button>
    </div>
  );
}
