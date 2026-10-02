// Genera docs/MANUAL_DIY.md a partir del catálogo src/inputs/hardware/diy-catalog.json
// (la misma fuente que usa la guía «Hazlo tú mismo» de la app).
//   npm run docs:diy
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PIN_ORDER = ['btnBlanco', 'btnAzul', 'pausa', 'sensorBlanco', 'sensorAzul', 'ledBlanco', 'ledAzul', 'zumbador'];
const ROLE_LABEL = { entradas: 'Pulsadores y sensores', mando: 'Mando inalámbrico', pantalla: 'Pantalla de mesa' };
const LINK_LABEL = { usb: 'USB', wifi: 'Wi-Fi', bluetooth: 'Bluetooth', radio: 'Radio' };
const STATUS = { probada: '✅ Probada en placa', simulada: '🧪 Probada en simulador' };
const dots = (n) => '●'.repeat(n) + '○'.repeat(3 - n);

export function installSteps(c, b) {
  const fill = (t) => t.replace(/\{(\w+)\}/g, (_, k) => String(b[k] ?? ''));
  const extra = b.role === 'pantalla' ? c.install.pantalla : b.role === 'mando' ? c.install.mando : b.links.includes('wifi') ? c.install.wifi : c.install.usb;
  return [...c.install.common, ...extra].map(fill);
}

export function buildManual(c) {
  const L = [];
  const p = (...lines) => L.push(...lines);

  p(
    '# Manual «Hazlo tú mismo» · Marcador Futbolín V3',
    '',
    '> Este documento se genera solo a partir del catálogo de placas (`npm run docs:diy`). La misma información está',
    '> en la app: **Ajustes → Hazlo tú mismo**, con el esquema de conexión dibujado para cada placa.',
    '',
    'El marcador funciona de tres formas, y puedes empezar por la más sencilla e ir subiendo:',
    '',
    '- **Solo con el móvil**: abres la app y marcas tocando la pantalla. No hay que montar nada.',
    '- **Con pulsadores o sensores**: una placa barata (Arduino o ESP32) junto a la mesa avisa a la app de cada gol.',
    '- **Marcador de mesa**: una pantalla táctil con su propia placa hace de marcador completo, sin móvil.',
    '',
    'No hace falta saber programar: el programa de cada placa ya está hecho y **reconoce solo el modelo de placa**',
    'que eliges al instalarlo. Solo hay que conectar los cables en los pines indicados y pulsar «Subir».',
    '',
    '## 1. Elige tu nivel',
    '',
    '| Nivel | Qué es | Qué necesitas | Coste | Dificultad |',
    '|---|---|---|---|---|',
  );
  for (const l of c.levels) p(`| **${l.id} · ${l.title}** | ${l.summary} | ${l.needs.join(' · ')} | ${l.cost} | ${dots(l.difficulty)} |`);

  p(
    '',
    '## 2. Cómo se detectan los goles',
    '',
    'Hay dos formas de avisar al marcador, y se pueden usar a la vez:',
    '',
    '- **Pulsadores**: alguien pulsa el botón de su equipo. **Toque corto = gol · toque largo (0,8 s) = anular el último gol**.',
    '- **Sensores**: detectan la bola solos. Cualquier sensor con salida tipo «contacto» vale: el programa aprende al',
    '  encender cómo está «sin balón» y cuenta gol cuando cambia. **Enciende la placa sin bola delante de los sensores.**',
    '',
    '💡 El mejor sitio para un sensor es el **canal interior por el que cae la bola** después del gol: la bola siempre pasa',
    'por ahí, y más despacio que en la boca de la portería.',
    '',
    'Pase lo que pase, el marcador ignora un segundo gol durante 3 segundos (evita goles dobles por rebotes).',
    '',
    '| Opción | Coste | Dificultad | ¿Recomendada? |',
    '|---|---|---|---|',
  );
  for (const d of c.detection)
    p(`| ${d.name} | ${d.cost} | ${dots(d.difficulty)} | ${d.recommended ? '✅ Sí' : d.supported ? 'Vale' : '❌ No'} |`);
  for (const d of c.detection) {
    p('', `### ${d.name}`, '', d.how, '', `- **Dónde:** ${d.where}`, `- **Conexión:** ${d.wiring}`);
    p(`- **A favor:** ${d.pros.join('; ')}.`, `- **En contra:** ${d.cons.join('; ')}.`);
  }

  p(
    '',
    '## 3. Cómo se conecta cada cosa',
    '',
    '### Pulsador arcade',
    'Un pulsador arcade tiene dos patas para el botón (a veces marcadas **COM** y **NO**) y, si lleva luz, otras dos',
    'para el LED. No hacen falta resistencias: la placa usa las suyas internas.',
    '',
    '```',
    '  PIN del pulsador ───────── pata NO del pulsador',
    '  GND de la placa  ───────── pata COM del pulsador',
    '```',
    '',
    '### Sensor de 3 cables (barrera, reflexión, láser)',
    '```',
    '  VCC (5 V o 3,3 V) ──────── cable rojo / VCC del sensor',
    '  GND ────────────────────── cable negro / GND del sensor',
    '  PIN del sensor ─────────── cable de señal (blanco, amarillo u OUT)',
    '```',
    '',
    '### Luz o zumbador (opcional)',
    '```',
    '  LED de 5 V:   PIN ── resistencia 220 Ω ── (+) LED (−) ── GND',
    '  LED de 12 V (con un MOSFET IRLZ44N o un módulo de relé):',
    '      PIN ── resistencia 1 kΩ ── G (puerta del MOSFET)',
    '      12 V ── (+) LED (−) ── D (drenador)',
    '      S (fuente) ── GND        ← une el GND de la placa con el (−) de la fuente de 12 V',
    '  Zumbador activo: PIN ── (+) zumbador (−) ── GND',
    '```',
    '',
    '## 4. Placas compatibles',
    '',
    '| Placa | Para qué | Tensión | Conexión con la app | Precio | Estado |',
    '|---|---|---|---|---|---|',
  );
  for (const b of c.boards)
    p(`| [${b.name}](#${anchor(b.name)}) | ${ROLE_LABEL[b.role]} | ${b.voltage} | ${b.links.map((l) => LINK_LABEL[l]).join(', ')} | ${b.price} | ${STATUS[b.status]} |`);
  p(
    '',
    '«Probada en simulador» significa que el programa se ha probado en el ordenador simulando la placa (botones, sensores,',
    'radio y protocolo). Cuando alguien la pruebe en una placa real, pasará a «Probada en placa».',
  );

  for (const role of ['entradas', 'mando', 'pantalla']) {
    p('', `## ${role === 'entradas' ? 5 : role === 'mando' ? 6 : 7}. ${ROLE_LABEL[role]}`);
    for (const b of c.boards.filter((x) => x.role === role)) {
      p('', `### ${b.name}`, '', `*${b.aka}* · ${b.chip} · ${b.voltage} · ${STATUS[b.status]}`, '');
      for (const n of b.notes) p(`- ${n}`);
      const used = PIN_ORDER.filter((f) => b.pins[f]);
      if (used.length) {
        p('', '| Qué | Pin de la placa | El otro cable |', '|---|---|---|');
        for (const f of used) {
          const info = c.functions[f];
          const other = b.role === 'pantalla' && info.kind === 'sensor' ? 'Común de las entradas (COM)' : info.other;
          p(`| **${info.label}** — ${info.detail} | \`${b.pins[f]}\` | ${other} |`);
        }
      }
      p('', '**Instalación**', '');
      installSteps(c, b).forEach((s, i) => p(`${i + 1}. ${s}`));
    }
  }

  p('', '## 8. Seguridad', '');
  for (const s of c.safety) p(`- ⚠️ ${s}`);

  p(
    '',
    '## 9. Problemas frecuentes',
    '',
    '| Problema | Solución |',
    '|---|---|',
    '| La app no encuentra la placa por USB | Usa Chrome o Edge (no Safari ni Firefox) y cierra el monitor serie del IDE de Arduino. |',
    '| Un gol cuenta solo al encender | Había algo delante del sensor al arrancar: apágala y enciéndela sin bola delante. |',
    '| El sensor no detecta la bola | Revisa la alineación (barrera/láser) o la distancia con el tornillo del módulo (reflexión). |',
    '| Al anular se marca un gol | Mantén el pulsador hasta notar el aviso (0,8 s). Se puede cambiar en `PULSACION_LARGA_MS`. |',
    '| En el iPhone no puedo usar USB ni Bluetooth | Safari no lo permite: usa un ESP32 por Wi-Fi (sirve la app en su propia red). |',
    '| La pantalla de 7" se queda negra | Comprueba que el modelo elegido en `board_config.h` es el de tu placa. |',
    '',
    '## 10. Para quien quiera ir más allá',
    '',
    '- **Otros pines**: en el programa, antes de `#include "mfv3_boards.h"`, escribe `#define MFV3_PINES_PERSONALIZADOS` y',
    '  tus `#define PIN_…`.',
    '- **Otra placa**: añade su bloque en `hardware/common/mfv3_boards.h` y su ficha en',
    '  `src/inputs/hardware/diy-catalog.json`. Las pruebas (`npm test`) comprueban que los pines coinciden en los dos sitios.',
    '  Después ejecuta `npm run docs:diy` para regenerar este manual.',
    '- **Tu propio programa**: la app acepta cualquier placa que envíe una orden por línea por USB (115200), Wi-Fi',
    '  (WebSocket, puerto 81) o Bluetooth (UART de Nordic): `GB`/`GA` gol, `AB`/`AA` anular, `PAUSA`, y al conectar',
    '  `HELLO <modelo> <versión> caps=goles,anular,…`. Detalles del protocolo en `docs/HARDWARE.md`.',
    '',
  );
  return L.join('\n');
}

function anchor(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .trim()
    .replace(/ /g, '-');
}

export function readCatalog() {
  return JSON.parse(readFileSync(new URL('../src/inputs/hardware/diy-catalog.json', import.meta.url), 'utf8'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = new URL('../docs/MANUAL_DIY.md', import.meta.url);
  writeFileSync(out, buildManual(readCatalog()));
  console.log('docs/MANUAL_DIY.md generado');
}
