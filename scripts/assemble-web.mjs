// Junta la web y la app para publicarlas juntas: dist-web/ (web) + dist-web/app/ (app).
import { cpSync, existsSync, rmSync } from 'node:fs';

if (!existsSync('dist') || !existsSync('dist-web')) {
  console.error('Faltan dist/ o dist-web/: usa «npm run build:web».');
  process.exit(1);
}
rmSync('dist-web/app', { recursive: true, force: true });
cpSync('dist', 'dist-web/app', { recursive: true });
console.log('Web lista en dist-web/ (la app en dist-web/app/).');
