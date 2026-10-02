// Simulación de Arduino-ESP32 (S3) para probar el sketch de la pantalla de 7" en el PC.
#pragma once
#include "../mock/Arduino.h"
#include <cctype>
#include <cstring>
#define SERIAL_8N1 0x800001c
inline uint32_t esp_random() { return 0xBEEF; }
namespace sim {
inline std::deque<char> auxIn;
inline std::string auxOut;
}  // namespace sim
struct HardwareSerial {
  explicit HardwareSerial(int) {}
  void begin(unsigned long, uint32_t, int, int) {}
  void print(const char* s) { sim::auxOut += s; }
  void print(char c) { sim::auxOut += c; }
  int available() { return (int)sim::auxIn.size(); }
  int read() {
    if (sim::auxIn.empty()) return -1;
    char c = sim::auxIn.front();
    sim::auxIn.pop_front();
    return c;
  }
};
