# Decisiones, reglas implementadas y propuestas

Se distingue entre **requisito fijado** (del documento maestro), **propuesta configurable**
(implementada, pendiente de aprobación) y **pendiente** (no implementado o pantalla honesta).

## Reglas del motor (requisito fijado)

| Regla | Implementación |
|---|---|
| Blanco a la izquierda, Azul a la derecha | Fijo en todas las pantallas |
| Condición de final de periodo | `goals`: total de goles válidos del periodo (Blanco + Azul) ≥ objetivo · `time`: reloj agotado · `both`: lo primero |
| POR GOLES no termina por tiempo | El reloj muestra tiempo transcurrido y nunca cierra la parte |
| Empate tras la 2ª parte | Cuenta atrás → prórroga de 60 s con gol de oro → si no hay gol, penaltis |
| Bloqueo de gol | 3.000 ms globales para ambos equipos y todas las fuentes; la entrada rechazada no se guarda |
| Deshacer/−1/pausa/cambio de parte/saltar cuenta atrás | No modifican el instante del último gol: no eluden el bloqueo |
| Reloj | Basado en tiempo real transcurrido; pausa lo detiene; corrección no lo retrocede |
| Penaltis | 5 por equipo alternos, final anticipado, muerte súbita por parejas; turno validado en el motor |
| Penaltis separados | Resultado ordinario y de la tanda se guardan aparte; el ganador sale de la tanda |
| Modo prueba | Se fija al empezar; no guarda partido, eventos, XP, ELO, logros ni récords |

### Criterios de desarrollo tomados (revisables)

- **Gol en el instante límite (AMBAS/TIEMPO)**: el motor procesa primero el tiempo. Un gol con el
  reloj ya en el límite se rechaza; 1 ms antes se acepta.
- **−1** anula el gol válido más reciente de ese equipo **en el periodo actual**. Deshacer revierte
  la última acción corregible (gol o −1) del periodo actual. No se reabren partes cerradas.
- Correcciones permitidas en juego y en pausa; no en final de periodo ni tras el final.
- Restaurar un gol con Deshacer puede completar el objetivo de goles y cerrar la parte.
- Cuenta atrás de 3 s antes de 1ª parte, 2ª parte y prórroga; no antes de la tanda.
- Una pulsación física durante la cuenta atrás se consume como salto (no registra gol).
- En penaltis, un gol físico/sensor se interpreta como acierto del equipo indicado y el motor
  valida que sea su turno.
- **Abandonar** un partido (desde la pausa, con confirmación) lo descarta sin guardarlo.

## Propuestas configurables implementadas

- **Primer lanzador de penaltis**: Blanco por defecto, configurable en Ajustes.
- **Deshacer lanzamiento**: permitido mientras la tanda no esté decidida.
- **Modo prueba activado por defecto** (configurable).
- **Recuperación**: snapshot cada evento y cada 5 s mientras corre el reloj. Al reabrir se ofrece
  reanudar **en pausa** con el tiempo del último snapshot (el tiempo con la app cerrada no cuenta)
  o descartar. Una cuenta atrás interrumpida se reinicia. Los partidos de prueba no se recuperan.
- **ELO**: inicial 1200 (aprobado); K = 40 durante los 10 primeros clasificatorios y 20 después
  (frontera: el partido nº 11 ya usa K 20); delta redondeado al entero por jugador; en 2v2
  expectativa con la media de cada equipo y cada jugador aplica su propio K. Victoria por penaltis
  cuenta como victoria (1). Multiplicador por diferencia de goles disponible pero **desactivado**;
  si se activa, un partido decidido en penaltis usa 1,00.
- **Categorías**: Bronce <1000, Plata 1000, Oro 1200, Platino 1400, Diamante 1600, Élite 1800. Sin histéresis.
- **XP** (se acumulan): completar +50, victoria +100 / derrota +25, victoria clasificatoria +50,
  prórroga +25, penaltis +25, logro +25/+50/+100 según rareza. Rápido y Caos dan XP; solo
  Clasificatorio modifica ELO. «Récord personal +50» y «ganar torneo +300» no se conceden (pendientes).
- **Niveles**: XP **acumulado** necesario para el nivel N = round(100 × N^1,35), niveles 0–100.
- **Previsión**: ELO 60 %, directos 25 % × min(n,5)/5, forma 15 %; pesos renormalizados. Forma de
  equipo = últimas 5 clasificatorias de cada jugador combinadas. Sin clasificatorios previos:
  «Datos insuficientes» y se puede jugar.
- **Rival favorito / némesis**: mínimo 5 enfrentamientos; favorito = mayor % de victorias, némesis = menor.
- **Ranking**: jugadores con al menos 1 clasificatorio; desempate ELO → partidos → nombre.
- **Récords**: muestra mínima de 10 partidos para porcentajes; ante empate se conserva el primero.
- **Logros**: catálogo inicial de 20 (1 secreto), único por jugador, recalculado sin duplicar.
- **Estadísticas 2v2**: cada participante recibe los «goles del equipo mientras participaba»;
  no se registra goleador.

Todo lo derivado (estadísticas, ELO, XP, niveles, logros, récords) se **recalcula desde el
historial** con reglas versionadas (`progresion-propuesta-1`, `estadisticas-1`): no existen totales
guardados sin origen y reprocesar no duplica premios.

## Pendiente de decisión del propietario (no inventado)

- **Caos**: usa el motor normal; reglas especiales pendientes (indicado en la interfaz).
- **Torneos**: pantalla informativa «Pendiente de definición».
- Correcciones tras finalizar parte o partido, política de edición de historial.
- Umbrales finales, histéresis, desempates de ranking y muestras mínimas.
- Hardware ESP32-S3/C3, sensores, Wi-Fi, OTA, administración por red.
- Base de datos y funciones online (Supabase/Vercel) — última fase, no tocada.
