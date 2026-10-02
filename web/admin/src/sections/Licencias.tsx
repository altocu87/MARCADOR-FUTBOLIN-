import { useState } from 'react';
import { fecha, generateLicense, isValidLicense, matches, newId, toCsv, userName } from '../logic';
import { useAdmin } from '../store';
import type { License, LicenseStatus } from '../types';
import { Badge, ConfirmButton, Field, Header, Modal, Search, Select, Table, Toolbar, download, type Tone } from '../ui';

const TONE: Record<LicenseStatus, Tone> = { libre: 'accent', activa: 'ok', revocada: 'danger' };
const LABEL: Record<LicenseStatus, string> = { libre: 'Libre', activa: 'Activa', revocada: 'Revocada' };

export function Licencias() {
  const { data, save, can, toast } = useAdmin();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<LicenseStatus | 'todos'>('todos');
  const [open, setOpen] = useState<License | null>(null);
  const [check, setCheck] = useState('');
  const [n, setN] = useState(10);
  const rows = data.licenses
    .filter((l) => (estado === 'todos' || l.estado === estado) && matches(q, l.code, userName(data.users, l.userId)))
    .sort((a, b) => b.creada - a.creada);

  const generate = async () => {
    const codes: string[] = [];
    for (let i = 0; i < n; i++) {
      const l: License = { id: newId('l'), code: generateLicense(), estado: 'libre', creada: Date.now(), activaciones: 0, maxActivaciones: 3 };
      codes.push(l.code);
      await save('licenses', l, 'Licencia creada', l.code);
    }
    download(`licencias-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(codes.map((c, i) => ({ id: String(i), c })), [{ label: 'Código', value: (r) => r.c }]));
    toast(`${n} códigos creados y descargados`);
  };

  const found = check.trim() ? data.licenses.find((l) => l.code === check.trim().toUpperCase()) : undefined;
  return (
    <>
      <Header
        title="Licencias Pro"
        subtitle="Códigos MFV3-XXXX-XXXX-XXXX para regalar, vender en kits o reponer. El último carácter detecta errores al teclear."
        actions={
          can('gestionar_licencias') && (
            <div className="a-inline">
              <input className="a-input narrow" type="number" min={1} max={500} value={n} onChange={(e) => setN(Math.min(500, Math.max(1, Number(e.target.value) || 1)))} aria-label="Cuántos códigos" />
              <button className="a-btn primary" onClick={generate}>
                Generar códigos
              </button>
            </div>
          )
        }
      />
      <div className="a-card a-check-box">
        <Field label="Comprobar un código" hint={check.trim() ? (isValidLicense(check) ? (found ? `${LABEL[found.estado]} · ${found.activaciones}/${found.maxActivaciones} activaciones · ${userName(data.users, found.userId)}` : 'Formato válido, pero no existe en la base de datos.') : 'Formato no válido o mal tecleado.') : 'Pega el código que te da un cliente.'}>
          <input className="a-input mono" value={check} onChange={(e) => setCheck(e.target.value)} placeholder="MFV3-XXXX-XXXX-XXXX" />
        </Field>
      </div>
      <Toolbar>
        <Search value={q} onChange={setQ} placeholder="Buscar por código o cliente" />
        <Select
          label="Estado"
          value={estado}
          onChange={setEstado}
          options={[{ value: 'todos', label: 'Todas' }, ...(Object.keys(LABEL) as LicenseStatus[]).map((s) => ({ value: s, label: LABEL[s] }))]}
        />
      </Toolbar>
      <div className="a-card flush">
        <Table
          rows={rows}
          onRow={setOpen}
          columns={[
            { label: 'Código', cell: (l) => <code>{l.code}</code> },
            { label: 'Estado', cell: (l) => <Badge tone={TONE[l.estado]}>{LABEL[l.estado]}</Badge> },
            { label: 'Cliente', cell: (l) => userName(data.users, l.userId) },
            { label: 'Activaciones', align: 'right', cell: (l) => `${l.activaciones} / ${l.maxActivaciones}` },
            { label: 'Creada', cell: (l) => fecha(l.creada) },
          ]}
        />
      </div>
      {open && <LicenseModal lic={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function LicenseModal({ lic, onClose }: { lic: License; onClose: () => void }) {
  const { data, save, can, toast } = useAdmin();
  const [email, setEmail] = useState('');
  const editable = can('gestionar_licencias');
  const assign = async () => {
    const u = data.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return toast('No hay ningún usuario con ese correo');
    await save('licenses', { ...lic, userId: u.id, estado: 'activa' }, 'Licencia asignada', `${lic.code} → ${u.email}`);
    if (u.plan !== 'pro') await save('users', { ...u, plan: 'pro' }, 'Usuario modificado', `${u.email}: plan gratis → pro (licencia ${lic.code})`);
    toast('Licencia asignada');
    onClose();
  };
  const setEstado = async (estado: LicenseStatus, accion: string) => {
    await save('licenses', { ...lic, estado }, accion, lic.code);
    toast(accion);
    onClose();
  };
  return (
    <Modal title={lic.code} onClose={onClose} footer={<button className="a-btn ghost" onClick={onClose}>Cerrar</button>}>
      <dl className="a-dl">
        <dt>Estado</dt>
        <dd>
          <Badge tone={TONE[lic.estado]}>{LABEL[lic.estado]}</Badge>
        </dd>
        <dt>Cliente</dt>
        <dd>{userName(data.users, lic.userId)}</dd>
        <dt>Pedido</dt>
        <dd>{lic.orderId ?? '—'}</dd>
        <dt>Activaciones</dt>
        <dd>
          {lic.activaciones} de {lic.maxActivaciones} dispositivos
        </dd>
      </dl>
      <div className="a-row-actions">
        <button className="a-btn" onClick={() => navigator.clipboard?.writeText(lic.code).then(() => toast('Código copiado'))}>
          Copiar código
        </button>
        {editable && lic.activaciones > 0 && (
          <button className="a-btn" onClick={() => save('licenses', { ...lic, activaciones: 0 }, 'Activaciones reiniciadas', lic.code).then(() => { toast('Activaciones a 0'); onClose(); })}>
            Reiniciar activaciones
          </button>
        )}
        {editable && lic.estado !== 'revocada' && <ConfirmButton onConfirm={() => setEstado('revocada', 'Licencia revocada')}>Revocar</ConfirmButton>}
        {editable && lic.estado === 'revocada' && (
          <button className="a-btn" onClick={() => setEstado(lic.userId ? 'activa' : 'libre', 'Licencia reactivada')}>
            Reactivar
          </button>
        )}
      </div>
      {editable && lic.estado === 'libre' && (
        <div className="a-inline" style={{ marginTop: 16 }}>
          <input className="a-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo del cliente" aria-label="Correo del cliente" />
          <button className="a-btn primary" onClick={assign}>
            Asignar
          </button>
        </div>
      )}
    </Modal>
  );
}
