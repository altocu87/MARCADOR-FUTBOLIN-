// MARCADOR FUTBOLÍN V3 · mando inalámbrico con 2 pulsadores arcade
// ------------------------------------------------------------------
// Una mini placa ESP32 (recomendada: ESP32-C3 Super Mini) con dos pulsadores arcade:
//   - Toque corto  → GOL del equipo de ese pulsador.
//   - Toque largo (0,8 s) → ANULAR el último gol de ese equipo (−1). En penaltis deshace el último lanzamiento.
// Envía las órdenes por radio (ESP-NOW, 2,4 GHz) directamente a la pantalla ESP32-S3: sin Wi-Fi ni router.
// Cada orden se repite 3 veces; la pantalla descarta las repeticiones.
//
// Cableado (cada pulsador arcade tiene 2 terminales; no hacen falta resistencias):
//   Pulsador BLANCO: un terminal → GPIO 3,  el otro → GND
//   Pulsador AZUL:   un terminal → GPIO 4,  el otro → GND
//   Alimentación: USB-C (cargador o batería externa), o batería LiPo de 3,7 V con un módulo cargador.
// LED de la placa: 1 destello = gol enviado, 3 destellos = anulación enviada.
//
// Placa en el IDE de Arduino: «ESP32C3 Dev Module» (con «USB CDC On Boot: Enabled»), o la que uses.

#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include "mfv3_core.h"
#include "mfv3_radio.h"

// ---- Ajustes
const uint8_t GRUPO_MESA = 1;          // MISMO número que en la pantalla (cámbialo si hay dos mesas cerca)
const int PIN_BTN_BLANCO = 3;
const int PIN_BTN_AZUL = 4;
const int PIN_LED = 8;                 // LED azul de la ESP32-C3 Super Mini (-1 si no hay)
const bool LED_ACTIVO_BAJO = true;     // la Super Mini enciende su LED con nivel bajo
const uint16_t PULSACION_LARGA_MS = 800;
const uint32_t SALUDO_CADA_MS = 20000; // aviso periódico para que la pantalla muestre «mando conectado»

using mfv3::Press;
using mfv3::RadioCmd;

static const uint8_t BROADCAST[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
static mfv3::PressClassifier btnBlanco(PULSACION_LARGA_MS), btnAzul(PULSACION_LARGA_MS);
static uint16_t seq = 0;
static uint32_t lastHello = 0;

// LED sin bloquear: n destellos de 80 ms.
static uint8_t ledBlinks = 0;
static uint32_t ledNext = 0;
static bool ledOn = false;

static void ledWrite(bool on) {
  if (PIN_LED < 0) return;
  digitalWrite(PIN_LED, (on != LED_ACTIVO_BAJO) ? HIGH : LOW);
}

static void blink(uint8_t n) {
  ledBlinks = n;
  ledNext = 0;
}

static void ledTick(uint32_t now) {
  if (ledBlinks == 0 || now < ledNext) return;
  ledOn = !ledOn;
  ledWrite(ledOn);
  ledNext = now + 80;
  if (!ledOn) ledBlinks--;
}

static void sendCmd(RadioCmd c) {
  uint8_t pk[mfv3::RADIO_PACKET_SIZE];
  mfv3::radioEncode(pk, GRUPO_MESA, ++seq, c);
  for (uint8_t i = 0; i < mfv3::RADIO_REPEATS; i++) {
    esp_now_send(BROADCAST, pk, sizeof(pk));
    if (i + 1 < mfv3::RADIO_REPEATS) delay(i == 0 ? 8 : 20);
  }
  Serial.print("Enviado: ");
  Serial.println(c == RadioCmd::Hello ? "HELLO" : mfv3::radioLine(c));
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BTN_BLANCO, INPUT_PULLUP);
  pinMode(PIN_BTN_AZUL, INPUT_PULLUP);
  if (PIN_LED >= 0) pinMode(PIN_LED, OUTPUT);
  ledWrite(false);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(mfv3::RADIO_CHANNEL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) {
    Serial.println("ERROR: no se pudo iniciar ESP-NOW");
    blink(10);
  }
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, BROADCAST, 6);
  peer.channel = mfv3::RADIO_CHANNEL;
  peer.encrypt = false;
  esp_now_add_peer(&peer);

  seq = (uint16_t)esp_random();  // tras reiniciar, nunca repite la secuencia anterior
  sendCmd(RadioCmd::Hello);
  lastHello = millis();
  blink(2);
}

void loop() {
  uint32_t now = millis();
  // Pulsadores a GND con resistencia interna: pulsado = LOW.
  Press w = btnBlanco.update(digitalRead(PIN_BTN_BLANCO) == LOW, now);
  Press b = btnAzul.update(digitalRead(PIN_BTN_AZUL) == LOW, now);
  if (w == Press::Short) { sendCmd(RadioCmd::GoalWhite); blink(1); }
  if (w == Press::Long) { sendCmd(RadioCmd::AnnulWhite); blink(3); }
  if (b == Press::Short) { sendCmd(RadioCmd::GoalBlue); blink(1); }
  if (b == Press::Long) { sendCmd(RadioCmd::AnnulBlue); blink(3); }

  if (now - lastHello >= SALUDO_CADA_MS && !btnBlanco.held() && !btnAzul.held()) {
    lastHello = now;
    sendCmd(RadioCmd::Hello);
  }
  ledTick(now);
  delay(2);
}
