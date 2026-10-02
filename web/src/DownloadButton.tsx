import { useState } from 'react';
import { useInstall } from './install';
import { APP_URL, href } from './router';

/**
 * «Descargar la app». Si el navegador permite instalar, abre su aviso; si no (iPhone, Firefox…),
 * lleva a la página Descargar con los pasos para ese dispositivo.
 */
export function DownloadButton({ size = 'lg', label = 'Descargar la app', onSteps }: { size?: 'lg' | 'sm'; label?: string; onSteps?: () => void }) {
  const inst = useInstall();
  const [done, setDone] = useState(false);
  const cls = `btn btn-primary ${size === 'lg' ? 'btn-lg' : 'btn-sm'}`;
  if (done || inst.installed)
    return (
      <a className={cls} href={APP_URL}>
        {done ? 'Instalada · Abrir' : 'Abrir la app'}
      </a>
    );
  if (inst.canPrompt)
    return (
      <button className={cls} onClick={async () => setDone(await inst.prompt())}>
        {label}
      </button>
    );
  if (onSteps)
    return (
      <button className={cls} onClick={onSteps}>
        {label}
      </button>
    );
  return (
    <a className={cls} href={href({ page: 'usar' })}>
      {label}
    </a>
  );
}
