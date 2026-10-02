// Pruebas en el PC de los pulsadores (toque corto/largo) y del paquete de radio.
#include <cassert>
#include <cstdio>
#include "mfv3_core.h"
#include "mfv3_radio.h"
using namespace mfv3;

static Press hold(PressClassifier& p, uint32_t& t, uint32_t ms, bool down) {
  Press got = Press::None;
  for (uint32_t i = 0; i < ms; i += 5) {
    Press r = p.update(down, t += 5);
    if (r != Press::None) { assert(got == Press::None); got = r; }
  }
  return got;
}

int main() {
  // Toque corto: se notifica al soltar.
  PressClassifier p(800, 25);
  uint32_t t = 0;
  assert(hold(p, t, 200, true) == Press::None);
  assert(hold(p, t, 100, false) == Press::Short);
  // Toque largo: se notifica al llegar a 800 ms, y soltar no genera un corto.
  assert(hold(p, t, 900, true) == Press::Long);
  assert(hold(p, t, 2000, true) == Press::None);
  assert(hold(p, t, 100, false) == Press::None);
  // Rebote de 10 ms: no cuenta.
  assert(hold(p, t, 10, true) == Press::None);
  assert(hold(p, t, 100, false) == Press::None);

  // Paquete: ida y vuelta, grupo, suma de control.
  uint8_t pk[RADIO_PACKET_SIZE];
  radioEncode(pk, 7, 513, RadioCmd::AnnulBlue);
  RadioMsg m = radioDecode(pk, sizeof(pk), 7);
  assert(m.ok && m.seq == 513 && m.cmd == RadioCmd::AnnulBlue);
  assert(!radioDecode(pk, sizeof(pk), 8).ok);       // otra mesa
  assert(!radioDecode(pk, sizeof(pk) - 1, 7).ok);   // longitud
  pk[8] = (uint8_t)RadioCmd::GoalWhite;              // alterado sin rehacer la suma
  assert(!radioDecode(pk, sizeof(pk), 7).ok);
  assert(strcmp(radioLine(RadioCmd::GoalWhite), "GOL_BLANCO button") == 0);

  // Repeticiones del mismo mensaje: solo cuenta la primera, por mando.
  RadioDedup d;
  uint8_t a[6] = {1, 2, 3, 4, 5, 6}, b[6] = {9, 9, 9, 9, 9, 9};
  assert(d.fresh(a, 10) && !d.fresh(a, 10) && !d.fresh(a, 10));
  assert(d.fresh(b, 10));
  assert(d.fresh(a, 11));
  std::puts("mfv3_radio + pulsación corta/larga: OK");
}
