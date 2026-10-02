#pragma once
#define WIFI_STA 1
struct WiFiSim {
  void mode(int) {}
  void disconnect() {}
};
inline WiFiSim WiFi;
