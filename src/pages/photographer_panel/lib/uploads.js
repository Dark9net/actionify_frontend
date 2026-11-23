/*
  The upload queue. Photographs and videos go up three at a time, whichever page the panel is on, so a
  long batch keeps going while the photographer looks at bookings. Each one:

    queued → uploading → done
               1. its preview is made here (lib/r2.js)
               2. the API makes its record and its upload link (POST /events/:id/media)
               3. the file goes straight to R2, with progress; then its preview
               4. the API checks R2 has all of it, and it shows in the event (…/complete)
             ↘ retrying (a dropped connection: twice by itself, after 1.5 s and 4 s) → queued
             ↘ failed (with the reason, and Retry)       cancelled (Stop)

  A file over 64 MB goes up in parts instead (lib/parts.js): each part that fails is sent again on its
  own, and the file only stops when a part keeps failing. It then keeps its upload on R2 with every
  part already sent: the queue tries again by itself six times (5 s to 5 min apart), and Retry after
  that, each sending only the parts still missing. Added again after the tab was closed, the same file
  carries on where it stopped (the API finds its unfinished upload).

  A file sent whole that doesn't finish leaves nothing behind: its record and anything sent are removed
  (…/abort). Stop, and taking a failed file off the list, do the same for a file in parts.
  The server names the file in its folder (a name already used there gets -2, -3).
  A file whose bytes aren't what its name says is blocked (here first, then by the API on R2's copy):
  it fails with the reason and can't be retried.
  When every file of a batch has finished, a toast says how it went (and offers Retry for the ones that
  failed). Closing the tab while files are still going up asks first.
*/
import { useSyncExternalStore } from 'react';
import { fromApi, putFile, readMedia, UploadError } from './r2.js';
import { sendParts, partBytes } from './parts.js';
import { abortUpload, arrived, completeUpload, partsDone, startUploads } from './media.js';
import { checkFile, kindOf } from './files.js';
import { dismiss as dismissToast, toast } from './toast.js';
import { plural, uid } from './format.js';
import { getAccount } from './account.js';

const AT_ONCE = 3;
const AUTO_RETRIES = 2;
const BACKOFF = [1500, 4000];
// a file in parts has already retried each part for about a minute: it waits longer between tries
const PART_BACKOFF = [5000, 15000, 30000, 60000, 120000, 300000];

const items = new Map(); // id → item, in the order added
const batches = new Map();
const listeners = new Set();
let snapshot = makeSnapshot();
let queued = false;
let go = () => {};

/* the panel hands over its router, so a toast can open the event */
export const setNavigate = (fn) => {
  go = fn;
};

function makeSnapshot() {
  const list = [...items.values()].map((it) => ({
    ...it,
    file: undefined,
    ctrl: undefined,
    info: undefined,
    up: undefined,
    parts: undefined,
    hasFile: Boolean(it.file),
    partCount: it.up?.parts?.count ?? 0,
    partsDone: it.parts?.size ?? 0,
  }));
  const s = { items: list, queued: 0, uploading: 0, retrying: 0, done: 0, failed: 0, cancelled: 0, bytes: 0, sent: 0, speed: 0 };
  for (const it of list) {
    s[it.status] += 1;
    if (it.status === 'cancelled') continue;
    s.bytes += it.size;
    s.sent += it.status === 'done' ? it.size : it.loaded;
    if (it.status === 'uploading') s.speed += it.speed;
  }
  s.active = s.queued + s.uploading + s.retrying;
  return s;
}

function emit(now = false) {
  if (now) {
    queued = false;
    snapshot = makeSnapshot();
    listeners.forEach((l) => l());
    return;
  }
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    if (!queued) return;
    emit(true);
  });
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useUploads = () => useSyncExternalStore(subscribe, () => snapshot);
export const getUploads = () => snapshot;

/* ---- the queue ---- */

/*
  Queues [{ file, categoryId }] for a server event ({ id, name, categories }). label: what the toast
  calls the batch. Returns the batch's id.
*/
export function enqueue(event, entries, label) {
  if (!event || !entries.length) return null;
  const batchId = uid('bt');
  const ids = [];
  for (const { file, categoryId } of entries) {
    const cat = event.categories.find((c) => c.id === categoryId);
    const id = uid('up');
    items.set(id, {
      id,
      batchId,
      file,
      eventId: event.id,
      eventName: event.name,
      categoryId: cat ? cat.id : null,
      categoryName: cat ? cat.name : 'Uncategorised',
      kind: kindOf(file) || 'photo',
      name: file.name, // until the server names it in its folder
      original: file.name,
      key: '',
      mediaId: null,
      size: file.size,
      type: file.type,
      status: 'queued',
      loaded: 0,
      speed: 0,
      attempts: 0,
      error: '',
      addedAt: Date.now(),
    });
    ids.push(id);
  }
  batches.set(batchId, { id: batchId, eventId: event.id, label: label || event.name, ids, announced: false });
  watchUnload();
  emit(true);
  pump();
  return batchId;
}

function pump() {
  let running = 0;
  for (const it of items.values()) if (it.status === 'uploading') running++;
  for (const it of items.values()) {
    if (running >= AT_ONCE) break;
    if (it.status === 'queued') {
      running++;
      start(it);
    }
  }
}

const abortError = () => new DOMException('The upload was stopped.', 'AbortError');

async function start(it) {
  it.status = 'uploading';
  if (!it.up) it.loaded = 0; // a file in parts keeps what is already on R2
  it.speed = 0;
  it.error = '';
  it.attempts += 1;
  it.startedAt = performance.now();
  it.waiting = false;
  const ctrl = new AbortController();
  it.ctrl = ctrl;
  let lastT = it.startedAt;
  let lastB = null;
  const onProgress = (loaded) => {
    const t = performance.now();
    const dt = (t - lastT) / 1000;
    if (lastB === null || it.waiting) {
      // a file carried on starts where it stopped, and nothing moves while it waits: neither is speed
      if (it.waiting) it.speed = 0;
      lastB = loaded;
      lastT = t;
    } else if (dt > 0.05) {
      const v = Math.max(0, loaded - lastB) / dt;
      it.speed = it.speed ? it.speed * 0.7 + v * 0.3 : v;
      lastT = t;
      lastB = loaded;
    }
    it.loaded = loaded;
    emit();
  };
  emit();
  try {
    // 0. its bytes are what its name says (lib/filecheck.js); the API checks R2's copy again
    if (!it.checked) {
      const problem = await checkFile(it.file);
      if (problem) throw new UploadError(`Blocked: ${problem}.`, { retry: false, code: 'FILE_BLOCKED' });
      it.checked = true;
    }
    // 1. the preview, its pixels and length (kept for a retry)
    it.info ??= await readMedia(it.file, it.kind);
    if (ctrl.signal.aborted) throw abortError();

    // 2. the record and the links (a file in parts keeps its upload on R2 from one try to the next)
    let up = it.up;
    if (!up) {
      [up] = await startUploads(it.eventId, [
        { name: it.original, size: it.size, categoryId: it.categoryId, lastModified: it.file.lastModified, previewSize: it.info.blob?.size ?? null },
      ]).catch((e) => {
        throw fromApi(e);
      });
      it.mediaId = up.id;
      it.name = up.name;
      it.key = up.key;
      if (up.parts) {
        it.up = up;
        it.parts = up.resumed ? null : new Set(); // carried on: R2 is asked which parts it has
        it.resumed = up.resumed;
      }
    }
    if (ctrl.signal.aborted) throw abortError();
    emit();

    // 3. the file (whole, or the parts R2 doesn't have yet), then its preview (a preview that fails only means none is shown)
    if (up.parts) await sendMissing(it, up, ctrl.signal, onProgress);
    else await putFile({ url: up.url, body: it.file, contentType: up.contentType, signal: ctrl.signal, onProgress });
    if (up.previewUrl && it.info.blob && !it.previewSent) {
      await putFile({ url: up.previewUrl, body: it.info.blob, contentType: 'image/jpeg', signal: ctrl.signal }).then(
        () => {
          it.previewSent = Boolean(up.parts); // a file in parts doesn't send it again on the next try
        },
        (e) => {
          if (e.name === 'AbortError') throw e;
        }
      );
    }

    // 4. R2 has it (in parts: R2 joins them; a part it says it lacks is sent again first): it shows in the event
    const meta = { width: it.info.w, height: it.info.h, durationMs: it.info.durationMs };
    let media;
    for (let round = 0; ; round++) {
      try {
        media = await completeUpload(it.eventId, up.id, meta);
        break;
      } catch (e) {
        const err = fromApi(e);
        if (!up.parts || err.code !== 'UPLOAD_INCOMPLETE' || !err.missing?.length || round >= 2) throw err;
        err.missing.forEach((n) => it.parts.delete(n));
        await sendMissing(it, up, ctrl.signal, onProgress);
      }
    }
    it.status = 'done';
    it.loaded = it.size;
    it.file = null; // nothing more to send: let the browser free it
    it.info = null;
    it.mediaId = null;
    it.up = null;
    it.parts = null;
    arrived(media);
  } catch (e) {
    const inParts = Boolean(it.up);
    const keep = inParts && e.name !== 'AbortError' && e.code !== 'FILE_BLOCKED' && e.status !== 404;
    if (keep) {
      // the parts on R2 stay for the next try; R2 is asked again when it lost them, or already joined them
      if (e.code === 'UPLOAD_MISSING' || e.code === 'ALREADY_UPLOADED') it.parts = null;
    } else {
      // whatever part of it was sent goes, so the event never shows half a file
      if (it.mediaId) abortUpload(it.eventId, it.mediaId).catch(() => {});
      it.mediaId = null;
      it.up = null;
      it.parts = null;
      it.previewSent = false;
    }
    it.waiting = false;
    const tries = inParts ? PART_BACKOFF : BACKOFF;
    if (e.name === 'AbortError') {
      it.status = 'cancelled';
    } else if (e.code === 'FILE_BLOCKED') {
      // not what its name says: it never goes, and Retry isn't offered
      it.status = 'failed';
      it.blocked = true;
      it.error = e.message;
      it.file = null;
      it.info = null;
    } else if (e.retry !== false && it.attempts <= (inParts ? PART_BACKOFF.length : AUTO_RETRIES)) {
      it.status = 'retrying';
      it.error = keep ? `${e.message} ${partsNote(it)}` : e.message;
      it.retryAt = Date.now() + tries[it.attempts - 1];
      setTimeout(() => {
        if (it.status !== 'retrying') return;
        it.status = 'queued';
        emit();
        pump();
      }, tries[it.attempts - 1]);
    } else {
      it.status = 'failed';
      it.error = `${e.message || 'The upload failed.'}${keep ? ` ${partsNote(it)}` : ''}`;
    }
  }
  it.speed = 0;
  it.ctrl = null;
  emit();
  settle(it.batchId);
  pump();
}

/* "41 of 64 parts are on R2: only the rest go again." */
function partsNote(it) {
  if (!it.parts || !it.up) return 'The parts already on R2 stay there.';
  return `${it.parts.size} of ${it.up.parts.count} parts are on R2: only the rest go again.`;
}

/* the parts of a file R2 doesn't have yet (asking it first when that isn't known here) */
async function sendMissing(it, up, signal, onProgress) {
  if (!it.parts) {
    const st = await partsDone(it.eventId, up.id).catch((e) => {
      throw fromApi(e);
    });
    it.parts = new Set(st.done);
    it.loaded = [...it.parts].reduce((b, n) => b + partBytes(it.size, up.parts.size, up.parts.count, n), 0);
    emit();
  }
  if (signal.aborted) throw abortError();
  await sendParts({
    eventId: it.eventId,
    mediaId: up.id,
    file: it.file,
    partSize: up.parts.size,
    partCount: up.parts.count,
    done: it.parts,
    signal,
    onProgress,
    onWaiting(w) {
      if (it.waiting === w) return;
      it.waiting = w;
      if (w) it.speed = 0; // nothing is moving while it waits
      emit();
    },
  });
}

/* a file in parts taken off the list: its upload on R2 goes too */
function forget(it) {
  if (it.up && it.mediaId) abortUpload(it.eventId, it.mediaId).catch(() => {});
  it.up = null;
  it.parts = null;
  it.mediaId = null;
}

function settle(batchId) {
  const b = batches.get(batchId);
  if (!b || b.announced) return;
  const list = b.ids.map((id) => items.get(id)).filter(Boolean);
  if (list.some((it) => it.status === 'queued' || it.status === 'uploading' || it.status === 'retrying')) return;
  b.announced = true;
  const done = list.filter((it) => it.status === 'done').length;
  const failed = list.filter((it) => it.status === 'failed').length;
  const open = { label: 'Open event', run: () => go(`/photographer/uploads/${b.eventId}`) };
  if (failed) {
    b.toastId = toast({
      tone: 'error',
      title: `${plural(failed, 'upload')} failed`,
      text: `${done ? `${plural(done, 'file')} reached R2. ` : ''}${b.label}: the rest can go again.`,
      action: { label: 'Retry', run: () => retryBatch(batchId) },
    });
  } else if (done && getAccount().prefs.doneToasts) {
    // failures always speak up; a finished batch only when Settings says so
    toast({ tone: 'success', title: `${plural(done, 'file')} uploaded`, text: `${b.label}, on R2 and in the event.`, action: open });
  }
  if (![...items.values()].some((it) => it.status === 'queued' || it.status === 'uploading' || it.status === 'retrying')) unwatchUnload();
}

/* ---- the controls ---- */
export function retry(id) {
  const it = items.get(id);
  if (!it || !it.file || (it.status !== 'failed' && it.status !== 'cancelled' && it.status !== 'retrying')) return;
  it.status = 'queued';
  it.attempts = 0;
  it.error = '';
  const b = batches.get(it.batchId);
  if (b) {
    b.announced = false;
    // the "failed" note is out of date once they go again
    if (b.toastId) dismissToast(b.toastId);
    b.toastId = null;
  }
  watchUnload();
  emit(true);
  pump();
}

export function retryBatch(batchId) {
  const b = batches.get(batchId);
  b?.ids.forEach((id) => {
    const it = items.get(id);
    if (it?.status === 'failed') retry(id);
  });
}

export function retryFailed(eventId) {
  for (const it of items.values()) if (it.status === 'failed' && (!eventId || it.eventId === eventId)) retry(it.id);
}

export function cancel(id) {
  const it = items.get(id);
  if (!it) return;
  if (it.status === 'uploading') it.ctrl?.abort();
  else if (it.status === 'queued' || it.status === 'retrying') {
    it.status = 'cancelled';
    forget(it);
    emit(true);
    settle(it.batchId);
  }
}

export function cancelAll(eventId) {
  for (const it of items.values()) {
    if (eventId && it.eventId !== eventId) continue;
    if (it.status === 'queued' || it.status === 'retrying') {
      it.status = 'cancelled';
      forget(it);
    }
  }
  for (const it of items.values()) if (it.status === 'uploading' && (!eventId || it.eventId === eventId)) it.ctrl?.abort();
  emit(true);
  batches.forEach((b) => settle(b.id));
}

/* takes the finished ones (done and cancelled) off the list; failed ones stay until retried or dismissed */
export function clearFinished() {
  for (const [id, it] of items) if (it.status === 'done' || it.status === 'cancelled') items.delete(id);
  emit(true);
}

/* empties the list of everything not still going up (the tray's close button) */
export function clearAll() {
  for (const [id, it] of items) {
    if (it.status !== 'done' && it.status !== 'cancelled' && it.status !== 'failed') continue;
    forget(it);
    items.delete(id);
  }
  emit(true);
}

export function dismiss(id) {
  const it = items.get(id);
  if (it && (it.status === 'failed' || it.status === 'cancelled' || it.status === 'done')) {
    forget(it);
    items.delete(id);
    emit(true);
  }
}

/* ---- closing the tab mid-upload ---- */
function guard(e) {
  e.preventDefault();
  e.returnValue = '';
}
let watching = false;
function watchUnload() {
  if (watching) return;
  watching = true;
  window.addEventListener('beforeunload', guard);
}
function unwatchUnload() {
  watching = false;
  window.removeEventListener('beforeunload', guard);
}
