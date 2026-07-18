---
status: active
created: 2026-07-18
updated: 2026-07-18
adrs: []
---

# Plan: Reroll variation for Generate

## Intent

Generate is fully deterministic: the same partial build always completes to the same result, so pressing Generate again does nothing (the build is full) and there is no way to explore alternative high-scoring builds. Deliver reroll semantics — the first press still returns the single highest-scoring completion, and repeat presses on an unmodified result regenerate from the original base into *different* but still high-scoring builds.

## Approach

Two layers. In `src/lib/generate.ts`, `generateBuild` gains an optional `seed` — without it the behavior is bit-identical to today (pure greedy best pick); with it, each greedy step samples among near-best candidates (top 5 per kind, gain within 75% of the step's best, weighted by gain) using a small seeded PRNG (mulberry32), so a given seed is reproducible. In `App.tsx`, the Generate button tracks `{base, result, seen, seed}` in a ref: a press on a build that is not the last result is a fresh deterministic generate from it; a press on the unmodified last result rerolls from the stored base with incrementing seeds, skipping already-seen builds (bounded retry) so consecutive rerolls vary.

## Tasks

- [x] **T1** — Seeded near-best sampling in `generateBuild` + reroll state on the Generate button; tests. **Done:** optional `seed` on `generateBuild` (mulberry32; top-5/kind, gain ≥ 0.75 × best, gain-weighted); Generate button tracks `{base, result, seen, seed}` in a ref with seen-key retry (12 tries); results pass through `enforceStartingWeapon` before storing so the reference check survives the `setBuild` wrapper; 4 new tests; browser-verified 5 presses → 5 distinct builds, reset → first press deterministic again.

## Decision log

- Seed-based API (`seed?: number`) instead of injecting an RNG function — keeps the lib dependency-free and each reroll reproducible/testable by seed; `undefined` preserves the exact deterministic path.
- Per-step candidate pool = top 5 per kind filtered to gain ≥ 0.75 × step best, weighted by gain; when the step's best gain is ≤ 0 only the best is taken. Keeps rerolled builds near the deterministic optimum instead of uniformly random.
- Reroll detection is reference equality (`build === lastResult`): any user edit, reset, or load produces a new object and naturally resets to a fresh deterministic generate.
- Generated builds are passed through `enforceStartingWeapon` *before* being stored in the ref — `setBuild` re-enforces idempotently, so the rendered state keeps the exact stored reference. Without this the wrapper's clone broke the reference check and rerolls never fired (caught in browser verification).
- Sampling often beats the greedy optimum: across seeds 1–10 on a Ninja base, scores ranged 267–357 vs greedy's 287, with 10/10 distinct builds — greedy is myopic, so near-best exploration is not a pure quality trade-off.
