/*
  A large file (over 64 MB) goes up to R2 in parts, so a dropped connection costs one part, not the file.

  The API cuts the file (POST /events/:id/media answers with parts: { size, count }): every part is
  `size` bytes (16 MB or more) but the last. Here they go four at a time, each PUT to its own signed
  link, asked for 50 at a time just before they're needed (a link lasts an hour). R2 keeps every part
  it receives until the file is completed, so:

    - a part that fails is sent again by itself, after 1, 2, 4, 8, 15 and 30 s, while the other parts
      keep going; the parts already on R2 are never sent again;
    - while the browser is offline nothing is tried: the parts wait for the connection to come back,
      and that wait doesn't use up their tries;
    - a part that still can't go stops the file: the parts in flight finish (they stay on R2), no new
      ones start. Retry (or the queue's own retry, lib/uploads.js) then sends only what is missing;
    - the same file added again after the tab was closed finds its unfinished upload (the API matches
      it by name, size, date and category), asks which parts R2 already has, and sends only the rest.

  `done` (a Set of part numbers) is filled in as parts land, so the caller keeps track across tries.
*/
import { fromApi, putFile, UploadError } from './r2.js';
import { signParts } from './media.js';

const PARALLEL = 4;
const SIGN_BATCH = 50;
const LINK_FRESH_MS = 45 * 60_000; // signed for an hour: asked for again a while before that
const BACKOFF = [1000, 2000, 4000, 8000, 15000, 30000];

const abortError = () => new DOMException('The upload was stopped.', 'AbortError');

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const stop = () => {
      clearTimeout(t);
      reject(abortError());
    };
    const t = setTimeout(() => {
      signal.removeEventListener('abort', stop);
      resolve();
    }, ms);
    signal.addEventListener('abort', stop, { once: true });
  });
}

/** Resolves once the browser is online (at once when it is). */
function online(signal) {
  if (navigator.onLine) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = () => {
      window.removeEventListener('online', on);
      signal.removeEventListener('abort', stop);
    };
    const on = () => {
      done();
      resolve();
    };
    const stop = () => {
      done();
      reject(abortError());
    };
    window.addEventListener('online', on);
    signal.addEventListener('abort', stop, { once: true });
  });
}

/** Bytes in part n of a file cut into `count` parts of `size` (the last is the rest). */
export const partBytes = (fileSize, size, count, n) => (n < count ? size : fileSize - size * (count - 1));

/**
 * Sends every part not in `done`. onProgress(bytes on R2 + bytes in flight); onWaiting(true | false)
 * while it waits for the connection. Resolves when all are on R2; rejects UploadError or AbortError.
 */
export async function sendParts({ eventId, mediaId, file, partSize, partCount, done, signal, onProgress = () => {}, onWaiting = () => {} }) {
  const bytesOf = (n) => partBytes(file.size, partSize, partCount, n);
  const queue = [];
  for (let n = 1; n <= partCount; n++) if (!done.has(n)) queue.push(n);
  const links = new Map(); // n → { url, at }
  const inFlight = new Map(); // n → bytes of it sent so far
  let onR2 = 0;
  for (const n of done) onR2 += bytesOf(n);
  let failure = null;
  let signing = null;

  const report = () => {
    let b = onR2;
    // offline, the bytes still in flight may never land: only what R2 has counts
    if (navigator.onLine) for (const v of inFlight.values()) b += v;
    onProgress(Math.min(b, file.size));
  };
  report();

  // the link for part n, asked for together with the next parts that will need one
  const fresh = (m) => {
    const l = links.get(m);
    return l && Date.now() - l.at < LINK_FRESH_MS ? l.url : null;
  };
  async function linkFor(n) {
    for (;;) {
      if (fresh(n)) return fresh(n);
      if (signing) {
        // another part is already asking: its batch may hold this one
        await signing.catch(() => {});
        continue;
      }
      const want = [n, ...queue.filter((m) => !fresh(m))].slice(0, SIGN_BATCH);
      signing = signParts(eventId, mediaId, want).then((list) => {
        const at = Date.now();
        for (const p of list) links.set(p.number, { url: p.url, at });
      });
      try {
        await signing;
      } finally {
        signing = null;
      }
    }
  }

  async function sendOne(n) {
    const from = (n - 1) * partSize;
    const body = file.slice(from, from + bytesOf(n));
    for (let tries = 0; ; ) {
      if (!navigator.onLine) {
        onWaiting(true);
        await online(signal);
        onWaiting(false);
      }
      try {
        const url = await linkFor(n);
        inFlight.set(n, 0);
        await putFile({
          url,
          body,
          signal,
          onProgress(loaded) {
            inFlight.set(n, loaded);
            report();
          },
        });
        inFlight.delete(n);
        done.add(n);
        onR2 += body.size;
        report();
        return;
      } catch (e) {
        inFlight.delete(n);
        report();
        if (e.name === 'AbortError') throw e;
        const err = fromApi(e);
        if (err.status === 403) links.delete(n); // its link ran out: a new one next time
        // refused for good, or R2 has the whole file already (the next try only completes it)
        if (err.retry === false || err.code === 'ALREADY_UPLOADED') throw err;
        if (!navigator.onLine) continue; // the connection went: wait for it, without using a try
        if (tries >= BACKOFF.length) {
          throw new UploadError(`Part ${n} of ${partCount} couldn't be sent (${err.message.replace(/\.$/, '')}).`);
        }
        await sleep(BACKOFF[tries++], signal);
      }
    }
  }

  const worker = async () => {
    while (queue.length && !failure) {
      const n = queue.shift();
      try {
        await sendOne(n);
      } catch (e) {
        failure ??= e;
      }
    }
  };
  // the row says so the moment the browser goes offline (parts in flight may take a while to fail)
  const wentOffline = () => {
    onWaiting(true);
    report();
  };
  const cameBack = () => {
    onWaiting(false);
    report();
  };
  window.addEventListener('offline', wentOffline);
  window.addEventListener('online', cameBack);
  if (!navigator.onLine) onWaiting(true);
  try {
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
  } finally {
    window.removeEventListener('offline', wentOffline);
    window.removeEventListener('online', cameBack);
    onWaiting(false);
  }
  if (failure) throw failure;
}
