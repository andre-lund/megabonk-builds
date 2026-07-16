// Build <-> URL hash codec. Readable format: #c=Ninja&w=Katana|Axe&t=...&i=...
// Unknown names are dropped on decode so stale links degrade gracefully.
import { addToBuild, emptyBuild, setCharacter, setMap, type Build } from "./build";

export interface KnownNames {
  characters: Set<string>;
  weapons: Set<string>;
  tomes: Set<string>;
  items: Set<string>;
  maps: Set<string>;
}

export function encodeBuild(build: Build): string {
  const params: string[] = [];
  const add = (key: string, values: (string | null)[]) => {
    const names = values.filter((v): v is string => v !== null);
    if (names.length) params.push(`${key}=${names.map(encodeURIComponent).join("|")}`);
  };
  add("c", [build.character]);
  add("m", [build.map]);
  add("w", build.weapons);
  add("t", build.tomes);
  add("i", build.items);
  return params.join("&");
}

export function decodeBuild(hash: string, known: KnownNames): Build {
  const params = new Map<string, string[]>();
  for (const part of hash.replace(/^#/, "").split("&")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    params.set(part.slice(0, eq), part.slice(eq + 1).split("|").map(decodeURIComponent));
  }
  let b = emptyBuild();
  const character = params.get("c")?.[0];
  if (character && known.characters.has(character)) b = setCharacter(b, character);
  const map = params.get("m")?.[0];
  if (map && known.maps.has(map)) b = setMap(b, map);
  for (const w of params.get("w") ?? []) if (known.weapons.has(w)) b = addToBuild(b, "weapon", w);
  for (const t of params.get("t") ?? []) if (known.tomes.has(t)) b = addToBuild(b, "tome", t);
  for (const i of params.get("i") ?? []) if (known.items.has(i)) b = addToBuild(b, "item", i);
  return b;
}
