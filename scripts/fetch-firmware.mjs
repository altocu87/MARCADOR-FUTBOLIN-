// Descarga los programas compilados por GitHub (release «firmware-latest») en web/public/firmware/,
// para que el botón «Instalar en mi placa» de la web funcione.
//   npm run firmware:get            (repositorio por defecto)
//   MFV3_REPO=usuario/repo npm run firmware:get
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const repo = process.env.MFV3_REPO || 'altocu87/MARCADOR-FUTBOLIN-CLAUDE';
const url = `https://github.com/${repo}/releases/download/firmware-latest/firmware.tar.gz`;
const res = await fetch(url);
if (!res.ok) {
  console.error(`No se pudo descargar ${url} (${res.status}). ¿Se ha ejecutado ya la compilación «Firmware» en main?`);
  process.exit(1);
}
mkdirSync('web/public/firmware', { recursive: true });
writeFileSync('/tmp/mfv3-firmware.tar.gz', Buffer.from(await res.arrayBuffer()));
execFileSync('tar', ['xzf', '/tmp/mfv3-firmware.tar.gz', '-C', 'web/public/firmware']);
console.log('Programas descargados en web/public/firmware/. Ahora: npm run build:web');
