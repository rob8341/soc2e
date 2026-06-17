/**
 * Sword of Cepheus 2e — Character Sheet (AppV2)
 * Compatible with Foundry v13 and v14.
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;


/** Skill display order matching the physical character sheet */
export const SKILL_ORDER = [
  "alchemy", "animals", "artifice", "artillery", "art", "athletics", "archery",
  "battle", "carousing", "craft", "deception", "govern", "insight", "jackoftrades",
  "leadership", "liaison", "healing", "meleecombat", "naturalphilosophy", "scout",
  "sorcery", "sneak", "steward", "streetwise", "survival", "religion", "riding", "watercraft",
];

/** Attribute display order */
export const ATTR_ORDER = ["str", "dex", "end", "int", "edu", "soc"];

/**
 * Bind a single delegated dragstart listener so owned items can be dragged
 * to other actor sheets. Safe to call on every _onRender — only binds once.
 */
function _bindItemDrag(sheet) {
  const el = sheet.element;
  if (el._soc2eDragBound) return;
  el._soc2eDragBound = true;
  el.addEventListener("dragstart", ev => {
    const itemId = ev.target.dataset?.itemId;
    if (!itemId) return;
    const item = sheet.actor.items.get(itemId);
    if (!item) return;
    ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: item.uuid }));
  });
}

/** Skill tooltip descriptions */
export const SKILL_TOOLTIPS = {
  alchemy:           "The esoteric art of combining and creating alchemical and chemical substances. Also covers herbalism and poison-making.",
  animals:           "The care and training of animals. Also covers general agriculture.",
  archery:           "Using bows and crossbows. In higher-tech settings, this also covers the use of primitive firearms.",
  artifice:          "Creating and appraising magical artifacts.",
  artillery:         "The use of siege engines such as ballistae and catapults. In higher-tech settings, this also covers the use of primitive cannons.",
  art:               "Creating works of art and artistic expression.",
  athletics:         "The ability to exert oneself physically. You may add the Athletics skill to appropriate physical characteristic rolls. This skill is never rolled unskilled.",
  battle:            "Tactical planning and decision making, whether on the ground or in the sea.",
  carousing:         "The art of mingling in social settings to achieve your goals. Also covers gambling.",
  craft:             "The ability to maintain, repair, and build mechanical devices of all sorts, from crossbows to carts. Can cover artistic endeavors like sculpture and painting. Also covers lockpicking.",
  deception:         "Convincingly avoiding the truth and misleading other people. Also covers forgery.",
  govern:            "The skill to handle ruling a kingdom or city state, bureaucracies, and the law.",
  healing:           "Training in the art of healing, from diagnosis to binding wounds to surgery.",
  insight:           "This skill combines keen observation, forensics, research, and detailed analysis.",
  jackoftrades:      "This special skill reduces the unskilled penalty (−3) by its level. A character with Jack o' Trades 2 suffers only a −1 penalty to unskilled rolls. Maximum 3 levels; cannot be improved after character generation.",
  leadership:        "The ability to lead groups of individuals during times of crisis.",
  liaison:           "The art and practice of negotiation and diplomacy in a myriad of social situations. Covers diplomatic meetings, haggling with merchants, or diffusing a situation before blades start flashing.",
  meleecombat:       "Fighting hand-to-hand, either with a weapon or unarmed.",
  naturalphilosophy: "The study of nature and technology.",
  religion:          "Knowledge of gods and demons – and the ways to worship them. In some settings, this skill may grant certain supernatural abilities.",
  riding:            "Using animals for transportation, from riding a horse to driving a chariot to riding an elephant or dinosaur.",
  scout:             "Scouting for danger and spotting threats.",
  sorcery:           "Meddling in the dark arts of magic.",
  sneak:             "The art of operating while being unseen and unheard. Also covers breaking and entering, sleight-of-hand, and pickpocketing.",
  steward:           "Pertaining to the care and serving of guests, passengers, and others who expect a certain level of quality service.",
  streetwise:        "Familiarity with underworld society and the ways of working with it.",
  survival:          "Staying alive in the wilderness. Also covers tracking, foraging, and fishing.",
  watercraft:        "Controlling and using boats and ships, including navigation.",
};

/* -------------------------------------------- */
/*  Character Sheet                              */
/* -------------------------------------------- */

export class Soc2eCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** Active tab in each group — "primary" starts on Skills & Traits */
  tabGroups = { primary: "skills" };

  /** UI-only state: hide unskilled skills (persisted in localStorage) */
  get _hideUnskilled() {
    return localStorage.getItem(`soc2e.hideUnskilled.${this.actor.id}`) === "1";
  }
  set _hideUnskilled(value) {
    localStorage.setItem(`soc2e.hideUnskilled.${this.actor.id}`, value ? "1" : "0");
  }

  /** UI-only state: whether the terms section is locked for editing */
  _termsLocked = false;

  /** UI-only state: whether the terms section is collapsed (persisted in localStorage) */
  get _termsCollapsed() {
    return localStorage.getItem(`soc2e.termsCollapsed.${this.actor.id}`) === "1";
  }
  set _termsCollapsed(value) {
    localStorage.setItem(`soc2e.termsCollapsed.${this.actor.id}`, value ? "1" : "0");
  }

  static DEFAULT_OPTIONS = {
    classes: ["soc2e", "sheet", "actor", "character"],
    position: { width: 780, height: 920 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      rollAttribute:  Soc2eCharacterSheet.#onRollAttribute,
      rollSkill:      Soc2eCharacterSheet.#onRollSkill,
      increaseSkill:  Soc2eCharacterSheet.#onIncreaseSkill,
      adjustHero:     Soc2eCharacterSheet.#onAdjustHero,
      resetHero:      Soc2eCharacterSheet.#onResetHero,
      selectTab:      Soc2eCharacterSheet.#onSelectTab,
      restoreStat:    Soc2eCharacterSheet.#onRestoreStat,
      addTerm:        Soc2eCharacterSheet.#onAddTerm,
      deleteTerm:     Soc2eCharacterSheet.#onDeleteTerm,
      createEquipItem: Soc2eCharacterSheet.#onCreateEquipItem,
      deleteEquipItem: Soc2eCharacterSheet.#onDeleteEquipItem,
      viewEquipItem:   Soc2eCharacterSheet.#onViewEquipItem,
      equipItem:            Soc2eCharacterSheet.#onEquipItem,
      rollWeapon:           Soc2eCharacterSheet.#onRollWeapon,
      reloadWeapon:         Soc2eCharacterSheet.#onReloadWeapon,
      rollEquippedWeapon:   Soc2eCharacterSheet.#onRollEquippedWeapon,
      createTrait:             Soc2eCharacterSheet.#onCreateTrait,
      deleteTrait:             Soc2eCharacterSheet.#onDeleteTrait,
      viewTrait:               Soc2eCharacterSheet.#onViewTrait,
      createCorruptingWeakness: Soc2eCharacterSheet.#onCreateCorruptingWeakness,
      createSpell:          Soc2eCharacterSheet.#onCreateSpell,
      deleteSpell:          Soc2eCharacterSheet.#onDeleteSpell,
      viewSpell:            Soc2eCharacterSheet.#onViewSpell,
      castSpell:            Soc2eCharacterSheet.#onCastSpell,
      rollSorcery:          Soc2eCharacterSheet.#onRollSorcery,
      toggleCorruptionLock: Soc2eCharacterSheet.#onToggleCorruptionLock,
      toggleSkillsLock:     Soc2eCharacterSheet.#onToggleSkillsLock,
      toggleAttrsLock:      Soc2eCharacterSheet.#onToggleAttrsLock,
      openVehicle:          Soc2eCharacterSheet.#onOpenVehicle,
    },
  };

  static PARTS = {
    sheet: {
      template: "systems/soc2e/templates/actor/character-sheet.hbs",
    },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.actor    = this.actor;
    context.system   = system;
    context.editable = this.isEditable;

    // Attribute list with labels & derived DMs
    context.attributeList = ATTR_ORDER.map(key => ({
      key,
      label:     game.i18n.localize(`SOC2E.Attr.${key}`),
      labelShort: game.i18n.localize(`SOC2E.AttrShort.${key}`),
      value:     system.attributes[key].value,
      dm:        system.attributes[key].dm,
    }));

    // Items grouped by type for equipment tab
    const EQUIP_TYPES = ["weapon", "armor", "animal"];
    const ADV_SUBTYPES = ["adventuring", "food", "clothing", "potion"];
    context.itemsByType = {};

    const mapItem = i => ({
      id:       i.id,
      name:     i.name,
      img:      i.img,
      qty:      i.system.quantity ?? 1,
      subtype:  i.system.subtype ?? "adventuring",
      enc:      i.system.encumbrance ?? 0,
      equipped: i.system.equipped ?? false,
    });

    const mapWeapon = i => ({
      ...mapItem(i),
      damage:  i.system.damage   ?? "",
      range:   i.system.range    ?? "",
      ammo:    i.system.ammo     ?? 0,
      ammoMax: i.system.ammoMax  ?? 0,
      aspects: i.system.aspects  ?? "",
      ranged:  i.system.ranged   ?? false,
    });

    const mapArmor = i => ({
      ...mapItem(i),
      shield:        i.system.shield        ?? false,
      protection:    i.system.protection    ?? 0,
      sneakModifier: i.system.sneakModifier ?? 0,
    });

    context.itemsByType.weapon = this.actor.items
      .filter(i => i.type === "weapon")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(mapWeapon);

    context.itemsByType.armor = this.actor.items
      .filter(i => i.type === "armor")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(mapArmor);

    for (const type of EQUIP_TYPES.filter(t => t !== "weapon" && t !== "armor")) {
      context.itemsByType[type] = this.actor.items
        .filter(i => i.type === type)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(mapItem);
    }
    // Split adventuring items into one bucket per subtype
    for (const sub of ADV_SUBTYPES) {
      context.itemsByType[`adv_${sub}`] = this.actor.items
        .filter(i => i.type === "adventuring" && (i.system.subtype ?? "adventuring") === sub)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(mapItem);
    }

    const encItems  = this.actor.items.filter(i => [...EQUIP_TYPES, "adventuring"].includes(i.type));
    const encTotal  = encItems.reduce((sum, i) => sum + (i.system.encumbrance ?? 0) * (i.system.quantity ?? 1), 0);
    const backpackMax = system.backpackMax ?? 0;
    context.backpackUsed  = Math.min(encTotal, backpackMax);
    context.backpackMax   = backpackMax;
    context.encEffective  = Math.max(0, encTotal - backpackMax);

    context.linkedVehicles = game.actors
      .filter(a => a.type === "vehicle" && (a.system.crewMembers ?? []).includes(this.actor.id))
      .map(a => ({ id: a.id, name: a.name, img: a.img }));

    // Traits
    const allTraits = this.actor.items.filter(i => i.type === "trait").sort((a, b) => a.name.localeCompare(b.name));
    context.traitList = allTraits
      .filter(i => !i.system.corruptingWeakness)
      .map(i => ({ id: i.id, name: i.name, img: i.img }));
    context.corruptingWeaknessList = allTraits
      .filter(i => i.system.corruptingWeakness)
      .map(i => ({ id: i.id, name: i.name, img: i.img }));

    // Encumbrance thresholds
    const str = system.attributes.str.value;
    context.encLight = str;
    context.encHeavy = str * 3;

    // Skill point totals
    context.skillPointsMax     = system.attributes.int.value + system.attributes.edu.value;
    context.skillPointsCurrent = Object.values(system.skills).reduce((sum, v) => sum + (v > 0 ? v : 0), 0);

    // Skill list in canonical display order
    context.skillList = SKILL_ORDER.map(key => ({
      key,
      label:   game.i18n.localize(`SOC2E.Skill.${key}`),
      value:   system.skills[key],
      tooltip: SKILL_TOOLTIPS[key] ?? "",
    }));

    // Terms table — reference values derived from term index
    const SKILL_GRANTS  = ["1 (background)", "2 + svc skill 1", "2", "2", "1", "1", "1"];
    const TOTAL_SKILLS  = [1, 4, 6, 8, 9, 10, 11];
    const TRAITS_TABLE  = [1, 1, 1, 2, 2, 3, 3];
    const records = system.termRecords ?? [{}];
    const lastTermIndex = records.length - 1;
    context.termRows = records.map((rec, i) => ({
      index:       i,
      age:         rec.age || 14 + i * 4,
      skillGrant:  SKILL_GRANTS[i]  ?? "1",
      totalSkills: TOTAL_SKILLS[i]  ?? 11 + (i - 6),
      aging:       i >= 4 ? "Yes" : "No",
      traits:      TRAITS_TABLE[i]  ?? 3 + Math.ceil((i - 6) / 2),
      moRolls:     i + 1,
      totalEvents: i,
      skills:      rec.skills   ?? "",
      benefits:    rec.benefits ?? "",
      events:      rec.events   ?? "",
      canDelete:   i > 0 && i === lastTermIndex,
    }));
    context.termsFull = records.length >= 7;

    // Spells — arcane first, then eldritch; alphabetical within each group
    context.spellList = this.actor.items
      .filter(i => i.type === "spell")
      .sort((a, b) => {
        const schoolOrder = { arcane: 0, eldritch: 1 };
        const sa = schoolOrder[a.system.school] ?? 0;
        const sb = schoolOrder[b.system.school] ?? 0;
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name);
      })
      .map(i => ({ id: i.id, name: i.name, img: i.img, school: i.system.school }));

    context.hasSpells = context.spellList.length > 0;
    context.equippedWeapon = (() => {
      const w = this.actor.items.find(i => i.type === "weapon" && (i.system.equipped ?? false));
      return w ? { id: w.id, name: w.name, img: w.img } : null;
    })();

    // Corruption derived values
    const end        = system.attributes.end.value ?? 0;
    const corruption = system.corruption ?? 0;
    const weaknesses = end > 0 ? Math.floor(corruption / end) : 0;
    const threshold  = end > 0 ? (weaknesses + 1) * end : "—";
    context.corruptingWeaknesses = weaknesses;
    context.corruptionThreshold  = threshold;

    return context;
  }

  /** @override — save tab-body scroll position before content is replaced. */
  async _preRender(context, options) {
    await super._preRender(context, options);
    this._savedTabScroll = this.element?.querySelector(".tab-body")?.scrollTop ?? 0;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    _bindItemDrag(this);

    // Restore tab-body scroll position lost during re-render.
    // requestAnimationFrame defers until after the browser's own auto-scroll.
    const tabBody = this.element.querySelector(".tab-body");
    if (tabBody && this._savedTabScroll) {
      requestAnimationFrame(() => { tabBody.scrollTop = this._savedTabScroll; });
    }

    // Apply active classes for the current tab group state
    this._syncTabs();

    // Restore corruption lock state
    this.#applyCorruptionLock();

    // Restore skills lock state
    this.#applySkillsLock();

    // Restore attributes lock state
    this.#applyAttrsLock();

    if (!this.isEditable) return;

    // Bind form change → actor update once per window instance.
    // Delegates on this.element (persists across re-renders) so multiple
    // renders don't stack duplicate listeners.
    if (!this.element._soc2eFormBound) {
      this.element._soc2eFormBound = true;
      this.element.addEventListener("change", ev => {
        const field = ev.target;
        // Inline item quantity input
        if (field.matches(".equip-item-qty")) {
          field.blur();
          const item = this.actor.items.get(field.dataset.itemId);
          item?.update({ "system.quantity": parseInt(field.value) || 0 });
          return;
        }
        // Inline item subtype select
        if (field.matches(".equip-item-subtype")) {
          const item = this.actor.items.get(field.dataset.itemId);
          item?.update({ "system.subtype": field.value });
          return;
        }
        if (!field.matches("input:not([type='button']):not([type='submit']):not([type='image']), select, textarea")) return;
        if (!field.closest("form")) return;
        const form  = field.closest("form");
        const fd    = new foundry.applications.ux.FormDataExtended(form);
        const data  = foundry.utils.expandObject(fd.object);
        this.document.update(data);
        if (field.matches(".fatigue-cb")) {
          const speaker = ChatMessage.getSpeaker({ actor: this.actor });
          ChatMessage.create({ speaker, content: field.checked ? "Gained Fatigue." : "Lost Fatigue." });
        }
      });
    }

    // Hide unskilled checkbox
    const cb = this.element.querySelector(".hide-unskilled-cb");
    if (cb) {
      const list = this.element.querySelector(".skills-list");
      cb.checked = this._hideUnskilled;
      list?.classList.toggle("hide-unskilled", this._hideUnskilled);
      cb.addEventListener("change", () => {
        this._hideUnskilled = cb.checked;
        list?.classList.toggle("hide-unskilled", cb.checked);
      });
    }

    // Terms section collapse button
    const termsCollapseBtn = this.element.querySelector(".terms-collapse-btn");
    if (termsCollapseBtn) {
      this._applyTermsCollapse(this._termsCollapsed);
      termsCollapseBtn.addEventListener("click", () => {
        this._termsCollapsed = !this._termsCollapsed;
        this._applyTermsCollapse(this._termsCollapsed);
      });
    }

    // Terms section lock button
    const termsLockBtn = this.element.querySelector(".terms-lock-btn");
    if (termsLockBtn) {
      this._applyTermsLock(this._termsLocked);
      termsLockBtn.addEventListener("click", () => {
        this._termsLocked = !this._termsLocked;
        this._applyTermsLock(this._termsLocked);
      });
    }

    // Live DM preview as user types attribute scores
    this.element.querySelectorAll("input.attr-score-input").forEach(input => {
      input.addEventListener("input", ev => {
        const key = ev.currentTarget.dataset.attr;
        const { soc2eAttributeDM } = game.soc2e;
        const dm = soc2eAttributeDM(parseInt(ev.currentTarget.value) || 0);
        const dmEl = this.element.querySelector(`.attr-dm-value[data-attr="${key}"]`);
        if (dmEl) dmEl.textContent = dm >= 0 ? `+${dm}` : `${dm}`;
      });
    });
  }

  /** Collapse or expand the terms section body. */
  _applyTermsCollapse(collapsed) {
    const section = this.element.querySelector(".terms-section");
    if (!section) return;
    section.classList.toggle("terms-collapsed", collapsed);
    const btn = section.querySelector(".terms-collapse-btn");
    if (btn) btn.innerHTML = collapsed ? "&#9654;" : "&#9660;";
    const lockBtn = section.querySelector(".terms-lock-btn");
    if (lockBtn) lockBtn.style.visibility = collapsed ? "hidden" : "";
  }

  /** Apply or remove lock state for the entire terms section. */
  _applyTermsLock(locked) {
    const section = this.element.querySelector(".terms-section");
    if (!section) return;
    section.querySelectorAll(".term-input-row input, .term-age-input").forEach(i => i.disabled = locked);
    section.querySelectorAll(".term-delete-btn").forEach(b => b.style.visibility = locked ? "hidden" : "");
    const addBtn = section.querySelector(".terms-add-btn");
    if (addBtn) addBtn.style.visibility = locked ? "hidden" : "";
    const lockBtn = section.querySelector(".terms-lock-btn");
    if (lockBtn) lockBtn.textContent = locked ? "Edit" : "Lock";
  }

  /** Toggle .active on tab nav items and tab content panels. */
  _syncTabs() {
    for (const [group, active] of Object.entries(this.tabGroups)) {
      this.element.querySelectorAll(`nav.tabs[data-group="${group}"] [data-tab]`).forEach(el => {
        el.classList.toggle("active", el.dataset.tab === active);
      });
      this.element.querySelectorAll(`.tab[data-group="${group}"]`).forEach(el => {
        el.classList.toggle("active", el.dataset.tab === active);
      });
    }
  }

  /* ---- Drag-and-Drop ---- */

  static #TAB_ALLOWED = {
    skills:    ["trait"],
    equipment: ["weapon", "armor", "adventuring", "animal"],
    sorcery:   ["spell", "trait"],
    bio:       [],
  };

  async _onDropItem(event, data) {
    const item = await Item.fromDropData(data);
    if (!item) return super._onDropItem(event, data);

    const activeTab = this.tabGroups.primary ?? "skills";
    const allowed   = Soc2eCharacterSheet.#TAB_ALLOWED[activeTab] ?? [];

    if (!allowed.includes(item.type)) {
      const tabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      ui.notifications.warn(`"${item.name}" (${item.type}) cannot be dropped on the ${tabLabel} tab.`);
      return;
    }

    // Traits: set corruptingWeakness flag based on which tab they land on
    if (item.type === "trait") {
      const itemData = item.toObject();
      itemData.system.corruptingWeakness = (activeTab === "sorcery");
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    return super._onDropItem(event, data);
  }

  /* ---- Static Action Handlers ---- */

  /**
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRollAttribute(event, target) {
    await this.actor.rollAttribute(target.dataset.attr);
  }

  static async #onRollSkill(event, target) {
    await this.actor.rollSkill(target.dataset.skill);
  }

  static async #onIncreaseSkill(event, target) {
    const XP_COST = { 0: 2, 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 };
    const key      = target.dataset.skill;
    const current  = this.actor.system.skills[key] ?? -3;
    const newLevel = current < 0 ? 0 : current + 1;
    const label    = game.i18n.localize(`SOC2E.Skill.${key}`);

    if (newLevel > 5) {
      ui.notifications.warn("Skill is already at maximum level (5).");
      return;
    }

    const cost = XP_COST[newLevel];
    const xp   = this.actor.system.xp ?? 0;
    if (xp < cost) {
      ui.notifications.warn(`Not enough XP. Raising to level ${newLevel} costs ${cost} XP (you have ${xp}).`);
      return;
    }

    // INT+EDU cap — only skills above 0 count
    if (newLevel > 0) {
      const { int: intAttr, edu: eduAttr } = this.actor.system.attributes;
      const cap         = (intAttr?.value ?? 0) + (eduAttr?.value ?? 0);
      const currentSum  = Object.entries(this.actor.system.skills)
        .reduce((sum, [k, v]) => sum + (v > 0 ? v : 0), 0);
      if (currentSum + 1 > cap) {
        ui.notifications.warn(`Cannot increase skill: total skill levels (${currentSum + 1}) would exceed INT+EDU (${cap}).`);
        return;
      }
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Increase Skill" },
      content: `<p>Raise <b>${label}</b> to level <b>${newLevel}</b>?</p>
                <p>XP cost: <b>${cost}</b> &nbsp;(you have <b>${xp}</b>)</p>`,
      rejectClose: false,
    });
    if (!confirmed) return;

    await this.actor.update({
      [`system.skills.${key}`]: newLevel,
      "system.xp": xp - cost,
    });
  }

  static async #onAdjustHero(event, target) {
    const delta   = parseInt(target.dataset.delta, 10);
    const current = this.actor.system.heroPoints ?? 0;
    const newVal  = Math.max(0, Math.min(current + delta, 5));
    if (newVal === current) return;
    await this.actor.update({ "system.heroPoints": newVal });
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    await ChatMessage.create({
      speaker,
      content: delta < 0 ? "Used a Hero Point." : "Gained a Hero Point.",
    });
  }

  static async #onResetHero() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Reset Hero Points" },
      content: `<p>Reset <b>${this.actor.name}</b>'s Hero Points to 2?</p>`,
    });
    if (!confirmed) return;
    await this.actor.update({ "system.heroPoints": 2 });
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    await ChatMessage.create({
      speaker,
      content: "Resets their Hero Points to 2.",
    });
  }

  static #onSelectTab(event, target) {
    this.tabGroups[target.dataset.group] = target.dataset.tab;
    this._syncTabs();
  }

  static async #onRestoreStat(event, target) {
    const stat = target.dataset.stat;
    const sys  = this.actor.system;
    const pool = sys[stat];

    let newValue;
    if (stat === "lifeblood" && (sys.wounds.seriousWound || sys.wounds.mortalWound)) {
      newValue = pool.value + 1;
    } else {
      newValue = pool.max;
    }

    await this.actor.update({ [`system.${stat}.value`]: Math.min(newValue, pool.max) });
  }

  static async #onEquipItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const isEquipped = item.system.equipped ?? false;
    if (!isEquipped) {
      if (item.type === "weapon") {
        // Only one weapon equipped at a time — unequip the current one
        const others = this.actor.items.filter(
          i => i.type === "weapon" && (i.system.equipped ?? false) && i.id !== item.id
        );
        for (const other of others) await other.update({ "system.equipped": false });
      } else {
        // Other categories: max 2
        const alreadyEquipped = this.actor.items.filter(
          i => i.type === item.type && (i.system.equipped ?? false) && i.id !== item.id
        ).length;
        if (alreadyEquipped >= 2) return;
      }
    }
    await item.update({ "system.equipped": !isEquipped });
  }

  static async #onCreateEquipItem(event, target) {
    const type    = target.dataset.itemType;
    const subtype = target.dataset.itemSubtype;
    const data    = { name: "New Item", type };
    if (subtype) data["system.subtype"] = subtype;
    await this.actor.createEmbeddedDocuments("Item", [data]);
  }

  static async #onDeleteEquipItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete Item" },
      content: `<p>Delete <b>${item.name}</b>?</p>`,
      rejectClose: false,
    });
    if (confirmed) { document.activeElement?.blur(); await item.delete(); }
  }

  static #onViewEquipItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    item?.sheet.render(true);
  }

  static async #onRollWeapon(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await this.actor.rollWeapon(item);
  }

  static async #onReloadWeapon(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const { ammo, ammoMax } = item.system;
    if (ammo >= ammoMax) { ui.notifications.info(`${item.name} is already fully loaded.`); return; }
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Reload Weapon" },
      content: `<p>Reload <b>${item.name}</b>?</p><p>${ammo}/${ammoMax} → ${ammoMax}/${ammoMax}</p>`,
      rejectClose: false,
    });
    if (confirmed) await item.update({ "system.ammo": ammoMax });
  }

  static async #onRollEquippedWeapon() {
    const weapon = this.actor.items.find(i => i.type === "weapon" && (i.system.equipped ?? false));
    if (!weapon) return;
    await this.actor.rollWeapon(weapon);
  }

  static async #onAddTerm() {
    const records = foundry.utils.deepClone(this.actor.system.termRecords ?? [{}]);
    if (records.length >= 7) return;
    records.push({ skills: "", benefits: "", events: "" });
    await this.actor.update({ "system.termRecords": records });
  }

  static async #onDeleteTerm(event, target) {
    const index = parseInt(target.dataset.index);
    const records = foundry.utils.deepClone(this.actor.system.termRecords ?? [{}]);
    if (index === 0 || index !== records.length - 1) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete Term" },
      content: `<p>Delete Term ${index}? This cannot be undone.</p>`,
      rejectClose: false,
    });
    if (!confirmed) return;
    records.splice(index, 1);
    await this.actor.update({ "system.termRecords": records });
  }

  static async #onCreateTrait() {
    await this.actor.createEmbeddedDocuments("Item", [{ name: "New Trait", type: "trait" }]);
  }

  static async #onDeleteTrait(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete Trait" },
      content: `<p>Delete <b>${item.name}</b>?</p>`,
      rejectClose: false,
    });
    if (confirmed) { document.activeElement?.blur(); await item.delete(); }
  }

  static #onViewTrait(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
  }

  static async #onCreateCorruptingWeakness() {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: "New Corrupting Weakness", type: "trait",
      system: { corruptingWeakness: true },
    }]);
  }

  static async #onCreateSpell() {
    await this.actor.createEmbeddedDocuments("Item", [{ name: "New Spell", type: "spell" }]);
  }

  static async #onDeleteSpell(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete Spell" },
      content: `<p>Delete <b>${item.name}</b>?</p>`,
      rejectClose: false,
    });
    if (confirmed) { document.activeElement?.blur(); await item.delete(); }
  }

  static #onViewSpell(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
  }

  static async #onRollSorcery() {
    await this.actor.rollSorcery();
  }

  static async #onCastSpell(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await this.actor.castSpell(item);
  }

  get _corruptionLocked() {
    return localStorage.getItem(`soc2e.corruptionLocked.${this.actor.id}`) !== "0";
  }
  set _corruptionLocked(value) {
    localStorage.setItem(`soc2e.corruptionLocked.${this.actor.id}`, value ? "1" : "0");
  }

  #applyCorruptionLock() {
    const locked = this._corruptionLocked;
    const input  = this.element.querySelector(".corruption-input");
    const btn    = this.element.querySelector(".corruption-lock-btn");
    if (input) input.disabled = locked;
    if (btn)   btn.innerHTML  = locked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';
  }

  static #onToggleCorruptionLock() {
    this._corruptionLocked = !this._corruptionLocked;
    this.#applyCorruptionLock();
  }

  get _skillsLocked() {
    return localStorage.getItem(`soc2e.skillsLocked.${this.actor.id}`) !== "0";
  }
  set _skillsLocked(value) {
    localStorage.setItem(`soc2e.skillsLocked.${this.actor.id}`, value ? "1" : "0");
  }

  #applySkillsLock() {
    const locked = this._skillsLocked;
    this.element.querySelectorAll(".skill-value").forEach(el => el.disabled = locked);
    const btn = this.element.querySelector(".skills-lock-btn");
    if (btn) btn.innerHTML = locked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';
  }

  static #onToggleSkillsLock() {
    this._skillsLocked = !this._skillsLocked;
    this.#applySkillsLock();
  }

  get _attrsLocked() {
    return localStorage.getItem(`soc2e.attrsLocked.${this.actor.id}`) !== "0";
  }
  set _attrsLocked(value) {
    localStorage.setItem(`soc2e.attrsLocked.${this.actor.id}`, value ? "1" : "0");
  }

  #applyAttrsLock() {
    const locked = this._attrsLocked;
    this.element.querySelectorAll(".attr-score-input").forEach(el => el.disabled = locked);
    const btn = this.element.querySelector(".attrs-lock-btn");
    if (btn) btn.innerHTML = locked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';
  }

  static #onToggleAttrsLock() {
    this._attrsLocked = !this._attrsLocked;
    this.#applyAttrsLock();
  }

  static #onOpenVehicle(event, target) {
    game.actors.get(target.dataset.vehicleId)?.sheet.render(true);
  }
}

/* -------------------------------------------- */
/*  NPC Sheet                                    */
/* -------------------------------------------- */

export class Soc2eNpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["soc2e", "sheet", "actor", "npc"],
    position: { width: 640, height: 700 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      rollAttribute:   Soc2eNpcSheet.#onRollAttribute,
      rollSkill:       Soc2eNpcSheet.#onRollSkill,
      rollWeapon:      Soc2eNpcSheet.#onRollWeapon,
      reloadWeapon:    Soc2eNpcSheet.#onReloadWeapon,
      restoreStat:     Soc2eNpcSheet.#onRestoreStat,
      equipItem:       Soc2eNpcSheet.#onEquipItem,
      viewEquipItem:   Soc2eNpcSheet.#onViewEquipItem,
      deleteEquipItem: Soc2eNpcSheet.#onDeleteEquipItem,
      createEquipItem: Soc2eNpcSheet.#onCreateEquipItem,
      castSpell:           Soc2eNpcSheet.#onCastSpell,
      deleteSpell:         Soc2eNpcSheet.#onDeleteSpell,
      viewSpell:           Soc2eNpcSheet.#onViewSpell,
      createSpell:         Soc2eNpcSheet.#onCreateSpell,
      openVehicle:         Soc2eNpcSheet.#onOpenVehicle,
      rollEquippedWeapon:  Soc2eNpcSheet.#onRollEquippedWeapon,
      rollSorcery:         Soc2eNpcSheet.#onRollSorcery,
    },
  };

  static PARTS = {
    sheet: { template: "systems/soc2e/templates/actor/npc-sheet.hbs" },
  };

  /* ---- Hide-unskilled state (localStorage) ---- */
  get _hideUnskilled() {
    return localStorage.getItem(`soc2e.hideUnskilled.${this.actor.id}`) === "1";
  }
  set _hideUnskilled(value) {
    localStorage.setItem(`soc2e.hideUnskilled.${this.actor.id}`, value ? "1" : "0");
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;
    context.actor    = this.actor;
    context.system   = system;
    context.editable = this.isEditable;

    const isMonster = system.monster ?? false;
    const attrLabels = {
      edu: isMonster ? "Instinct" : game.i18n.localize("SOC2E.Attr.edu"),
      soc: isMonster ? "Pack"     : game.i18n.localize("SOC2E.Attr.soc"),
    };
    context.attributeList = ATTR_ORDER.map(key => ({
      key,
      label: attrLabels[key] ?? game.i18n.localize(`SOC2E.Attr.${key}`),
      value: system.attributes[key].value,
      dm:    system.attributes[key].dm,
    }));
    context.skillList = SKILL_ORDER.map(key => ({
      key,
      label:   game.i18n.localize(`SOC2E.Skill.${key}`),
      value:   system.skills[key],
      tooltip: SKILL_TOOLTIPS[key] ?? "",
    }));

    // Inventory — same mappers as character sheet
    const mapItem = i => ({
      id: i.id, name: i.name, img: i.img,
      qty:      i.system.quantity   ?? 1,
      enc:      i.system.encumbrance ?? 0,
      equipped: i.system.equipped   ?? false,
    });
    const mapWeapon = i => ({
      ...mapItem(i),
      damage:  i.system.damage   ?? "",
      range:   i.system.range    ?? "",
      ammo:    i.system.ammo     ?? 0,
      ammoMax: i.system.ammoMax  ?? 0,
      aspects: i.system.aspects  ?? "",
      ranged:  i.system.ranged   ?? false,
    });
    const mapArmor = i => ({
      ...mapItem(i),
      shield:        i.system.shield        ?? false,
      protection:    i.system.protection    ?? 0,
      sneakModifier: i.system.sneakModifier ?? 0,
    });

    context.itemsByType = {
      weapon: this.actor.items.filter(i => i.type === "weapon")
        .sort((a, b) => a.name.localeCompare(b.name)).map(mapWeapon),
      armor: this.actor.items.filter(i => i.type === "armor")
        .sort((a, b) => a.name.localeCompare(b.name)).map(mapArmor),
      adventuring: this.actor.items.filter(i => i.type === "adventuring")
        .sort((a, b) => a.name.localeCompare(b.name)).map(mapItem),
    };

    context.spellcaster = system.spellcaster ?? false;
    context.spellList = this.actor.items
      .filter(i => i.type === "spell")
      .sort((a, b) => {
        const order = { arcane: 0, eldritch: 1 };
        const sa = order[a.system.school] ?? 0;
        const sb = order[b.system.school] ?? 0;
        return sa !== sb ? sa - sb : a.name.localeCompare(b.name);
      })
      .map(i => ({ id: i.id, name: i.name, img: i.img, school: i.system.school }));

    context.linkedVehicles = game.actors
      .filter(a => a.type === "vehicle" && (a.system.crewMembers ?? []).includes(this.actor.id))
      .map(a => ({ id: a.id, name: a.name, img: a.img }));

    return context;
  }

  /** @override — save npc-body scroll position before re-render. */
  async _preRender(context, options) {
    await super._preRender(context, options);
    this._savedScroll = this.element?.querySelector(".npc-body")?.scrollTop ?? 0;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    _bindItemDrag(this);

    // Restore npc-body scroll position after re-render.
    const npcBody = this.element.querySelector(".npc-body");
    if (npcBody && this._savedScroll) {
      requestAnimationFrame(() => { npcBody.scrollTop = this._savedScroll; });
    }

    // Hide-unskilled checkbox
    const cb   = this.element.querySelector(".hide-unskilled-cb");
    const list = this.element.querySelector(".skills-list");
    if (cb) {
      cb.checked = this._hideUnskilled;
      list?.classList.toggle("hide-unskilled", this._hideUnskilled);
      cb.addEventListener("change", () => {
        this._hideUnskilled = cb.checked;
        list?.classList.toggle("hide-unskilled", cb.checked);
      });
    }

    if (!this.isEditable) return;
    if (!this.element._soc2eNpcFormBound) {
      this.element._soc2eNpcFormBound = true;
      this.element.addEventListener("change", ev => {
        const field = ev.target;
        if (field.matches(".equip-item-qty")) {
          field.blur();
          const item = this.actor.items.get(field.dataset.itemId);
          item?.update({ "system.quantity": parseInt(field.value) || 0 });
          return;
        }
        if (!field.matches("input:not([type='button']):not([type='submit']):not([type='image']), select, textarea")) return;
        const form = field.closest("form");
        if (!form) return;
        const fd   = new foundry.applications.ux.FormDataExtended(form);
        const data = foundry.utils.expandObject(fd.object);
        this.document.update(data);
      });
    }
  }

  static async #onRollAttribute(event, target) {
    await this.actor.rollAttribute(target.dataset.attr);
  }
  static async #onRollSkill(event, target) {
    await this.actor.rollSkill(target.dataset.skill);
  }
  static async #onRestoreStat(event, target) {

    const stat = target.dataset.stat;
    const sys  = this.actor.system;
    const pool = sys[stat];
    let newValue;
    if (stat === "lifeblood" && (sys.wounds.seriousWound || sys.wounds.mortalWound)) {
      newValue = pool.value + 1;
    } else {
      newValue = pool.max;
    }
    await this.actor.update({ [`system.${stat}.value`]: Math.min(newValue, pool.max) });
  }
  static async #onRollWeapon(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item) await this.actor.rollWeapon(item);
  }

  static async #onReloadWeapon(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const { ammo, ammoMax } = item.system;
    if (ammo >= ammoMax) { ui.notifications.info(`${item.name} is already fully loaded.`); return; }
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Reload Weapon" },
      content: `<p>Reload <b>${item.name}</b>?</p><p>${ammo}/${ammoMax} → ${ammoMax}/${ammoMax}</p>`,
      rejectClose: false,
    });
    if (confirmed) await item.update({ "system.ammo": ammoMax });
  }
  static async #onEquipItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const isEquipped = item.system.equipped ?? false;
    if (!isEquipped && item.type === "weapon") {
      const others = this.actor.items.filter(
        i => i.type === "weapon" && (i.system.equipped ?? false) && i.id !== item.id
      );
      for (const other of others) await other.update({ "system.equipped": false });
    }
    await item.update({ "system.equipped": !isEquipped });
  }
  static #onViewEquipItem(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
  }
  static async #onDeleteEquipItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete Item" },
      content: `<p>Delete <b>${item.name}</b>?</p>`,
      rejectClose: false,
    });
    if (confirmed) { document.activeElement?.blur(); await item.delete(); }
  }
  static async #onCreateEquipItem(event, target) {
    const type = target.dataset.itemType;
    await this.actor.createEmbeddedDocuments("Item", [{ name: "New Item", type }]);
  }
  static async #onCastSpell(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item) await this.actor.castSpell(item);
  }
  static async #onDeleteSpell(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete Spell" },
      content: `<p>Delete <b>${item.name}</b>?</p>`,
      rejectClose: false,
    });
    if (confirmed) { document.activeElement?.blur(); await item.delete(); }
  }
  static #onViewSpell(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
  }
  static async #onCreateSpell() {
    await this.actor.createEmbeddedDocuments("Item", [{ name: "New Spell", type: "spell" }]);
  }

  static #onOpenVehicle(event, target) {
    game.actors.get(target.dataset.vehicleId)?.sheet.render(true);
  }
  static async #onRollEquippedWeapon() {
    const weapon = this.actor.items.find(i => i.type === "weapon" && (i.system.equipped ?? false));
    if (weapon) await this.actor.rollWeapon(weapon);
  }
  static async #onRollSorcery() {
    await this.actor.rollSorcery();
  }

  /** @override — only accept spells when spellcaster is checked. */
  async _onDropItem(event, data) {
    const item = await Item.fromDropData(data);
    if (!item) return super._onDropItem(event, data);
    if (item.type === "spell") {
      if (!this.actor.system.spellcaster) {
        ui.notifications.warn(`"${item.name}" cannot be dropped here — enable Spellcaster first.`);
        return;
      }
      return this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
    }
    return super._onDropItem(event, data);
  }

  /** @override — dropping a vehicle actor links this NPC as crew on that vehicle. */
  async _onDropActor(event, data) {
    const dropped = await Actor.fromDropData(data);
    if (!dropped || dropped.type !== "vehicle") return;
    const current = dropped.system.crewMembers ?? [];
    if (current.includes(this.actor.id)) return;
    await dropped.update({ "system.crewMembers": [...current, this.actor.id] });
    this.render();
  }
}

/* ============================================ */
/*  Vehicle Sheet                               */
/* ============================================ */

export class Soc2eVehicleSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["soc2e", "sheet", "actor", "vehicle"],
    position: { width: 500, height: 520 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      editImage:          Soc2eVehicleSheet.#onEditImage,
      toggleVehicleLock:  Soc2eVehicleSheet.#onToggleVehicleLock,
      viewCrewMember:     Soc2eVehicleSheet.#onViewCrewMember,
      removeCrewMember:   Soc2eVehicleSheet.#onRemoveCrewMember,
      rollWeapon:      Soc2eVehicleSheet.#onRollWeapon,
      reloadWeapon:    Soc2eVehicleSheet.#onReloadWeapon,
      equipItem:       Soc2eVehicleSheet.#onEquipItem,
      viewEquipItem:   Soc2eVehicleSheet.#onViewEquipItem,
      deleteEquipItem: Soc2eVehicleSheet.#onDeleteEquipItem,
      createEquipItem: Soc2eVehicleSheet.#onCreateEquipItem,
    },
  };

  static PARTS = {
    sheet: { template: "systems/soc2e/templates/actor/vehicle-sheet.hbs" },
  };

  _activeVehicleTab = "crew";

  get _vehicleLocked() {
    return localStorage.getItem(`soc2e.vehicleLocked.${this.actor.id}`) !== "0";
  }
  set _vehicleLocked(value) {
    localStorage.setItem(`soc2e.vehicleLocked.${this.actor.id}`, value ? "1" : "0");
  }

  #applyVehicleLock() {
    const locked = this._vehicleLocked;
    const el     = this.element;

    // All inputs, selects, textareas — except the lock button's hidden inputs
    el.querySelectorAll("input, select, textarea").forEach(i => { i.disabled = locked; });

    // Edit-only buttons: add, delete, equip, roll, reload — hide when locked
    el.querySelectorAll(
      ".equip-add-btn, .equip-item-delete, .equip-item-roll, " +
      ".weapon-ammo-btn, .equip-item-icon[data-action='equipItem'], " +
      ".remove-crew-btn, [data-action='removeCrewMember'], [data-action='createEquipItem']"
    ).forEach(b => { b.style.display = locked ? "none" : ""; });

    // Lock button icon
    const btn = el.querySelector(".vehicle-lock-btn i");
    if (btn) btn.className = locked ? "fa-solid fa-lock" : "fa-solid fa-lock-open";
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor    = this.actor;
    context.system   = this.actor.system;
    context.editable = this.isEditable;

    context.crewList = (this.actor.system.crewMembers ?? [])
      .map(id => game.actors.get(id))
      .filter(Boolean)
      .map(a => ({ id: a.id, name: a.name, img: a.img, type: a.type }));

    const mapItem = i => ({
      id: i.id, name: i.name, img: i.img,
      qty:      i.system.quantity    ?? 1,
      equipped: i.system.equipped    ?? false,
    });
    const mapWeapon = i => ({
      ...mapItem(i),
      damage:  i.system.damage  ?? "",
      range:   i.system.range   ?? "",
      ammo:    i.system.ammo    ?? 0,
      ammoMax: i.system.ammoMax ?? 0,
      aspects: i.system.aspects ?? "",
      ranged:  i.system.ranged  ?? false,
    });
    const mapArmor = i => ({
      ...mapItem(i),
      shield:        i.system.shield        ?? false,
      protection:    i.system.protection    ?? 0,
      sneakModifier: i.system.sneakModifier ?? 0,
    });
    const sort = arr => arr.sort((a, b) => a.name.localeCompare(b.name));

    context.itemsByType = {
      weapon:      sort(this.actor.items.filter(i => i.type === "weapon"     ).map(mapWeapon)),
      armor:       sort(this.actor.items.filter(i => i.type === "armor"      ).map(mapArmor)),
      adventuring: sort(this.actor.items.filter(i => i.type === "adventuring").map(mapItem)),
      animal:      sort(this.actor.items.filter(i => i.type === "animal"     ).map(mapItem)),
    };

    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    _bindItemDrag(this);

    // Restore active tab
    this.element.querySelector(`.vehicle-tab-btn[data-tab="${this._activeVehicleTab}"]`)?.classList.add("active");
    this.element.querySelector(`.vehicle-tab-pane[data-tab="${this._activeVehicleTab}"]`)?.classList.add("active");

    // Apply lock state (always runs, even for non-owners the sheet opens locked)
    this.#applyVehicleLock();

    // Tab switching
    this.element.querySelectorAll(".vehicle-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this._activeVehicleTab = btn.dataset.tab;
        this.element.querySelectorAll(".vehicle-tab-btn").forEach(b => b.classList.remove("active"));
        this.element.querySelectorAll(".vehicle-tab-pane").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        this.element.querySelector(`.vehicle-tab-pane[data-tab="${btn.dataset.tab}"]`)?.classList.add("active");
      });
    });

    if (!this.isEditable) return;
    if (!this.element._soc2eVehicleFormBound) {
      this.element._soc2eVehicleFormBound = true;
      this.element.addEventListener("change", ev => {
        const field = ev.target;
        if (field.matches(".equip-item-qty")) {
          field.blur();
          const item = this.actor.items.get(field.dataset.itemId);
          item?.update({ "system.quantity": parseInt(field.value) || 0 });
          return;
        }
        if (!field.matches("input, select, textarea")) return;
        const form = field.closest("form");
        if (!form) return;
        const fd   = new foundry.applications.ux.FormDataExtended(form);
        const data = foundry.utils.expandObject(fd.object);
        this.document.update(data);
      });
    }
  }

  static #TAB_ALLOWED = {
    cargo:   ["weapon", "armor", "adventuring", "animal"],
    weapons: ["weapon"],
  };

  async _onDropItem(event, data) {
    const item = await Item.fromDropData(data);
    if (!item) return;

    const allowed = Soc2eVehicleSheet.#TAB_ALLOWED[this._activeVehicleTab];
    if (allowed !== undefined && !allowed.includes(item.type)) {
      const tabLabel = this._activeVehicleTab.charAt(0).toUpperCase() + this._activeVehicleTab.slice(1);
      ui.notifications.warn(`"${item.name}" (${item.type}) cannot be dropped on the ${tabLabel} tab.`);
      return;
    }

    return this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }

  async _onDropActor(event, data) {
    if (this._activeVehicleTab !== "crew") return;
    if (!this.isEditable) return;
    const actor = await Actor.fromDropData(data);
    if (!actor) return;
    if (!["character", "npc"].includes(actor.type)) {
      ui.notifications.warn(`Only characters and NPCs can be added as crew.`);
      return;
    }
    const current = this.actor.system.crewMembers ?? [];
    if (current.includes(actor.id)) {
      ui.notifications.info(`${actor.name} is already crew on this vehicle.`);
      return;
    }
    await this.actor.update({ "system.crewMembers": [...current, actor.id] });
  }

  static async #onRollWeapon(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item) await this.actor.rollWeapon(item);
  }
  static async #onReloadWeapon(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const { ammo, ammoMax } = item.system;
    if (ammo >= ammoMax) { ui.notifications.info(`${item.name} is already fully loaded.`); return; }
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Reload Weapon" },
      content: `<p>Reload <b>${item.name}</b>?</p><p>${ammo}/${ammoMax} → ${ammoMax}/${ammoMax}</p>`,
      rejectClose: false,
    });
    if (confirmed) await item.update({ "system.ammo": ammoMax });
  }
  static async #onEquipItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.update({ "system.equipped": !(item.system.equipped ?? false) });
  }
  static #onViewEquipItem(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
  }
  static async #onDeleteEquipItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete Item" },
      content: `<p>Delete <b>${item.name}</b>?</p>`,
      rejectClose: false,
    });
    if (confirmed) { document.activeElement?.blur(); await item.delete(); }
  }
  static async #onCreateEquipItem(event, target) {
    await this.actor.createEmbeddedDocuments("Item", [{ name: "New Item", type: target.dataset.itemType }]);
  }

  static #onToggleVehicleLock() {
    this._vehicleLocked = !this._vehicleLocked;
    this.#applyVehicleLock();
  }

  static #onViewCrewMember(event, target) {
    game.actors.get(target.dataset.actorId)?.sheet.render(true);
  }
  static async #onRemoveCrewMember(event, target) {
    const actorId = target.dataset.actorId;
    const current = this.actor.system.crewMembers ?? [];
    await this.actor.update({ "system.crewMembers": current.filter(id => id !== actorId) });
  }

  static async #onEditImage() {
    if (!this.isEditable) return;
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: this.document.img ?? "",
      callback: path => this.document.update({ img: path }),
    });
    fp.browse();
  }

}
