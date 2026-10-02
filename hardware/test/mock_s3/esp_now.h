// ESP-NOW simulado: lo que envía un sketch queda en sim::radioSent; la pantalla recibe con sim::radioDeliver().
#pragma once
#include <stdint.h>
#include <cstring>
#include <vector>
#define ESP_OK 0
typedef int esp_err_t;
struct esp_now_recv_info_t { const uint8_t* src_addr; const uint8_t* des_addr; void* rx_ctrl; };
struct esp_now_peer_info_t { uint8_t peer_addr[6]; uint8_t lmk[16]; uint8_t channel; int ifidx; bool encrypt; void* priv; };
typedef void (*esp_now_recv_cb_t)(const esp_now_recv_info_t*, const uint8_t*, int);
namespace sim {
inline std::vector<std::vector<uint8_t>> radioSent;
inline esp_now_recv_cb_t radioCb = nullptr;
inline void radioDeliver(const uint8_t* mac, const std::vector<uint8_t>& pk) {
  esp_now_recv_info_t info = {mac, nullptr, nullptr};
  if (radioCb) radioCb(&info, pk.data(), (int)pk.size());
}
}  // namespace sim
inline esp_err_t esp_now_init() { return ESP_OK; }
inline esp_err_t esp_now_register_recv_cb(esp_now_recv_cb_t cb) { sim::radioCb = cb; return ESP_OK; }
inline esp_err_t esp_now_add_peer(const esp_now_peer_info_t*) { return ESP_OK; }
inline esp_err_t esp_now_send(const uint8_t*, const uint8_t* d, size_t n) {
  sim::radioSent.emplace_back(d, d + n);
  return ESP_OK;
}
