// MARCADOR FUTBOLÍN V3 · Arduino por USB (Uno, Nano, Mega, Leonardo, Micro…)
// ---------------------------------------------------------------------------
// Conecta la placa al PC/tablet/móvil Android por USB y en la app:
// Ajustes → Conexiones → USB → Conectar (Chrome o Edge).
//
// Qué hace:
//   - Lee 2 pulsadores de gol (Blanco/Azul), 1 de pausa y 2 sensores de gol (opcionales).
//   - Envía por Serial (115200) las órdenes del protocolo MFV3: GOL_BLANCO, GOL_AZUL, PAUSA…
//   - Enciende el LED del pulsador del equipo que marca y suena el zumbador cuando la
//     app CONFIRMA el gol (GOAL …), y los apaga durante el bloqueo de 3 s.
//
// Cableado (ver docs/HARDWARE.md):
//   Pulsadores y sensores entre el pin y GND (se usa INPUT_PULLUP, activo en LOW).
//   ¡Nunca conectes 12 V a un pin! Los LED de 12 V de los botones arcade van con
//   un transistor/MOSFET (p. ej. ULN2003 o IRLZ44N) controlado desde el pin.

#include "mfv3_core.h"

// ---------------- Configuración de pines ----------------
const uint8_t PIN_BTN_BLANCO = 2;
const uint8_t PIN_BTN_AZUL = 3;
const uint8_t PIN_BTN_PAUSA = 4;      // opcional (deja sin conectar si no lo usas)
const uint8_t PIN_SENSOR_BLANCO = 5;  // opcional: sensor de barrera IR en la portería
const uint8_t PIN_SENSOR_AZUL = 6;    // opcional
const uint8_t PIN_BUZZER = 8;         // opcional (zumbador activo)
const uint8_t PIN_LED_BLANCO = 9;     // LED del pulsador (vía transistor si es de 12 V)
const uint8_t PIN_LED_AZUL = 10;

const bool USE_SENSORS = false;       // pon true si instalas sensores
const char* BOARD_NAME = "ARDUINO-USB";
const char* FW_VERSION = "1.0";

// Antirrebote 25 ms; tiempo mínimo entre señales del mismo pulsador 400 ms.
mfv3::EdgeTrigger btnBlanco(25, 400), btnAzul(25, 400), btnPausa(25, 600);
mfv3::EdgeTrigger senBlanco(5, 800), senAzul(5, 800);
mfv3::LineBuffer rx;

uint32_t ledUntil = 0;
uint32_t lockUntil = 0;
uint32_t lastHello = 0;
bool connected = false;

void setLeds(bool blanco, bool azul) {
  digitalWrite(PIN_LED_BLANCO, blanco ? HIGH : LOW);
  digitalWrite(PIN_LED_AZUL, azul ? HIGH : LOW);
}

void beep(uint16_t ms) {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(ms);  // breve: no afecta a la lectura (la app aplica el bloqueo de 3 s)
  digitalWrite(PIN_BUZZER, LOW);
}

void sendLine(const char* text) {
  Serial.print(text);
  Serial.print('\n');
}

void handleApp(const char* line) {
  mfv3::AppMessage m = mfv3::parseAppLine(line);
  uint32_t now = millis();
  switch (m.cmd) {
    case mfv3::AppCmd::Hello:
      connected = true;
      break;
    case mfv3::AppCmd::Goal:
      setLeds(m.team == mfv3::TeamId::White, m.team == mfv3::TeamId::Blue);
      ledUntil = now + 1500;
      beep(80);
      break;
    case mfv3::AppCmd::Lock:
      lockUntil = now + (uint32_t)m.a;
      break;
    case mfv3::AppCmd::Win:
      for (uint8_t i = 0; i < 3; i++) {
        setLeds(m.team == mfv3::TeamId::White, m.team == mfv3::TeamId::Blue);
        beep(120);
        delay(120);
        setLeds(false, false);
        delay(120);
      }
      break;
    default:
      break;
  }
}

void setup() {
  pinMode(PIN_BTN_BLANCO, INPUT_PULLUP);
  pinMode(PIN_BTN_AZUL, INPUT_PULLUP);
  pinMode(PIN_BTN_PAUSA, INPUT_PULLUP);
  pinMode(PIN_SENSOR_BLANCO, INPUT_PULLUP);
  pinMode(PIN_SENSOR_AZUL, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_BLANCO, OUTPUT);
  pinMode(PIN_LED_AZUL, OUTPUT);
  setLeds(true, true);  // prueba de LED al arrancar
  Serial.begin(115200);
  delay(300);
  setLeds(false, false);
}

void loop() {
  uint32_t now = millis();

  // Saludo periódico hasta que la app responde (la app puede abrirse después).
  if (!connected && now - lastHello > 2000) {
    lastHello = now;
    Serial.print("HELLO ");
    Serial.print(BOARD_NAME);
    Serial.print(' ');
    Serial.print(FW_VERSION);
    Serial.print('\n');
  }

  // Entradas (activas en LOW por INPUT_PULLUP).
  if (btnBlanco.update(digitalRead(PIN_BTN_BLANCO) == LOW, now)) sendLine("GOL_BLANCO button");
  if (btnAzul.update(digitalRead(PIN_BTN_AZUL) == LOW, now)) sendLine("GOL_AZUL button");
  if (btnPausa.update(digitalRead(PIN_BTN_PAUSA) == LOW, now)) sendLine("PAUSA");
  if (USE_SENSORS) {
    if (senBlanco.update(digitalRead(PIN_SENSOR_BLANCO) == LOW, now)) sendLine("GOL_BLANCO sensor");
    if (senAzul.update(digitalRead(PIN_SENSOR_AZUL) == LOW, now)) sendLine("GOL_AZUL sensor");
  }

  // Órdenes de la app.
  while (Serial.available() > 0) {
    if (rx.push((char)Serial.read())) handleApp(rx.line());
  }

  // LED: encendido tras gol; parpadeo suave mientras dura el bloqueo.
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
