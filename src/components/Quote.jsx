import RevealText from './RevealText.jsx';
import useReveal from '../hooks/useReveal.js';
import '../styles/sections.css';

/* A photographer's words, set large. tone "night" is the dark band; "paper" sits on the page colour. */
export default function Quote({ quote, tone = 'night' }) {
  const [ref, shown] = useReveal(0.4);
  return (
    <section className={`quote quote--${tone}${shown ? ' in' : ''}`} ref={ref}>
      <figure className="wrap">
        <blockquote>
          <p className="sr-only">{quote.text}</p>
          <p className="q-text display rv" aria-hidden="true">
            <RevealText text={quote.text} />
          </p>
        </blockquote>
        <figcaption className="q-by label rise">{quote.by}</figcaption>
      </figure>
    </section>
  );
}
