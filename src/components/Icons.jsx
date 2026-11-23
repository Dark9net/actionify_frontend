/* The few line icons the site shares. All inherit the text colour. */

export function Arrow({ className = '' }) {
  return (
    <svg className={`i-arrow ${className}`} viewBox="0 0 14 10" aria-hidden="true">
      <path d="M1 5h12M9 1l4 4-4 4" />
    </svg>
  );
}

export function Cross() {
  return (
    <svg className="i-cross" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}

export function Camera() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M2 5.5h3l1.3-2h5.4l1.3 2h3v9H2z" />
      <circle cx="9" cy="9.8" r="2.7" />
    </svg>
  );
}
