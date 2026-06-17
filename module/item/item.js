/**
 * Sword of Cepheus 2e — Item Data Models
 * Uses TypeDataModel (v13+) for schema, replacing template.json Item entries.
 */

const { TypeDataModel } = foundry.abstract;
const { StringField, NumberField, BooleanField } = foundry.data.fields;

/* -------------------------------------------- */
/*  Shared base schema helper                    */
/* -------------------------------------------- */

function baseSchema() {
  return {
    description: new StringField({ initial: "" }),
    cost:        new StringField({ initial: "" }),
  };
}

/* -------------------------------------------- */
/*  Weapon                                       */
/* -------------------------------------------- */

export class Soc2eWeaponModel extends TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      damage:       new StringField({ initial: "" }),
      range:        new StringField({ initial: "" }),
      aspects:      new StringField({ initial: "" }),
      ammo:         new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      ammoMax:      new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      ammoCost:     new StringField({ initial: "" }),
      ammoType:     new StringField({ initial: "" }),
      thrown:       new BooleanField({ initial: false }),
      ranged:       new BooleanField({ initial: false }),
      artillery:    new BooleanField({ initial: false }),
      encumbrance:  new NumberField({ required: true, initial: 1, min: 0 }),
      equipped:     new BooleanField({ initial: false }),
    };
  }
}

/* -------------------------------------------- */
/*  Armor                                        */
/* -------------------------------------------- */

export class Soc2eArmorModel extends TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      shield:        new BooleanField({ initial: false }),
      protection:    new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      sneakModifier: new NumberField({ required: true, integer: true, initial: 0 }),
      encumbrance:   new NumberField({ required: true, initial: 1, min: 0 }),
      equipped:      new BooleanField({ initial: false }),
    };
  }
}

/* -------------------------------------------- */
/*  Adventuring Gear                             */
/* -------------------------------------------- */

export class Soc2eGenericEquipModel extends TypeDataModel {
  static defineSchema() {
    return {
      ...baseSchema(),
      quantity:    new NumberField({ required: true, integer: true, initial: 1, min: 0 }),
      subtype:     new StringField({ initial: "adventuring", choices: ["adventuring", "food", "clothing", "potion"] }),
      encumbrance: new NumberField({ required: true, initial: 1, min: 0 }),
    };
  }
}

/* -------------------------------------------- */
/*  Animal                                       */
/* -------------------------------------------- */

export class Soc2eAnimalModel extends TypeDataModel {
  static defineSchema() {
    return {
      description:      new StringField({ initial: "" }),
      cost:             new StringField({ initial: "" }),
      speed:            new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      carryingCapacity: new StringField({ initial: "" }),
    };
  }
}

/* -------------------------------------------- */
/*  Spell                                        */
/* -------------------------------------------- */

export class Soc2eSpellModel extends TypeDataModel {
  static defineSchema() {
    return {
      school:      new StringField({ initial: "arcane", choices: ["arcane", "eldritch"] }),
      range:       new StringField({ initial: "" }),
      duration:    new StringField({ initial: "" }),
      effect:      new StringField({ initial: "" }),
      critSuccess: new StringField({ initial: "" }),
    };
  }
}

/* -------------------------------------------- */
/*  Trait                                        */
/* -------------------------------------------- */

export class Soc2eTraitModel extends TypeDataModel {
  static defineSchema() {
    return {
      description:        new StringField({ initial: "" }),
      corruptingWeakness: new BooleanField({ initial: false }),
    };
  }
}
