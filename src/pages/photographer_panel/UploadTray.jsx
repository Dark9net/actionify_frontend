import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from './icons.jsx';
import { Bar, IconBtn } from './ui.jsx';
import { cancel, cancelAll, clearAll, clearFinished, dismiss, retry, retryFailed, useUploads } from './lib/uploads.js';
import { formatBytes, plural } from './lib/format.js';

const ORDER = { failed: 0, retrying: 1, uploading: 2, queued: 3, done: 4, cancelled: 5 };
const SHOWN = 80;

/* how long the rest should take: "about 2 min left" */
function eta(left, speed) {
  if (!speed || left <= 0) return '';
  const s = left / speed;
  if (s < 50) return 'under a minute left';
  if (s < 3600) return `about ${Math.round(s / 60)} min left`;
  return `about ${(s / 3600).toFixed(1)} h left`;
}

export function summary(u) {
  const total = u.items.length - u.cancelled;
  if (u.active) {
    const finished = u.done + u.failed;
    return {
      title: `Uploading ${Math.min(finished + 1, total)} of ${total}`,
      note: [`${formatBytes(u.sent)} of ${formatBytes(u.bytes)}`, u.speed ? `${formatBytes(u.speed)}/s` : '', eta(u.bytes - u.sent, u.speed)].filter(Boolean).join(' · '),
    };
  }
  if (u.failed) return { title: `${plural(u.failed, 'upload')} failed`, note: `${plural(u.done, 'file')} reached R2. Retry sends the rest again.` };
  if (u.done) return { title: `${plural(u.done, 'file')} uploaded`, note: `${formatBytes(u.bytes)} on R2` };
  return { title: 'Uploads stopped', note: 'Nothing was sent.' };
}

/*
  The upload status, bottom right on every page of the panel while photos go up and after: overall
  progress, speed and time left, then a row for each photo with its own progress, Stop and Retry.
*/
export default function UploadTray() {
  const u = useUploads();
  const { pathname } = useLocation();
  // inside an event its own list shows the rows, so the tray starts folded there
  const inEvent = /^\/photographer\/uploads\/[^/]+/.test(pathname);
  const [openAway, setOpenAway] = useState(true);
  const [openHere, setOpenHere] = useState(false);
  const open = inEvent ? openHere : openAway;
  const setOpen = inEvent ? setOpenHere : setOpenAway;
  const has = u.items.length > 0;

  // a new batch opens the tray again
  const [lastCount, setLastCount] = useState(0);
  useEffect(() => {
    if (u.items.length > lastCount) setOpenAway(true);
    setLastCount(u.items.length);
  }, [u.items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!has) return null;
  const s = summary(u);
  const progress = u.bytes ? u.sent / u.bytes : 0;
  const state = u.active ? 'busy' : u.failed ? 'bad' : 'ok';

  return (
    <section className={`pn-tray is-${state}${open ? ' is-open' : ''}`} aria-label="Uploads">
      <div className="pn-tray-head">
        <Ring value={u.active ? progress : 1} state={state} />
        <div className="pn-tray-sum" aria-live="polite">
          <p className="pn-tray-title">{s.title}</p>
          <p className="pn-tray-note">{s.note}</p>
        </div>
        <IconBtn icon={open ? 'chevronDown' : 'chevron'} className="pn-tray-toggle" label={open ? 'Hide the list' : 'Show the list'} aria-expanded={open} onClick={() => setOpen((o) => !o)} />
        {!u.active && <IconBtn icon="close" label="Close the upload list" onClick={clearAll} />}
      </div>
      {open && (
        <>
          <div className="pn-tray-acts">
            {u.failed > 0 && (
              <button type="button" className="pn-chip pn-chip--warn" onClick={() => retryFailed()}>
                <Icon name="retry" /> Retry {u.failed} failed
              </button>
            )}
            {u.active > 0 && (
              <button type="button" className="pn-chip" onClick={() => cancelAll()}>
                <Icon name="stop" /> Stop all
              </button>
            )}
            {u.done + u.cancelled > 0 && (
              <button type="button" className="pn-chip" onClick={clearFinished}>
                <Icon name="check" /> Clear finished
              </button>
            )}
          </div>
          <UploadRows items={u.items} />
        </>
      )}
    </section>
  );
}

export function UploadRows({ items, eventId, limit = SHOWN }) {
  const list = useMemo(
    () =>
      items
        .filter((it) => !eventId || it.eventId === eventId)
        .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.addedAt - b.addedAt),
    [items, eventId]
  );
  const shown = list.slice(0, limit);
  return (
    <ul className="pn-ups">
      {shown.map((it) => (
        <Row key={it.id} it={it} where={[eventId ? null : it.eventName, it.categoryName].filter(Boolean).join(' · ')} />
      ))}
      {list.length > shown.length && <li className="pn-ups-more">and {plural(list.length - shown.length, 'more file')}</li>}
    </ul>
  );
}

function Row({ it, where }) {
  const p = it.size ? it.loaded / it.size : 0;
  let status;
  if (it.status === 'uploading' && it.waiting) status = 'Waiting for connection';
  else if (it.status === 'uploading') status = `${Math.round(p * 100)}%`;
  else if (it.status === 'queued') status = 'Waiting';
  else if (it.status === 'retrying') status = <Countdown at={it.retryAt} />;
  else if (it.status === 'done') status = 'Uploaded';
  else if (it.status === 'cancelled') status = 'Stopped';
  else status = 'Failed';
  return (
    <li className={`pn-up is-${it.status}`}>
      <span className="pn-up-ico" aria-hidden="true">
        <Icon
          name={
            it.status === 'done'
              ? 'check'
              : it.blocked
                ? 'shield'
                : it.status === 'failed'
                  ? 'alert'
                  : it.status === 'retrying'
                    ? 'retry'
                    : it.status === 'cancelled'
                      ? 'stop'
                      : { video: 'video', audio: 'audio', graphic: 'graphic', model: 'model' }[it.kind] || 'image'
          }
        />
      </span>
      <div className="pn-up-main">
        <div className="pn-up-line">
          <span className="pn-up-name" title={it.original}>
            {it.name}
          </span>
          <span className="pn-up-status">{status}</span>
        </div>
        {it.status === 'uploading' || it.status === 'queued' ? (
          <>
            <Bar value={it.status === 'queued' ? 0 : p} label={`${it.name}, uploaded`} />
            {it.partCount > 0 && it.status === 'uploading' && (
              <p className="pn-up-sub">
                {it.waiting
                  ? `Offline: ${it.partsDone} of ${it.partCount} parts are safe on R2, the rest go when it's back`
                  : `${it.resumed ? 'Carried on · ' : ''}${it.partsDone} of ${it.partCount} parts on R2 · ${formatBytes(it.loaded)} of ${formatBytes(it.size)}`}
              </p>
            )}
          </>
        ) : (
          <p className={`pn-up-sub${it.status === 'failed' || it.status === 'retrying' ? ' is-err' : ''}`}>
            {it.status === 'failed' || it.status === 'retrying' ? it.error : `${where} · ${formatBytes(it.size)}`}
          </p>
        )}
      </div>
      <span className="pn-up-acts">
        {(it.status === 'uploading' || it.status === 'queued' || it.status === 'retrying') && <IconBtn icon="close" label={`Stop ${it.name}`} onClick={() => cancel(it.id)} />}
        {(it.status === 'failed' || it.status === 'cancelled') && it.hasFile && <IconBtn icon="retry" label={`Retry ${it.name}`} onClick={() => retry(it.id)} />}
        {it.status === 'failed' && <IconBtn icon="trash" label={`Remove ${it.name} from the list`} onClick={() => dismiss(it.id)} />}
      </span>
    </li>
  );
}

function Countdown({ at }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.ceil((at - now) / 1000));
  return <>Retrying in {s} s</>;
}

function Ring({ value, state }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <span className={`pn-ring is-${state}`} aria-hidden="true">
      <svg className="pn-ring-svg" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} className="pn-ring-track" />
        <circle cx="20" cy="20" r={r} className="pn-ring-fill" style={{ strokeDasharray: c, strokeDashoffset: c * (1 - value) }} />
      </svg>
      <Icon name={state === 'busy' ? 'upload' : state === 'bad' ? 'alert' : 'check'} />
    </span>
  );
}
