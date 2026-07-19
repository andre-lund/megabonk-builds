---
status: accepted
---

# 0001 — Adopt leaderboard.gg empirical run data as a second, distinct data source

**Implemented by:** [docs/plans/archive/leaderboard-meta.md](../plans/archive/leaderboard-meta.md), commit fb0d372 (T1–T6)

The app ingests aggregate run statistics from `megabonk.leaderboard.gg` into `src/data/leaderboard.json` as a **second data source, kept distinct from the wiki data**. It supplies an *empirical meta* signal — how often each weapon/tome/item actually appears in video-verified top runs per character — that augments, but never replaces, the wiki-derived synergy/archetype model. Wiki data stays authoritative for what things are and what they editorially synergize with; leaderboard data is authoritative only for observed usage.

## Context

Every score, suggestion, and ban in this app derives from wiki data: editorial `Synergies` links (`synergy.ts`) and archetype text-classification (`score.ts`). That captures *intended* synergy, not what strong players actually run. `megabonk.leaderboard.gg` publishes, for all 21 characters on the current patch, per-item usage counts over 638 video-verified top runs plus the loadout combinations those runs used. It has no public API, but every page server-renders the complete dataset inline as a Nuxt `__NUXT_DATA__` payload (devalue-encoded), retrievable with one authenticated-UA GET and reconcilable to our names with a small alias table. This is a new external dependency and a new class of signal (observed vs. editorial), so it warrants a recorded decision.

## Decision

- **Separate source, separate file.** Leaderboard data lands in `src/data/leaderboard.json` via `scripts/ingest-leaderboard.mjs` (`npm run ingest:leaderboard`), never merged into the wiki `*.json`. It is reconciled to our canonical names at ingest time; unmatched ids are recorded, not dropped silently.
- **Empirical signal is additive and distinct, never a replacement.** It enters scoring as its own `metaBonus` component and its own ban term — separately weighted and inspectable — so the wiki synergy graph and its display keep their existing meaning. Empirical co-occurrence is *not* folded into the wiki synergy adjacency.
- **Patch-scoped and honest about noise.** The payload is patch-versioned (`version` field); ingestion records it. Per-character usage is shrunk toward the global prior by sample size (low-n characters are noisy); co-occurrence is expressed as lift over chance with a support floor, because raw co-occurrence just re-surfaces universally-popular staples.

## Consequences

- Scoring, suggestions, and bans gain a grounded "what top runs actually do" signal, character-conditioned where a character is selected.
- New maintenance surface: the ingest depends on leaderboard.gg's Nuxt payload shape and must be re-run per patch; a shape change breaks ingestion loudly (decode/reconcile), not the app (which reads the committed JSON).
- Attribution obligation to leaderboard.gg as a data source.
- The signal reaches score, suggestions, bans, and Generate (which optimizes via the same `suggestFor`), so all four stay consistent with the displayed metric.
- Deferred: `starting.ts` starter derivation and any full per-run loadout browsing UI.
