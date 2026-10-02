# MARCADOR FUTBOLÍN V3

Marcador inteligente para una mesa de futbolín real. Esta entrega es la **versión local**: funciona
entera en el navegador, sin backend, sin claves, sin login y sin Internet. La base de datos (Supabase)
y la publicación online (Vercel) son la **última fase** y **no** están conectadas.

## Instalar y ejecutar

Requisitos: Node.js 20+ (probado con Node 22.22 y npm 10.9).

```bash
npm install        # dependencias fijadas en package-lock.json
npm run dev        # servidor de desarrollo → http://localhost:5173
npm test           # pruebas unitarias (Vitest)
npm run build      # comprobación TypeScript + compilación a dist/
npm run preview    # sirve la compilación de dist/
npm run build:esp32    # compila y copia la app comprimida a hardware/esp32_marcador/data/
npm run test:hardware  # pruebas en PC del firmware (núcleo, motor C++ y simulación de Arduino/ESP32/S3 7")
```

La interfaz es un lienzo de **800 × 480** en horizontal: se centra en pantallas grandes y se escala
proporcionalmente en pequeñas, sin scroll general.

### Controles de desarrollo

| Entrada | Acción |
|---|---|
| Tocar/clicar el número | Gol de ese equipo |
| `Q` / `A` | Gol BLANCO |
| `P` / `L` | Gol AZUL |
| `Espacio` | Pausa / continuar |
| `Intro` | Saltar la cuenta atrás |
| (Caos) botón 🃏 | Armar el comodín: el siguiente gol del equipo vale doble |
| Consola: `marcador.enviar('GOL_AZUL', 'sensor')` | Simula un pulsador o sensor |

Todas las entradas llegan al mismo motor y respetan el bloqueo de 3 s.

## Qué incluye

- **Inicio**: Rápido, Caos y Clasificatorio + TORNEO, RANKING y AJUSTES. Indicador «SISTEMA LOCAL».
- **Configuración**: POR GOLES / POR TIEMPO / AMBAS, objetivo 1–20 goles, 1–30 min, modo prueba.
- **Selección de jugadores**: plazas BLANCO 1, AZUL 1, BLANCO 2, AZUL 2; solo 1v1 o 2v2 válidos.
- **Previsión** (Clasificatorio): ELO 60 % · directos 25 % · forma 15 % con confianza baja/media/alta.
- **Partido**: el número es el botón de gol, −1 por equipo, Deshacer, Pausa, reloj segmentado,
  cuenta atrás 3-2-1 (toca para saltar), 1ª y 2ª parte, prórroga de 60 s con gol de oro y penaltis
  (5 + muerte súbita por parejas, turnos validados).
- **Resumen**: ganador real y motivo, parciales, prórroga/penaltis, cronología (correcciones
  distinguidas), gráfica de evolución y progresión (XP/ELO/logros). Revancha y nuevo partido.
- **Ranking**: clasificación ELO, historial con filtros y páginas de 20, jugadores, Hall of Fame, récords.
- **Perfil**: General, Clasificatorio, Torneos, Rivales, Logros e Historial.
- **Ajustes**: General, Jugadores (alta, edición, foto, baja lógica), Audio/Efectos, Progresión,
  Sistema (backup exportar/importar, borrar datos) e Información (versiones y decisiones pendientes).
- **Reposo** tras inactividad (configurable): reloj y fecha; el toque que despierta se consume.
- **Recuperación**: si se cierra o recarga en mitad de un partido real, al abrir se ofrece
  reanudar (en pausa) o descartar.
- **Sonidos** sintetizados en local (Web Audio, sin archivos con licencia): 4 sonidos de gol a elegir,
  melodía de victoria por jugador y **locutor** con la voz del navegador. **Efectos** de gol
  (completos / reducidos / desactivados).

### Añadidos de la versión 0.3 · cualquier pantalla y hardware

- **Cualquier resolución**: el lienzo se adapta a la proporción (16:9, 21:9, 4:3…) sin franjas; en móvil vertical
  aviso con opción **«Girar el marcador»** (usa toda la pantalla aunque la rotación esté bloqueada).
- **Pantalla completa** (⛶) y **pantalla siempre encendida**. Respeta muescas de móviles.
- **Instalable y sin conexión (PWA)** en PC, Android e iPhone.
- **Placas Arduino / ESP32**: Ajustes → **Conexiones** por **USB**, **Wi-Fi** o **Bluetooth**, con registro de mensajes
  y reconexión automática. La app avisa a la placa de los goles aceptados (LEDs/zumbador).
- **Programas para placas** en `hardware/` (Arduino USB y ESP32 con red propia que sirve la app):
  guía completa en [`docs/HARDWARE.md`](docs/HARDWARE.md). `npm run build:esp32` prepara la app para la placa.
- **Marcador nativo para ESP32-S3 con pantalla táctil de 7"** (`hardware/esp32s3_pantalla7/`): el partido completo
  en la placa, sin PC ni móvil, con las mismas reglas que la app.
- **Eliminar partidos** del historial (se recalcula todo).

### Añadidos de la versión 0.2

- **Partido**: paneles de cristal con línea de luz, cuenta atrás con anillo, rótulos animados (inicio de parte,
  prórroga, penaltis, muerte súbita), aviso de **bola de partido**, **racha 🔥 x3**, celebraciones de
  **empate / por delante / remontada / gol doble**, cartel de **clásico** entre rivales habituales y
  **pantalla de victoria** con confeti, fotos y títulos. Penaltis con portería de neón y foco.
- **Reglas Caos** (propuesta): comodín x2 por equipo y goles x2 en el último minuto (con tiempo).
- **Sorteo de equipos**: equilibrado por ELO o aleatorio. **Revancha** con cambio de lado.
- **Pronósticos** amistosos de espectadores en el Clasificatorio (sin dinero).
- **Goleador opcional** por gol en el resumen (automático en 1v1) → pichichi.
- **Resumen**: celebración de subida de nivel, ascenso de categoría, logros y retos.
- **Ranking**: temporada actual o histórico, podios en Hall of Fame, campeones de temporada, parejas,
  resumen semanal/mensual y comparador **cara a cara**.
- **Perfil**: tarjeta tipo cromo, gráfica de ELO, hábitos (lado, días, franjas), 54 logros por categorías,
  títulos elegibles y melodía de victoria.
- **Retos** diarios y semanales con XP. **Torneos**: liguilla o cuadro de 3–8 equipos (1v1 o parejas).
- **Reposo** con líder y último resultado. Fondo animado en el inicio.
- **Imágenes opcionales**: ver [`docs/PROMPTS_IMAGENES.md`](docs/PROMPTS_IMAGENES.md); se copian en
  `src/assets/images/` y la app las usa automáticamente.

## Arquitectura

```
src/
  app/                 composición: contexto, navegación, finalización y recuperación
  match-engine/        MatchEngine puro: reglas, estados, reloj, bloqueo, correcciones, penaltis
  inputs/              bus de entradas común + hardware/ (protocolo MFV3, USB, Wi-Fi, Bluetooth)
  services/players/    validación y gestión de jugadores
  services/persistence/contratos de repositorio, adaptador local (localStorage) y backup
  services/statistics/ estadísticas derivadas del historial
  services/progression/ELO, XP, niveles, logros, retos, temporadas, récords, Hall of Fame y previsión
  services/tournaments/liguilla y cuadro eliminatorio
  services/sound/      audio sintetizado
  ui/                  layout (lienzo 800×480), componentes y pantallas
  styles/              CSS por áreas
tests/                 pruebas de motor (A01–A13), progresión y persistencia
docs/                  decisiones, estado, hardware y prompts de imágenes
hardware/              firmware Arduino/ESP32 y sus pruebas en PC
```

Flujo: **entrada → bus → validación del motor → estado/evento aceptado → interfaz y efectos**.
Al terminar: **aplicación → resultado completo → repositorio local**. El motor no depende de React,
DOM, red, sonido ni hardware; recibe comandos con una marca de tiempo y devuelve el nuevo estado.

Los repositorios son asíncronos (`PlayerRepository`, `MatchRepository`, `PreferencesRepository`,
`ActiveMatchRepository`) para que el adaptador remoto de la última fase se añada detrás del mismo contrato.

Más detalle en [`docs/DECISIONES.md`](docs/DECISIONES.md) y [`docs/ESTADO.md`](docs/ESTADO.md).
