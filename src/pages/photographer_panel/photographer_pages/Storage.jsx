import { useState } from 'react';
import Icon from '../icons.jsx';
import { Badge, Bar, Btn, PageHead, Pane, Stat } from '../ui.jsx';
import { StorageBars } from './Overview.jsx';
import { refreshEvents, useEvents } from '../lib/media.js';
import { compact, refreshR2Usage, useR2Usage } from '../lib/r2usage.js';
import { API, can, useSession } from '../../../lib/auth.js';
import useStorageStatus from '../../../hooks/useStorageStatus.js';
import { useUploads } from '../lib/uploads.js';
import { toast } from '../lib/toast.js';
import { ago, date, formatBytes, num, plural } from '../lib/format.js';

const DAY = 864e5;
const toneOf = (ratio) => (ratio >= 1 ? 'is-over' : ratio >= 0.8 ? 'is-high' : '');
const pct = (ratio) => (ratio > 0 && ratio < 0.001 ? '< 0.1%' : `${(Math.round(ratio * 1000) / 10).toLocaleString('en-GB')}%`);

/*
  Storage: what the studio's Cloudflare R2 holds and has served this billing month against what the
  plan includes (GET /api/v1/storage/usage, backend/src/services/R2storage.js): storage used and left,
  Class A operations (writes: uploads, listings) and Class B (reads: viewing, downloads) used and left.
  Then the connection, how files are named, and storage by event.
*/
export default function Storage() {
  const { events } = useEvents();
  const u = useUploads();
  const session = useSession();
  const storage = useStorageStatus();
  const live = storage === 'up';
  const sees = can(session.user, 'storage.view');
  const r2 = useR2Usage(sees);
  const [testing, setTesting] = useState(false);
  const [asking, setAsking] = useState(false);
  const bytes = events.reduce((a, e) => a + e.stats.bytes, 0);
  const files = events.reduce((a, e) => a + e.stats.files, 0);
  const photos = events.reduce((a, e) => a + e.stats.photos, 0);
  const videos = events.reduce((a, e) => a + e.stats.videos, 0);
  const others = events.reduce((a, e) => a + (e.stats.audio || 0) + (e.stats.graphics || 0) + (e.stats.models || 0), 0);

  // asks the API (GET /health), which asks R2 whether the bucket answers
  async function test() {
    setTesting(true);
    try {
      const res = await fetch(`${API}/health`, { cache: 'no-store' });
      const d = await res.json();
      if (d.storage === 'up') toast({ tone: 'success', title: 'R2 is reachable', text: 'The bucket answered. Uploads go straight to it.' });
      else if (d.storage === 'disabled') toast({ tone: 'info', title: 'R2 is off', text: 'Add the R2 keys to backend/.env and restart the API.' });
      else toast({ tone: 'error', title: 'R2 did not answer', text: 'Check the R2 keys and bucket in backend/.env, then the API log.' });
    } catch {
      toast({ tone: 'error', title: 'The API cannot be reached', text: 'Start the API, then check again.' });
    } finally {
      setTesting(false);
      refreshEvents();
      refreshR2Usage(true);
    }
  }

  async function askAgain() {
    setAsking(true);
    await refreshR2Usage(true);
    setAsking(false);
  }

  return (
    <>
      <PageHead
        kicker="Settings"
        title="Storage"
        text="Where the photographs and videos live: the studio's Cloudflare R2 bucket, what it holds and has served this month against the plan, and one folder per event inside it."
      />

      <div className="pn-stats pn-stats--4">
        <Stat icon="cloud" label="In the studio's events" value={formatBytes(bytes)} note={plural(files, 'file')} />
        <Stat icon="folder" label="Event folders" value={events.length} note={`${num(events.reduce((a, e) => a + e.categories.length, 0))} categories`} />
        <Stat icon="image" label="Photos" value={num(photos)} note={`${plural(videos, 'video')}${others ? ` · ${num(others)} audio, graphics and 3D` : ''}`} />
        <Stat icon="upload" tone={u.active ? 'onsite' : 'rust'} label="Going up now" value={u.active} note={u.failed ? `${u.failed} failed, waiting for Retry` : 'In the upload tray'} />
      </div>

      {sees && <R2Usage r2={r2} asking={asking} onRefresh={askAgain} />}

      <div className="pn-grid pn-grid--1-1">
        <Pane title="Connection" aside={<Badge tone={live ? 'done' : 'warn'}>{live ? 'Connected' : storage === 'checking' ? 'Checking' : storage === 'disabled' ? 'Off' : 'Not answering'}</Badge>}>
          <dl className="pn-dl">
            <div>
              <dt>Bucket</dt>
              <dd>{r2.usage?.bucket ? `${r2.usage.bucket}, private` : 'Private, set in backend/.env (R2_BUCKET_NAME)'}</dd>
            </div>
            <div>
              <dt>Upload links</dt>
              <dd>Signed by the API for one file each: its event folder, size and type</dd>
            </div>
            <div>
              <dt>Viewing</dt>
              <dd>Through short-lived signed links, only from the file's own event</dd>
            </div>
            <div>
              <dt>Uploads</dt>
              <dd>Three at a time, straight from this browser to R2. A dropped connection is tried twice more by itself.</dd>
            </div>
          </dl>
          {storage === 'disabled' && (
            <p className="pn-note">
              <Icon name="info" />
              R2 is off: add R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME to backend/.env and restart the API.
            </p>
          )}
          <div className="pn-pane-foot">
            <Btn icon="cloud" onClick={test} disabled={testing}>
              {testing ? 'Checking…' : 'Check connection'}
            </Btn>
          </div>
        </Pane>

        <Pane title="How files are named">
          <p className="pn-quiet pn-gap">Every file's key on R2 follows the event and its category:</p>
          <pre className="pn-code-block">
            events/<b>anna-leo</b>/<b>ceremony</b>/dsc-0412.jpg
          </pre>
          <ul className="pn-bullets">
            <li>The event's folder is made from its name when it is created, and stays put if the event is renamed.</li>
            <li>A category is a folder inside it, and an album in the client's gallery. Renaming one changes only the album's name.</li>
            <li>Upload a folder and each subfolder becomes a category; you can rename them before the upload starts.</li>
            <li>A file name already used in a category gets -2, -3 on the end, so nothing is overwritten.</li>
          </ul>
        </Pane>
      </div>

      <Pane title="Storage by event">
        <StorageBars limit={50} />
      </Pane>
    </>
  );
}

/*
  The billing month on R2: storage, Class A and Class B, each used against what the plan includes,
  with what is left (or how far over). Class A and B need CLOUDFLARE_API_TOKEN on the API; without it
  only the bucket's size is known.
*/
function R2Usage({ r2, asking, onRefresh }) {
  const usage = r2.usage;
  const status = r2.status;

  if (status === 'off') {
    return (
      <Pane title="Cloudflare R2 this month">
        <p className="pn-note">
          <Icon name="info" />
          R2 isn't set up on the API: add the R2_* keys to backend/.env and restart it.
        </p>
      </Pane>
    );
  }
  if (!usage) {
    return (
      <Pane title="Cloudflare R2 this month" aside={status === 'error' ? <Badge tone="bad">Unavailable</Badge> : <span className="pn-pane-note">Asking Cloudflare…</span>}>
        {status === 'error' ? (
          <div className="pn-split">
            <p className="pn-quiet">{r2.error || "Cloudflare didn't answer."}</p>
            <Btn icon="retry" onClick={onRefresh} disabled={asking}>
              {asking ? 'Asking…' : 'Try again'}
            </Btn>
          </div>
        ) : (
          <div className="pn-usage" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="pn-usage-card is-loading" aria-hidden="true" />
            ))}
          </div>
        )}
      </Pane>
    );
  }

  const st = usage.storage;
  const start = Date.parse(usage.period.start);
  const end = Date.parse(usage.period.end);
  const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / DAY));
  const billed = st.billed;
  const others = (usage.otherOperations || []).filter((o) => o.requests > 0);

  return (
    <Pane
      title="Cloudflare R2 this month"
      aside={
        <span className="pn-usage-aside">
          {usage.stale ? <Badge tone="warn">Not current</Badge> : <Badge tone="done">{usage.plan.name}</Badge>}
          <Btn size="sm" icon="retry" onClick={onRefresh} disabled={asking} aria-busy={asking}>
            {asking ? 'Asking…' : 'Refresh'}
          </Btn>
        </span>
      }
    >
      <p className="pn-usage-period">
        <Icon name="calendar" />
        <span>
          Billing month {date(start)} to {date(end - DAY)} · {plural(daysLeft, 'day')} left · checked {ago(Date.parse(usage.checkedAt))}
          {usage.source === 'cloudflare' ? ', from Cloudflare' : ', by listing the bucket'}
        </span>
      </p>

      <div className="pn-usage">
        <Meter
          icon="cloud"
          title="Storage"
          what="Photos, videos and the studio's files"
          used={st.used}
          included={st.included}
          remaining={st.remaining}
          over={st.over}
          show={formatBytes}
          approx={usage.partial}
          facts={[
            ['Files', num(st.objects)],
            st.bucket && st.bucket.used !== st.used ? [`In ${st.bucket.name}`, `${formatBytes(st.bucket.used)} · ${plural(st.bucket.objects, 'file')}`] : null,
            billed ? ['Billed so far', `${formatBytes(billed.byteMonths)}-months`] : null,
            billed ? ['Month at this size', `${formatBytes(billed.projected)}-months`] : null,
            st.pendingUploads ? ['Unfinished uploads', num(st.pendingUploads)] : null,
            st.measuredAt ? ['Measured', ago(Date.parse(st.measuredAt))] : null,
          ]}
        />
        <Meter
          icon="upload"
          title="Class A operations"
          what="Writes: uploads, listing folders, copying"
          op={usage.classA}
          show={num}
          short={compact}
          approx={usage.partial}
        />
        <Meter
          icon="image"
          title="Class B operations"
          what="Reads: viewing and downloading files"
          op={usage.classB}
          show={num}
          short={compact}
          approx={usage.partial}
        />
      </div>

      {(usage.freeOperations != null || others.length > 0) && (
        <dl className="pn-usage-more">
          {usage.freeOperations != null && (
            <div>
              <dt>Free operations</dt>
              <dd>{num(usage.freeOperations)} (deletes, cancelled uploads)</dd>
            </div>
          )}
          {usage.notCharged != null && (
            <div>
              <dt>Not charged</dt>
              <dd>{num(usage.notCharged)} (refused for their credentials)</dd>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <dt>Other</dt>
              <dd>{others.map((o) => `${o.action} ${num(o.requests)}`).join(' · ')}</dd>
            </div>
          )}
        </dl>
      )}

      {(usage.stale || usage.partial || usage.note) && (
        <p className="pn-note pn-usage-note">
          <Icon name="info" />
          <span>
            {usage.stale && `Cloudflare couldn't be asked just now${usage.error ? ` (${usage.error})` : ''}; these are the last numbers. `}
            {usage.partial && 'Part of the month is missing from the analytics, so the real figures may be higher. '}
            {usage.note}
          </span>
        </p>
      )}
    </Pane>
  );
}

/* one allowance: used against included, what is left, and a bar that turns amber at 80% and red when over */
function Meter({ icon, title, what, op, used, included, remaining, over, show, short = show, approx, facts = [] }) {
  const m = op === undefined ? { used, included, remaining, over } : op;
  if (!m) {
    return (
      <section className="pn-usage-card is-off" aria-label={title}>
        <h3 className="pn-usage-h">
          <Icon name={icon} />
          {title}
        </h3>
        <p className="pn-usage-what">{what}</p>
        <p className="pn-quiet">Counted only with CLOUDFLARE_API_TOKEN (Account Analytics: Read) in backend/.env.</p>
      </section>
    );
  }
  const ratio = m.included ? m.used / m.included : 0;
  const tone = toneOf(ratio);
  return (
    <section className={`pn-usage-card ${tone}`} aria-label={title}>
      <h3 className="pn-usage-h">
        <Icon name={icon} />
        {title}
      </h3>
      <p className="pn-usage-what">{what}</p>
      <p className="pn-usage-num" title={`${show(m.used)} of ${show(m.included)}`}>
        <b>
          {approx ? '≥ ' : ''}
          {short(m.used)}
        </b>
        <span> of {short(m.included)}</span>
      </p>
      <Bar value={ratio} tone={tone} label={`${title}: ${pct(ratio)} of the plan used`} />
      <dl className="pn-usage-dl">
        <div>
          <dt>Used</dt>
          <dd>
            {show(m.used)} · {pct(ratio)}
          </dd>
        </div>
        <div>
          <dt>{m.over ? 'Over the plan' : 'Remaining'}</dt>
          <dd className={m.over ? 'is-over' : ''}>{show(m.over || m.remaining)}</dd>
        </div>
        {op && op.bucket != null && op.bucket !== op.used && (
          <div>
            <dt>This bucket</dt>
            <dd>{show(op.bucket)}</dd>
          </div>
        )}
        {facts.filter(Boolean).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
