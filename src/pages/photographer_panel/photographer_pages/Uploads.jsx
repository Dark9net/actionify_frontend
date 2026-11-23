import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../icons.jsx';
import { Badge, Btn, Empty, IconBtn, PageHead, Search, SizeToggle } from '../ui.jsx';
import NewEvent from './NewEvent.jsx';
import DeleteEvent from './DeleteEvent.jsx';
import ShareGallery from './ShareGallery.jsx';
import { useUploads } from '../lib/uploads.js';
import { liveCode, refreshEvents, setPreviewSize, useEvents, usePreviewSize } from '../lib/media.js';
import { can, useSession } from '../../../lib/auth.js';
import { ago, date, formatBytes, plural } from '../lib/format.js';

const SORTS = [
  ['recent', 'Recently uploaded'],
  ['date', 'Event date'],
  ['name', 'Name'],
];

/* "2026-06-14" → a time (midday, so no time zone moves the day) */
const dayOf = (d) => new Date(`${d}T12:00`).getTime();

/*
  Uploads: one folder per event, from the server (GET /api/v1/events), each with its newest previews,
  how many photographs and videos it holds and how much room they take on R2. An event has to exist
  before anything can go up, so the page starts from the folders (and "New event"); opening a folder
  shows its files and takes the upload. Editors, photographers and the studio lead (event.delete) can
  delete a whole event from its folder's bin button, after typing its name again (DeleteEvent), and
  share its gallery from the share button beside it: the code, a QR code, the link, or an email to
  the client with all three and how to open the photos (ShareGallery).
*/
export default function Uploads() {
  const { status, events, error } = useEvents();
  const u = useUploads();
  const size = usePreviewSize();
  const { user } = useSession();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('recent');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null); // { ev, going, hasCode }
  const mayCreate = can(user, 'event.manage');
  const mayDelete = can(user, 'event.delete');
  // the share button: the code, its QR code and link to see; sending by email asks access_code.manage
  const mayShare = can(user, 'access_code.view');
  const [sharing, setSharing] = useState(null); // the event being shared

  // fresh counts whenever the page opens
  useEffect(() => {
    refreshEvents();
  }, []);

  const folders = useMemo(() => {
    const rows = events.map((ev) => ({
      ev,
      last: Date.parse(ev.stats.lastUploadAt || ev.createdAt) || 0,
      code: liveCode(ev), // from the server, with the event
      going: u.items.filter((it) => it.eventId === ev.id && (it.status === 'uploading' || it.status === 'queued' || it.status === 'retrying')).length,
    }));
    const t = q.trim().toLowerCase();
    const shown = t ? rows.filter((r) => `${r.ev.name} ${r.ev.venue} ${r.ev.kind}`.toLowerCase().includes(t)) : rows;
    return shown.sort((a, b) =>
      sort === 'name' ? a.ev.name.localeCompare(b.ev.name) : sort === 'date' ? b.ev.date.localeCompare(a.ev.date) : b.last - a.last
    );
  }, [events, u.items, q, sort]);

  const loading = status === 'idle' || (status === 'loading' && !events.length);

  return (
    <>
      <PageHead
        kicker="Photos, videos, audio, graphics and 3D"
        title="Uploads"
        text="Every event is a folder on Cloudflare R2. Create the event first, then open it to add its files, a few at a time or a whole folder. Each file is checked before it goes: only real photos, videos, audio, graphics and 3D models are let through."
        actions={
          mayCreate && (
            <Btn tone="primary" icon="plus" onClick={() => setCreating(true)}>
              New event
            </Btn>
          )
        }
      />

      <ol className="pn-steps" aria-label="How uploading works">
        <li className={events.length ? 'is-done' : 'is-now'}>
          <span>1</span>
          <b>Create the event</b>
          <small>Its name becomes the folder</small>
        </li>
        <li className={events.length ? 'is-now' : ''}>
          <span>2</span>
          <b>Open its folder</b>
          <small>Pick it from the list below</small>
        </li>
        <li>
          <span>3</span>
          <b>Add files or a folder</b>
          <small>Each is checked; subfolders become categories</small>
        </li>
      </ol>

      <div className="pn-toolbar">
        <Search value={q} onChange={setQ} label="Search events" placeholder="Search events, venues" />
        <label className="pn-select">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map(([id, l]) => (
              <option key={id} value={id}>
                {l}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" />
        </label>
        <SizeToggle value={size} onChange={setPreviewSize} label="Folder size" />
        <p className="pn-toolbar-note">{loading ? 'Loading…' : plural(folders.length, 'event')}</p>
      </div>

      {status === 'error' && !events.length ? (
        <Empty icon="alert" title="The events could not be loaded" text={error}>
          <Btn icon="retry" onClick={() => refreshEvents()}>
            Try again
          </Btn>
        </Empty>
      ) : loading ? (
        <ul className={`pn-folders is-${size}`} aria-busy="true" aria-label="Loading events">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <span className="pn-folder pn-folder--skel">
                <span className="pn-mosaic" />
                <span className="pn-folder-body">
                  <i />
                  <i />
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : folders.length ? (
        <ul className={`pn-folders is-${size}`}>
          {mayCreate && (
            <li>
              <button type="button" className="pn-folder pn-folder--new" onClick={() => setCreating(true)}>
                <span className="pn-folder-plus">
                  <Icon name="plus" />
                </span>
                <b>New event</b>
                <small>Name it, then upload</small>
              </button>
            </li>
          )}
          {folders.map(({ ev, last, code, going }) => (
            <li key={ev.id} className={mayShare || mayDelete ? 'pn-folder-item' : undefined}>
              <Link
                to={`/photographer/uploads/${ev.id}`}
                className="pn-folder"
                // mini hides the kind: it comes back on hover
                title={size === 'mini' ? `${ev.name} · ${ev.kind}` : undefined}
              >
                <span className={`pn-mosaic n${Math.min(4, ev.covers?.length || 0)}`}>
                  {(ev.covers || []).map((c) => (
                    <span key={c.id} className="pn-thumb">
                      <img src={c.previewUrl} alt="" loading="lazy" decoding="async" draggable={false} />
                      {c.kind === 'video' && (
                        <span className="pn-thumb-play" aria-hidden="true">
                          <Icon name="play" />
                        </span>
                      )}
                    </span>
                  ))}
                  {!ev.covers?.length && (
                    <span className="pn-mosaic-empty">
                      <Icon name={ev.stats.files ? 'image' : 'folderUp'} />
                      {ev.stats.files ? 'No previews yet' : 'Empty, ready for photos'}
                    </span>
                  )}
                  {going > 0 && (
                    <span className="pn-mosaic-badge">
                      <span className="pn-pulse" aria-hidden="true" /> {going} uploading
                    </span>
                  )}
                </span>
                <span className="pn-folder-body">
                  <span className="pn-folder-top">
                    <b className="pn-folder-name">{ev.name}</b>
                    <Badge tone="neutral" dot={false}>
                      {ev.kind}
                    </Badge>
                  </span>
                  <span className="pn-folder-sub">
                    {date(dayOf(ev.date))}
                    {ev.venue ? ` · ${ev.venue}` : ''}
                  </span>
                  <span className="pn-folder-meta">
                    <span>
                      <Icon name="image" />
                      {plural(ev.stats.photos, 'photo')}
                    </span>
                    {ev.stats.videos > 0 && (
                      <span>
                        <Icon name="video" />
                        {plural(ev.stats.videos, 'video')}
                      </span>
                    )}
                    {ev.stats.audio > 0 && (
                      <span>
                        <Icon name="audio" />
                        {plural(ev.stats.audio, 'audio file')}
                      </span>
                    )}
                    {ev.stats.graphics > 0 && (
                      <span>
                        <Icon name="graphic" />
                        {plural(ev.stats.graphics, 'graphic')}
                      </span>
                    )}
                    {ev.stats.models > 0 && (
                      <span>
                        <Icon name="model" />
                        {plural(ev.stats.models, '3D model')}
                      </span>
                    )}
                    <span>{formatBytes(ev.stats.bytes)}</span>
                    <span>{plural(ev.categories.length, 'category', 'categories')}</span>
                  </span>
                  {/* two rows: the live access code, then when the folder last changed */}
                  <span className="pn-folder-foot">
                    <span className="pn-folder-row">
                      {code ? (
                        <span className="pn-code-chip">
                          <Icon name="key" />
                          {code.code}
                        </span>
                      ) : (
                        <span className="pn-quiet">
                          <Icon name="key" />
                          No access code
                        </span>
                      )}
                    </span>
                    <span className="pn-folder-row pn-quiet">
                      <Icon name="clock" />
                      {ev.stats.files ? `Updated ${ago(last)}` : `Created ${ago(Date.parse(ev.createdAt))}`}
                    </span>
                  </span>
                </span>
              </Link>
              {(mayShare || mayDelete) && (
                <span className="pn-folder-tools">
                  {mayShare && (
                    <IconBtn
                      icon="share"
                      className="pn-folder-tool pn-folder-share"
                      label={`Share ${ev.name}: gallery code, QR code, link or email`}
                      onClick={() => setSharing(ev)}
                    />
                  )}
                  {mayDelete && (
                    <IconBtn
                      icon="trash"
                      tone="danger"
                      className="pn-folder-tool pn-folder-del"
                      label={`Delete ${ev.name}`}
                      onClick={() => setDeleting({ ev, going, hasCode: Boolean(code) })}
                    />
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          icon="folder"
          title={q ? 'No event matches' : 'No events yet'}
          text={q ? 'Try another name or venue.' : mayCreate ? 'Create the first event: its photographs go into it.' : 'Events appear here once the studio creates them.'}
        >
          {!q && mayCreate && (
            <Btn tone="primary" icon="plus" onClick={() => setCreating(true)}>
              New event
            </Btn>
          )}
        </Empty>
      )}

      <DeleteEvent
        ev={deleting?.ev || null}
        going={deleting?.going || 0}
        hasCode={deleting?.hasCode || false}
        onClose={() => setDeleting(null)}
      />

      <ShareGallery ev={sharing} onClose={() => setSharing(null)} />

      <NewEvent
        open={creating}
        onClose={() => setCreating(false)}
        onDone={(ev) => {
          refreshEvents();
          navigate(`/photographer/uploads/${ev.id}`);
        }}
      />
    </>
  );
}
