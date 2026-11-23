import { createContext, useContext } from 'react';

/* The phone and tablet menu: whether it is open, and a way to open it from the header. */
export const MenuContext = createContext({ open: false, openMenu: () => {} });

export default function useMenu() {
  return useContext(MenuContext);
}
