/**
 * Sword of Cepheus 2e — Item Sheet (AppV2)
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;


export class Soc2eItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  _sheetLocked = true;

  static DEFAULT_OPTIONS = {
    classes: ["soc2e", "sheet", "item"],
    position: { width: 510, height: 500 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      editImage:   Soc2eItemSheet.#onEditImage,
      sendToChat:  Soc2eItemSheet.#onSendToChat,
      toggleLock:  Soc2eItemSheet.#onToggleLock,
    },
  };

  static PARTS = {
    sheet: { template: "systems/soc2e/templates/item/item-sheet.hbs" },
  };

  static #TYPE_LABELS = {
    weapon:      "Weapon",
    armor:       "Armor",
    adventuring: "Adventuring Gear",
    vehicle:     "Vehicle",
    animal:      "Animal",
    trait:       "Trait",
    spell:       "Spell",
  };

  /** @override */
  get title() {
    return this.item.name;
  }

  /** @override */
  async _prepareContext(options) {
    const context  = await super._prepareContext(options);
    const type     = this.item.type;
    context.item      = this.item;
    context.system    = this.item.system;
    context.editable  = this.isEditable;
    context.locked    = this._sheetLocked;
    context.typeLabel = Soc2eItemSheet.#TYPE_LABELS[type] ?? type;
    context.isWeapon      = type === "weapon";
    context.isArmor       = type === "armor";
    context.isEquipment   = type === "adventuring";
    context.isVehicle     = type === "vehicle";
    context.isAnimal      = type === "animal";
    context.isTrait       = type === "trait";
    context.isSpell       = type === "spell";
    context.hasSubtype    = type === "adventuring";
    context.hasEncumbrance = ["weapon","armor","adventuring","animal"].includes(type);
    return context;
  }

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    if (this.item.type === "trait") {
      this.setPosition({ width: 510, height: 370 });
    }
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Apply melee/ranged visibility on every render
    const meleeCb     = this.element.querySelector(".weapon-melee-cb");
    const thrownCb    = this.element.querySelector(".weapon-thrown-cb");
    const artilleryCb = this.element.querySelector(".weapon-artillery-cb");

    if (meleeCb) {
      this.#applyMeleeToggle(meleeCb.checked);
      meleeCb.addEventListener("change", () => {
        this.#applyMeleeToggle(meleeCb.checked);
        if (!meleeCb.checked) {
          if (thrownCb)    thrownCb.checked    = false;
          if (artilleryCb) artilleryCb.checked = false;
          this.document.update({ "system.thrown": false, "system.artillery": false });
        }
      });
    }

    // Thrown / Artillery are mutually exclusive
    if (thrownCb) {
      thrownCb.addEventListener("change", () => {
        if (thrownCb.checked && artilleryCb?.checked) {
          artilleryCb.checked = false;
          this.document.update({ "system.artillery": false });
        }
      });
    }
    if (artilleryCb) {
      artilleryCb.addEventListener("change", () => {
        if (artilleryCb.checked && thrownCb?.checked) {
          thrownCb.checked = false;
          this.document.update({ "system.thrown": false });
        }
      });
    }

    // Shield checkbox — hide/show protection field
    const shieldCb = this.element.querySelector(".armor-shield-cb");
    if (shieldCb) {
      this.#applyShieldToggle(shieldCb.checked);
      shieldCb.addEventListener("change", () => this.#applyShieldToggle(shieldCb.checked));
    }

    this.#applyLockState();

    if (!this.isEditable) return;
    if (!this.element._soc2eItemFormBound) {
      this.element._soc2eItemFormBound = true;
      this.element.addEventListener("change", ev => {
        if (this._sheetLocked) return;
        const field = ev.target;
        if (!field.matches("input, select, textarea")) return;
        const form = field.closest("form");
        if (!form) return;
        const fd   = new foundry.applications.ux.FormDataExtended(form);
        const data = foundry.utils.expandObject(fd.object);
        this.document.update(data);
      });
    }
  }

  #applyLockState() {
    this.element.querySelectorAll("input, select, textarea").forEach(el => {
      if (this._sheetLocked) el.setAttribute("disabled", "");
      else                   el.removeAttribute("disabled");
    });
    const btn = this.element.querySelector("[data-action='toggleLock']");
    if (!btn) return;
    const icon = btn.querySelector("i");
    if (this._sheetLocked) {
      if (icon) icon.className = "fa-solid fa-lock";
      btn.title = "Unlock for editing";
    } else {
      if (icon) icon.className = "fa-solid fa-lock-open";
      btn.title = "Lock";
    }
  }

  #applyShieldToggle(isShield) {
    const protField = this.element.querySelector(".armor-prot-field");
    if (protField) protField.style.display = isShield ? "none" : "";
  }

  #applyMeleeToggle(isRanged) {
    const rangedRow      = this.element.querySelector(".weapon-ranged-row");
    const thrownField    = this.element.querySelector(".weapon-thrown-field");
    const artilleryField = this.element.querySelector(".weapon-artillery-field");
    if (rangedRow)      rangedRow.style.display      = isRanged ? "" : "none";
    if (thrownField)    thrownField.style.display    = isRanged ? "" : "none";
    if (artilleryField) artilleryField.style.display = isRanged ? "" : "none";
  }

  /** Send item details to the chat log. */
  static async #onSendToChat(event, target) {
    const item     = this.item;
    const sys      = item.system;
    const typeLabel = Soc2eItemSheet.#TYPE_LABELS[item.type] ?? item.type;

    const stat = (label, value) =>
      value !== undefined && value !== "" && value !== null
        ? `<div class="soc2e-chat-stat"><span class="soc2e-chat-stat-label">${label}</span><span class="soc2e-chat-stat-value">${value}</span></div>`
        : "";

    let statsHtml = "";
    if (item.type === "weapon") {
      statsHtml += stat("Damage",    sys.damage);
      statsHtml += stat("Enc",       sys.encumbrance);
      statsHtml += stat("Cost",      sys.cost);
      if (sys.ranged) {
        statsHtml += stat("Range",     sys.range);
        statsHtml += stat("Ammo",      `${sys.ammo ?? 0}/${sys.ammoMax ?? 0}`);
        statsHtml += stat("Ammo Type", sys.ammoType);
        statsHtml += stat("Ammo Cost", sys.ammoCost);
        if (sys.thrown) statsHtml += stat("Thrown", "Yes");
      }
      if (sys.aspects) statsHtml += stat("Aspects", sys.aspects);
    } else if (item.type === "armor") {
      statsHtml += stat("Protection", sys.protection);
      statsHtml += stat("Enc",        sys.encumbrance);
      statsHtml += stat("Cost",       sys.cost);
    } else if (item.type === "spell") {
      statsHtml += stat("School",   sys.school ? sys.school.charAt(0).toUpperCase() + sys.school.slice(1) : "");
      statsHtml += stat("Range",    sys.range);
      statsHtml += stat("Duration", sys.duration);
    } else if (item.type === "vehicle") {
      statsHtml += stat("Agility",    sys.agility);
      statsHtml += stat("Speed",      sys.speed ? `${sys.speed} km/d` : "");
      statsHtml += stat("Light DMG",  sys.lightDmgThreshold);
      statsHtml += stat("Crit DMG",   sys.critDmgThreshold);
      statsHtml += stat("Crew",       sys.crew);
      statsHtml += stat("Cargo",      sys.cargo);
      if (sys.weapons || sys.weaponCount) {
        const weaponStr = [sys.weaponCount || "", sys.weapons].filter(Boolean).join("× ");
        statsHtml += stat("Weapons", weaponStr);
      }
      if (sys.cost)       statsHtml += stat("Cost",    sys.cost);
    } else {
      if (sys.quantity    !== undefined) statsHtml += stat("Qty",  sys.quantity);
      if (sys.encumbrance !== undefined) statsHtml += stat("Enc",  sys.encumbrance);
      if (sys.cost)                      statsHtml += stat("Cost", sys.cost);
    }

    const descText = item.type === "spell" ? sys.effect : sys.description;
    const descHtml = descText
      ? `<div class="soc2e-chat-desc">${descText}</div>`
      : "";

    const content = `
      <div class="soc2e-chat-card">
        <div class="soc2e-chat-header">
          <img src="${item.img}" alt="${item.name}" />
          <div class="soc2e-chat-title">
            <strong>${item.name}</strong>
            <span class="soc2e-chat-type">${typeLabel}</span>
          </div>
        </div>
        ${statsHtml ? `<div class="soc2e-chat-stats">${statsHtml}</div>` : ""}
        ${descHtml}
      </div>`;

    ChatMessage.create({
      speaker: (() => { const s = ChatMessage.getSpeaker({ actor: item.parent }); if (item.parent?.type === "npc") s.alias = `${s.alias} (NPC)`; return s; })(),
      content,
    });
  }


  static #onToggleLock(event, target) {
    if (!this.isEditable) return;
    this._sheetLocked = !this._sheetLocked;
    this.#applyLockState();
  }

  /** Open a FilePicker to change the item image. */
  static async #onEditImage(event, target) {
    if (!this.isEditable || this._sheetLocked) return;
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: this.document.img ?? "",
      callback: path => this.document.update({ img: path }),
    });
    fp.browse();
  }
}
