// MARCADOR FUTBOLÍN V3 · ESP32 (ESP32, ESP32-C3, ESP32-S3) — centro de entradas y servidor de la app
// -----------------------------------------------------------------------------------------------
// Qué hace:
//   1. Crea su propia red Wi-Fi «MARCADOR-FUTBOLIN» (o se une a la tuya) sin necesidad de Internet.
//   2. Sirve la app completa desde su memoria (LittleFS) en http://192.168.4.1 o http://marcador.local
//      → cualquier móvil, tablet o PC conectado a esa red abre el marcador en el navegador.
//   3. Lee pulsadores y sensores de gol y los envía por Wi-Fi (WebSocket, puerto 81),
//      Bluetooth LE (servicio UART, nombre «MFV3-…») y USB Serial a la vez.
//   4. Enciende LEDs y zumbador cuando la app CONFIRMA el gol.
//
// Bibliotecas necesarias (Arduino IDE → Gestor de bibliotecas):
//   - «WebSockets» de Markus Sattler (Links2004)  ·  probado con la API 2.x
//   - Placa: «esp32» de Espressif (Gestor de placas), versión 2.x o 3.x.
//   El resto (WiFi, WebServer, LittleFS, ESPmDNS, BLE) viene con la placa.
//
// Subir la app a la placa: compila la app (`npm run build`), copia el contenido de `dist/`
// en la carpeta `data/` de este sketch y usa «Upload LittleFS» (ver docs/HARDWARE.md).
//
// NOTA: este archivo no se ha podido compilar en el entorno de desarrollo (sin acceso a
// los compiladores de Espressif); la lógica común (mfv3_core.h) sí está probada en PC.

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <WebSocketsServer.h>
#include "mfv3_core.h"

// ======================= CONFIGURACIÓN =======================
#define USE_BLE 1            // 0 = sin Bluetooth (ahorra memoria; obligatorio en ESP32-S2)
#define USE_SENSORS 0        // 1 = hay sensores de gol en las porterías

// Red propia (punto de acceso). La contraseña debe tener 8+ caracteres.
const char* AP_SSID = "MARCADOR-FUTBOLIN";
const char* AP_PASS = "futbolin123";
// Opcional: unirse a la Wi-Fi de casa/oficina. Vacío = solo red propia.
const char* STA_SSID = "";
const char* STA_PASS = "";

const char* BOARD_NAME = "ESP32";
const char* FW_VERSION = "1.0";

// Pines (cámbialos según tu placa). Pulsadores/sensores entre pin y GND.
// ESP32 DevKit: 4, 5, 18, 19, 21 | LED 22, 23 | zumbador 25
// ESP32-C3 SuperMini: usa p. ej. 2, 3, 4, 5, 6 | LED 7, 10 | zumbador 1  (evita 8 y 9 al arrancar)
const uint8_t PIN_BTN_BLANCO = 4;
const uint8_t PIN_BTN_AZUL = 5;
const uint8_t PIN_BTN_PAUSA = 18;
const uint8_t PIN_SENSOR_BLANCO = 19;
const uint8_t PIN_SENSOR_AZUL = 21;
const uint8_t PIN_LED_BLANCO = 22;   // vía transistor/MOSFET si el LED es de 12 V
const uint8_t PIN_LED_AZUL = 23;
const uint8_t PIN_BUZZER = 25;
// =============================================================

WebServer http(80);
WebSocketsServer ws(81);
mfv3::EdgeTrigger btnBlanco(25, 400), btnAzul(25, 400), btnPausa(25, 600);
mfv3::EdgeTrigger senBlanco(5, 800), senAzul(5, 800);
mfv3::LineBuffer serialRx;

uint32_t ledUntil = 0;
uint32_t lockUntil = 0;
uint32_t buzzerUntil = 0;

#if USE_BLE
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
// Servicio UART de Nordic (el mismo que espera la app).
#define NUS_SERVICE "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define NUS_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define NUS_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
BLECharacteristic* bleTx = nullptr;
volatile bool bleConnected = false;
// Las órdenes BLE llegan en otra tarea: se copian aquí y se procesan en loop().
char blePending[64];
volatile bool bleHasPending = false;

class ServerCallbacks : public BLEServerCallbacks {
 public:
  void onConnect(BLEServer*) override { bleConnected = true; }
  void onDisconnect(BLEServer* s) override {
    bleConnected = false;
    s->getAdvertising()->start();  // volver a anunciarse
  }
};

class RxCallbacks : public BLECharacteristicCallbacks {
 public:
  void onWrite(BLECharacteristic* c) override {
    // String (Arduino) en el core 3.x; std::string en 2.x: ambos tienen c_str() y length().
    auto v = c->getValue();
    size_t n = v.length() < sizeof(blePending) - 1 ? v.length() : sizeof(blePending) - 1;
    memcpy(blePending, v.c_str(), n);
    blePending[n] = '\0';
    bleHasPending = true;
  }
};
#endif

// ---------------- Salida hacia la app (todas las vías a la vez) ----------------
void sendLine(const char* text) {
  Serial.print(text);
  Serial.print('\n');
  ws.broadcastTXT(text);
#if USE_BLE
  if (bleConnected && bleTx) {
    String line = String(text) + "\n";
    bleTx->setValue((uint8_t*)line.c_str(), line.length());
    bleTx->notify();
  }
#endif
}

void sendHello() {
  String hello = String("HELLO ") + BOARD_NAME + " " + FW_VERSION;
  sendLine(hello.c_str());
}

void setLeds(bool blanco, bool azul) {
  digitalWrite(PIN_LED_BLANCO, blanco ? HIGH : LOW);
  digitalWrite(PIN_LED_AZUL, azul ? HIGH : LOW);
}

// ---------------- Órdenes que llegan de la app ----------------
void handleApp(const char* line) {
  mfv3::AppMessage m = mfv3::parseAppLine(line);
  uint32_t now = millis();
  switch (m.cmd) {
    case mfv3::AppCmd::Goal:
      setLeds(m.team == mfv3::TeamId::White, m.team == mfv3::TeamId::Blue);
      ledUntil = now + 1500;
      digitalWrite(PIN_BUZZER, HIGH);
      buzzerUntil = now + 80;  // sin delay(): el Wi-Fi sigue atendiéndose
      break;
    case mfv3::AppCmd::Lock:
      lockUntil = now + (uint32_t)m.a;
      break;
    case mfv3::AppCmd::Win:
      setLeds(m.team == mfv3::TeamId::White, m.team == mfv3::TeamId::Blue);
      ledUntil = now + 4000;
      digitalWrite(PIN_BUZZER, HIGH);
      buzzerUntil = now + 400;
      break;
    default:
      break;
  }
}

// Un mensaje WebSocket puede traer varias líneas.
void handleText(const char* text, size_t len) {
  mfv3::LineBuffer lb;
  for (size_t i = 0; i < len; i++) {
    if (lb.push(text[i])) handleApp(lb.line());
  }
  if (lb.push('\n')) handleApp(lb.line());
}

void onWsEvent(uint8_t client, WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    String hello = String("HELLO ") + BOARD_NAME + " " + FW_VERSION;
    ws.sendTXT(client, hello);
  } else if (type == WStype_TEXT) {
    handleText((const char*)payload, length);
  }
}

// ---------------- Red y servidor de la app ----------------
void startNetwork() {
  bool joined = false;
  if (strlen(STA_SSID) > 0) {
    WiFi.mode(WIFI_AP_STA);
    WiFi.begin(STA_SSID, STA_PASS);
    for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(250);
    joined = WiFi.status() == WL_CONNECTED;
  } else {
    WiFi.mode(WIFI_AP);
  }
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("Red propia: ");
  Serial.print(AP_SSID);
  Serial.print("  ->  http://");
  Serial.println(WiFi.softAPIP());
  if (joined) {
    Serial.print("Tambien en tu Wi-Fi: http://");
    Serial.println(WiFi.localIP());
  }
  if (MDNS.begin("marcador")) MDNS.addService("http", "tcp", 80);
}

void startHttp() {
  if (!LittleFS.begin(true)) Serial.println("LittleFS no disponible: sube la app con «Upload LittleFS».");
  // Sirve dist/ (index.html, assets/, sw.js…). Usa la versión .gz si existe.
  http.serveStatic("/", LittleFS, "/", "max-age=600");
  http.onNotFound([]() {
    File f = LittleFS.open("/index.html", "r");
    if (!f) {
      http.send(200, "text/plain; charset=utf-8",
                "MARCADOR FUTBOLIN V3: falta la app en la placa. Compila con npm run build y sube dist/ con Upload LittleFS.");
      return;
    }
    http.streamFile(f, "text/html");
    f.close();
  });
  http.begin();
}

#if USE_BLE
void startBle() {
  String name = String("MFV3-") + String((uint32_t)(ESP.getEfuseMac() & 0xFFFF), HEX);
  BLEDevice::init(name.c_str());
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService* service = server->createService(NUS_SERVICE);
  bleTx = service->createCharacteristic(NUS_TX, BLECharacteristic::PROPERTY_NOTIFY);
  bleTx->addDescriptor(new BLE2902());
  BLECharacteristic* rx = service->createCharacteristic(
      NUS_RX, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rx->setCallbacks(new RxCallbacks());
  service->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(NUS_SERVICE);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}
#endif

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BTN_BLANCO, INPUT_PULLUP);
  pinMode(PIN_BTN_AZUL, INPUT_PULLUP);
  pinMode(PIN_BTN_PAUSA, INPUT_PULLUP);
  pinMode(PIN_SENSOR_BLANCO, INPUT_PULLUP);
  pinMode(PIN_SENSOR_AZUL, INPUT_PULLUP);
  pinMode(PIN_LED_BLANCO, OUTPUT);
  pinMode(PIN_LED_AZUL, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  setLeds(true, true);

  startNetwork();
  startHttp();
  ws.begin();
  ws.onEvent(onWsEvent);
#if USE_BLE
  startBle();
#endif
  setLeds(false, false);
  sendHello();
}

void loop() {
  http.handleClient();
  ws.loop();
  uint32_t now = millis();

  // Entradas (activas en LOW con INPUT_PULLUP).
  if (btnBlanco.update(digitalRead(PIN_BTN_BLANCO) == LOW, now)) sendLine("GOL_BLANCO button");
  if (btnAzul.update(digitalRead(PIN_BTN_AZUL) == LOW, now)) sendLine("GOL_AZUL button");
  if (btnPausa.update(digitalRead(PIN_BTN_PAUSA) == LOW, now)) sendLine("PAUSA");
#if USE_SENSORS
  if (senBlanco.update(digitalRead(PIN_SENSOR_BLANCO) == LOW, now)) sendLine("GOL_BLANCO sensor");
  if (senAzul.update(digitalRead(PIN_SENSOR_AZUL) == LOW, now)) sendLine("GOL_AZUL sensor");
#endif

  // Órdenes por USB y por Bluetooth.
  while (Serial.available() > 0) {
    if (serialRx.push((char)Serial.read())) handleApp(serialRx.line());
  }
#if USE_BLE
  if (bleHasPending) {
    char copy[64];
    strncpy(copy, blePending, sizeof(copy));
    copy[sizeof(copy) - 1] = '\0';
    bleHasPending = false;
    handleText(copy, strlen(copy));
  }
#endif

  // Zumbador y LED sin bloquear.
  if (buzzerUntil && now > buzzerUntil) {
    buzzerUntil = 0;
    digitalWrite(PIN_BUZZER, LOW);
  }
  if (ledUntil && now > ledUntil) {
    ledUntil = 0;
    setLeds(false, false);
  }
  if (!ledUntil && lockUntil > now) {
    bool on = ((now / 250) % 2) == 0;
    setLeds(on, on);
  } else if (!ledUntil && lockUntil && lockUntil <= now) {
    lockUntil = 0;
    setLeds(false, false);
  }
}
