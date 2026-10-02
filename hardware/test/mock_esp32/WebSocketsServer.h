#pragma once
#include "Arduino.h"
enum WStype_t { WStype_CONNECTED, WStype_TEXT, WStype_DISCONNECTED };
struct WebSocketsServer { explicit WebSocketsServer(int) {} void begin() {} void loop() {}
  void onEvent(void (*)(uint8_t, WStype_t, uint8_t*, size_t)) {} bool broadcastTXT(const char*) { return true; }
  bool sendTXT(uint8_t, String&) { return true; } };
