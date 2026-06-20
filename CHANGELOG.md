# Changelog

All notable changes to the Sword of Cepheus 2e Foundry system are documented here.

## 0.9.2 — Unreleased

- Added the **Traits** compendium pack with the full character-generation Trait List from the rulebook.
- Added the **Mutation table** to the Traits compendium as Trait items, each tagged `(Mutation)` in the name.
- Added the **Corrupting Weakness table** to the Traits compendium as Trait items (flagged `corruptingWeakness`, so they slot into the existing Corrupting Weaknesses tab on the character sheet).
- Added the **Tables** compendium pack with three RollTables — Sorcerous Mishaps, Mutations, and Corrupting Weaknesses — using a `(1d6 * 10) + 1d6` formula to reproduce the rulebook's d66 mechanic. The Mutations and Corrupting Weaknesses tables draw directly from the matching Trait items.
- Added a **Personality** notes field to the character sheet's Biography tab, below Notes about Life Events.
- Added a **Sorcery Notes** panel to the Sorcery tab, framed separately from the Corruption panel and sized to fill the remaining tab height.

## 0.9.1

- Fixed the trait icon used on the NPC sheet's spell/trait list.
- Rebuilt the Items and NPCs compendium packs after data model changes to `actor.js`.
- Trimmed outdated installation notes from the README.

## 0.9

- Added the full **Items** compendium: weapons, armor, adventuring gear, food, clothing, potions, animals, the Arcane/Eldritch spell lists, and treasure/magic items, organized into folders.
- Added the full **NPCs** compendium: every Bestiary monster plus the book's named human NPC archetypes, with embedded weapon/armor items attached.
- Added the `build:packs` script (via `@foundryvtt/foundryvtt-cli`) to compile human-readable JSON sources under `packs/_source/` into LevelDB compendium packs.
- Added `package.json` / `package-lock.json` for the build tooling.
- Added the initial README.

## 0.2

- Added a GitHub Actions release workflow to package and publish system releases.

## 0.1.0

- Initial commit: character, NPC, and vehicle actor types and sheets, the Sword of Cepheus 2e data model, and parchment-themed styling.
