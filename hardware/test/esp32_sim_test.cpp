// Comprobación de sintaxis/tipos del sketch ESP32 con bibliotecas simuladas, y una vuelta de loop().
#include <cassert>
#include "Arduino.h"
#include "../esp32_marcador/esp32_marcador.ino"
int main() {
  setup();
  sim::pins[PIN_BTN_AZUL] = LOW;
  for (int i = 0; i < 100; i++) { loop(); sim::now++; }
  assert(sim::out.find("GOL_AZUL button") != std::string::npos);
  RxCallbacks cb; BLECharacteristic c; cb.onWrite(&c);
  loop();
  assert(sim::pins[PIN_LED_AZUL] == HIGH);
  std::puts("esp32_marcador.ino: comprobación simulada OK");
}
