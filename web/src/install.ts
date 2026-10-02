/**
 * Botón «Descargar la app»: la app es una PWA, así que «descargar» = instalarla desde el navegador.
 * - Android y ordenador (Chrome/Edge): el navegador ofrece el aviso de instalar (beforeinstallprompt).
 * - iPhone/iPad: Safari no tiene botón; se muestran los 3 pasos (Compartir → Añadir a pantalla de inicio).
 */
import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'android' | 'iphone' | 'pc';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  return 'pc';
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    try {
      localStorage.setItem('mfv3-instalada', '1');
    } catch {
      /* sin almacenamiento */
    }
    notify();
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => undefined);
}

function installedBefore(): boolean {
  try {
    return localStorage.getItem('mfv3-instalada') === '1' || matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

export function useInstall() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {
    platform: detectPlatform(),
    /** El navegador permite instalar con un toque. */
    canPrompt: deferred !== null,
    installed: installedBefore(),
    /** Abre el aviso de instalar. Devuelve true si el usuario aceptó. */
    async prompt(): Promise<boolean> {
      if (!deferred) return false;
      const ev = deferred;
      deferred = null;
      await ev.prompt();
      const choice = await ev.userChoice;
      notify();
      return choice.outcome === 'accepted';
    },
  };
}
