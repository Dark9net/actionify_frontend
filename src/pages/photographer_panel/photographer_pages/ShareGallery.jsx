import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Btn, Field, Modal } from '../ui.jsx';
import Icon from '../icons.jsx';
import { shareByEmail, shareDetails } from '../lib/shareGallery.js';
import { makeCode } from '../lib/accessCodes.js';
import { syncServerCode } from '../lib/store.js';
import { refreshEvents } from '../lib/media.js';
import { toast } from '../lib/toast.js';
import { NotConnected, can, useSession } from '../../../lib/auth.js';
import { date, plural } from '../lib/format.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const errText = (e) => (e instanceof NotConnected ? 'The studio API cannot be reached. Check that it is running.' : e?.message || 'Something went wrong.');
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 40) || 'gallery';

/* copies text and says so on the button for a moment */
function useCopied() {
  const [copied, setCopied] = useState('');
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  function copy(what, text) {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(what);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(''), 1800);
      },
      () => toast({ tone: 'error', title: 'Could not copy', text: 'Select the text and copy it by hand.' })
    );
  }
  return [copied, copy];
}

/*
  Sharing an event's gallery (the share button on each event on Uploads). Three ways, one window:
    - the gallery code and its QR code (a real one, of the private link; the PNG can be downloaded
      to print on table cards), with the code to copy;
    - the private link, to copy or to hand to the device's own share sheet (phones);
    - an email to the client with the link, the code, the QR code and how to open and download the
      photos (POST /api/v1/share-gallery/:eventId/email). When the event has a client, their email
      on record is offered first and has to be confirmed with a tick before it is used; another
      address is typed twice. An event without a live code offers to create one (POST
      /api/v1/access-codes) when the role may; a revoked or expired one is handled on Access codes.
  ev: the event to share, or null (closed).
*/
export default function ShareGallery({ ev, onClose }) {
  const open = Boolean(ev);
  const { user } = useSession();
  const mayManage = can(user, 'access_code.manage');
  const last = useRef(ev);
  if (ev) last.current = ev;
  const e = last.current;

  const [state, setState] = useState({ status: 'idle', data: null, error: '' });
  const [making, setMaking] = useState(false);
  const [copied, copy] = useCopied();
  // the email: 'client' (the address on record) or 'other' (typed)
  const [to, setTo] = useState('other');
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [again, setAgain] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  async function load(id) {
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    try {
      const data = await shareDetails(id);
      setState({ status: 'ready', data, error: '' });
      return data;
    } catch (x) {
      setState({ status: 'error', data: null, error: errText(x) });
      return null;
    }
  }

  // a fresh look every time it opens: the code may have changed on Access codes since
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setChecked(false);
    setEmail('');
    setAgain('');
    setMessage('');
    setSending(false);
    load(ev.id).then((data) => setTo(data?.client ? 'client' : 'other'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ev?.id]);

  if (!e) return null;
  const { event, gallery, client } = state.data || {};
  const live = Boolean(gallery?.code);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function createCode() {
    setMaking(true);
    try {
      const code = await makeCode({ eventId: e.id });
      syncServerCode(code);
      refreshEvents(); // the folder card's code chip shows it at once
      await load(e.id);
      toast({ tone: 'success', title: 'Gallery code created', text: `${code.code} opens ${e.name}.` });
    } catch (x) {
      toast({ tone: 'error', title: 'The code could not be created', text: errText(x) });
    } finally {
      setMaking(false);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({
        title: `${e.name}: your gallery`,
        text: `Your photos from ${e.name}. Gallery code: ${gallery.code}`,
        url: gallery.link,
      });
    } catch {
      /* closed without sharing */
    }
  }

  // what the email form needs before Send wakes
  const address = to === 'client' && client ? client.email : email.trim().toLowerCase();
  function check() {
    const out = {};
    if (to === 'client' && client) {
      if (!checked) out.confirmed = `Tick to confirm ${client.email} is still the right address.`;
    } else {
      if (!email.trim()) out.email = "Enter the client's email address.";
      else if (!EMAIL.test(email.trim())) out.email = 'Enter an email address like name@example.com.';
      if (!out.email && again.trim().toLowerCase() !== email.trim().toLowerCase()) out.again = 'The two addresses are not the same.';
    }
    if (message.length > 400) out.message = 'Keep the note under 400 characters.';
    return out;
  }

  async function send() {
    if (sending || !live) return;
    const found = check();
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    try {
      const r = await shareByEmail(e.id, { email: address, confirmed: true, message: message.trim() || undefined });
      toast({
        tone: 'success',
        title: `Gallery sent to ${r.to}`,
        text: r.printed
          ? 'No mail server is set, so the email was printed in the API console instead.'
          : 'With the link, the code, the QR code and how to open and download the photos.',
      });
      onClose();
    } catch (x) {
      // the server names the field when it's one of ours
      if (x.field && x.errors) setErrors({ [x.field === 'confirmed' && to !== 'client' ? 'again' : x.field]: x.errors[x.field] });
      else setErrors({ form: errText(x) });
      if (x.code === 'NO_LIVE_CODE') load(e.id);
    } finally {
      setSending(false);
    }
  }

  const ready = state.status === 'ready';
  return (
    <Modal
      open={open}
      onClose={sending ? () => {} : onClose}
      size="lg"
      className="pn-share"
      title={`Share ${e.name}`}
      text="Send the client their gallery: a code, a QR code and a private link, or all three by email with how to open and download the photos."
      onSubmit={live && mayManage ? send : undefined}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={sending}>
            Close
          </Btn>
          {live && mayManage && (
            <Btn tone="primary" type="submit" icon="send" disabled={sending} aria-busy={sending}>
              {sending ? 'Sending…' : 'Send email'}
            </Btn>
          )}
        </>
      }
    >
      {state.status === 'error' ? (
        <div className="pn-share-state" role="alert">
          <Icon name="alert" />
          <p>{state.error}</p>
          <Btn icon="retry" onClick={() => load(e.id)}>
            Try again
          </Btn>
        </div>
      ) : !ready ? (
        <div className="pn-share-skel" aria-busy="true" aria-label="Loading the gallery">
          <i />
          <span>
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : !live ? (
        <div className="pn-share-state">
          <Icon name="key" />
          <div>
            <b>{gallery ? `This event's gallery code is ${gallery.state}` : 'This event has no gallery code yet'}</b>
            <p>
              {gallery
                ? 'Open it again or make a new one on the Access codes page, then share it from here.'
                : 'A code opens the gallery without an account. Create one, then share its link, QR code and code.'}
            </p>
          </div>
          {gallery ? (
            <Link className="pn-btn pn-btn--glass" to="/photographer/access-codes">
              <Icon name="key" />
              Go to Access codes
            </Link>
          ) : mayManage ? (
            <Btn tone="primary" icon="plus" onClick={createCode} disabled={making} aria-busy={making}>
              {making ? 'Creating…' : 'Create a gallery code'}
            </Btn>
          ) : (
            <p className="pn-hint">Ask the studio lead or a photographer to create one.</p>
          )}
        </div>
      ) : (
        <div className="pn-share-body">
          {/* the code and its QR code */}
          <section className="pn-share-card" aria-labelledby="pn-share-qr">
            <h3 className="pn-share-h" id="pn-share-qr">
              <Icon name="qr" /> Gallery code and QR code
            </h3>
            <div className="pn-share-qr">
              <img src={gallery.qr} alt={`QR code that opens the gallery of ${event.name}`} width="168" height="168" />
              <div className="pn-share-code">
                <span className="pn-share-code-v">{gallery.code}</span>
                <div className="pn-share-acts">
                  <Btn size="sm" icon={copied === 'code' ? 'check' : 'copy'} onClick={() => copy('code', gallery.code)}>
                    {copied === 'code' ? 'Copied' : 'Copy code'}
                  </Btn>
                  <a className="pn-btn pn-btn--glass pn-btn--sm" href={gallery.qr} download={`gallery-qr-${slug(event.name)}.png`}>
                    <Icon name="download" />
                    Download QR
                  </a>
                </div>
                <p className="pn-hint">
                  {gallery.expiresAt ? `Open until ${date(gallery.expiresAt)}` : 'Open until it is revoked'}
                  {gallery.maxUsers ? ` · ${plural(gallery.maxUsers, 'viewer')} at a time` : ''}
                  {` · opened ${plural(gallery.opens || 0, 'time')}`}
                </p>
              </div>
            </div>
          </section>

          {/* the private link */}
          <section className="pn-share-card" aria-labelledby="pn-share-link">
            <h3 className="pn-share-h" id="pn-share-link">
              <Icon name="link" /> Share via link
            </h3>
            <div className="pn-share-link">
              <input
                className="pn-input pn-input--sm"
                readOnly
                value={gallery.link}
                aria-label="The gallery's private link"
                onFocus={(x) => x.target.select()}
              />
              <Btn size="sm" icon={copied === 'link' ? 'check' : 'copy'} onClick={() => copy('link', gallery.link)}>
                {copied === 'link' ? 'Copied' : 'Copy link'}
              </Btn>
              {canNativeShare && (
                <Btn size="sm" icon="share" onClick={nativeShare}>
                  Share…
                </Btn>
              )}
            </div>
            <p className="pn-hint">Anyone with the link opens the gallery straight away, no account needed.</p>
          </section>

          {/* the email */}
          <section className="pn-share-card pn-share-mail" aria-labelledby="pn-share-mail">
            <h3 className="pn-share-h" id="pn-share-mail">
              <Icon name="mail" /> Email it to the client
            </h3>
            {!mayManage ? (
              <p className="pn-hint">Sending the gallery by email is for the studio lead, photographers and editors.</p>
            ) : (
              <div className="pn-form">
                {client ? (
                  <fieldset className="pn-pick-list">
                    <legend className="pn-label">Send to</legend>
                    <label className={`pn-pick${to === 'client' ? ' is-on' : ''}`}>
                      <input type="radio" name="share-to" checked={to === 'client'} onChange={() => setTo('client')} />
                      <span className="pn-pick-text">
                        <b>{client.name}</b>
                        <small>{client.email}</small>
                        {client.verified === true ? (
                          <Badge tone="done">Email verified</Badge>
                        ) : client.verified === false ? (
                          <Badge tone="warn">Email not verified yet</Badge>
                        ) : (
                          <Badge tone="neutral">From the booking</Badge>
                        )}
                      </span>
                      <span className="pn-pick-box" aria-hidden="true">
                        <Icon name="check" />
                      </span>
                    </label>
                    <label className={`pn-pick${to === 'other' ? ' is-on' : ''}`}>
                      <input type="radio" name="share-to" checked={to === 'other'} onChange={() => setTo('other')} />
                      <span className="pn-pick-text">
                        <b>Another email address</b>
                        <small>Type it below, twice</small>
                      </span>
                      <span className="pn-pick-box" aria-hidden="true">
                        <Icon name="check" />
                      </span>
                    </label>
                  </fieldset>
                ) : (
                  <p className="pn-note">
                    <Icon name="info" />
                    <span>No client is linked to this event yet, so type the address the gallery should go to.</span>
                  </p>
                )}

                {client && to === 'client' ? (
                  <div className={`pn-field${errors.confirmed ? ' has-error' : ''}`}>
                    <label className="pn-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(x) => {
                          setChecked(x.target.checked);
                          setErrors((r) => ({ ...r, confirmed: undefined }));
                        }}
                        aria-describedby={errors.confirmed ? 'pn-share-confirm-e' : undefined}
                      />
                      <span>
                        <b>I have checked this is {client.name}'s current email address</b>
                        <small>
                          {client.email}
                          {client.verified === false ? ': they have not confirmed it on their account yet.' : ''}
                        </small>
                      </span>
                    </label>
                    {errors.confirmed && (
                      <p className="pn-error" id="pn-share-confirm-e">
                        {errors.confirmed}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="pn-form-row">
                    <Field label="Client's email" error={errors.email}>
                      {(p) => (
                        <input
                          {...p}
                          className="pn-input"
                          type="email"
                          autoComplete="off"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(x) => {
                            setEmail(x.target.value);
                            setErrors((r) => ({ ...r, email: undefined, again: undefined }));
                          }}
                        />
                      )}
                    </Field>
                    <Field label="Type it again" error={errors.again}>
                      {(p) => (
                        <input
                          {...p}
                          className="pn-input"
                          type="email"
                          autoComplete="off"
                          value={again}
                          onChange={(x) => {
                            setAgain(x.target.value);
                            setErrors((r) => ({ ...r, again: undefined }));
                          }}
                          onPaste={(x) => x.preventDefault()} // typed, not pasted: that is the check
                        />
                      )}
                    </Field>
                  </div>
                )}

                <Field label="A note to the client" optional error={errors.message} hint={`${message.length}/400 · put at the top of the email`}>
                  {(p) => (
                    <textarea
                      {...p}
                      className="pn-input pn-textarea"
                      rows={2}
                      maxLength={400}
                      placeholder="Thank you for having us. Here are your photos!"
                      value={message}
                      onChange={(x) => setMessage(x.target.value)}
                    />
                  )}
                </Field>

                <p className="pn-note">
                  <Icon name="mail" />
                  <span>
                    The email holds the private link, the code {gallery.code}, the QR code (shown and attached to print), and step
                    by step how to open the gallery, keep favourites, download the photos and share them with guests.
                  </span>
                </p>
                {errors.form && (
                  <p className="pn-error" role="alert">
                    {errors.form}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
