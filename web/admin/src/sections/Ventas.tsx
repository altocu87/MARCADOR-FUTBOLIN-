import { useState } from 'react';
import { DAY, canRefund, fecha, matches, money, toCsv, userName } from '../logic';
import { useAdmin } from '../store';
import type { Order, OrderStatus, ProductKind } from '../types';
import { Badge, ConfirmButton, Header, Modal, Search, Select, Table, Toolbar, download, type Tone } from '../ui';

export const ORDER_TONE: Record<OrderStatus, Tone> = { pagado: 'ok', pendiente: 'warn', reembolsado: 'neutral', fallido: 'danger' };
export const ORDER_LABEL: Record<OrderStatus, string> = { pagado: 'Pagado', pendiente: 'Pendiente', reembolsado: 'Reembolsado', fallido: 'Fallido' };
type Periodo = '30' | '90' | '365' | 'todo';

export function Ventas() {
  const { data, now } = useAdmin();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<OrderStatus | 'todos'>('todos');
  const [tipo, setTipo] = useState<ProductKind | 'todos'>('todos');
  const [periodo, setPeriodo] = useState<Periodo>('90');
  const [open, setOpen] = useState<Order | null>(null);
  const product = new Map(data.products.map((p) => [p.id, p]));
  const rows = data.orders.filter(
    (o) =>
      (estado === 'todos' || o.estado === estado) &&
      (tipo === 'todos' || product.get(o.productId)?.tipo === tipo) &&
      (periodo === 'todo' || now - o.fecha <= Number(periodo) * DAY) &&
      matches(q, userName(data.users, o.userId), product.get(o.productId)?.nombre, o.id, o.cupon),
  );
  const cobrado = rows.filter((o) => o.estado === 'pagado').reduce((a, o) => a + o.importe, 0);
  return (
    <>
      <Header
        title="Ventas"
        subtitle={`${rows.length} pedidos · ${money(cobrado)} cobrados en el filtro`}
        actions={
          <button
            className="a-btn"
            onClick={() =>
              download(
                'ventas.csv',
                toCsv(rows, [
                  { label: 'Pedido', value: (o) => o.id },
                  { label: 'Fecha', value: (o) => new Date(o.fecha).toISOString().slice(0, 10) },
                  { label: 'Cliente', value: (o) => userName(data.users, o.userId) },
                  { label: 'Producto', value: (o) => product.get(o.productId)?.nombre ?? o.productId },
                  { label: 'Estado', value: (o) => ORDER_LABEL[o.estado] },
                  { label: 'Cupón', value: (o) => o.cupon ?? '' },
                  { label: 'Importe (€)', value: (o) => (o.importe / 100).toFixed(2).replace('.', ',') },
                ]),
              )
            }
          >
            Exportar CSV
          </button>
        }
      />
      <Toolbar>
        <Search value={q} onChange={setQ} placeholder="Buscar cliente, producto, cupón o nº de pedido" />
        <Select
          label="Periodo"
          value={periodo}
          onChange={setPeriodo}
          options={[
            { value: '30', label: 'Últimos 30 días' },
            { value: '90', label: 'Últimos 90 días' },
            { value: '365', label: 'Último año' },
            { value: 'todo', label: 'Todo' },
          ]}
        />
        <Select
          label="Estado"
          value={estado}
          onChange={setEstado}
          options={[{ value: 'todos', label: 'Todos los estados' }, ...(Object.keys(ORDER_LABEL) as OrderStatus[]).map((s) => ({ value: s, label: ORDER_LABEL[s] }))]}
        />
        <Select
          label="Tipo"
          value={tipo}
          onChange={setTipo}
          options={[
            { value: 'todos', label: 'Todos los productos' },
            { value: 'pro', label: 'Pro' },
            { value: 'tema', label: 'Temas' },
            { value: 'sonido', label: 'Sonidos' },
            { value: 'pack', label: 'Packs' },
            { value: 'suscripcion', label: 'Suscripciones' },
            { value: 'kit', label: 'Kits' },
          ]}
        />
      </Toolbar>
      <div className="a-card flush">
        <Table
          rows={rows}
          onRow={setOpen}
          columns={[
            { label: 'Fecha', cell: (o) => fecha(o.fecha) },
            { label: 'Cliente', cell: (o) => userName(data.users, o.userId) },
            { label: 'Producto', cell: (o) => product.get(o.productId)?.nombre ?? o.productId },
            { label: 'Cupón', cell: (o) => (o.cupon ? <code>{o.cupon}</code> : <span className="a-muted">—</span>) },
            { label: 'Estado', cell: (o) => <Badge tone={ORDER_TONE[o.estado]}>{ORDER_LABEL[o.estado]}</Badge> },
            { label: 'Importe', align: 'right', cell: (o) => money(o.importe) },
          ]}
        />
      </div>
      {open && <OrderModal order={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function OrderModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { data, save, can, toast } = useAdmin();
  const product = data.products.find((p) => p.id === order.productId);
  const linked = data.licenses.filter((l) => l.orderId === order.id && l.estado === 'activa');
  const refund = async () => {
    await save('orders', { ...order, estado: 'reembolsado' }, 'Reembolso', `${order.id} · ${money(order.importe)} · ${userName(data.users, order.userId)}`);
    for (const l of linked) await save('licenses', { ...l, estado: 'revocada' }, 'Licencia revocada', `${l.code} (por reembolso de ${order.id})`);
    toast('Pedido reembolsado');
    onClose();
  };
  return (
    <Modal
      title={`Pedido ${order.id}`}
      onClose={onClose}
      footer={
        <>
          <button className="a-btn ghost" onClick={onClose}>
            Cerrar
          </button>
          {can('reembolsar') && (
            <ConfirmButton onConfirm={refund} disabled={!canRefund(order)}>
              Reembolsar {money(order.importe)}
            </ConfirmButton>
          )}
        </>
      }
    >
      <dl className="a-dl">
        <dt>Cliente</dt>
        <dd>{userName(data.users, order.userId)}</dd>
        <dt>Producto</dt>
        <dd>{product?.nombre ?? order.productId}</dd>
        <dt>Fecha</dt>
        <dd>{new Date(order.fecha).toLocaleString('es-ES')}</dd>
        <dt>Importe</dt>
        <dd>
          {money(order.importe)} {order.cupon && <span className="a-muted">(cupón {order.cupon})</span>}
        </dd>
        <dt>Estado</dt>
        <dd>
          <Badge tone={ORDER_TONE[order.estado]}>{ORDER_LABEL[order.estado]}</Badge>
        </dd>
        <dt>Ref. de pago</dt>
        <dd>
          <code>{order.proveedorRef ?? '—'}</code>
        </dd>
        {order.envio && (
          <>
            <dt>Envío</dt>
            <dd>
              {order.envio.estado} · {order.envio.direccion}
            </dd>
          </>
        )}
      </dl>
      {linked.length > 0 && <p className="a-muted small">Al reembolsar se revocan también sus licencias Pro: {linked.map((l) => l.code).join(', ')}.</p>}
      <p className="a-muted small">
        Con un proveedor de pagos conectado, el reembolso se hace en su panel (Stripe, Lemon Squeezy…) y aquí se refleja solo. En modo
        demostración solo se marca el pedido.
      </p>
    </Modal>
  );
}
