import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import { Arrow } from '../components/Icons.jsx';

/* Any address the site does not know. */
export default function NotFound() {
  return (
    <PageShell
      name="Page not found"
      title={['Out of', 'frame']}
      slogan="This page is not in the picture."
      intro="The address may have changed, or the link was mistyped. The landing page has everything."
    >
      <section className="lost">
        <div className="wrap">
          <Link className="btn" to="/">
            <span>Go to the home page</span>
            <Arrow />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
