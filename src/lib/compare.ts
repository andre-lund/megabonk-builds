// Side-by-side comparison support: pick diffs and share-link parsing.
import { pickedNames, type Build } from "./build";
import { decodeBuild, type KnownNames } from "./share";

export interface BuildDiff {
  shared: Set<string>;
  onlyA: Set<string>;
  onlyB: Set<string>;
}

export function diffBuilds(a: Build, b: Build): BuildDiff {
  const pa = pickedNames(a);
  const pb = pickedNames(b);
  return {
    shared: new Set([...pa].filter((n) => pb.has(n))),
    onlyA: new Set([...pa].filter((n) => !pb.has(n))),
    onlyB: new Set([...pb].filter((n) => !pa.has(n))),
  };
}

/** Parse a pasted share link (full URL or raw hash) into a Build; null when it contains nothing valid. */
export function parseSharedLink(input: string, known: KnownNames): Build | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hashIndex = trimmed.indexOf("#");
  const hash = hashIndex !== -1 ? trimmed.slice(hashIndex + 1) : trimmed;
  const build = decodeBuild(hash, known);
  return pickedNames(build).size > 0 || build.map ? build : null;
}
