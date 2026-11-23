import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../icons.jsx';
import { Badge, Btn, Confirm, Empty, Field, IconBtn, Modal, PageHead, Pane, Search, Segments, Stat } from '../ui.jsx';
import { byId, syncServerCode, useStudio } from '../lib/store.js';
import { changeCode, codeEvents, listCodes, makeCode, refreshSummary, regenerateCode, useCodeSummary } from '../lib/accessCodes.js';
import { galleryLink, suggestCode } from '../lib/codes.js';
import { formatCode, isCode } from '../../../lib/galleryCode.js';
import { NotConnected, can, useSession } from '../../../lib/auth.js';
import { auth } from '../../../data/content.js';
import { toast } from '../lib/toast.js';
import { date, num, plural } from '../lib/format.js';

const LIFE = [
  [30, '30 days'],
  [90, '3 months'],
  [365, 'A year'],
  [0, 'No end date'],
];
const TONE = { active: 'done', expired: 'warn', revoked: 'neutral' };
const LABEL = { active: 'Active', expired: 'Expired', revoked: 'Revoked' };
const COLUMNS = 8;

const copy = (text, title) => {
  navigator.clipboard?.writeText(text).catch(() => {});
  toast({ tone: 'success', title, text });
};
const problem = (err) => (err instanceof NotConnected ? auth.offline : err.message);

/*
  Access codes: the way guests open an event's gallery without an account (on the sign-in page, or
  with the link that carries the code). Each event has one code, with its end date and viewer limit.
  Regenerating replaces it with a new one (the old one stops working); revoking closes it at once and
  it can be restored.

  Everything here is on the server (gallery_codes): the table shows ten codes at a time, newest first.
  Each page comes with a cursor for the next one; the cursors of the pages already seen are kept, so
  Previous goes back without asking for a count.
*/
export default function AccessCodes() {
  const s = useStudio();
  const session = useSession();
  const manage = can(session.user, 'access_code.manage');
  const summary = useCodeSummary();
  const [params, setParams] = useSearchParams();

  const [show, setShow] = useState('all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // q, once typing pauses
  const [cursors, setCursors] = useState([null]); // the cursor that starts each page seen so far
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ codes: [], nextCursor: null, pageSize: 10 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [events, setEvents] = useState(null);
  const [making, setMaking] = useState(params.get('new') ?? null);
  const [revoking, setRevoking] = useState(null);
  const [renewing, setRenewing] = useState(null);
  const asked = useRef(0);

  // ?new=<event id> (from an event's folder) opens the form for that event
  useEffect(() => {
    if (params.get('new') !== null) {
      setMaking(params.get('new'));
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  // a new filter or search starts again from the first page
  const firstPage = () => {
    setCursors([null]);
    setPage(0);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim() === query) return;
      setQuery(q.trim());
      firstPage();
    }, 300);
    return () => clearTimeout(t);
  }, [q, query]);

  const load = useCallback(async () => {
    const ticket = ++asked.current; // only the latest answer is shown
    setStatus('loading');
    try {
      const d = await listCodes({ status: show, q: query, cursor: cursors[page] });
      if (ticket !== asked.current) return;
      setData(d);
      setStatus('ready');
    } catch (err) {
      if (ticket !== asked.current) return;
      setError(problem(err));
      setStatus('error');
    }
  }, [show, query, cursors, page]);

  useEffect(() => {
    load();
  }, [load]);

  const loadEvents = useCallback(
    () =>
      codeEvents()
        .then(setEvents)
        .catch(() => setEvents([])),
    []
  );

  useEffect(() => {
    refreshSummary();
    loadEvents();
  }, [loadEvents]);

  // one code per event: asked to make one for an event that has it, show that code instead
  useEffect(() => {
    if (!making || !events) return;
    const ev = events.find((x) => x.id === making);
    if (!ev?.codeId) return;
    setMaking(null);
    setShow('all');
    setQ(ev.name);
    toast({ tone: 'info', title: `${ev.name} has its access code`, text: 'An event has one code. Regenerate it to replace it.' });
  }, [making, events]);

  function next() {
    if (!data.nextCursor) return;
    setCursors((c) => [...c.slice(0, page + 1), data.nextCursor]);
    setPage((p) => p + 1);
  }

  // a changed code: its row is replaced in place, so the page doesn't jump
  function changed(code) {
    setData((d) => ({ ...d, codes: d.codes.map((c) => (c.id === code.id ? code : c)) }));
    syncServerCode(code);
    refreshSummary();
  }

  async function act(c, body, done) {
    try {
      const code = await changeCode(c.id, body);
      changed(code);
      done?.(code);
    } catch (err) {
      toast({ tone: 'error', title: `Couldn't change ${c.code}`, text: problem(err) });
    }
  }

  const restore = (c) => act(c, { revoked: false }, () => toast({ tone: 'success', title: `${c.code} restored`, text: `It opens ${c.eventName} again.` }));

  // a new code for the same event, made from its name like the form's (a random one if that is taken)
  async function regenerate(c) {
    try {
      let code;
      try {
        code = await regenerateCode(c.id, { code: suggestCode(c.eventName, new Set([c.code])) });
      } catch (err) {
        if (err.code !== 'CODE_TAKEN') throw err;
        code = await regenerateCode(c.id);
      }
      changed(code);
      copy(code.code, `New code for ${code.eventName} copied`);
    } catch (err) {
      toast({ tone: 'error', title: `Couldn't regenerate ${c.code || 'the code'}`, text: problem(err) });
    }
  }

  const from = page * data.pageSize + 1;
  const to = page * data.pageSize + data.codes.length;
  const total = query ? null : summary.loaded ? summary[show] : null;
  const noEvents = events !== null && !events.length;
  // the events still without a code: the only ones the form offers
  const open = (events || []).filter((x) => !x.codeId);
  const allHaveCodes = events !== null && events.length > 0 && !open.length;
  const nothingYet = summary.loaded && summary.all === 0;

  return (
    <>
      <PageHead
        kicker="Photographs"
        title="Access codes"
        text="A code opens one event's gallery on the sign-in page, no account needed. Each event has one code: regenerate it to replace it, revoke it to close that door."
        actions={
          manage && (
            <Btn tone="primary" icon="plus" onClick={() => setMaking('')} disabled={noEvents || allHaveCodes} title={allHaveCodes ? 'Every event has its code' : undefined}>
              New code
            </Btn>
          )
        }
      />

      <div className="pn-stats pn-stats--3">
        <Stat icon="key" tone="done" label="Active codes" value={num(summary.active)} note={`for ${plural(summary.activeEvents, 'event')}`} />
        <Stat
          icon="clock"
          tone="pending"
          label="Ending within 30 days"
          value={num(summary.endingSoon)}
          note={summary.endingSoon ? 'Extend them before guests are locked out' : 'Nothing ends soon'}
        />
        <Stat icon="external" label="Gallery opens" value={num(summary.opens)} note="With every code, all time" />
      </div>

      {noEvents && nothingYet ? (
        <Empty icon="folder" title="Create an event first" text="A code opens one event's gallery, so the event has to exist.">
          <Link to="/photographer/uploads" className="pn-btn pn-btn--primary">
            <Icon name="plus" />
            <span>Go to Uploads</span>
          </Link>
        </Empty>
      ) : (
        <Pane pad={false}>
          <div className="pn-table-tools">
            <Segments
              label="Show codes"
              value={show}
              onChange={(v) => {
                setShow(v);
                firstPage();
              }}
              items={[
                { id: 'all', label: 'All', count: summary.all },
                { id: 'active', label: 'Active', count: summary.active },
                { id: 'expired', label: 'Expired', count: summary.expired },
                { id: 'revoked', label: 'Revoked', count: summary.revoked },
              ]}
            />
            <Search value={q} onChange={setQ} label="Search codes" placeholder="Whole code, event or label" />
          </div>

          {status === 'error' ? (
            <Empty icon="info" title="Couldn't load the codes" text={error}>
              <Btn icon="retry" onClick={load}>
                Try again
              </Btn>
            </Empty>
          ) : status === 'ready' && !data.codes.length ? (
            page > 0 ? (
              <Empty icon="key" title="No more codes" text="The codes on this page have changed.">
                <Btn icon="back" onClick={() => setPage(0)}>
                  First page
                </Btn>
              </Empty>
            ) : query || show !== 'all' ? (
              <Empty icon="key" title="No code matches" text={query ? 'Search for a whole code, or part of an event name or label.' : 'Try another filter.'} />
            ) : (
              <Empty icon="key" title="No access codes yet" text="Make one for an event, then share it with its guests.">
                {manage && !noEvents && (
                  <Btn tone="primary" icon="plus" onClick={() => setMaking('')}>
                    New code
                  </Btn>
                )}
              </Empty>
            )
          ) : (
            <>
              <div className="pn-table-wrap">
                <table className="pn-table" aria-busy={status === 'loading'}>
                  <thead>
                    <tr>
                      <th scope="col">Code</th>
                      <th scope="col">Event</th>
                      <th scope="col">For</th>
                      <th scope="col">Made</th>
                      <th scope="col">Ends</th>
                      <th scope="col" className="is-num">
                        Opens
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className={status === 'loading' ? 'is-loading' : ''}>
                    {status === 'loading' && !data.codes.length
                      ? Array.from({ length: 4 }, (_, i) => (
                          <tr key={i} className="pn-row-skel" aria-hidden="true">
                            <td colSpan={COLUMNS}>
                              <span />
                            </td>
                          </tr>
                        ))
                      : data.codes.map((c) => (
                          <tr key={c.id} className={c.state !== 'active' ? 'is-dim' : ''}>
                            <td>
                              {c.code ? (
                                <button type="button" className="pn-code" onClick={() => copy(c.code, `${c.code} copied`)} title="Copy the code">
                                  {c.code}
                                  <Icon name="copy" />
                                </button>
                              ) : (
                                <span className="pn-quiet">Unreadable</span>
                              )}
                            </td>
                            <td>
                              {c.eventId && byId(s.events, c.eventId) ? (
                                <Link to={`/photographer/uploads/${c.eventId}`} className="pn-cell-link">
                                  {c.eventName}
                                </Link>
                              ) : (
                                c.eventName
                              )}
                            </td>
                            <td>
                              {c.label || 'Guests'}
                              {c.maxUsers ? (
                                <small className="pn-cell-sub">
                                  {c.liveUsers ?? 0} of {plural(c.maxUsers, 'viewer')} now
                                </small>
                              ) : null}
                            </td>
                            <td className="pn-nowrap">{date(c.createdAt)}</td>
                            <td className="pn-nowrap">{c.expiresAt ? date(c.expiresAt) : 'No end date'}</td>
                            <td className="is-num">{num(c.opens)}</td>
                            <td>
                              <Badge tone={TONE[c.state]}>{LABEL[c.state]}</Badge>
                            </td>
                            <td>
                              <span className="pn-row-acts">
                                {c.code && <IconBtn icon="link" label={`Copy the gallery link for ${c.code}`} onClick={() => copy(galleryLink(c.code), 'Gallery link copied')} />}
                                {manage && c.state === 'expired' && (
                                  <Btn size="sm" icon="clock" onClick={() => act(c, { extendDays: 90 }, () => toast({ tone: 'success', title: `${c.code} extended`, text: 'Open for another three months.' }))}>
                                    Extend
                                  </Btn>
                                )}
                                {manage && (
                                  <Btn size="sm" tone="ghost" onClick={() => setRenewing(c)} title={`Replace ${c.code || 'this code'} with a new one`}>
                                    Regenerate
                                  </Btn>
                                )}
                                {manage &&
                                  (c.state === 'revoked' ? (
                                    <Btn size="sm" icon="retry" onClick={() => restore(c)}>
                                      Restore
                                    </Btn>
                                  ) : (
                                    <Btn size="sm" tone="ghost" onClick={() => setRevoking(c)}>
                                      Revoke
                                    </Btn>
                                  ))}
                              </span>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

              <nav className="pn-pager" aria-label="Pages of codes">
                <p className="pn-pager-note" aria-live="polite">
                  {data.codes.length ? (
                    <>
                      {from}–{to}
                      {total !== null && ` of ${num(total)}`}
                    </>
                  ) : (
                    'Loading…'
                  )}
                </p>
                <span className="pn-pager-acts">
                  <Btn size="sm" icon="back" onClick={() => setPage((p) => p - 1)} disabled={page === 0 || status === 'loading'}>
                    Previous
                  </Btn>
                  <span className="pn-pager-page">Page {page + 1}</span>
                  <Btn size="sm" className="pn-pager-next" onClick={next} disabled={!data.nextCursor || status === 'loading'}>
                    Next
                    <Icon name="chevron" />
                  </Btn>
                </span>
              </nav>
            </>
          )}
        </Pane>
      )}

      <NewCode
        open={making !== null}
        eventId={making}
        events={open}
        onClose={() => setMaking(null)}
        onMade={(code) => {
          syncServerCode(code);
          refreshSummary();
          loadEvents();
          // the newest code is first: show the first page (a fresh read when already on it)
          if (page === 0 && cursors.length === 1) load();
          else firstPage();
        }}
      />
      <Confirm
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        title={`Revoke ${revoking?.code}?`}
        text={`Anyone using it is shut out of ${revoking?.eventName} straight away. It is the event's only code: guests can't open the gallery until you restore or regenerate it.`}
        action="Revoke code"
        onConfirm={() => {
          const c = revoking;
          act(c, { revoked: true }, () => toast({ tone: 'info', title: `${c.code} revoked`, action: { label: 'Undo', run: () => restore(c) } }));
        }}
      />
      <Confirm
        open={Boolean(renewing)}
        onClose={() => setRenewing(null)}
        title={`New code for ${renewing?.eventName}?`}
        text={`${renewing?.code || 'The current code'} stops working at once and anyone viewing with it is sent away. Clients with an account keep the gallery. The new code is copied for you to share; its end date and viewer limit stay the same.`}
        action="Regenerate code"
        onConfirm={() => regenerate(renewing)}
      />
    </>
  );
}

function NewCode({ open, eventId, events, onClose, onMade }) {
  const [ev, setEv] = useState('');
  const [label, setLabel] = useState('Guests');
  const [days, setDays] = useState(365);
  const [viewers, setViewers] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const nameOf = useMemo(() => (id) => events.find((x) => x.id === id)?.name || '', [events]);

  useEffect(() => {
    if (!open) return;
    const first = eventId && events.some((x) => x.id === eventId) ? eventId : events[0]?.id || '';
    setEv(first);
    setLabel('Guests');
    setDays(365);
    setViewers('');
    setErr({});
    setBusy(false);
    setCode(suggestCode(nameOf(first)));
  }, [open, events.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (busy) return;
    const e = {};
    if (!ev) e.eventId = 'Choose the event this code opens.';
    if (!isCode(code)) e.code = 'A code has 14 letters or numbers in groups of 4, 4, 4 and 2, like ANNA-LEO1-JUNE-24.';
    const max = viewers.trim() ? Number(viewers) : null;
    if (max !== null && (!Number.isInteger(max) || max < 1 || max > 10000)) e.maxUsers = 'A whole number from 1 to 10,000, or blank for no limit.';
    setErr(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const c = await makeCode({ eventId: ev, label, days, maxUsers: max, code });
      copy(c.code, `${c.code} made and copied`);
      onMade(c);
      onClose();
    } catch (error) {
      setBusy(false);
      if (error instanceof NotConnected) return setErr({ form: auth.offline });
      const fields = {};
      for (const [k, msg] of Object.entries(error.errors || {})) fields[k] = msg;
      setErr(Object.keys(fields).length ? fields : { form: error.message });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New access code"
      text="Guests type it on the sign-in page, or open the link that carries it."
      onSubmit={submit}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Btn>
          <Btn tone="primary" type="submit" icon="key" disabled={busy || !events.length} aria-busy={busy}>
            {busy ? 'Making…' : 'Make code'}
          </Btn>
        </>
      }
    >
      <div className="pn-form">
        {err.form && (
          <p className="pn-note pn-note--warn" role="alert">
            <Icon name="info" />
            {err.form}
          </p>
        )}
        <Field label="Event" error={err.eventId} hint={events.length ? 'Events that have their code already aren’t listed: regenerate theirs in the table.' : 'Every event has its code. Regenerate one in the table to replace it.'}>
          {(p) => (
            <select
              {...p}
              className="pn-input"
              value={ev}
              onChange={(e) => {
                setEv(e.target.value);
                setCode(suggestCode(nameOf(e.target.value)));
                setErr((o) => ({ ...o, eventId: undefined }));
              }}
            >
              {events.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="pn-form-row">
          <Field label="Who it is for" hint="Only you see this" error={err.label}>
            {(p) => <input {...p} className="pn-input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />}
          </Field>
          <Field label="Open for" error={err.days}>
            {(p) => (
              <select {...p} className="pn-input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {LIFE.map(([d, l]) => (
                  <option key={d} value={d}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Viewers at once" optional error={err.maxUsers} hint="How many devices may have the gallery open at the same time. Blank: no limit.">
          {(p) => (
            <input
              {...p}
              className="pn-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={10000}
              step={1}
              value={viewers}
              onChange={(e) => {
                setViewers(e.target.value);
                setErr((o) => ({ ...o, maxUsers: undefined }));
              }}
              placeholder="No limit"
            />
          )}
        </Field>
        <Field label="Code" error={err.code} hint="Made from the event's name. Type your own if you prefer.">
          {(p) => (
            <div className="pn-code-edit">
              <input
                {...p}
                className="pn-input pn-input--code"
                value={code}
                onChange={(e) => {
                  setCode(formatCode(e.target.value));
                  setErr((o) => ({ ...o, code: undefined }));
                }}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="characters"
              />
              <IconBtn icon="retry" label="Make another code" onClick={() => setCode(suggestCode(nameOf(ev), new Set(), true))} />
            </div>
          )}
        </Field>
      </div>
    </Modal>
  );
}
