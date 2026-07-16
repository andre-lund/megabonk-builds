---
status: done
created: 2026-07-16
updated: 2026-07-16
completed: 2026-07-16
adrs: []
commit refs: [1bea582]
---

# Plan: stats.json import for unlock progress

## Intent

Follow-on to save-import: progression.json fills the owned set, but grind progress toward locked entities lives in stats.json (176 global counters, incl. per-weapon kills). Import it to auto-fill the Unlocks tab's progress bars.

## Approach

Same decrypt path (AES-256-CBC, Web Crypto, client-side only). `saveKind` detects file type by content (`purchases` vs `stats`), so one multi-select Import button handles both files in any combination. `STAT_SOURCES` maps unlock conditions to stat counters for the 15 confidently-attributable grinds (swordKills→Axe/Dexecutioner, icecubeFreezes→Frostwalker, goblinKills→Ogre, challengesCompleted→Anvil/Spaceman/Tony McZoom, …). Progress merges with max() so imports never lower manual entries. Tome-level unlocks ("Get X Tome to Level N") have no global counter — those stay manual.

## Tasks

- [x] **T1** — `saveKind` + `mapStats` + multi-file import UI. **Done:** 2 new tests (kind detection, stat mapping incl. zero-skip); live-verified stats-only import fills 15 goals (Axe 26,436/2,000 → 100%, sorted to top), both-files import reports combined summary, 126→2 locked rows.

## Decision log

- Only confident condition→counter mappings shipped; ambiguous ones (e.g. Slutty Rocket's "kill 15,000 as CL4NK" — no per-character kill counter) stay manual rather than showing wrong progress.
