/**
 * Entradas comunes: pantalla, ratón, teclado y futuros pulsadores/sensores se
 * traducen a comandos (GOL_BLANCO, GOL_AZUL…). El motor no conoce el dispositivo;
 * el origen solo se conserva para diagnóstico.
 */
import type { InputSource, Team } from '../match-engine';

export type InputCommand = 'GOL_BLANCO' | 'GOL_AZUL' | 'PAUSA' | 'SALTAR';

export interface InputSignal {
  command: InputCommand;
  source: InputSource;
}

type Listener = (signal: InputSignal) => void;

class InputBus {
  private listeners = new Set<Listener>();

  emit(signal: InputSignal): void {
    for (const l of this.listeners) l(signal);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const inputBus = new InputBus();

export const teamFromCommand = (c: InputCommand): Team | null =>
  c === 'GOL_BLANCO' ? 'white' : c === 'GOL_AZUL' ? 'blue' : null;

/** Teclado de desarrollo: Q/A = Blanco, P/L = Azul, Espacio = pausa, Intro = saltar. */
const KEY_MAP: Record<string, InputCommand> = {
  KeyQ: 'GOL_BLANCO',
  KeyA: 'GOL_BLANCO',
  KeyP: 'GOL_AZUL',
  KeyL: 'GOL_AZUL',
  Space: 'PAUSA',
  Enter: 'SALTAR',
};

export function attachKeyboardAdapter(target: Window = window): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
    const command = KEY_MAP[e.code];
    if (!command) return;
    // Intro y Espacio sobre un botón enfocado mantienen su comportamiento nativo.
    if ((e.code === 'Space' || e.code === 'Enter') && el?.tagName === 'BUTTON') return;
    e.preventDefault();
    inputBus.emit({ command, source: 'keyboard' });
  };
  target.addEventListener('keydown', onKey);
  return () => target.removeEventListener('keydown', onKey);
}

/**
 * Punto de extensión para hardware/simulador: un adaptador futuro (Web Serial,
 * WebSocket local con el ESP32-C3…) solo tiene que llamar a esta función.
 * En desarrollo se expone como `window.marcador.enviar('GOL_BLANCO', 'button')`.
 */
export function sendExternalInput(command: InputCommand, source: InputSource = 'simulator'): void {
  inputBus.emit({ command, source });
}

export function exposeDevInputs(): void {
  (window as unknown as { marcador: unknown }).marcador = {
    enviar: (command: InputCommand, source: InputSource = 'simulator') => sendExternalInput(command, source),
    comandos: Object.values(KEY_MAP).filter((v, i, a) => a.indexOf(v) === i),
  };
}
