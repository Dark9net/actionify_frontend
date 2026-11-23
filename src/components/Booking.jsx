import { useEffect, useRef, useState } from 'react';
import BookingSheet from './BookingSheet.jsx';
import { booking } from '../data/content.js';
import '../styles/booking.css';

const D = 2100;
const E1 = 'cubic-bezier(.5,0,.3,1)';
const E2 = 'cubic-bezier(.45,0,.3,1)';
const E3 = 'cubic-bezier(.4,0,.2,1)';
const ENAV = 'cubic-bezier(.2,.8,.2,1)';

/* ~15 long white S-curves sweeping up and to the right (seeded, so they never change) */
const STROKES = (() => {
  let seed = 1973;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const N = 15;
  return Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);
    const x0 = -260 + t * 1100 + (rnd() - 0.5) * 120;
    const y0 = 1040 + (rnd() - 0.5) * 140;
    const x1 = 520 + t * 1180 + (rnd() - 0.5) * 120;
    const y1 = -160 + (rnd() - 0.5) * 140;
    const bend = 260 + rnd() * 240;
    const c1x = x0 + bend + rnd() * 120;
    const c1y = y0 - 300 - rnd() * 160;
    const c2x = x1 - bend - rnd() * 120;
    const c2y = y1 + 300 + rnd() * 160;
    const f = (n) => n.toFixed(1);
    return {
      d: `M${f(x0)} ${f(y0)} C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(x1)} ${f(y1)}`,
      w: (1.2 + rnd() * 2.7).toFixed(2),
      o: (0.55 + rnd() * 0.3).toFixed(2),
    };
  });
})();

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const LEAD = 0.3; // the reveal starts while the section's top is still this far (in screens) below the top
const SPAN = 0.8; // and is complete after this share of the pinned scroll; the rest holds the finished frame

export default function Booking({ ready }) {
  const trackRef = useRef(null);
  const root = useRef(null);
  // replay() resolves when the pill has closed and opened again; null means it is already running
  const api = useRef({ replay: () => Promise.resolve(true) });
  const [sound, setSound] = useState(false);
  const [done, setDone] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // the button plays the effect first; the booking form follows once it has finished
  function onBook() {
    const run = api.current.replay();
    if (!run) return;
    run.then((alive) => {
      if (alive) setFormOpen(true);
    });
  }

  useEffect(() => {
    if (!ready) return;
    const track = trackRef.current;
    const el = root.current;
    const q = (s) => el.querySelector(s);
    const paper = q('.bk-paper');
    const foot = q('.bk-foot');
    const rule = q('.bk-rule');
    const row = q('.bk-row');
    const pill = q('.bk-pill');
    const hair = q('.bk-hair');
    const video = q('video');
    const icons = Array.from(el.querySelectorAll('.bk-ic'));
    const phoneMQ = window.matchMedia('(max-width: 720px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setDone(true);
      video.pause();
      return;
    }

    let anims = [];
    let busy = false;
    let alive = true;
    let cur = 0; // where the timeline is (ms)
    let target = 0; // where the scroll says it should be
    let raf = 0;
    const opts = { duration: D, fill: 'both' };

    function build() {
      anims.forEach((a) => a.cancel());
      anims = [];
      const fs = parseFloat(getComputedStyle(row).fontSize);
      const px = (v) => (v * fs).toFixed(3) + 'px';

      if (!phoneMQ.matches) {
        // hairline → slit → circle → stadium
        anims.push(pill.animate([
          { width: px(0.012), offset: 0 },
          { width: px(0.012), offset: 0.14, easing: E1 },
          { width: px(0.16), offset: 0.3, easing: E2 },
          { width: px(1.81), offset: 0.58, easing: E3 },
          { width: px(3.62), offset: 1 },
        ], opts));
        anims.push(pill.animate([
          { clipPath: 'inset(50% 0 50% 0)', offset: 0, easing: E1 },
          { clipPath: 'inset(0 0 0 0)', offset: 0.14 },
          { clipPath: 'inset(0 0 0 0)', offset: 1 },
        ], opts));
        anims.push(row.animate([
          { gap: px(0.026), offset: 0 },
          { gap: px(0.026), offset: 0.14, easing: E2 },
          { gap: px(0.05), offset: 0.58, easing: E3 },
          { gap: px(0.085), offset: 1 },
        ], opts));
      } else {
        const H = (el.clientWidth - 40) / 1.85;
        anims.push(pill.animate([
          { height: '1.5px', offset: 0 },
          { height: '1.5px', offset: 0.14, easing: E1 },
          { height: (H * 0.1).toFixed(2) + 'px', offset: 0.3, easing: E2 },
          { height: (H * 0.55).toFixed(2) + 'px', offset: 0.58, easing: E3 },
          { height: H.toFixed(2) + 'px', offset: 1 },
        ], opts));
        anims.push(pill.animate([
          { clipPath: 'inset(0 50% 0 50%)', offset: 0, easing: E1 },
          { clipPath: 'inset(0 0 0 0)', offset: 0.14 },
          { clipPath: 'inset(0 0 0 0)', offset: 1 },
        ], opts));
        anims.push(row.animate([
          { gap: px(0.03), offset: 0 },
          { gap: px(0.03), offset: 0.14, easing: E2 },
          { gap: px(0.06), offset: 0.58, easing: E3 },
          { gap: px(0.1), offset: 1 },
        ], opts));
      }

      // the grey line fades as the picture appears (the overlay fades, never the video)
      anims.push(hair.animate([
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.14, easing: 'ease-in-out' },
        { opacity: 0, offset: 0.3 },
        { opacity: 0, offset: 1 },
      ], opts));
      anims.push(paper.animate([
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.45, easing: 'ease-in-out' },
        { opacity: 1, offset: 0.78 },
        { opacity: 1, offset: 1 },
      ], opts));
      anims.push(foot.animate([
        { transform: 'translateY(160%)', offset: 0 },
        { transform: 'translateY(160%)', offset: 0.52, easing: ENAV },
        { transform: 'translateY(0%)', offset: 0.9 },
        { transform: 'translateY(0%)', offset: 1 },
      ], opts));
      anims.push(rule.animate([
        { transform: 'scaleX(0)', offset: 0 },
        { transform: 'scaleX(0)', offset: 0.4, easing: E3 },
        { transform: 'scaleX(1)', offset: 0.95 },
        { transform: 'scaleX(1)', offset: 1 },
      ], opts));
      icons.forEach((ic) =>
        anims.push(ic.animate([
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: 0.8, easing: 'ease-out' },
          { opacity: 0.85, offset: 1 },
        ], opts))
      );
      anims.forEach((a) => a.pause());
    }

    const seek = (t) => anims.forEach((a) => { a.currentTime = t; });
    const play = (rate) => {
      anims.forEach((a) => { a.playbackRate = rate; a.play(); });
      return anims[0].finished;
    };

    /*
      The scroll drives the reveal. The section pins to the screen; as the visitor reads on,
      the line opens to a slit, a circle, then the full showreel pill, and the paper, the caption
      and the button follow. Scrolling back closes it again. The timeline eases toward the
      scroll position, so a wheel's steps read as one smooth move.
    */
    function progress() {
      const vh = window.innerHeight;
      const top = track.getBoundingClientRect().top;
      const pinned = track.offsetHeight - vh;
      return clamp((vh * LEAD - top) / (pinned * SPAN + vh * LEAD));
    }
    function tick() {
      raf = 0;
      if (busy) return;
      const diff = target - cur;
      if (Math.abs(diff) < 0.5) cur = target;
      else {
        cur += diff * 0.16;
        raf = requestAnimationFrame(tick);
      }
      seek(cur);
    }
    function onScroll() {
      target = progress() * D;
      if (!raf && !busy) raf = requestAnimationFrame(tick);
    }

    build();
    cur = target = progress() * D; // arriving mid-page (a reload, a #book link) starts where the page is
    seek(cur);
    window.addEventListener('scroll', onScroll, { passive: true });

    // the button: collapse back to the hairline, then open again
    api.current.replay = () => {
      if (busy) return null;
      busy = true;
      cancelAnimationFrame(raf);
      raf = 0;
      // a resize cancels the timeline: that still counts as finished
      const free = () => {
        busy = false;
        anims.forEach((a) => { a.pause(); a.playbackRate = 1; });
        cur = D;
        seek(D); // it stays open; the next scroll takes over from here
        return alive;
      };
      return play(-1).then(() => play(1)).then(free, free);
    };

    // the keyboard never waits for the reveal: focus arriving inside jumps to the finished frame
    const anchor = track.querySelector('.bk-anchor');
    function onFocusIn() {
      if (busy || cur >= D) return;
      window.scrollTo({ top: anchor.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
      cancelAnimationFrame(raf);
      raf = 0;
      cur = target = D;
      seek(D);
    }
    el.addEventListener('focusin', onFocusIn);

    // resize: the sizes are in pixels, so the timeline is rebuilt where it was
    let rt;
    let lastW = window.innerWidth;
    function onResize() {
      if (window.innerWidth === lastW && phoneMQ.matches) return; // mobile URL-bar resizes
      lastW = window.innerWidth;
      clearTimeout(rt);
      rt = setTimeout(() => {
        build();
        seek(busy ? D : cur);
        onScroll();
      }, 80);
    }
    window.addEventListener('resize', onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      el.removeEventListener('focusin', onFocusIn);
      clearTimeout(rt);
      window.removeEventListener('resize', onResize);
      anims.forEach((a) => a.cancel());
      api.current.replay = () => Promise.resolve(true);
    };
  }, [ready]);

  const [drop, rest] = [booking.blurb[0], booking.blurb.slice(1)];

  return (
    <section className="bk-track" ref={trackRef} aria-label="The reel">
      {/* in-page links to #book land here, where the reveal is complete */}
      <span className="bk-anchor" id="book" aria-hidden="true" />
    <div className={`booking${done ? ' done' : ''}`} ref={root}>
      <div className="bk-paper" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="none">
          {STROKES.map((s) => (
            <path
              key={s.d}
              d={s.d}
              fill="none"
              stroke="#fff"
              strokeWidth={s.w}
              strokeOpacity={s.o}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      <div className="bk-hero">
        <h2 className="bk-row" aria-label={booking.word.join('')}>
          <span className="bk-half a" aria-hidden="true">{booking.word[0]}</span>
          <div className="bk-pill">
            <video
              src={booking.video}
              poster={booking.poster}
              style={{ backgroundImage: `url(${booking.poster})` }}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label={booking.videoAlt}
            />
            <div className="bk-hair" />
            <span className="bk-ic left" aria-hidden="true">
              {/* aperture */}
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3l4.5 7.8M21 12h-9M16.5 19.8L12 12M7.5 19.8L12 12M3 12h9M7.5 4.2L12 12" />
              </svg>
            </span>
            <button
              className={`bk-ic right${sound ? '' : ' off'}`}
              type="button"
              aria-label="Toggle sound"
              aria-pressed={sound}
              onClick={() => setSound((v) => !v)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M4 9.5v5h3.6L13 19V5L7.6 9.5H4z" />
                <path className="wave" d="M16 9.4a4 4 0 0 1 0 5.2" />
                <path className="wave" d="M18.6 6.8a7.5 7.5 0 0 1 0 10.4" />
              </svg>
            </button>
          </div>
          <span className="bk-half b" aria-hidden="true">{booking.word[1]}</span>
        </h2>
      </div>

      <footer className="bk-foot">
        <p className="bk-blurb">
          <span className="dc">{drop}</span>
          {rest}
        </p>
        <div className="bk-foot-row">
          <div className="bk-rule" />
          <button className="bk-cta glass-btn" type="button" aria-haspopup="dialog" onClick={onBook}>
            {booking.cta}
          </button>
        </div>
      </footer>

      <BookingSheet open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
    </section>
  );
}
