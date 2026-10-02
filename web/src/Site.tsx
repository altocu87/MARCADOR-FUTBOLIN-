import { useState } from 'react';
import logo from '../../src/assets/images/logo.webp';
import { Ayuda } from './pages/Ayuda';
import { Goles } from './pages/Goles';
import { Home } from './pages/Home';
import { Monta } from './pages/Monta';
import { Placa } from './pages/Placa';
import { Usar } from './pages/Usar';
import { APP_URL, href, useRoute } from './router';

const NAV: { label: string; to: string; page: string; anchor?: string }[] = [
  { label: 'En el móvil', to: href({ page: 'usar' }), page: 'usar' },
  { label: 'Monta tu marcador', to: href({ page: 'monta' }), page: 'monta' },
  { label: 'Sensores', to: href({ page: 'goles' }), page: 'goles' },
  { label: 'Ayuda', to: href({ page: 'ayuda' }), page: 'ayuda' },
];

export function Site() {
  const route = useRoute();
  const [menu, setMenu] = useState(false);
  const current = route.page === 'placa' ? 'monta' : route.page;
  return (
    <>
      <header className="top">
        <a className="brand" href="#/" onClick={() => setMenu(false)}>
          <img src={logo} alt="" width={28} height={28} />
          <span>Marcador Futbolín</span>
        </a>
        <button className="menu-toggle" aria-expanded={menu} aria-label="Menú" onClick={() => setMenu(!menu)}>
          ☰
        </button>
        <nav className={menu ? 'open' : ''} aria-label="Secciones">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.to}
              aria-current={current === n.page && !n.anchor ? 'page' : undefined}
              onClick={(e) => {
                setMenu(false);
                if (n.anchor) {
                  e.preventDefault();
                  const id = n.anchor;
                  if (location.hash !== '#/' && location.hash !== '') location.hash = '#/';
                  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60);
                }
              }}
            >
              {n.label}
            </a>
          ))}
          <a className="btn btn-primary btn-sm" href={APP_URL}>
            Abrir app
          </a>
        </nav>
      </header>

      <main>
        {route.page === 'home' && <Home />}
        {route.page === 'usar' && <Usar />}
        {route.page === 'monta' && <Monta level={route.level} />}
        {route.page === 'placa' && <Placa id={route.id} />}
        {route.page === 'goles' && <Goles />}
        {route.page === 'ayuda' && <Ayuda />}
      </main>

      <footer className="foot">
        <div>Marcador Futbolín V3 · Gratis, sin registro y sin publicidad.</div>
        <div className="foot-links">
          <a href={APP_URL}>Abrir la app</a>
          <a href={href({ page: 'monta' })}>Monta tu marcador</a>
          <a href={href({ page: 'ayuda' })}>Ayuda</a>
        </div>
      </footer>
    </>
  );
}
