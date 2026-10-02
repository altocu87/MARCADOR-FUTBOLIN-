import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { LocalBackend, loadConnection, type AdminBackend } from './backend';
import { ROLE_LABEL, type Permission } from './logic';
import { Ajustes } from './sections/Ajustes';
import { Actividad, Avisos } from './sections/Avisos';
import { Bares } from './sections/Bares';
import { Envios } from './sections/Envios';
import { Licencias } from './sections/Licencias';
import { Resumen } from './sections/Resumen';
import { Tienda } from './sections/Tienda';
import { Usuarios } from './sections/Usuarios';
import { Ventas } from './sections/Ventas';
import { AdminProvider, useAdmin } from './store';
import { SupabaseBackend } from './supabase';
import type { AdminSession } from './types';

const SECTIONS: { id: string; label: string; perm?: Permission }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'envios', label: 'Envíos' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'bares', label: 'Bares y clubes' },
  { id: 'licencias', label: 'Licencias Pro' },
  { id: 'tienda', label: 'Tienda y cupones' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'actividad', label: 'Actividad' },
  { id: 'ajustes', label: 'Ajustes' },
];

function makeBackend(): AdminBackend {
  const conn = loadConnection();
  return conn ? new SupabaseBackend(conn.url, conn.anonKey, sessionStorage) : new LocalBackend();
}

export function AdminApp() {
  const backend = useMemo(makeBackend, []);
  const [session, setSession] = useState<AdminSession | null>(() => backend.session());
  if (!session) return <Login backend={backend} onIn={setSession} />;
  return (
    <AdminProvider backend={backend} session={session}>
      {(ready, error) =>
        ready ? (
          <Shell onOut={() => { backend.signOut(); setSession(null); }} />
        ) : (
          <div className="a-center">
            {error ? (
              <div className="a-card narrow">
                <h2>No se pudieron cargar los datos</h2>
                <p className="a-muted">{error}</p>
                <button className="a-btn" onClick={() => { backend.signOut(); setSession(null); }}>
                  Volver a entrar
                </button>
              </div>
            ) : (
              <p className="a-muted">Cargando…</p>
            )}
          </div>
        )
      }
    </AdminProvider>
  );
}

function Login({ backend, onIn }: { backend: AdminBackend; onIn: (s: AdminSession) => void }) {
  const setup = backend.needsSetup();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (setup && pw !== pw2) return setErr('Las contraseñas no coinciden');
    setBusy(true);
    try {
      onIn(setup ? await backend.createAdmin(email, pw) : await backend.signIn(email, pw));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="a-center">
      <form className="a-card a-login" onSubmit={submit}>
        <p className="a-kicker">Marcador Futbolín · Administración</p>
        <h1>{setup ? 'Crea tu cuenta de administrador' : 'Entrar'}</h1>
        {backend.mode === 'demo' && (
          <p className="a-demo-note">
            Modo demostración: datos de ejemplo guardados solo en este navegador. La contraseña evita miradas casuales, pero la
            seguridad real llega al conectar la base de datos.
          </p>
        )}
        <label className="a-field">
          <span className="a-field-label">Correo</span>
          <input className="a-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="a-field">
          <span className="a-field-label">Contraseña</span>
          <input className="a-input" type="password" autoComplete={setup ? 'new-password' : 'current-password'} value={pw} onChange={(e) => setPw(e.target.value)} required minLength={setup ? 8 : 1} />
        </label>
        {setup && (
          <label className="a-field">
            <span className="a-field-label">Repite la contraseña</span>
            <input className="a-input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </label>
        )}
        {err && <p className="a-error">{err}</p>}
        <button className="a-btn primary wide" disabled={busy}>
          {busy ? 'Un momento…' : setup ? 'Crear cuenta y entrar' : 'Entrar'}
        </button>
        <a className="a-back" href="../">
          ← Volver a la web
        </a>
      </form>
    </div>
  );
}

function useHashSection(): [string, (s: string) => void] {
  const read = () => location.hash.replace(/^#\/?/, '') || 'resumen';
  const [s, setS] = useState(read);
  useEffect(() => {
    const on = () => setS(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [s, (id) => (location.hash = `#/${id}`)];
}

function Shell({ onOut }: { onOut: () => void }) {
  const { session, backend, can, message, data } = useAdmin();
  const [section, go] = useHashSection();
  const [menu, setMenu] = useState(false);
  const allowed = SECTIONS.filter((s) => !s.perm || can(s.perm));
  const current = allowed.some((s) => s.id === section) ? section : 'resumen';
  const pending = data.orders.filter((o) => o.envio && o.estado === 'pagado' && ['pendiente', 'grabando', 'probado'].includes(o.envio.estado)).length;

  if (!can('ver_panel'))
    return (
      <div className="a-center">
        <div className="a-card narrow">
          <h2>Sin permiso</h2>
          <p className="a-muted">Tu cuenta no tiene acceso al panel.</p>
          <button className="a-btn" onClick={onOut}>
            Salir
          </button>
        </div>
      </div>
    );

  return (
    <div className="a-shell">
      <aside className={`a-side ${menu ? 'open' : ''}`}>
        <div className="a-brand">
          <span>Marcador Futbolín</span>
          <small>Administración</small>
        </div>
        <nav aria-label="Secciones del panel">
          {allowed.map((s) => (
            <a
              key={s.id}
              href={`#/${s.id}`}
              aria-current={current === s.id ? 'page' : undefined}
              onClick={() => setMenu(false)}
            >
              {s.label}
              {s.id === 'envios' && pending > 0 && <span className="a-count">{pending}</span>}
            </a>
          ))}
        </nav>
        <div className="a-side-foot">
          <span className="a-who">
            {session.email}
            <small>{ROLE_LABEL[session.role]}</small>
          </span>
          <button className="a-btn ghost sm" onClick={onOut}>
            Salir
          </button>
        </div>
      </aside>
      <div className="a-main">
        <div className="a-topbar">
          <button className="a-btn ghost sm a-menu" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menú">
            ☰
          </button>
          {backend.mode === 'demo' ? (
            <span className="a-mode demo">
              Modo demostración<span className="a-long"> · datos de ejemplo en este navegador</span>
            </span>
          ) : (
            <span className="a-mode real">Base de datos real</span>
          )}
          <a className="a-btn ghost sm" href="../" target="_blank" rel="noreferrer">
            Ver la web ↗
          </a>
        </div>
        <main className="a-content">
          {current === 'resumen' && <Resumen go={go} />}
          {current === 'ventas' && <Ventas />}
          {current === 'envios' && <Envios />}
          {current === 'usuarios' && <Usuarios />}
          {current === 'bares' && <Bares />}
          {current === 'licencias' && <Licencias />}
          {current === 'tienda' && <Tienda />}
          {current === 'avisos' && <Avisos />}
          {current === 'actividad' && <Actividad />}
          {current === 'ajustes' && <Ajustes />}
        </main>
      </div>
      {message && (
        <div className="a-toast" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
