/**
 * Conector del modo REAL con Supabase (PREPARADO, SIN CONECTAR TODAVÍA).
 * Habla directamente con su API (sin bibliotecas extra):
 *   - Inicio de sesión: /auth/v1/token (correo y contraseña de un usuario de Supabase).
 *   - Datos: /rest/v1/<tabla>, con el token del usuario. Los permisos los decide el SERVIDOR
 *     (políticas RLS de supabase/schema.sql): aunque alguien trucase el panel, sin rol admin/soporte no ve nada.
 * La clave «anon» de Supabase es pública por diseño; lo que protege los datos son esas políticas.
 */
import type { AdminBackend, KeyValueStore } from './backend';
import type { AdminData, AdminSession, Collection, ItemOf, Role, Settings } from './types';

/** Tabla de la base de datos para cada colección del panel. */
export const TABLES: Record<Collection, string> = {
  users: 'profiles',
  venues: 'venues',
  products: 'products',
  orders: 'orders',
  licenses: 'licenses',
  coupons: 'coupons',
  announcements: 'announcements',
  audit: 'audit_log',
};

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
// Las fechas viajan como milisegundos (bigint) para que el panel y la base de datos hablen igual.
export const toDb = (o: object) => Object.fromEntries(Object.entries(o).map(([k, v]) => [toSnake(k), v === undefined ? null : v]));
export const fromDb = <T,>(o: Record<string, unknown>): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null).map(([k, v]) => [toCamel(k), v])) as T;

type Fetch = typeof fetch;
const SESSION_KEY = 'mfv3-admin-sesion-real';

export class SupabaseBackend implements AdminBackend {
  readonly mode = 'real' as const;

  constructor(
    private url: string,
    private anonKey: string,
    private sessionStore: KeyValueStore,
    private http: Fetch = (...a) => fetch(...a),
  ) {
    this.url = url.replace(/\/+$/, '');
  }

  needsSetup(): boolean {
    return false; // las cuentas se crean en Supabase (Authentication → Users) y el rol en la tabla profiles
  }

  async createAdmin(): Promise<AdminSession> {
    throw new Error('En modo real, crea el usuario en Supabase y ponle el rol «admin» (ver docs/ADMIN.md).');
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const s = this.session();
    return { apikey: this.anonKey, Authorization: `Bearer ${s?.token ?? this.anonKey}`, 'Content-Type': 'application/json', ...extra };
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const r = await this.http(`${this.url}${path}`, init);
    if (!r.ok) {
      let msg = `${r.status}`;
      try {
        const j = (await r.json()) as { message?: string; error_description?: string; msg?: string };
        msg = j.message ?? j.error_description ?? j.msg ?? msg;
      } catch {
        /* sin cuerpo */
      }
      throw new Error(`Servidor: ${msg}`);
    }
    return r.status === 204 ? (undefined as T) : ((await r.json().catch(() => undefined)) as T);
  }

  async signIn(email: string, password: string): Promise<AdminSession> {
    const auth = await this.req<{ access_token: string; user: { id: string; email: string } }>('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: this.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const rows = await this.req<{ role: Role }[]>(`/rest/v1/profiles?id=eq.${encodeURIComponent(auth.user.id)}&select=role`, {
      headers: { apikey: this.anonKey, Authorization: `Bearer ${auth.access_token}` },
    });
    const role = rows[0]?.role;
    if (role !== 'admin' && role !== 'soporte') throw new Error('Esta cuenta no tiene permiso de administración');
    const s: AdminSession = { email: auth.user.email, role, token: auth.access_token };
    this.sessionStore.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }

  signOut(): void {
    this.sessionStore.removeItem(SESSION_KEY);
  }

  session(): AdminSession | null {
    const raw = this.sessionStore.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  }

  async load(): Promise<AdminData> {
    const get = async <C extends Collection>(c: C, order: string) =>
      (await this.req<Record<string, unknown>[]>(`/rest/v1/${TABLES[c]}?select=*&order=${order}&limit=10000`, { headers: this.headers() })).map(
        (r) => fromDb<ItemOf<C>>(r),
      ) as AdminData[C];
    const [users, venues, products, orders, licenses, coupons, announcements, audit, settings] = await Promise.all([
      get('users', 'created_at.desc'),
      get('venues', 'desde.desc'),
      get('products', 'precio.asc'),
      get('orders', 'fecha.desc'),
      get('licenses', 'creada.desc'),
      get('coupons', 'code.asc'),
      get('announcements', 'desde.desc'),
      get('audit', 'at.desc'),
      this.req<Record<string, unknown>[]>(`/rest/v1/settings?id=eq.ajustes&select=*`, { headers: this.headers() }),
    ]);
    return { users, venues, products, orders, licenses, coupons, announcements, audit, settings: fromDb<Settings>(settings[0] ?? {}) };
  }

  /**
   * Modificar si existe (PATCH) y crear si no (POST). No se usa «upsert» del servidor porque exige permiso de
   * crear además de modificar, y soporte puede modificar pedidos (envíos) pero no crearlos.
   */
  async upsert<C extends Collection>(col: C, item: ItemOf<C>): Promise<void> {
    const body = JSON.stringify(toDb(item));
    const updated = await this.req<unknown[]>(`/rest/v1/${TABLES[col]}?id=eq.${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      headers: this.headers({ Prefer: 'return=representation' }),
      body,
    });
    if (Array.isArray(updated) && updated.length > 0) return;
    await this.req(`/rest/v1/${TABLES[col]}`, { method: 'POST', headers: this.headers({ Prefer: 'return=minimal' }), body });
  }

  async remove(col: Collection, id: string): Promise<void> {
    await this.req(`/rest/v1/${TABLES[col]}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: this.headers() });
  }

  async saveSettings(s: Settings): Promise<void> {
    await this.req(`/rest/v1/settings`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(toDb(s)),
    });
  }
}
