/** Rutas de la web con «#/…»: funcionan en cualquier alojamiento estático, sin configurar el servidor. */
import { useEffect, useState } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'usar' }
  | { page: 'monta'; level?: number }
  | { page: 'placa'; id: string }
  | { page: 'goles' }
  | { page: 'ayuda' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'usar':
      return { page: 'usar' };
    case 'monta':
      return { page: 'monta', level: parts[1] ? Number(parts[1]) : undefined };
    case 'placa':
      return parts[1] ? { page: 'placa', id: parts[1] } : { page: 'monta' };
    case 'goles':
      return { page: 'goles' };
    case 'ayuda':
      return { page: 'ayuda' };
    default:
      return { page: 'home' };
  }
}

export const href = (r: Route): string =>
  r.page === 'home' ? '#/' : r.page === 'monta' && r.level !== undefined ? `#/monta/${r.level}` : r.page === 'placa' ? `#/placa/${r.id}` : `#/${r.page}`;

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Dirección de la app (la web y la app se publican juntas: la app en la carpeta «app/»). */
export const APP_URL = './app/';
