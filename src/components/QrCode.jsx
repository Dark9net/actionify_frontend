/*
  An illustrative QR code (it does not encode a real address): three finder squares, the timing rows
  and a fixed scatter of modules, 25 × 25. Each dark module carries its distance from the centre as --d,
  so the code draws itself outward when its section arrives.
*/
const N = 25;
const QR = (() => {
  const on = [];
  const finder = (x0, y0) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (edge || core) on.push([x0 + x, y0 + y]);
      }
  };
  finder(0, 0);
  finder(N - 7, 0);
  finder(0, N - 7);
  const reserved = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  for (let i = 8; i < N - 8; i += 2) on.push([i, 6], [6, i]);
  // the small alignment square
  for (let y = 16; y <= 20; y++)
    for (let x = 16; x <= 20; x++) if (x === 16 || x === 20 || y === 16 || y === 20 || (x === 18 && y === 18)) on.push([x, y]);
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (reserved(x, y) || x === 6 || y === 6 || (x >= 16 && x <= 20 && y >= 16 && y <= 20)) continue;
      if (rand() < 0.48) on.push([x, y]);
    }
  return on.map(([x, y]) => ({ x, y, d: Math.hypot(x - 12, y - 12) }));
})();

export default function QrCode({ className = '' }) {
  return (
    <svg className={`qr ${className}`} viewBox={`-2 -2 ${N + 4} ${N + 4}`} aria-hidden="true">
      <rect x="-2" y="-2" width={N + 4} height={N + 4} rx="2.4" className="qr-bg" />
      {QR.map(({ x, y, d }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" style={{ '--d': d.toFixed(2) }} />
      ))}
    </svg>
  );
}
