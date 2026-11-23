import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import ContactForm from '../components/ContactForm.jsx';
import { Arrow } from '../components/Icons.jsx';
import { contact, studio } from '../data/content.js';

/* The direct ways to reach the studio, beside a short message form. */
export default function ContactUs() {
  return (
    <PageShell name="Contact Us" title={contact.title} slogan={contact.slogan} intro={contact.intro}>
      <section className="contact">
        <div className="wrap contact-grid">
          <aside className="contact-side">
            <h2 className="label rust">{contact.directLabel}</h2>
            <dl className="d-table">
              <div className="d-row">
                <dt className="label">Email</dt>
                <dd>
                  <a className="tlink" href={`mailto:${studio.email}`}>
                    {studio.email}
                  </a>
                </dd>
              </div>
              {studio.phone && (
                <div className="d-row">
                  <dt className="label">Phone</dt>
                  <dd>{studio.phone}</dd>
                </div>
              )}
              {studio.location && (
                <div className="d-row">
                  <dt className="label">Based in</dt>
                  <dd>{studio.location}</dd>
                </div>
              )}
              {studio.social.map(([label, href]) => (
                <div className="d-row" key={label}>
                  <dt className="label">{label}</dt>
                  <dd>
                    <a className="tlink" href={href} target="_blank" rel="noreferrer">
                      Open {label}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
            <Link className="btn glass-btn" to="/hire-us">
              <span>Book a shoot</span>
              <Arrow />
            </Link>
          </aside>

          <div className="contact-form">
            <h2 className="label rust">{contact.formLabel}</h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
