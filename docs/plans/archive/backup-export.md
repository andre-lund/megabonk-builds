---
status: done
created: 2026-07-16
updated: 2026-07-16
completed: 2026-07-16
adrs: []
commit refs: [434f8e8]
---

# Plan: Export/restore backup of owned unlocks + progress

## Intent

Owned unlocks and progress live only in localStorage — a browser wipe or machine switch loses them. Add a one-click JSON export and restore via the existing Import button.

## Approach

`src/lib/backup.ts`: versioned JSON envelope (`megabonkBuilds: 1`, exported timestamp, sorted owned list, progress map). Export downloads `megabonk-builds-backup.json` via a Blob link. The Unlocks-tab Import button detects backups by the version marker (checked before game-save kinds) and *replaces* owned + progress — restore semantics, unlike the merge-only game-save import. Unknown names and non-positive values are dropped against the current catalog so stale backups degrade gracefully.

## Tasks

- [x] **T1** — Backup lib + Export button + restore path in import. **Done:** 3 tests (round trip, unknown-name/invalid-value dropping, non-backup rejection); live-verified export → localStorage wipe → restore recovered owned Katana and Axe progress 1500.

## Decision log

- Restore replaces rather than merges — a backup is a snapshot; merge semantics stay with the game-save import.
