import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import {
  CONFIG_LIMITS,
  DEFAULT_CONFIG,
  validateConfig,
  type EndCondition,
  type MatchConfig,
  type MatchMode,
} from '../../match-engine';
import { MODE_LABEL, ModeBadge, NeonSign, ScreenFrame, TestModeBadge, Toggle } from '../components/common';

/** Las dos tarjetas activas a la vez equivalen a «ambas». */
function conditionFrom(goals: boolean, time: boolean): EndCondition {
  return goals && time ? 'both' : time ? 'time' : 'goals';
}

/**
 * Tarjeta de condición: triángulo ▲ pegado encima, recuadro con el número y triángulo ▼ pegado debajo.
 * Tocar el número activa o desactiva la tarjeta (decide si el partido es por goles, por tiempo o ambos).
 */
function ConditionCard({
  title,
  label,
  unit,
  value,
  min,
  max,
  active,
  onToggle,
  onChange,
}: {
  title: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  active: boolean;
  onToggle: () => void;
  onChange: (v: number) => void;
}) {
  return (
    <div className={`cond${active ? ' on' : ''}`} role="group" aria-label={title}>
      <button
        className="cond-btn up"
        aria-label={`Sumar ${label}`}
        disabled={!active || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <NeonSign kind="sumar" fallback="+" />
      </button>
      <button
        className="cond-box"
        aria-pressed={active}
        aria-label={`${title}: ${value} ${unit}. ${active ? 'Toca para desactivar' : 'Toca para activar'}`}
        onClick={onToggle}
      >
        <span className="label cond-title">{title}</span>
        <span className="num" aria-live="polite">{value}</span>
      </button>
      <button
        className="cond-btn down"
        aria-label={`Restar ${label}`}
        disabled={!active || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <NeonSign kind="restar" fallback="−" />
      </button>
    </div>
  );
}

export function SetupScreen({ mode, initial }: { mode: MatchMode; initial?: MatchConfig }) {
  const { navigate, prefs, demoMode, toast } = useApp();
  const [config, setConfig] = useState<MatchConfig>(
    () =>
      initial ?? {
        ...DEFAULT_CONFIG,
        mode,
        endCondition: prefs.defaultEndCondition,
        goalsPerPeriod: prefs.defaultGoalsPerPeriod,
        minutesPerPeriod: prefs.defaultMinutesPerPeriod,
        penaltyFirstTeam: prefs.penaltyFirstTeam,
        // Todos los partidos se guardan; en modo prueba van a los datos de prueba.
        testMode: false,
        ...(mode === 'chaos' ? { chaos: { ...prefs.chaosRules } } : {}),
      },
  );
  const set = (patch: Partial<MatchConfig>) => setConfig((c) => ({ ...c, ...patch }));
  const errors = validateConfig(config);
  const usesGoals = config.endCondition !== 'time';
  const usesTime = config.endCondition !== 'goals';
  // Siempre debe quedar al menos una de las dos tarjetas activa.
  const toggle = (which: 'goals' | 'time') => {
    const goals = which === 'goals' ? !usesGoals : usesGoals;
    const time = which === 'time' ? !usesTime : usesTime;
    if (!goals && !time) {
      toast('Deja activa al menos una: goles o tiempo');
      return;
    }
    set({ endCondition: conditionFrom(goals, time) });
  };

  return (
    <ScreenFrame
      title="Configuración"
      subtitle={MODE_LABEL[mode]}
      onBack={() => navigate({ name: 'home' })}
      right={
        <>
          {demoMode && <TestModeBadge />}
          <ModeBadge mode={mode} />
        </>
      }
      footer={
        <>
          <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {errors.length > 0 && <span className="notice error">{errors[0]}</span>}
          </div>
          <button className="btn btn-ghost btn-lg" onClick={() => navigate({ name: 'home' })}>
            Volver
          </button>
          <button
            className="btn btn-primary btn-lg"
            disabled={errors.length > 0}
            onClick={() => navigate({ name: 'select', config })}
          >
            Continuar
          </button>
        </>
      }
    >
      {mode === 'chaos' && config.chaos && (
        <div className="card chaos-rules">
          <div className="label" style={{ color: 'var(--chaos)' }}>Reglas Caos (propuesta caos-1)</div>
          <div style={{ display: 'flex', gap: 18 }}>
            <Toggle
              checked={config.chaos.jokers}
              onChange={(v) => set({ chaos: { ...config.chaos!, jokers: v } })}
              label="Comodín"
              description="Un uso por equipo: su siguiente gol vale doble."
            />
            <Toggle
              checked={config.chaos.doubleLastMinute}
              onChange={(v) => set({ chaos: { ...config.chaos!, doubleLastMinute: v } })}
              label="Último minuto x2"
              description="Con tiempo: los goles del último minuto valen doble."
            />
          </div>
        </div>
      )}
      <div className="grid-2 setup-conditions">
        <ConditionCard
          title="Goles para ganar"
          label="goles para ganar"
          unit="goles"
          value={config.goalsPerPeriod}
          min={CONFIG_LIMITS.goalsPerPeriod.min}
          max={CONFIG_LIMITS.goalsPerPeriod.max}
          active={usesGoals}
          onToggle={() => toggle('goals')}
          onChange={(v) => set({ goalsPerPeriod: v })}
        />
        <ConditionCard
          title="Minutos por parte"
          label="minutos por parte"
          unit="min"
          value={config.minutesPerPeriod}
          min={CONFIG_LIMITS.minutesPerPeriod.min}
          max={CONFIG_LIMITS.minutesPerPeriod.max}
          active={usesTime}
          onToggle={() => toggle('time')}
          onChange={(v) => set({ minutesPerPeriod: v })}
        />
      </div>
    </ScreenFrame>
  );
}
