import { state } from '../state.js';
import { showToast, renderCombatLog } from './toast-log.js';
import { applyClassTheme, applyFontScale, applyPanelOpacity } from './theme.js';
import { renderDeathSaves } from './death-saves.js';
import { renderExhaustion } from './conditions.js';
import { calcMod, renderSaves, renderSpellStats } from './attributes.js';
import { renderSkills } from './skills.js';
import { renderHitDice, _migrateHitDice, _hdTotalSpent } from './hit-dice.js';
import { renderRage } from './rage.js';
import { normalizeAttack } from './attacks.js';
import { normalizeInventoryItem } from './inventory.js';
import { updateHP } from './hp.js';
import { updateXP } from './xp.js';
import { sanitizeRichText } from './dom-utils.js';

const CHARACTER_STATE = state.CHARACTER_STATE;

export const DEFAULT_KEY = 'dnd_ficha_v1';
export const KEY_POINTER = 'dnd_active_key';
let   SAVE_KEY = localStorage.getItem(KEY_POINTER) || DEFAULT_KEY;

let _saveTimer = null;
let _skipSave  = false;
export function skipNextSave() { _skipSave = true; }

const _beforeSaveHooks = [];
const _afterLoadHooks  = [];
export function registerBeforeSave(fn) { _beforeSaveHooks.push(fn); }
export function registerAfterLoad(fn)  { _afterLoadHooks.push(fn); }

export function getSaveKey() { return SAVE_KEY; }
export function setSaveKey(key) { SAVE_KEY = key; }

export function makeSaveKey(name) {
  if (!name) return DEFAULT_KEY;
  return 'dnd_ficha_' + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_v1';
}

export function _imgKey(saveKey, field) { return saveKey + '_img_' + field; }

export function _saveImages(saveKey, st) {
  ['portrait', 'bgImage'].forEach(field => {
    const key  = _imgKey(saveKey, field);
    const data = st[field];
    if (data) {
      try { localStorage.setItem(key, data); } catch(_) {}
    } else {
      try { localStorage.removeItem(key); } catch(_) {}
    }
  });
}

export function _loadImages(saveKey, target) {
  ['portrait', 'bgImage'].forEach(field => {
    const val = localStorage.getItem(_imgKey(saveKey, field));
    if (val) target[field] = val;
  });
}

export function saveState() {
  if (_skipSave) return;
  _beforeSaveHooks.forEach(fn => fn());
  const g = id => document.getElementById(id);

  CHARACTER_STATE.charName   = g('charName')?.textContent || CHARACTER_STATE.charName;
  CHARACTER_STATE.metaValues = Array.from(document.querySelectorAll('.meta-value')).map(el => el.textContent);
  CHARACTER_STATE.hp         = { current: parseInt(g('hpCurrent')?.textContent) || 0, max: parseInt(g('hpMax')?.textContent) || 0, temp: parseInt(g('hpTemp')?.textContent) || 0 };
  CHARACTER_STATE.xp         = { current: g('xpCurrent')?.textContent, next: g('xpNext')?.textContent };
  CHARACTER_STATE.statAC     = g('statAC')?.textContent;
  CHARACTER_STATE.statInit   = g('statInit')?.textContent;
  CHARACTER_STATE.statSpeed  = g('statSpeed')?.textContent;
  CHARACTER_STATE.scores     = { STR: g('score-STR')?.value, DEX: g('score-DEX')?.value, CON: g('score-CON')?.value, INT: g('score-INT')?.value, WIS: g('score-WIS')?.value, CHA: g('score-CHA')?.value };
  CHARACTER_STATE.skills     = window.skillsState.map(s => ({ prof: s.prof, expert: s.expert }));
  CHARACTER_STATE.attacks    = state.attacks;
  CHARACTER_STATE.inventory  = state.inventory;
  CHARACTER_STATE.profBonus  = g('profBonus')?.textContent;
  CHARACTER_STATE.inspiration = g('inspirationBox')?.classList.contains('active') || false;
  CHARACTER_STATE.rageActive  = state.rageActive;
  CHARACTER_STATE.roundCounter = g('roundCounter')?.textContent;
  CHARACTER_STATE.savedAt     = Date.now();
  CHARACTER_STATE.saveProfs   = Array.from(document.querySelectorAll('.save-row'))
    .map(row => row.querySelector('.save-prof')?.classList.contains('active') || false);

  CHARACTER_STATE.editables = {};
  document.querySelectorAll('[contenteditable][id]').forEach(el => {
    CHARACTER_STATE.editables[el.id] = el.innerHTML;
  });

  CHARACTER_STATE.activeConditions = Array.from(document.querySelectorAll('.condition-tag')).map(el => el.classList.contains('active'));
  CHARACTER_STATE.hitDiceSpent     = _hdTotalSpent();
  CHARACTER_STATE.rageUsesSpent    = CHARACTER_STATE.rageUsesSpent || 0;

  CHARACTER_STATE.journalHTML    = g('journalContainer')?.innerHTML || '';
  CHARACTER_STATE.spells             = state.spells;
  CHARACTER_STATE.spellSlotsState    = state.spellSlotsState;
  CHARACTER_STATE.pactSlotsState     = state.pactSlotsState;
  CHARACTER_STATE.concentrationSpell = state.concentrationSpell;
  CHARACTER_STATE.traits             = state.traits;
  CHARACTER_STATE.combatLogEntries = state.combatLog;

  CHARACTER_STATE.heroBgStyle    = document.querySelector('.hero-bg')?.style.backgroundImage || '';
  CHARACTER_STATE.bgLayerOpacity = g('bgOpacity')?.value || '8';

  const desiredKey = makeSaveKey(CHARACTER_STATE.charName);
  if (desiredKey !== SAVE_KEY) {
    localStorage.removeItem(SAVE_KEY);
    SAVE_KEY = desiredKey;
    localStorage.setItem(KEY_POINTER, SAVE_KEY);
  }

  _saveImages(SAVE_KEY, CHARACTER_STATE);
  const slim = { ...CHARACTER_STATE, portrait: null, bgImage: null };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(slim));
  } catch(e) {
    showToast('✕ Error al guardar — espacio insuficiente');
    return;
  }

  const el = g('lastSaved');
  if (el) el.textContent = new Date().toLocaleTimeString('es-ES');
}

export function saveToLocal() {
  if (_skipSave) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => window.saveState?.(), 500);
}

export function migrateState(raw) {
  const v = raw.version ?? 1;
  if (v < 2) {
    raw.deathSaves         ??= { s: 0, f: 0 };
    raw.concentrationSpell ??= null;
    raw.rageActive         ??= false;
    raw.conditions         ??= [];
    raw.exhaustion         ??= 0;
    raw.initBonus          ??= 0;
    raw.unarmedDefFormula  ??= 'standard';
    raw.multiclass         ??= false;
    raw.spellcastingAttr   ??= 'INT';
    raw.version             = 2;
  }
  return raw;
}

export function loadState(directData) {
  let data;
  if (directData) {
    data = directData;
  } else {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try { data = JSON.parse(raw); } catch(e) { return; }
    if (!data.portrait && !data.bgImage) _loadImages(SAVE_KEY, data);
  }
  try {
    const g = id => document.getElementById(id);

    Object.assign(CHARACTER_STATE, migrateState(data));

    if (Array.isArray(data.combatLogEntries)) {
      state.combatLog = data.combatLogEntries.slice(0, 50);
      renderCombatLog();
    }

    if (data.charName && g('charName')) g('charName').textContent = data.charName;
    if (data.metaValues?.length) {
      document.querySelectorAll('.meta-value').forEach((el, i) => {
        if (data.metaValues[i] != null) el.textContent = data.metaValues[i];
      });
    }
    if (data.hp) {
      if (g('hpCurrent')) g('hpCurrent').textContent = data.hp.current;
      if (g('hpMax'))     g('hpMax').textContent     = data.hp.max;
      if (g('hpTemp') && data.hp.temp) g('hpTemp').textContent = data.hp.temp;
    }
    if (data.xp) {
      if (g('xpCurrent')) g('xpCurrent').textContent = data.xp.current;
      if (g('xpNext'))    g('xpNext').textContent    = data.xp.next;
    }
    ['statAC','statInit','statSpeed','profBonus'].forEach(k => {
      if (data[k] && g(k)) g(k).textContent = data[k];
    });
    if (data.roundCounter && g('roundCounter')) g('roundCounter').textContent = data.roundCounter;
    if (data.scores?.DEX) {
      const dexMod = Math.floor((parseInt(data.scores.DEX) - 10) / 2);
      CHARACTER_STATE.initBonus = data.statInit
        ? (parseInt(data.statInit) || 0) - dexMod
        : 0;
    } else {
      CHARACTER_STATE.initBonus = 0;
    }
    if (data.scores) {
      Object.entries(data.scores).forEach(([a, v]) => {
        const el = g('score-' + a);
        if (el) el.value = v;
        calcMod(a);
      });
    }
    if (data.skills?.length) {
      data.skills.forEach((s, i) => {
        if (window.skillsState[i]) { window.skillsState[i].prof = s.prof; window.skillsState[i].expert = s.expert; }
      });
      renderSkills();
    }
    if (data.attacks)   { state.attacks   = data.attacks.map(normalizeAttack);              window.renderAttacks?.(); }
    if (data.inventory) { state.inventory = data.inventory.map(normalizeInventoryItem);  window.renderInventory?.(); }
    if (data.inspiration) g('inspirationBox')?.classList.add('active');

    if (data.classThemeIndex != null) applyClassTheme(data.classThemeIndex, true);

    if (data.fontScale != null) {
      const slider = g('fontSizeSlider');
      if (slider) slider.value = data.fontScale;
      applyFontScale(data.fontScale);
    }
    if (data.panelOpacity != null) {
      const slider = g('panelOpacitySlider');
      if (slider) slider.value = data.panelOpacity;
      applyPanelOpacity(data.panelOpacity);
    }

    if (data.portrait) {
      const img = g('portrait-img');
      if (img) { img.src = data.portrait; img.removeAttribute('data-empty'); }
    }
    if (data.bgImage) {
      const layer = g('bg-layer');
      if (layer) layer.style.backgroundImage = `url(${data.bgImage})`;
      const heroBg = document.querySelector('.hero-bg');
      if (heroBg) heroBg.style.backgroundImage = `url(${data.bgImage})`;
    }
    if (data.heroBgStyle && !data.bgImage) {
      const heroBg = document.querySelector('.hero-bg');
      if (heroBg) heroBg.style.backgroundImage = data.heroBgStyle;
    }
    if (data.bgLayerOpacity != null) {
      const slider = g('bgOpacity');
      const layer  = g('bg-layer');
      if (slider) slider.value = data.bgLayerOpacity;
      if (layer)  layer.style.opacity = data.bgLayerOpacity / 100;
    }

    if (data.editables) {
      Object.entries(data.editables).forEach(([id, html]) => {
        const el = g(id);
        if (el && el.hasAttribute('contenteditable')) el.innerHTML = sanitizeRichText(html);
      });
    }

    if (data.deathSaves) {
      CHARACTER_STATE.deathSaves = data.deathSaves;
    } else if (data.deathChecks?.length >= 6) {
      const c = data.deathChecks.slice(0, 6);
      CHARACTER_STATE.deathSaves = { s: c.slice(0,3).filter(Boolean).length, f: c.slice(3,6).filter(Boolean).length };
    }
    renderDeathSaves();

    if (data.activeConditions) {
      const tags = document.querySelectorAll('.condition-tag');
      data.activeConditions.forEach((active, i) => {
        if (tags[i]) tags[i].classList.toggle('active', active);
      });
    }

    if (Array.isArray(data.hitDice) && data.hitDice.length) {
      CHARACTER_STATE.hitDice = data.hitDice.map(d => ({
        die: d.die || 'd8', count: parseInt(d.count)||1, spent: parseInt(d.spent)||0
      }));
    } else {
      CHARACTER_STATE.hitDice = [];
      if (data.hitDieType) CHARACTER_STATE.hitDieType = data.hitDieType;
      if (data.hitDiceSpent != null) CHARACTER_STATE.hitDiceSpent = data.hitDiceSpent;
      else if (data.hitDiceUsed) CHARACTER_STATE.hitDiceSpent = data.hitDiceUsed.filter(Boolean).length;
    }
    _migrateHitDice();
    renderHitDice();
    window._updateOptionalFields?.();

    state.rageActive = !!data.rageActive;
    if (data.rageUsesSpent != null) CHARACTER_STATE.rageUsesSpent = data.rageUsesSpent;
    else if (data.ragePipsUsed)     CHARACTER_STATE.rageUsesSpent = data.ragePipsUsed.slice(0,2).filter(Boolean).length;
    if (data.classResource) {
      CHARACTER_STATE.classResource = data.classResource;
    } else if (data.rageMaxUses != null) {
      CHARACTER_STATE.classResource.maxUses = data.rageMaxUses;
    }
    CHARACTER_STATE.extraClassResources = Array.isArray(data.extraClassResources) ? data.extraClassResources : [];
    CHARACTER_STATE.levelHistory = (data.levelHistory && typeof data.levelHistory === 'object') ? data.levelHistory : {};
    renderRage();

    if (data.unarmedDefFormula) {
      const sel = document.getElementById('unarmedDefSelect');
      if (sel) sel.value = data.unarmedDefFormula;
    }

    if (data.saveProfs) {
      const rows = document.querySelectorAll('.save-row');
      data.saveProfs.forEach((active, i) => {
        if (rows[i]) rows[i].querySelector('.save-prof')?.classList.toggle('active', active);
      });
      renderSaves();
    }

    if (data.journalHTML)    { const c = g('journalContainer'); if (c) c.innerHTML = sanitizeRichText(data.journalHTML); }
    if (data.spells && Array.isArray(data.spells)) {
      state.spells = data.spells;
      window.renderSpellBook?.();
    }
    if (data.spellSlotsState && typeof data.spellSlotsState === 'object') {
      state.spellSlotsState = {...state.spellSlotsState, ...data.spellSlotsState};
    }
    if (data.pactSlotsState && typeof data.pactSlotsState === 'object') {
      state.pactSlotsState = { level: 0, max: 0, used: 0, ...data.pactSlotsState };
    } else {
      state.pactSlotsState = { level: 0, max: 0, used: 0 };
    }
    window.renderSpellSlots?.();
    if (data.concentrationSpell !== undefined) {
      state.concentrationSpell = data.concentrationSpell;
      window.renderConcentration?.();
    }
    if (data.spellcastingAttr !== undefined) {
      CHARACTER_STATE.spellcastingAttr = data.spellcastingAttr;
      renderSpellStats();
    }
    if (Array.isArray(data.traits)) {
      state.traits = data.traits.map(t => ({
        name: t.name || 'Rasgo',
        desc: t.desc || '',
        maxUses: parseInt(t.maxUses) || 0,
        usesLeft: parseInt(t.usesLeft) ?? parseInt(t.maxUses) ?? 0,
        restType: t.restType || 'none',
        ...(t.subProperties ? { subProperties: t.subProperties } : {}),
      }));
      window.renderTraits?.();
    } else if (data.traitsHTML) {
      const c = g('traitsExtra');
      if (c) c.innerHTML = sanitizeRichText(data.traitsHTML);
    }

    // CODEX-10: campos de texto plano usan textContent para evitar XSS al importar JSON externo
    // Se sanitiza el HTML almacenado (puede contener <div> de sesiones anteriores) antes de asignar
    [
      'heroEpithet', 'charDeity', 'charPlayerName',
      'personalityTraits', 'personalityIdeals', 'personalityBonds', 'personalityFlaws'
    ].forEach(id => {
      const raw = data[id] ?? data.editables?.[id];
      if (raw != null) {
        const el = g(id);
        if (el) {
          const plain = String(raw)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          el.textContent = plain;
        }
      }
    });
    // langComp almacena HTML estructurado generado por el wizard — necesita innerHTML
    ['combatNotesCE', 'charHistoryCE', 'generalNotes', 'langComp'].forEach(id => {
      const val = data[id] ?? data.editables?.[id];
      if (val != null) {
        const el = g(id);
        if (el) el.innerHTML = sanitizeRichText(val);
      }
    });

    {
      const subVal = data.subclass || data.editables?.charSubclass || '';
      const pill  = document.getElementById('subclassPill');
      const label = document.getElementById('charSubclass');
      if (subVal && subVal !== '—' && subVal.trim()) {
        if (label) label.textContent = subVal;
        if (pill)  pill.style.display = '';
      }
    }

    if (data.exhaustion != null) CHARACTER_STATE.exhaustion = Math.max(0, Math.min(6, parseInt(data.exhaustion) || 0));
    renderExhaustion();
    updateHP();
    updateXP();
    window.syncInitPlayerName?.();
    _afterLoadHooks.forEach(fn => fn(data));
  } catch(e) { console.warn('[v10] Error loading state:', e); }
}

export function loadFromLocal() {
  const hasData = !!localStorage.getItem(SAVE_KEY);
  window.loadState?.();
  if (!hasData) {
    const openWizard = sessionStorage.getItem('openWizardOnLoad');
    if (openWizard) {
      sessionStorage.removeItem('openWizardOnLoad');
      setTimeout(() => window.openCreationWizard?.(), 300);
    } else {
      setTimeout(() => window.openRoster?.(false), 300);
    }
  }
}

export function autoSave() {
  setInterval(saveState, 30000);
}

// ── Window bridge ──────────────────────────────────────────────────────────
// roster.js y share.js registran sus propios bridges al cargarse.
window.saveToLocal  = saveToLocal;
window.makeSaveKey  = makeSaveKey;
window.migrateState = migrateState;

