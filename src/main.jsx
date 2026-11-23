import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/bodoni-moda/opsz.css';
// the public site's faces (styles/type.css): Jost for display, IBM Plex Mono for labels, Mukta for Nepali
import '@fontsource-variable/jost';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/mukta/400.css';
import '@fontsource/mukta/500.css';
import '@fontsource/mukta/600.css';
import './styles/base.css';
import './styles/site.css';
import './styles/type.css';
import App from './App.jsx';
import { markSite } from './lib/site.js';

// before the first paint, so a public page never shows the panel's faces (or the reverse)
markSite(window.location.pathname);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
