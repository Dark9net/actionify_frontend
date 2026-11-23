import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../icons.jsx';
import { Avatar, Badge, Btn, Confirm, Empty, Field, IconBtn, Modal, PageHead, Pane, Search, Segments, Stat } from '../ui.jsx';
import { changeAccount, deleteAccount, isLead, listAccounts, LEAD, refreshAccessSummary, useAccessSummary } from '../lib/access.js';
import { showMobile } from '../lib/bookings.js';
import { NotConnected, can, useSession } from '../../../lib/auth.js';
import { auth } from '../../../data/content.js';
import { toast } from '../lib/toast.js';
import { ago, date, num, plural } from '../lib/format.js';

const STATUS = {
  pending: { label: 'Waiting for approval', short: 'Waiting', tone: 'pending' },
  active: { label: 'Active', short: 'Active', tone: 'done' },
  disabled: { label: 'Disabled', short: 'Disabled', tone: 'bad' },
};
const LOCKED = {
  self: "Your own account. Another studio lead can change it.",
  rank: "Another studio lead's account. Studio leads can't change each other's.",
};
const COLUMNS = 7;
const problem = (err) => (err instanceof NotConnected ? auth.offline : err.message);
const when = (t) => (t ? ago(Date.parse(t)) : 'Never');

/*
  Access (/photographer/access): every row of users, newest first, 25 at a time: who they are, their
  email and phone, their role and status, when they joined and last signed in. The studio lead
  changes a role, approves a sign-up, disables or enables an account, or deletes it (typing its email
  again). Only the studio lead's role opens this page; the sidebar hides it from everyone else, and the
  API (/api/v1/access) refuses them as well. Your own account and other studio leads' are shown but
  can't be changed here.
*/
export default function Access() {
  const session = useSession();
  const me = session.user;
  const lead = isLead(me);
  const { summary, roles, loaded } = useAccessSummary();

  const [show, setShow] = useState('all'); // all | pending | active | disabled
  const [role, setRole] = useState('all'); // all | a role's slug
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // q, once typing pauses
  const [cursors, setCursors] = useState([null]); // the cursor that starts each page seen so far
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ users: [], nextCursor: null, pageSize: 25 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [working, setWorking] = useState(() => new Set()); // accounts being changed
  const [asking, setAsking] = useState(null); // { kind: 'role' | 'disable', user, role? }
  const [deleting, setDeleting] = useState(null);
  const asked = useRef(0);

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
    if (!lead) return;
    const ticket = ++asked.current; // only the latest answer is shown
    setStatus('loading');
    try {
      const d = await listAccounts({ status: show, role, q: query, cursor: cursors[page] });
      if (ticket !== asked.current) return;
      setData(d);
      setStatus('ready');
    } catch (err) {
      if (ticket !== asked.current) return;
      setError(problem(err));
      setStatus('error');
    }
  }, [lead, show, role, query, cursors, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (lead) refreshAccessSummary();
  }, [lead]);

  if (!lead) return <Denied seesCodes={can(me, 'access_code.view')} />;

  const filter = (v) => {
    setShow(v);
    firstPage();
  };
  const byRole = (v) => {
    setRole(v);
    firstPage();
  };

  function next() {
    if (!data.nextCursor) return;
    setCursors((c) => [...c.slice(0, page + 1), data.nextCursor]);
    setPage((p) => p + 1);
  }

  const busy = (id, on) =>
    setWorking((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  async function change(u, to, done) {
    busy(u.id, true);
    try {
      const out = await changeAccount(u.id, to);
      // the row changes in place, so the table doesn't jump
      setData((d) => ({ ...d, users: d.users.map((x) => (x.id === out.id ? out : x)) }));
      refreshAccessSummary();
      toast({ tone: 'info', ...done(out) });
    } catch (err) {
      toast({ tone: 'error', title: `Couldn't change ${u.name}'s account`, text: problem(err) });
      if (err.status === 404) load();
    } finally {
      busy(u.id, false);
    }
  }

  const setRoleOf = (u, slug) =>
    change(u, { role: slug }, (out) => ({ title: `${out.name} is now ${article(out.role.name)}`, text: roleNote(u.role, out.role) }));
  const approve = (u) =>
    change(u, { status: 'active' }, (out) => ({ title: `${out.name} approved`, text: out.emailVerified ? "They've been emailed and can sign in now." : "They've been emailed. They can sign in once they confirm their email." }));
  const enable = (u) => change(u, { status: 'active' }, (out) => ({ title: `${out.name} enabled`, text: 'They can sign in again.' }));
  const disable = (u) => change(u, { status: 'disabled' }, (out) => ({ title: `${out.name} disabled`, text: "Signed out everywhere. They can't sign in until you enable the account." }));

  function removed(u) {
    refreshAccessSummary();
    setData((d) => ({ ...d, users: d.users.filter((x) => x.id !== u.id) }));
    // the page emptied: ask again, so the rows after it move up
    if (data.users.length === 1) load();
  }

  const s = summary;
  const from = page * data.pageSize + 1;
  const to = page * data.pageSize + data.users.length;
  const total = query || !loaded ? null : role === 'all' ? (show === 'all' ? s.all : s[show]) : show === 'all' ? s.roles[role] ?? null : null;
  const chosen = asking?.kind === 'role' ? roles.find((r) => r.slug === asking.role) : null;

  return (
    <>
      <PageHead
        kicker="Settings"
        title="Access"
        text="Every account on the website and the panel: who they are, how to reach them, their role and whether they can sign in. Approve new sign-ups, change a role, disable an account or delete it."
      />
      <div className="pn-stats">
        <Stat icon="clients" label="Accounts" value={loaded ? num(s.all) : '–'} note={loaded ? plural(s.roles.client ?? 0, 'client') : 'Everyone signed up'} onClick={() => { filter('all'); byRole('all'); }} />
        <Stat icon="bell" tone="pending" label="Waiting for approval" value={loaded ? num(s.pending) : '–'} note="New sign-ups to approve" onClick={() => filter(show === 'pending' ? 'all' : 'pending')} />
        <Stat icon="camera" tone="done" label="Studio team" value={loaded ? num(s.staff) : '–'} note="Can open this panel" />
        <Stat icon="lock" label="Disabled" value={loaded ? num(s.disabled) : '–'} note="Can't sign in" onClick={() => filter(show === 'disabled' ? 'all' : 'disabled')} />
      </div>

      <Pane pad={false}>
        <div className="pn-table-tools">
          <div className="pn-team-filters">
            <Segments
              label="Show accounts"
              value={show}
              onChange={filter}
              items={[
                { id: 'all', label: 'All', count: s.all },
                { id: 'pending', label: 'Waiting', count: s.pending },
                { id: 'active', label: 'Active', count: s.active },
                { id: 'disabled', label: 'Disabled', count: s.disabled },
              ]}
            />
            <label className="pn-select">
              <Icon name="shield" />
              <span className="sr-only">Role</span>
              <select value={role} onChange={(e) => byRole(e.target.value)}>
                <option value="all">Every role</option>
                {roles.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name} ({num(s.roles[r.slug] ?? 0)})
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" />
            </label>
          </div>
          <Search value={q} onChange={setQ} label="Search accounts" placeholder="Name, email or phone" />
        </div>

        {status === 'error' ? (
          <Empty icon="info" title="Couldn't load the accounts" text={error}>
            <Btn icon="retry" onClick={load}>
              Try again
            </Btn>
          </Empty>
        ) : status === 'ready' && !data.users.length ? (
          page > 0 ? (
            <Empty icon="user" title="No more accounts" text="The accounts on this page have changed.">
              <Btn icon="back" onClick={() => setPage(0)}>
                First page
              </Btn>
            </Empty>
          ) : query || show !== 'all' || role !== 'all' ? (
            <Empty icon="user" title="No account matches" text={query ? 'Search part of a name, email or phone number.' : 'Nobody in this list right now.'} />
          ) : (
            <Empty icon="user" title="No accounts yet" text="Everyone who signs up on the website, and every staff account, shows here." />
          )
        ) : (
          <>
            <div className="pn-table-wrap">
              <table className="pn-table pn-access" aria-busy={status === 'loading'}>
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Signed in</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={status === 'loading' ? 'is-loading' : ''}>
                  {status === 'loading' && !data.users.length
                    ? Array.from({ length: 5 }, (_, i) => (
                        <tr key={i} className="pn-row-skel" aria-hidden="true">
                          <td colSpan={COLUMNS}>
                            <span />
                          </td>
                        </tr>
                      ))
                    : data.users.map((u) => (
                        <Row
                          key={u.id}
                          u={u}
                          roles={roles}
                          saving={working.has(u.id)}
                          onRole={(slug) => setAsking({ kind: 'role', user: u, role: slug })}
                          onApprove={() => approve(u)}
                          onEnable={() => enable(u)}
                          onDisable={() => setAsking({ kind: 'disable', user: u })}
                          onDelete={() => setDeleting(u)}
                        />
                      ))}
                </tbody>
              </table>
            </div>

            <nav className="pn-pager" aria-label="Pages of accounts">
              <p className="pn-pager-note" aria-live="polite">
                {data.users.length ? (
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

      <Confirm
        open={asking?.kind === 'role'}
        onClose={() => setAsking(null)}
        onConfirm={() => setRoleOf(asking.user, asking.role)}
        tone={asking?.role === LEAD ? 'danger' : 'primary'}
        action={chosen ? `Make ${article(chosen.name)}` : 'Change role'}
        title={asking?.kind === 'role' && chosen ? `Make ${asking.user.name} ${article(chosen.name)}?` : 'Change the role?'}
        text={asking?.kind === 'role' && chosen ? roleChangeText(asking.user, chosen) : ''}
      />
      <Confirm
        open={asking?.kind === 'disable'}
        onClose={() => setAsking(null)}
        onConfirm={() => disable(asking.user)}
        action="Disable account"
        title={asking?.kind === 'disable' ? `Disable ${asking.user.name}'s account?` : 'Disable the account?'}
        text="They're signed out everywhere at once and can't sign in until you enable the account again. Nothing is deleted."
      />
      <DeleteAccount
        user={deleting}
        onClose={() => setDeleting(null)}
        onDone={removed}
        onDisable={(u) => {
          setDeleting(null);
          setAsking({ kind: 'disable', user: u });
        }}
      />
    </>
  );
}

/* "Editor" → "an editor", "Studio lead" → "a studio lead" */
const article = (name) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name.toLowerCase()}`;

/* what a new role means for the person, in a line */
function roleNote(from, to) {
  if (from.isStaff && !to.isStaff) return 'The photographer panel closes for them on their next click.';
  if (!from.isStaff && to.isStaff) return 'They can open the photographer panel now.';
  return 'Their access changes on their next click.';
}

function roleChangeText(u, r) {
  const lines = [r.description];
  if (u.role.isStaff && !r.isStaff) lines.push('They lose the photographer panel at once.');
  if (!u.role.isStaff && r.isStaff) lines.push('They can open the photographer panel.');
  if (r.slug === LEAD) lines.push("Once they're a studio lead, no studio lead can change or delete their account here.");
  return lines.join(' ');
}

/* one account: who, how to reach them, role, status, the actions */
function Row({ u, roles, saving, onRole, onApprove, onEnable, onDisable, onDelete }) {
  const st = STATUS[u.status] ?? STATUS.active;
  const choices = roles.filter((r) => r.assignable || r.slug === u.role.slug);
  return (
    <tr className={u.status === 'disabled' ? 'is-dim' : ''}>
      <td>
        <span className="pn-person">
          <Avatar name={u.name} photo={u.photo} size={34} />
          <span className="pn-cell-2 pn-cell-clip" title={u.name}>
            <b>
              {u.name}
              {u.isMe && <span className="pn-quiet"> (you)</span>}
            </b>
            <small>Joined {date(u.createdAt)}</small>
          </span>
        </span>
      </td>
      <td>
        <span className="pn-cell-2 pn-cell-clip">
          <a className="pn-cell-link" href={`mailto:${u.email}`} title={u.email}>
            {u.email}
          </a>
          {!u.emailVerified && <small className="is-warn">Email not confirmed</small>}
        </span>
      </td>
      <td className="pn-nowrap">{u.mobile ? <a className="pn-cell-link" href={`tel:${u.mobile}`}>{showMobile(u.mobile)}</a> : <span className="pn-quiet">None</span>}</td>
      <td>
        {u.locked || !choices.length ? (
          <span className="pn-access-role">{u.role.name}</span>
        ) : (
          <label className="pn-select pn-select--sm">
            <span className="sr-only">Role for {u.name}</span>
            <select value={u.role.slug} disabled={saving} onChange={(e) => e.target.value !== u.role.slug && onRole(e.target.value)}>
              {choices.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" />
          </label>
        )}
      </td>
      <td>
        <Badge tone={st.tone}>{st.short}</Badge>
      </td>
      <td className="pn-nowrap">
        <span className="pn-cell-2">
          <span>{when(u.lastLoginAt)}</span>
          {u.lastLoginAt && <small>{date(u.lastLoginAt)}</small>}
        </span>
      </td>
      <td>
        <span className="pn-row-acts">
          {u.locked ? (
            <span className="pn-access-lock" title={LOCKED[u.locked]}>
              <Icon name="lock" />
              <span className="sr-only">{LOCKED[u.locked]}</span>
            </span>
          ) : (
            <>
              {u.status === 'pending' && (
                <Btn size="sm" tone="primary" icon="check" onClick={onApprove} disabled={saving}>
                  Approve
                </Btn>
              )}
              {u.status === 'active' && (
                <Btn size="sm" onClick={onDisable} disabled={saving}>
                  Disable
                </Btn>
              )}
              {u.status === 'disabled' && (
                <Btn size="sm" onClick={onEnable} disabled={saving}>
                  Enable
                </Btn>
              )}
              <IconBtn icon="trash" tone="danger" label={`Delete ${u.name}'s account`} onClick={onDelete} disabled={saving} />
            </>
          )}
        </span>
      </td>
    </tr>
  );
}

/*
  Deleting an account for good: the window says what goes and what stays, and the Delete button only
  wakes once the account's email is typed again; the server checks the email as well. An account with
  package payments on record can't be deleted (the studio keeps them): it offers Disable instead.
*/
function DeleteAccount({ user, onClose, onDone, onDisable }) {
  const open = Boolean(user);
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState('');
  const [keeps, setKeeps] = useState(false); // the server said it has payments to keep
  const [busy, setBusy] = useState(false);
  // the account stays shown while the window closes (user is null by then)
  const last = useRef(user);
  if (user) last.current = user;
  const u = last.current;

  useEffect(() => {
    if (!open) return;
    setTyped('');
    setErr('');
    setKeeps(false);
    setBusy(false);
  }, [open, user?.id]);

  if (!u) return null;
  const matches = typed.trim().toLowerCase() === u.email.toLowerCase();

  async function submit() {
    if (!matches || busy) return;
    setBusy(true);
    setErr('');
    try {
      await deleteAccount(u.id, typed.trim());
      done();
    } catch (x) {
      // already gone (deleted in another tab): the same outcome
      if (x.status === 404) return done();
      setKeeps(x.code === 'HAS_PAYMENTS');
      setErr(problem(x));
      setBusy(false);
    }
  }

  function done() {
    toast({ tone: 'info', title: `${u.name}'s account deleted`, text: 'Signed out everywhere. Their bookings, uploads and the security log keep their history.' });
    onDone(u);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      size="sm"
      className="pn-del"
      title={`Delete ${u.name}'s account?`}
      text="The account is deleted for good. This can't be undone."
      onSubmit={submit}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>
            Keep it
          </Btn>
          {keeps && u.status !== 'disabled' ? (
            <Btn tone="primary" icon="lock" onClick={() => onDisable(u)}>
              Disable instead
            </Btn>
          ) : (
            <Btn tone="danger" type="submit" icon="trash" disabled={!matches || busy} aria-busy={busy}>
              {busy ? 'Deleting…' : 'Delete account'}
            </Btn>
          )}
        </>
      }
    >
      <div className="pn-form">
        <ul className="pn-del-list">
          <li>
            <Icon name="user" />
            {u.name}, {u.role.name.toLowerCase()} · {u.email}
          </li>
          <li>
            <Icon name="leave" />
            Signed out everywhere at once. The email can be used to sign up again
          </li>
          {u.role.isStaff && (
            <li>
              <Icon name="camera" />
              Taken off the crews of their bookings, with their days off
            </li>
          )}
          <li>
            <Icon name="info" />
            Bookings, events, uploaded photos and the security log stay, without their name on them
          </li>
        </ul>
        <Field
          label={
            <>
              Type <b className="pn-del-name">{u.email}</b> to confirm
            </>
          }
          error={err}
          hint={typed && !matches ? 'Not yet: type the email exactly as shown.' : undefined}
        >
          {(p) => (
            <input
              {...p}
              className="pn-input"
              type="email"
              value={typed}
              onChange={(x) => {
                setTyped(x.target.value);
                setErr('');
                setKeeps(false);
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

/* anyone but the studio lead */
function Denied({ seesCodes }) {
  return (
    <>
      <PageHead kicker="Settings" title="Access" />
      <Pane>
        <Empty icon="lock" title="Access denied" text="Only the studio lead can see every account and change roles or status. Ask the studio lead if your role needs to change.">
          {seesCodes && (
            <Link className="pn-btn pn-btn--glass" to="/photographer/access-codes">
              <Icon name="key" />
              <span>Looking for gallery access codes?</span>
            </Link>
          )}
        </Empty>
      </Pane>
    </>
  );
}
