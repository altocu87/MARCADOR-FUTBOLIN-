import { BarList, ColumnChart } from '../Chart';
import { compact, computeStats, delta, fecha, money, monthLabel, percent, userName } from '../logic';
import { useAdmin } from '../store';
import type { ProductKind } from '../types';
import { Badge, Header, Stat, Table } from '../ui';
import { ORDER_TONE, ORDER_LABEL } from './Ventas';

const TIPO: Record<ProductKind, string> = { pro: 'Pro', tema: 'Temas', sonido: 'Sonidos', pack: 'Packs', suscripcion: 'Suscripciones de bares', kit: 'Kits de hardware' };

export function Resumen({ go }: { go: (s: string) => void }) {
  const { data, now } = useAdmin();
  const s = computeStats(data, now);
  const productName = new Map(data.products.map((p) => [p.id, p.nombre]));
  const impagados = data.venues.filter((v) => v.estado === 'impagada');
  return (
    <>
      <Header title="Resumen" subtitle={`Hoy, ${fecha(now)}`} />
      <div className="a-stats">
        <Stat
          label="Ingresos de este mes"
          value={money(s.ingresosMes)}
          delta={delta(s.ingresosMes, s.ingresosMesAnterior)}
          deltaLabel={`vs mismos ${new Date(now).getDate()} días del mes anterior`}
          onClick={() => go('ventas')}
        />
        <Stat label="Ingresos recurrentes (bares)" value={money(s.mrr)} hint={`${s.baresActivos} bares activos · al mes`} onClick={() => go('bares')} />
        <Stat label="Usuarios" value={compact(s.usuarios)} hint={`${s.nuevos30} nuevos y ${s.activos30} activos en 30 días`} onClick={() => go('usuarios')} />
        <Stat label="Usuarios Pro" value={percent(s.conversion)} hint={`${s.pro} de ${s.usuarios}`} />
      </div>

      {(s.envioPendientes > 0 || impagados.length > 0 || s.reembolsos30 > 0) && (
        <div className="a-todo">
          <strong>Pendiente</strong>
          {s.envioPendientes > 0 && (
            <button className="a-link" onClick={() => go('envios')}>
              {s.envioPendientes} kits por preparar o enviar
            </button>
          )}
          {impagados.length > 0 && (
            <button className="a-link" onClick={() => go('bares')}>
              {impagados.length} {impagados.length === 1 ? 'bar con la cuota impagada' : 'bares con la cuota impagada'}
            </button>
          )}
          {s.reembolsos30 > 0 && (
            <button className="a-link" onClick={() => go('ventas')}>
              {s.reembolsos30} reembolsos en 30 días
            </button>
          )}
        </div>
      )}

      <div className="a-grid-2">
        <ColumnChart
          title="Ingresos por mes"
          points={s.ingresos12.map((m) => ({ key: m.key, label: monthLabel(m.key), value: m.total }))}
          format={money}
          formatAxis={(v) => `${compact(Math.round(v / 100))} €`}
        />
        <BarList title="Ingresos por tipo (todo el periodo)" rows={s.porTipo.map((t) => ({ label: TIPO[t.tipo], value: t.total }))} format={money} />
      </div>

      <div className="a-card">
        <div className="a-chart-head">
          <h2>Últimas ventas</h2>
          <button className="a-btn ghost sm" onClick={() => go('ventas')}>
            Ver todas
          </button>
        </div>
        <Table
          rows={data.orders.slice(0, 6)}
          pageSize={6}
          columns={[
            { label: 'Fecha', cell: (o) => fecha(o.fecha) },
            { label: 'Cliente', cell: (o) => userName(data.users, o.userId) },
            { label: 'Producto', cell: (o) => productName.get(o.productId) ?? o.productId },
            { label: 'Estado', cell: (o) => <Badge tone={ORDER_TONE[o.estado]}>{ORDER_LABEL[o.estado]}</Badge> },
            { label: 'Importe', align: 'right', cell: (o) => money(o.importe) },
          ]}
        />
      </div>
    </>
  );
}
