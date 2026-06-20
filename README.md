# The Sword of Cepheus 2e — Foundry VTT System

**Version 0.9.2**

A Foundry VTT game system for **The Sword of Cepheus 2nd Edition**, a 2d6 fantasy RPG based on Traveller mechanics.

## Installation

### Via Manifest URL (ForgeVTT / Foundry)

In Foundry VTT, go to **Game Systems → Install System** and paste the manifest URL:

```
https://raw.githubusercontent.com/rob8341/soc2e/main/system.json
```

### Manual

Download the latest release zip from the [Releases](https://github.com/rob8341/soc2e/releases) page and extract it into your Foundry `Data/systems/` directory.

## Compendium Content

The system ships four built-in compendium packs, generated from *The Sword of Cepheus 2nd Edition* rulebook:

- **Sword of Cepheus - Items** — weapons, armor, adventuring gear, food, clothing, potions, animals, the full Arcane/Eldritch spell lists, and treasure/magic items, organized into folders.
- **Sword of Cepheus - NPCs** — every Bestiary monster plus the book's named human NPC archetypes (Bandit, Knight, Sorcerer, etc.), each with embedded weapon/armor items already attached.
- **Sword of Cepheus - Traits** — the full character-generation Trait List, plus the Mutation table (each entry tagged `(Mutation)`) and the Corrupting Weakness table, all as drag-and-drop Trait items.
- **Sword of Cepheus - Tables** — three RollTables (Sorcerous Mishaps, Mutations, Corrupting Weaknesses) using a `(1d6 * 10) + 1d6` formula to reproduce the rulebook's d66 mechanic. The Mutations and Corrupting Weaknesses tables draw directly from the matching Trait items.

These load automatically with the system — no manual import step needed.

## TODO

- **Vehicles** — the `vehicle` actor type and sheet exist, but the Items compendium does not yet include vehicle entries from the Equipment chapter (pp.167-170). Vehicles still need to be added as compendium content.

## Compatibility

| Foundry Version | Status |
|---|---|
| v13 | Minimum |
| v14 | Verified |

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
