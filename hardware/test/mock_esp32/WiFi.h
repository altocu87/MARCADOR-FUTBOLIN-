#pragma once
#include "Arduino.h"
#define WIFI_AP 1
#define WIFI_AP_STA 2
#define WL_CONNECTED 3
struct WiFiSim { void mode(int) {} void begin(const char*, const char*) {} int status() { return 0; }
  bool softAP(const char*, const char*) { return true; } IPAddress softAPIP() { return {}; } IPAddress localIP() { return {}; } };
inline WiFiSim WiFi;
