import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../icons.jsx';
import { Avatar, Btn, Field, PageHead, Pane } from '../ui.jsx';
import { setPref, useMe } from '../lib/account.js';
import { toast } from '../lib/toast.js';
import { NotConnected, can, removeProfilePhoto, requestReset, setProfilePhoto, signOutEverywhere, updateProfile, useSession } from '../../../lib/auth.js';
import { getPaymentQr, removePaymentQr, uploadPaymentQr } from '../lib/clients.js';
import { date } from '../lib/format.js';
import { showMobile } from '../lib/bookings.js';
import { squarePhoto } from '../lib/photo.js';

const OFFLINE = "The sign-in service isn't answering. Try again in a moment.";
const tidy = (s) => s.replace(/\s+/g, ' ').trim();

/*
  Settings: the profile shown in the header's menu, how the panel behaves on this device, the
  password and signing out on every device. Opened from the profile menu at the top right, which
  also has Log out.

  The name and mobile are saved to the account (PATCH /api/v1/auth/me); the mobile goes in a client's
  email when you are sent to their booking. The profile photo is your own only (PUT /auth/me/photo):
  it shows in the profile button at the top right, on Photographers and on Bookings. The email and role are shown but not editable here: the
  role is given by the studio lead, and the API refuses any other way.
*/
export default function Settings() {
  const me = useMe();
  const navigate = useNavigate();
  const [name, setName] = useState(me.name);
  const [mobile, setMobile] = useState(showMobile(me.mobile));
  const [error, setError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(''); // '' | 'up' | 'off'
  const [preview, setPreview] = useState(null); // the chosen picture while it uploads
  const nameRef = useRef(null);
  const mobileRef = useRef(null);
  const fileRef = useRef(null);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  const digits = (v) => v.replace(/[\s().-]/g, '');
  const mobileChanged = digits(mobile) !== digits(showMobile(me.mobile));
  const changed = tidy(name) !== me.name || mobileChanged;

  async function save(e) {
    e.preventDefault();
    const clean = tidy(name);
    if (clean.length < 2) {
      setError('Enter your name.');
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const user = await updateProfile({ name: clean, mobile: mobileChanged ? digits(mobile) : undefined });
      setName(user.name);
      setMobile(showMobile(user.mobile));
      toast({ tone: 'success', title: 'Profile saved', text: mobileChanged ? 'Clients get this mobile number when you are sent to their booking.' : 'Your name shows in the menu at the top right.' });
    } catch (err) {
      if (err.errors?.name) {
        setError(err.errors.name);
        nameRef.current?.focus();
      } else if (err.errors?.mobile) {
        setMobileError(err.errors.mobile);
        mobileRef.current?.focus();
      } else {
        toast({ tone: 'error', title: 'The profile was not saved', text: err instanceof NotConnected ? OFFLINE : err.message });
      }
    } finally {
      setSaving(false);
    }
  }

  async function choosePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // the same file can be chosen again
    if (!file) return;
    setPhotoBusy('up');
    try {
      const blob = await squarePhoto(file);
      setPreview(URL.createObjectURL(blob));
      await setProfilePhoto(blob);
      toast({ tone: 'success', title: 'Photo saved', text: 'It shows at the top right, on Photographers and on Bookings.' });
    } catch (err) {
      toast({ tone: 'error', title: 'The photo was not saved', text: err instanceof NotConnected ? OFFLINE : err.message });
    } finally {
      setPreview(null);
      setPhotoBusy('');
    }
  }

  async function dropPhoto() {
    setPhotoBusy('off');
    try {
      await removeProfilePhoto();
      toast({ tone: 'info', title: 'Photo removed', text: 'Your initials show instead.' });
    } catch (err) {
      toast({ tone: 'error', title: 'The photo was not removed', text: err instanceof NotConnected ? OFFLINE : err.message });
    } finally {
      setPhotoBusy('');
    }
  }

  async function reset() {
    setSending(true);
    try {
      await requestReset({ email: me.email });
      toast({ tone: 'success', title: 'Reset link sent', text: `Check ${me.email} for a link to choose a new password.` });
    } catch (err) {
      toast({ tone: 'error', title: 'The link could not be sent', text: err instanceof NotConnected ? OFFLINE : err.message });
    } finally {
      setSending(false);
    }
  }

  async function everywhere() {
    setLeaving(true);
    try {
      await signOutEverywhere();
    } catch {
      /* signed out on this device whatever the answer */
    }
    navigate('/login');
  }

  return (
    <>
      <PageHead kicker="Settings" title="Settings" text="Your profile, how the panel behaves on this device, and signing in and out." />

      <div className="pn-settings">
        <Pane title="Profile" id="set-profile">
          <form className="pn-form" onSubmit={save} noValidate>
            <div className="pn-set-who">
              <span className={`pn-set-photo${photoBusy ? ' is-busy' : ''}`}>
                <Avatar name={tidy(name) || me.name} photo={preview || me.photo} size={72} />
              </span>
              <div>
                <p className="pn-set-name">{tidy(name) || me.name}</p>
                <p className="pn-set-sub">{me.role}</p>
                <div className="pn-set-photo-acts">
                  <Btn size="sm" icon="image" onClick={() => fileRef.current?.click()} disabled={Boolean(photoBusy)} aria-busy={photoBusy === 'up'}>
                    {photoBusy === 'up' ? 'Uploading…' : me.photo ? 'Change photo' : 'Upload photo'}
                  </Btn>
                  {me.photo && !preview && (
                    <Btn size="sm" tone="ghost" onClick={dropPhoto} disabled={Boolean(photoBusy)}>
                      {photoBusy === 'off' ? 'Removing…' : 'Remove'}
                    </Btn>
                  )}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={choosePhoto} aria-label="Choose a profile photo" />
                </div>
                <p className="pn-set-hint">A JPEG, PNG or WebP. It is cropped to a square; only you can change it.</p>
              </div>
            </div>
            <div className="pn-form-row">
              <Field label="Name" error={error}>
                {(p) => (
                  <input
                    {...p}
                    ref={nameRef}
                    className="pn-input"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    autoComplete="name"
                    maxLength={100}
                  />
                )}
              </Field>
              <Field label="Role" hint="Set by the studio lead.">
                {(p) => <input {...p} className="pn-input" value={me.role} readOnly />}
              </Field>
            </div>
            <div className="pn-form-row">
              <Field label="Email" hint="Where password links go. Ask the studio lead to change it.">
                {(p) => <input {...p} type="email" className="pn-input" value={me.email} readOnly />}
              </Field>
              <Field label="Mobile" optional error={mobileError} hint="Sent to the client when you're assigned to their booking.">
                {(p) => (
                  <input
                    {...p}
                    ref={mobileRef}
                    type="tel"
                    inputMode="tel"
                    className="pn-input"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      setMobileError('');
                    }}
                    placeholder="98XXXXXXXX"
                    autoComplete="tel"
                    maxLength={24}
                  />
                )}
              </Field>
            </div>
            <div className="pn-set-acts">
              <Btn
                tone="ghost"
                disabled={!changed || saving}
                onClick={() => {
                  setName(me.name);
                  setMobile(showMobile(me.mobile));
                  setMobileError('');
                }}
              >
                Undo changes
              </Btn>
              <Btn tone="primary" type="submit" icon="check" disabled={!changed || saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </Btn>
            </div>
          </form>
        </Pane>

        <div className="pn-settings-side">
          <Pane title="This device" id="set-prefs">
            <ul className="pn-prefs">
              <li>
                <span>
                  <b>Fold the sidebar to icons</b>
                  <span>On wider screens. The button at the top left does the same.</span>
                </span>
                <label className="pn-switch">
                  <input type="checkbox" checked={me.prefs.folded} onChange={(e) => setPref('folded', e.target.checked)} />
                  <span aria-hidden="true" />
                  <i className="sr-only">Fold the sidebar to icons</i>
                </label>
              </li>
              <li>
                <span>
                  <b>Tell me when uploads finish</b>
                  <span>A toast for each finished batch. Failed uploads always show one.</span>
                </span>
                <label className="pn-switch">
                  <input type="checkbox" checked={me.prefs.doneToasts} onChange={(e) => setPref('doneToasts', e.target.checked)} />
                  <span aria-hidden="true" />
                  <i className="sr-only">Tell me when uploads finish</i>
                </label>
              </li>
            </ul>
          </Pane>

          <PaymentQr />

          <Pane title="Password and signing in" id="set-sign">
            <p className="pn-set-text">
              We send a link to {me.email} to choose a new password. Saving it signs every device out.
            </p>
            <div className="pn-set-acts pn-set-acts--start">
              <Btn icon="lock" onClick={reset} disabled={sending}>
                {sending ? 'Sending…' : 'Send a reset link'}
              </Btn>
              <Btn tone="ghost" icon="leave" onClick={everywhere} disabled={leaving}>
                {leaving ? 'Logging out…' : 'Log out on every device'}
              </Btn>
            </div>
          </Pane>
        </div>
      </div>
    </>
  );
}

/*
  The studio's own payment QR (eSewa, Khalti, Fonepay or a bank's): uploaded once, attached to every
  payment request sent from Clients. Kept exactly as uploaded (a QR must not be cropped or shrunk).
  Anyone who can see clients sees it; client.manage changes it.
*/
function PaymentQr() {
  const session = useSession();
  const { hash } = useLocation();
  const sees = can(session.user, 'client.view');
  const manage = can(session.user, 'client.manage');
  const [qr, setQr] = useState(undefined); // undefined: loading; null: none
  const [busy, setBusy] = useState('');
  const fileRef = useRef(null);
  const paneRef = useRef(null);

  useEffect(() => {
    if (!sees) return;
    getPaymentQr()
      .then(setQr)
      .catch(() => setQr(null));
  }, [sees]);

  // opened from Clients (#payment-qr): bring it into view
  useEffect(() => {
    if (hash === '#payment-qr' && qr !== undefined) paneRef.current?.scrollIntoView({ block: 'center' });
  }, [hash, qr]);

  if (!sees) return null;

  async function choose(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast({ tone: 'error', title: 'The QR was not saved', text: 'Choose a PNG, JPEG or WebP picture of the QR.' });
    if (file.size > 5 * 1024 * 1024) return toast({ tone: 'error', title: 'The QR was not saved', text: 'That picture is too big. Choose one under 5 MB.' });
    setBusy('up');
    try {
      setQr(await uploadPaymentQr(file));
      toast({ tone: 'success', title: 'Payment QR saved', text: 'Every payment request from Clients carries it.' });
    } catch (err) {
      toast({ tone: 'error', title: 'The QR was not saved', text: err instanceof NotConnected ? OFFLINE : err.message });
    } finally {
      setBusy('');
    }
  }

  async function drop() {
    setBusy('off');
    try {
      setQr(await removePaymentQr());
      toast({ tone: 'info', title: 'Payment QR removed', text: 'Payment requests can be sent again once a new one is uploaded.' });
    } catch (err) {
      toast({ tone: 'error', title: 'The QR was not removed', text: err instanceof NotConnected ? OFFLINE : err.message });
    } finally {
      setBusy('');
    }
  }

  return (
    <div ref={paneRef} id="payment-qr">
      <Pane title="Payment QR" id="set-qr">
        <div className="pn-set-qr">
          {qr ? (
            <img src={qr.url} alt="The studio's payment QR" className="pn-set-qr-img" width="132" height="132" />
          ) : (
            <span className="pn-set-qr-empty" aria-hidden="true">
              <Icon name="qr" />
            </span>
          )}
          <div>
            <p className="pn-set-text">
              {qr === undefined
                ? 'Loading…'
                : qr
                  ? `Attached to every payment request sent from Clients. Updated ${date(qr.updatedAt)}${qr.updatedBy ? ` by ${qr.updatedBy}` : ''}.`
                  : "Your eSewa, Khalti, Fonepay or bank QR. Payment requests from Clients carry it, so clients can scan and pay; none can be sent until it's uploaded."}
            </p>
            {manage && (
              <div className="pn-set-acts pn-set-acts--start">
                <Btn icon="qr" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)} aria-busy={busy === 'up'}>
                  {busy === 'up' ? 'Uploading…' : qr ? 'Replace QR' : 'Upload QR'}
                </Btn>
                {qr && (
                  <Btn tone="ghost" onClick={drop} disabled={Boolean(busy)}>
                    {busy === 'off' ? 'Removing…' : 'Remove'}
                  </Btn>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={choose} aria-label="Choose the payment QR picture" />
              </div>
            )}
          </div>
        </div>
      </Pane>
    </div>
  );
}
