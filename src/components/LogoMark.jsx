/*
  The studio's logo: the rising arrow, navy (#02006E) on its cream tile (#FFF4DA), as in the logo artwork.
  The arrow is three triangles: the left wing, the stem, the right wing (stem and right wing meet along an
  edge, the left wing only at the tip). Sized by CSS width and height; the tile keeps it legible on any
  background. The same drawing is public/actionify-logo.svg (and the arrow alone, actionify-mark.svg).

    <LogoMark className="hdr-mark" />          decorative (the link around it carries the name)
    <LogoMark title="Actionify" />             read out as its name
    <LogoMark bare />                          the arrow alone, on a transparent ground (the site header)
*/

export const NAVY = '#02006E';
export const CREAM = '#FFF4DA';

/* the arrow, in its own units (2645 × 2763) */
export const ARROW = ['M1274 3L0 1441L820 1084Z', 'M1277 0L1414 1080L619 2763Z', 'M1277 0L2645 1870L1414 1080Z'];

export default function LogoMark({ className = '', title, bare = false }) {
  const label = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  if (bare) {
    return (
      <svg className={className} viewBox="0 0 2645 2763" width="2645" height="2763" focusable="false" {...label}>
        <g fill={NAVY}>
          {ARROW.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 1000 1000" width="1000" height="1000" focusable="false" {...label}>
      <rect width="1000" height="1000" rx="220" fill={CREAM} />
      <rect x="6" y="6" width="988" height="988" rx="214" fill="none" stroke={NAVY} strokeOpacity=".12" strokeWidth="12" />
      <g transform="translate(156.15 140.81) scale(.26)" fill={NAVY}>
        {ARROW.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
