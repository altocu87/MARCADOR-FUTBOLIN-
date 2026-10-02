#pragma once
#define WIFI_SECOND_CHAN_NONE 0
namespace sim { inline int wifiChannel = 0; }
inline int esp_wifi_set_channel(int ch, int) { sim::wifiChannel = ch; return 0; }
