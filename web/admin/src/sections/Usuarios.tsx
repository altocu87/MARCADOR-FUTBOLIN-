import { useState } from 'react';
import { DAY, ROLE_LABEL, fecha, matches, money, toCsv } from '../logic';
import { useAdmin } from '../store';
import type { Plan, Role, User } from '../types';
import { Badge, Field, Header, Modal, Search, Select, Table, Toolbar, download } from '../ui';

const ROLE_TONE: Record<Role, 'accent' | 'warn' | 'neutral'> = { admin: 'accent', soporte: 'accent', bar: 'warn', jugador: 'neutral' };

export function Usuarios() {
  const { data, now } = useAdmin();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'todos'>('todos');
  const [plan, setPlan] = useState<Plan | 'todos'>('todos');
  const [open, setOpen] = useState<User | null>(null);
  const rows = data.users
    .filter((u) => (role === 'todos' || u.role === role) && (plan === 'todos' || u.plan === plan) && matches(q, u.nombre, u.email))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <Header
        title="Usuarios"
        subtitle={`${data.users.length} cuentas`}
        actions={
          <button
            className="a-btn"
            onClick={() =>
              download(
                'usuarios.csv',
                toCsv(rows, [
                  { label: 'Nombre', value: (u) => u.nombre },
                  { label: 'Correo', value: (u) => u.email },
                  { label: 'Rol', value: (u) => ROLE_LABEL[u.role] },
                  { label: 'Plan', value: (u) => u.plan },
                  { label: 'País', value: (u) => u.pais },
                  { label: 'Alta', value: (u) => fecha(u.createdAt) },
                ]),
              )
            }
          >
            Exportar CSV
          </button>
        }
      />
      <Toolbar>
        <Search value={q} onChange={setQ} placeholder="Buscar por nombre o correo" />
        <Select
          label="Rol"
          value={role}
          onChange={setRole}
          options={[{ value: 'todos', label: 'Todos los roles' }, ...(Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))]}
        />
        <Select
          label="Plan"
          value={plan}
          onChange={setPlan}
          options={[
            { value: 'todos', label: 'Todos los planes' },
            { value: 'pro', label: 'Pro' },
            { value: 'gratis', label: 'Gratis' },
          ]}
        />
      </Toolbar>
      <div className="a-card flush">
        <Table
          rows={rows}
          onRow={setOpen}
          columns={[
            {
              label: 'Nombre',
              cell: (u) => (
                <div className="a-cell2">
                  <strong>{u.nombre}</strong>
                  <span>{u.email}</span>
                </div>
              ),
            },
            { label: 'Rol', cell: (u) => <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge> },
            { label: 'Plan', cell: (u) => (u.plan === 'pro' ? <Badge tone="ok">Pro</Badge> : <span className="a-muted">Gratis</span>) },
            { label: 'Alta', cell: (u) => fecha(u.createdAt) },
            { label: 'Última vez', cell: (u) => (now - u.lastSeenAt < DAY ? 'Hoy' : `Hace ${Math.round((now - u.lastSeenAt) / DAY)} d`) },
            { label: 'Estado', cell: (u) => (u.bloqueado ? <Badge tone="danger">Bloqueado</Badge> : <span className="a-muted">Activo</span>) },
          ]}
        />
      </div>
      {open && <UserModal user={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function UserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { data, save, can, toast, session } = useAdmin();
  const [u, setU] = useState(user);
  const orders = data.orders.filter((o) => o.userId === user.id);
  const licenses = data.licenses.filter((l) => l.userId === user.id);
  const venue = data.venues.find((v) => v.ownerId === user.id);
  const productName = new Map(data.products.map((p) => [p.id, p.nombre]));
  const editable = can('editar_usuarios');
  const self = user.email === session.email;

  const commit = async () => {
    const changes: string[] = [];
    if (u.role !== user.role) changes.push(`rol ${ROLE_LABEL[user.role]} → ${ROLE_LABEL[u.role]}`);
    if (u.plan !== user.plan) changes.push(`plan ${user.plan} → ${u.plan}`);
    if (u.bloqueado !== user.bloqueado) changes.push(u.bloqueado ? 'bloqueado' : 'desbloqueado');
    if (u.notas !== user.notas) changes.push('notas');
    if (!changes.length) return onClose();
    await save('users', u, 'Usuario modificado', `${u.email}: ${changes.join(', ')}`);
    toast('Usuario guardado');
    onClose();
  };

  return (
    <Modal
      title={user.nombre}
      onClose={onClose}
      footer={
        <>
          <button className="a-btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="a-btn primary" onClick={commit} disabled={!editable}>
            Guardar
          </button>
        </>
      }
    >
      <p className="a-muted">
        {user.email} · {user.pais} · alta {fecha(user.createdAt)}
      </p>
      <div className="a-form-grid">
        <Field label="Rol" hint={self ? 'No puedes cambiar tu propio rol.' : !can('cambiar_roles') ? 'Solo un administrador cambia roles.' : undefined}>
          <select className="a-input" value={u.role} disabled={self || !can('cambiar_roles')} onChange={(e) => setU({ ...u, role: e.target.value as Role })}>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plan" hint="Dar Pro a mano (regalo, compensación…) queda en el registro.">
          <select className="a-input" value={u.plan} disabled={!editable} onChange={(e) => setU({ ...u, plan: e.target.value as Plan })}>
            <option value="gratis">Gratis</option>
            <option value="pro">Pro</option>
          </select>
        </Field>
      </div>
      <label className="a-check">
        <input type="checkbox" checked={u.bloqueado} disabled={!editable || self} onChange={(e) => setU({ ...u, bloqueado: e.target.checked })} />
        Bloquear la cuenta (no podrá iniciar sesión ni comprar)
      </label>
      <Field label="Notas internas">
        <textarea className="a-input" rows={3} value={u.notas} disabled={!editable} onChange={(e) => setU({ ...u, notas: e.target.value })} />
      </Field>
      {venue && (
        <p>
          Dueño de <strong>{venue.nombre}</strong> ({venue.ciudad}).
        </p>
      )}
      <h3>Compras ({orders.length})</h3>
      {orders.length ? (
        <ul className="a-list">
          {orders.slice(0, 8).map((o) => (
            <li key={o.id}>
              <span>
                {fecha(o.fecha)} · {productName.get(o.productId)}
              </span>
              <span>
                {money(o.importe)} {o.estado !== 'pagado' && <Badge tone="warn">{o.estado}</Badge>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="a-muted">Sin compras.</p>
      )}
      <h3>Licencias ({licenses.length})</h3>
      {licenses.length ? (
        <ul className="a-list">
          {licenses.map((l) => (
            <li key={l.id}>
              <code>{l.code}</code>
              <Badge tone={l.estado === 'activa' ? 'ok' : l.estado === 'revocada' ? 'danger' : 'neutral'}>{l.estado}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="a-muted">Sin licencias.</p>
      )}
    </Modal>
  );
}
