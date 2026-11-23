import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../icons.jsx';
import { Avatar, Badge, Btn, Empty, Field, Modal, PageHead, Pane, Search, Segments, Stat } from '../ui.jsx';
import { BOOKING_STATUS } from './Bookings.jsx';
import { bookingPayments, getPaymentQr, listClients, refreshClientSummary, requestPayment, setPaymentStatus, useClientSummary } from '../lib/clients.js';
import { METHODS, refreshPaymentSummary } from '../lib/payments.js';
import { bookingTime } from '../lib/bookings.js';
import { NotConnected, can, useSession } from '../../../lib/auth.js';
import { auth } from '../../../data/content.js';
import { toast } from '../lib/toast.js';
import { ago, date, fromToday, npr, num, plural } from '../lib/format.js';

const COLUMNS = 6;
const PAY = {
  none: { label: 'Not charged', tone: 'neutral' },
  requested: { label: 'Awaiting payment', tone: 'pending' },
  advance: { label: 'Advance paid', tone: 'new' },
  paid: { label: 'Fully paid', tone: 'done' },
};
const KIND = { advance: 'Advance', full: 'Full payment' };
const PAYMENT_STATUS = {
  requested: { label: 'Requested', tone: 'pending' },
  paid: { label: 'Received', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};
const problem = (err) => (err instanceof NotConnected ? auth.offline : err.message);

/*
  Clients: every booking (the bookings table), with who booked, where it stands, and what they have
  been asked to pay and have paid (bookings_payment). Ten rows at a time, newest first; each page comes
  with a cursor for the next one, and the cursors already seen are kept so Previous goes back.
  Payment opens a window to ask for an advance or the full payment in rupees: the client is emailed
  the amount with the studio's payment QR (uploaded in Settings); a payment is marked received when
  the money arrives.
*/
export default function Clients() {
  const navigate = useNavigate();
  const session = useSession();
  const manage = can(session.user, 'client.manage');
  const summary = useClientSummary();

  const [show, setShow] = useState('all'); // all | none | requested | advance | paid
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // q, once typing pauses
  const [cursors, setCursors] = useState([null]);
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ clients: [], nextCursor: null, pageSize: 10 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(null); // the row whose Payment window is open
  const [qr, setQr] = useState(undefined); // undefined: not known yet; null: none uploaded
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
    const ticket = ++asked.current; // only the latest answer is shown
    setStatus('loading');
    try {
      const d = await listClients({ payment: show, q: query, cursor: cursors[page] });
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

  useEffect(() => {
    refreshClientSummary();
    getPaymentQr()
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  const filter = (v) => {
    setShow(v);
    firstPage();
  };

  function next() {
    if (!data.nextCursor) return;
    setCursors((c) => [...c.slice(0, page + 1), data.nextCursor]);
    setPage((p) => p + 1);
  }

  // a row whose payments changed: replaced in place, so the page doesn't jump
  function changed(row) {
    setData((d) => ({ ...d, clients: d.clients.map((x) => (x.id === row.id ? row : x)) }));
    setPaying((p) => (p && p.id === row.id ? row : p));
    refreshClientSummary();
    refreshPaymentSummary();
  }

  const from = page * data.pageSize + 1;
  const to = page * data.pageSize + data.clients.length;
  const total = query || !summary.loaded ? null : show === 'all' ? summary.bookings : summary[show === 'paid' ? 'fullyPaid' : show];

  return (
    <>
      <PageHead
        kicker="Business"
        title="Clients"
        text="Everyone who has booked the studio: where each booking stands, and what they have been asked to pay and have paid."
        actions={
          <Btn icon="calendar" onClick={() => navigate('/photographer/bookings')}>
            Bookings
          </Btn>
        }
      />

      <div className="pn-stats pn-stats--4">
        <Stat icon="clients" label="Clients" value={summary.loaded ? num(summary.clients) : '–'} note={summary.loaded ? plural(summary.bookings, 'booking') : ' '} />
        <Stat icon="calendar" label="With a booking ahead" value={summary.loaded ? num(summary.ahead) : '–'} note="From today on" />
        <Stat icon="check" tone="done" label="Received" value={summary.loaded ? npr(summary.paid) : '–'} note={summary.loaded ? `${plural(summary.fullyPaid, 'booking')} fully paid` : ' '} />
        <Stat icon="card" tone="pending" label="Awaiting payment" value={summary.loaded ? npr(summary.due) : '–'} note={summary.loaded ? `${plural(summary.requested, 'booking')} asked` : ' '} onClick={() => filter(show === 'requested' ? 'all' : 'requested')} />
      </div>

      {manage && qr === null && (
        <p className="pn-note pn-note--warn pn-clients-qr-note" role="status">
          <Icon name="qr" />
          <span>
            Upload the studio's payment QR (eSewa, Khalti, Fonepay or your bank's) before asking for payments: every payment email carries it.{' '}
            <Link to="/photographer/settings#payment-qr" className="pn-link">
              Upload it in Settings
            </Link>
          </span>
        </p>
      )}

      <Pane pad={false}>
        <div className="pn-table-tools">
          <Segments
            label="Show clients"
            value={show}
            onChange={filter}
            items={[
              { id: 'all', label: 'All', count: summary.bookings },
              { id: 'none', label: 'Not charged', count: summary.none },
              { id: 'requested', label: 'Awaiting', count: summary.requested },
              { id: 'advance', label: 'Advance paid', count: summary.advance },
              { id: 'paid', label: 'Fully paid', count: summary.fullyPaid },
            ]}
          />
          <Search value={q} onChange={setQ} label="Search clients" placeholder="Name, email, phone or BK- reference" />
        </div>

        {status === 'error' ? (
          <Empty icon="info" title="Couldn't load the clients" text={error}>
            <Btn icon="retry" onClick={load}>
              Try again
            </Btn>
          </Empty>
        ) : status === 'ready' && !data.clients.length ? (
          page > 0 ? (
            <Empty icon="clients" title="No more clients" text="The rows on this page have changed.">
              <Btn icon="back" onClick={() => setPage(0)}>
                First page
              </Btn>
            </Empty>
          ) : query || show !== 'all' ? (
            <Empty icon="clients" title="No client matches" text={query ? 'Search part of a name, email, phone or venue, or a whole reference like BK-3F2A9C.' : 'Nobody in this list right now.'} />
          ) : (
            <Empty icon="clients" title="No clients yet" text="Everyone who books from the website, or is booked by phone on Bookings, shows here." />
          )
        ) : (
          <>
            <div className="pn-table-wrap">
              <table className="pn-table" aria-busy={status === 'loading'}>
                <thead>
                  <tr>
                    <th scope="col">Client</th>
                    <th scope="col">Booking</th>
                    <th scope="col">Status</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Gallery</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={status === 'loading' ? 'is-loading' : ''}>
                  {status === 'loading' && !data.clients.length
                    ? Array.from({ length: 4 }, (_, i) => (
                        <tr key={i} className="pn-row-skel" aria-hidden="true">
                          <td colSpan={COLUMNS}>
                            <span />
                          </td>
                        </tr>
                      ))
                    : data.clients.map((c) => (
                        <tr key={c.id} className={c.status === 'cancelled' ? 'is-dim' : ''}>
                          <td>
                            <span className="pn-person">
                              <Avatar name={c.name} size={34} />
                              <span className="pn-cell-2 pn-cell-clip" title={[c.name, c.email, c.phone].filter(Boolean).join(' · ')}>
                                <b>{c.name}</b>
                                <small>
                                  <a className="pn-cell-link" href={`mailto:${c.email}`}>
                                    {c.email}
                                  </a>
                                  {c.phone ? ` · ${c.phone}` : ''}
                                </small>
                              </span>
                            </span>
                          </td>
                          <td>
                            <span className="pn-cell-2">
                              <span>{c.type}</span>
                              <small>
                                {c.ref} · {date(bookingTime(c))} · {fromToday(bookingTime(c))}
                              </small>
                            </span>
                          </td>
                          <td>
                            <Badge tone={BOOKING_STATUS[c.status].tone}>{BOOKING_STATUS[c.status].short}</Badge>
                          </td>
                          <td>
                            <span className="pn-cell-2">
                              <span>
                                <Badge tone={PAY[c.payment.state].tone}>{PAY[c.payment.state].label}</Badge>
                              </span>
                              <small>
                                {c.payment.paid > 0 && `${npr(c.payment.paid)} received`}
                                {c.payment.paid > 0 && c.payment.due > 0 && ' · '}
                                {c.payment.due > 0 && <span className="is-warn">{npr(c.payment.due)} due</span>}
                                {!c.payment.paid && !c.payment.due && 'Nothing asked yet'}
                              </small>
                            </span>
                          </td>
                          <td>
                            {c.event ? (
                              <Link to={`/photographer/uploads/${c.event.id}`} className="pn-cell-link">
                                <Badge tone={c.event.hasCode ? 'done' : 'neutral'}>{c.event.hasCode ? 'Open' : 'Folder'}</Badge>
                              </Link>
                            ) : (
                              <span className="pn-quiet">None</span>
                            )}
                          </td>
                          <td>
                            <span className="pn-row-acts">
                              <Btn size="sm" tone={manage && c.status !== 'cancelled' ? 'primary' : 'glass'} icon="card" onClick={() => setPaying(c)}>
                                {manage && c.status !== 'cancelled' ? 'Payment' : 'Payments'}
                              </Btn>
                            </span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            <nav className="pn-pager" aria-label="Pages of clients">
              <p className="pn-pager-note" aria-live="polite">
                {data.clients.length ? (
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

      <PaymentWindow client={paying} manage={manage} refunds={can(session.user, 'payment.manage')} hasQr={Boolean(qr)} onClose={() => setPaying(null)} onChanged={changed} />
    </>
  );
}

/*
  One booking's payments: ask for an advance or the full payment (emailed to the client with the
  studio's QR), and the history, where a request is marked received or cancelled.
*/
function PaymentWindow({ client, manage, refunds, hasQr, onClose, onChanged }) {
  const [list, setList] = useState(null); // null: loading
  const [loadError, setLoadError] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('advance');
  const [note, setNote] = useState('');
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState(null); // the payment being changed
  const amountRef = useRef(null);
  const id = client?.id;
  const canAsk = manage && client && client.status !== 'cancelled';

  useEffect(() => {
    if (!id) return;
    let live = true;
    setList(null);
    setLoadError('');
    setErr({});
    setAmount('');
    setNote('');
    setBusy(false);
    bookingPayments(id)
      .then((d) => {
        if (!live) return;
        setList(d.payments);
        // an advance first; once one is paid, the full payment
        setKind(d.client.payment.advancePaid ? 'full' : 'advance');
      })
      .catch((e) => live && setLoadError(problem(e)));
    return () => {
      live = false;
    };
  }, [id]);

  async function send() {
    if (busy || !canAsk) return;
    const value = Number(amount.replace(/[,\s]/g, ''));
    if (!amount.trim() || !Number.isFinite(value) || value < 1) {
      setErr({ amount: 'Enter the amount in rupees, like 25000.' });
      amountRef.current?.focus();
      return;
    }
    if (!hasQr) {
      setErr({ form: "Upload the studio's payment QR in Settings first: every payment email carries it." });
      return;
    }
    setBusy(true);
    setErr({});
    try {
      const out = await requestPayment(client.id, { amount: value, kind, note: note.trim() || undefined });
      setList((l) => [out.payment, ...(l || [])]);
      onChanged(out.client);
      setAmount('');
      setNote('');
      if (out.email.sent) {
        toast({ tone: 'success', title: `${npr(out.payment.amount)} asked of ${client.name}`, text: `Emailed to ${out.email.to} with the studio's payment QR.` });
      } else {
        toast({
          tone: 'error',
          title: `The email to ${out.email.to} wasn't sent`,
          text: 'The request is saved, but the mail service failed. Send the amount and QR from your own email.',
          action: { label: 'Write to them', run: () => window.open(`mailto:${out.email.to}?subject=${encodeURIComponent(`Payment for ${client.ref}`)}`) },
        });
      }
    } catch (e) {
      if (e instanceof NotConnected) setErr({ form: auth.offline });
      else if (e.errors && Object.keys(e.errors).length) setErr(e.errors);
      else setErr({ form: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function change(p, status) {
    setWorking(p.id);
    try {
      const out = await setPaymentStatus(client.id, p.id, status);
      setList((l) => l.map((x) => (x.id === p.id ? out.payment : x)));
      onChanged(out.client);
      toast({
        tone: status === 'paid' ? 'success' : 'info',
        title:
          status === 'paid'
            ? p.status === 'refunded'
              ? 'Refund undone'
              : `${npr(p.amount)} received`
            : p.status === 'cancelled'
              ? 'Payment restored'
              : status === 'cancelled'
                ? 'Payment cancelled'
              : status === 'refunded'
                ? `${npr(p.amount)} refunded`
                : 'Back to requested',
        text: `${KIND[p.kind]} for ${client.ref}.`,
      });
    } catch (e) {
      toast({ tone: 'error', title: "Couldn't change the payment", text: problem(e) });
    } finally {
      setWorking(null);
    }
  }

  const pay = client?.payment;
  return (
    <Modal
      open={Boolean(client)}
      onClose={onClose}
      size="lg"
      title={client ? `Payment · ${client.name}` : ''}
      text={client ? `${client.ref} · ${client.type} · ${date(bookingTime(client))} · ${client.venue}` : ''}
      onSubmit={canAsk ? send : undefined}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>
            Close
          </Btn>
          {canAsk && (
            <Btn tone="primary" type="submit" icon="send" disabled={busy} aria-busy={busy}>
              {busy ? 'Sending…' : 'Send payment request'}
            </Btn>
          )}
        </>
      }
    >
      {client && (
        <div className="pn-pay">
          <dl className="pn-pay-sum">
            <div>
              <dt>Received</dt>
              <dd>{npr(pay.paid)}</dd>
            </div>
            <div>
              <dt>Awaiting</dt>
              <dd className={pay.due > 0 ? 'is-warn' : ''}>{npr(pay.due)}</dd>
            </div>
            <div>
              <dt>State</dt>
              <dd>
                <Badge tone={PAY[pay.state].tone}>{PAY[pay.state].label}</Badge>
              </dd>
            </div>
          </dl>

          {canAsk && (
            <div className="pn-form pn-pay-form">
              {err.form && (
                <p className="pn-note pn-note--warn" role="alert">
                  <Icon name="info" />
                  {err.form}
                </p>
              )}
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
              </div>
              <Field label="Note to the client" optional error={err.note}>
                {(p) => <input {...p} className="pn-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="For example: 50% advance to hold the date" />}
              </Field>
              <p className="pn-note">
                <Icon name="send" />
                <span>
                  {client.name} gets an email at {client.email}: “We charge {amount.trim() && Number(amount.replace(/[,\s]/g, '')) >= 1 ? npr(Number(amount.replace(/[,\s]/g, ''))) : 'NRs. …'} for your event photography or editing”, with the studio's payment QR and {client.ref} to write in the remarks.
                </span>
              </p>
            </div>
          )}

          <h3 className="pn-pay-h">Payments</h3>
          {loadError ? (
            <p className="pn-note pn-note--warn" role="alert">
              <Icon name="info" />
              {loadError}
            </p>
          ) : list === null ? (
            <p className="pn-quiet">Loading…</p>
          ) : !list.length ? (
            <p className="pn-quiet">Nothing asked yet.</p>
          ) : (
            <ul className="pn-pay-list">
              {list.map((p) => (
                <li key={p.id} className={p.status === 'cancelled' || p.status === 'refunded' ? 'is-dim' : ''}>
                  <span className="pn-pay-what">
                    <b>{npr(p.amount)}</b>
                    <small>
                      {KIND[p.kind]} · {p.method ? `${METHODS[p.method]}, recorded` : 'asked'} {ago(p.createdAt)}
                      {p.requestedBy ? ` by ${p.requestedBy.name}` : ''}
                      {p.method ? '' : p.emailedAt ? ` · emailed to ${p.emailTo}` : ' · email not sent'}
                      {(p.status === 'paid' || p.status === 'refunded') && p.paidAt && !p.method ? ` · received ${date(p.paidAt)}${p.paidBy ? ` (${p.paidBy.name})` : ''}` : ''}
                      {p.status === 'refunded' && p.refundedAt ? ` · refunded ${date(p.refundedAt)}${p.refundedBy ? ` (${p.refundedBy.name})` : ''}` : ''}
                    </small>
                    {p.note && <small className="pn-pay-note">“{p.note}”</small>}
                  </span>
                  <Badge tone={PAYMENT_STATUS[p.status].tone}>{PAYMENT_STATUS[p.status].label}</Badge>
                  {manage && (
                    <span className="pn-pay-acts">
                      {p.status === 'requested' && (
                        <>
                          <Btn size="sm" icon="check" onClick={() => change(p, 'paid')} disabled={working === p.id}>
                            Mark received
                          </Btn>
                          <Btn size="sm" tone="ghost" onClick={() => change(p, 'cancelled')} disabled={working === p.id}>
                            Cancel
                          </Btn>
                        </>
                      )}
                      {(p.status === 'cancelled' || p.status === 'paid') && (
                        <Btn
                          size="sm"
                          tone="ghost"
                          icon={p.status === 'paid' && p.method ? undefined : 'retry'}
                          onClick={() => change(p, p.status === 'paid' ? (p.method ? 'cancelled' : 'requested') : p.method ? 'paid' : 'requested')}
                          disabled={working === p.id}
                        >
                          {p.status === 'cancelled' ? 'Restore' : p.method ? 'Cancel' : 'Undo'}
                        </Btn>
                      )}
                      {p.status === 'paid' && refunds && (
                        <Btn size="sm" tone="ghost" onClick={() => change(p, 'refunded')} disabled={working === p.id}>
                          Refund
                        </Btn>
                      )}
                      {p.status === 'refunded' && refunds && (
                        <Btn size="sm" tone="ghost" icon="retry" onClick={() => change(p, 'paid')} disabled={working === p.id}>
                          Undo refund
                        </Btn>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
