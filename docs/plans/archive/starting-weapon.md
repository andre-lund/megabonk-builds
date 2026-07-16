---
status: done
created: 2026-07-16
updated: 2026-07-16
completed: 2026-07-16
adrs: []
commit refs: [PENDING]
---

# Plan: Character starting weapon pinned in slot 0

## Intent

Mirror the game: a selected character always carries their default weapon. Selecting a character auto-fills weapon slot 0 with their starting weapon and locks it there — it cannot be removed while the character is selected.

## Approach

`src/lib/starting.ts`: `enforceStartingWeapon` normalizes any build (fills/swaps slot 0, pushes a displaced weapon to an open slot, drops it when full); applied inside the App's `setBuild` wrapper so every mutation path — clicks, URL decode, community import, Generate — obeys the rule. `isStartingSlot` drives the pinned rendering (gold border + star, click disabled, explanatory tooltip). Clearing or switching the character clears the previously pinned slot first.

## Tasks

- [x] **T1** — Enforcement lib + pinned slot UI + clear/switch semantics. **Done:** 5 tests (fill, swap, displace/drop, Robinette's dataset-less Bow, unpin on clear); live-verified pick/click-locked/switch/clear/Generate/community-import all behave.

## Decision log

- Enforcement wraps setBuild rather than patching each call site — one choke point, impossible to bypass from future features.
- Robinette's Bow (and any weapon missing from the wiki category) still pins by name; it just lacks an icon/inspect data.
