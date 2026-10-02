#!/bin/sh
# Comprueba que cada sketch lleva una copia idéntica de common/mfv3_core.h y ejecuta las pruebas en PC.
set -e
cd "$(dirname "$0")/.."
for d in arduino_usb esp32_marcador; do
  cmp -s common/mfv3_core.h "$d/mfv3_core.h" || { echo "Copia desactualizada en $d/ (copia common/mfv3_core.h)"; exit 1; }
done
g++ -std=c++11 -Wall -Wextra -Icommon test/core_test.cpp -o /tmp/mfv3_core_test && /tmp/mfv3_core_test
g++ -std=c++17 -Wall -Wno-unused-variable -Itest/mock -Iarduino_usb -x c++ test/arduino_sim_test.cpp -o /tmp/mfv3_ard_sim && /tmp/mfv3_ard_sim
g++ -std=c++17 -Wall -Wno-unused-variable -Itest/mock_esp32 -Iesp32_marcador -x c++ test/esp32_sim_test.cpp -o /tmp/mfv3_esp_sim && /tmp/mfv3_esp_sim
