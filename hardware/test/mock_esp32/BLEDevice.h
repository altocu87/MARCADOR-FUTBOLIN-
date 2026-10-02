#pragma once
#include "Arduino.h"
struct BLEServer; struct BLECharacteristic;
struct BLEServerCallbacks { virtual ~BLEServerCallbacks() {} virtual void onConnect(BLEServer*) {} virtual void onDisconnect(BLEServer*) {} };
struct BLECharacteristicCallbacks { virtual ~BLECharacteristicCallbacks() {} virtual void onWrite(BLECharacteristic*) {} };
struct BLEDescriptor { virtual ~BLEDescriptor() {} };
struct BLECharacteristic { static const uint32_t PROPERTY_NOTIFY = 1, PROPERTY_WRITE = 2, PROPERTY_WRITE_NR = 4;
  void addDescriptor(BLEDescriptor*) {} void setCallbacks(BLECharacteristicCallbacks*) {} void setValue(uint8_t*, size_t) {} void notify() {}
  String getValue() { return String("GOAL AZUL"); } };
struct BLEAdvertising { void start() {} void addServiceUUID(const char*) {} void setScanResponse(bool) {} };
struct BLEService { BLECharacteristic* createCharacteristic(const char*, uint32_t) { return new BLECharacteristic(); } void start() {} };
struct BLEServer { void setCallbacks(BLEServerCallbacks*) {} BLEService* createService(const char*) { return new BLEService(); } BLEAdvertising* getAdvertising() { return new BLEAdvertising(); } };
struct BLEDevice { static void init(const char*) {} static BLEServer* createServer() { return new BLEServer(); }
  static BLEAdvertising* getAdvertising() { return new BLEAdvertising(); } static void startAdvertising() {} };
