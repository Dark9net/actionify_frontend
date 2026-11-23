import { useEffect, useId, useRef, useState } from 'react';
import Field, { FormSent } from './Field.jsx';
import { Arrow } from './Icons.jsx';
import useForm from '../hooks/useForm.js';
import { sendEnquiry } from '../lib/enquiry.js';
import { studio } from '../data/content.js';
import '../styles/forms.css';

const EMPTY = { name: '', email: '', message: '' };

function validate(v) {
  const e = {};
  const email = v.email.trim();
  if (!v.name.trim()) e.name = 'Enter your name.';
  if (!email) e.email = 'Enter an email address so we can reply.';
  else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'This email address looks incomplete.';
  if (!v.message.trim()) e.message = 'Write a few words about what you need.';
  return e;
}

const summary = (v) => [
  ['Name', v.name.trim()],
  ['Email', v.email.trim()],
  ['Message', v.message.trim()],
];

/* A short message to the studio. */
export default function ContactForm() {
  const uid = useId();
  const { values: v, errors, set, check, formRef } = useForm(EMPTY, validate);
  const [sent, setSent] = useState(false);
  const sentRef = useRef(null);

  useEffect(() => {
    if (sent) sentRef.current?.focus();
  }, [sent]);

  function onSubmit(e) {
    e.preventDefault();
    if (!check()) return;
    sendEnquiry(`Message from ${v.name.trim()}`, summary(v));
    setSent(true);
  }

  if (sent) {
    return (
      <FormSent
        innerRef={sentRef}
        title="Send the email"
        rows={summary(v)}
        email={studio.email}
        onEdit={() => setSent(false)}
      />
    );
  }

  return (
    <form className="form" ref={formRef} onSubmit={onSubmit} noValidate>
      <Field uid={uid} name="name" label="Your name" error={errors.name}>
        {(p) => <input {...p} type="text" autoComplete="name" value={v.name} onChange={set} />}
      </Field>
      <Field uid={uid} name="email" label="Email" error={errors.email}>
        {(p) => <input {...p} type="email" autoComplete="email" value={v.email} onChange={set} />}
      </Field>
      <Field uid={uid} name="message" label="Message" error={errors.message} wide>
        {(p) => <textarea {...p} rows={6} value={v.message} onChange={set} />}
      </Field>
      <div className="form-end">
        <button className="btn" type="submit">
          <span>Send message</span>
          <Arrow />
        </button>
      </div>
    </form>
  );
}
