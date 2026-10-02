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
| ESP32-S3 7" (800×480) | **Marcador completo nativo** en la propia placa (táctil, sin PC ni móvil), ver §7. También puede hacer de servidor de la app | |

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
| `hardware/esp32s3_pantalla7/` | ESP32-S3 con pantalla táctil 7" 800×480 | **Marcador activo** en la propia pantalla: configuración, partido, prórroga, penaltis, victoria e historial |
| `hardware/common/mfv3_core.h` | — | Antirrebote, disparo por flanco y protocolo (compartido, probado en PC) |
| `hardware/common/mfv3_engine.h` | — | Motor del partido en C++ (mismas reglas que la app, criterios A01–A13 probados en PC) |

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

## 7. ESP32-S3 con pantalla de 7" (versión activa)

Placa de referencia: **Waveshare ESP32-S3-Touch-LCD-7C** (se vende como «ESP32-S3 7inch AI Voice Touch Display,
800×480, 5-Point Touch, Wi-Fi & BLE 5», también en caja: 7C-BOX). Los pines salen del repositorio oficial del
fabricante (github.com/waveshareteam/ESP32-S3-Touch-LCD-7C). El sketch
`hardware/esp32s3_pantalla7/` convierte la placa en **el marcador completo**, sin PC, móvil ni Internet:

- **Inicio:** POR GOLES / POR TIEMPO / AMBAS, goles y minutos por parte con − / +, botón JUGAR. Muestra el último
  resultado y los partidos jugados.
- **Partido:** el número grande de cada equipo es el botón de gol; −1, DESHACER, PAUSA, reloj, bloqueo de 3 s
  visible, «BOLA DE PARTIDO», cuenta atrás (toca para saltar), 1ª y 2ª parte, prórroga con gol de oro, penaltis
  con muerte súbita y pantalla de victoria con REVANCHA.
- **Mismas reglas que la app:** usa `mfv3_engine.h`, el motor portado a C++ y probado en PC con los criterios A01–A13.
- **Memoria:** guarda la configuración y los 8 últimos resultados aunque se apague.
- **Ahorro:** fuera de partido baja el brillo a los 5 min; el primer toque solo la despierta.
- **Sensores de gol (Waveshare 7C):** van directamente a las **entradas aisladas** de la placa, sin Arduino:
  **DI0 = gol del Blanco**, **DI1 = gol del Azul** (más su borne común). El estado que tienen al encender se toma
  como «sin balón», así que vale cualquier sensor (NPN/PNP, normalmente abierto o cerrado): **enciende la placa
  sin balón delante de los sensores**. Las salidas **DO0 / DO1** se activan 1 segundo con cada gol del Blanco /
  Azul (luz, tira LED o relé). Comprueba en la wiki de Waveshare la tensión admitida por DI/DO antes de cablear.
- **Otras placas:** conecta un Arduino o ESP32-C3 con el sketch `arduino_usb` al UART de la placa
  (TX del Arduino → RX de la placa). La placa contesta `GOAL/LOCK/WIN` para que el Arduino encienda LEDs y zumbador.
  ⚠ Un Arduino Uno/Nano trabaja a 5 V: pon un divisor (1 kΩ + 2 kΩ) en su TX antes de entrar al RX de 3,3 V.
  También acepta las mismas órdenes por el USB de la placa (`GB`, `GA`, `PAUSA`, `SALTAR`, `PING`, `HELLO`).

### Cómo cargarlo
1. IDE de Arduino con el paquete **esp32 de Espressif** y la biblioteca **LovyanGFX** (Gestor de bibliotecas).
2. Abre `hardware/esp32s3_pantalla7/esp32s3_pantalla7.ino`.
3. `board_config.h` ya viene con **`BOARD_WAVESHARE_7C`**. Otras opciones: `BOARD_ELECROW_7` (CrowPanel 7.0"),
   `BOARD_WAVESHARE_7` (ESP32-S3-Touch-LCD-7, sin «C») o `BOARD_CUSTOM`.
4. Herramientas → Placa **ESP32S3 Dev Module**, PSRAM **OPI PSRAM**, Flash **16 MB** (la 7C trae 32 MB: 16 MB
   basta), particiones **Huge APP**, USB CDC On Boot **Enabled** (para ver los mensajes por el USB).
5. **Subir.**

### Limitaciones conocidas
- No se ha podido compilar con las herramientas de Espressif ni probar en la placa real en este entorno: la lógica
  (motor, botones, protocolo, memoria) sí se prueba en PC (`npm run test:hardware`), el dibujo en pantalla no.
- Los pines de pantalla y táctil **cambian según el fabricante**: si la pantalla sale en negro o desplazada, revisa
  el perfil en `board_config.h`.
- Los textos de la placa van sin tildes (las fuentes integradas no las incluyen).
- En la 7C no queda un UART libre (el audio usa GPIO43/44): los sensores van a DI0/DI1 y el PC por USB.
- Aún no usa el altavoz/micrófono de las placas «AI Voice» (códec ES8389) ni el Wi-Fi/Bluetooth (los dos siguen disponibles para
  una versión futura: sincronizar con la app o anunciar los goles por voz).

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
