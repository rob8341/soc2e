/**
 * Sword of Cepheus 2e — Data Model & Actor class
 * Uses TypeDataModel (v13+) for schema and derived data.
 */

/* -------------------------------------------- */
/*  Attribute DM Formula                         */
/* -------------------------------------------- */

/**
 * Compute Traveller-style DM from an attribute score.
 * Score  0   → DM −3
 * Score  1–2 → DM −2
 * Score  3–5 → DM −1
 * Score  6–8 → DM  0
 * Score 9–11 → DM +1
 * Score12–14 → DM +2
 * Score 15+  → DM +3
 */
export function soc2eAttributeDM(score) {
  if (score <= 0)  return -3;
  if (score <= 2)  return -2;
  if (score <= 5)  return -1;
  if (score <= 8)  return  0;
  if (score <= 11) return  1;
  if (score <= 14) return  2;
  return 3;
}

/* -------------------------------------------- */
/*  TypeDataModel — Character                    */
/* -------------------------------------------- */

export class Soc2eCharacterModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    const attrField = (initial = 7) => new fields.SchemaField({
      value: new fields.NumberField({ required: true, integer: true, initial, min: 0, max: 20 }),
    });

    const meleeRow = () => new fields.SchemaField({
      weapon:  new fields.StringField({ initial: "" }),
      damage:  new fields.StringField({ initial: "" }),
      aspects: new fields.StringField({ initial: "" }),
    });

    const rangedRow = () => new fields.SchemaField({
      weapon:  new fields.StringField({ initial: "" }),
      range:   new fields.StringField({ initial: "" }),
      damage:  new fields.StringField({ initial: "" }),
      ammo:    new fields.StringField({ initial: "" }),
      aspects: new fields.StringField({ initial: "" }),
    });

    const skillField = () => new fields.NumberField({ required: true, integer: true, initial: -3, min: -3, max: 5 });

    return {
      attributes: new fields.SchemaField({
        str: attrField(7),
        dex: attrField(7),
        end: attrField(7),
        int: attrField(7),
        edu: attrField(7),
        soc: attrField(7),
      }),
      lifeblood: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 14, min: 0 }),
        max:   new fields.NumberField({ required: true, integer: true, initial: 14, min: 0 }),
      }),
      stamina: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 7, min: 0 }),
        max:   new fields.NumberField({ required: true, integer: true, initial: 7, min: 0 }),
      }),
      armor:      new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      heroPoints: new fields.NumberField({ required: true, integer: true, initial: 2, min: 0, max: 5 }),
      wounds: new fields.SchemaField({
        minorWound:   new fields.BooleanField({ initial: false }),
        seriousWound: new fields.BooleanField({ initial: false }),
        mortalWound:  new fields.BooleanField({ initial: false }),
      }),
      xp:         new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      fatigue:    new fields.BooleanField({ initial: false }),
      channeling: new fields.BooleanField({ initial: false }),
      corruption: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      background: new fields.StringField({ initial: "" }),
      languages:  new fields.StringField({ initial: "" }),
      career:     new fields.StringField({ initial: "" }),
      rank:       new fields.StringField({ initial: "" }),
      lifeEventNotes: new fields.StringField({ initial: "" }),
      termRecords: new fields.ArrayField(new fields.SchemaField({
        age:      new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        skills:   new fields.StringField({ initial: "" }),
        benefits: new fields.StringField({ initial: "" }),
        events:   new fields.StringField({ initial: "" }),
      }), { initial: [] }),
      meleeAttacks: new fields.ArrayField(meleeRow(), {
        initial: () => Array.from({ length: 5 }, () => ({})),
      }),
      rangedAttacks: new fields.ArrayField(rangedRow(), {
        initial: () => Array.from({ length: 5 }, () => ({})),
      }),
      spellsTraits: new fields.StringField({ initial: "" }),
      coins: new fields.SchemaField({
        gold:   new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        silver: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        copper: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      }),
      living: new fields.SchemaField({
        quality:     new fields.StringField({ initial: "" }),
        monthlyCost: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        dailyCost:   new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      }),
      backpackMax: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      skills: new fields.SchemaField({
        alchemy:           skillField(),
        animals:           skillField(),
        artifice:          skillField(),
        artillery:         skillField(),
        art:               skillField(),
        athletics:         skillField(),
        archery:           skillField(),
        battle:            skillField(),
        carousing:         skillField(),
        craft:             skillField(),
        deception:         skillField(),
        govern:            skillField(),
        insight:           skillField(),
        jackoftrades:      skillField(),
        leadership:        skillField(),
        liaison:           skillField(),
        healing:           skillField(),
        meleecombat:       skillField(),
        naturalphilosophy: skillField(),
        scout:             skillField(),
        sorcery:           skillField(),
        sneak:             skillField(),
        steward:           skillField(),
        streetwise:        skillField(),
        survival:          skillField(),
        religion:          skillField(),
        riding:            skillField(),
        watercraft:        skillField(),
      }),
    };
  }

  /** @override */
  prepareDerivedData() {
    // Add computed DM to each attribute (not stored — derived each render)
    for (const [key, attr] of Object.entries(this.attributes)) {
      attr.dm = soc2eAttributeDM(attr.value);
    }
    // Stamina max  = END + Athletics
    // Lifeblood max = 2 × (END + Athletics)
    const end      = this.attributes.end.value;
    const athletics = Math.max(0, this.skills.athletics ?? 0);
    this.stamina.max   = end + athletics;
    this.lifeblood.max = 2 * (end + athletics);

    // Wounds are derived from lifeblood — not stored, not player-editable.
    // mortal:  lifeblood = 0
    // serious: lifeblood < 50% of max
    // minor:   lifeblood < max
    const lb = this.lifeblood;
    const mortal  = lb.value === 0;
    const serious = !mortal && lb.max > 0 && lb.value < lb.max * 0.5;
    const minor   = !mortal && !serious && lb.value < lb.max;
    this.wounds.mortalWound  = mortal;
    this.wounds.seriousWound = serious;
    this.wounds.minorWound   = minor;
  }
}

/* -------------------------------------------- */
/*  TypeDataModel — NPC                          */
/* -------------------------------------------- */

export class Soc2eNpcModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const attrField = (initial = 7) => new fields.SchemaField({
      value: new fields.NumberField({ required: true, integer: true, initial, min: 0, max: 20 }),
    });
    const skillField = () => new fields.NumberField({ required: true, integer: true, initial: -3, min: -3, max: 5 });

    return {
      attributes: new fields.SchemaField({
        str: attrField(7), dex: attrField(7), end: attrField(7),
        int: attrField(7), edu: attrField(7), soc: attrField(7),
      }),
      lifeblood: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 14, min: 0 }),
        max:   new fields.NumberField({ required: true, integer: true, initial: 14, min: 0 }),
      }),
      stamina: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 7, min: 0 }),
        max:   new fields.NumberField({ required: true, integer: true, initial: 7, min: 0 }),
      }),
      wounds: new fields.SchemaField({
        minorWound:  new fields.BooleanField({ initial: false }),
        seriousWound: new fields.BooleanField({ initial: false }),
        mortalWound:  new fields.BooleanField({ initial: false }),
      }),
      spellcaster: new fields.BooleanField({ initial: false }),
      monster:     new fields.BooleanField({ initial: false }),
      notes: new fields.StringField({ initial: "" }),
      skills: new fields.SchemaField({
        alchemy:           skillField(), animals:           skillField(),
        artifice:          skillField(), artillery:         skillField(),
        art:               skillField(), athletics:         skillField(),
        archery:           skillField(), battle:            skillField(),
        carousing:         skillField(), craft:             skillField(),
        deception:         skillField(), govern:            skillField(),
        insight:           skillField(), jackoftrades:      skillField(),
        leadership:        skillField(), liaison:           skillField(),
        healing:           skillField(), meleecombat:       skillField(),
        naturalphilosophy: skillField(), scout:             skillField(),
        sorcery:           skillField(), sneak:             skillField(),
        steward:           skillField(), streetwise:        skillField(),
        survival:          skillField(), religion:          skillField(),
        riding:            skillField(), watercraft:        skillField(),
      }),
    };
  }

  /** @override */
  prepareDerivedData() {
    for (const [key, attr] of Object.entries(this.attributes)) {
      attr.dm = soc2eAttributeDM(attr.value);
    }
    const end       = this.attributes.end.value;
    const athletics = Math.max(0, this.skills.athletics ?? 0);
    this.stamina.max   = end + athletics;
    this.lifeblood.max = 2 * (end + athletics);

    // Wounds derived from lifeblood (same as character)
    const lb = this.lifeblood;
    const mortal  = lb.value === 0;
    const serious = !mortal && lb.max > 0 && lb.value < lb.max * 0.5;
    const minor   = !mortal && !serious && lb.value < lb.max;
    this.wounds.mortalWound  = mortal;
    this.wounds.seriousWound = serious;
    this.wounds.minorWound   = minor;
  }
}

/* -------------------------------------------- */
/*  TypeDataModel — Vehicle                      */
/* -------------------------------------------- */

export class Soc2eVehicleActorModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      agility:           new fields.NumberField({ required: true, integer: true, initial: 0 }),
      speed:             new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      lightDmgThreshold: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      critDmgThreshold:  new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      weaponCount:       new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      weapons:           new fields.StringField({ initial: "" }),
      crew:              new fields.StringField({ initial: "" }),
      cargo:             new fields.StringField({ initial: "" }),
      cost:              new fields.StringField({ initial: "" }),
      notes:             new fields.StringField({ initial: "" }),
      description:       new fields.StringField({ initial: "" }),
      crewMembers: new fields.ArrayField(new fields.StringField(), { initial: [] }),
    };
  }
}

/* -------------------------------------------- */
/*  Actor Document Class                         */
/* -------------------------------------------- */

export class Soc2eActor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
    if (this.type === "character" || this.type === "npc") {
      // Armor is derived from equipped non-shield armor items — not stored manually.
      this.system.armor = this.items
        .filter(i => i.type === "armor" && i.system.equipped && !i.system.shield)
        .reduce((sum, i) => sum + (i.system.protection ?? 0), 0);
    }
  }

  /** @override — sync wound status effects after any actor update. */
  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);
    if (this.type !== "character" && this.type !== "npc") return;
    if (game.user.id !== userId) return; // only the acting client syncs
    await this._syncWoundEffects();
  }

  /**
   * Apply/remove the three wound status effects to match the current derived
   * wound state. Uses _woundSync flag so the guard hooks allow these writes.
   * Safe to call multiple times; skips no-ops.
   */
  async _syncWoundEffects() {
    const w = this.system.wounds;
    const targets = {
      "soc2e-minor-wound":   w.minorWound,
      "soc2e-serious-wound": w.seriousWound,
      "soc2e-mortal-wound":  w.mortalWound,
    };
    for (const [id, shouldBeActive] of Object.entries(targets)) {
      const existing = this.effects.find(e => e.statuses.has(id));
      if (shouldBeActive && !existing) {
        const effectData = await ActiveEffect.fromStatusEffect(id);
        await this.createEmbeddedDocuments("ActiveEffect", [effectData.toObject()], { _woundSync: true });
      } else if (!shouldBeActive && existing) {
        await existing.delete({ _woundSync: true });
      }
    }
  }

  /**
   * Roll a 2d6 attribute check.
   * @param {string} attrKey  e.g. "str"
   */
  async rollAttribute(attrKey) {
    const attr = this.system.attributes[attrKey];
    if (!attr) return;
    const dm = attr.dm ?? 0;
    const label = _actorAttrFullLabel(this, attrKey);
    await _rollSoc2e(this, label, dm);
  }

  /**
   * Roll a 2d6 skill check.
   * @param {string} skillKey        e.g. "meleecombat"
   * @param {string} [defaultStatKey] Characteristic pre-selected when no prior memory exists (e.g. "str")
   */
  async rollSkill(skillKey, { defaultStatKey = "none" } = {}) {
    const skillVal = this.system.skills[skillKey] ?? 0;
    const label = game.i18n.localize(`SOC2E.Skill.${skillKey}`);
    await _rollSoc2e(this, label, skillVal, skillKey, defaultStatKey);
  }

  /** Roll the Sorcery skill check with sorcery-specific modifiers and critical rules. */
  async rollSorcery() {
    await _rollSorcery(this);
  }

  /** Cast a specific spell — same as rollSorcery but labels the roll with the spell. */
  async castSpell(item) {
    await _rollSorcery(this, item);
  }

  /**
   * Roll initiative for this actor: 2d6 + Battle skill + INT DM + optional bonus.
   * Shows a dialog with breakdown preview; posts result to chat.
   * @returns {number|null} The initiative total, or null if cancelled.
   */
  async rollInitiative() {
    const battle  = this.system.skills?.battle ?? -3;
    const intDm   = this.system.attributes?.int?.dm ?? 0;

    const fixedMod = battle + intDm;
    const content = `
      <div style="margin-bottom:10px;">
        <table style="width:100%;border-collapse:collapse;font-size:0.95em;">
          <tr><td>2d6</td><td style="text-align:right;">—</td></tr>
          <tr><td>Battle skill</td><td style="text-align:right;"><b>${_dmStr(battle)}</b></td></tr>
          <tr><td>INT modifier</td><td style="text-align:right;"><b>${_dmStr(intDm)}</b></td></tr>
          <tr style="border-top:1px solid #aaa;">
            <td><i>Total DM</i></td>
            <td style="text-align:right;"><b>${_dmStr(fixedMod)}</b></td>
          </tr>
        </table>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <label style="white-space:nowrap;">Bonus:</label>
        <input type="number" name="bonus" value="0" style="width:60px;text-align:center;"/>
      </div>`;

    let bonus;
    try {
      const result = await foundry.applications.api.DialogV2.wait({
        window: { title: `Initiative: ${this.name}` },
        content,
        rejectClose: false,
        buttons: [
          {
            action: "roll",
            label: "Roll Initiative",
            default: true,
            callback: (_event, button) => parseInt(button.form.elements["bonus"]?.value ?? 0) || 0,
          },
        ],
      });
      if (result === null || result === undefined) return null;
      bonus = result;
    } catch {
      return null;
    }

    const totalMod = battle + intDm + bonus;
    const roll     = await new Roll("2d6 + @mod", { mod: totalMod }).evaluate();

    const parts = [`Battle ${_dmStr(battle)}`, `INT ${_dmStr(intDm)}`];
    if (bonus) parts.push(`bonus ${_dmStr(bonus)}`);

    const flavor = `<div style="font-size:1.05em;line-height:1.7;">
      <b>Initiative</b> &bull; DM ${_dmStr(totalMod)} (${parts.join(", ")})
      <div style="display:flex;align-items:baseline;justify-content:space-between;">
        <div>Result: <b>${roll.total}</b></div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="soc2e-keep-original-slot"></div>
          <div class="soc2e-reroll-btn"><button type="button" class="soc2e-reroll"
              data-actor-uuid="${this.uuid}"
              data-formula="2d6 + @mod"
              data-mod="${totalMod}"
              data-tn="-1"
              data-initiative-reroll="true"
              data-label="Initiative">Reroll</button></div>
        </div>
      </div>
      <div class="soc2e-reroll-section"></div>
    </div>`;

    const speaker = _makeSpeaker(this);
    await roll.toMessage({ speaker, flavor, rollMode: game.settings.get("core", "rollMode") });

    return roll.total;
  }

  /**
   * Roll an attack with a weapon item, then roll damage on success.
   * @param {Item} item  A weapon-type item owned by this actor.
   */
  async rollWeapon(item) {
    const sys = item.system;

    // Ranged weapons (including thrown and artillery) require ammo
    let currentAmmo = null;
    let ammoDisplay = null;
    if (sys.ranged) {
      currentAmmo = sys.ammo ?? 0;
      if (currentAmmo <= 0) {
        const ammoName = sys.ammoType?.trim() || "Ammo";
        ui.notifications.error(`${ammoName} ran out!`);
        return;
      }
      const ammoType = sys.ammoType?.trim() || "";
      ammoDisplay = ammoType ? `${currentAmmo} ${ammoType}` : `${currentAmmo}`;
    }

    const { skillKey, defaultStatKey, addStrDm } = _weaponRollParams(sys);
    const weaponOpts = sys.damage ? { damage: sys.damage, addStrDm, weaponName: item.name, weaponImg: item.img, ammoDisplay } : null;
    const skillVal = this.system.skills[skillKey] ?? 0;
    const label = game.i18n.localize(`SOC2E.Skill.${skillKey}`);
    const rolled = await _rollSoc2e(this, label, skillVal, skillKey, defaultStatKey, weaponOpts, `__weapon_${skillKey}`);

    // Only spend ammo if the roll actually happened
    if (rolled && sys.ranged) {
      await item.update({ "system.ammo": currentAmmo - 1 });
    }
  }
}

/* -------------------------------------------- */
/*  Internal Roll Helper                         */
/* -------------------------------------------- */

export const DIFFICULTIES = [
  { label: "Easy",       tn: 6  },
  { label: "Average",    tn: 8  },
  { label: "Difficult",  tn: 10 },
  { label: "Formidable", tn: 12 },
  { label: "Impossible", tn: 14 },
];

const ATTR_LABELS         = { str: "STR", dex: "DEX", end: "END", int: "INT", edu: "EDU", soc: "SOC" };
const ATTR_LABELS_FERAL   = { str: "STR", dex: "DEX", end: "END", int: "INT", edu: "INS", soc: "PAC" };

function _isFeral(actor) {
  return actor.system.monster === true;
}

/** Return short attribute labels appropriate for this actor. */
function _actorAttrLabels(actor) {
  return _isFeral(actor) ? ATTR_LABELS_FERAL : ATTR_LABELS;
}

/** Return the full display name for one attribute on this actor. */
function _actorAttrFullLabel(actor, key) {
  if (_isFeral(actor)) {
    if (key === "edu") return "Instinct";
    if (key === "soc") return "Pack";
  }
  return game.i18n.localize(`SOC2E.Attr.${key}`);
}

// Persists dialog choices between skill rolls (in-memory, per skill key)
const _skillMemory = {};

export function _dmStr(n) { return `${n >= 0 ? "+" : ""}${n}`; }

/**
 * Derive skill, default characteristic, and STR-damage flag from a weapon's system data.
 * Priority: artillery > thrown > ranged > melee.
 */
function _weaponRollParams(sys) {
  if (sys.artillery) return { skillKey: "artillery",   defaultStatKey: "int", addStrDm: false };
  if (sys.thrown)    return { skillKey: "athletics",   defaultStatKey: "dex", addStrDm: true  };
  if (sys.ranged)    return { skillKey: "archery",     defaultStatKey: "dex", addStrDm: false };
  return                    { skillKey: "meleecombat", defaultStatKey: "str", addStrDm: true  };
}

/** Build a ChatMessage speaker, appending a type tag to the alias for NPC actors. */
function _makeSpeaker(actor) {
  const speaker = ChatMessage.getSpeaker({ actor });
  if (actor.type === "npc") speaker.alias = `${speaker.alias} (NPC)`;
  return speaker;
}

/**
 * @param {Actor}        actor
 * @param {string}       label      — display name for the roll
 * @param {number}       baseMod    — skill level or attribute DM
 * @param {string|null}  skillKey   — if set, shows stat picker and remembers choices
 * @param {string}       defaultStatKey — pre-selected stat when no memory exists
 * @param {{damage:string, addStrDm:boolean}|null} weaponOpts — if set, rolls damage on success
 */
async function _rollSoc2e(actor, label, baseMod, skillKey = null, defaultStatKey = "none", weaponOpts = null, memoryKey = null) {
  const effectiveMemKey = memoryKey ?? skillKey;
  const mem = effectiveMemKey ? (_skillMemory[effectiveMemKey] ?? { tn: 8, statKey: defaultStatKey }) : { tn: 8, statKey: null };

  // Wound penalty — computed early so it can be shown in the dialog
  const wounds  = skillKey ? (actor.system.wounds ?? {}) : {};
  const woundDm = wounds.seriousWound ? -2 : wounds.minorWound ? -1 : 0;

  // Fatigue penalty (skill rolls only)
  const fatigueDm = (skillKey && actor.system.fatigue) ? -1 : 0;

  // Armor sneak modifier (sneak rolls only)
  const armorSneakMod = (skillKey === "sneak" && actor.items)
    ? actor.items
        .filter(i => i.type === "armor" && i.system.equipped)
        .reduce((sum, i) => sum + (i.system.sneakModifier ?? 0), 0)
    : 0;

  // Difficulty radios
  const diffRadios = DIFFICULTIES.map(d => `
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;">
      <input type="radio" name="difficulty" value="${d.tn}" ${mem.tn === d.tn ? "checked" : ""}/>
      ${d.label} (${d.tn}+)
    </label>`).join("");

  // Stat radios (skill rolls only)
  let statSection = "";
  if (skillKey !== null) {
    const attrs = actor.system.attributes;
    const noneRadio = `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;">
      <input type="radio" name="stat" value="none" ${mem.statKey === "none" ? "checked" : ""}/>None
    </label>`;
    const attrRadios = Object.entries(_actorAttrLabels(actor)).map(([k, lbl]) => {
      const dm = attrs[k]?.dm ?? 0;
      return `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;">
        <input type="radio" name="stat" value="${k}" ${mem.statKey === k ? "checked" : ""}/>
        ${lbl} (${_dmStr(dm)})
      </label>`;
    }).join("");
    statSection = `
      <div style="margin-top:10px;">
        <div style="font-weight:bold;margin-bottom:4px;">Characteristic DM:</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px 14px;">${noneRadio}${attrRadios}</div>
      </div>`;
  }

  const woundNote = woundDm
    ? ` <span style="color:#c00;font-weight:bold;">(wound ${_dmStr(woundDm)})</span>`
    : "";

  const fatigueNote = fatigueDm
    ? ` <span style="color:#7c3fa0;font-weight:bold;">(fatigue ${_dmStr(fatigueDm)})</span>`
    : "";

  const sneakNote = armorSneakMod !== 0
    ? ` <span style="color:orange;font-weight:bold;">(Armor ${_dmStr(armorSneakMod)})</span>`
    : "";

  const weaponDialogHeader = (weaponOpts?.weaponImg && weaponOpts?.weaponName)
    ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
         <img src="${weaponOpts.weaponImg}" alt="${weaponOpts.weaponName}" style="width:32px;height:32px;object-fit:contain;border:none;"/>
         <span style="font-size:1.1em;"><b>${weaponOpts.weaponName}</b>${weaponOpts.ammoDisplay !== null ? ` <span style="font-size:0.85em;color:#666;">(${weaponOpts.ammoDisplay} remaining)</span>` : ""}</span>
       </div>`
    : "";

  const content = `
    ${weaponDialogHeader}<div style="margin-bottom:8px;"><b>${label}</b> &nbsp;(${skillKey ? "skill" : "attribute"} DM: ${_dmStr(baseMod)})${woundNote}${fatigueNote}${sneakNote}</div>
    <div>
      <div style="font-weight:bold;margin-bottom:4px;">Difficulty:</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px 14px;">${diffRadios}</div>
    </div>
    ${statSection}
    <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
      <label style="white-space:nowrap;">Situational DM:</label>
      <input type="number" name="extra-dm" value="0" style="width:60px;text-align:center;"/>
    </div>`;

  const readForm = (button) => {
    const f = button.form.elements;
    return {
      tn:        parseInt(f["difficulty"]?.value ?? 8),
      statKey:   f["stat"]?.value ?? "none",
      extraDm:   parseInt(f["extra-dm"]?.value ?? 0) || 0,
    };
  };

  let dialogResult;
  try {
    dialogResult = await foundry.applications.api.DialogV2.wait({
      window: { title: weaponOpts?.weaponName ? "Attack Roll" : `Roll: ${label}` },
      content,
      rejectClose: false,
      buttons: [
        {
          action: "normal",
          label: "Roll 2d6",
          default: true,
          callback: (_event, button) => ({ ...readForm(button), advantage: false }),
        },
        {
          action: "advantage",
          label: "Advantage (3d6)",
          callback: (_event, button) => ({ ...readForm(button), advantage: true }),
        },
      ],
    });
  } catch {
    return false; // Dialog cancelled via exception
  }
  if (dialogResult === null || dialogResult === undefined) return false; // Closed with X

  const { tn, statKey, extraDm, advantage } = dialogResult;

  // Persist skill choices
  if (effectiveMemKey !== null) _skillMemory[effectiveMemKey] = { tn, statKey };

  // Stat DM (null = attribute roll, "none" = skill roll with no stat, key = skill+stat roll)
  const statDm   = (statKey && statKey !== "none") ? (actor.system.attributes[statKey]?.dm ?? 0) : 0;
  const statLbl  = (statKey && statKey !== "none") ? _actorAttrLabels(actor)[statKey] : null;

  const totalMod  = baseMod + statDm + extraDm + woundDm + fatigueDm + (armorSneakMod !== 0 ? armorSneakMod : 0);
  const formula   = advantage ? "3d6kh2 + @mod" : "2d6 + @mod";
  const roll      = await new Roll(formula, { mod: totalMod }).evaluate();
  const naturalTotal = roll.dice[0].total; // sum of kept dice, before modifier
  const effect    = roll.total - tn;
  // Natural 2 is always failure; natural 12 is always success
  const success   = naturalTotal === 12 ? true : naturalTotal === 2 ? false : effect >= 0;

  // DM breakdown
  const dmParts = [`${skillKey ? "skill" : "attr"} ${_dmStr(baseMod)}`];
  if (statLbl)    dmParts.push(`${statLbl} ${_dmStr(statDm)}`);
  if (woundDm)       dmParts.push(`<span style="color:#c00;">wound ${_dmStr(woundDm)}</span>`);
  if (fatigueDm)     dmParts.push(`<span style="color:#7c3fa0;">fatigue ${_dmStr(fatigueDm)}</span>`);
  if (armorSneakMod !== 0) dmParts.push(`<span style="color:orange;">Armor ${_dmStr(armorSneakMod)}</span>`);
  if (extraDm)       dmParts.push(`situational ${_dmStr(extraDm)}`);

  const diffLabel   = DIFFICULTIES.find(d => d.tn === tn)?.label ?? `TN ${tn}`;
  const resultColor = success ? "var(--color-level-success, green)" : "var(--color-level-error, red)";
  const successLabel = naturalTotal === 12 ? "Nat.Success"
                     : naturalTotal === 2  ? "Nat.Failure"
                     : success ? "Success" : "Failure";

  const rollLabel = weaponOpts?.weaponName
    ? `${label} (${weaponOpts.weaponName})`
    : label;

  const dmgBtn = (success && weaponOpts?.damage)
    ? `<button type="button" class="soc2e-roll-damage"
          data-actor-uuid="${actor.uuid}"
          data-damage="${weaponOpts.damage}"
          data-add-str-dm="${weaponOpts.addStrDm}"
          data-effect="${effect}"
          data-weapon-name="${(weaponOpts.weaponName ?? "").replace(/"/g, "&quot;")}"
          data-weapon-img="${(weaponOpts.weaponImg  ?? "").replace(/"/g, "&quot;")}">Roll Damage</button>`
    : "";

  const flavor = `<div style="font-size:1.1em;line-height:1.7;">
    <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:0 8px;">
      <span><b>${rollLabel}</b>${advantage ? " <i>(Advantage)</i>" : ""}</span>
      <span style="white-space:nowrap;">DM ${_dmStr(totalMod)}</span>
      <span style="font-size:0.88em;color:#666;">(${dmParts.join(", ")})</span>
    </div>
    <div style="display:flex;align-items:baseline;justify-content:space-between;"><span>${diffLabel} (${tn}+) — <span style="color:${resultColor};"><b>${successLabel}</b></span></span>${dmgBtn}</div>
    <div style="display:flex;align-items:baseline;justify-content:space-between;">
      <div>Effect: <b>${_dmStr(effect)}</b></div>
      <div class="soc2e-reroll-btn"><button type="button" class="soc2e-reroll"
          data-actor-uuid="${actor.uuid}"
          data-formula="${formula}"
          data-mod="${totalMod}"
          data-tn="${tn}"
          data-label="${rollLabel.replace(/"/g, "&quot;")}"
          ${weaponOpts?.damage ? `data-damage="${weaponOpts.damage}" data-add-str-dm="${weaponOpts.addStrDm ?? false}" data-weapon-name="${(weaponOpts.weaponName ?? "").replace(/"/g, "&quot;")}" data-weapon-img="${(weaponOpts.weaponImg ?? "").replace(/"/g, "&quot;")}"` : ""}>Reroll</button></div>
    </div>
    <div class="soc2e-reroll-section"></div>
  </div>`;

  const rollMode = game.settings.get("core", "rollMode");
  const speaker  = _makeSpeaker(actor);
  await roll.toMessage({ speaker, flavor, rollMode });

  return true;
}

/* -------------------------------------------- */
/*  Sorcery Roll Helper                          */
/* -------------------------------------------- */

async function _rollSorcery(actor, spellItem = null) {
  const skillVal  = actor.system.skills.sorcery ?? 0;
  const skillKey  = "sorcery";
  const label     = game.i18n.localize("SOC2E.Skill.sorcery");
  let spellName = spellItem?.name ?? null;
  let spellImg  = spellItem?.img  ?? null;
  const mem       = _skillMemory[skillKey] ?? { tn: 8, statKey: "int" };

  // Wound penalty
  const wounds  = actor.system.wounds ?? {};
  const woundDm = wounds.seriousWound ? -2 : wounds.minorWound ? -1 : 0;

  // Fatigue
  const fatigueDm = actor.system.fatigue ? -1 : 0;

  // Armor sorcery rules:
  //   negative sneak mod → spellcasting blocked entirely
  //   zero or positive sneak mod → -1 DM
  const equippedArmors = actor.items?.filter(i => i.type === "armor" && i.system.equipped) ?? [];
  const hasHeavyArmor  = equippedArmors.some(i => (i.system.sneakModifier ?? 0) < 0);
  if (hasHeavyArmor) {
    ui.notifications.error("Spellcasting is impossible in heavy armor.");
    return;
  }
  const armorDm = equippedArmors.length > 0 ? -1 : 0;

  // Difficulty radios
  const diffRadios = DIFFICULTIES.map(d => `
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;">
      <input type="radio" name="difficulty" value="${d.tn}" ${mem.tn === d.tn ? "checked" : ""}/>
      ${d.label} (${d.tn}+)
    </label>`).join("");

  // Stat radios (default INT)
  const attrs = actor.system.attributes;
  const noneRadio = `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;">
    <input type="radio" name="stat" value="none" ${mem.statKey === "none" ? "checked" : ""}/>None
  </label>`;
  const attrRadios = Object.entries(_actorAttrLabels(actor)).map(([k, lbl]) => {
    const dm = attrs[k]?.dm ?? 0;
    return `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;">
      <input type="radio" name="stat" value="${k}" ${mem.statKey === k ? "checked" : ""}/>
      ${lbl} (${_dmStr(dm)})
    </label>`;
  }).join("");

  // Modifier notes in dialog header
  const woundNote   = woundDm   ? ` <span style="color:#c00;font-weight:bold;">(wound ${_dmStr(woundDm)})</span>` : "";
  const fatigueNote = fatigueDm ? ` <span style="color:#7c3fa0;font-weight:bold;">(fatigue ${_dmStr(fatigueDm)})</span>` : "";
  const armorNote   = armorDm   ? ` <span style="color:orange;font-weight:bold;">(Armor ${_dmStr(armorDm)})</span>` : "";

  const spellNameNote = spellName ? ` — <i>${spellName}</i>` : "";

  // Spell selector — only shown when not casting a specific spell
  const spells = actor.items.filter(i => i.type === "spell")
    .sort((a, b) => a.name.localeCompare(b.name));
  const spellSelectHtml = (!spellItem && spells.length) ? `
      <select name="spell-id" style="flex:1;min-width:0;">
        <option value="">— none —</option>
        ${spells.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}
      </select>` : "";

  const content = `
    <div style="margin-bottom:8px;">
      <b>${label}</b>${spellNameNote} &nbsp;(skill DM: ${_dmStr(skillVal)})${woundNote}${fatigueNote}${armorNote}
    </div>
    <div>
      <div style="font-weight:bold;margin-bottom:4px;">Difficulty:</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px 14px;">${diffRadios}</div>
    </div>
    <div style="margin-top:10px;">
      <div style="font-weight:bold;margin-bottom:4px;">Characteristic DM:</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px 14px;">${noneRadio}${attrRadios}</div>
    </div>
    <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
      <label style="white-space:nowrap;">Situational DM:</label>
      <input type="number" name="extra-dm" value="0" style="width:60px;text-align:center;"/>
    </div>
    <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
      <input type="checkbox" name="channeling" id="channeling-cb" />
      <label for="channeling-cb" style="cursor:pointer;color:#c8a000;font-weight:bold;white-space:nowrap;">Channeling <span style="font-weight:normal;">(−2 DM, +1 Corruption)</span></label>
      ${spellSelectHtml}
    </div>`;

  const readForm = (button) => {
    const f = button.form.elements;
    return {
      tn:         parseInt(f["difficulty"]?.value ?? 8),
      statKey:    f["stat"]?.value ?? "int",
      extraDm:    parseInt(f["extra-dm"]?.value ?? 0) || 0,
      channeling: f["channeling"]?.checked ?? false,
      spellId:    f["spell-id"]?.value ?? "",
    };
  };

  let dialogResult;
  try {
    dialogResult = await foundry.applications.api.DialogV2.wait({
      window: { title: `Roll: ${label}` },
      content,
      rejectClose: false,
      buttons: [
        {
          action: "normal",
          label: "Roll 2d6",
          default: true,
          callback: (_event, button) => ({ ...readForm(button), advantage: false }),
        },
        {
          action: "advantage",
          label: "Advantage (3d6)",
          callback: (_event, button) => ({ ...readForm(button), advantage: true }),
        },
      ],
    });
  } catch { return; }
  if (dialogResult === null || dialogResult === undefined) return;

  const { tn, statKey, extraDm, advantage, channeling, spellId } = dialogResult;
  _skillMemory[skillKey] = { tn, statKey };

  const channelingDm = channeling ? -2 : 0;

  // If the generic dialog had a spell selector, resolve the chosen spell now
  if (!spellItem && spellId) {
    spellItem = actor.items.get(spellId) ?? null;
    if (spellItem) { spellName = spellItem.name; spellImg = spellItem.img; }
  }

  const statDm  = (statKey && statKey !== "none") ? (attrs[statKey]?.dm ?? 0) : 0;
  const statLbl = (statKey && statKey !== "none") ? _actorAttrLabels(actor)[statKey] : null;

  const totalMod = skillVal + statDm + extraDm + woundDm + fatigueDm + armorDm + channelingDm;
  const formula  = advantage ? "3d6kh2 + @mod" : "2d6 + @mod";
  const roll     = await new Roll(formula, { mod: totalMod }).evaluate();
  const natural  = roll.dice[0].total;
  const effect   = roll.total - tn;

  // Critical rules
  const critSuccess = natural === 12 || effect >= 4;
  const critFailure = natural === 2  || effect <= -4;
  const success     = critSuccess ? true : critFailure ? false : effect >= 0;

  // DM breakdown
  const dmParts = [`skill ${_dmStr(skillVal)}`];
  if (statLbl)      dmParts.push(`${statLbl} ${_dmStr(statDm)}`);
  if (woundDm)      dmParts.push(`<span style="color:#c00;">wound ${_dmStr(woundDm)}</span>`);
  if (fatigueDm)    dmParts.push(`<span style="color:#7c3fa0;">fatigue ${_dmStr(fatigueDm)}</span>`);
  if (armorDm)      dmParts.push(`<span style="color:orange;">Armor ${_dmStr(armorDm)}</span>`);
  if (channelingDm) dmParts.push(`<span style="color:#c8a000;">Channeling ${_dmStr(channelingDm)}</span>`);
  if (extraDm)      dmParts.push(`situational ${_dmStr(extraDm)}`);

  const diffLabel = DIFFICULTIES.find(d => d.tn === tn)?.label ?? `TN ${tn}`;

  let outcomeLabel, outcomeColor;
  if (critSuccess)      { outcomeLabel = "Critical Success"; outcomeColor = "var(--color-level-success, green)"; }
  else if (critFailure) { outcomeLabel = "Critical Failure"; outcomeColor = "var(--color-level-error, red)";    }
  else if (success)     { outcomeLabel = "Success";          outcomeColor = "var(--color-level-success, green)"; }
  else                  { outcomeLabel = "Failure";          outcomeColor = "var(--color-level-error, red)";    }

  let critSource = "";
  if (critSuccess) critSource = natural === 12 ? " (nat 12)" : `(effect ${_dmStr(effect)})`;
  if (critFailure) critSource = natural === 2  ? " (nat 2)"  : `(effect ${_dmStr(effect)})`;

  // Corruption: +1 if critical success OR channeling (not both — capped at 1)
  const corruptionGain = (critSuccess || channelingDm !== 0) ? 1 : 0;
  const corruptionParts = [];
  if (critSuccess)        corruptionParts.push("Critical Success");
  if (channelingDm !== 0) corruptionParts.push("Channeling");
  const corruptionLine = corruptionGain > 0
    ? `<div style="margin-top:4px;color:#6a0dad;font-weight:bold;">Corruption +${corruptionGain} <span style="font-weight:normal;font-style:italic;">(${corruptionParts.join(", ")})</span></div>`
    : "";

  const spellHeader = (spellName && spellImg)
    ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
         <img src="${spellImg}" alt="${spellName}" style="width:36px;height:36px;object-fit:contain;border:none;"/>
         <b>${spellName}</b>
       </div>`
    : spellName
    ? `<div style="margin-bottom:4px;"><b>${spellName}</b></div>`
    : "";

  const flavor = `<div style="font-size:1.1em;line-height:1.7;">
    ${spellHeader}
    <div><b>${label}</b>${advantage ? " <i>(Advantage)</i>" : ""} &bull; DM ${_dmStr(totalMod)} (${dmParts.join(", ")})</div>
    <div>${diffLabel} (${tn}+) — <span style="color:${outcomeColor};"><b>${outcomeLabel}</b></span> <i>${critSource}</i></div>
    ${corruptionLine}
    <div style="display:flex;align-items:baseline;justify-content:space-between;">
      <div>Effect: <b>${_dmStr(effect)}</b></div>
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="soc2e-keep-original-slot"></div>
        <div class="soc2e-reroll-btn"><button type="button" class="soc2e-reroll"
            data-actor-uuid="${actor.uuid}"
            data-formula="${formula}"
            data-mod="${totalMod}"
            data-tn="${tn}"
            data-sorcery-reroll="true"
            data-channeling="${channeling}"
            data-original-crit="${critSuccess}"
            data-label="${label.replace(/"/g, "&quot;")}">Reroll</button></div>
      </div>
    </div>
    <div class="soc2e-reroll-section"></div>
  </div>`;

  const rollMode = game.settings.get("core", "rollMode");
  const speaker  = _makeSpeaker(actor);
  await roll.toMessage({ speaker, flavor, rollMode });

  if (corruptionGain > 0) {
    await actor.update({ "system.corruption": (actor.system.corruption ?? 0) + corruptionGain });
  }
}

/* -------------------------------------------- */
/*  Custom Combat Document                       */
/* -------------------------------------------- */

export class Soc2eCombat extends Combat {
  /** Override to show per-actor initiative dialog instead of using the formula string. */
  async rollInitiative(ids, _options = {}) {
    const updates = [];
    for (const id of (typeof ids === "string" ? [ids] : ids)) {
      const combatant = this.combatants.get(id);
      if (!combatant || combatant.isDefeated) continue;
      const actor = combatant.actor;
      const total = actor ? await actor.rollInitiative() : null;
      if (total === null) continue;
      updates.push({ _id: id, initiative: total });
    }
    if (updates.length) await this.updateEmbeddedDocuments("Combatant", updates);
    return this;
  }
}
