import { useState } from 'react';
import { fecha, matches, newId, toCsv } from '../logic';
import { useAdmin } from '../store';
import type { Announcement } from '../types';
import { Badge, ConfirmButton, Field, Header, Modal, Search, Table, Toolbar, download } from '../ui';

/** Mensajes que la app mostrará a todos los usuarios (novedades, mantenimiento…). */
export function Avisos() {
  const { data, now, can } = useAdmin();
  const [open, setOpen] = useState<Announcement | null>(null);
  const live = (a: Announcement) => a.activo && a.desde <= now && (!a.hasta || a.hasta >= now);
  return (
    <>
      <Header
        title="Avisos"
        subtitle="Mensajes que verán los usuarios al abrir la app: novedades de la tienda, mantenimientos, torneos…"
        actions={
          can('editar_avisos') && (
            <button className="a-btn primary" onClick={() => setOpen({ id: newId('a'), titulo: '', texto: '', nivel: 'info', activo: false, desde: Date.now() })}>
              Nuevo aviso
            </button>
          )
        }
      />
      <div className="a-card flush">
        <Table
          rows={data.announcements}
          onRow={setOpen}
          columns={[
            {
              label: 'Aviso',
              cell: (a) => (
                <div className="a-cell2">
                  <strong>{a.titulo}</strong>
                  <span>{a.texto}</span>
                </div>
              ),
            },
            { label: 'Tipo', cell: (a) => (a.nivel === 'aviso' ? <Badge tone="warn">Importante</Badge> : <Badge tone="accent">Novedad</Badge>) },
            { label: 'Desde', cell: (a) => fecha(a.desde) },
            { label: 'Hasta', cell: (a) => (a.hasta ? fecha(a.hasta) : '—') },
            { label: 'Estado', cell: (a) => (live(a) ? <Badge tone="ok">Visible</Badge> : <Badge>No visible</Badge>) },
          ]}
        />
      </div>
      {open && <AnnouncementModal item={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function AnnouncementModal({ item, onClose }: { item: Announcement; onClose: () => void }) {
  const { data, save, remove, can, toast } = useAdmin();
  const [a, setA] = useState(item);
  const isNew = !data.announcements.some((x) => x.id === item.id);
  const editable = can('editar_avisos');
  const dateValue = (t?: number) => (t ? new Date(t).toISOString().slice(0, 10) : '');
  const commit = async () => {
    if (!a.titulo.trim()) return toast('Ponle un título');
    await save('announcements', a, isNew ? 'Aviso creado' : 'Aviso modificado', `${a.titulo} (${a.activo ? 'activo' : 'inactivo'})`);
    toast('Aviso guardado');
    onClose();
  };
  return (
    <Modal
      title={isNew ? 'Nuevo aviso' : item.titulo}
      onClose={onClose}
      footer={
        <>
          {!isNew && editable && <ConfirmButton onConfirm={() => remove('announcements', a.id, 'Aviso borrado', a.titulo).then(onClose)}>Borrar</ConfirmButton>}
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
      <Field label="Título">
        <input className="a-input" value={a.titulo} maxLength={60} disabled={!editable} onChange={(e) => setA({ ...a, titulo: e.target.value })} />
      </Field>
      <Field label="Texto" hint={`${a.texto.length}/160`}>
        <textarea className="a-input" rows={3} maxLength={160} value={a.texto} disabled={!editable} onChange={(e) => setA({ ...a, texto: e.target.value })} />
      </Field>
      <div className="a-form-grid">
        <Field label="Tipo">
          <select className="a-input" value={a.nivel} disabled={!editable} onChange={(e) => setA({ ...a, nivel: e.target.value as Announcement['nivel'] })}>
            <option value="info">Novedad</option>
            <option value="aviso">Importante</option>
          </select>
        </Field>
        <Field label="Desde">
          <input className="a-input" type="date" value={dateValue(a.desde)} disabled={!editable} onChange={(e) => e.target.value && setA({ ...a, desde: new Date(`${e.target.value}T00:00:00`).getTime() })} />
        </Field>
        <Field label="Hasta" hint="Vacío = sin fecha de fin.">
          <input className="a-input" type="date" value={dateValue(a.hasta)} disabled={!editable} onChange={(e) => setA({ ...a, hasta: e.target.value ? new Date(`${e.target.value}T23:59:59`).getTime() : undefined })} />
        </Field>
      </div>
      <label className="a-check">
        <input type="checkbox" checked={a.activo} disabled={!editable} onChange={(e) => setA({ ...a, activo: e.target.checked })} />
        Activo
      </label>
      <div className={`a-preview ${a.nivel}`}>
        <strong>{a.titulo || 'Título del aviso'}</strong>
        <span>{a.texto || 'Así lo verán los usuarios en la app.'}</span>
      </div>
    </Modal>
  );
}

export function Actividad() {
  const { data } = useAdmin();
  const [q, setQ] = useState('');
  const rows = data.audit.filter((a) => matches(q, a.accion, a.detalle, a.actor));
  return (
    <>
      <Header
        title="Registro de actividad"
        subtitle="Todo lo que se cambia desde el panel: quién, cuándo y qué. No se puede editar."
        actions={
          <button
            className="a-btn"
            onClick={() =>
              download(
                'actividad.csv',
                toCsv(rows, [
                  { label: 'Fecha', value: (a) => new Date(a.at).toLocaleString('es-ES') },
                  { label: 'Quién', value: (a) => a.actor },
                  { label: 'Acción', value: (a) => a.accion },
                  { label: 'Detalle', value: (a) => a.detalle },
                ]),
              )
            }
          >
            Exportar CSV
          </button>
        }
      />
      <Toolbar>
        <Search value={q} onChange={setQ} placeholder="Buscar en el registro" />
      </Toolbar>
      <div className="a-card flush">
        <Table
          rows={rows}
          pageSize={50}
          columns={[
            { label: 'Fecha', width: '170px', cell: (a) => new Date(a.at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) },
            { label: 'Quién', cell: (a) => a.actor },
            { label: 'Acción', cell: (a) => <strong>{a.accion}</strong> },
            { label: 'Detalle', cell: (a) => <span className="a-muted">{a.detalle}</span> },
          ]}
        />
      </div>
    </>
  );
}
