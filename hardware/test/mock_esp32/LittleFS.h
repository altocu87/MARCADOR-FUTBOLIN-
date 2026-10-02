#pragma once
#include "Arduino.h"
struct File { explicit operator bool() const { return false; } void close() {} };
struct FSSim { bool begin(bool) { return true; } File open(const char*, const char*) { return {}; } };
inline FSSim LittleFS;
