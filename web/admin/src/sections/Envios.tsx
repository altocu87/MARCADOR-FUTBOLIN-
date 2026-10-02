import { useState } from 'react';
import { BOARDS } from '../../../../src/inputs/hardware/catalog';
import { SHIP_FLOW, SHIP_LABEL, canAdvanceShipment, fecha, userName } from '../logic';
import { useAdmin } from '../store';
import type { Order, ShipStatus } from '../types';
import { Badge, Field, Header, Modal, Table, type Tone } from '../ui';

const SHIP_TONE: Record<ShipStatus, Tone> = { pendiente: 'warn', grabando: 'accent', probado: 'accent', enviado: 'ok', entregado: 'neutral', devuelto: 'danger' };
const ORDER: ShipStatus[] = ['pendiente', 'grabando', 'probado', 'enviado', 'entregado', 'devuelto'];

export function Envios() {
  const { data } = useAdmin();
  const [filtro, setFiltro] = useState<ShipStatus | 'abiertos' | 'todos'>('abiertos');
  const [open, setOpen] = useState<Order | null>(null);
  const kits = data.orders.filter((o) => o.envio && o.estado === 'pagado');
  const count = (s: ShipStatus) => kits.filter((o) => o.envio!.estado === s).length;
  const rows = kits
    .filter((o) => (filtro === 'todos' ? true : filtro === 'abiertos' ? ['pendiente', 'grabando', 'probado'].includes(o.envio!.estado) : o.envio!.estado === filtro))
    .sort((a, b) => a.fecha - b.fecha);
  const boardName = (id: string) => BOARDS.find((b) => b.id === id)?.name ?? id;
  return (
    <>
      <Header title="Envíos de kits" subtitle="Cada kit se graba con el instalador web, se prueba con la pantalla de prueba y se envía." />
      <div className="a-pipeline" role="group" aria-label="Filtrar por estado">
        <button aria-pressed={filtro === 'abiertos'} onClick={() => setFiltro('abiertos')}>
          <strong>{count('pendiente') + count('grabando') + count('probado')}</strong> Por enviar
        </button>
        {ORDER.map((s) => (
          <button key={s} aria-pressed={filtro === s} onClick={() => setFiltro(s)}>
            <strong>{count(s)}</strong> {SHIP_LABEL[s]}
          </button>
        ))}
        <button aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>
          <strong>{kits.length}</strong> Todos
        </button>
      </div>
      <div className="a-card flush">
        <Table
          rows={rows}
          onRow={setOpen}
          empty="No hay envíos en este estado."
          columns={[
            { label: 'Pedido', cell: (o) => fecha(o.fecha) },
            { label: 'Cliente', cell: (o) => userName(data.users, o.userId) },
            { label: 'Placa', cell: (o) => boardName(o.envio!.placa) },
            { label: 'Grabada', cell: (o) => (o.envio!.grabada ? 'Sí' : 'No') },
            { label: 'Probada', cell: (o) => (o.envio!.probada ? 'Sí' : 'No') },
            { label: 'Estado', cell: (o) => <Badge tone={SHIP_TONE[o.envio!.estado]}>{SHIP_LABEL[o.envio!.estado]}</Badge> },
          ]}
        />
      </div>
      {open && <ShipModal order={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ShipModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { data, save, can, toast } = useAdmin();
  const [o, setO] = useState(order);
  const env = o.envio!;
  const editable = can('gestionar_envios');
  const setEnv = (patch: Partial<typeof env>) => setO({ ...o, envio: { ...env, ...patch } });
  const board = BOARDS.find((b) => b.id === env.placa);
  const advance = async (to: ShipStatus) => {
    const check = canAdvanceShipment(o, to);
    if (!check.ok) return toast(check.motivo!);
    const next = { ...o, envio: { ...env, estado: to } };
    await save('orders', next, 'Envío', `${o.id}: ${SHIP_LABEL[env.estado]} → ${SHIP_LABEL[to]}${to === 'enviado' ? ` (${env.seguimiento})` : ''}`);
    toast(`Envío: ${SHIP_LABEL[to]}`);
    onClose();
  };
  const saveOnly = async () => {
    await save('orders', o, 'Envío actualizado', `${o.id}: grabada ${env.grabada ? 'sí' : 'no'}, probada ${env.probada ? 'sí' : 'no'}, seguimiento ${env.seguimiento ?? '—'}`);
    toast('Envío guardado');
    onClose();
  };
  return (
    <Modal
      title={`Envío del pedido ${order.id}`}
      onClose={onClose}
      footer={
        <>
          <button className="a-btn ghost" onClick={onClose}>
            Cerrar
          </button>
          <button className="a-btn" disabled={!editable} onClick={saveOnly}>
            Guardar
          </button>
          {SHIP_FLOW[env.estado].map((to) => (
            <button key={to} className="a-btn primary" disabled={!editable} onClick={() => advance(to)}>
              Pasar a «{SHIP_LABEL[to]}»
            </button>
          ))}
        </>
      }
    >
      <dl className="a-dl">
        <dt>Cliente</dt>
        <dd>{userName(data.users, o.userId)}</dd>
        <dt>Dirección</dt>
        <dd>{env.direccion}</dd>
        <dt>Placa</dt>
        <dd>{board?.name ?? env.placa}</dd>
        <dt>Estado</dt>
        <dd>
          <Badge tone={SHIP_TONE[env.estado]}>{SHIP_LABEL[env.estado]}</Badge>
        </dd>
      </dl>
      <ol className="a-steps">
        <li>
          <label className="a-check">
            <input type="checkbox" checked={env.grabada} disabled={!editable} onChange={(e) => setEnv({ grabada: e.target.checked })} />
            Programa grabado con el instalador web
          </label>
        </li>
        <li>
          <label className="a-check">
            <input type="checkbox" checked={env.probada} disabled={!editable || !env.grabada} onChange={(e) => setEnv({ probada: e.target.checked })} />
            Pantalla de prueba superada (táctil, mando y sensores)
          </label>
        </li>
        <li>
          <Field label="Número de seguimiento">
            <input className="a-input" value={env.seguimiento ?? ''} disabled={!editable} onChange={(e) => setEnv({ seguimiento: e.target.value.trim() || undefined })} placeholder="p. ej. ES123456789" />
          </Field>
        </li>
      </ol>
      {board && (
        <p className="a-muted small">
          Instalar el programa: web → Monta tu marcador → {board.name} → Instalar en mi placa.
        </p>
      )}
    </Modal>
  );
}
