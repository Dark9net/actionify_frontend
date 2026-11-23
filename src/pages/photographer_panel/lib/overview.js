/*
  The Overview page's figures, from GET /api/v1/overview (backend/src/routes/overview.js): what is on
  R2 (counted from the files the API saw arrive), the uploads of the last 14 days, the bookings and
  where each one stands, who is out on a job, and the clients. Parts the role can't see come as null.

  Asked when the page opens, every minute while the tab is visible, when the tab comes back, and soon
  after uploads finish. { status: idle | loading | ready | error, data, error }
*/
import { useSyncExternalStore } from 'react';
import { api } from '../../../lib/auth.js';
import { onArrived } from './media.js';

const EVERY_MS = 60_000;

let store = { status: 'idle', data: null, error: '' };
const listeners = new Set();
let asking = null;
let timer = null;

function set(next) {
  store = { ...store, ...next };
  listeners.forEach((l) => l());
}

function schedule() {
  clearTimeout(timer);
  if (listeners.size && document.visibilityState === 'visible') timer = setTimeout(() => refreshOverview(), EVERY_MS);
}

/** Asks the API again (one request at a time). */
export function refreshOverview() {
  if (asking) return asking;
  if (store.status === 'idle' || store.status === 'error') set({ status: 'loading', error: '' });
  // the browser's time zone, so "today" and the chart's days are the studio's own
  const offset = -new Date().getTimezoneOffset();
  asking = api(`/overview?offset=${offset}`)
    .then((d) => set({ status: 'ready', data: d.overview, error: '' }))
    // a failed ask keeps the last figures on screen
    .catch((e) => set({ status: store.data ? 'ready' : 'error', error: e.message || 'The overview could not be loaded.' }))
    .finally(() => {
      asking = null;
      schedule();
    });
  return asking;
}

let soon = null;
let stopArrivals = null;

function onVisible() {
  if (document.visibilityState !== 'visible') return clearTimeout(timer);
  refreshOverview();
}

const subscribe = (l) => {
  listeners.add(l);
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', onVisible);
    stopArrivals = onArrived(() => {
      clearTimeout(soon);
      soon = setTimeout(refreshOverview, 1500);
    });
    refreshOverview(); // fresh figures every time the page opens
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

export const useOverview = () => useSyncExternalStore(subscribe, () => store);
