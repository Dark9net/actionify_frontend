import { Link } from 'react-router-dom';
import { brand } from '../../data/content.js';

const YEAR = new Date().getFullYear();

/* The quiet line at the foot of every panel page: whose panel it is, and a few ways out. */
export default function PanelFooter() {
  return (
    <footer className="pn-foot">
      <p className="pn-foot-note">
        © {YEAR} {brand.name} <span aria-hidden="true">·</span> Studio panel
      </p>
      <nav className="pn-foot-links" aria-label="Panel footer">
        <Link to="/photographer/settings">Settings</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/">View the website</Link>
      </nav>
    </footer>
  );
}
