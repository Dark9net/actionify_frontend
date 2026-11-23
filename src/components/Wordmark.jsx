/*
  The studio's wordmark, ACTIONIFY>, as drawn in its logo artwork (traced from it, so the letters are the
  logo's own: the A with its open counter, the O standing over its bar, the closing chevron). It is the
  logo's navy (#02006E) for light grounds; on a dark ground pass `fill` with the cream (#FFF4DA). It is
  sized by its height (CSS `height`; its width follows). The same drawing is public/actionify-wordmark.svg.

    <Wordmark className="hdr-word" />                      one drawing, hidden from screen readers
    <Wordmark title="Actionify" />                         read out as its name
    <Wordmark split letterClass="ft-l" />                  one <span><svg> per letter, to move them one by one
    <Wordmark fill={CREAM} />                              on a dark ground
*/

import { NAVY } from './LogoMark.jsx';

const W = 2645;
const H = 355;
// [letter, left edge, width (each owns half the space to its neighbours), outline]
const GLYPHS = [
  ['A', 0, 312.9, 'M146.1 0.5L291.5 338.5L225.7 338.5L194.5 266.5L97.5 266.5L66.5 338.5L0.6 338.5ZM146 123.5L181.5 214L110.9 214Z'],
  ['C', 312.9, 285.6, 'M472.3 12.5L494.5 12L509.5 13L522.5 15.1L533.5 18.2L543.5 22.2L556.5 29.2L565.5 35.1L577.9 45.5L577.5 118.1L564.5 104.2L552.5 94.2L539.5 86.2L530.5 82.1L514.5 77.1L502.5 75.3L486.5 74.9L473.5 76.1L461.5 79.3L451.5 83.3L438.5 91.1L427.5 100.3L419.3 109.5L411.2 121.5L406.1 131.5L401.3 145.5L398.2 161.5L397.2 182.5L399.2 202.5L403.3 218.5L408.3 230.5L412.2 237.5L422.2 251.5L432.5 261.8L447.5 272L463.5 278.9L476.5 281.8L494.5 282.7L505.5 281.9L516.5 279.8L531.5 274.9L545.5 267.8L551.5 263.9L564.1 253.5L577.7 239.5L577.6 312.5L563.5 323.7L544.5 334.7L534.5 338.9L524.5 341.7L507.5 344.6L487.5 345.7L470.5 344.9L456.5 342.9L443.5 339.9L428.5 334.8L415.5 328.8L403.5 321.7L392.5 313.7L379.5 301.9L370.3 291.5L362.3 280.5L356.1 270.5L348.1 254.5L343.2 241.5L338.2 223.5L335.2 206.5L333.7 187.5L333.7 169.5L335.3 150.5L338.3 133.5L343.4 115.5L348.4 102.5L356.4 86.5L365.3 72.5L374.5 61L389.5 46.2L401.5 37.1L414.5 29.2L429.5 22.3L444.5 17.3L458.5 14.2Z'],
  ['T', 598.5, 255.0, 'M619.5 18.5L832.5 18.5L832.5 78L755 78L755 339L697 339L697 78L619.5 78Z'],
  ['I', 853.5, 190.8, 'M875 19L1023 19L1023 64.5L979 66.5L979 292L1023 292L1023 339L875 339L875 292L919 292L919 66.5L875 64.8Z'],
  ['O', 1044.2, 290.0, 'M1065.1 115.4a111.4 111.4 0 1 0 222.8 0a111.4 111.4 0 1 0 -222.8 0ZM1068.9 295H1284V339H1068.9ZM1122.8 115.5a53.6 53.6 0 1 0 107.3 0a53.6 53.6 0 1 0 -107.3 0Z'],
  ['N', 1334.2, 357.5, 'M1380.5 3.5L1607.5 216.5L1607.5 19L1670.5 19L1670.5 354.7L1444 141.1L1444 338.5L1380.5 338.5Z'],
  ['I', 1691.8, 190.8, 'M1713 18.5L1861.5 18.5L1861.5 66L1820.5 66L1820.5 292L1861.5 292L1861.5 338.5L1713 338.5L1713 292L1754 292L1754 66L1713 66Z'],
  ['F', 1882.5, 221.1, 'M1903.5 19L2088 19L2088 76L1966 76L1966 147.5L2083 147.5L2083 202L2083 202L1966 202L1966 339L1903.5 339Z'],
  ['Y', 2103.6, 324.9, 'M2119.3 18.5L2193.5 18.5L2261.5 147L2330.5 18.5L2404.4 18.5L2295 205.5L2295 339L2229 339L2229 206.5Z'],
  ['>', 2428.5, 216.5, 'M2490.1 64.5L2644.4 181.5L2490.5 299.8L2452.6 249.5L2540 181.5L2452.7 114.5Z'],
];
const ALL = GLYPHS.map((g) => g[3]).join('');

export default function Wordmark({ className = '', title, split = false, letterClass = '', fill = NAVY }) {
  const label = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  if (split) {
    return (
      <span className={className} {...label}>
        {GLYPHS.map(([ch, x, w, d], i) => (
          <span className={letterClass} key={i} data-letter={ch}>
            <svg viewBox={`${x} 0 ${w} ${H}`} width={w} height={H} focusable="false" aria-hidden="true">
              <path fill={fill} fillRule="evenodd" d={d} />
            </svg>
          </span>
        ))}
      </span>
    );
  }
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} width={W} height={H} focusable="false" {...label}>
      <path fill={fill} fillRule="evenodd" d={ALL} />
    </svg>
  );
}
