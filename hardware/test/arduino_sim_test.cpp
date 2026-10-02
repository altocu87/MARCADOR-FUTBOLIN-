// Ejecuta el sketch arduino_usb.ino en el PC con pines y Serial simulados.
#include <cassert>
#include "Arduino.h"
#include "../arduino_usb/arduino_usb.ino"

static void run(uint32_t ms) {
  for (uint32_t i = 0; i < ms; i++) { loop(); sim::now += 1; }
}
static void press(uint8_t pin, uint32_t holdMs) {
  sim::pins[pin] = LOW;
  run(holdMs);
  sim::pins[pin] = HIGH;
  run(50);
}
static bool has(const std::string& s) { return sim::out.find(s) != std::string::npos; }

int main() {
  setup();
  run(2500);
  assert(has("HELLO ARDUINO-USB 1.0\n"));
  // La app responde: deja de saludar.
  for (char c : std::string("HELLO MARCADOR_V3 1\n")) sim::in.push_back(c);
  run(10);
  sim::out.clear();
  run(5000);
  assert(!has("HELLO"));

  // Pulsación con rebote → una sola orden.
  sim::pins[PIN_BTN_BLANCO] = LOW; run(3);
  sim::pins[PIN_BTN_BLANCO] = HIGH; run(3);
  press(PIN_BTN_BLANCO, 100);
  assert(sim::out == "GOL_BLANCO button\n");

  press(PIN_BTN_AZUL, 80);
  assert(has("GOL_AZUL button\n"));
  press(PIN_BTN_PAUSA, 80);
  assert(has("PAUSA\n"));

  // Gol confirmado por la app → LED del equipo encendido.
  for (char c : std::string("GOAL AZUL\nLOCK 3000\n")) sim::in.push_back(c);
  run(5);
  assert(sim::pins[PIN_LED_AZUL] == HIGH && sim::pins[PIN_LED_BLANCO] == LOW);
  run(4000);
  assert(sim::pins[PIN_LED_AZUL] == LOW && sim::pins[PIN_LED_BLANCO] == LOW);
  std::puts("arduino_usb.ino: simulación OK");
  return 0;
}
