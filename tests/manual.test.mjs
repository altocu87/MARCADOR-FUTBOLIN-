// El manual docs/MANUAL_DIY.md debe estar generado con el catálogo actual (npm run docs:diy).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildManual, readCatalog } from '../scripts/gen-diy-manual.mjs';

describe('Manual «Hazlo tú mismo»', () => {
  it('está al día con el catálogo de placas', () => {
    const doc = readFileSync(new URL('../docs/MANUAL_DIY.md', import.meta.url), 'utf8');
    expect(doc, 'ejecuta «npm run docs:diy»').toBe(buildManual(readCatalog()));
  });
  it('incluye todas las placas con sus pines', () => {
    const c = readCatalog();
    const doc = buildManual(c);
    for (const b of c.boards) {
      expect(doc).toContain(`### ${b.name}`);
      for (const pin of Object.values(b.pins)) expect(doc).toContain(`\`${pin}\``);
    }
  });
});
