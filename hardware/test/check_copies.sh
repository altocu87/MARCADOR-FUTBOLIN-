#!/bin/sh
# Comprueba que cada sketch lleva una copia idéntica de los ficheros comunes y ejecuta las pruebas en PC.
set -e
cd "$(dirname "$0")/.."
check() { cmp -s "common/$1" "$2/$1" || { echo "Copia desactualizada en $2/ (copia common/$1)"; exit 1; }; }
for d in arduino_usb esp32_marcador esp32s3_pantalla7 mando_pulsadores; do check mfv3_core.h "$d"; done
check mfv3_engine.h esp32s3_pantalla7
for d in esp32s3_pantalla7 mando_pulsadores; do check mfv3_radio.h "$d"; done
g++ -std=c++11 -Wall -Wextra -Icommon test/core_test.cpp -o /tmp/mfv3_core_test && /tmp/mfv3_core_test
g++ -std=c++11 -Wall -Wextra -Icommon test/engine_test.cpp -o /tmp/mfv3_engine_test && /tmp/mfv3_engine_test
g++ -std=c++11 -Wall -Wextra -Icommon test/radio_test.cpp -o /tmp/mfv3_radio_test && /tmp/mfv3_radio_test
g++ -std=c++17 -Wall -Wno-unused-variable -Itest/mock -Iarduino_usb -x c++ test/arduino_sim_test.cpp -o /tmp/mfv3_ard_sim && /tmp/mfv3_ard_sim
g++ -std=c++17 -Wall -Wno-unused-variable -Itest/mock_esp32 -Iesp32_marcador -x c++ test/esp32_sim_test.cpp -o /tmp/mfv3_esp_sim && /tmp/mfv3_esp_sim
g++ -std=c++17 -Wall -Wno-unused-variable -Itest/mock_s3 -Imando_pulsadores -x c++ test/mando_sim_test.cpp -o /tmp/mfv3_mando_sim && /tmp/mfv3_mando_sim
# Pantalla de 7": Waveshare 7C (4, por defecto), Elecrow (1) y Waveshare 7 (2)
for b in 4 1 2; do
  g++ -std=c++17 -Wall -Wno-unused-variable -DMFV3_BOARD=$b -Itest/mock_s3 -Iesp32s3_pantalla7 -x c++ test/s3_sim_test.cpp -o /tmp/mfv3_s3_sim && /tmp/mfv3_s3_sim
done
