// Mando de 2 pulsadores (sketch mando_pulsadores) simulado en el PC: toque corto, largo y paquetes de radio.
#include <cassert>
#include "Arduino.h"
#include "../mando_pulsadores/mando_pulsadores.ino"

static void run(uint32_t ms) { for (uint32_t t = 0; t < ms; t += 2) loop(); }
static mfv3::RadioCmd lastCmd() {
  mfv3::RadioMsg m = mfv3::radioDecode(sim::radioSent.back().data(), (int)sim::radioSent.back().size(), GRUPO_MESA);
  assert(m.ok);
  return m.cmd;
}

int main() {
  setup();
  assert(sim::radioSent.size() == 3 && lastCmd() == RadioCmd::Hello && sim::wifiChannel == mfv3::RADIO_CHANNEL);
  sim::radioSent.clear();
  run(50);
  // Toque corto en BLANCO (pulsado = LOW): 3 copias de GOL al soltar.
  sim::pins[PIN_BTN_BLANCO] = LOW; run(200);
  assert(sim::radioSent.empty());
  sim::pins[PIN_BTN_BLANCO] = HIGH; run(100);
  assert(sim::radioSent.size() == 3 && lastCmd() == RadioCmd::GoalWhite);
  // Las 3 copias llevan la misma secuencia.
  assert(sim::radioSent[0] == sim::radioSent[2]);
  // Toque largo en AZUL: ANULAR mientras sigue pulsado; al soltar no hay gol.
  sim::radioSent.clear();
  sim::pins[PIN_BTN_AZUL] = LOW; run(900);
  assert(sim::radioSent.size() == 3 && lastCmd() == RadioCmd::AnnulBlue);
  sim::pins[PIN_BTN_AZUL] = HIGH; run(200);
  assert(sim::radioSent.size() == 3);
  // Saludo periódico.
  sim::radioSent.clear();
  run(SALUDO_CADA_MS + 100);
  assert(!sim::radioSent.empty() && lastCmd() == RadioCmd::Hello);
  std::puts("mando_pulsadores.ino: toque corto = gol, toque largo = anular, radio OK");
}
