/*
  Gallery access codes, in the shape the sign-in page accepts (src/lib/galleryCode.js: 4, 4, 4 and 2
  letters or numbers, ANNA-LEO1-JUNE-24). A code is made from the event's name, so it reads as the event:
  "Anna & Leo" → ANNA-LEOx-xxxx-xx, "Harbourside Jazz Night" → HARB-JAZZ-xxxx-xx; the rest is random.
  Letters that are easy to misread (O and 0, I and 1) are left out of the random part.
*/
import { GROUPS, isCode } from '../../../lib/galleryCode.js';

const SAFE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const pick = () => SAFE[Math.floor(Math.random() * SAFE.length)];
const fill = (s, n) => (s + Array.from({ length: n }, pick).join('')).slice(0, n);

export function suggestCode(name, taken = new Set(), fresh = false) {
  const words = String(name)
    .normalize('NFKD')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  for (let attempt = 0; attempt < 40; attempt++) {
    const random = fresh || attempt > 3;
    const parts = GROUPS.map((n, i) => {
      if (i === GROUPS.length - 1) return fill('', n);
      const word = random && i > 0 ? '' : words[i] || '';
      return fill(word, n);
    });
    const code = parts.join('-');
    if (isCode(code) && !taken.has(code)) return code;
  }
  return GROUPS.map((n) => fill('', n)).join('-');
}

/* the address a guest opens with the code already in it (the gallery dashboard reads ?code=) */
export const galleryLink = (code) => `${window.location.origin}/dashboard?code=${encodeURIComponent(code)}`;
