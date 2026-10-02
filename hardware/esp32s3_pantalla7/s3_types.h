// MARCADOR FUTBOLÍN V3 · tipos de la pantalla de 7".
// Van en un archivo aparte porque el IDE de Arduino declara todas las funciones del .ino al principio,
// antes de que el .ino defina sus propios tipos (y «Snapshot» no existiría todavía).

#ifndef MFV3_S3_TYPES_H
#define MFV3_S3_TYPES_H

#include <stdint.h>
#include "mfv3_engine.h"

using mfv3::Period;
using mfv3::Phase;

// Resultado guardado en la memoria interna (NVS).
struct LastResult {
  uint8_t white, blue, penW, penB, winner, reason;  // winner 0 = Blanco, 1 = Azul
};

// Estado del partido justo antes de un cambio (para avisar a las placas y sonar).
struct Snapshot {
  Phase phase;
  Period period;
  uint8_t w, b;
  uint8_t kicks;
};

// Pantalla de prueba del primer arranque.
struct TestState {
  bool active;
  bool corner[4];
  bool remoteWhite, remoteBlue;
  bool sensorWhite, sensorBlue;
  bool usbSeen;
  int16_t lastX, lastY;
  uint16_t touches;
};

#endif  // MFV3_S3_TYPES_H
