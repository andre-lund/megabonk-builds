---
status: active
created: 2026-07-16
updated: 2026-07-16
adrs: []
---

# Plan: Save-file import for unlocks

## Intent

Hand-toggling 126 locked entities is tedious for an established player. Import the game's own save file (`progression.json`) and auto-mark everything already unlocked in-game.

## Approach

Megabonk saves live at `%appdata%\..\LocalLow\Ved\Megabonk\Saves\CloudDir\<id>\progression.json`, AES-256-CBC encrypted with a fixed key/IV (published in ViniGreen/megabonk_file_save's save editor). Decrypt client-side with Web Crypto — the file never leaves the browser. The decrypted JSON's `purchases` array holds internal PascalCase unlock IDs (mixed with cosmetic skins and shop entries); map to wiki names by normalized comparison plus an explicit alias table for renames (BluetoothDagger→Wireless Dagger, BloodTome→Bloody Tome, Borgor→Borgar, the Glove* family, …). Import merges into the owned set (union with defaults + current) — it never locks anything. Unmapped IDs (skins, shop items) are ignored.

## Tasks

- [x] **T1** — `src/lib/saveimport.ts`: AES decrypt (plain-JSON passthrough for already-decrypted files), purchases→wiki-name mapping with alias table. Verify: tests — encrypt-then-decrypt round trip, real-name mapping incl. aliases, skins ignored. **Done:** Web Crypto AES-256-CBC; 16-entry alias table (BloodTome, BluetoothDagger, Borgor, Glove* family, Pot, Sniper, …); 4 tests (node:crypto round trip, direct/cased/aliased mapping, skins+shop ignored, malformed saves).
- [x] **T2** — Import button on the Unlocks tab (file picker), result summary, merge into owned set. Verify: live — import the reference save, owned count jumps, Unlocks tab shrinks accordingly. **Done:** Import button + save-path hint + never-uploaded note, status line for success/error; live: reference save imported 139 unlocks, Unlocks tab 126→2 rows (the 2 are wiki-only pages absent from the game save — merge-only leftover), 27/27 weapons owned, persists across reload, junk file shows a friendly error.

## Decision log

- Client-side decryption (Web Crypto) — no upload, no backend; key/IV are already public in the community save editor.
- Merge-only semantics — importing can only add unlocks; wiki-side entities the save doesn't know (stale wiki tome pages) stay manual toggles.
