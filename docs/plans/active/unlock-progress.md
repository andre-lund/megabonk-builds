---
status: active
created: 2026-07-16
updated: 2026-07-16
adrs: []
---

# Plan: Unlock progress tracking

## Intent

Follow-on to unlocked-filter: the owned/locked state is binary, but most unlock conditions are grinds ("Kill 2,000 enemies using the Sword"). Add an Unlocks tab where every locked entity shows its unlock condition, a progress counter against the goal parsed from the text, and a one-click mark-owned when done.

## Approach

`src/lib/progress.ts`: `parseGoal` extracts the target number from unlock text (comma-aware, ignores percentages like "5% drop chance"); progress values persisted in localStorage as a name→number map. New "Unlocks" browser tab renders locked entities (all kinds) with icon, unlock text, numeric input + progress bar when a goal exists, and a mark-owned button that flips ownership (and hides the row). Rows sort by completion descending so nearly-done unlocks surface first.

## Tasks

- [x] **T1** — Progress lib: parseGoal (real-data cases incl. comma numbers, Level goals, percent-ignore), load/save/set progress. Verify: unit tests. **Done:** `src/lib/progress.ts`, 3 tests; corrupt-storage fallback; zero-value clears the entry.
- [x] **T2** — Unlocks tab: locked-only rows, progress input + bar, mark-owned, completion sort. Verify: live — set Axe progress, bar fills, mark owned removes it from the tab and it appears unlocked in Weapons. **Done:** Unlocks tab lists all 126 locked entities (fresh state) with icon/kind/unlock text; numeric input + gradient bar + % for parseable goals; rows sort by completion desc; search filters name+unlock text; live-verified Axe 1200/2,000 → 60%, sorted to top, Mark owned moved it to Weapons as owned, progress persisted across reload.

## Decision log

- Goal parsing is heuristic (first non-percent number) — some conditions ("Survive for 2 consecutive minutes") yield odd goals; harmless since the bar is user-driven and mark-owned is always available.
