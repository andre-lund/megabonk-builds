---
status: done
created: 2026-07-16
updated: 2026-07-16
completed: 2026-07-16
adrs: []
commit refs: [4d43891]
---

# Plan: Disable-before-run item recommendations

## Intent

Megabonk lets you inactivate items to keep them out of the run's drop pool (the save file's `inactivated` list). Given the planned build, recommend which items to disable in-game — the ones that fit it worst.

## Approach

`src/lib/bans.ts`: rank candidate items (the owned pool when the unlocked filter is on) by fit ascending — synergy links to picked entities (SYNERGY_POINTS each) plus coverage of archetypes the build still lacks (ARCHETYPE_POINTS each). Unlike suggestFor this ignores slot state, since bans apply to the whole drop pool. Build panel shows the bottom 10 as struck-through red chips once the build has ≥2 picks.

## Tasks

- [x] **T1** — Ban ranking lib + build-panel section. **Done:** 3 tests (zero-fit first + Ice Crystal not early-banned for Noelle's ice kit, build-item exclusion + limit, determinism); live-verified: hidden on empty build, 10 worst-fit chips for Noelle+Damage Tome with Ice Crystal correctly spared, recomputes after Generate.

## Decision log

- Fit metric reuses the score weights (synergy 10 / archetype 8) rather than a second tuning surface.
- Top 10 fixed — the game allows more inactivations, but past ten the fit signal is mostly ties at zero.
