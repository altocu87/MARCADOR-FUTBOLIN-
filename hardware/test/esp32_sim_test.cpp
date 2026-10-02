// Comprobación de sintaxis/tipos del sketch ESP32 con bibliotecas simuladas, y una vuelta de loop().
#include <cassert>
#include "Arduino.h"
#include "../esp32_marcador/esp32_marcador.ino"
int main() {
  setup();
  assert(sim::out.find("HELLO " MFV3_BOARD_ID " 1.1 caps=goles,anular") != std::string::npos);
  sim::pins[PIN_BTN_AZUL] = LOW;
  for (int i = 0; i < 100; i++) { loop(); sim::now++; }
  sim::pins[PIN_BTN_AZUL] = HIGH;
  for (int i = 0; i < 50; i++) { loop(); sim::now++; }
  assert(sim::out.find("GOL_AZUL button") != std::string::npos);
  sim::pins[PIN_BTN_BLANCO] = LOW;
  for (int i = 0; i < 900; i++) { loop(); sim::now++; }
  assert(sim::out.find("ANULAR_BLANCO") != std::string::npos);
#if USE_BLE
  RxCallbacks cb; BLECharacteristic c; cb.onWrite(&c);
  loop();
  assert(sim::pins[PIN_LED_AZUL] == HIGH);
#endif
  std::printf("esp32_marcador.ino (%s): comprobación simulada OK\n", MFV3_BOARD_ID);
}
