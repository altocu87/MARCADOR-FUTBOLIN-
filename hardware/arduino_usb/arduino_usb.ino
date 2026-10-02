// MARCADOR FUTBOLÍN V3 · Arduino por USB (Uno, Nano, Mega, Leonardo, Micro, Raspberry Pi Pico…)
// ---------------------------------------------------------------------------
// Conecta la placa al PC/tablet/móvil Android por USB y en la app:
// Ajustes → Conexiones → USB → Conectar (Chrome o Edge).
//
// Qué hace:
//   - Reconoce SOLA la placa elegida en el IDE y usa sus pines (mfv3_boards.h).
//   - Lee 2 pulsadores de gol (Blanco/Azul), 1 de pausa y 2 sensores de gol (opcionales).
//     Pulsador: toque corto = GOL, toque largo (0,8 s) = ANULAR el último gol de ese equipo.
//     Sensores: de cualquier tipo; aprenden su estado «sin balón» al encender.
//   - Envía por Serial (115200) las órdenes del protocolo MFV3: GOL_BLANCO, ANULAR_BLANCO, PAUSA…
//   - Enciende el LED del pulsador del equipo que marca y suena el zumbador cuando la
//     app CONFIRMA el gol (GOAL …), y los apaga durante el bloqueo de 3 s.
//
// Cableado (esquemas en la app: Ajustes → Hazlo tú mismo, y en docs/MANUAL_DIY.md):
//   Pulsadores y sensores entre el pin y GND (se usa INPUT_PULLUP, activo en LOW).
//   ¡Nunca conectes 12 V a un pin! Los LED de 12 V de los botones arcade van con
//   un transistor/MOSFET (p. ej. ULN2003 o IRLZ44N) controlado desde el pin.

#include "mfv3_core.h"
#include "mfv3_boards.h"   // pines según la placa (automático)

const char* FW_VERSION = "1.1";
const uint16_t PULSACION_LARGA_MS = 800;  // mantener el pulsador este tiempo = anular gol

// Pulsadores: antirrebote 25 ms + toque corto/largo. Sensores: estado de reposo aprendido al encender.
mfv3::PressClassifier btnBlanco(PULSACION_LARGA_MS), btnAzul(PULSACION_LARGA_MS);
mfv3::EdgeTrigger btnPausa(25, 600);
mfv3::GoalSensor senBlanco(5, 800), senAzul(5, 800);
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
  senBlanco.begin(digitalRead(PIN_SENSOR_BLANCO));
  senAzul.begin(digitalRead(PIN_SENSOR_AZUL));
}

void sendHello() {
  Serial.print("HELLO ");
  Serial.print(MFV3_BOARD_ID);
  Serial.print(' ');
  Serial.print(FW_VERSION);
  Serial.print(" caps=" MFV3_CAPS_BASE "\n");
}

void button(mfv3::PressClassifier& b, uint8_t pin, const char* goal, const char* annul, uint32_t now) {
  mfv3::Press p = b.update(digitalRead(pin) == LOW, now);
  if (p == mfv3::Press::Short) sendLine(goal);
  else if (p == mfv3::Press::Long) sendLine(annul);
}

void loop() {
  uint32_t now = millis();

  // Saludo periódico hasta que la app responde (la app puede abrirse después).
  if (!connected && now - lastHello > 2000) {
    lastHello = now;
    sendHello();
  }

  // Entradas (activas en LOW por INPUT_PULLUP).
  button(btnBlanco, PIN_BTN_BLANCO, "GOL_BLANCO button", "ANULAR_BLANCO", now);
  button(btnAzul, PIN_BTN_AZUL, "GOL_AZUL button", "ANULAR_AZUL", now);
  if (btnPausa.update(digitalRead(PIN_BTN_PAUSA) == LOW, now)) sendLine("PAUSA");
  if (senBlanco.update(digitalRead(PIN_SENSOR_BLANCO), now)) sendLine("GOL_BLANCO sensor");
  if (senAzul.update(digitalRead(PIN_SENSOR_AZUL), now)) sendLine("GOL_AZUL sensor");

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
