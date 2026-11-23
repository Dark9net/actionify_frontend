/* Splits text into one span per letter. `start` is the index of the first letter in its reveal sequence. */
export default function Letters({ text, start = 0 }) {
  return Array.from(text).map((ch, k) =>
    ch === ' ' ? (
      <span key={k} className="l sp" style={{ '--i': start + k }} aria-hidden="true">
        &nbsp;
      </span>
    ) : (
      <span key={k} className="l" style={{ '--i': start + k }} aria-hidden="true">
        {ch}
      </span>
    )
  );
}
