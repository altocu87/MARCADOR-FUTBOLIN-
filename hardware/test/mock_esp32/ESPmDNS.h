#pragma once
struct MDNSSim { bool begin(const char*) { return true; } void addService(const char*, const char*, int) {} };
inline MDNSSim MDNS;
