/*
  Which side of the app an address belongs to: the photographer panel (/photographer…) or the public
  site (everything else, the client gallery and sign-in included). It is written on <html data-site>,
  and the public site's typefaces (styles/type.css) only apply under data-site="public".
*/
export const siteOf = (pathname) => (pathname === '/photographer' || pathname.startsWith('/photographer/') ? 'panel' : 'public');

export function markSite(pathname) {
  document.documentElement.dataset.site = siteOf(pathname);
}
