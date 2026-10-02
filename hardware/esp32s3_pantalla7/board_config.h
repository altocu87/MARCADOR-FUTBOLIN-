// MARCADOR FUTBOLÍN V3 · configuración de la placa ESP32-S3 con pantalla de 7" (800×480, táctil GT911)
// -----------------------------------------------------------------------------------------------------
// Elige UNA placa. Los pines de la pantalla RGB cambian según el fabricante; si tu placa no está en la lista,
// copia el perfil CUSTOM y rellénalo con los datos del esquema/ejemplo LovyanGFX de tu fabricante.
//
//   BOARD_ELECROW_7    Elecrow CrowPanel 7.0" ESP32-S3 (HMI 800×480, GT911)
//   BOARD_WAVESHARE_7  Waveshare ESP32-S3-Touch-LCD-7 (800×480, GT911, expansor CH422G)
//   BOARD_CUSTOM       Otra placa: edita los valores marcados con «RELLENAR»
//
// Biblioteca: LovyanGFX (Gestor de bibliotecas). Placa: «ESP32S3 Dev Module» con PSRAM «OPI PSRAM»,
// Flash 16 MB y particiones «Huge APP» (o las que indique el fabricante).

#ifndef MFV3_BOARD_CONFIG_H
#define MFV3_BOARD_CONFIG_H

#define BOARD_ELECROW_7 1
#define BOARD_WAVESHARE_7 2
#define BOARD_CUSTOM 3

#ifndef MFV3_BOARD
#define MFV3_BOARD BOARD_ELECROW_7   // <── CAMBIA AQUÍ TU PLACA
#endif

#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <lgfx/v1/platforms/esp32s3/Bus_RGB.hpp>
#include <lgfx/v1/platforms/esp32s3/Panel_RGB.hpp>
#include <Wire.h>

// Pines de entradas auxiliares (UART desde un Arduino/ESP32-C3 con el sketch arduino_usb). -1 = sin usar.
#if MFV3_BOARD == BOARD_ELECROW_7
#define AUX_UART_RX 18   // conector UART1 de la CrowPanel (comprueba la serigrafía)
#define AUX_UART_TX 17
#define BUZZER_PIN -1
#elif MFV3_BOARD == BOARD_WAVESHARE_7
#define AUX_UART_RX 44   // UART del conector (compartido con USB-UART: no uses ambos a la vez)
#define AUX_UART_TX 43
#define BUZZER_PIN -1
#else
#define AUX_UART_RX -1   // RELLENAR
#define AUX_UART_TX -1   // RELLENAR
#define BUZZER_PIN -1
#endif

class LGFX : public lgfx::LGFX_Device {
 public:
  lgfx::Bus_RGB bus;
  lgfx::Panel_RGB panel;
  lgfx::Light_PWM light;
  lgfx::Touch_GT911 touch;
  int touchSda = -1;
  int touchScl = -1;

  LGFX() {
    {
      auto cfg = panel.config();
      cfg.memory_width = 800;
      cfg.memory_height = 480;
      cfg.panel_width = 800;
      cfg.panel_height = 480;
      cfg.offset_x = 0;
      cfg.offset_y = 0;
      panel.config(cfg);
    }
    {
      auto cfg = panel.config_detail();
      cfg.use_psram = 1;  // el framebuffer de 800×480 va en PSRAM
      panel.config_detail(cfg);
    }
    auto b = bus.config();
    b.panel = &panel;
#if MFV3_BOARD == BOARD_ELECROW_7
    // Datos: B0..B4, G0..G5, R0..R4
    b.pin_d0 = GPIO_NUM_15; b.pin_d1 = GPIO_NUM_7;  b.pin_d2 = GPIO_NUM_6;  b.pin_d3 = GPIO_NUM_5;  b.pin_d4 = GPIO_NUM_4;
    b.pin_d5 = GPIO_NUM_9;  b.pin_d6 = GPIO_NUM_46; b.pin_d7 = GPIO_NUM_3;  b.pin_d8 = GPIO_NUM_8;  b.pin_d9 = GPIO_NUM_16;
    b.pin_d10 = GPIO_NUM_1; b.pin_d11 = GPIO_NUM_14; b.pin_d12 = GPIO_NUM_21; b.pin_d13 = GPIO_NUM_47; b.pin_d14 = GPIO_NUM_48;
    b.pin_d15 = GPIO_NUM_45;
    b.pin_henable = GPIO_NUM_41; b.pin_vsync = GPIO_NUM_40; b.pin_hsync = GPIO_NUM_39; b.pin_pclk = GPIO_NUM_0;
    b.freq_write = 15000000;
    b.hsync_polarity = 0; b.hsync_front_porch = 40; b.hsync_pulse_width = 48; b.hsync_back_porch = 40;
    b.vsync_polarity = 0; b.vsync_front_porch = 1;  b.vsync_pulse_width = 31; b.vsync_back_porch = 13;
    b.pclk_active_neg = 1; b.de_idle_high = 0; b.pclk_idle_high = 0;
    touchSda = 19; touchScl = 20;
    { auto l = light.config(); l.pin_bl = GPIO_NUM_2; light.config(l); }
    panel.setLight(&light);
#elif MFV3_BOARD == BOARD_WAVESHARE_7
    b.pin_d0 = GPIO_NUM_14; b.pin_d1 = GPIO_NUM_38; b.pin_d2 = GPIO_NUM_18; b.pin_d3 = GPIO_NUM_17; b.pin_d4 = GPIO_NUM_10;
    b.pin_d5 = GPIO_NUM_39; b.pin_d6 = GPIO_NUM_0;  b.pin_d7 = GPIO_NUM_45; b.pin_d8 = GPIO_NUM_48; b.pin_d9 = GPIO_NUM_47;
    b.pin_d10 = GPIO_NUM_21; b.pin_d11 = GPIO_NUM_1; b.pin_d12 = GPIO_NUM_2; b.pin_d13 = GPIO_NUM_42; b.pin_d14 = GPIO_NUM_41;
    b.pin_d15 = GPIO_NUM_40;
    b.pin_henable = GPIO_NUM_5; b.pin_vsync = GPIO_NUM_3; b.pin_hsync = GPIO_NUM_46; b.pin_pclk = GPIO_NUM_7;
    b.freq_write = 16000000;
    b.hsync_polarity = 0; b.hsync_front_porch = 8; b.hsync_pulse_width = 4; b.hsync_back_porch = 8;
    b.vsync_polarity = 0; b.vsync_front_porch = 8; b.vsync_pulse_width = 4; b.vsync_back_porch = 8;
    b.pclk_active_neg = 1; b.de_idle_high = 0; b.pclk_idle_high = 0;
    touchSda = 8; touchScl = 9;
    // Retroiluminación y reset por el expansor CH422G (ver waveshareExpanderInit()).
#else
    // RELLENAR con los pines de tu placa (orden B0..B4, G0..G5, R0..R4).
    b.pin_d0 = GPIO_NUM_NC; b.pin_d1 = GPIO_NUM_NC; b.pin_d2 = GPIO_NUM_NC; b.pin_d3 = GPIO_NUM_NC; b.pin_d4 = GPIO_NUM_NC;
    b.pin_d5 = GPIO_NUM_NC; b.pin_d6 = GPIO_NUM_NC; b.pin_d7 = GPIO_NUM_NC; b.pin_d8 = GPIO_NUM_NC; b.pin_d9 = GPIO_NUM_NC;
    b.pin_d10 = GPIO_NUM_NC; b.pin_d11 = GPIO_NUM_NC; b.pin_d12 = GPIO_NUM_NC; b.pin_d13 = GPIO_NUM_NC; b.pin_d14 = GPIO_NUM_NC;
    b.pin_d15 = GPIO_NUM_NC;
    b.pin_henable = GPIO_NUM_NC; b.pin_vsync = GPIO_NUM_NC; b.pin_hsync = GPIO_NUM_NC; b.pin_pclk = GPIO_NUM_NC;
    b.freq_write = 14000000;
    b.hsync_polarity = 0; b.hsync_front_porch = 8; b.hsync_pulse_width = 4; b.hsync_back_porch = 8;
    b.vsync_polarity = 0; b.vsync_front_porch = 8; b.vsync_pulse_width = 4; b.vsync_back_porch = 8;
    b.pclk_active_neg = 1; b.de_idle_high = 0; b.pclk_idle_high = 0;
    touchSda = -1; touchScl = -1;  // RELLENAR
#endif
    bus.config(b);
    panel.setBus(&bus);

    {
      auto t = touch.config();
      t.x_min = 0; t.x_max = 799;
      t.y_min = 0; t.y_max = 479;
      t.pin_int = -1;
      t.pin_rst = -1;
      t.bus_shared = false;
      t.offset_rotation = 0;
      t.i2c_port = 1;
      t.pin_sda = touchSda;
      t.pin_scl = touchScl;
      t.freq = 400000;
      t.i2c_addr = 0x5D;  // se ajusta en detectTouchAddress()
      touch.config(t);
    }
    panel.setTouch(&touch);
    setPanel(&panel);
  }

  // El GT911 responde en 0x5D o 0x14 según cómo arrancó: se detecta antes de init().
  void detectTouchAddress() {
    if (touchSda < 0) return;
    Wire.begin(touchSda, touchScl);
    uint8_t addr = 0x5D;
    Wire.beginTransmission(0x5D);
    if (Wire.endTransmission() != 0) {
      Wire.beginTransmission(0x14);
      if (Wire.endTransmission() == 0) addr = 0x14;
    }
    Wire.end();
    auto t = touch.config();
    t.i2c_addr = addr;
    touch.config(t);
  }

#if MFV3_BOARD == BOARD_WAVESHARE_7
  // CH422G: 0x24 = modo (salidas), 0x38 = valor de las salidas EXIO (reset táctil, retroiluminación, reset LCD).
  void waveshareExpanderInit() {
    Wire.begin(touchSda, touchScl);
    Wire.beginTransmission(0x24); Wire.write(0x01); Wire.endTransmission();
    Wire.beginTransmission(0x38); Wire.write(0xFF); Wire.endTransmission();
    Wire.end();
  }
#endif
};

#endif  // MFV3_BOARD_CONFIG_H
