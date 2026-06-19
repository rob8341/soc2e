/**
 * Compiles the human-readable JSON source files under packs/_source/ into the
 * binary LevelDB compendium packs that Foundry actually loads at runtime.
 *
 * Run with: npm run build:packs
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";

const PACKS = [
  { src: "packs/_source/items", dest: "packs/items" },
  { src: "packs/_source/npcs", dest: "packs/npcs" },
];

for (const { src, dest } of PACKS) {
  await compilePack(path.join(ROOT, src), path.join(ROOT, dest), { log: false });
  console.log(`Compiled ${src} -> ${dest}`);
}
