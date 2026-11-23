/* Numbers, sizes, money and dates as the panel writes them. */
export { formatBytes } from '../../../lib/download.js';

export const DAY = 864e5;

export const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/** 125000 → "NRs. 1,25,000"; 2500.5 → "NRs. 2,500.50" (Nepalese rupees, lakh grouping) */
export const npr = (n) => `NRs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** a chart's axis: 50000 → "50K", 150000 → "1.5L", 25000000 → "2.5Cr" (thousand, lakh, crore) */
export function nprShort(n) {
  const one = (v) => String(Math.round(v * 10) / 10);
  if (n >= 1e7) return `${one(n / 1e7)}Cr`;
  if (n >= 1e5) return `${one(n / 1e5)}L`;
  if (n >= 1e3) return `${one(n / 1e3)}K`;
  return String(Math.round(n));
}

export const num = (n) => n.toLocaleString('en-GB');

const D = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const DS = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const W = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const T = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export const date = (t) => D.format(new Date(t));
export const shortDate = (t) => DS.format(new Date(t));
export const weekday = (t) => W.format(new Date(t));
export const time = (t) => T.format(new Date(t));

export const startOfDay = (t = Date.now()) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/* "just now", "4 min ago", "3 h ago", "yesterday", "12 Nov" */
export function ago(t, now = Date.now()) {
  const s = Math.round((now - t) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return shortDate(t);
}

/* "in 3 days", "today", "tomorrow", "2 days ago" for a booking's date */
export function fromToday(t, now = Date.now()) {
  const days = Math.round((startOfDay(t) - startOfDay(now)) / DAY);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

/* "Anna & Leo" → "anna-leo"; "Ceremony" → "ceremony" */
export const slugify = (s) =>
  String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled';

/* a folder name as a category: "02_first-dance" → "First dance" */
export function prettyName(s) {
  const t = String(s)
    .replace(/^[\d\s._-]+(?=[a-z])/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t ? t[0].toUpperCase() + t.slice(1) : String(s);
}

export const initials = (name) =>
  String(name)
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
