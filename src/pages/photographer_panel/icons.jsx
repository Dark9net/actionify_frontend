/* The panel's line icons: one 24px grid, 1.6 stroke, round ends. <Icon name="upload" /> */
const P = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.6" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.6" />
      <rect x="3.5" y="14.5" width="7" height="6" rx="1.6" />
    </>
  ),
  upload: <path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />,
  gridMini: (
    <>
      {[4.5, 9, 13.5, 18].flatMap((y) => [4.5, 9, 13.5, 18].map((x) => <rect key={x + '-' + y} x={x} y={y} width="1.6" height="1.6" rx=".5" />))}
    </>
  ),
  gridSmall: (
    <>
      <rect x="4" y="4" width="4.2" height="4.2" rx="1" />
      <rect x="9.9" y="4" width="4.2" height="4.2" rx="1" />
      <rect x="15.8" y="4" width="4.2" height="4.2" rx="1" />
      <rect x="4" y="9.9" width="4.2" height="4.2" rx="1" />
      <rect x="9.9" y="9.9" width="4.2" height="4.2" rx="1" />
      <rect x="15.8" y="9.9" width="4.2" height="4.2" rx="1" />
      <rect x="4" y="15.8" width="4.2" height="4.2" rx="1" />
      <rect x="9.9" y="15.8" width="4.2" height="4.2" rx="1" />
      <rect x="15.8" y="15.8" width="4.2" height="4.2" rx="1" />
    </>
  ),
  gridLarge: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </>
  ),
  video: (
    <>
      <rect x="3.5" y="6" width="12" height="12" rx="2.2" />
      <path d="M15.5 10.2l5-2.7v9l-5-2.7" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  folder: <path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2.2h7.4a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  folderUp: (
    <>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2.2h7.4a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <path d="M12 16.5v-5.5M9.6 13.2L12 10.8l2.4 2.4" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l1.8 1.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0M15.5 5.3a3.4 3.4 0 0 1 0 6.4M17.5 14.2a6 6 0 0 1 3.7 5.3" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
      <path d="M3 9.8h18M6.5 15h4" />
    </>
  ),
  camera: (
    <>
      <path d="M3.5 8.5a2 2 0 0 1 2-2h2.2L9.3 4.5h5.4l1.6 2h2.2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.6" />
    </>
  ),
  storage: (
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="2.8" />
      <path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v5M12 16.2v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.2M12 7.8v.1" />
    </>
  ),
  retry: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.8" />,
  chevron: <path d="M9 5.5l6.5 6.5L9 18.5" />,
  chevronDown: <path d="M5.5 9l6.5 6.5L18.5 9" />,
  back: <path d="M19 12H5M11 5.5L4.5 12 11 18.5" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="18.5" cy="12" r="1.3" />
    </>
  ),
  edit: <path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5zM13.8 7l3.2 3.2" />,
  trash: <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v6M14 11v6" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <path d="M14 14h2.5v2.5H14zM18 18h2M20 14v2M14 20h2" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
      <circle cx="9" cy="9.5" r="1.8" />
      <path d="M4 17.5l4.8-4.8 3.7 3.7 2.8-2.8 4.7 4.7" />
    </>
  ),
  move: <path d="M4 12h12M12.5 7.5L17 12l-4.5 4.5M20 5v14" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  // three joined points: share a gallery
  share: (
    <>
      <circle cx="17.5" cy="5.5" r="2.5" />
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
      <path d="M8.7 10.7l6.6-3.9M8.7 13.3l6.6 3.9" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
      <path d="M4.5 7l7.5 6 7.5-6" />
    </>
  ),
  external: <path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  leave: <path d="M14 4.5h4.5v15H14M10 8l-4 4 4 4M6 12h9" />,
  download: <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  send: <path d="M20.5 3.5L10 14M20.5 3.5l-6.5 17-4-6.5-6.5-4z" />,
  cloud: <path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.6a4 4 0 0 1-.5 9.9z" />,
  trend: <path d="M3.5 16.5l5.5-5.5 4 4 7.5-7.5M15 7.5h5.5V13" />,
  flag: <path d="M5.5 21V4.5M5.5 5h11l-2 4 2 4h-11" />,
  pause: <path d="M9 6.5v11M15 6.5v11" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  bell: <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14zM10 20.5h4" />,
  // a note: audio files
  audio: (
    <>
      <path d="M9.5 17.5V5.5l10-2v12" />
      <circle cx="7" cy="17.5" r="2.5" />
      <circle cx="17" cy="15.5" r="2.5" />
    </>
  ),
  // a pen nib on a curve: vector and design files
  graphic: (
    <>
      <path d="M12 3.5l5.5 8-5.5 9-5.5-9z" />
      <path d="M12 11.5v3" />
      <circle cx="12" cy="11" r=".6" />
      <path d="M3.5 20.5c3-1.5 5-1.5 8.5 0s5.5 1.5 8.5 0" />
    </>
  ),
  // a cube: 3D models
  model: (
    <>
      <path d="M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7z" />
      <path d="M4.5 7.7L12 12l7.5-4.3M12 12v8.5" />
    </>
  ),
  // a shield with a tick: files are checked before they go
  shield: (
    <>
      <path d="M12 3.5l7 2.6v5.3c0 4.3-2.9 7.6-7 9.1-4.1-1.5-7-4.8-7-9.1V6.1z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  // a panel with its rail; the arrow points the way the sidebar will go (flipped in CSS when folded)
  sidebar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M9 4.5v15M15.5 9.5L13 12l2.5 2.5" />
    </>
  ),
};

export default function Icon({ name, className = '', size }) {
  return (
    <svg className={`ic ${className}`} viewBox="0 0 24 24" aria-hidden="true" width={size} height={size} focusable="false">
      {P[name]}
    </svg>
  );
}
