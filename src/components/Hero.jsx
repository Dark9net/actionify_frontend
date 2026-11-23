import { useEffect, useRef } from 'react';
import Letters from './Letters.jsx';
import { hero, shots } from '../data/content.js';
import { glideTo } from '../lib/scroll.js';
import '../styles/hero.css';

const STEP = 0.9; // screens of scroll per frame
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pad = (n) => String(n).padStart(2, '0');

function ShotMeta({ shot, index, total, className = '' }) {
  return (
    <figcaption className={`meta ${className}`}>
      <div>
        <div className="meta-title display">{shot.title}</div>
        <div className="meta-specs label">
          <span className="mode">{shot.mode}</span>
          {shot.specs.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>
      <div className="meta-r label">
        <span className="count">
          {pad(index)} / {pad(total)}
        </span>
        <span>{shot.format}</span>
      </div>
    </figcaption>
  );
}

export default function Hero({ ready }) {
  const trackRef = useRef(null);
  const heroRef = useRef(null);
  const mediaRef = useRef(null);
  const fadeRef = useRef(null);
  const slideRefs = useRef([]);
  const total = shots.length + 1;

  useEffect(() => {
    const track = trackRef.current;
    const heroEl = heroRef.current;
    const media = mediaRef.current;
    const fade = fadeRef.current;
    const stage = media.querySelector('.hero-stage');
    const dim = media.querySelector('.hero-dim');
    const slides = slideRefs.current.map((el) => ({
      el,
      img: el.querySelector('.slide-img'),
      meta: el.querySelector('.meta'),
    }));
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The frames follow an eased copy of the scroll position rather than the raw one: each frame the
    // copy closes a share of the gap (FOLLOW), so a notchy wheel or a flick glides instead of jumping.
    const FOLLOW = 0.13;
    let target = 0;
    let cur = 0;
    let raf = 0;
    const scrolled = () => window.scrollY - (track.getBoundingClientRect().top + window.scrollY);

    function render(y) {
      const vh = window.innerHeight;
      const pinned = track.offsetHeight - vh;
      const s = clamp(y, 0, pinned) / vh;

      // frames wipe up one after another; each picture settles from a zoom and rises a little inside
      // its frame as it is uncovered, and the frame underneath drifts up and darkens beneath it
      const e = slides.map((_, i) => ease(clamp((s - i * STEP - 0.06) / (STEP * 0.7))));
      let top = -1;
      slides.forEach(({ el, img, meta }, i) => {
        const k = e[i];
        const out = e[i + 1] ?? 0;
        el.style.visibility = k > 0 ? 'visible' : 'hidden';
        el.style.clipPath = k >= 1 ? 'inset(0)' : `inset(${((1 - k) * 100).toFixed(3)}% 0 0 0)`;
        el.style.setProperty('--out', out.toFixed(3));
        // underneath, the picture drifts up a touch slower than the frame covering it: it only ever
        // grows, so its edges never show (any gap opens at the foot, under the frame sliding over it)
        const scale = 1.16 - 0.16 * k + 0.04 * out;
        img.style.transform = `translateY(${((1 - k) * 9 - out * 5).toFixed(3)}%) scale(${scale.toFixed(4)})`;
        const r = clamp((s - i * STEP - 0.06) / (STEP * 0.7));
        const m = clamp((r - 0.6) / 0.4);
        meta.style.opacity = (m * (1 - out)).toFixed(3);
        meta.style.transform = `translateY(${((1 - m) * 14 - out * 10).toFixed(2)}px)`;
        if (k > 0.9) top = i;
      });

      // the opening frame drifts and darkens the same way under the first event frame
      const out0 = e[0] ?? 0;
      stage.style.transform = `translate(-50%, ${(-50 - out0 * 4).toFixed(3)}%) scale(${(1 + 0.05 * out0).toFixed(4)})`;
      dim.style.opacity = (out0 * 0.55).toFixed(3);

      // once the last frame has been seen, the hero unpins and melts into the paper
      const over = Math.max(0, y - pinned);
      const p = clamp(over / (vh * 0.6));
      media.style.transform = over ? `translateY(${(over * 0.32).toFixed(2)}px)` : '';
      media.style.filter = p > 0 ? `blur(${(6 * p).toFixed(2)}px)` : '';
      fade.style.height = (34 + 66 * p).toFixed(2) + '%';
      fade.style.opacity = p.toFixed(3);

      heroEl.dataset.tone = top >= 0 && p < 0.45 ? 'light' : 'ink';

      // The grain sits over the hero but under the LENS section that follows it. While the hero
      // melts, the grain fades with it, so the melt meets LENS as one clean white. Once the hero is
      // off screen LENS fills the view, and the grain returns unseen for the sections below.
      const onScreen = track.getBoundingClientRect().bottom > 0;
      root.style.setProperty('--grain-k', onScreen ? (1 - p).toFixed(3) : '1');
    }

    function tick() {
      raf = 0;
      const gap = target - cur;
      // settle exactly once close, and jump outright after a long leap (a link to #book, a reload mid-page)
      if (reduce || Math.abs(gap) < 0.5 || Math.abs(gap) > window.innerHeight * 3) cur = target;
      else {
        cur += gap * FOLLOW;
        raf = requestAnimationFrame(tick);
      }
      render(cur);
    }

    function onScroll() {
      target = scrolled();
      if (!raf) raf = requestAnimationFrame(tick);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    target = cur = scrolled();
    render(cur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      root.style.removeProperty('--grain-k');
    };
  }, []);

  return (
    <section
      className="hero-track"
      id="top"
      ref={trackRef}
      style={{ '--n': shots.length, '--step': STEP }}
    >
      <div className={`hero${ready ? ' go' : ''}`} ref={heroRef} data-tone="ink">
        <div className="hero-media" ref={mediaRef}>
          {/* opening frame */}
          <div className="hero-stage">
            <img className="hero-photo" src={hero.photo} alt={hero.photoAlt} fetchPriority="high" />
            <div className="hero-title">
              <div className="hero-eyebrow label">{hero.eyebrow}</div>
              <h1 className="hero-word display" aria-label={hero.title}>
                <Letters text={hero.title} />
              </h1>
            </div>
            <img className="hero-cutout" src={hero.cutout} alt="" aria-hidden="true" />
          </div>

          {/* a soft dark foot so the opening frame's capture details read like every other frame's */}
          <div className="hero-scrim" aria-hidden="true" />
          <ShotMeta shot={hero.shot} index={1} total={total} className="meta-first" />

          <a className="map-pill label" href="#book" onClick={glideTo}>
            <span className="pin" aria-hidden="true">
              <svg viewBox="0 0 14 14">
                <path d="M1.5 4.5h2.4l1-1.5h4.2l1 1.5h2.4v7h-11z" />
                <circle cx="7" cy="7.8" r="2.1" />
              </svg>
            </span>
            <span>{hero.cta}</span>
            <svg className="arrow" viewBox="0 0 14 10" aria-hidden="true">
              <path d="M1 5h12M9 1l4 4-4 4" />
            </svg>
          </a>

          {/* darkens the opening frame as the first event frame slides over it */}
          <div className="hero-dim" aria-hidden="true" />

          {/* event frames */}
          {shots.map((shot, i) => (
            <figure
              className="slide"
              data-o={shot.orientation}
              key={shot.src}
              ref={(el) => {
                if (el) slideRefs.current[i] = el;
              }}
            >
              {shot.orientation === 'portrait' && (
                <img className="slide-bg" src={shot.src} alt="" aria-hidden="true" decoding="async" />
              )}
              <img className="slide-img" src={shot.src} alt={shot.alt} decoding="async" />
              <div className="slide-scrim" />
              <ShotMeta shot={shot} index={i + 2} total={total} />
            </figure>
          ))}
        </div>


        <div className="hero-fade" ref={fadeRef} aria-hidden="true" />
      </div>
    </section>
  );
}
