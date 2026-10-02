/**
 * Locutor con la síntesis de voz del navegador (sin archivos ni red).
 * Si el navegador no tiene voz en español o no admite síntesis, no hace nada.
 */
class VoiceService {
  private enabled = false;

  configure(enabled: boolean): void {
    this.enabled = enabled;
  }

  get available(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  say(text: string, { interrupt = true }: { interrupt?: boolean } = {}): void {
    if (!this.enabled || !this.available) return;
    try {
      const synth = window.speechSynthesis;
      if (interrupt) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES';
      const v = synth.getVoices().find((x) => x.lang.toLowerCase().startsWith('es'));
      if (v) u.voice = v;
      u.rate = 1.08;
      u.pitch = 1.05;
      synth.speak(u);
    } catch {
      // La voz es un extra: nunca afecta al partido.
    }
  }

  /** Prueba aunque esté desactivado (botón de Ajustes). */
  test(text: string): void {
    const prev = this.enabled;
    this.enabled = true;
    this.say(text);
    this.enabled = prev;
  }
}

export const voice = new VoiceService();
