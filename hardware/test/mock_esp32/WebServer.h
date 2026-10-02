#pragma once
#include "LittleFS.h"
#include <functional>
struct WebServer { explicit WebServer(int) {} void serveStatic(const char*, FSSim&, const char*, const char*) {}
  void onNotFound(std::function<void()>) {} void send(int, const char*, const char*) {} void streamFile(File&, const char*) {}
  void begin() {} void handleClient() {} };
