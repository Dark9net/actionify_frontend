import { useEffect, useRef } from 'react';

/*
  Scroll lock, counted so two open dialogs do not fight over it.
  The width of the scrollbar that disappears is handed to CSS as --scrollbar,
  and the body is padded by it so nothing on the page shifts sideways.
*/
let locks = 0;
function lockScroll() {
  if (locks++ > 0) return;
  const root = document.documentElement;
  root.style.setProperty('--scrollbar', `${window.innerWidth - root.clientWidth}px`);
  root.classList.add('locked');
}
function unlockScroll() {
  if (--locks > 0) return;
  document.documentElement.classList.remove('locked');
}

/*
  Drives a native <dialog> from an `open` boolean.
  Opening: showModal() (focus trap, Esc and the top layer come free).
  Closing: sets [data-closing] so the CSS exit animation can play, then close() after `ms`.
*/
export default function useDialog(open, ms = 380) {
  const ref = useRef(null);

  // the page behind stays put while this is open
  useEffect(() => {
    if (!open) return;
    lockScroll();
    return unlockScroll;
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;

    if (open) {
      d.removeAttribute('data-closing');
      if (!d.open) d.showModal();
      return;
    }
    if (!d.open) return;

    const finish = () => {
      d.close();
      d.removeAttribute('data-closing');
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    d.setAttribute('data-closing', '');
    const timer = setTimeout(finish, ms);
    return () => clearTimeout(timer);
  }, [open, ms]);

  return ref;
}

/* Props shared by every dialog: Esc and a click on the backdrop both ask to close. */
export function dialogProps(open, onClose) {
  return {
    onCancel: (e) => {
      e.preventDefault();
      onClose();
    },
    onClose: () => {
      if (open) onClose(); // closed by the browser itself: keep the state in step
    },
    onClick: (e) => {
      if (e.target === e.currentTarget) onClose();
    },
  };
}
