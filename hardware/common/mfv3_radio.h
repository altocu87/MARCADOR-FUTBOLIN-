// MARCADOR FUTBOLÍN V3 · mensajes por radio (ESP-NOW) entre el mando de pulsadores y la placa principal.
// Sin Wi-Fi ni router: las dos placas ESP32 se hablan directamente en 2,4 GHz (canal fijo).
// Este fichero no depende del hardware: se prueba en el PC (hardware/test/radio_test.cpp).
//
// Paquete de 10 bytes: "MFV3" · versión · grupo · nº de secuencia (2 bytes) · orden · suma de control.
//   - grupo: para que dos mesas cercanas no se mezclen (mismo número en mando y pantalla).
//   - secuencia: el mando repite cada mensaje 3 veces; la pantalla descarta las repeticiones.

#ifndef MFV3_RADIO_H
#define MFV3_RADIO_H

#include <stdint.h>
#include <string.h>

namespace mfv3 {

const uint8_t RADIO_VERSION = 1;
const uint8_t RADIO_CHANNEL = 1;  // canal Wi-Fi fijo para ESP-NOW (1–13), igual en todas las placas
const uint8_t RADIO_PACKET_SIZE = 10;
const uint8_t RADIO_REPEATS = 3;

enum class RadioCmd : uint8_t { GoalWhite = 1, GoalBlue = 2, AnnulWhite = 3, AnnulBlue = 4, Pause = 5, Hello = 6 };

inline uint8_t radioChecksum(const uint8_t* p) {
  uint8_t c = 0x5A;
  for (int i = 0; i < RADIO_PACKET_SIZE - 1; i++) c = (uint8_t)((c << 1 | c >> 7) ^ p[i]);
  return c;
}

inline void radioEncode(uint8_t* out, uint8_t group, uint16_t seq, RadioCmd cmd) {
  out[0] = 'M'; out[1] = 'F'; out[2] = 'V'; out[3] = '3';
  out[4] = RADIO_VERSION;
  out[5] = group;
  out[6] = (uint8_t)(seq & 0xFF);
  out[7] = (uint8_t)(seq >> 8);
  out[8] = (uint8_t)cmd;
  out[9] = radioChecksum(out);
}

struct RadioMsg {
  bool ok;
  uint16_t seq;
  RadioCmd cmd;
};

inline RadioMsg radioDecode(const uint8_t* p, int len, uint8_t group) {
  RadioMsg m = {false, 0, RadioCmd::Hello};
  if (len != RADIO_PACKET_SIZE || memcmp(p, "MFV3", 4) != 0 || p[4] != RADIO_VERSION || p[5] != group) return m;
  if (radioChecksum(p) != p[9] || p[8] < 1 || p[8] > 6) return m;
  m.ok = true;
  m.seq = (uint16_t)(p[6] | (p[7] << 8));
  m.cmd = (RadioCmd)p[8];
  return m;
}

// Línea del protocolo MFV3 equivalente (la pantalla la procesa igual que si llegara por USB).
inline const char* radioLine(RadioCmd c) {
  switch (c) {
    case RadioCmd::GoalWhite: return "GOL_BLANCO button";
    case RadioCmd::GoalBlue: return "GOL_AZUL button";
    case RadioCmd::AnnulWhite: return "ANULAR_BLANCO";
    case RadioCmd::AnnulBlue: return "ANULAR_AZUL";
    case RadioCmd::Pause: return "PAUSA";
    case RadioCmd::Hello: return "";
  }
  return "";
}

// Descarta repeticiones: recuerda la última secuencia de hasta 4 mandos (por dirección MAC).
class RadioDedup {
 public:
  bool fresh(const uint8_t* mac, uint16_t seq) {
    for (int i = 0; i < 4; i++) {
      if (used_[i] && memcmp(mac_[i], mac, 6) == 0) {
        if (seq_[i] == seq) return false;
        seq_[i] = seq;
        return true;
      }
    }
    int slot = next_++ % 4;
    used_[slot] = true;
    memcpy(mac_[slot], mac, 6);
    seq_[slot] = seq;
    return true;
  }

 private:
  bool used_[4] = {false, false, false, false};
  uint8_t mac_[4][6];
  uint16_t seq_[4] = {0, 0, 0, 0};
  int next_ = 0;
};

}  // namespace mfv3

#endif  // MFV3_RADIO_H
