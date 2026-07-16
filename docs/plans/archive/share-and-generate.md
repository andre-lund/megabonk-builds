---
status: done
created: 2026-07-16
updated: 2026-07-16
completed: 2026-07-16
adrs: []
commit refs: [c386f41]
---

# Plan: Shareable build URLs + generate best combo

## Intent

Builds are currently trapped in local state. Two additions: (1) every build is encoded in the URL so a link reproduces it exactly (share button copies it), and (2) a Generate button that completes a partial build — for whatever is already picked, fill every open slot (and empty character) with the best choices per the heuristic.

## Approach

URL: human-readable hash (`#c=Ninja&w=Katana|Axe&t=…&i=…`), synced via `history.replaceState` on every build change, decoded+validated (unknown names dropped) on mount. No backend — the URL is the storage.

Generate: greedy completion in `src/lib/generate.ts` — repeatedly take the single highest-gain suggestion across all kinds (reusing `suggestFor`) until no open slot remains. Deterministic (gain, then name tiebreak).

## Tasks

- [x] **T1** — Build⇄URL codec (`src/lib/share.ts`): encode/decode with validation against datasets; hash sync on change + restore on load; Share button copies the link. Verify: round-trip test; live — open a copied URL in a fresh page and the build reappears. **Done:** readable hash (`#c=…&w=a|b&t=…&i=…`), replaceState sync, unknown names dropped on decode; Share button with Copied! feedback; 4 tests; live round-trip restored a 15-slot build exactly.
- [x] **T2** — Greedy generate (`src/lib/generate.ts` + button): completes any partial build to full 15 slots + character, never touches existing picks, deterministic. Verify: tests (keeps picks, fills all, meta half-build completes to ≥ its plain score); live — pick 2 slots, press Generate, build fills. **Done:** greedy max-marginal-gain loop over suggestFor across kinds incl. empty character; 4 tests; live Noelle+Axe → full S/367 build keeping both picks.

## Decision log

- Readable hash over base64 blob — shareable links that humans can eyeball beat compactness at these sizes.
- Greedy (not exhaustive search) — 15-slot exhaustive is combinatorial; greedy over marginal gain is deterministic, instant, and matches how the suggestions already rank.
