import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from './icons.jsx';
import { Avatar, Confirm, useOutside } from './ui.jsx';
import { useMe } from './lib/account.js';
import { cancelAll, useUploads } from './lib/uploads.js';
import { plural } from './lib/format.js';
import { signOut } from '../../lib/auth.js';

/*
  Logging out, shared by the header's menu and the Settings page. Uploads still going are stopped
  first, after asking (the photos already on R2 stay); then the session ends and the sign-in page opens.
*/
export function useSignOut() {
  const navigate = useNavigate();
  const u = useUploads();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    cancelAll();
    try {
      await signOut();
    } catch {
      /* no sign-in platform connected yet: there is no session to end, so just leave */
    }
    navigate('/login');
  }

  const request = () => (u.active ? setAsk(true) : leave());
  const confirm = (
    <Confirm
      open={ask}
      onClose={() => setAsk(false)}
      onConfirm={leave}
      title="Log out while uploading?"
      text={`${plural(u.active, 'upload')} still going will stop. The photos already on R2 stay where they are.`}
      action="Stop and log out"
    />
  );
  return { request, busy, confirm, asks: u.active > 0 };
}

/*
  The profile button at the top right and its menu: who is signed in, Settings and Log out.
  A menu button: arrow keys move through the items, Esc closes it and puts focus back on the button.
*/
export default function ProfileMenu() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const button = useRef(null);
  const list = useRef(null);
  const id = useId();
  const { pathname } = useLocation();
  const out = useSignOut();

  useOutside(wrap, () => setOpen(false), open);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (open) list.current?.querySelector('[role=menuitem]')?.focus();
  }, [open]);

  const items = () => [...(list.current?.querySelectorAll('[role=menuitem]:not([aria-disabled=true])') || [])];
  function onMenuKey(e) {
    const all = items();
    const at = all.indexOf(document.activeElement);
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: all.length - 1 }[e.key];
    if (to != null) {
      e.preventDefault();
      all[(to + all.length) % all.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div className={`pn-profile${open ? ' is-open' : ''}`} ref={wrap}>
      <button
        ref={button}
        type="button"
        className={`pn-profile-btn${out.busy ? ' is-busy' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={`${me.name}: profile and settings`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Avatar name={me.name} photo={me.photo} size={34} />
        <Icon name="chevronDown" className="pn-profile-chev" />
      </button>

      {open && (
        <div className="pn-profile-pop" id={`${id}-menu`} role="menu" aria-label="Profile" ref={list} onKeyDown={onMenuKey}>
          <div className="pn-profile-who" role="presentation">
            <Avatar name={me.name} photo={me.photo} size={44} />
            <span>
              <b>{me.name}</b>
              <span className="pn-profile-mail">{me.email}</span>
              <span className="pn-profile-role">{me.role}</span>
            </span>
          </div>
          <div className="pn-profile-items" role="presentation">
            <Link to="/photographer/settings" role="menuitem" className="pn-profile-item" onClick={() => setOpen(false)}>
              <Icon name="settings" />
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              className="pn-profile-item pn-profile-item--out"
              aria-disabled={out.busy || undefined}
              onClick={() => {
                if (out.busy) return;
                // the question opens as its own window, so the menu steps aside for it
                if (out.asks) setOpen(false);
                out.request();
              }}
            >
              <Icon name="leave" />
              {out.busy ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      )}
      {out.confirm}
    </div>
  );
}
