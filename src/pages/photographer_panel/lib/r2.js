/*
  Sending a file from this browser to the studio's Cloudflare R2 bucket.

  The browser never holds the bucket's keys. The API (POST /api/v1/events/:id/media) hands out one
  link per file, signed for that file only: its key inside the event's folder, its exact size and
  its type. The file goes to that link with a PUT, and the progress is reported as it goes. A file
  over 64 MB goes up in parts instead, each PUT the same way to its own link (lib/parts.js).
  The bucket needs a CORS rule allowing PUT (and GET) from the panel's address.

  Before a file goes, a small JPEG preview of it is made here (a photo scaled down, or a frame of a
  video), so the event can show it without downloading the original.
*/
import { AuthError, NotConnected } from '../../../lib/auth.js';
import { makeThumb } from './thumbs.js';

export class UploadError extends Error {
  constructor(message, { retry = true, status = 0, code } = {}) {
    super(message);
    this.retry = retry; // worth trying again by itself (network trouble, a 5xx)
    this.status = status;
    this.code = code; // FILE_BLOCKED: refused for what it is
  }
}

const abortError = () => new DOMException('The upload was stopped.', 'AbortError');

/** The API's refusals as upload errors: worth retrying by itself only when it may pass next time. */
export function fromApi(e) {
  if (e instanceof NotConnected) return new UploadError('The studio API cannot be reached. Check the connection.');
  if (e instanceof AuthError) {
    const again = e.status === 409 || e.status === 429 || e.status >= 500;
    return Object.assign(new UploadError(e.message, { retry: again, status: e.status, code: e.code }), { missing: e.missing });
  }
  return e;
}

// nothing sent for this long: the connection is gone even if the browser hasn't noticed
const STALL_MS = 60_000;

/**
 * PUTs `body` to a signed link (with `contentType`, when the link was signed for one).
 * onProgress(loaded, total). Rejects UploadError or AbortError.
 */
export function putFile({ url, body, contentType, signal, onProgress = () => {} }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);
    let last = Date.now();
    let stalled = false;
    const watch = setInterval(() => {
      if (Date.now() - last < STALL_MS) return;
      stalled = true;
      xhr.abort();
    }, 5000);
    const onAbort = () => xhr.abort();
    xhr.onloadend = () => {
      clearInterval(watch);
      signal?.removeEventListener('abort', onAbort);
    };
    xhr.upload.onprogress = (e) => {
      last = Date.now();
      onProgress(e.loaded, e.lengthComputable ? e.total : body.size);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(body.size, body.size);
        resolve();
      } else if (xhr.status === 403) {
        // the link ran out, or the file changed since it was picked
        reject(new UploadError('R2 refused the file: its upload link ran out or the file changed. Try again.', { retry: true, status: 403 }));
      } else {
        reject(new UploadError(`R2 refused the file (${xhr.status}).`, { retry: xhr.status >= 500 || xhr.status === 429, status: xhr.status }));
      }
    };
    // a CORS refusal looks the same as a dropped connection from here
    xhr.onerror = () => reject(new UploadError('The connection to R2 dropped during the upload.'));
    xhr.ontimeout = () => reject(new UploadError('The upload timed out.'));
    xhr.onabort = () => reject(stalled ? new UploadError('The connection to R2 stalled.') : abortError());
    if (signal) {
      if (signal.aborted) {
        clearInterval(watch);
        return reject(abortError());
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
    xhr.send(body);
  });
}

const PREVIEW_SIZE = 800; // px on the long side: sharp in the large grid, small enough to load fast
const MAX_PREVIEW_BYTES = 2 * 1024 * 1024;

/** A frame from about a second in, and the video's size and length. Null when the browser can't play it. */
function videoPreview(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let done = false;
    const finish = (out) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      v.removeAttribute('src');
      v.load();
      URL.revokeObjectURL(url);
      resolve(out);
    };
    const timer = setTimeout(() => finish(null), 8000);
    v.muted = true;
    v.preload = 'metadata';
    v.playsInline = true;
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(1, (v.duration || 0) / 3);
    };
    v.onseeked = () => {
      const w = v.videoWidth;
      const h = v.videoHeight;
      const durationMs = Number.isFinite(v.duration) ? Math.round(v.duration * 1000) : null;
      if (!w || !h) return finish({ blob: null, w: null, h: null, durationMs });
      const k = Math.min(1, PREVIEW_SIZE / Math.max(w, h));
      const c = document.createElement('canvas');
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((blob) => finish({ blob, w, h, durationMs }), 'image/jpeg', 0.78);
    };
    v.onerror = () => finish(null);
    v.src = url;
  });
}

/** An audio file's length, from its metadata. Null when the browser can't read it. */
function audioLength(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('audio');
    let done = false;
    const finish = (ms) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      a.removeAttribute('src');
      a.load();
      URL.revokeObjectURL(url);
      resolve(ms);
    };
    const timer = setTimeout(() => finish(null), 8000);
    a.preload = 'metadata';
    a.onloadedmetadata = () => finish(Number.isFinite(a.duration) ? Math.round(a.duration * 1000) : null);
    a.onerror = () => finish(null);
    a.src = url;
  });
}

const NOTHING = { blob: null, w: null, h: null, durationMs: null };

/**
 * What can be read from the file before it goes: { blob (the preview JPEG, or null), w, h, durationMs }.
 * Photos and SVG drawings get a preview, videos a frame, audio its length. HEIC, TIFF, RAW, design
 * files and 3D models go up without a preview.
 */
export async function readMedia(file, kind) {
  if (kind === 'video') {
    const out = await videoPreview(file);
    return out && out.blob && out.blob.size > MAX_PREVIEW_BYTES ? { ...out, blob: null } : out || NOTHING;
  }
  if (kind === 'audio') return { ...NOTHING, durationMs: await audioLength(file) };
  if (kind === 'model' || (kind === 'graphic' && !/\.svg$/i.test(file.name))) return NOTHING;
  const thumb = await makeThumb(file, PREVIEW_SIZE);
  if (!thumb || thumb.blob.size > MAX_PREVIEW_BYTES) return { blob: null, w: thumb?.w ?? null, h: thumb?.h ?? null, durationMs: null };
  return { blob: thumb.blob, w: thumb.w, h: thumb.h, durationMs: null };
}
