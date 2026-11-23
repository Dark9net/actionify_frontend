/*
  Toasts: short notes in the corner. toast({ tone, title, text, action: { label, run }, ms }).
  tone: 'success' | 'error' | 'info'. Errors stay longer; a toast pauses while pointed at or focused.
  Returns the toast's id; dismiss(id) takes it away early.
*/
import { useSyncExternalStore } from 'react';

let list = [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function toast({ tone = 'info', title, text = '', action = null, ms } = {}) {
  const id = Math.random().toString(36).slice(2);
  const life = ms ?? (tone === 'error' ? 9000 : action ? 7000 : 4800);
  list = [...list.slice(-4), { id, tone, title, text, action, life, at: Date.now() }];
  emit();
  return id;
}

export function dismiss(id) {
  const t = list.find((x) => x.id === id);
  if (!t || t.leaving) return;
  list = list.map((x) => (x.id === id ? { ...x, leaving: true } : x));
  emit();
  setTimeout(() => {
    list = list.filter((x) => x.id !== id);
    emit();
  }, 260);
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useToasts = () => useSyncExternalStore(subscribe, () => list);
