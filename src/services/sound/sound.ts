/**
 * Sonidos sintetizados en local con Web Audio (sin archivos ni licencias externas).
 * Solo reproduce eventos ya aceptados por el motor. Si el navegador no permite
 * audio, falla en silencio: el partido no depende del sonido.
 */
export type SoundName = 'goal' | 'periodEnd' | 'matchEnd' | 'ui' | 'countdown' | 'countdownGo' | 'error' | 'special';

interface Note {
  freq: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

const PATTERNS: Record<SoundName, Note[]> = {
  goal: [
    { freq: 523, start: 0, dur: 0.12, type: 'square', gain: 0.5 },
    { freq: 659, start: 0.1, dur: 0.12, type: 'square', gain: 0.5 },
    { freq: 784, start: 0.2, dur: 0.12, type: 'square', gain: 0.5 },
    { freq: 1047, start: 0.3, dur: 0.35, type: 'sawtooth', gain: 0.4 },
  ],
  periodEnd: [
    { freq: 880, start: 0, dur: 0.25, type: 'triangle' },
    { freq: 660, start: 0.3, dur: 0.45, type: 'triangle' },
  ],
  matchEnd: [
    { freq: 523, start: 0, dur: 0.18, type: 'triangle' },
    { freq: 659, start: 0.18, dur: 0.18, type: 'triangle' },
    { freq: 784, start: 0.36, dur: 0.18, type: 'triangle' },
    { freq: 1047, start: 0.54, dur: 0.6, type: 'triangle' },
  ],
  ui: [{ freq: 1200, start: 0, dur: 0.04, type: 'sine', gain: 0.25 }],
  countdown: [{ freq: 660, start: 0, dur: 0.12, type: 'sine', gain: 0.5 }],
  countdownGo: [{ freq: 1320, start: 0, dur: 0.3, type: 'sine', gain: 0.5 }],
  error: [{ freq: 200, start: 0, dur: 0.15, type: 'square', gain: 0.25, slideTo: 140 }],
  special: [{ freq: 300, start: 0, dur: 0.5, type: 'sawtooth', gain: 0.35, slideTo: 1200 }],
};

class SoundService {
  private ctx: AudioContext | null = null;
  private volume = 0.7;
  private muted = false;

  configure(volume: number, muted: boolean): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.muted = muted;
  }

  /** Debe llamarse tras una interacción del usuario (política de autoplay). */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  play(name: SoundName): void {
    if (this.muted || this.volume <= 0) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + 0.01;
      const master = ctx.createGain();
      master.gain.value = this.volume * 0.35;
      master.connect(ctx.destination);
      for (const n of PATTERNS[name]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = n.type ?? 'sine';
        osc.frequency.setValueAtTime(n.freq, t0 + n.start);
        if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, t0 + n.start + n.dur);
        const peak = n.gain ?? 0.6;
        g.gain.setValueAtTime(0.0001, t0 + n.start);
        g.gain.exponentialRampToValueAtTime(peak, t0 + n.start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.dur);
        osc.connect(g).connect(master);
        osc.start(t0 + n.start);
        osc.stop(t0 + n.start + n.dur + 0.02);
      }
    } catch {
      // El audio es un servicio independiente: un fallo nunca afecta al partido.
    }
  }
}

export const sound = new SoundService();
