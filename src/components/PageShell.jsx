import { useEffect } from 'react';
import Footer from './Footer.jsx';
import { RevealLines } from './RevealText.jsx';
import useFontsReady from '../hooks/useFontsReady.js';
import { brand } from '../data/content.js';
import '../styles/pages.css';

/*
  The frame every page other than the landing page shares:
  the nav, a large title with a slogan and an introduction, the page's own sections, the footer.
*/
export default function PageShell({ name, title, slogan, intro, children }) {
  const ready = useFontsReady();

  useEffect(() => {
    document.title = `${name} · ${brand.name}`;
  }, [name]);

  return (
    <div className="page">
      <main id="main">
        <header className={`page-head${ready ? ' in' : ''}`}>
          <div className="wrap">
            <div className="sec-label label">
              {brand.name} {brand.sub}
            </div>
            <h1 className="page-title display rv" aria-label={title.join(' ')}>
              <RevealLines lines={title} />
            </h1>
            <div className="page-sub rise">
              <p className="page-slogan display">{slogan}</p>
              <p className="page-intro">{intro}</p>
            </div>
          </div>
        </header>
        {children}
      </main>
      <Footer />
    </div>
  );
}
