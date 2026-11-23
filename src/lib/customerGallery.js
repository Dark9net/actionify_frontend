import { api } from './auth.js';

/*
  The client's gallery: the event a gallery code opened and its photographs and videos, from
  /api/v1/customer-gallery (backend/src/routes/customer-gallery.js). The browser's gallery session (an
  HttpOnly cookie set when the code was opened, lib/gallery.js) decides which event: nothing here names
  one, so a code shows its own event and no other.

  The links to the files are signed and last a while (linksUntil); the dashboard asks again before then.
*/

/** { event, albums, totals, cover, gallery: { code, label, expiresAt, link, qr }, visit, linksUntil } */
export const galleryDetails = () => api('/customer-gallery', { auth: false });

/** One page: { items, nextCursor, linksUntil } */
export const galleryItems = (cursor = null) =>
  api(`/customer-gallery/items${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { auth: false });

/**
 * Every photograph and video, a page at a time: `onPage(itemsSoFar)` after each one, so the grid fills
 * as they come. Resolves with { items, linksUntil } (the earliest of the pages' link ends).
 */
export async function allGalleryItems({ onPage, signal } = {}) {
  let items = [];
  let cursor = null;
  let linksUntil = null;
  do {
    const page = await galleryItems(cursor);
    if (signal?.aborted) throw new DOMException('Stopped', 'AbortError');
    items = items.concat(page.items);
    cursor = page.nextCursor;
    if (!linksUntil || Date.parse(page.linksUntil) < Date.parse(linksUntil)) linksUntil = page.linksUntil;
    onPage?.(items);
  } while (cursor);
  return { items, linksUntil };
}
