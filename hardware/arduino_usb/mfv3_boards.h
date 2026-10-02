// MARCADOR FUTBOLÍN V3 · pines de cada modelo de placa
// -----------------------------------------------------
// NO hay que tocar nada: el programa reconoce la placa que eliges en el IDE de Arduino
// (Herramientas → Placa) y usa estos pines. Los esquemas de conexión de la app
// (Ajustes → Hazlo tú mismo) y docs/MANUAL_DIY.md salen de esta misma tabla.
//
// ¿Quieres otros pines? Escribe en el sketch, ANTES de `#include "mfv3_boards.h"`:
//   #define MFV3_PINES_PERSONALIZADOS
//   #define PIN_BTN_BLANCO 7   (y el resto de PIN_… de un bloque de abajo)
//
// Todos los pulsadores y sensores van entre el pin y GND (sin resistencias).
// LED y zumbador: pin → (transistor si es de 12 V) → LED/zumbador → GND.

#ifndef MFV3_BOARDS_H
#define MFV3_BOARDS_H

#if defined(ARDUINO_AVR_UNO)
#define MFV3_BOARD_ID "arduino-uno"
#elif defined(ARDUINO_AVR_NANO) || defined(ARDUINO_AVR_NANO_EVERY)
#define MFV3_BOARD_ID "arduino-nano"
#elif defined(ARDUINO_AVR_MEGA2560)
#define MFV3_BOARD_ID "arduino-mega"
#elif defined(ARDUINO_AVR_LEONARDO) || defined(ARDUINO_AVR_MICRO) || defined(ARDUINO_AVR_PROMICRO)
#define MFV3_BOARD_ID "arduino-leonardo"
#elif defined(ARDUINO_ARCH_RP2040)
#define MFV3_BOARD_ID "rp2040"
#elif defined(CONFIG_IDF_TARGET_ESP32C3)
#define MFV3_BOARD_ID "esp32c3"
#elif defined(CONFIG_IDF_TARGET_ESP32S3)
#define MFV3_BOARD_ID "esp32s3"
#elif defined(CONFIG_IDF_TARGET_ESP32S2)
#define MFV3_BOARD_ID "esp32s2"
#elif defined(CONFIG_IDF_TARGET_ESP32) || defined(ARDUINO_ARCH_ESP32)
#define MFV3_BOARD_ID "esp32"
#else
#define MFV3_BOARD_ID "generica"
#endif

#ifndef MFV3_PINES_PERSONALIZADOS

// ---- Arduino Uno / Nano / Mega / Leonardo / Micro y Raspberry Pi Pico (RP2040): mismos pines
#if defined(ARDUINO_ARCH_AVR) || defined(ARDUINO_ARCH_MEGAAVR) || defined(ARDUINO_ARCH_RP2040) || \
    (!defined(ARDUINO_ARCH_ESP32) && !defined(CONFIG_IDF_TARGET_ESP32) && !defined(CONFIG_IDF_TARGET_ESP32C3) && \
     !defined(CONFIG_IDF_TARGET_ESP32S3) && !defined(CONFIG_IDF_TARGET_ESP32S2))
// @pines arduino-uno arduino-nano arduino-mega arduino-leonardo rp2040 generica
#define PIN_BTN_BLANCO 2
#define PIN_BTN_AZUL 3
#define PIN_BTN_PAUSA 4
#define PIN_SENSOR_BLANCO 5
#define PIN_SENSOR_AZUL 6
#define PIN_BUZZER 8
#define PIN_LED_BLANCO 9
#define PIN_LED_AZUL 10

// ---- ESP32-C3 (Super Mini, DevKitM): evita 8 (LED) y 9 (BOOT)
#elif defined(CONFIG_IDF_TARGET_ESP32C3)
// @pines esp32c3
#define PIN_BTN_BLANCO 3
#define PIN_BTN_AZUL 4
#define PIN_BTN_PAUSA 5
#define PIN_SENSOR_BLANCO 6
#define PIN_SENSOR_AZUL 7
#define PIN_BUZZER 10
#define PIN_LED_BLANCO 0
#define PIN_LED_AZUL 1

// ---- ESP32-S3 y ESP32-S2 (DevKitC, S2 Mini): evita 0, 19/20 (USB) y 26–48 (memoria en algunas placas)
#elif defined(CONFIG_IDF_TARGET_ESP32S3) || defined(CONFIG_IDF_TARGET_ESP32S2)
// @pines esp32s3 esp32s2
#define PIN_BTN_BLANCO 4
#define PIN_BTN_AZUL 5
#define PIN_BTN_PAUSA 6
#define PIN_SENSOR_BLANCO 7
#define PIN_SENSOR_AZUL 8
#define PIN_BUZZER 11
#define PIN_LED_BLANCO 9
#define PIN_LED_AZUL 10

// ---- ESP32 clásico (DevKit V1, WROOM-32)
#else
// @pines esp32
#define PIN_BTN_BLANCO 4
#define PIN_BTN_AZUL 5
#define PIN_BTN_PAUSA 18
#define PIN_SENSOR_BLANCO 19
#define PIN_SENSOR_AZUL 21
#define PIN_BUZZER 25
#define PIN_LED_BLANCO 22
#define PIN_LED_AZUL 23
#endif

#endif  // MFV3_PINES_PERSONALIZADOS

// Capacidades que la placa anuncia a la app en su saludo (HELLO … caps=…).
#define MFV3_CAPS_BASE "goles,anular,pausa,sensores,leds,zumbador"

#endif  // MFV3_BOARDS_H
