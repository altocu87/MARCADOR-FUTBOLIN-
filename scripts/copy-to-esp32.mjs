// Copia la app compilada (dist/) a la carpeta data/ del sketch ESP32, comprimida con gzip
// para que quepa en LittleFS. El servidor del ESP32 sirve automáticamente el .gz.
import { createGzip } from 'node:zlib';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pipeline } from 'node:stream/promises';

const src = 'dist';
const dst = 'hardware/esp32_marcador/data';
const COMPRESS = /\.(html|js|css|svg|json|webmanifest|txt)$/i;

if (!existsSync(src)) {
  console.error('No existe dist/. Ejecuta primero: npm run build');
  process.exit(1);
}
for (const f of existsSync(dst) ? readdirSync(dst) : []) if (f !== 'LEEME.txt') rmSync(join(dst, f), { recursive: true, force: true });

let total = 0;
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
for (const file of walk(src)) {
  const rel = relative(src, file);
  if (rel.split('/').some((p) => p.length > 31)) console.warn(`Aviso: nombre largo para LittleFS: ${rel}`);
  const out = join(dst, rel);
  mkdirSync(dirname(out), { recursive: true });
  if (COMPRESS.test(file)) {
    await pipeline(createReadStream(file), createGzip({ level: 9 }), createWriteStream(`${out}.gz`));
    total += statSync(`${out}.gz`).size;
  } else {
    copyFileSync(file, out);
    total += statSync(out).size;
  }
}
console.log(`App copiada a ${dst} (${(total / 1024).toFixed(0)} KB). Súbela con «Upload LittleFS».`);
