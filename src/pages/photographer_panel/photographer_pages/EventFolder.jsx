import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../icons.jsx';
import { Btn, Confirm, Empty, Field, IconBtn, Modal, PageHead, Pane, SizeToggle } from '../ui.jsx';
import { UploadRows, summary } from '../UploadTray.jsx';
import { cancelAll, enqueue, retryFailed, useUploads } from '../lib/uploads.js';
import { ACCEPT, KINDS_TEXT, LIMITS_TEXT, fromDrop, fromInput, group } from '../lib/files.js';
import {
  addCategory,
  getEvent,
  getMedia,
  listMedia,
  liveCode,
  moveMedia,
  onArrived,
  refreshEvents,
  removeCategory,
  removeMedia,
  renameCategory,
  renameEvent,
  setPreviewSize,
  usePreviewSize,
} from '../lib/media.js';
import { toast } from '../lib/toast.js';
import { can, NotConnected, useSession } from '../../../lib/auth.js';
import useDialog, { dialogProps } from '../../../hooks/useDialog.js';
import { date, formatBytes, plural, prettyName, slugify, time } from '../lib/format.js';

const PAGE = 60;
// the kinds of file, and the event's stats field that counts each; audio, graphics and 3D show once used
const KINDS = [
  ['all', 'All', 'files'],
  ['photo', 'Photos', 'photos'],
  ['video', 'Videos', 'videos'],
  ['audio', 'Audio', 'audio'],
  ['graphic', 'Graphics', 'graphics'],
  ['model', '3D', 'models'],
];
const KIND_ICON = { photo: 'image', video: 'video', audio: 'audio', graphic: 'graphic', model: 'model' };
const KIND_WORDS = { photo: 'in photos', video: 'in videos', audio: 'in audio', graphic: 'in graphics', model: 'in 3D models' };
// what a browser can show itself; HEIC, TIFF and RAW are shown from their preview
const SHOWABLE = /^image\/(jpeg|png|apng|webp|avif|gif|bmp|svg\+xml)$/;
const PLAYABLE_AUDIO = /^audio\/(mpeg|wav|flac|aac|mp4|ogg|webm|aiff)$/;

/* the server's order: by name, then id */
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const errText = (e) => (e instanceof NotConnected ? 'The studio API cannot be reached. Check that it is running.' : e?.message || 'Something went wrong.');
const dayOf = (d) => new Date(`${d}T12:00`).getTime();

function clock(ms) {
  const t = Math.round(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/*
  Inside an event's folder, from the server: its categories (each a folder on R2 and an album in the
  gallery: add, rename, delete), its photographs and videos (60 at a time, more as the page scrolls;
  open one to see it large or play it; pick some to move to another category or delete, or delete one
  by itself from its bin button or from the large view), and the
  upload: "Add files" or "Add a folder", or a drop anywhere on the page. Before anything goes up, a
  review window shows which category each folder will land in. While files go up, each shows its
  progress here, and appears in the grid the moment R2 has it.

  Every file is fetched through this event (/api/v1/events/:id/media): another event's files can't
  be opened from here.
*/
export default function EventFolder() {
  const { eventId } = useParams();
  const u = useUploads();
  const size = usePreviewSize();
  const { user } = useSession();
  const mayUpload = can(user, 'photo.upload');
  const mayManage = can(user, 'photo.manage');
  const mayRename = can(user, 'event.manage');

  const [ev, setEv] = useState(null);
  const [evState, setEvState] = useState('loading'); // loading | ready | missing | error
  const [evError, setEvError] = useState('');
  const [cat, setCat] = useState('all');
  const [kind, setKind] = useState('all');
  // state: loading (first page) | more (next page) | ready | error
  const [list, setList] = useState({ items: [], next: null, state: 'loading', error: '' });
  const [picked, setPicked] = useState(() => new Set());
  const [review, setReview] = useState(null); // { groups, skipped, tooBig, blocked }
  const [checking, setChecking] = useState(null); // { done, total } while the picked files are checked
  const [dragging, setDragging] = useState(false);
  const [dialog, setDialog] = useState(null); // 'rename-event' | 'new-cat' | { renameCat } | { deleteCat } | 'delete-files' | { deleteOne }
  const [viewing, setViewing] = useState(null); // index in list.items
  const [busy, setBusy] = useState(false);
  const filesRef = useRef(null);
  const folderRef = useRef(null);
  const sentinel = useRef(null);
  const ticket = useRef(0);
  const listRef = useRef(list);
  listRef.current = list;
  const countsTimer = useRef(null);

  /* ---- the event, and its counts ---- */
  const loadEvent = useCallback(async () => {
    try {
      const e = await getEvent(eventId);
      setEv(e);
      setEvState('ready');
    } catch (e) {
      if (e.status === 404 || e.status === 400) return setEvState('missing');
      setEvError(errText(e));
      setEvState((st) => (st === 'ready' ? 'ready' : 'error'));
    }
  }, [eventId]);

  useEffect(() => {
    setEv(null);
    setEvState('loading');
    setCat('all');
    setKind('all');
    loadEvent();
  }, [eventId, loadEvent]);

  /* ---- its files, a page at a time ---- */
  const loadPage = useCallback(
    async (reset) => {
      const cur = listRef.current;
      if (!reset && (!cur.next || cur.state !== 'ready')) return;
      const my = ++ticket.current;
      const cursor = reset ? null : cur.next;
      setList((l) => (reset ? { items: [], next: null, state: 'loading', error: '' } : { ...l, state: 'more' }));
      try {
        const d = await listMedia(eventId, { category: cat, kind, cursor, limit: PAGE });
        if (my !== ticket.current) return;
        setList((l) => {
          const have = new Set(reset ? [] : l.items.map((m) => m.id));
          return { items: [...(reset ? [] : l.items), ...d.media.filter((m) => !have.has(m.id))], next: d.nextCursor, state: 'ready', error: '' };
        });
      } catch (e) {
        if (my !== ticket.current) return;
        setList((l) => ({ ...l, state: 'error', error: errText(e) }));
      }
    },
    [eventId, cat, kind]
  );

  useEffect(() => {
    setPicked(new Set());
    setViewing(null);
    loadPage(true);
  }, [loadPage]);

  // the next page loads as the end of the grid comes near
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !list.next) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadPage(false), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadPage, list.next, list.state]);

  // a file that reached R2 shows straight away (when it belongs in what is shown), and the counts follow
  useEffect(
    () =>
      onArrived((m) => {
        if (m.eventId !== eventId) return;
        clearTimeout(countsTimer.current);
        countsTimer.current = setTimeout(loadEvent, 900);
        const fits = (cat === 'all' || (cat === 'none' ? !m.categoryId : m.categoryId === cat)) && (kind === 'all' || m.kind === kind);
        if (!fits) return;
        setList((l) => {
          if (l.state === 'loading' || l.items.some((x) => x.id === m.id)) return l;
          const last = l.items[l.items.length - 1];
          if (l.next && last && byName(m, last) > 0) return l; // it belongs on a page not loaded yet
          return { ...l, items: [...l.items, m].sort(byName) };
        });
      }),
    [eventId, cat, kind, loadEvent]
  );
  useEffect(() => () => clearTimeout(countsTimer.current), []);

  /* ---- a drop anywhere on the page ---- */
  useEffect(() => {
    if (!ev || !mayUpload) return;
    let depth = 0;
    const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    const enter = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setDragging(true);
    };
    const over = (e) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const leave = (e) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const drop = async (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      gather(await fromDrop(e.dataTransfer));
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [ev, mayUpload]); // eslint-disable-line react-hooks/exhaustive-deps

  if (evState === 'missing' || (evState === 'error' && !ev)) {
    return (
      <Empty
        icon={evState === 'missing' ? 'folder' : 'alert'}
        title={evState === 'missing' ? 'This event is not here' : 'The event could not be loaded'}
        text={evState === 'missing' ? 'It may have been removed, or the link is wrong.' : evError}
      >
        {evState === 'error' && (
          <Btn icon="retry" onClick={loadEvent}>
            Try again
          </Btn>
        )}
        <Link to="/photographer/uploads" className="pn-btn pn-btn--glass">
          <Icon name="back" />
          <span>All events</span>
        </Link>
      </Empty>
    );
  }

  if (!ev) {
    return (
      <>
        <Crumbs name="Loading…" />
        <PageHead kicker="Event" title="Loading…" />
        <MediaGrid size={size} loading />
      </>
    );
  }

  const shown = list.items;
  const mine = u.items.filter((it) => it.eventId === eventId);
  const mineActive = mine.filter((it) => it.status === 'uploading' || it.status === 'queued' || it.status === 'retrying').length;
  const mineFailed = mine.filter((it) => it.status === 'failed').length;
  const code = liveCode(ev); // from the server, with the event
  const activeCat = ev.categories.find((c) => c.id === cat);
  const catName = (id) => ev.categories.find((c) => c.id === id)?.name || 'Uncategorised';
  const picking = picked.size > 0;

  // every file is checked (its bytes, not only its name) before the review opens
  async function gather(found) {
    if (!found.length) return;
    setChecking({ done: 0, total: found.length });
    let g;
    try {
      g = await group(found, (done, total) => setChecking({ done, total }));
    } finally {
      setChecking(null);
    }
    if (!g.groups.length) {
      const left = g.skipped.length + g.tooBig.length;
      toast({
        tone: 'error',
        title: g.blocked.length ? `${plural(g.blocked.length, 'file')} blocked` : 'Nothing to upload',
        text: g.blocked.length
          ? `${g.blocked[0].name}: ${g.blocked[0].reason}.${g.blocked.length > 1 ? ` And ${g.blocked.length - 1} more.` : ''} Only real ${KINDS_TEXT} go up.`
          : left
            ? `${plural(left, 'file')} left out. Only ${KINDS_TEXT} go up (${LIMITS_TEXT}).`
            : 'The folder was empty.',
      });
      return;
    }
    setReview(g);
  }

  function pick(id, e) {
    setPicked((old) => {
      const n = new Set(old);
      if (e?.shiftKey && old.size) {
        const ids = shown.map((p) => p.id);
        const last = ids.indexOf([...old].pop());
        const at = ids.indexOf(id);
        ids.slice(Math.min(last, at), Math.max(last, at) + 1).forEach((x) => n.add(x));
        return n;
      }
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function move(to) {
    const ids = [...picked];
    const name = to ? catName(to) : 'Uncategorised';
    setBusy(true);
    try {
      await moveMedia(ev.id, ids, to);
      const moved = new Set(ids);
      setList((l) => ({
        ...l,
        items:
          cat === 'all'
            ? l.items.map((m) => (moved.has(m.id) ? { ...m, categoryId: to } : m))
            : l.items.filter((m) => !moved.has(m.id) || (to || 'none') === cat),
      }));
      setPicked(new Set());
      toast({ tone: 'success', title: `${plural(ids.length, 'file')} moved to ${name}`, text: 'The gallery shows them in that album now.' });
      loadEvent();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not move them', text: errText(e) });
    } finally {
      setBusy(false);
    }
  }

  /* deletes the picked files, or the one file given (its bin button, or the large view) */
  async function remove(one) {
    const ids = one ? [one.id] : [...picked];
    setBusy(true);
    try {
      const r = await removeMedia(ev.id, ids);
      const gone = new Set(ids);
      const left = listRef.current.items.filter((m) => !gone.has(m.id));
      setList((l) => ({ ...l, items: l.items.filter((m) => !gone.has(m.id)) }));
      setPicked((old) => new Set([...old].filter((id) => !gone.has(id))));
      // the large view moves on to the next file, or closes when none is left
      setViewing((v) => (v === null ? null : left.length ? Math.min(v, left.length - 1) : null));
      toast({
        tone: 'info',
        title: one ? `${one.name} deleted` : `${plural(r.removed, 'file')} deleted`,
        text: `Removed from ${ev.name} and from R2.`,
      });
    } catch (e) {
      toast({ tone: 'error', title: 'Could not delete them all', text: errText(e) });
      loadPage(true);
    } finally {
      setBusy(false);
      loadEvent();
      refreshEvents();
    }
  }

  const tabs = [
    { id: 'all', label: 'All', count: ev.stats.files },
    ...ev.categories.map((c) => ({ id: c.id, label: c.name, count: c.files ?? 0 })),
    ...(ev.uncategorised?.files || cat === 'none' ? [{ id: 'none', label: 'Uncategorised', count: ev.uncategorised?.files ?? 0 }] : []),
  ];

  return (
    <>
      <Crumbs name={ev.name} />

      <PageHead
        kicker={`${ev.kind} · ${ev.folder}`}
        title={ev.name}
        actions={
          mayUpload && (
            <>
              <Btn icon="folderUp" onClick={() => folderRef.current?.click()}>
                Add a folder
              </Btn>
              <Btn tone="primary" icon="upload" onClick={() => filesRef.current?.click()}>
                Add files
              </Btn>
            </>
          )
        }
      >
        <p className="pn-meta-line">
          <span>
            <Icon name="calendar" />
            {date(dayOf(ev.date))}
          </span>
          {ev.venue && (
            <span>
              <Icon name="pin" />
              {ev.venue}
            </span>
          )}
          <span>
            <Icon name="image" />
            {plural(ev.stats.photos, 'photo')}
            {ev.stats.videos ? `, ${plural(ev.stats.videos, 'video')}` : ''}
            {ev.stats.audio ? `, ${plural(ev.stats.audio, 'audio file')}` : ''}
            {ev.stats.graphics ? `, ${plural(ev.stats.graphics, 'graphic')}` : ''}
            {ev.stats.models ? `, ${plural(ev.stats.models, '3D model')}` : ''} · {formatBytes(ev.stats.bytes)}
          </span>
          {code ? (
            <button
              type="button"
              className="pn-code-chip is-btn"
              title="Copy the access code"
              onClick={() => {
                navigator.clipboard?.writeText(code.code).catch(() => {});
                toast({ tone: 'success', title: `${code.code} copied`, text: 'Guests type it on the sign-in page.' });
              }}
            >
              <Icon name="key" />
              {code.code}
              <Icon name="copy" />
            </button>
          ) : (
            can(user, 'access_code.manage') && (
              <Link to={`/photographer/access-codes?new=${ev.id}`} className="pn-link">
                Make an access code
              </Link>
            )
          )}
          {mayRename && (
            <button type="button" className="pn-link" onClick={() => setDialog('rename-event')}>
              Rename
            </button>
          )}
        </p>
      </PageHead>

      {mayUpload && (
        <>
          <input ref={filesRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => (gather(fromInput(e.target.files)), (e.target.value = ''))} />
          <input ref={folderRef} type="file" multiple hidden webkitdirectory="" directory="" onChange={(e) => (gather(fromInput(e.target.files)), (e.target.value = ''))} />
        </>
      )}

      <div className="pn-cats">
        <div className="pn-seg pn-seg--scroll" role="tablist" aria-label="Categories">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={cat === t.id} className={cat === t.id ? 'is-on' : ''} onClick={() => setCat(t.id)}>
              {t.label}
              <span className="pn-seg-n">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="pn-cats-acts">
          {activeCat && mayManage && (
            <>
              <IconBtn icon="edit" label={`Rename ${activeCat.name}`} onClick={() => setDialog({ renameCat: activeCat })} />
              <IconBtn icon="trash" label={`Delete ${activeCat.name}`} onClick={() => setDialog({ deleteCat: activeCat })} />
            </>
          )}
          {(mayUpload || mayManage) && (
            <Btn size="sm" icon="plus" onClick={() => setDialog('new-cat')}>
              Category
            </Btn>
          )}
        </div>
      </div>

      <div className="pn-toolbar pn-toolbar--media">
        <div className="pn-seg" role="tablist" aria-label="Kind of file">
          {KINDS.filter(([id, , field]) => id === 'all' || id === 'photo' || id === 'video' || kind === id || ev.stats[field] > 0).map(([id, label, field]) => (
            <button key={id} type="button" role="tab" aria-selected={kind === id} className={kind === id ? 'is-on' : ''} onClick={() => setKind(id)}>
              {label}
              <span className="pn-seg-n">{ev.stats[field] ?? 0}</span>
            </button>
          ))}
        </div>
        <SizeToggle value={size} onChange={setPreviewSize} />
      </div>

      {mayUpload && (
        <button
          type="button"
          className={`pn-drop${ev.stats.files ? ' is-slim' : ''}${dragging ? ' is-over' : ''}${checking ? ' is-checking' : ''}`}
          onClick={() => filesRef.current?.click()}
          disabled={Boolean(checking)}
          aria-busy={Boolean(checking)}
        >
          <span className="pn-drop-ico">
            <Icon name={checking ? 'shield' : 'upload'} />
          </span>
          <span className="pn-drop-text" aria-live="polite">
            {checking ? (
              <>
                <b>
                  Checking {checking.done} of {plural(checking.total, 'file')}…
                </b>
                <small>Each file's contents must match its type: programs, scripts and web pages renamed as photos are stopped here.</small>
              </>
            ) : (
              <>
                <b>Drop photos, videos, audio, graphics, 3D models or folders here{activeCat ? `, or into ${activeCat.name}` : ''}</b>
                <small>or choose files. A folder's subfolders become categories. Every file is checked before it goes to R2.</small>
              </>
            )}
          </span>
        </button>
      )}

      {mine.length > 0 && (
        <Pane
          title="Uploads for this event"
          className="pn-pane--ups"
          aside={
            <span className="pn-pane-acts">
              <span className="pn-pane-note">{summary({ ...u, ...countsOf(mine) }).note}</span>
              {mineFailed > 0 && (
                <Btn size="sm" tone="glass" icon="retry" onClick={() => retryFailed(eventId)}>
                  Retry {mineFailed}
                </Btn>
              )}
              {mineActive > 0 && (
                <Btn size="sm" tone="ghost" icon="stop" onClick={() => cancelAll(eventId)}>
                  Stop
                </Btn>
              )}
            </span>
          }
        >
          <UploadRows items={u.items} eventId={eventId} limit={8} />
        </Pane>
      )}

      {picking && (
        <div className="pn-pickbar" role="region" aria-label="Picked files">
          <span className="pn-pickbar-n">{plural(picked.size, 'file')} picked</span>
          <label className="pn-select pn-select--sm">
            <Icon name="move" />
            <span className="sr-only">Move to category</span>
            <select
              value=""
              disabled={busy}
              onChange={(e) => {
                if (e.target.value) move(e.target.value === 'none' ? null : e.target.value);
              }}
            >
              <option value="">Move to…</option>
              {ev.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="none">Uncategorised</option>
            </select>
            <Icon name="chevronDown" />
          </label>
          <Btn size="sm" tone="danger" icon="trash" disabled={busy} onClick={() => setDialog('delete-files')}>
            Delete
          </Btn>
          <Btn size="sm" tone="ghost" onClick={() => setPicked(new Set(shown.map((p) => p.id)))}>
            All {shown.length}
          </Btn>
          <IconBtn icon="close" label="Clear the picks" onClick={() => setPicked(new Set())} />
        </div>
      )}

      {list.state === 'loading' ? (
        <MediaGrid size={size} loading />
      ) : list.state === 'error' && !shown.length ? (
        <Empty icon="alert" title="The files could not be loaded" text={list.error}>
          <Btn icon="retry" onClick={() => loadPage(true)}>
            Try again
          </Btn>
        </Empty>
      ) : shown.length ? (
        <>
          <MediaGrid size={size}>
            {shown.map((m, i) => {
              const on = picked.has(m.id);
              return (
                <li key={m.id}>
                  <div className={`pn-photo${on ? ' is-on' : ''}${picking ? ' is-picking' : ''}`}>
                    <button
                      type="button"
                      className="pn-photo-open"
                      onClick={(e) => (picking && mayManage ? pick(m.id, e) : setViewing(i))}
                      aria-label={picking && mayManage ? `${on ? 'Unpick' : 'Pick'} ${m.name}` : `Open ${m.name}`}
                    >
                      <span className="pn-thumb">
                        {m.previewUrl ? (
                          <img src={m.previewUrl} alt="" loading={i < 12 ? 'eager' : 'lazy'} decoding="async" draggable={false} />
                        ) : (
                          <span className={`pn-thumb-none is-${m.kind}`}>
                            <Icon name={KIND_ICON[m.kind] || 'image'} />
                            <small>{m.name.split('.').pop().toUpperCase()}</small>
                          </span>
                        )}
                        {(m.kind === 'video' || (m.kind === 'audio' && m.durationMs != null)) && (
                          <span className="pn-thumb-play" aria-hidden="true">
                            <Icon name={m.kind === 'audio' ? 'audio' : 'play'} />
                            {m.durationMs != null && <small>{clock(m.durationMs)}</small>}
                          </span>
                        )}
                      </span>
                      <span className="pn-photo-cap">
                        <span className="pn-photo-name">{m.name}</span>
                        <span>
                          {cat === 'all' ? `${catName(m.categoryId)} · ` : ''}
                          {formatBytes(m.size)}
                        </span>
                      </span>
                    </button>
                    {mayManage && (
                      <button type="button" className="pn-photo-tick" aria-pressed={on} aria-label={`${on ? 'Unpick' : 'Pick'} ${m.name}`} onClick={(e) => pick(m.id, e)}>
                        <Icon name="check" />
                      </button>
                    )}
                    {mayManage && !picking && (
                      <button
                        type="button"
                        className="pn-photo-del"
                        aria-label={`Delete ${m.name}`}
                        title={`Delete ${m.name}`}
                        disabled={busy}
                        onClick={() => setDialog({ deleteOne: m })}
                      >
                        <Icon name="trash" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </MediaGrid>
          <div ref={sentinel} className="pn-more">
            {list.next ? (
              <Btn icon="chevronDown" onClick={() => loadPage(false)} disabled={list.state === 'more'}>
                {list.state === 'more' ? 'Loading…' : 'Show more'}
              </Btn>
            ) : (
              shown.length > PAGE && <p className="pn-quiet">All {plural(shown.length, 'file')} shown.</p>
            )}
            {list.state === 'error' && <p className="pn-note pn-note--warn">{list.error}</p>}
          </div>
        </>
      ) : (
        <Empty
          icon="image"
          title={ev.stats.files ? `Nothing ${KIND_WORDS[kind] || ''} ${activeCat ? `in ${activeCat.name}` : 'here'} yet`.replace(/\s+/g, ' ') : 'No files yet'}
          text={ev.stats.files ? 'Drop files here, or pick some under All and move them.' : mayUpload ? 'Add files or a whole folder above. They go straight to R2.' : 'They show here once someone uploads them.'}
        />
      )}

      <Viewer
        items={shown}
        index={viewing}
        ev={ev}
        catName={catName}
        onIndex={setViewing}
        onClose={() => setViewing(null)}
        more={Boolean(list.next)}
        onMore={() => loadPage(false)}
        onDelete={mayManage ? (m) => setDialog({ deleteOne: m }) : null}
        busy={busy}
      />

      <Review
        data={review}
        ev={ev}
        target={activeCat?.id || (cat === 'none' ? null : ev.categories[0]?.id || null)}
        onClose={() => setReview(null)}
        onEvent={setEv}
      />

      <RenameEvent open={dialog === 'rename-event'} ev={ev} onClose={() => setDialog(null)} onDone={setEv} />
      <CategoryName
        open={dialog === 'new-cat' || Boolean(dialog?.renameCat)}
        ev={ev}
        cat={dialog?.renameCat}
        onClose={() => setDialog(null)}
        onDone={(event, id) => {
          setEv(event);
          if (id) setCat(id);
        }}
      />
      <Confirm
        open={Boolean(dialog?.deleteCat)}
        onClose={() => setDialog(null)}
        title={`Delete ${dialog?.deleteCat?.name || 'the category'}?`}
        text={`Its ${plural(dialog?.deleteCat?.files || 0, 'file')} stay in ${ev.name}, under Uncategorised. Nothing is deleted from R2.`}
        action="Delete category"
        onConfirm={async () => {
          const c = dialog.deleteCat;
          try {
            setEv(await removeCategory(ev.id, c.id));
            setCat('all');
            toast({ tone: 'info', title: `${c.name} deleted`, text: 'Its files are under Uncategorised.' });
          } catch (e) {
            toast({ tone: 'error', title: 'Could not delete the category', text: errText(e) });
          }
        }}
      />
      <Confirm
        open={dialog === 'delete-files'}
        onClose={() => setDialog(null)}
        title={`Delete ${plural(picked.size, 'file')}?`}
        text="They are deleted from R2 and leave the event and its gallery. This can't be undone."
        action="Delete for good"
        onConfirm={() => remove()}
      />
      <Confirm
        open={Boolean(dialog?.deleteOne)}
        onClose={() => setDialog(null)}
        title={`Delete ${dialog?.deleteOne?.name || 'this file'}?`}
        text="It is deleted from R2 and leaves the event and its gallery. This can't be undone."
        action="Delete for good"
        onConfirm={() => remove(dialog.deleteOne)}
      />
    </>
  );
}

function Crumbs({ name }) {
  return (
    <nav className="pn-crumbs" aria-label="Breadcrumb">
      <Link to="/photographer/uploads">
        <Icon name="back" />
        Uploads
      </Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{name}</span>
    </nav>
  );
}

/* the grid, small or large; while loading, grey tiles where the files will be */
function MediaGrid({ size, loading = false, children }) {
  if (loading) {
    return (
      <ul className={`pn-photos is-${size} is-loading`} aria-busy="true" aria-label="Loading the files">
        {Array.from({ length: size === 'large' ? 6 : 12 }, (_, i) => (
          <li key={i}>
            <span className="pn-photo pn-photo--skel">
              <span className="pn-thumb" />
              <span className="pn-photo-cap">
                <i />
              </span>
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return <ul className={`pn-photos is-${size}`}>{children}</ul>;
}

function countsOf(items) {
  const s = { items, queued: 0, uploading: 0, retrying: 0, done: 0, failed: 0, cancelled: 0, bytes: 0, sent: 0, speed: 0 };
  for (const it of items) {
    s[it.status] += 1;
    if (it.status === 'cancelled') continue;
    s.bytes += it.size;
    s.sent += it.status === 'done' ? it.size : it.loaded;
    if (it.status === 'uploading') s.speed += it.speed;
  }
  s.active = s.queued + s.uploading + s.retrying;
  return s;
}

/*
  One file, large: a photograph (its preview at once, the original over it once loaded), or a video
  that starts playing by itself. Arrows (and ← →) step through the files shown; the next page loads
  near the end. Its links are asked for again on opening, so a page left open for a while still shows it.

  The stage is a fixed frame: the screen less the title bar and one line of details, the same for every
  file. Each photo or video is fitted into it at its own shape (as large as the frame allows, never
  cropped), so a small file is scaled up to fill the screen and nothing moves between files.
*/

/* "1672 / 941": the shape the frame fits a file to, from its known pixels */
const shapeOf = (w, h) => (w > 0 && h > 0 ? `${w} / ${h}` : null);

/* plays as soon as it can; a browser that won't play sound by itself plays it muted instead */
function autoplay(video) {
  if (!video) return;
  const go = video.play();
  go?.catch?.((e) => {
    if (e?.name !== 'NotAllowedError') return;
    video.muted = true;
    video.play().catch(() => {});
  });
}
function Viewer({ items, index, ev, catName, onIndex, onClose, more, onMore, onDelete, busy }) {
  const open = index !== null && Boolean(items[index]);
  const ref = useDialog(open, 200);
  const last = useRef(null);
  if (open) last.current = items[index];
  const m = last.current;
  const [fresh, setFresh] = useState(null);
  const [full, setFull] = useState(false);
  const [shape, setShape] = useState(null); // read from the file itself when its pixels weren't known

  useEffect(() => {
    setFull(false);
    setFresh(null);
    setShape(null);
    if (!open || !m) return;
    let live = true;
    // the links in the list may be old: a video waits for fresh ones (else it would start, then restart)
    getMedia(ev.id, m.id)
      .then((d) => live && setFresh(d))
      .catch(() => live && setFresh(m));
    if (more && index >= items.length - 3) onMore();
    return () => {
      live = false;
    };
  }, [open, m?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const key = (e) => {
      if (e.target.closest?.('video')) return; // the video's own keys
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, index, items.length, onIndex]);

  async function download() {
    try {
      const d = await getMedia(ev.id, m.id, { download: true });
      // R2 answers with "attachment": the browser saves it and the page stays
      const a = document.createElement('a');
      a.href = d.downloadUrl;
      a.rel = 'noopener';
      document.body.append(a);
      a.click();
      a.remove();
    } catch (e) {
      toast({ tone: 'error', title: 'Could not download it', text: errText(e) });
    }
  }

  const f = fresh && fresh.id === m?.id ? fresh : m;
  const linked = Boolean(fresh && fresh.id === m?.id);
  const showOriginal = f && (f.kind === 'photo' || f.kind === 'graphic') && SHOWABLE.test(f.contentType);
  const fit = (f && shapeOf(f.width, f.height)) || shape;
  const learn = (w, h) => !fit && setShape(shapeOf(w, h));

  return (
    <dialog ref={ref} className="pn-viewer" aria-label={m ? m.name : 'File'} {...dialogProps(open, onClose)}>
      {m && (
        <div className="pn-viewer-in">
          <div className="pn-viewer-bar">
            <div className="pn-viewer-title">
              <b>{m.name}</b>
              <small>
                {index !== null && `${index + 1} of ${items.length}${more ? '+' : ''} · `}
                {catName(m.categoryId)}
              </small>
            </div>
            <div className="pn-viewer-acts">
              <Btn size="sm" tone="glass" icon="download" onClick={download}>
                Download
              </Btn>
              {onDelete && (
                <Btn size="sm" tone="danger" icon="trash" disabled={busy} onClick={() => onDelete(m)}>
                  Delete
                </Btn>
              )}
              <IconBtn icon="close" label="Close" onClick={onClose} />
            </div>
          </div>

          <div className="pn-viewer-stage">
            {f.kind === 'video' ? (
              <div className={`pn-viewer-fit${fit ? '' : ' is-free'}`} style={fit ? { '--fit': fit } : undefined}>
                {open && linked ? (
                  <video
                    key={f.id}
                    ref={autoplay}
                    className="pn-viewer-media"
                    src={f.url}
                    poster={f.previewUrl || undefined}
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                    onLoadedMetadata={(e) => learn(e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
                  />
                ) : (
                  f.previewUrl && <img className="pn-viewer-media" src={f.previewUrl} alt="" draggable={false} />
                )}
              </div>
            ) : f.kind === 'audio' ? (
              <div className="pn-viewer-audio">
                <span className="pn-viewer-audio-ico">
                  <Icon name="audio" />
                </span>
                {PLAYABLE_AUDIO.test(f.contentType) ? (
                  <audio key={f.id} src={f.url} controls preload="metadata" aria-label={`Play ${f.name}`} />
                ) : (
                  <p className="pn-quiet">Browsers can't play {f.name.split('.').pop().toUpperCase()}. Download it to listen.</p>
                )}
              </div>
            ) : (
              <div className={`pn-viewer-fit${fit ? '' : ' is-free'}`} style={fit ? { '--fit': fit } : undefined}>
                {f.previewUrl && (
                  <img
                    className="pn-viewer-media"
                    src={f.previewUrl}
                    alt=""
                    draggable={false}
                    onLoad={(e) => learn(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                  />
                )}
                {showOriginal && (
                  <img
                    key={f.id}
                    className={`pn-viewer-media pn-viewer-full${full ? ' is-in' : ''}`}
                    src={f.url}
                    alt={f.name}
                    onLoad={(e) => {
                      learn(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
                      setFull(true);
                    }}
                    draggable={false}
                  />
                )}
                {!f.previewUrl && !showOriginal && (
                  <span className="pn-viewer-none">
                    <Icon name={KIND_ICON[f.kind] || 'image'} />
                    {f.kind === 'model'
                      ? 'A 3D model opens in Blender, Maya or another 3D app. Download it to open it.'
                      : f.kind === 'graphic'
                        ? 'This design file opens in its own app. Download it to open it.'
                        : "This file can't be shown in the browser. Download it to open it."}
                  </span>
                )}
              </div>
            )}
            <IconBtn icon="back" label="Previous" className="pn-viewer-prev" disabled={index === 0} onClick={() => onIndex(index - 1)} />
            <IconBtn icon="chevron" label="Next" className="pn-viewer-next" disabled={index === null || index >= items.length - 1} onClick={() => onIndex(index + 1)} />
          </div>

          <dl className="pn-viewer-info">
            <div>
              <dt>Size</dt>
              <dd>{formatBytes(m.size)}</dd>
            </div>
            {m.width && m.height && (
              <div>
                <dt>Pixels</dt>
                <dd>
                  {m.width} × {m.height}
                </dd>
              </div>
            )}
            {m.durationMs != null && (
              <div>
                <dt>Length</dt>
                <dd>{clock(m.durationMs)}</dd>
              </div>
            )}
            <div>
              <dt>Original name</dt>
              <dd>{m.originalName}</dd>
            </div>
            <div>
              <dt>Uploaded</dt>
              <dd>
                {m.uploadedAt ? `${date(Date.parse(m.uploadedAt))}, ${time(Date.parse(m.uploadedAt))}` : '—'}
                {m.uploadedBy ? ` by ${m.uploadedBy.name}` : ''}
              </dd>
            </div>
            {!showOriginal && f.kind === 'photo' && f.previewUrl && (
              <div>
                <dt>Shown</dt>
                <dd>From its preview: browsers can't open {f.name.split('.').pop().toUpperCase()}. Download for the original.</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </dialog>
  );
}

/*
  The review before an upload: one row per folder found (loose files in one row), where it goes.
  A folder whose name matches a category goes into it; any other becomes a new category named after
  the folder (made on the server when the upload starts), which can be renamed here or sent into an
  existing category instead.
*/
function Review({ data, ev, target, onClose, onEvent }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!data) return;
    setErr('');
    setRows(
      data.groups.map((g) => {
        if (g.folder === null) return { ...g, choice: target || '', name: '' };
        const match = ev.categories.find((c) => c.slug === slugify(g.folder) || c.slug === slugify(prettyName(g.folder)));
        return { ...g, choice: match ? match.id : 'new', name: match ? '' : prettyName(g.folder) };
      })
    );
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = Boolean(data);
  const total = rows.reduce((a, r) => a + r.files.length, 0);
  const bytes = rows.reduce((a, r) => a + r.size, 0);
  const bad = rows.some((r) => r.choice === 'new' && !r.name.trim());
  const left = data ? data.skipped.length + data.tooBig.length : 0;
  const blocked = data?.blocked || [];

  const update = (i, patch) => setRows((rs) => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  async function start() {
    if (bad || busy) return;
    setBusy(true);
    setErr('');
    try {
      // new categories first, on the server; the same folder name twice becomes one category
      let event = ev;
      const made = new Map();
      for (const r of rows) {
        if (r.choice !== 'new') continue;
        const key = slugify(r.name.trim());
        if (made.has(key)) continue;
        const out = await addCategory(ev.id, r.name.trim());
        made.set(key, out.category.id);
        event = out.event;
      }
      const entries = [];
      const names = new Set();
      for (const r of rows) {
        const categoryId = r.choice === 'new' ? made.get(slugify(r.name.trim())) : r.choice || null;
        names.add(categoryId ? event.categories.find((c) => c.id === categoryId)?.name : 'Uncategorised');
        r.files.forEach((file) => entries.push({ file, categoryId }));
      }
      if (event !== ev) onEvent(event);
      const label = names.size === 1 ? `${ev.name} · ${[...names][0]}` : ev.name;
      enqueue(event, entries, label);
      toast({ tone: 'info', title: `Uploading ${plural(entries.length, 'file')}`, text: `${formatBytes(bytes)} to ${label}. You can leave this page; it keeps going.` });
      onClose();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Upload ${plural(total, 'file')} to ${ev.name}`}
      text="Choose the category for each folder. New categories take the folder's name; rename them here if you like."
      onSubmit={start}
      footer={
        <>
          <span className="pn-modal-sum">
            {formatBytes(bytes)} → {ev.folder}
          </span>
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn tone="primary" type="submit" icon="upload" disabled={bad || !total || busy}>
            {busy ? 'Starting…' : `Upload ${total}`}
          </Btn>
        </>
      }
    >
      <ul className="pn-review">
        {rows.map((r, i) => (
          <li key={r.folder ?? '__loose'} className="pn-review-row">
            <span className="pn-review-from">
              <Icon name={r.folder === null ? 'image' : 'folder'} />
              <span>
                <b>{r.folder === null ? 'Single files' : r.folder}</b>
                <small>
                  {plural(r.files.length, 'file')} · {formatBytes(r.size)}
                </small>
              </span>
            </span>
            <Icon name="chevron" className="pn-review-arrow" />
            <span className="pn-review-to">
              <label className="pn-select">
                <span className="sr-only">Category for {r.folder || 'the single files'}</span>
                <select value={r.choice} onChange={(e) => update(i, { choice: e.target.value, name: e.target.value === 'new' && !r.name ? prettyName(r.folder || 'New category') : r.name })}>
                  {ev.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="">Uncategorised</option>
                  <option value="new">New category…</option>
                </select>
                <Icon name="chevronDown" />
              </label>
              {r.choice === 'new' && (
                <input
                  className={`pn-input pn-input--sm${!r.name.trim() ? ' is-bad' : ''}`}
                  value={r.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  aria-label={`Name of the new category for ${r.folder || 'the single files'}`}
                  placeholder="Category name"
                  maxLength={40}
                />
              )}
            </span>
          </li>
        ))}
      </ul>
      {blocked.length > 0 && (
        <div className="pn-note pn-note--warn pn-blocked" role="alert">
          <Icon name="shield" />
          <div>
            <b>
              {plural(blocked.length, 'file')} blocked: {blocked.length === 1 ? 'it isn’t what its name says' : 'they aren’t what their names say'}
            </b>
            <ul>
              {blocked.slice(0, 5).map((b, i) => (
                <li key={i}>
                  <span className="pn-blocked-name">{b.name}</span>: {b.reason}
                </li>
              ))}
            </ul>
            <small>
              {blocked.length > 5 ? `And ${blocked.length - 5} more. ` : ''}They stay on this computer. Only real {KINDS_TEXT} go up.
            </small>
          </div>
        </div>
      )}
      {left > 0 && (
        <p className="pn-note pn-note--warn">
          <Icon name="info" />
          {plural(left, 'file')} left out: {[...data.skipped, ...data.tooBig].slice(0, 4).join(', ')}
          {left > 4 ? ` and ${left - 4} more` : ''}. Only {KINDS_TEXT} go up ({LIMITS_TEXT}).
        </p>
      )}
      {err && (
        <p className="pn-note pn-note--warn" role="alert">
          <Icon name="alert" />
          {err}
        </p>
      )}
    </Modal>
  );
}

function RenameEvent({ open, ev, onClose, onDone }) {
  const [name, setName] = useState(ev.name);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName(ev.name);
      setErr('');
    }
  }, [open, ev.name]);
  async function save() {
    if (!name.trim()) return setErr('The event needs a name.');
    setBusy(true);
    try {
      const event = await renameEvent(ev.id, name.trim());
      onDone(event);
      refreshEvents();
      toast({ tone: 'success', title: 'Event renamed', text: event.name });
      onClose();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Rename the event"
      text={`The gallery shows the new name. The folder on R2 stays ${ev.folder}, so no file moves.`}
      onSubmit={save}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn tone="primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Btn>
        </>
      }
    >
      <Field label="Event name" error={err}>
        {(p) => <input {...p} className="pn-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />}
      </Field>
    </Modal>
  );
}

/* a new category, or a new name for one */
function CategoryName({ open, ev, cat, onClose, onDone }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName(cat?.name || '');
      setErr('');
    }
  }, [open, cat]);
  async function save() {
    const n = name.trim();
    if (!n) return setErr('Give the category a name.');
    setBusy(true);
    try {
      if (cat) {
        onDone(await renameCategory(ev.id, cat.id, n), cat.id);
        toast({ tone: 'success', title: `Renamed to ${n}`, text: 'The gallery album shows the new name.' });
      } else {
        const out = await addCategory(ev.id, n);
        if (!out.created) {
          setBusy(false);
          return setErr('There is already a category with this name.');
        }
        onDone(out.event, out.category.id);
        toast({ tone: 'success', title: `${n} added`, text: `Folder ${out.category.folder}` });
      }
      onClose();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={cat ? `Rename ${cat.name}` : 'New category'}
      text={cat ? 'Only the name the gallery shows changes; the files stay where they are on R2.' : 'A category is an album in the gallery and a folder on R2.'}
      onSubmit={save}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn tone="primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : cat ? 'Save' : 'Add category'}
          </Btn>
        </>
      }
    >
      <Field label="Category name" error={err} hint={!cat && name.trim() ? `Folder: ${ev.folder}${slugify(name)}/` : undefined}>
        {(p) => <input {...p} className="pn-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus placeholder="First dance" />}
      </Field>
    </Modal>
  );
}
