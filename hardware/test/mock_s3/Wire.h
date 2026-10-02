#pragma once
#include <stdint.h>
struct TwoWire {
  void begin(int, int) {}
  void end() {}
  void beginTransmission(uint8_t) {}
  uint8_t endTransmission() { return 0; }
  void write(uint8_t) {}
};
inline TwoWire Wire;
