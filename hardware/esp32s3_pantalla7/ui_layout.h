// MARCADOR FUTBOLÍN V3 · distribución de botones de la pantalla de 7" (800×480).
// Solo geometría y detección de toques: no depende de la pantalla, se prueba en el PC.

#ifndef MFV3_UI_LAYOUT_H
#define MFV3_UI_LAYOUT_H

#include <stdint.h>

namespace ui {

const int16_t W = 800;
const int16_t H = 480;

enum class Btn : uint8_t {
  None,
  // Inicio / configuración
  CondGoals, CondTime, CondBoth, GoalsMinus, GoalsPlus, MinutesMinus, MinutesPlus, Play,
  // Partido
  ScoreWhite, ScoreBlue, MinusWhite, MinusBlue, Undo, Pause,
  // Superposiciones
  Resume, Abandon, Next, SkipCountdown,
  // Penaltis
  PenWhiteGoal, PenWhiteMiss, PenBlueGoal, PenBlueMiss, PenUndo,
  // Final
  NewMatch, Rematch,
};

struct Rect {
  int16_t x, y, w, h;
  bool contains(int16_t px, int16_t py) const { return px >= x && px < x + w && py >= y && py < y + h; }
};

struct Button {
  Btn id;
  Rect r;
};

// ---- Inicio
const Button HOME[] = {
    {Btn::CondGoals, {40, 150, 230, 64}},  {Btn::CondTime, {285, 150, 230, 64}},  {Btn::CondBoth, {530, 150, 230, 64}},
    {Btn::GoalsMinus, {40, 270, 72, 72}},   {Btn::GoalsPlus, {290, 270, 72, 72}},
    {Btn::MinutesMinus, {438, 270, 72, 72}}, {Btn::MinutesPlus, {688, 270, 72, 72}},
    {Btn::Play, {240, 380, 320, 80}},
};

// ---- Partido (paneles de marcador = botones de gol)
const Rect PANEL_WHITE = {12, 52, 296, 332};
const Rect PANEL_BLUE = {492, 52, 296, 332};
const Rect CLOCK = {314, 60, 172, 70};
const Rect LOCK_MSG = {314, 140, 172, 30};
const Button MATCH[] = {
    {Btn::ScoreWhite, PANEL_WHITE}, {Btn::ScoreBlue, PANEL_BLUE},
    {Btn::MinusWhite, {12, 396, 90, 72}}, {Btn::MinusBlue, {698, 396, 90, 72}},
    {Btn::Undo, {320, 316, 160, 64}},     {Btn::Pause, {320, 396, 160, 72}},
};

// ---- Pausa / final de periodo / cuenta atrás
const Button PAUSED[] = {{Btn::Resume, {250, 220, 300, 84}}, {Btn::Abandon, {300, 330, 200, 60}}};
const Button PERIOD_END[] = {{Btn::Next, {230, 330, 340, 84}}};
const Button COUNTDOWN[] = {{Btn::SkipCountdown, {0, 0, W, H}}};

// ---- Penaltis
const Button PENALTIES[] = {
    {Btn::PenWhiteGoal, {20, 370, 140, 90}},  {Btn::PenWhiteMiss, {170, 370, 140, 90}},
    {Btn::PenBlueGoal, {490, 370, 140, 90}},  {Btn::PenBlueMiss, {640, 370, 140, 90}},
    {Btn::PenUndo, {330, 390, 140, 70}},
};

// ---- Final
const Button FINISHED[] = {{Btn::NewMatch, {150, 370, 240, 80}}, {Btn::Rematch, {410, 370, 240, 80}}};

template <unsigned N>
Btn hit(const Button (&list)[N], int16_t x, int16_t y) {
  for (unsigned i = 0; i < N; i++)
    if (list[i].r.contains(x, y)) return list[i].id;
  return Btn::None;
}

template <unsigned N>
const Rect* rectOf(const Button (&list)[N], Btn id) {
  for (unsigned i = 0; i < N; i++)
    if (list[i].id == id) return &list[i].r;
  return nullptr;
}

}  // namespace ui

#endif  // MFV3_UI_LAYOUT_H
