/** Piezas comunes del panel: cabecera de sección, tarjetas de cifras, tablas, ventanas y campos. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';

export function Header({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="a-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="a-sub">{subtitle}</p>}
      </div>
      {actions && <div className="a-actions">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  delta,
  deltaLabel = 'vs mes anterior',
  hint,
  onClick,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  hint?: string;
  onClick?: () => void;
}) {
  const d = delta === undefined || delta === null ? null : delta;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`a-stat ${onClick ? 'click' : ''}`} onClick={onClick}>
      <span className="a-stat-label">{label}</span>
      <span className="a-stat-value">{value}</span>
      {d !== null ? (
        <span className={`a-delta ${d >= 0 ? 'up' : 'down'}`}>
          {d >= 0 ? '▲' : '▼'} {Math.abs(d * 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })} % {deltaLabel}
        </span>
      ) : (
        hint && <span className="a-stat-hint">{hint}</span>
      )}
    </Tag>
  );
}

export type Tone = 'ok' | 'warn' | 'danger' | 'neutral' | 'accent';
/** Estado con color + texto (nunca solo color). */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`a-badge ${tone}`}>{children}</span>;
}

export interface Column<T> {
  label: string;
  cell: (r: T) => ReactNode;
  align?: 'right';
  width?: string;
}

export function Table<T extends { id: string }>({
  rows,
  columns,
  onRow,
  empty = 'No hay nada que mostrar.',
  pageSize = 25,
}: {
  rows: T[];
  columns: Column<T>[];
  onRow?: (r: T) => void;
  empty?: string;
  pageSize?: number;
}) {
  const [limit, setLimit] = useState(pageSize);
  useEffect(() => setLimit(pageSize), [rows, pageSize]);
  if (!rows.length) return <div className="a-empty">{empty}</div>;
  return (
    <div className="a-table-wrap">
      <table className="a-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label} style={{ textAlign: c.align, width: c.width }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((r) => (
            <tr
              key={r.id}
              className={onRow ? 'click' : ''}
              onClick={onRow ? () => onRow(r) : undefined}
              tabIndex={onRow ? 0 : undefined}
              onKeyDown={onRow ? (e) => e.key === 'Enter' && onRow(r) : undefined}
            >
              {columns.map((c) => (
                <td key={c.label} style={{ textAlign: c.align }}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="a-table-foot">
        <span>
          {Math.min(limit, rows.length)} de {rows.length}
        </span>
        {limit < rows.length && (
          <button className="a-btn ghost sm" onClick={() => setLimit(limit + pageSize)}>
            Ver más
          </button>
        )}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="a-modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="a-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="a-modal-head">
          <h2>{title}</h2>
          <button className="a-btn ghost sm" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="a-modal-body">{children}</div>
        {footer && <div className="a-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="a-field">
      <span className="a-field-label">{label}</span>
      {children}
      {hint && <span className="a-field-hint">{hint}</span>}
    </label>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="a-toolbar">{children}</div>;
}

export function Search({ value, onChange, placeholder = 'Buscar…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="a-input a-search" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />;
}

export function Select<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <select className="a-input" value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Botón que pide una segunda pulsación para acciones delicadas (reembolsar, revocar, borrar). */
export function ConfirmButton({ children, onConfirm, tone = 'danger', disabled }: { children: ReactNode; onConfirm: () => void; tone?: 'danger' | 'primary'; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`a-btn ${tone}`}
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? '¿Seguro? Pulsa otra vez' : children}
    </button>
  );
}

/** Campo de euros que guarda céntimos. */
export function EuroInput({ cents, onChange }: { cents: number; onChange: (c: number) => void }) {
  const [text, setText] = useState((cents / 100).toFixed(2).replace('.', ','));
  useEffect(() => setText((cents / 100).toFixed(2).replace('.', ',')), [cents]);
  return (
    <div className="a-euro">
      <input
        className="a-input"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value.replace(/\./g, '').replace(',', '.'));
          if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 100));
        }}
      />
      <span>€</span>
    </div>
  );
}

export function download(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function useFiltered<T>(rows: T[], fn: (r: T) => boolean, deps: unknown[]): T[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => rows.filter(fn), [rows, ...deps]);
}
