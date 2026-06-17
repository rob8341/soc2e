/**
 * The Sword of Cepheus 2e — Foundry VTT System Entry Point
 * Compatible with Foundry v13 and v14.
 *
 * Uses:
 *  - TypeDataModel   (v13+ data schema — replaces template.json)
 *  - AppV2 sheets    (HandlebarsApplicationMixin + ActorSheetV2)
 *  - DialogV2        (replaces old Dialog — removed in v14)
 *  - foundry.documents.collections.Actors registration
 */

import { Soc2eActor, Soc2eCharacterModel, Soc2eNpcModel, Soc2eVehicleActorModel, soc2eAttributeDM, Soc2eCombat, DIFFICULTIES, _dmStr } from "./module/actor/actor.js";
import { Soc2eCharacterSheet, Soc2eNpcSheet, Soc2eVehicleSheet } from "./module/actor/actor-sheet.js";
import { Soc2eWeaponModel, Soc2eArmorModel, Soc2eGenericEquipModel, Soc2eAnimalModel, Soc2eSpellModel, Soc2eTraitModel } from "./module/item/item.js";
import { Soc2eItemSheet } from "./module/item/item-sheet.js";

/* -------------------------------------------- */
/*  System Init                                  */
/* -------------------------------------------- */

Hooks.once("init", function () {
  console.log("SOC2E | Initialising The Sword of Cepheus 2e");

  // Expose helpers on a global namespace for live-update listeners
  game.soc2e = { soc2eAttributeDM };

  // --- Data Models ---
  CONFIG.Actor.documentClass = Soc2eActor;
  CONFIG.Actor.dataModels = {
    character: Soc2eCharacterModel,
    npc:       Soc2eNpcModel,
    vehicle:   Soc2eVehicleActorModel,
  };
  CONFIG.Item.dataModels = {
    weapon:       Soc2eWeaponModel,
    armor:        Soc2eArmorModel,
    adventuring:  Soc2eGenericEquipModel,
    animal:       Soc2eAnimalModel,
    spell:        Soc2eSpellModel,
    trait:        Soc2eTraitModel,
  };

  // --- Wound status effects ---
  CONFIG.statusEffects.push(
    { id: "soc2e-minor-wound",   name: "Minor Wound",   img: "icons/svg/blood.svg"   },
    { id: "soc2e-serious-wound", name: "Serious Wound", img: "icons/svg/bones.svg"       },
    { id: "soc2e-mortal-wound",  name: "Mortal Wound",  img: "icons/svg/unconscious.svg" },
  );

  // --- Token bars ---
  CONFIG.Actor.trackableAttributes = {
    character: {
      bar:   ["lifeblood", "stamina"],
      value: ["heroPoints", "armor"],
    },
    npc: {
      bar:   ["lifeblood", "stamina"],
      value: ["armor"],
    },
    vehicle: {
      bar:   [],
      value: [],
    },
  };

  // --- Custom Token: both bars at bottom, custom colors ---
  _registerTokenClass();

  // --- Initiative ---
  CONFIG.Combat.documentClass = Soc2eCombat;
  CONFIG.Combat.initiative = { formula: "2d6", decimals: 0 };

  // --- Sheet Registration ---
  // AppV1 (ActorSheet) was removed in v14; only unregister it if it exists.
  const ActorSheets = foundry.documents.collections.Actors;
  const ItemSheets  = foundry.documents.collections.Items;

  const coreActorSheet = foundry.appv1?.sheets?.ActorSheet;
  if (coreActorSheet) ActorSheets.unregisterSheet("core", coreActorSheet);

  ActorSheets.registerSheet("soc2e", Soc2eCharacterSheet, {
    types:       ["character"],
    makeDefault: true,
    label:       "SOC2E.Sheet.Character",
  });

  ActorSheets.registerSheet("soc2e", Soc2eNpcSheet, {
    types:       ["npc"],
    makeDefault: true,
    label:       "SOC2E.Sheet.NPC",
  });

  ActorSheets.registerSheet("soc2e", Soc2eVehicleSheet, {
    types:       ["vehicle"],
    makeDefault: true,
    label:       "SOC2E.Sheet.Vehicle",
  });

  ItemSheets.registerSheet("soc2e", Soc2eItemSheet, {
    types:       ["weapon", "armor", "adventuring", "animal", "trait", "spell"],
    makeDefault: true,
    label:       "SOC2E.Sheet.Item",
  });

  // --- Handlebars Helpers ---
  _registerHelpers();

  // --- Preload Templates ---
  _preloadTemplates();

  console.log("SOC2E | Initialisation complete");
});

Hooks.once("ready", async function () {
  console.log("SOC2E | Ready");

  if (!game.user.isGM) return;

  // Migration: delete stale "equipment" type items (type was removed).
  // Invalid actors won't appear in game.actors, so check invalidDocumentIds too.
  const allActorIds = [
    ...game.actors.map(a => a.id),
    ...game.actors.invalidDocumentIds,
  ];
  for (const actorId of allActorIds) {
    const actor = game.actors.get(actorId) ?? game.actors.getInvalid(actorId);
    if (!actor) continue;
    const stale = (actor._source?.items ?? [])
      .filter(i => i.type === "equipment" || i.type === "vehicle")
      .map(i => i._id);
    if (stale.length) {
      await Item.deleteDocuments(stale, { parent: actor });
      console.log(`SOC2E | Deleted ${stale.length} stale equipment item(s) from ${actor.name ?? actorId}.`);
    }
  }

  // Migration: delete legacy "monster" type actors (type was removed from system).
  const monsterIds = [...game.actors.invalidDocumentIds].filter(id => {
    const raw = game.actors.getInvalid(id);
    return raw?._source?.type === "monster";
  });
  if (monsterIds.length) {
    await Actor.deleteDocuments(monsterIds);
    console.log(`SOC2E | Deleted ${monsterIds.length} legacy monster actor(s).`);
  }

  // Migration: clear wounds set during development.
  const woundUpdates = game.actors
    .filter(a => a.type === "character")
    .filter(a => a.system.wounds?.minorWound || a.system.wounds?.seriousWound || a.system.wounds?.mortalWound)
    .map(a => ({
      _id: a.id,
      "system.wounds.minorWound":   false,
      "system.wounds.seriousWound": false,
      "system.wounds.mortalWound":  false,
    }));
  if (woundUpdates.length) {
    await Actor.updateDocuments(woundUpdates);
    console.log(`SOC2E | Cleared wounds on ${woundUpdates.length} character(s).`);
  }

  // Sync wound status effects for all character actors on load.
  for (const actor of game.actors.filter(a => a.type === "character")) {
    await actor._syncWoundEffects();
  }

  // Migration: apply bar frame colors to existing character prototype tokens.
  const barColorUpdates = game.actors
    .filter(a => a.type === "character")
    .filter(a => a.prototypeToken.bar1?.color !== "#CC2222" || a.prototypeToken.bar2?.color !== "#22AA44")
    .map(a => ({
      _id: a.id,
      "prototypeToken.bar1.color": "#CC2222",
      "prototypeToken.bar2.color": "#22AA44",
    }));
  if (barColorUpdates.length) {
    await Actor.updateDocuments(barColorUpdates);
    console.log(`SOC2E | Updated bar frame colors on ${barColorUpdates.length} character(s).`);
  }
});

/* -------------------------------------------- */
/*  Token Class — bar colours + position         */
/* -------------------------------------------- */

function _registerTokenClass() {
  const BaseToken = CONFIG.Token.objectClass;

  class Soc2eToken extends BaseToken {

    // Attribute name → fill colour (hex integer)
    static #COLORS = {
      lifeblood: 0xCC2222,   // red
      stamina:   0x22AA44,   // green
    };

    /**
     * Override core _drawBar so that:
     *  - lifeblood and stamina get their fixed colours instead of the
     *    Foundry default (percentage-based orange↔green for bar1, blue for bar2)
     *  - bar2 is placed at the bottom of the token frame (above bar1)
     *    instead of the default top position
     *
     * @param {number}       number  0 = bar1 (bottom), 1 = bar2 (normally top)
     * @param {PIXI.Graphics} bar    the graphics container to draw into
     * @param {object}       data    { value, max }
     */
    _drawBar(number, bar, data) {
      const attrPath = (number === 0 ? this.document.bar1 : this.document.bar2)?.attribute;
      // Strip any "system." prefix — trackableAttributes uses bare names
      const attrName = attrPath?.split(".").pop();
      const color    = Soc2eToken.#COLORS[attrName];

      if (color) {
        // Draw bar with our fixed colour
        const val    = Number(data.value);
        const max    = Number(data.max) || val || 1;
        const pct    = Math.min(Math.max(val, 0), max) / max;
        const w      = this.w;
        const barH   = Math.max(canvas.dimensions.size / 12, 8);
        const stroke = Math.min(Math.max(Math.floor(barH / 8), 1), 2);

        bar.clear()
           .lineStyle(stroke, 0x000000, 0.5)
           .beginFill(0x000000, 0.5)
           .drawRoundedRect(0, 0, w, barH, 2)
           .beginFill(color, 1.0)
           .drawRoundedRect(stroke, stroke, (w - 2 * stroke) * pct, barH - 2 * stroke, 2);
      } else {
        // Unknown attribute — use core rendering
        super._drawBar(number, bar, data);
      }

      // Reposition: both bars stack upward from the bottom of the token
      const barH   = Math.max(canvas.dimensions.size / 12, 8);
      const stroke = Math.min(Math.max(Math.floor(barH / 8), 1), 2);
      bar.y = this.h - (number + 1) * (barH + stroke);
    }
  }

  CONFIG.Token.objectClass = Soc2eToken;
}

/* -------------------------------------------- */
/*  Wound Effect Guards                          */
/* -------------------------------------------- */

// Wound status effects are system-managed — block all manual creation/deletion
// from the token HUD. The _woundSync flag on options exempts our own calls.

const WOUND_STATUS_IDS = new Set(["soc2e-minor-wound", "soc2e-serious-wound", "soc2e-mortal-wound"]);

Hooks.on("preCreateActiveEffect", (effect, _data, options) => {
  if (options._woundSync) return;
  if ([...effect.statuses].some(id => WOUND_STATUS_IDS.has(id))) return false;
});

Hooks.on("preDeleteActiveEffect", (effect, options) => {
  if (options._woundSync) return;
  if ([...effect.statuses].some(id => WOUND_STATUS_IDS.has(id))) return false;
});

/* -------------------------------------------- */
/*  Vehicle Crew → Linked Vehicles Sync          */
/* -------------------------------------------- */

// When a vehicle's crewMembers list changes, re-render any open character/NPC
// sheets so their Vehicles section reflects the addition or removal immediately.
Hooks.on("updateActor", (actor, changes) => {
  if (actor.type !== "vehicle") return;
  if (!foundry.utils.hasProperty(changes, "system.crewMembers")) return;
  game.actors
    .filter(a => ["character", "npc"].includes(a.type) && a.sheet?.rendered)
    .forEach(a => a.sheet.render());
});

/* -------------------------------------------- */
/*  Damage Roll Button in Chat                   */
/* -------------------------------------------- */

Hooks.on("renderChatMessageHTML", (message, html) => {
  // Reroll button — only visible to the actor's owner
  const rerollBtnWrap = html.querySelector(".soc2e-reroll-btn");
  const rerollSection = html.querySelector(".soc2e-reroll-section");
  if (rerollBtnWrap || rerollSection) {
    const stored = message.flags?.soc2e?.rerollResult;
    if (stored) {
      if (rerollSection) rerollSection.innerHTML = stored;
      if (rerollBtnWrap) rerollBtnWrap.style.display = "none";
    } else {
      const btn = rerollBtnWrap?.querySelector(".soc2e-reroll");
      if (btn) btn.addEventListener("click", async () => {
      // Guard against duplicate handlers firing on the same click
      if (btn.dataset.rerolling) return;
      btn.dataset.rerolling = "true";
      btn.disabled = true;

      const actorUuid = btn.dataset.actorUuid;
      const formula   = btn.dataset.formula;
      const mod       = parseInt(btn.dataset.mod, 10);
      const tn        = parseInt(btn.dataset.tn, 10);
      const label     = btn.dataset.label;

      const actor = await fromUuid(actorUuid);
      if (!actor) { ui.notifications.error("Actor not found."); btn.disabled = false; delete btn.dataset.rerolling; return; }
      if (!actor.isOwner) { ui.notifications.warn("Only the actor's owner can reroll."); btn.disabled = false; delete btn.dataset.rerolling; return; }

      const hp = actor.system.heroPoints ?? 0;
      if (hp < 1) { ui.notifications.warn("No Hero Points remaining!"); btn.disabled = false; delete btn.dataset.rerolling; return; }

      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Reroll" },
        content: `<p>Spend 1 Hero Point to reroll <b>${label}</b>?</p><p>Hero Points remaining: <b>${hp}</b></p>`,
      });
      if (!confirmed) { btn.disabled = false; delete btn.dataset.rerolling; return; }

      await actor.update({ "system.heroPoints": hp - 1 });

      const roll = await new Roll(formula, { mod }).evaluate();
      const naturalTotal = roll.dice[0].total;

      let resultHtml;
      let rerollMeta = null;
      let initiativeMeta = null;
      if (tn < 0) {
        const rawResult   = roll.total;
        const minOne      = btn.dataset.minOne === "true";
        const finalResult = minOne ? Math.max(1, rawResult) : rawResult;
        const clampNote   = (minOne && finalResult !== rawResult) ? ` <i style="font-size:0.85em;">(min 1)</i>` : "";
        if (btn.dataset.initiativeReroll === "true") {
          const originalValue = message.rolls[0]?.total ?? 0;
          resultHtml = `<div style="color:#888;font-size:0.85em;">&#x21BA; Reroll &mdash; &minus;1 Hero Point</div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;">
              <div>Reroll: <b>${finalResult}</b>${clampNote}</div>
              <div class="soc2e-keep-reroll-slot"></div>
            </div>`;
          initiativeMeta = { actorUuid, originalValue, rerollValue: finalResult };
        } else {
          resultHtml = `<div style="color:#888;font-size:0.85em;">&#x21BA; Reroll &mdash; &minus;1 Hero Point</div>
            <div>Reroll: <b>${finalResult}</b>${clampNote}</div>`;
        }
      } else {
        const effect = roll.total - tn;
        const isSorcery = btn.dataset.sorceryReroll === "true";

        let success, successLabel, resultColor, rerollCritSuccess = false;
        if (isSorcery) {
          rerollCritSuccess = naturalTotal === 12 || effect >= 4;
          const rerollCritFailure = naturalTotal === 2  || effect <= -4;
          success = rerollCritSuccess ? true : rerollCritFailure ? false : effect >= 0;
          if (rerollCritSuccess)      { successLabel = "Critical Success"; resultColor = "var(--color-level-success, green)"; }
          else if (rerollCritFailure) { successLabel = "Critical Failure"; resultColor = "var(--color-level-error, red)"; }
          else if (success)           { successLabel = "Success";          resultColor = "var(--color-level-success, green)"; }
          else                        { successLabel = "Failure";          resultColor = "var(--color-level-error, red)"; }
        } else {
          success = naturalTotal === 12 ? true : naturalTotal === 2 ? false : effect >= 0;
          resultColor = success ? "var(--color-level-success, green)" : "var(--color-level-error, red)";
          successLabel = naturalTotal === 12 ? "Nat.Success" : naturalTotal === 2 ? "Nat.Failure" : success ? "Success" : "Failure";
        }

        const diffLabel = DIFFICULTIES.find(d => d.tn === tn)?.label ?? `TN ${tn}`;
        const rerollDmgBtn = (success && btn.dataset.damage)
          ? `<button type="button" class="soc2e-roll-damage"
                data-actor-uuid="${actorUuid}"
                data-damage="${btn.dataset.damage}"
                data-add-str-dm="${btn.dataset.addStrDm}"
                data-effect="${effect}"
                data-weapon-name="${btn.dataset.weaponName || ""}"
                data-weapon-img="${btn.dataset.weaponImg || ""}">Roll Damage</button>`
          : "";
        const keepRerollSlot = isSorcery
          ? `<div class="soc2e-keep-reroll-slot" data-reroll-crit="${rerollCritSuccess}"></div>`
          : "";
        resultHtml = `<div style="color:#888;font-size:0.85em;">&#x21BA; Reroll &mdash; &minus;1 Hero Point</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;"><span>${diffLabel} (${tn}+) &mdash; <span style="color:${resultColor};"><b>${successLabel}</b></span></span>${rerollDmgBtn}</div>
          <div style="display:flex;align-items:baseline;justify-content:space-between;">
            <div>Effect: <b>${_dmStr(effect)}</b></div>
            ${keepRerollSlot}
          </div>`;

        if (isSorcery) {
          rerollMeta = {
            actorUuid,
            channeling: btn.dataset.channeling === "true",
            originalCrit: btn.dataset.originalCrit === "true",
            rerollCrit: rerollCritSuccess,
          };
        }
      }

      // Add the reroll as a second Roll on the same message so Foundry renders
      // the dice display for it, then store the flavor text in flags so the
      // renderChatMessageHTML hook can swap the button out for the result text.
      const existingRolls = message.rolls.map(r => r.toJSON());
      const updateData = {
        rolls: [...existingRolls, roll.toJSON()],
        "flags.soc2e.rerollResult": resultHtml,
      };
      if (rerollMeta)    updateData["flags.soc2e.rerollMeta"]    = rerollMeta;
      if (initiativeMeta) updateData["flags.soc2e.initiativeMeta"] = initiativeMeta;
      await message.update(updateData);
    }); // end click handler
    } // end else (no stored result)

    // Sorcery keep-choice buttons (shown after a sorcery reroll)
    const meta = message.flags?.soc2e?.rerollMeta;
    if (meta && stored) {
      const keepChoice = message.flags?.soc2e?.keepChoice;
      const keepOriginalSlot = html.querySelector(".soc2e-keep-original-slot");
      const keepRerollSlot   = html.querySelector(".soc2e-keep-reroll-slot");

      if (keepChoice) {
        const kept   = `<span style="color:green;font-weight:bold;" title="Kept">&#x2714;</span>`;
        const passed = `<span style="color:#aaa;" title="Not kept">&#x2718;</span>`;
        if (keepOriginalSlot) keepOriginalSlot.innerHTML = keepChoice === "original" ? kept : passed;
        if (keepRerollSlot)   keepRerollSlot.innerHTML   = keepChoice === "reroll"   ? kept : passed;
      } else {
        const makeKeepBtn = (choice) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "soc2e-keep-choice";
          b.title = choice === "original" ? "Keep original roll" : "Keep reroll";
          b.textContent = "✓";
          b.dataset.choice      = choice;
          b.dataset.actorUuid   = meta.actorUuid;
          b.dataset.channeling  = meta.channeling;
          b.dataset.originalCrit = meta.originalCrit;
          b.dataset.rerollCrit  = meta.rerollCrit;
          return b;
        };
        if (keepOriginalSlot) keepOriginalSlot.appendChild(makeKeepBtn("original"));
        if (keepRerollSlot)   keepRerollSlot.appendChild(makeKeepBtn("reroll"));

        html.querySelectorAll(".soc2e-keep-choice").forEach(keepBtn => {
          keepBtn.addEventListener("click", async () => {
            if (keepBtn.dataset.choosing) return;
            keepBtn.dataset.choosing = "true";
            keepBtn.disabled = true;

            const choice       = keepBtn.dataset.choice;
            const kChanneling  = keepBtn.dataset.channeling  === "true";
            const kOrigCrit    = keepBtn.dataset.originalCrit === "true";
            const kRerollCrit  = keepBtn.dataset.rerollCrit  === "true";

            if (choice === "reroll") {
              const kActor = await fromUuid(keepBtn.dataset.actorUuid);
              if (kActor) {
                // Undo original crit corruption (if crit was the sole source, not channeling)
                // Apply reroll crit corruption (if reroll critted and channeling didn't already cover it)
                let delta = 0;
                if (!kChanneling && kOrigCrit)   delta -= 1;
                if (!kChanneling && kRerollCrit) delta += 1;
                if (delta !== 0) {
                  const cur = kActor.system.corruption ?? 0;
                  await kActor.update({ "system.corruption": Math.max(0, cur + delta) });
                }
              }
            }

            await message.update({ "flags.soc2e.keepChoice": choice });
          });
        });
      }
    }
  } // end if (rerollBtnWrap || rerollSection)

  // Initiative keep-choice buttons (shown after an initiative reroll)
  const initiativeMeta = message.flags?.soc2e?.initiativeMeta;
  const initiativeStored = message.flags?.soc2e?.rerollResult;
  if (initiativeMeta && initiativeStored) {
    const keepChoice = message.flags?.soc2e?.keepChoice;
    const keepOriginalSlot = html.querySelector(".soc2e-keep-original-slot");
    const keepRerollSlot   = html.querySelector(".soc2e-keep-reroll-slot");

    if (keepChoice) {
      const kept   = `<span style="color:green;font-weight:bold;" title="Kept">&#x2714;</span>`;
      const passed = `<span style="color:#aaa;" title="Not kept">&#x2718;</span>`;
      if (keepOriginalSlot) keepOriginalSlot.innerHTML = keepChoice === "original" ? kept : passed;
      if (keepRerollSlot)   keepRerollSlot.innerHTML   = keepChoice === "reroll"   ? kept : passed;
    } else {
      const makeKeepBtn = (choice) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "soc2e-keep-choice";
        b.title = choice === "original" ? "Keep original roll" : "Keep reroll";
        b.textContent = "✓";
        b.dataset.choice       = choice;
        b.dataset.actorUuid    = initiativeMeta.actorUuid;
        b.dataset.rerollValue  = initiativeMeta.rerollValue;
        return b;
      };
      if (keepOriginalSlot) keepOriginalSlot.appendChild(makeKeepBtn("original"));
      if (keepRerollSlot)   keepRerollSlot.appendChild(makeKeepBtn("reroll"));

      html.querySelectorAll(".soc2e-keep-choice").forEach(keepBtn => {
        keepBtn.addEventListener("click", async () => {
          if (keepBtn.dataset.choosing) return;
          keepBtn.dataset.choosing = "true";
          keepBtn.disabled = true;

          const choice      = keepBtn.dataset.choice;
          const rerollValue = parseInt(keepBtn.dataset.rerollValue, 10);

          if (choice === "reroll") {
            const kActor = await fromUuid(keepBtn.dataset.actorUuid);
            if (kActor && game.combat) {
              const combatant = game.combat.combatants.find(c => c.actorId === kActor.id);
              if (combatant) {
                await game.combat.updateEmbeddedDocuments("Combatant", [{ _id: combatant.id, initiative: rerollValue }]);
              }
            }
          }

          await message.update({ "flags.soc2e.keepChoice": choice });
        });
      });
    }
  }

  html.querySelectorAll(".soc2e-roll-damage").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;

      const actorUuid  = btn.dataset.actorUuid;
      const damage     = btn.dataset.damage;
      const addStrDm   = btn.dataset.addStrDm === "true";
      const effect     = parseInt(btn.dataset.effect, 10);
      const weaponName = btn.dataset.weaponName || null;
      const weaponImg  = btn.dataset.weaponImg  || null;

      const actor = await fromUuid(actorUuid);
      if (!actor) { ui.notifications.error("Actor not found."); return; }

      const strDm = addStrDm ? (actor.system.attributes.str?.dm ?? 0) : 0;
      const mod   = effect + strDm;

      const dmgFormula = mod !== 0 ? `${damage} + @mod` : damage;
      const dmgRoll    = await new Roll(dmgFormula, { mod }).evaluate();
      const rawTotal   = dmgRoll.total;
      const finalDmg   = Math.max(1, rawTotal);

      const bonusParts = [];
      if (effect !== 0) bonusParts.push(`Effect ${effect >= 0 ? "+" : ""}${effect}`);
      if (strDm   !== 0) bonusParts.push(`STR ${strDm >= 0 ? "+" : ""}${strDm}`);
      const clampNote  = finalDmg !== rawTotal ? ` <i style="font-size:0.85em;">(min 1)</i>` : "";

      const headerHtml = (weaponImg && weaponName)
        ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
             <img src="${weaponImg}" alt="${weaponName}" style="width:36px;height:36px;object-fit:contain;border:none;"/>
             <b>${weaponName}</b>
           </div>`
        : "";

      const parens    = bonusParts.length ? ` (${bonusParts.join(", ")})` : "";
      const modStr    = `${mod >= 0 ? "+" : ""}${mod}`;
      const dmgLabel = weaponName ? `${weaponName} Damage` : "Damage";
      const dmgFlavor = `<div style="font-size:1.1em;line-height:1.7;">
        ${headerHtml}
        <div>DM: <b>${modStr}</b>${parens}${clampNote}</div>
        <div style="display:flex;align-items:baseline;justify-content:space-between;">
          <div>Damage: <b>${finalDmg}</b>${clampNote}</div>
          <div class="soc2e-reroll-btn"><button type="button" class="soc2e-reroll"
              data-actor-uuid="${actor.uuid}"
              data-formula="${dmgFormula}"
              data-mod="${mod}"
              data-tn="-1"
              data-min-one="true"
              data-label="${dmgLabel.replace(/"/g, "&quot;")}">Reroll</button></div>
        </div>
        <div class="soc2e-reroll-section"></div>
      </div>`;

      const speaker = ChatMessage.getSpeaker({ actor });
      if (actor.type === "npc") speaker.alias = `${speaker.alias} (NPC)`;
      const rollMode = game.settings.get("core", "rollMode");
      await dmgRoll.toMessage({ speaker, flavor: dmgFlavor, rollMode });

      btn.textContent = "Damage Rolled";
      html.querySelectorAll(".soc2e-roll-damage").forEach(b => {
        if (b !== btn) b.disabled = true;
      });
    });
  });
});

/* -------------------------------------------- */
/*  Default Prototype Token                      */
/* -------------------------------------------- */

// For every new actor, pre-populate the prototype token with both bars
// always visible, bar1 = lifeblood (red), bar2 = stamina (green).
Hooks.on("preCreateActor", (actor, data) => {
  if (foundry.utils.hasProperty(data, "prototypeToken.bar1.attribute")) return;
  actor.updateSource({
    "prototypeToken.bar1.attribute": "lifeblood",
    "prototypeToken.bar1.color":     "#CC2222",
    "prototypeToken.bar2.attribute": "stamina",
    "prototypeToken.bar2.color":     "#22AA44",
    "prototypeToken.displayBars":    CONST.TOKEN_DISPLAY_MODES.ALWAYS,
  });
});

/* -------------------------------------------- */
/*  Handlebars Helpers                           */
/* -------------------------------------------- */

function _registerHelpers() {
  /** Format a DM with explicit sign: +0, +1, −2, etc. */
  Handlebars.registerHelper("dmSign", (val) => {
    const n = parseInt(val) || 0;
    return n >= 0 ? `+${n}` : `${n}`;
  });

  /** Repeat a block N times, providing the index as context */
  Handlebars.registerHelper("times", (n, options) => {
    let result = "";
    for (let i = 0; i < n; i++) result += options.fn(i);
    return result;
  });

  Handlebars.registerHelper("eq",  (a, b) => a === b);
  Handlebars.registerHelper("lt",  (a, b) => a < b);
  Handlebars.registerHelper("gt",  (a, b) => a > b);
  Handlebars.registerHelper("add", (a, b) => a + b);
}

/* -------------------------------------------- */
/*  Template Preloading                          */
/* -------------------------------------------- */

async function _preloadTemplates() {
  return foundry.applications.handlebars.loadTemplates([
    "systems/soc2e/templates/actor/character-sheet.hbs",
    "systems/soc2e/templates/actor/npc-sheet.hbs",
    "systems/soc2e/templates/actor/vehicle-sheet.hbs",
    "systems/soc2e/templates/item/item-sheet.hbs",
  ]);
}
