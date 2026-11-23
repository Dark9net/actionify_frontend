import { studio } from '../data/content.js';

/*
  The one place where form details leave the site.

  There is no server behind this site, so the details are handed to the visitor's own email app
  as a ready-written message addressed to `studio.email` (set it in src/data/content.js).

  To collect requests without the email step, replace the body of this function with a POST to
  your form service or API, for example:
    return fetch('https://your-form-endpoint', { method: 'POST', body: JSON.stringify({ subject, rows }) });
*/
export function sendEnquiry(subject, rows) {
  const body = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
  window.location.href =
    `mailto:${studio.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
