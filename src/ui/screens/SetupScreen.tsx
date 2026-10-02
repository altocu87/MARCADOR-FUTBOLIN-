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
import { MODE_LABEL, ModeBadge, ScreenFrame, Stepper, TestModeBadge, Toggle } from '../components/common';

const CONDITIONS: { id: EndCondition; label: string; help: string }[] = [
  { id: 'goals', label: 'POR GOLES', help: 'La parte termina al sumar el objetivo de goles entre los dos equipos.' },
  { id: 'time', label: 'POR TIEMPO', help: 'La parte termina al agotarse su tiempo.' },
  { id: 'both', label: 'AMBAS', help: 'Termina con lo que ocurra primero: goles o tiempo.' },
];

export function SetupScreen({ mode, initial }: { mode: MatchMode; initial?: MatchConfig }) {
  const { navigate, prefs } = useApp();
  const [config, setConfig] = useState<MatchConfig>(
    () =>
      initial ?? {
        ...DEFAULT_CONFIG,
        mode,
        endCondition: prefs.defaultEndCondition,
        goalsPerPeriod: prefs.defaultGoalsPerPeriod,
        minutesPerPeriod: prefs.defaultMinutesPerPeriod,
        penaltyFirstTeam: prefs.penaltyFirstTeam,
        testMode: prefs.testModeDefault,
      },
  );
  const set = (patch: Partial<MatchConfig>) => setConfig((c) => ({ ...c, ...patch }));
  const errors = validateConfig(config);
  const usesGoals = config.endCondition !== 'time';
  const usesTime = config.endCondition !== 'goals';

  return (
    <ScreenFrame
      title="Configuración"
      subtitle={MODE_LABEL[mode]}
      onBack={() => navigate({ name: 'home' })}
      right={
        <>
          {config.testMode && <TestModeBadge />}
          <ModeBadge mode={mode} />
        </>
      }
      footer={
        <>
          {errors.length > 0 && <span className="notice error" style={{ marginRight: 'auto' }}>{errors[0]}</span>}
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
      {mode === 'chaos' && (
        <div className="notice" style={{ borderColor: 'var(--chaos)' }}>
          Partido Caos usa el motor normal: sus reglas especiales están <strong>pendientes de definición</strong>.
        </div>
      )}
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Condición de victoria · final de cada parte</div>
        <div className="segmented" role="group" aria-label="Condición de final de periodo">
          {CONDITIONS.map((c) => (
            <button
              key={c.id}
              className="seg"
              aria-pressed={config.endCondition === c.id}
              onClick={() => set({ endCondition: c.id })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {CONDITIONS.find((c) => c.id === config.endCondition)?.help}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'center' }}>
        <div className="card">
          <div className="label">Objetivo de goles por parte</div>
          <Stepper
            label="goles por parte"
            value={config.goalsPerPeriod}
            min={CONFIG_LIMITS.goalsPerPeriod.min}
            max={CONFIG_LIMITS.goalsPerPeriod.max}
            unit="goles"
            disabled={!usesGoals}
            onChange={(v) => set({ goalsPerPeriod: v })}
          />
        </div>
        <div className="card">
          <div className="label">Duración por parte</div>
          <Stepper
            label="minutos por parte"
            value={config.minutesPerPeriod}
            min={CONFIG_LIMITS.minutesPerPeriod.min}
            max={CONFIG_LIMITS.minutesPerPeriod.max}
            unit="min"
            disabled={!usesTime}
            onChange={(v) => set({ minutesPerPeriod: v })}
          />
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Toggle
          checked={config.testMode}
          onChange={(v) => set({ testMode: v })}
          label="Modo prueba"
          description={
            config.testMode
              ? 'Activado: el partido muestra resumen pero NO se guarda ni cuenta para estadísticas, XP ni ELO.'
              : 'Desactivado: el partido se guardará en el historial local.'
          }
        />
      </div>
    </ScreenFrame>
  );
}
