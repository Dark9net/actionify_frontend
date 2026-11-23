import { Suspense, useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import PanelSidebar from './PanelSidebar.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import PanelFooter from './PanelFooter.jsx';
import UploadTray from './UploadTray.jsx';
import Toaster from './Toaster.jsx';
import Icon from './icons.jsx';
import { setNavigate, useUploads } from './lib/uploads.js';
import { setPref, useAccount } from './lib/account.js';
import useStorageStatus from '../../hooks/useStorageStatus.js';
import { isStaff, landingFor, restoreSession, signOut, useSession } from '../../lib/auth.js';
import { weekday } from './lib/format.js';
import '../../styles/panel.css';

// beside the page the sidebar folds to its icons; below this it is a drawer over the page
const DESK = '(min-width: 1025px)';
const deskQuery = typeof window !== 'undefined' ? window.matchMedia(DESK) : null;
const onDesk = (f) => {
  deskQuery?.addEventListener('change', f);
  return () => deskQuery?.removeEventListener('change', f);
};
const isDesk = () => deskQuery?.matches ?? true;

/*
  The photographer panel (/photographer/…): its own sidebar, a slim bar along the top (the sidebar's
  toggle on the left; uploads, storage mode and the profile menu on the right), the page, the upload
  tray and the toasts. The website's header, menu and back-to-top stay out of it (SiteHeader and
  BackToTop step aside on these addresses).
*/
function PanelShell() {
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const u = useUploads();
  const storage = useStorageStatus();
  const { prefs } = useAccount();
  const folded = prefs.folded;
  const desk = useSyncExternalStore(onDesk, isDesk, () => true);

  useEffect(() => setNavigate(navigate), [navigate]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('is-panel');
    return () => root.classList.remove('is-panel');
  }, []);

  // a new page: the drawer closes, the page starts at its top
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  // the drawer closes when the window grows past it
  useEffect(() => {
    if (desk) setMenu(false);
  }, [desk]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  const toggle = () => (desk ? setPref('folded', !folded) : setMenu(true));
  const toggleLabel = desk ? (folded ? 'Show the sidebar' : 'Hide the sidebar') : 'Open the menu';

  return (
    <div className={`pn${folded ? ' is-folded' : ''}${u.items.length ? ' has-tray' : ''}`}>
      <div className="pn-ambient" aria-hidden="true" />
      <a className="pn-skip" href="#pn-main">
        Skip to content
      </a>
      <PanelSidebar open={menu} onClose={() => setMenu(false)} folded={folded} />
      <button type="button" className={`pn-scrim${menu ? ' is-on' : ''}`} aria-hidden="true" tabIndex={-1} onClick={() => setMenu(false)} />

      <div className="pn-main" inert={menu}>
        <header className="pn-top">
          <button
            type="button"
            className="pn-toggle"
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-controls="pn-side"
            aria-expanded={desk ? !folded : menu}
            onClick={toggle}
          >
            <Icon name={desk ? 'sidebar' : 'menu'} />
          </button>
          <p className="pn-top-date">{weekday(Date.now())}</p>
          <div className="pn-top-right">
            {u.active > 0 && (
              <span className="pn-top-up" role="status">
                <span className="pn-pulse" aria-hidden="true" />
                {u.active} uploading
              </span>
            )}
            <span
              className={`pn-mode${storage === 'up' ? ' is-live' : ''}`}
              title={storage === 'up' ? 'Uploads go straight to the Cloudflare R2 bucket' : storage === 'disabled' ? 'No R2 keys in backend/.env yet' : 'R2 is not answering'}
            >
              {storage === 'up' ? '' : storage === 'checking' ? 'Checking R2' : storage === 'disabled' ? 'R2 off' : 'R2 offline'}
            </span>
            {/* the upload pages have their own buttons for this */}
            {!pathname.startsWith('/photographer/uploads') && (
              <Link to="/photographer/uploads" className="pn-btn pn-btn--primary pn-btn--sm pn-top-upload">
                <Icon name="upload" />
                <span>Upload photos</span>
              </Link>
            )}
            <ProfileMenu />
          </div>
        </header>
        <main id="pn-main" className="pn-page" tabIndex={-1}>
          <Suspense fallback={<div className="pn-page-loading" aria-busy="true" aria-label="Loading" />}>
            <Outlet />
          </Suspense>
        </main>
        <PanelFooter />
      </div>

      <UploadTray />
      <Toaster />
    </div>
  );
}

/*
  Who may see the panel: a signed-in account whose role opens it (panel.access). The API checks the
  same on every call; this only keeps the panel from showing to anyone else. Signed out: to the
  sign-in page, which brings them back here afterwards.
*/
export default function PanelLayout() {
  const session = useSession();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    restoreSession();
  }, []);

  if (session.status === 'unknown' || session.status === 'loading') {
    return <div className="pn-loading" aria-busy="true" aria-label="Opening the panel" />;
  }
  if (session.status === 'offline') {
    return (
      <PanelGate title="The panel can't be reached">
        <p>The studio's sign-in service isn't answering. Check your connection, then try again.</p>
        <button type="button" className="pn-btn pn-btn--primary" onClick={() => restoreSession({ force: true })}>
          Try again
        </button>
      </PanelGate>
    );
  }
  if (session.status !== 'signedIn') {
    return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  }
  if (!isStaff(session.user)) {
    return (
      <PanelGate title="This panel is for the studio team">
        <p>
          You're signed in as {session.user.email}, a {session.user.role.name.toLowerCase()} account. Your galleries open
          from the sign-in page.
        </p>
        <div className="pn-gate-actions">
          <Link className="pn-btn pn-btn--primary" to={landingFor(session.user)}>
            Go to your galleries
          </Link>
          <button
            type="button"
            className="pn-btn"
            onClick={async () => {
              await signOut().catch(() => {});
              navigate('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </PanelGate>
    );
  }
  return <PanelShell />;
}

function PanelGate({ title, children }) {
  return (
    <main className="pn-gate">
      <div className="pn-gate-card">
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}
