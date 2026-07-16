import { addToBuild, emptyBuild, setCharacter, type Build } from "./build";

export interface CommunityBuild {
  name: string;
  page: string;
  character: string | null;
  author: string | null;
  votes: number;
  created: string | null;
  weapons: string[];
  tomes: string[];
  items: string[];
}

/** Import a community build into the creator; partial builds (e.g. pacifist, no weapons) stay partial. */
export function toBuild(cb: CommunityBuild): Build {
  let b = setCharacter(emptyBuild(), cb.character);
  for (const w of cb.weapons) b = addToBuild(b, "weapon", w);
  for (const t of cb.tomes) b = addToBuild(b, "tome", t);
  for (const i of cb.items) b = addToBuild(b, "item", i);
  return b;
}
