import { useSyncExternalStore } from 'react';
import { useSession } from '../../../lib/auth.js';

/*
  Who is using the panel, and how they like it: the profile in the header's menu, and the preferences
  on the Settings page (the folded sidebar, toasts for finished uploads).

  The profile comes from the session (useMe below); the preferences stay on this device, as they are
  per device anyway.
*/
const KEY = 'actionify:panel:account';
const OLD_FOLD = 'actionify:panel:folded'; // the folded sidebar before it moved in here

/*
  Before the session is known: no one (the panel only opens once it is, so this is never shown).
  It used to borrow the first of the public site's team (data/content.js), which broke the whole
  panel when that list changed shape (team members have no photograph now), so it stands alone.
*/
const DEFAULT = {
  name: '',
  email: '',
  role: '',
  photo: null,
  prefs: { folded: false, doneToasts: true },
};

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) return { ...DEFAULT, ...raw, prefs: { ...DEFAULT.prefs, ...raw.prefs } };
    return { ...DEFAULT, prefs: { ...DEFAULT.prefs, folded: localStorage.getItem(OLD_FOLD) === '1' } };
  } catch {
    return DEFAULT;
  }
}

let state = read();
const subs = new Set();
const emit = () => subs.forEach((f) => f());

function write(next) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private window: kept for this visit only */
  }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = read();
      emit();
    }
  });
}

const subscribe = (f) => {
  subs.add(f);
  return () => subs.delete(f);
};

export const getAccount = () => state;
export const useAccount = () => useSyncExternalStore(subscribe, getAccount, getAccount);

export function updateProfile(patch) {
  write({ ...state, ...patch });
}
export function setPref(name, value) {
  write({ ...state, prefs: { ...state.prefs, [name]: value } });
}

/*
  The signed-in account with this device's preferences: the name, email, role and profile photo
  come from the session (the API); the preferences stay here. Before the session is known, the
  placeholder above.
*/
export function useMe() {
  const account = useAccount();
  const { user } = useSession();
  if (!user) return account;
  return {
    ...account,
    name: user.name,
    email: user.email,
    mobile: user.mobile || '',
    role: user.role.name,
    roleSlug: user.role.slug,
    permissions: user.permissions,
    photo: user.photo || null, // their own (Settings); null: initials
  };
}
