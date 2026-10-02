# Hardware y dispositivos · MARCADOR FUTBOLÍN V3

La app es una web: funciona en **cualquier PC, Mac, tablet o móvil** con un navegador moderno y se puede
**instalar como aplicación** (PWA). Las placas **Arduino / ESP32** se usan para los **pulsadores y sensores de gol**,
LEDs y zumbador, y el ESP32 además puede **servir la app sin Internet** desde su propia red Wi-Fi.

> Regla de oro: la placa solo avisa de pulsaciones. **Todas las reglas** (bloqueo de 3 s, turnos de penaltis,
> estados del partido) las aplica el motor de la app, igual que si tocaras la pantalla.

---

## 1. Pantallas y dispositivos

| Dispositivo | Cómo usarlo | Notas |
|---|---|---|
| PC / Mac (Chrome, Edge, Firefox, Safari) | Abrir la web o instalarla (icono «Instalar» en la barra) | ⛶ pantalla completa en Inicio o Ajustes |
| Tablet / móvil Android | Chrome → menú → «Instalar aplicación» | Se abre a pantalla completa y en horizontal |
| iPhone / iPad | Safari → Compartir → «Añadir a pantalla de inicio» | Sin USB ni Bluetooth web (usa Wi-Fi con ESP32) |
| Raspberry Pi + pantalla táctil 7" | Chromium en modo quiosco (ver §6) | Opción recomendada para dejarlo fijo en la mesa |
| ESP32-S3 7" (800×480) | Como **servidor** de la app y centro de entradas; la interfaz completa en la propia placa requiere una versión nativa (pendiente, ver §7) | |

**Resolución:** el diseño base es 800×480 (la pantalla del ESP32-S3). En pantallas panorámicas (16:9, 21:9) el
lienzo se ensancha hasta 1100 px lógicos y en 4:3/16:10 crece en alto hasta 640, así que **no quedan franjas**.
En un móvil en vertical aparece un aviso para girarlo (se puede seguir en vertical). La app mantiene la pantalla
encendida mientras está abierta (Ajustes → General → Pantalla) y funciona **sin conexión** una vez cargada.

---

## 2. Formas de conectar una placa

| Vía | Placas | Navegadores | Cuándo usarla |
|---|---|---|---|
| **USB (Web Serial)** | Arduino Uno, Nano, Mega, Leonardo, Micro · ESP32 por cable | Chrome / Edge en PC, Mac, Android | Lo más sencillo: placa barata y un cable |
| **Wi-Fi (WebSocket)** | ESP32, ESP32-C3, ESP32-S3 (y ESP8266 adaptando el sketch) | **Todos**, incluido iPhone | Sin cables; la placa crea su red y sirve la app |
| **Bluetooth LE (UART de Nordic)** | ESP32, ESP32-C3, ESP32-S3 | Chrome / Edge en PC, Mac, Android | Sin cables y sin cambiar de red Wi-Fi |

En la app: **Ajustes → Conexiones**. Se ven el estado, el nombre de la placa y un registro de mensajes.
«Reconectar al abrir» vuelve a conectar Wi-Fi y USB automáticamente. Si la app se abre **desde la propia
placa** (http://192.168.4.1), se conecta por Wi-Fi sola.

> Seguridad del navegador: USB y Bluetooth solo funcionan en páginas seguras (https o localhost). Una web en
> **https** no puede conectar con **ws://** (Wi-Fi sin cifrar) salvo que la app la sirva la propia placa por http.

---

## 3. Programas para las placas (`hardware/`)

| Carpeta | Placa | Qué hace |
|---|---|---|
| `hardware/arduino_usb/` | Arduino Uno/Nano/Mega/Leonardo | Pulsadores + sensores → USB; LEDs y zumbador al confirmar gol |
| `hardware/esp32_marcador/` | ESP32 / C3 / S3 | Red propia «MARCADOR-FUTBOLIN», sirve la app, WebSocket + Bluetooth + USB, LEDs y zumbador |
| `hardware/common/mfv3_core.h` | — | Antirrebote, disparo por flanco y protocolo (compartido, probado en PC) |

### Arduino (USB)
1. Instala el **IDE de Arduino**. Abre `hardware/arduino_usb/arduino_usb.ino`.
2. Ajusta los pines al principio del archivo (y `USE_SENSORS = true` si pones sensores).
3. Herramientas → Placa y Puerto → **Subir**.
4. Conecta la placa al PC/Android, abre la app en Chrome/Edge → Ajustes → Conexiones → USB → **Conectar**.

### ESP32 (Wi-Fi + Bluetooth + USB, y servidor de la app)
1. IDE de Arduino → Gestor de placas → instala **esp32 (Espressif)**.
   Gestor de bibliotecas → instala **WebSockets** (Markus Sattler).
2. Abre `hardware/esp32_marcador/esp32_marcador.ino`, revisa pines, red y `USE_BLE`/`USE_SENSORS`.
3. Compila y sube.
4. Copia la app a la placa: en la carpeta del proyecto ejecuta **`npm run build:esp32`** (compila y deja la
   app comprimida en `hardware/esp32_marcador/data/`, unos 170 KB). Después sube esa carpeta con el plugin
   **«LittleFS Upload»** del IDE (Ctrl+Mayús+P → *Upload LittleFS to Pico/ESP8266/ESP32*).
   Usa un esquema de particiones con espacio para LittleFS (p. ej. *Default 4MB with spiffs*).
5. Conecta el móvil/tablet a la red **MARCADOR-FUTBOLIN** (clave `futbolin123`) y abre **http://192.168.4.1**
   (o http://marcador.local). Opcional: rellena `STA_SSID/STA_PASS` para que también se una a tu Wi-Fi.

> Estado de verificación: el núcleo común y el sketch de Arduino se han **probado en PC** con una simulación
> de pines y tiempo (`npm run test:hardware`). El sketch del ESP32 se ha comprobado contra bibliotecas
> simuladas, pero **no se ha compilado con el compilador real de Espressif** ni probado en placa (el entorno
> de desarrollo no tenía acceso a esas herramientas). Haz una primera prueba con la placa por USB y el monitor serie.

---

## 4. Cableado

### Pines por defecto

| Señal | Arduino Uno/Nano | ESP32 DevKit | ESP32-C3 SuperMini (sugerido) |
|---|---|---|---|
| Pulsador gol Blanco | D2 | GPIO 4 | GPIO 2 |
| Pulsador gol Azul | D3 | GPIO 5 | GPIO 3 |
| Pulsador pausa (opcional) | D4 | GPIO 18 | GPIO 4 |
| Sensor portería Blanco (opcional) | D5 | GPIO 19 | GPIO 5 |
| Sensor portería Azul (opcional) | D6 | GPIO 21 | GPIO 6 |
| LED Blanco | D9 | GPIO 22 | GPIO 7 |
| LED Azul | D10 | GPIO 23 | GPIO 10 |
| Zumbador | D8 | GPIO 25 | GPIO 1 |

### Pulsadores arcade (100 mm, con LED de 5/12 V)
- El **interruptor** del botón es un contacto seco: un terminal al **pin**, el otro a **GND**. El programa usa
  `INPUT_PULLUP` (activo al pulsar = LOW). No hace falta resistencia.
- El **LED** del botón va a otra tensión (5 V o 12 V): **nunca** directo al pin. Usa un transistor/MOSFET
  de nivel lógico (p. ej. IRLZ44N, AO3400) o un ULN2003: pin → puerta/entrada; el LED entre +12 V y el drenador.
- ESP32 = 3,3 V. **Ningún pin del ESP32 admite 5 V o 12 V.** Arduino Uno/Nano = 5 V.

### Sensores de gol (opcionales)
- Recomendado: **barrera infrarroja** (emisor + receptor, p. ej. 3 mm/5 mm «IR break beam») en la boca o en el
  canal de bajada de la portería. La salida del receptor suele ser de colector abierto → al pin con `INPUT_PULLUP`;
  alimenta el receptor a 3,3 V con ESP32.
- El sketch filtra rebotes (5 ms) y no repite antes de 800 ms; el motor de la app aplica además el bloqueo de 3 s.
- Alternativas: sensor de vibración/microrruptor en la bandeja de bolas. Hay que probar latencia y fiabilidad.

### Alimentación
- Arduino por USB del PC/tablet. ESP32 con fuente USB de 5 V/1 A; si los LED son de 12 V, fuente de 12 V
  aparte con **masa común** (GND unidas) y regulador a 5 V para la placa.

---

## 5. Protocolo MFV3 (para quien quiera hacer su propio firmware)

Texto UTF-8, **una orden por línea** terminada en `\n`, igual por USB (115200 baudios), WebSocket o Bluetooth.

| Placa → app | Significado |
|---|---|
| `HELLO <nombre> [versión]` | Saludo (se repite cada 2 s por USB hasta recibir respuesta) |
| `GOL_BLANCO [button\|sensor]` / `GB` | Gol de Blanco |
| `GOL_AZUL [button\|sensor]` / `GA` | Gol de Azul |
| `PAUSA` | Pausa / continuar |
| `SALTAR` | Saltar la cuenta atrás |
| `PING` | La app responde `PONG` |

| App → placa | Significado |
|---|---|
| `HELLO MARCADOR_V3 1` | La app está conectada |
| `STATE <fase>` | `idle`, `countdown`, `playing`, `paused`, `periodEnd`, `penalties`, `finished` |
| `SCORE <blanco> <azul>` | Marcador ordinario |
| `GOAL BLANCO\|AZUL` | Gol **aceptado** (para LED/zumbador) |
| `LOCK 3000` | Bloqueo de gol activo (ms) |
| `WIN BLANCO\|AZUL` | Fin del partido |

Durante la cuenta atrás, un gol de pulsador **solo la salta** (no suma). En penaltis, un gol del equipo que
lanza cuenta como acierto; si no es su turno, el motor lo rechaza.

---

## 6. Mesa fija con Raspberry Pi (pantalla táctil completa)

Una Raspberry Pi 4/5 (o Zero 2 W) con pantalla táctil de 7" 800×480 ejecuta la app completa:

```bash
# En la Raspberry Pi OS con escritorio
chromium-browser --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 \
  http://192.168.4.1   # o la URL donde esté publicada / un servidor local con dist/
```

Los pulsadores van a un Arduino por USB o a un ESP32 por Wi-Fi/Bluetooth, igual que con un PC.

---

## 7. ESP32-S3 con pantalla de 7" (pendiente)

El ESP32-S3 **no ejecuta un navegador**: no puede mostrar esta app React tal cual. Opciones:

1. **Ahora**: usar el S3 (o un C3) como centro de entradas + servidor Wi-Fi de la app, y una tablet/móvil/Pi
   como pantalla.
2. **Siguiente bloque** (no incluido): una interfaz **nativa con LVGL** en el S3 que muestre el marcador usando
   los mensajes `STATE/SCORE/GOAL/WIN` del protocolo, o que lleve el motor portado a C++. Requiere la placa exacta
   (controlador de pantalla y táctil) para desarrollarla y probarla.

---

## 8. Problemas frecuentes

| Problema | Solución |
|---|---|
| «USB no disponible aquí» | Usa Chrome o Edge (no Firefox/Safari). En Android, cable OTG. |
| No aparece el puerto | Cierra el monitor serie del IDE de Arduino (solo un programa puede usar el puerto). |
| Wi-Fi «Reintentando…» | Comprueba que estás en la red MARCADOR-FUTBOLIN y la IP (ws://192.168.4.1:81/). |
| Bluetooth no encuentra la placa | Activa Bluetooth y ubicación en Android; la placa se anuncia como «MFV3-xxxx». |
| Goles dobles por rebote | Sube el antirrebote o el `holdOff` en el sketch; el bloqueo de 3 s de la app ya evita dobles goles. |
| En http://192.168.4.1 no se instala como app | Los navegadores solo instalan/cachean en https o localhost; la placa ya la sirve sin Internet. |
