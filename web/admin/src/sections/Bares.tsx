import { useState } from 'react';
import { VENUE_PRICE, fecha, matches, money, userName } from '../logic';
import { useAdmin } from '../store';
import type { Venue, VenuePlan, VenueStatus } from '../types';
import { Badge, Field, Header, Modal, Search, Select, Table, Toolbar, type Tone } from '../ui';

export const VENUE_TONE: Record<VenueStatus, Tone> = { activa: 'ok', prueba: 'accent', impagada: 'danger', cancelada: 'neutral' };
export const VENUE_LABEL: Record<VenueStatus, string> = { activa: 'Activa', prueba: 'En prueba', impagada: 'Impagada', cancelada: 'Cancelada' };
const PLAN_LABEL: Record<VenuePlan, string> = { 'bar-basico': 'Bar Básico', 'bar-pro': 'Bar Pro' };

export function Bares() {
  const { data } = useAdmin();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<VenueStatus | 'todos'>('todos');
  const [open, setOpen] = useState<Venue | null>(null);
  const rows = data.venues.filter((v) => (estado === 'todos' || v.estado === estado) && matches(q, v.nombre, v.ciudad));
  const mrr = data.venues.filter((v) => v.estado === 'activa').reduce((a, v) => a + v.cuota, 0);
  return (
    <>
      <Header title="Bares y clubes" subtitle={`${data.venues.length} locales · ${money(mrr)} al mes en cuotas activas`} />
      <Toolbar>
        <Search value={q} onChange={setQ} placeholder="Buscar por nombre o ciudad" />
        <Select
          label="Estado"
          value={estado}
          onChange={setEstado}
          options={[{ value: 'todos', label: 'Todos los estados' }, ...(Object.keys(VENUE_LABEL) as VenueStatus[]).map((s) => ({ value: s, label: VENUE_LABEL[s] }))]}
        />
      </Toolbar>
      <div className="a-card flush">
        <Table
          rows={rows}
          onRow={setOpen}
          columns={[
            {
              label: 'Local',
              cell: (v) => (
                <div className="a-cell2">
                  <strong>{v.nombre}</strong>
                  <span>{v.ciudad}</span>
                </div>
              ),
            },
            { label: 'Plan', cell: (v) => PLAN_LABEL[v.plan] },
            { label: 'Mesas', align: 'right', cell: (v) => v.mesas },
            { label: 'Estado', cell: (v) => <Badge tone={VENUE_TONE[v.estado]}>{VENUE_LABEL[v.estado]}</Badge> },
            { label: 'Renovación', cell: (v) => (v.estado === 'cancelada' ? '—' : fecha(v.renovacion)) },
            { label: 'Cuota / mes', align: 'right', cell: (v) => money(v.cuota) },
          ]}
        />
      </div>
      {open && <VenueModal venue={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function VenueModal({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const { data, save, can, toast } = useAdmin();
  const [v, setV] = useState(venue);
  const editable = can('editar_usuarios');
  const cuota = VENUE_PRICE(v.plan, v.mesas, data.settings);
  const commit = async () => {
    const next = { ...v, cuota };
    await save('venues', next, 'Bar modificado', `${v.nombre}: ${PLAN_LABEL[v.plan]}, ${v.mesas} mesas, ${VENUE_LABEL[v.estado]}, ${money(cuota)}/mes`);
    toast('Bar guardado');
    onClose();
  };
  return (
    <Modal
      title={venue.nombre}
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
      <p className="a-muted">
        {venue.ciudad} · dueño: {userName(data.users, venue.ownerId)} · cliente desde {fecha(venue.desde)}
      </p>
      <div className="a-form-grid">
        <Field label="Plan">
          <select className="a-input" value={v.plan} disabled={!editable} onChange={(e) => setV({ ...v, plan: e.target.value as VenuePlan })}>
            <option value="bar-basico">Bar Básico</option>
            <option value="bar-pro">Bar Pro</option>
          </select>
        </Field>
        <Field label="Mesas">
          <input className="a-input" type="number" min={1} max={50} value={v.mesas} disabled={!editable} onChange={(e) => setV({ ...v, mesas: Math.max(1, Number(e.target.value) || 1) })} />
        </Field>
        <Field label="Estado de la suscripción">
          <select className="a-input" value={v.estado} disabled={!editable} onChange={(e) => setV({ ...v, estado: e.target.value as VenueStatus })}>
            {(Object.keys(VENUE_LABEL) as VenueStatus[]).map((s) => (
              <option key={s} value={s}>
                {VENUE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cuota mensual" hint="Se calcula con los precios de Ajustes × mesas.">
          <input className="a-input" value={money(cuota)} disabled />
        </Field>
      </div>
      <p className="a-muted small">
        Con un proveedor de pagos conectado, el cobro y los impagos se actualizan solos. Aquí se ajusta a mano y queda en el registro.
      </p>
    </Modal>
  );
}
