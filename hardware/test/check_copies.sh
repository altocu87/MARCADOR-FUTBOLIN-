#!/bin/sh
# Comprueba que cada sketch lleva una copia idéntica de los ficheros comunes y ejecuta las pruebas en PC.
set -e
cd "$(dirname "$0")/.."
for d in arduino_usb esp32_marcador esp32s3_pantalla7; do
  cmp -s common/mfv3_core.h "$d/mfv3_core.h" || { echo "Copia desactualizada en $d/ (copia common/mfv3_core.h)"; exit 1; }
done
cmp -s common/mfv3_engine.h esp32s3_pantalla7/mfv3_engine.h || { echo "Copia desactualizada en esp32s3_pantalla7/ (copia common/mfv3_engine.h)"; exit 1; }
g++ -std=c++11 -Wall -Wextra -Icommon test/core_test.cpp -o /tmp/mfv3_core_test && /tmp/mfv3_core_test
g++ -std=c++11 -Wall -Wextra -Icommon test/engine_test.cpp -o /tmp/mfv3_engine_test && /tmp/mfv3_engine_test
g++ -std=c++17 -Wall -Wno-unused-variable -Itest/mock -Iarduino_usb -x c++ test/arduino_sim_test.cpp -o /tmp/mfv3_ard_sim && /tmp/mfv3_ard_sim
g++ -std=c++17 -Wall -Wno-unused-variable -Itest/mock_esp32 -Iesp32_marcador -x c++ test/esp32_sim_test.cpp -o /tmp/mfv3_esp_sim && /tmp/mfv3_esp_sim
# Pantalla de 7": Waveshare 7C (4, por defecto), Elecrow (1) y Waveshare 7 (2)
for b in 4 1 2; do
  g++ -std=c++17 -Wall -Wno-unused-variable -DMFV3_BOARD=$b -Itest/mock_s3 -Iesp32s3_pantalla7 -x c++ test/s3_sim_test.cpp -o /tmp/mfv3_s3_sim && /tmp/mfv3_s3_sim
done
