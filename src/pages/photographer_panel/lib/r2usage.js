/*
  What Cloudflare R2 holds and has served this billing month, against what the plan includes, from
  GET /api/v1/storage/usage (backend/src/routes/R2storage.js). Shared: the sidebar's meter and the
  Storage page read the same answer.

  Asked when first used, every five minutes while the tab is visible, when the tab comes back, and
  soon after uploads finish. The API keeps Cloudflare's answer for a few minutes too, so this is
  cheap; refreshR2Usage(true) asks Cloudflare again (the API allows that once a minute).

  { status: idle | loading | ready | error | off, usage, error }
    usage.storage   { used, included, remaining, over, objects, … }
    usage.classA/B  { used, included, remaining, over } or null without a Cloudflare API token
*/
import { useSyncExternalStore } from 'react';
import { api } from '../../../lib/auth.js';
import { onArrived } from './media.js';

const EVERY_MS = 5 * 60_000;

let store = { status: 'idle', usage: null, error: '' };
const listeners = new Set();
let asking = null;
let timer = null;

function set(next) {
  store = { ...store, ...next };
  listeners.forEach((l) => l());
}

function schedule() {
  clearTimeout(timer);
  if (listeners.size && document.visibilityState === 'visible') timer = setTimeout(() => refreshR2Usage(), EVERY_MS);
}

/** Asks the API again (one request at a time). `fresh` asks Cloudflare instead of the API's kept answer. */
export function refreshR2Usage(fresh = false) {
  if (asking) return asking;
  if (store.status === 'idle' || store.status === 'error') set({ status: 'loading', error: '' });
  asking = api(`/storage/usage${fresh ? '?refresh=1' : ''}`)
    .then((d) => set({ status: 'ready', usage: d.usage, error: '' }))
    .catch((e) => {
      if (e.code === 'R2_DISABLED') set({ status: 'off', usage: null, error: e.message });
      // a failed ask keeps the last numbers on screen
      else set({ status: store.usage ? 'ready' : 'error', error: e.message || 'R2 usage could not be loaded.' });
    })
    .finally(() => {
      asking = null;
      schedule();
    });
  return asking;
}

// After uploads, the size changes: ask once things settle (R2's analytics trail a few minutes).
let soon = null;
let stopArrivals = null;

function onVisible() {
  if (document.visibilityState !== 'visible') return clearTimeout(timer);
  refreshR2Usage();
}

const subscribe = (l) => {
  listeners.add(l);
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', onVisible);
    stopArrivals = onArrived(() => {
      clearTimeout(soon);
      soon = setTimeout(() => refreshR2Usage(true), 20_000);
    });
    if (store.status === 'idle') refreshR2Usage();
    else schedule();
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size) {
      document.removeEventListener('visibilitychange', onVisible);
      stopArrivals?.();
      clearTimeout(timer);
      clearTimeout(soon);
    }
  };
};

const idle = { status: 'idle', usage: null, error: '' };
const nothing = () => () => {};

/** The shared usage; with `enabled` false (a role without storage.view) nothing is asked. */
export const useR2Usage = (enabled = true) => useSyncExternalStore(enabled ? subscribe : nothing, () => (enabled ? store : idle));

/** 12,345 → "12.3K", 1,000,000 → "1M" (en-US: en-GB writes "12.3k", "1m") */
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
export const compact = (n) => COMPACT.format(n);
