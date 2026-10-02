// Pruebas del motor C++ en el PC (mismos criterios A01–A13 que la app):
//   g++ -std=c++11 -Wall -I../common engine_test.cpp && ./a.out
#include <cassert>
#include <cstdio>

#include "mfv3_engine.h"

using namespace mfv3;
typedef Result R;

static Config cfg(EndCondition c = EndCondition::Goals, uint8_t goals = 5, uint8_t minutes = 5) {
  Config k;
  k.endCondition = c;
  k.goalsPerPeriod = goals;
  k.minutesPerPeriod = minutes;
  return k;
}

struct Sim {
  Engine e;
  uint32_t t = 1000;
  explicit Sim(const Config& c) { assert(e.start(c, t)); }
  void wait(uint32_t ms) { t += ms; e.tick(t); }
  R goal(Team x) { return e.goal(x, t); }
  void goalLater(Team x) { wait(3000); assert(goal(x) == R::Accepted); }
  void startPeriod() { assert(e.skipCountdown(t) == R::Accepted); }
};

static void a01_full_match() {
  Sim s(cfg(EndCondition::Goals, 2));
  assert(s.e.phase() == Phase::Countdown);
  s.wait(2999); assert(s.e.phase() == Phase::Countdown);
  s.wait(1); assert(s.e.phase() == Phase::Playing);
  s.goalLater(Team::White); s.goalLater(Team::White);
  assert(s.e.phase() == Phase::PeriodEnd);
  assert(s.e.next(s.t) == R::Accepted && s.e.period() == Period::Second);
  s.startPeriod();
  s.goalLater(Team::Blue); s.goalLater(Team::White);
  assert(s.e.phase() == Phase::Finished && s.e.winner() == Team::White && s.e.reason() == Reason::Regulation);
  assert(s.e.score().white == 3 && s.e.score().blue == 1);
}

static void a02_invalid_config() {
  Engine e;
  assert(!e.start(cfg(EndCondition::Goals, 0), 0));
  assert(!e.start(cfg(EndCondition::Goals, 21), 0));
  assert(!e.start(cfg(EndCondition::Time, 5, 31), 0));
}

static void a03_a04_goals_and_time() {
  Sim s(cfg(EndCondition::Goals, 5, 1));
  s.startPeriod();
  s.wait(3600000);  // una hora: POR GOLES no termina por tiempo
  assert(s.e.phase() == Phase::Playing);
  Sim t(cfg(EndCondition::Time, 1, 1));
  t.startPeriod();
  t.goalLater(Team::White); t.goalLater(Team::White);
  assert(t.e.phase() == Phase::Playing);
  t.wait(60000);
  assert(t.e.phase() == Phase::PeriodEnd);
}

static void a05_both_boundary() {
  Sim s(cfg(EndCondition::Both, 10, 1));
  s.startPeriod();
  s.t += 60000;
  assert(s.goal(Team::White) == R::InvalidState);  // el tiempo se procesa primero
  assert(s.e.score().white == 0 && s.e.phase() == Phase::PeriodEnd);
}

static void a06_a07_lock() {
  Sim s(cfg(EndCondition::Goals, 20));
  assert(s.goal(Team::White) == R::InvalidState);  // antes de empezar
  s.startPeriod();
  s.wait(10000);
  uint32_t t0 = s.t;
  assert(s.goal(Team::White) == R::Accepted);
  s.t = t0 + 500;  assert(s.goal(Team::Blue) == R::GoalLock);
  s.t = t0 + 2900; assert(s.goal(Team::White) == R::GoalLock);
  s.t = t0 + 3000; assert(s.goal(Team::Blue) == R::Accepted);
  assert(s.e.pause(s.t) == R::Accepted);
  assert(s.goal(Team::Blue) == R::InvalidState);  // en pausa
}

static void a08_nothing_bypasses_lock() {
  Sim s(cfg(EndCondition::Goals, 20));
  s.startPeriod(); s.wait(5000);
  uint32_t t0 = s.t;
  s.goal(Team::White);
  s.t = t0 + 100; assert(s.e.undo(s.t) == R::Accepted);
  assert(s.goal(Team::Blue) == R::GoalLock);
  s.e.pause(s.t); s.t += 100; s.e.resume(s.t);
  assert(s.goal(Team::Blue) == R::GoalLock);
  Sim p(cfg(EndCondition::Goals, 1));
  p.startPeriod(); p.wait(5000);
  t0 = p.t;
  p.goal(Team::White);
  p.t = t0 + 200; p.e.next(p.t); p.startPeriod();
  p.t = t0 + 500; assert(p.goal(Team::Blue) == R::GoalLock);
}

static void a09_corrections() {
  Sim s(cfg(EndCondition::Time, 5, 5));
  s.startPeriod();
  assert(s.e.minusOne(Team::White, s.t) == R::NoGoalToRemove);
  s.goalLater(Team::White);
  uint32_t before = s.e.periodElapsed(s.t);
  assert(s.e.minusOne(Team::White, s.t) == R::Accepted);
  assert(s.e.score().white == 0 && s.e.periodElapsed(s.t) == before);
  assert(s.e.undo(s.t) == R::Accepted && s.e.score().white == 1);  // restaura el gol
}

static Sim toOvertime() {
  Sim s(cfg(EndCondition::Goals, 2));
  s.startPeriod(); s.goalLater(Team::White); s.goalLater(Team::Blue);
  s.e.next(s.t); s.startPeriod(); s.goalLater(Team::White); s.goalLater(Team::Blue);
  assert(s.e.phase() == Phase::PeriodEnd && s.e.period() == Period::Second);
  s.e.next(s.t);
  assert(s.e.period() == Period::Overtime);
  s.startPeriod();
  return s;
}

static void a10_golden_goal() {
  Sim s = toOvertime();
  assert(s.e.clockMs(s.t) == 60000);
  s.goalLater(Team::Blue);
  assert(s.e.phase() == Phase::Finished && s.e.winner() == Team::Blue && s.e.reason() == Reason::GoldenGoal);
}

static void kicks(Sim& s, const char* seq) {
  for (const char* c = seq; *c; c++) assert(s.e.penalty(s.e.nextKicker(), *c == 'G', s.t) == R::Accepted);
}

static Sim toShootout() {
  Sim s = toOvertime();
  s.wait(60000);
  assert(s.e.phase() == Phase::PeriodEnd);
  s.e.next(s.t);
  assert(s.e.phase() == Phase::Penalties);
  return s;
}

static void a11_a12_a13_penalties() {
  Sim s = toShootout();
  assert(s.e.penalty(Team::Blue, true, s.t) == R::WrongTurn);
  assert(s.goal(Team::White) == R::InvalidState);
  kicks(s, "GFGFGF");  // Blanco 3, Azul 0 con 2 restantes → decidida
  assert(s.e.phase() == Phase::Finished && s.e.winner() == Team::White && s.e.reason() == Reason::Penalties);
  assert(s.e.score().white == 2 && s.e.score().blue == 2);  // el ordinario sigue empatado

  Sim d = toShootout();
  kicks(d, "GGGGGGGGGG");
  assert(d.e.phase() == Phase::Penalties && d.e.suddenDeath());
  kicks(d, "GG");
  assert(d.e.phase() == Phase::Penalties);
  kicks(d, "FG");
  assert(d.e.phase() == Phase::Finished && d.e.winner() == Team::Blue);

  Sim u = toShootout();
  kicks(u, "G");
  assert(u.e.undoPenalty() == R::Accepted && u.e.kickCount() == 0);
}

static void pause_keeps_time() {
  Sim s(cfg(EndCondition::Time, 5, 1));
  s.startPeriod();
  s.wait(10000);
  s.e.pause(s.t);
  s.wait(120000);
  assert(s.e.clockMs(s.t) == 50000);
  s.e.resume(s.t);
  s.wait(49999); assert(s.e.phase() == Phase::Playing);
  s.wait(1); assert(s.e.phase() == Phase::PeriodEnd);
}

static void match_point() {
  Sim s(cfg(EndCondition::Goals, 2));
  s.startPeriod(); s.goalLater(Team::White); s.goalLater(Team::White);
  s.e.next(s.t); s.startPeriod();
  assert(s.e.matchPoint() == 0);
  s.goalLater(Team::Blue);
  assert(s.e.matchPoint() == 1);  // solo Blanco ganaría con el siguiente gol
}

int main() {
  a01_full_match();
  a02_invalid_config();
  a03_a04_goals_and_time();
  a05_both_boundary();
  a06_a07_lock();
  a08_nothing_bypasses_lock();
  a09_corrections();
  a10_golden_goal();
  a11_a12_a13_penalties();
  pause_keeps_time();
  match_point();
  std::puts("mfv3_engine: criterios A01-A13 OK");
  return 0;
}
