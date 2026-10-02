# Estado de la entrega local

Fecha: 02/10/2026 · Versión 0.2.0 · Motor 1.0.0 (`reglas-partido-1`)

## Fases del documento maestro

| Fase | Estado |
|---|---|
| 0. Preparación | Hecha: plan por bloques, decisiones en `DECISIONES.md` |
| 1. Núcleo local | Hecha: UI 800×480, modos, configuración, selección, motor, partes, prórroga, penaltis, resumen |
| 2. Gestión local | Hecha: jugadores, preferencias, modo prueba, historial, detalle, almacenamiento local |
| 3. Análisis y progresión | Hecha con **parámetros propuestos**: perfiles, estadísticas, XP/niveles, ELO/ranking, previsión |
| 4. Funciones ampliadas | Hecha con propuestas: 54 logros, títulos, récords, Hall of Fame con podios, temporadas, retos, torneos (liguilla/cuadro), sonido, locutor, efectos, reposo, backup |
| 5. Preparación física | Parcial: bus de entradas común y simulador (`marcador.enviar`). Sin integración física |
| 6. Entrega del código | Este repositorio |
| 7. Base de datos y online | **No iniciada** (por indicación expresa) |

## Comprobado

- `npm test`: 79 pruebas (incluye reglas Caos, avisos, torneos, retos, temporadas, parejas, goleadores, pronósticos y títulos) — antes 55 (motor A01–A13 y extras de reloj/pausa, ELO, XP, niveles, estadísticas,
  previsión, repositorio local, almacenamiento lleno, modo prueba, backup).
- `npm run build`: TypeScript estricto sin errores y compilación correcta.
- Recorrido en Chromium a 800×480 (Playwright): menú → modalidad → configuración → jugadores →
  previsión → cuenta atrás → partido → bloqueo → pausa → descanso → 2ª parte → −1 → empate →
  prórroga → penaltis → resumen → ranking/historial/Hall of Fame/récords → perfil → torneo →
  ajustes → reposo. Sin errores de consola y sin scroll general.
- 2v2 en modo prueba con teclado y sensor simulado (bloqueo respetado), abandono de partido,
  recuperación tras recarga (reanuda en pausa), escalado a 400×300 y 1280×900.
- Versión 0.2: recorrido con datos de demostración (45 partidos) por Caos 2v2 con equilibrado, comodín, gol
  doble, racha, bola de partido, victoria, celebración, goleadores, ranking (temporada/histórico, Hall of Fame,
  parejas, resumen, cara a cara), perfil (cromo, ELO, hábitos, logros, estilo), retos, creación y juego de un
  torneo en cuadro, ajustes de audio y penaltis. Sin errores de consola.

## Limitaciones conocidas

- Los iconos con emoji (🏆, 🎯, 🃏…) dependen de la fuente de emoji del sistema; las imágenes opcionales los sustituyen.
- La voz del locutor depende de que el navegador tenga una voz en español instalada.
- Los datos viven en el `localStorage` de este navegador: borrar los datos del sitio los elimina.
  Exporta copias desde Ajustes → Sistema.
- El arranque totalmente sin red tras un reinicio (empaquetado offline/PWA) no está garantizado en
  una web alojada sin caché; se debe validar en el dispositivo final.
- No se ha probado en el hardware ESP32-S3. Un ESP32-S3 no ejecuta una app React/Vite como un PC:
  hay que evaluar una interfaz embebida nativa o un host externo.
- Fotos de jugador guardadas como imagen reducida (160×160) dentro del almacenamiento local.
