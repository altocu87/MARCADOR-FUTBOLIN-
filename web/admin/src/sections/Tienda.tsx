import { useState } from 'react';
import { applyCoupon, fecha, money, newId, normalizeCouponCode } from '../logic';
import { useAdmin } from '../store';
import type { Coupon, Product, ProductKind } from '../types';
import { Badge, ConfirmButton, EuroInput, Field, Header, Modal, Table } from '../ui';

const TIPO: Record<ProductKind, string> = { pro: 'Desbloqueo Pro', tema: 'Tema', sonido: 'Sonido', pack: 'Pack', suscripcion: 'Suscripción (bar)', kit: 'Kit de hardware' };

export function Tienda() {
  const { data, can } = useAdmin();
  const [open, setOpen] = useState<Product | null>(null);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const sold = (id: string) => data.orders.filter((o) => o.productId === id && o.estado === 'pagado').length;
  const editable = can('editar_tienda');
  return (
    <>
      <Header
        title="Tienda"
        subtitle="Lo que se vende en la app y en la web. Solo cosas estéticas y servicios: nada que dé ventaja en el juego."
        actions={
          editable && (
            <button className="a-btn primary" onClick={() => setOpen({ id: newId('p'), nombre: '', tipo: 'tema', precio: 199, activo: false, descripcion: '' })}>
              Nuevo producto
            </button>
          )
        }
      />
      <div className="a-card flush">
        <Table
          rows={data.products}
          onRow={setOpen}
          columns={[
            {
              label: 'Producto',
              cell: (p) => (
                <div className="a-cell2">
                  <strong>{p.nombre}</strong>
                  <span>{p.descripcion}</span>
                </div>
              ),
            },
            { label: 'Tipo', cell: (p) => TIPO[p.tipo] },
            { label: 'Vendidos', align: 'right', cell: (p) => sold(p.id) },
            { label: 'Stock', align: 'right', cell: (p) => (p.stock === undefined ? '—' : p.stock <= 5 ? <Badge tone="warn">{p.stock} · reponer</Badge> : p.stock) },
            { label: 'Estado', cell: (p) => (p.activo ? <Badge tone="ok">A la venta</Badge> : <Badge>Oculto</Badge>) },
            { label: 'Precio', align: 'right', cell: (p) => money(p.precio) },
          ]}
        />
      </div>

      <div className="a-header sub">
        <h2>Cupones de descuento</h2>
        {editable && (
          <button className="a-btn" onClick={() => setCoupon({ id: newId('c'), code: '', tipo: 'porcentaje', valor: 10, usos: 0, activo: true })}>
            Nuevo cupón
          </button>
        )}
      </div>
      <div className="a-card flush">
        <Table
          rows={data.coupons}
          onRow={setCoupon}
          columns={[
            { label: 'Código', cell: (c) => <code>{c.code}</code> },
            { label: 'Descuento', cell: (c) => (c.tipo === 'porcentaje' ? `${c.valor} %` : money(c.valor)) },
            { label: 'Usos', align: 'right', cell: (c) => (c.maxUsos ? `${c.usos} / ${c.maxUsos}` : c.usos) },
            { label: 'Caduca', cell: (c) => (c.caduca ? fecha(c.caduca) : 'Nunca') },
            { label: 'Estado', cell: (c) => (c.activo ? <Badge tone="ok">Activo</Badge> : <Badge>Desactivado</Badge>) },
          ]}
        />
      </div>
      {open && <ProductModal product={open} onClose={() => setOpen(null)} />}
      {coupon && <CouponModal coupon={coupon} onClose={() => setCoupon(null)} />}
    </>
  );
}

function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data, save, remove, can, toast } = useAdmin();
  const [p, setP] = useState(product);
  const isNew = !data.products.some((x) => x.id === product.id);
  const editable = can('editar_tienda');
  const hasSales = data.orders.some((o) => o.productId === product.id);
  const commit = async () => {
    if (!p.nombre.trim()) return toast('Ponle un nombre');
    await save('products', { ...p, nombre: p.nombre.trim(), stock: p.tipo === 'kit' ? (p.stock ?? 0) : undefined }, isNew ? 'Producto creado' : 'Producto modificado', `${p.nombre} · ${money(p.precio)} · ${p.activo ? 'a la venta' : 'oculto'}`);
    toast('Producto guardado');
    onClose();
  };
  return (
    <Modal
      title={isNew ? 'Nuevo producto' : product.nombre}
      onClose={onClose}
      footer={
        <>
          {!isNew && editable && !hasSales && (
            <ConfirmButton onConfirm={() => remove('products', p.id, 'Producto borrado', p.nombre).then(onClose)}>Borrar</ConfirmButton>
          )}
          <span className="a-spacer" />
          <button className="a-btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="a-btn primary" disabled={!editable} onClick={commit}>
            Guardar
          </button>
        </>
      }
    >
      <div className="a-form-grid">
        <Field label="Nombre">
          <input className="a-input" value={p.nombre} disabled={!editable} onChange={(e) => setP({ ...p, nombre: e.target.value })} />
        </Field>
        <Field label="Tipo">
          <select className="a-input" value={p.tipo} disabled={!editable || !isNew} onChange={(e) => setP({ ...p, tipo: e.target.value as ProductKind })}>
            {(Object.keys(TIPO) as ProductKind[]).map((t) => (
              <option key={t} value={t}>
                {TIPO[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Precio (IVA incluido)">
          <EuroInput cents={p.precio} onChange={(precio) => setP({ ...p, precio })} />
        </Field>
        {p.tipo === 'kit' && (
          <Field label="Stock (unidades)">
            <input className="a-input" type="number" min={0} value={p.stock ?? 0} disabled={!editable} onChange={(e) => setP({ ...p, stock: Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
        )}
      </div>
      <Field label="Descripción">
        <textarea className="a-input" rows={2} value={p.descripcion} disabled={!editable} onChange={(e) => setP({ ...p, descripcion: e.target.value })} />
      </Field>
      <label className="a-check">
        <input type="checkbox" checked={p.activo} disabled={!editable} onChange={(e) => setP({ ...p, activo: e.target.checked })} />
        A la venta
      </label>
      {hasSales && <p className="a-muted small">Tiene ventas: no se puede borrar (se perdería el historial). Ocúltalo si ya no lo vendes.</p>}
    </Modal>
  );
}

function CouponModal({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const { data, now, save, can, toast } = useAdmin();
  const [c, setC] = useState(coupon);
  const isNew = !data.coupons.some((x) => x.id === coupon.id);
  const editable = can('editar_tienda');
  const pro = data.products.find((p) => p.tipo === 'pro');
  const example = pro ? applyCoupon(pro.precio, c, now) : null;
  const commit = async () => {
    const code = normalizeCouponCode(c.code);
    if (!code) return toast('Escribe un código');
    if (data.coupons.some((x) => x.code === code && x.id !== c.id)) return toast('Ya existe un cupón con ese código');
    if (c.tipo === 'porcentaje' && (c.valor < 1 || c.valor > 100)) return toast('El porcentaje debe estar entre 1 y 100');
    await save('coupons', { ...c, code }, isNew ? 'Cupón creado' : 'Cupón modificado', `${code}: ${c.tipo === 'porcentaje' ? `${c.valor} %` : money(c.valor)}, ${c.activo ? 'activo' : 'desactivado'}`);
    toast('Cupón guardado');
    onClose();
  };
  return (
    <Modal
      title={isNew ? 'Nuevo cupón' : c.code}
      onClose={onClose}
      footer={
        <>
          <button className="a-btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="a-btn primary" disabled={!editable} onClick={commit}>
            Guardar
          </button>
        </>
      }
    >
      <div className="a-form-grid">
        <Field label="Código" hint="Mayúsculas y números; sin espacios.">
          <input className="a-input mono" value={c.code} disabled={!editable} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Tipo">
          <select className="a-input" value={c.tipo} disabled={!editable} onChange={(e) => setC({ ...c, tipo: e.target.value as Coupon['tipo'], valor: e.target.value === 'porcentaje' ? 10 : 100 })}>
            <option value="porcentaje">Porcentaje</option>
            <option value="fijo">Importe fijo</option>
          </select>
        </Field>
        <Field label={c.tipo === 'porcentaje' ? 'Descuento (%)' : 'Descuento'}>
          {c.tipo === 'porcentaje' ? (
            <input className="a-input" type="number" min={1} max={100} value={c.valor} disabled={!editable} onChange={(e) => setC({ ...c, valor: Number(e.target.value) || 0 })} />
          ) : (
            <EuroInput cents={c.valor} onChange={(valor) => setC({ ...c, valor })} />
          )}
        </Field>
        <Field label="Usos máximos" hint="Vacío = sin límite.">
          <input className="a-input" type="number" min={1} value={c.maxUsos ?? ''} disabled={!editable} onChange={(e) => setC({ ...c, maxUsos: e.target.value ? Number(e.target.value) : undefined })} />
        </Field>
        <Field label="Caduca" hint="Vacío = no caduca.">
          <input
            className="a-input"
            type="date"
            value={c.caduca ? new Date(c.caduca).toISOString().slice(0, 10) : ''}
            disabled={!editable}
            onChange={(e) => setC({ ...c, caduca: e.target.value ? new Date(`${e.target.value}T23:59:59`).getTime() : undefined })}
          />
        </Field>
      </div>
      <label className="a-check">
        <input type="checkbox" checked={c.activo} disabled={!editable} onChange={(e) => setC({ ...c, activo: e.target.checked })} />
        Activo
      </label>
      {pro && example && (
        <p className="a-muted small">
          Ejemplo con «{pro.nombre}» ({money(pro.precio)}): {example.ok ? `queda en ${money(example.total)}` : example.motivo}.
        </p>
      )}
    </Modal>
  );
}
