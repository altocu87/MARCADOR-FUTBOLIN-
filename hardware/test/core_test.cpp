// Pruebas del núcleo de las placas en el PC: g++ -std=c++11 -I../common core_test.cpp && ./a.out
#include <cassert>
#include <cstdio>
#include <cstring>

#include "mfv3_core.h"

using namespace mfv3;

static void testDebouncer() {
  Debouncer d(25);
  assert(!d.update(true, 0));
  assert(!d.update(true, 10));
  assert(d.update(true, 25));      // estable 25 ms
  assert(d.update(false, 30));     // aún estable en true
  assert(d.update(true, 35));      // rebote breve: no cambia
  assert(d.update(false, 40));
  assert(!d.update(false, 66));    // 26 ms en false → cambia
}

static void testEdgeTrigger() {
  EdgeTrigger t(20, 400);
  int fires = 0;
  // Pulsación con rebotes al principio.
  bool pattern[] = {true, false, true, false, true, true, true, true};
  uint32_t now = 0;
  for (bool b : pattern) { fires += t.update(b, now); now += 5; }
  for (int i = 0; i < 20; i++) { fires += t.update(true, now); now += 5; }
  assert(fires == 1);               // una sola señal por pulsación
  for (int i = 0; i < 10; i++) { fires += t.update(false, now); now += 5; }
  // Segunda pulsación demasiado pronto (< 400 ms desde la primera): ignorada.
  for (int i = 0; i < 10; i++) { fires += t.update(true, now); now += 5; }
  assert(fires == 1);
  for (int i = 0; i < 10; i++) { fires += t.update(false, now); now += 5; }
  now += 400;
  for (int i = 0; i < 10; i++) { fires += t.update(true, now); now += 5; }
  assert(fires == 2);
}

static void testLineBuffer() {
  LineBuffer lb;
  const char* data = "GOAL BLAN";
  for (const char* p = data; *p; p++) assert(!lb.push(*p));
  const char* rest = "CO\r\n";
  bool got = false;
  for (const char* p = rest; *p; p++) got = lb.push(*p) || got;
  assert(got);
  assert(strcmp(lb.line(), "GOAL BLANCO") == 0);
  assert(!lb.push('\n'));           // línea vacía: nada
}

static void testParse() {
  AppMessage m = parseAppLine("SCORE 3 12");
  assert(m.cmd == AppCmd::Score && m.a == 3 && m.b == 12);
  m = parseAppLine("GOAL AZUL");
  assert(m.cmd == AppCmd::Goal && m.team == TeamId::Blue);
  m = parseAppLine("LOCK 3000");
  assert(m.cmd == AppCmd::Lock && m.a == 3000);
  m = parseAppLine("STATE playing");
  assert(m.cmd == AppCmd::State && strcmp(m.state, "playing") == 0);
  m = parseAppLine("WIN BLANCO");
  assert(m.cmd == AppCmd::Win && m.team == TeamId::White);
  m = parseAppLine("HELLO MARCADOR_V3 1");
  assert(m.cmd == AppCmd::Hello);
  m = parseAppLine("cualquier cosa");
  assert(m.cmd == AppCmd::None);
}

int main() {
  testDebouncer();
  testEdgeTrigger();
  testLineBuffer();
  testParse();
  std::puts("mfv3_core: todas las pruebas OK");
  return 0;
}
