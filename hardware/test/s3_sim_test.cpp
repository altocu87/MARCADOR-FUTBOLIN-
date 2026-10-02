// Comprobación del sketch de la pantalla de 7" (ESP32-S3) en el PC con LovyanGFX/NVS simulados:
// se juega un partido completo con toques y con líneas del protocolo MFV3 (USB y UART auxiliar).
#include <cassert>
#include "Arduino.h"
#include "../esp32s3_pantalla7/esp32s3_pantalla7.ino"

static void run(uint32_t ms) { for (uint32_t t = 0; t < ms; t += 10) loop(); }
static void tap(int x, int y) {
  sim::touchX = x; sim::touchY = y; sim::touchDown = true; loop();
  sim::touchDown = false; loop();
}
static void usb(const char* s) { for (const char* c = s; *c; c++) sim::in.push_back(*c); sim::in.push_back('\n'); loop(); }
static void aux(const char* s) { for (const char* c = s; *c; c++) sim::auxIn.push_back(*c); sim::auxIn.push_back('\n'); loop(); }
static bool shows(const char* s) { return sim::screen.find(s) != std::string::npos; }
static bool sent(const char* s) { return sim::out.find(s) != std::string::npos; }
static size_t count(const std::string& h, const char* s) {
  size_t n = 0;
  for (size_t p = h.find(s); p != std::string::npos; p = h.find(s, p + 1)) n++;
  return n;
}

int main() {
  sim::now = 1000;
  setup();
  loop();
  assert(sent("HELLO MARCADOR_V3_S3") && sent("STATE idle"));
  assert(shows("MARCADOR FUTBOLIN V3") && shows("JUGAR"));

  // Configuración: POR GOLES, 1 gol por parte (desde 5).
  for (int i = 0; i < 4; i++) tap(76, 306);
  assert(cfg.goalsPerPeriod == 1 && shows("GOLES POR PARTE"));
  tap(400, 420);  // JUGAR
  assert(inMatch && eng.phase() == Phase::Countdown && shows("TOCA PARA SALTAR"));
  assert(sim::nvs.count("goals"));

  usb("SALTAR");
  assert(eng.phase() == Phase::Playing && shows("BLANCO") && shows("AZUL"));

  // Gol por USB y bloqueo: el segundo impulso inmediato se ignora.
  usb("GB");
  assert(sent("GOAL BLANCO") && sent("LOCK 3000") && count(sim::out, "SCORE 1 0") == 1);
  assert(eng.phase() == Phase::PeriodEnd && shows("FINAL 1a PARTE"));
  tap(400, 370);  // CONTINUAR 2a PARTE
  assert(eng.period() == Period::Second && eng.phase() == Phase::Countdown);
  tap(10, 10);    // cualquier toque salta la cuenta atrás
  aux("GOL_AZUL");  // dentro del bloqueo de 3 s heredado
  assert(eng.score().blue == 0);
  run(3000);
  aux("GOL_AZUL");
  assert(sim::auxOut.find("GOAL AZUL") != std::string::npos && eng.phase() == Phase::PeriodEnd);
  tap(400, 370);  // IR A PRORROGA
  assert(eng.period() == Period::Overtime);
  tap(400, 240);
  run(3000);
  // Pausa por protocolo, DESHACER deshabilitado sin goles, continuar con toque.
  usb("PAUSA");
  assert(eng.phase() == Phase::Paused && shows("CONTINUAR"));
  tap(400, 260);
  assert(eng.phase() == Phase::Playing);
  tap(160, 200);  // panel BLANCO = gol de oro
  assert(eng.phase() == Phase::Finished && sent("WIN BLANCO"));
  run(1000);
  assert(shows("VICTORIA BLANCO") && shows("Gol de oro"));
  assert(matchesPlayed == 1 && historyCount == 1 && history[0].white == 2);

  // Revancha y abandono con doble confirmación.
  tap(530, 410);
  assert(eng.phase() == Phase::Countdown && eng.score().white == 0);
  tap(400, 240);
  tap(400, 430);  // PAUSA
  assert(eng.phase() == Phase::Paused);
  tap(400, 360);
  assert(inMatch && shows("Toca otra vez ABANDONAR"));
  tap(400, 360);
  assert(!inMatch && sent("STATE idle") && matchesPlayed == 1);

  // PING/HELLO y atenuación por inactividad (el toque que despierta no pulsa nada).
  usb("PING");
  assert(sent("PONG"));
  run(SLEEP_AFTER_MS + 100);
  assert(dimmed && sim::brightness == 16);
  tap(400, 420);  // sobre JUGAR, pero solo despierta
  assert(!dimmed && sim::brightness == 255 && !inMatch);

  // Reinicio: la configuración y el historial salen de la NVS.
  cfg = mfv3::Config(); historyCount = 0; matchesPlayed = 0;
  loadPrefs();
  assert(cfg.goalsPerPeriod == 1 && historyCount == 1 && matchesPlayed == 1);

  std::puts("esp32s3_pantalla7.ino: partido simulado con táctil y protocolo OK");
}
