import { Fragment } from 'react';
import Letters from './Letters.jsx';

/* Letter-by-letter text that still wraps between words. `start` is the first letter's index. */
export default function RevealText({ text, start = 0 }) {
  const words = text.split(' ');
  let i = start;
  return words.map((word, k) => {
    const at = i;
    i += word.length + 1;
    return (
      <Fragment key={k}>
        <span className="w">
          <Letters text={word} start={at} />
        </span>
        {k < words.length - 1 ? ' ' : ''}
      </Fragment>
    );
  });
}

/* Several lines, each on its own row, with the letter index running on from line to line. */
export function RevealLines({ lines }) {
  let i = 0;
  return lines.map((line, k) => {
    const at = i;
    i += line.length + 1;
    return (
      <span className="ln" key={k}>
        <RevealText text={line} start={at} />
      </span>
    );
  });
}
