#pragma once
#include "../mock/Arduino.h"
#include <cstring>
struct String {
  std::string s;
  String(const char* c = "") : s(c) {}
  String(const std::string& x) : s(x) {}
  String(uint32_t v, int) : s(std::to_string(v)) {}
  String operator+(const String& o) const { return String(s + o.s); }
  String operator+(const char* o) const { return String(s + o); }
  const char* c_str() const { return s.c_str(); }
  size_t length() const { return s.size(); }
};
inline String operator+(const char* a, const String& b) { return String(std::string(a) + b.s); }
#define HEX 16
struct IPAddress {};
struct SerialSim2 : SerialSim {
  using SerialSim::print;
  void print(const IPAddress&) {}
  void println(const IPAddress&) {}
  void println(const char* s) { SerialSim::println(s); }
};
#define Serial Serial2Sim
inline SerialSim2 Serial2Sim;
struct EspClass { uint64_t getEfuseMac() { return 0x1234; } };
inline EspClass ESP;
