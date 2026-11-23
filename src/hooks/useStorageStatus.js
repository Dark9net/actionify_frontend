import { useEffect, useState } from 'react';
import { API } from '../lib/auth.js';

/*
  Whether the photo storage (Cloudflare R2) answers, from the API's GET /api/v1/health
  (backend/src/app.js, `storage`). Asked when the header mounts, every minute while the tab is
  visible, and again when the visitor comes back to the tab. The API keeps its answer for 30 s,
  so this costs R2 at most one request per half minute.

  status:
    checking   the first answer hasn't come yet
    up         the bucket answered
    down       R2 is set up but didn't answer (wrong key, missing bucket, network)
    disabled   no R2 keys in backend/.env yet
    offline    the API itself can't be reached
*/
const EVERY_MS = 60_000;

async function askHealth() {
  try {
    const res = await fetch(`${API}/health`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    // 503 still carries the JSON: the API answers "degraded" when a part is down
    const data = await res.json();
    return ['up', 'down', 'disabled'].includes(data?.storage) ? data.storage : 'offline';
  } catch {
    return 'offline';
  }
}

export default function useStorageStatus(enabled = true) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    let timer = null;

    async function check() {
      clearTimeout(timer);
      const next = await askHealth();
      if (!live) return;
      setStatus(next);
      if (document.visibilityState === 'visible') timer = setTimeout(check, EVERY_MS);
    }
    function onVisible() {
      if (document.visibilityState === 'visible') check();
      else clearTimeout(timer);
    }

    check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  return enabled ? status : null;
}
