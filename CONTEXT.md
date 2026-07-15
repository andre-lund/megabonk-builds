# megabonk-builds

A build planner for Megabonk: a build creator to assemble weapon/tome/character combos and see how they stack, a heuristic ranking of build strength, slot suggestions for partially-filled builds, and a scraper that surfaces the most popular community builds. Web app (Vite + React + TS) backed by a static game-data dataset.

<!-- CONTEXT.md is the single authoritative glossary for this repo (the
     project-docs standard). One entry per term of art: when a word means
     something specific here, pin it, and list the near-synonyms to avoid so
     humans and agents converge on one name per concept. Add entries as terms
     emerge — an empty glossary is fine on day one. -->

## Language

**Build**:
A character plus a set of weapon and tome slot picks. The unit everything else operates on (scoring, suggestions, scraped imports).
_Avoid_: "loadout", "setup"
