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
- **Sonidos** sintetizados en local (Web Audio, sin archivos con licencia) y **efectos** de gol
  (completos / reducidos / desactivados).

## Arquitectura

```
src/
  app/                 composición: contexto, navegación, finalización y recuperación
  match-engine/        MatchEngine puro: reglas, estados, reloj, bloqueo, correcciones, penaltis
  inputs/              bus de entradas común (pantalla, teclado, simulador, futuro hardware)
  services/players/    validación y gestión de jugadores
  services/persistence/contratos de repositorio, adaptador local (localStorage) y backup
  services/statistics/ estadísticas derivadas del historial
  services/progression/ELO, XP, niveles, logros, récords, Hall of Fame y previsión
  services/sound/      audio sintetizado
  ui/                  layout (lienzo 800×480), componentes y pantallas
  styles/              CSS por áreas
tests/                 pruebas de motor (A01–A13), progresión y persistencia
docs/                  decisiones, estado y límites
```

Flujo: **entrada → bus → validación del motor → estado/evento aceptado → interfaz y efectos**.
Al terminar: **aplicación → resultado completo → repositorio local**. El motor no depende de React,
DOM, red, sonido ni hardware; recibe comandos con una marca de tiempo y devuelve el nuevo estado.

Los repositorios son asíncronos (`PlayerRepository`, `MatchRepository`, `PreferencesRepository`,
`ActiveMatchRepository`) para que el adaptador remoto de la última fase se añada detrás del mismo contrato.

Más detalle en [`docs/DECISIONES.md`](docs/DECISIONES.md) y [`docs/ESTADO.md`](docs/ESTADO.md).
