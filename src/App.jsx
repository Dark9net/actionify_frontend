import { Suspense, lazy, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import ServicesPage from './pages/Services.jsx';
import OurWork from './pages/OurWork.jsx';
import Films from './pages/Films.jsx';
import Production from './pages/Production.jsx';
import Originals from './pages/Originals.jsx';
import HireUs from './pages/HireUs.jsx';
import OurDetails from './pages/OurDetails.jsx';
import ContactUs from './pages/ContactUs.jsx';
import Terms from './pages/Terms.jsx';
import NotFound from './pages/NotFound.jsx';
import Login from './pages/auth/Login.jsx';
import VerifyEmail from './pages/auth/VerifyEmail.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import Dashboard from './pages/authpanel/Dashboard.jsx';
import SiteHeader from './components/SiteHeader.jsx';
import Sidebar from './components/Sidebar.jsx';
import ScrollManager from './components/ScrollManager.jsx';
import BackToTop from './components/BackToTop.jsx';
import { MenuContext } from './hooks/useMenu.js';
import useFontsReady from './hooks/useFontsReady.js';
import { markSite, siteOf } from './lib/site.js';

/* the photographer panel loads on its own, the first time one of its pages is opened */
const panel = (name) => lazy(() => import(`./pages/photographer_panel/photographer_pages/${name}.jsx`));
const PanelLayout = lazy(() => import('./pages/photographer_panel/PanelLayout.jsx'));
const Overview = panel('Overview');
const Uploads = panel('Uploads');
const EventFolder = panel('EventFolder');
const AccessCodes = panel('AccessCodes');
const Access = panel('Access');
const Bookings = panel('Bookings');
const Team = panel('Team');
const Clients = panel('Clients');
const Payments = panel('Payments');
const Storage = panel('Storage');
const Settings = panel('Settings');

/* the website's own header, menu and back-to-top: not on the photographer panel, which has its own */
function SiteOnly({ children }) {
  const { pathname } = useLocation();
  return siteOf(pathname) === 'panel' ? null : children;
}

/* <html data-site>: the public site's typefaces apply only on its pages (styles/type.css) */
function SiteScope() {
  const { pathname } = useLocation();
  useLayoutEffect(() => markSite(pathname), [pathname]);
  return null;
}

export default function App() {
  const ready = useFontsReady();
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const menu = useMemo(() => ({ open: menuOpen, openMenu }), [menuOpen, openMenu]);

  return (
    <BrowserRouter>
      <MenuContext.Provider value={menu}>
        <SiteScope />
        <ScrollManager />
        <div className="grain" aria-hidden="true" />
        <SiteOnly>
          <SiteHeader />
        </SiteOnly>
        <Routes>
          <Route path="/" element={<Home ready={ready} />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/our-work" element={<OurWork />} />
          <Route path="/our-work/films" element={<Films />} />
          <Route path="/our-work/production" element={<Production />} />
          <Route path="/our-work/originals" element={<Originals />} />
          <Route path="/hire-us" element={<HireUs />} />
          <Route path="/our-details" element={<OurDetails />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/photographer"
            element={
              <Suspense fallback={<div className="pn-loading" aria-busy="true" />}>
                <PanelLayout />
              </Suspense>
            }
          >
            <Route index element={<Overview />} />
            <Route path="uploads" element={<Uploads />} />
            <Route path="uploads/:eventId" element={<EventFolder />} />
            <Route path="access-codes" element={<AccessCodes />} />
            <Route path="access" element={<Access />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="team" element={<Team />} />
            <Route path="clients" element={<Clients />} />
            <Route path="payments" element={<Payments />} />
            <Route path="storage" element={<Storage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SiteOnly>
          <BackToTop />
          <Sidebar open={menuOpen} onClose={closeMenu} />
        </SiteOnly>
      </MenuContext.Provider>
    </BrowserRouter>
  );
}
