import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../icons.jsx';
import { Avatar, Badge, Btn, Confirm, Empty, Field, Modal, PageHead, Pane, Search, Segments, Stat } from '../ui.jsx';
import { METHODS, allPayments, changePayment, findBookings, listPayments, recordPayment, refreshPaymentSummary, usePaymentSummary } from '../lib/payments.js';
import { refreshClientSummary } from '../lib/clients.js';
import { NotConnected, can, useSession } from '../../../lib/auth.js';
import { auth } from '../../../data/content.js';
import { saveBlob } from '../../../lib/download.js';
import { toast } from '../lib/toast.js';
import { date, npr, nprShort, num, plural } from '../lib/format.js';

const COLUMNS = 7;
const STATE = {
  requested: { tone: 'pending', label: 'Awaiting' },
  paid: { tone: 'done', label: 'Received' },
  refunded: { tone: 'neutral', label: 'Refunded' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
};
const KIND = { advance: 'Advance', full: 'Full payment' };
const problem = (err) => (err instanceof NotConnected ? auth.offline : err.message);
const rupees = (text) => Number(String(text).replace(/[,\s]/g, ''));

/** how it was paid: the method recorded by hand, or the studio's QR for a request from Clients */
const methodOf = (p) => (p.method ? METHODS[p.method] : p.emailedAt ? 'QR, by email' : 'QR (email not sent)');

/** the date that matters for the row's status */
function when(p) {
  if (p.status === 'refunded' && p.refundedAt) return { label: 'Refunded', at: p.refundedAt };
  if ((p.status === 'paid' || p.status === 'refunded') && p.paidAt) return { label: 'Received', at: p.paidAt };
  return { label: p.method ? 'Recorded' : 'Asked', at: p.createdAt };
}

/*
  Payments: every payment from bookings_payment, in Nepalese rupees. Asked for from Clients (emailed
  with the studio's QR) or recorded here by hand once the money is in (cash on the day, a bank
  transfer, a wallet). What came in over the last 30 days and each of the last six months, what is
  still awaited, what was refunded; mark a payment received, cancel it, refund it, and save the list as
  a CSV. Ten rows at a time, newest first, with a cursor for the next page.
*/
export default function Payments() {
  const session = useSession();
  const sees = can(session.user, 'payment.view');
  const changes = can(session.user, 'payment.manage') || can(session.user, 'client.manage');
  const refunds = can(session.user, 'payment.manage');
  const summary = usePaymentSummary();

  const [show, setShow] = useState('all'); // all | requested | paid | refunded | cancelled
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // q, once typing pauses
  const [cursors, setCursors] = useState([null]);
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ payments: [], nextCursor: null, pageSize: 10 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [refunding, setRefunding] = useState(null);
  const [working, setWorking] = useState(null); // the payment being changed
  const [saving, setSaving] = useState(false);
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
    if (!sees) return;
    const ticket = ++asked.current; // only the latest answer is shown
    setStatus('loading');
    try {
      const d = await listPayments({ status: show, q: query, cursor: cursors[page] });
      if (ticket !== asked.current) return;
      setData(d);
      setStatus('ready');
    } catch (err) {
      if (ticket !== asked.current) return;
      setError(problem(err));
      setStatus('error');
    }
  }, [sees, show, query, cursors, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (sees) refreshPaymentSummary();
  }, [sees]);

  const filter = (v) => {
    setShow(v);
    firstPage();
  };

  function next() {
    if (!data.nextCursor) return;
    setCursors((c) => [...c.slice(0, page + 1), data.nextCursor]);
    setPage((p) => p + 1);
  }

  const refresh = () => {
    refreshPaymentSummary();
    refreshClientSummary();
  };

  async function change(p, to, { quiet = false } = {}) {
    setWorking(p.id);
    try {
      const out = await changePayment(p.id, to);
      setData((d) => ({ ...d, payments: d.payments.map((x) => (x.id === p.id ? out.payment : x)) }));
      refresh();
      if (quiet) return;
      const who = `${p.booking.name}, ${KIND[p.kind].toLowerCase()} for ${p.booking.ref}.`;
      const title =
        to === 'paid'
          ? p.status === 'refunded'
            ? 'Refund undone'
            : p.status === 'cancelled'
              ? 'Payment restored'
              : `${npr(p.amount)} received`
          : to === 'refunded'
            ? `${npr(p.amount)} refunded`
            : to === 'cancelled'
              ? p.method
                ? 'Payment cancelled'
                : 'Payment request cancelled'
              : 'Back to awaiting';
      // undo, unless it would need a permission this person doesn't have
      const back = p.status;
      const undoable = refunds || (to !== 'refunded' && back !== 'refunded');
      toast({
        tone: to === 'paid' ? 'success' : 'info',
        title,
        text: who,
        action: undoable ? { label: 'Undo', run: () => change(out.payment, back, { quiet: true }) } : undefined,
      });
    } catch (e) {
      toast({ tone: 'error', title: "Couldn't change the payment", text: problem(e) });
    } finally {
      setWorking(null);
    }
  }

  async function exportCsv() {
    if (saving) return;
    setSaving(true);
    try {
      const rows = await allPayments({ status: show, q: query });
      const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const day = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '');
      const lines = [
        ['Asked or recorded', 'Received', 'Refunded', 'Booking', 'Client', 'Email', 'Event', 'Event date', 'For', 'Method', 'Amount (NPR)', 'Status', 'Note'],
        ...rows.map((p) => [
          day(p.createdAt),
          day(p.paidAt),
          day(p.refundedAt),
          p.booking.ref,
          p.booking.name,
          p.booking.email,
          p.booking.type,
          p.booking.date,
          KIND[p.kind],
          methodOf(p),
          p.amount.toFixed(2),
          STATE[p.status].label,
          p.note,
        ]),
      ];
      const csv = lines.map((l) => l.map(cell).join(',')).join('\r\n');
      const name = `actionify-payments-${new Date().toISOString().slice(0, 10)}.csv`;
      saveBlob(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }), name);
      toast({ tone: 'success', title: 'Payments saved', text: `${plural(rows.length, 'row')} in ${name}` });
    } catch (e) {
      toast({ tone: 'error', title: "Couldn't save the payments", text: problem(e) });
    } finally {
      setSaving(false);
    }
  }

  if (!sees) {
    return (
      <>
        <PageHead kicker="Business" title="Payments" />
        <Pane>
          <Empty icon="card" title="Payments are for photographers and the studio lead" text="Your role can't see the studio's money. Ask the studio lead if you need it." />
        </Pane>
      </>
    );
  }

  const s = summary;
  const change30 = s.prev30.npr > 0 ? Math.round(((s.last30.npr - s.prev30.npr) / s.prev30.npr) * 100) : null;
  const from = page * data.pageSize + 1;
  const to = page * data.pageSize + data.payments.length;
  const total = query || !s.loaded ? null : show === 'all' ? s.all : s[show].n;
  const loaded = (v) => (s.loaded ? v : '–');

  return (
    <>
      <PageHead
        kicker="Business"
        title="Payments"
        text="What clients pay, in Nepalese rupees: requests sent from Clients with the studio's QR, and payments taken by hand. Mark one received when the money lands, or refund a cancelled booking."
        actions={
          <>
            <Btn icon="download" onClick={exportCsv} disabled={saving || !s.all} aria-busy={saving}>
              {saving ? 'Saving…' : 'Export CSV'}
            </Btn>
            {changes && (
              <Btn tone="primary" icon="plus" onClick={() => setAdding(true)}>
                Record payment
              </Btn>
            )}
          </>
        }
      />

      <div className="pn-stats pn-stats--4">
        <Stat
          icon="card"
          tone="done"
          label="Received, 30 days"
          value={loaded(npr(s.last30.npr))}
          note={s.loaded ? (change30 == null ? plural(s.last30.n, 'payment') : `${change30 >= 0 ? '+' : ''}${change30}% on the 30 days before`) : ' '}
          trend={change30 > 0 ? 'up' : undefined}
        />
        <Stat icon="clock" tone="pending" label="Awaiting" value={loaded(npr(s.requested.npr))} note={s.loaded ? `${plural(s.requested.n, 'request')} not paid yet` : ' '} onClick={() => filter(show === 'requested' ? 'all' : 'requested')} />
        <Stat icon="retry" label="Refunded" value={loaded(npr(s.refunded.npr))} note={s.loaded ? plural(s.refunded.n, 'refund') : ' '} onClick={() => filter(show === 'refunded' ? 'all' : 'refunded')} />
        <Stat icon="trend" label="Received, all time" value={loaded(npr(s.paid.npr))} note={s.loaded ? plural(s.paid.n, 'payment') : ' '} />
      </div>

      <Pane title="Received each month" aside={<span className="pn-pane-note">Last 6 months · NRs.</span>}>
        <MonthChart months={s.months} />
      </Pane>

      <Pane pad={false}>
        <div className="pn-table-tools">
          <Segments
            label="Show payments"
            value={show}
            onChange={filter}
            items={[
              { id: 'all', label: 'All', count: s.all },
              { id: 'requested', label: 'Awaiting', count: s.requested.n },
              { id: 'paid', label: 'Received', count: s.paid.n },
              { id: 'refunded', label: 'Refunded', count: s.refunded.n },
              { id: 'cancelled', label: 'Cancelled', count: s.cancelled.n },
            ]}
          />
          <Search value={q} onChange={setQ} label="Search payments" placeholder="Client, note or BK- reference" />
        </div>

        {status === 'error' ? (
          <Empty icon="info" title="Couldn't load the payments" text={error}>
            <Btn icon="retry" onClick={load}>
              Try again
            </Btn>
          </Empty>
        ) : status === 'ready' && !data.payments.length ? (
          page > 0 ? (
            <Empty icon="card" title="No more payments" text="The rows on this page have changed.">
              <Btn icon="back" onClick={() => setPage(0)}>
                First page
              </Btn>
            </Empty>
          ) : query || show !== 'all' ? (
            <Empty icon="card" title="No payment matches" text={query ? "Search part of a client's name, email or phone, the note, or a whole reference like BK-3F2A9C." : 'Nothing in this list right now.'} />
          ) : (
            <Empty icon="card" title="No payments yet" text="Ask a client for an advance or the full payment from Clients, or record one taken by hand.">
              <Link to="/photographer/clients" className="pn-btn pn-btn--glass">
                <span>Go to Clients</span>
              </Link>
            </Empty>
          )
        ) : (
          <>
            <div className="pn-table-wrap">
              <table className="pn-table" aria-busy={status === 'loading'}>
                <thead>
                  <tr>
                    <th scope="col">Client</th>
                    <th scope="col">For</th>
                    <th scope="col">Date</th>
                    <th scope="col">Method</th>
                    <th scope="col" className="is-num">
                      Amount
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={status === 'loading' ? 'is-loading' : ''}>
                  {status === 'loading' && !data.payments.length
                    ? Array.from({ length: 4 }, (_, i) => (
                        <tr key={i} className="pn-row-skel" aria-hidden="true">
                          <td colSpan={COLUMNS}>
                            <span />
                          </td>
                        </tr>
                      ))
                    : data.payments.map((p) => {
                        const w = when(p);
                        const busy = working === p.id;
                        return (
                          <tr key={p.id} className={p.status === 'refunded' || p.status === 'cancelled' ? 'is-dim' : ''}>
                            <td>
                              <span className="pn-person">
                                <Avatar name={p.booking.name} size={32} />
                                <span className="pn-cell-2 pn-cell-clip" title={[p.booking.name, p.booking.email].filter(Boolean).join(' · ')}>
                                  <b>{p.booking.name}</b>
                                  <small>
                                    {p.booking.ref} · {p.booking.type}
                                  </small>
                                </span>
                              </span>
                            </td>
                            <td>
                              <span className="pn-cell-2 pn-cell-clip" title={p.note || undefined}>
                                <span>{KIND[p.kind]}</span>
                                <small>{p.note || (p.booking.date ? `Event ${date(p.booking.date)}` : '')}</small>
                              </span>
                            </td>
                            <td className="pn-nowrap">
                              <span className="pn-cell-2">
                                <span>{date(w.at)}</span>
                                <small>{w.label}</small>
                              </span>
                            </td>
                            <td>{methodOf(p)}</td>
                            <td className="is-num pn-money">{npr(p.amount)}</td>
                            <td>
                              <Badge tone={STATE[p.status].tone}>{STATE[p.status].label}</Badge>
                            </td>
                            <td>
                              {changes && (
                                <span className="pn-row-acts">
                                  {p.status === 'requested' && (
                                    <>
                                      <Btn size="sm" icon="check" onClick={() => change(p, 'paid')} disabled={busy}>
                                        Mark received
                                      </Btn>
                                      <Btn size="sm" tone="ghost" onClick={() => change(p, 'cancelled')} disabled={busy}>
                                        Cancel
                                      </Btn>
                                    </>
                                  )}
                                  {p.status === 'paid' && p.method && (
                                    <Btn size="sm" tone="ghost" onClick={() => change(p, 'cancelled')} disabled={busy}>
                                      Cancel
                                    </Btn>
                                  )}
                                  {p.status === 'paid' && refunds && (
                                    <Btn size="sm" tone="ghost" onClick={() => setRefunding(p)} disabled={busy}>
                                      Refund
                                    </Btn>
                                  )}
                                  {p.status === 'cancelled' && (
                                    <Btn size="sm" tone="ghost" icon="retry" onClick={() => change(p, p.method ? 'paid' : 'requested')} disabled={busy}>
                                      Restore
                                    </Btn>
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            <nav className="pn-pager" aria-label="Pages of payments">
              <p className="pn-pager-note" aria-live="polite">
                {data.payments.length ? (
                  <>
                    {from}–{to}
                    {total !== null && ` of ${num(total)}`}
                  </>
                ) : (
                  'Loading…'
                )}
              </p>
              <span className="pn-pager-acts">
                <Btn size="sm" icon="back" onClick={() => setPage((n) => n - 1)} disabled={page === 0 || status === 'loading'}>
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

      <RecordPayment
        open={adding}
        onClose={() => setAdding(false)}
        onRecorded={() => {
          refresh();
          // the new payment is the newest: show it at the top of the list
          setShow('all');
          setQ('');
          setQuery('');
          firstPage();
          load();
        }}
      />
      <Confirm
        open={Boolean(refunding)}
        onClose={() => setRefunding(null)}
        title={`Refund ${refunding ? npr(refunding.amount) : ''}?`}
        text={refunding ? `Marks ${refunding.booking.name}'s ${KIND[refunding.kind].toLowerCase()} for ${refunding.booking.ref} as refunded. Send the money back from eSewa, Khalti, Fonepay or the bank as usual.` : ''}
        action="Mark refunded"
        onConfirm={() => change(refunding, 'refunded')}
      />
    </>
  );
}

/* one series (money received), one colour, the value on hover or focus, and a table for screen readers */
function MonthChart({ months }) {
  const [hover, setHover] = useState(null);
  const bars = useMemo(
    () =>
      months.map((m) => {
        const [y, mo] = m.month.split('-').map(Number);
        const at = new Date(y, mo - 1, 1);
        return { ...m, short: at.toLocaleString('en-GB', { month: 'short' }), long: at.toLocaleString('en-GB', { month: 'long', year: 'numeric' }) };
      }),
    [months],
  );
  if (!bars.length) return <div className="pn-chart pn-chart--money pn-chart--empty" aria-hidden="true" />;
  // a round top: 1, 2 or 5 times a power of ten, at least NRs. 10,000
  const max = Math.max(10000, ...bars.map((m) => m.npr));
  const p = 10 ** Math.floor(Math.log10(max));
  const top = [1, 2, 5, 10].map((k) => k * p).find((v) => v >= max);
  const last = bars.length - 1;

  return (
    <div className="pn-chart pn-chart--money">
      <div className="pn-chart-plot">
        <div className="pn-chart-grid" aria-hidden="true">
          {[top, top / 2, 0].map((t) => (
            <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>
              <i>{t ? nprShort(t) : '0'}</i>
            </span>
          ))}
        </div>
        <div className="pn-chart-bars" onPointerLeave={() => setHover(null)}>
          {bars.map((m, i) => (
            <div
              key={m.month}
              className={`pn-col${hover === i ? ' is-on' : ''}${i === last ? ' is-today' : ''}`}
              tabIndex={0}
              aria-label={`${m.long}: ${npr(m.npr)} from ${plural(m.n, 'payment')}`}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <span className="pn-col-bar" style={{ height: m.npr ? `max(4px, ${(m.npr / top) * 100}%)` : 0 }} />
              {hover === i && (
                <span className={`pn-tip${i > 3 ? ' is-left' : ''}`} role="presentation">
                  <b>{npr(m.npr)}</b>
                  <span>{m.long}</span>
                  <span>{plural(m.n, 'payment')}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="pn-chart-x" aria-hidden="true">
        {bars.map((m, i) => (
          <span key={m.month}>{i === last ? 'This month' : m.short}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Money received each month, in Nepalese rupees</caption>
        <tbody>
          {bars.map((m) => (
            <tr key={m.month}>
              <th scope="row">{m.long}</th>
              <td>{npr(m.npr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/*
  A payment already received, recorded by hand: cash on the day, a bank transfer, a wallet payment
  that didn't come from a request. Find the booking (name or BK- reference), then the amount in
  rupees, what it is for and how it was paid. Nobody is emailed.
*/
function RecordPayment({ open, onClose, onRecorded }) {
  const [find, setFind] = useState('');
  const [found, setFound] = useState(null); // null: looking
  const [findError, setFindError] = useState('');
  const [booking, setBooking] = useState(null);
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('advance');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const amountRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFind('');
    setBooking(null);
    setAmount('');
    setKind('advance');
    setMethod('cash');
    setNote('');
    setErr({});
    setBusy(false);
  }, [open]);

  // the bookings matching the search (the newest when it's empty), once typing pauses
  useEffect(() => {
    if (!open) return;
    let live = true;
    const t = setTimeout(
      () => {
        setFound(null);
        setFindError('');
        findBookings(find)
          .then((list) => live && setFound(list))
          .catch((e) => {
            if (!live) return;
            setFound([]);
            setFindError(problem(e));
          });
      },
      find ? 250 : 0,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, find]);

  function choose(b) {
    setBooking(b);
    setErr((o) => ({ ...o, bookingId: undefined }));
    // an advance first; once one is paid, the rest
    setKind(b.paid > 0 ? 'full' : 'advance');
  }

  async function submit() {
    if (busy) return;
    const e = {};
    const value = rupees(amount);
    if (!booking) e.bookingId = 'Choose the booking it is for.';
    if (!amount.trim() || !Number.isFinite(value) || value < 1) e.amount = 'Enter the amount in rupees, like 25000.';
    setErr(e);
    if (Object.keys(e).length) {
      if (e.amount && !e.bookingId) amountRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const out = await recordPayment({ bookingId: booking.id, amount: value, kind, method, note: note.trim() || undefined });
      toast({ tone: 'success', title: `${npr(out.payment.amount)} recorded`, text: `${booking.name}, ${KIND[kind].toLowerCase()} by ${METHODS[method]}, for ${booking.ref}.` });
      onRecorded();
      onClose();
    } catch (x) {
      if (x instanceof NotConnected) setErr({ form: auth.offline });
      else if (x.errors && Object.keys(x.errors).length) setErr(x.errors);
      else setErr({ form: x.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Record payment"
      text="Money already received by hand: cash on the day, a bank transfer, a wallet payment. Nobody is emailed."
      onSubmit={submit}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Btn>
          <Btn tone="primary" type="submit" icon="check" disabled={busy} aria-busy={busy}>
            {busy ? 'Recording…' : 'Record'}
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
        <div className={`pn-field${err.bookingId ? ' has-error' : ''}`}>
          <span className="pn-label" id="pn-rec-b">
            Booking
          </span>
          <Search value={find} onChange={setFind} label="Find the booking" placeholder="Client's name, email, phone or BK- reference" />
          {findError ? (
            <p className="pn-error">{findError}</p>
          ) : found === null ? (
            <p className="pn-hint">Looking…</p>
          ) : !found.length ? (
            <p className="pn-hint">No booking matches. Cancelled bookings can't take a payment.</p>
          ) : (
            <ul className="pn-pick" aria-labelledby="pn-rec-b">
              {found.map((b) => (
                <li key={b.id}>
                  <button type="button" aria-pressed={booking?.id === b.id} onClick={() => choose(b)}>
                    <b>{b.name}</b>
                    <span className="pn-pick-ref">{b.ref}</span>
                    <small>
                      {b.type}
                      {b.date ? ` · ${date(b.date)}` : ''}
                    </small>
                    <small className="pn-pick-pay">
                      {b.paid > 0 ? `${npr(b.paid)} received` : 'Nothing received'}
                      {b.due > 0 ? ` · ${npr(b.due)} awaited` : ''}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {err.bookingId && <p className="pn-error">{err.bookingId}</p>}
        </div>

        <div className="pn-form-row">
          <Field label="Amount (NPR)" error={err.amount} hint="In rupees, like 25000 or 25,000.">
            {(p) => (
              <span className="pn-input-money">
                <span aria-hidden="true">NRs.</span>
                <input
                  {...p}
                  ref={amountRef}
                  className="pn-input"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.replace(/[^\d.,\s]/g, ''));
                    setErr((o) => ({ ...o, amount: undefined }));
                  }}
                  maxLength={16}
                  placeholder="25,000"
                />
              </span>
            )}
          </Field>
          <Field label="Paid by" error={err.method}>
            {(p) => (
              <select {...p} className="pn-input" value={method} onChange={(e) => setMethod(e.target.value)}>
                {Object.entries(METHODS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className={`pn-field${err.kind ? ' has-error' : ''}`}>
          <span className="pn-label" aria-hidden="true">
            For
          </span>
          <Segments
            label="What the payment is for"
            value={kind}
            onChange={setKind}
            items={[
              { id: 'advance', label: 'Advance' },
              { id: 'full', label: 'Full payment' },
            ]}
          />
          {err.kind ? <p className="pn-error">{err.kind}</p> : <p className="pn-hint">{kind === 'advance' ? 'Part of the price, to hold the date.' : 'The whole price, or what is left of it.'}</p>}
        </div>
        <Field label="Note" optional error={err.note}>
          {(p) => <input {...p} className="pn-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="For example: cash on the day" />}
        </Field>
      </div>
    </Modal>
  );
}
