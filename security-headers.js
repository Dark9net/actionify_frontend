/*
  The security headers for the website's pages (the API sets its own with helmet, backend/src/app.js).

  vite.config.js sends them from the dev server and `vite preview`, and writes the Content Security
  Policy into the built index.html as a <meta> tag, so the policy travels with dist/ to any host.
  Whatever serves dist/ in production should ALSO send `productionHeaders` as real headers: a <meta>
  policy can't stop other sites framing the page (frame-ancestors), and HSTS only works as a header.

  What the pages load, and so what the policy allows:
  - scripts and styles: this site only (the build has no inline scripts); style attributes are allowed
  - images and video: this site, data:/blob: (previews, the QR code), and https (Unsplash and
    CloudFront photographs, R2's signed links)
  - fetch/XHR: this site's /api, R2 (uploads go straight to the bucket; downloads read from it), and
    Unsplash while the client dashboard still shows its sample photos (src/data/content.js)
  - the camera: this site only (the QR scanner on the sign-in page)
*/

const CONNECT = ["'self'", 'https://*.r2.cloudflarestorage.com', 'https://images.unsplash.com'];

/** The Content Security Policy. `apiOrigin`: VITE_API_URL when the API lives on another origin. */
export function contentSecurityPolicy({ apiOrigin = '', framing = true, upgrade = false } = {}) {
  const connect = apiOrigin ? [...CONNECT, apiOrigin] : CONNECT;
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // frame-ancestors is ignored (and warned about) inside a <meta> tag
    ...(framing ? ["frame-ancestors 'none'"] : []),
    ...(upgrade ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

/** Sent with every page, in development too. */
export const baseHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** `vite preview`: the built site, on plain http://localhost. */
export const previewHeaders = (opts) => ({ ...baseHeaders, 'Content-Security-Policy': contentSecurityPolicy(opts) });

/** For the production host (nginx, Caddy, Cloudflare Pages…), served over HTTPS. */
export const productionHeaders = (opts) => ({
  ...baseHeaders,
  'Content-Security-Policy': contentSecurityPolicy({ ...opts, upgrade: true }),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
});
