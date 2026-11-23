/*
  Gallery codes: 14 letters and numbers in four groups, 4, 4, 4 and 2 long, joined by dashes
  (ANNA-LEO1-JUNE-24), the same shape the API checks (backend/src/validators/gallerycode.js).
  The groups live in GROUPS, so the shape changes in one place.
*/
export const GROUPS = [4, 4, 4, 2];
const TOTAL = GROUPS.reduce((a, b) => a + b, 0); // 14 letters and numbers
export const CODE_LENGTH = TOTAL + GROUPS.length - 1; // 17 with the dashes
const part = GROUPS.map((n) => `[A-Z0-9]{${n}}`).join('-');
const EXACT = new RegExp(`^${part}$`);
const INSIDE = new RegExp(`(?:^|[^A-Z0-9])(${part})(?![A-Z0-9])`, 'i');

/* What was typed or pasted, as a code: capitals, letters and numbers only, the dashes put in for you. */
export function formatCode(raw) {
  const clean = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, TOTAL);
  const out = [];
  let at = 0;
  for (const n of GROUPS) {
    if (at >= clean.length) break;
    out.push(clean.slice(at, at + n));
    at += n;
  }
  return out.join('-');
}

export const isCode = (value) => EXACT.test(value);

/*
  The code inside a scanned QR code. The studio's codes hold either the code itself or a gallery link
  with it (…/dashboard?code=ANNA-LEO1-JUNE-24). Anything else is not a gallery code: null.
*/
export function codeFromScan(text) {
  const raw = String(text || '').trim();
  try {
    const url = new URL(raw);
    const q = url.searchParams.get('code');
    if (q && isCode(formatCode(q))) return formatCode(q);
  } catch {
    /* not a link */
  }
  const found = raw.match(INSIDE);
  if (found) return found[1].toUpperCase();
  const whole = formatCode(raw);
  return raw.replace(/[^A-Za-z0-9]/g, '').length === TOTAL && isCode(whole) ? whole : null;
}
