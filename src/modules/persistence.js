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
import { escapeAttr } from './utils.js';
import { sanitizeRichText } from './dom-utils.js';

const CHARACTER_STATE = state.CHARACTER_STATE;

const DEFAULT_KEY = 'dnd_ficha_v1';
const KEY_POINTER  = 'dnd_active_key';
let   SAVE_KEY     = localStorage.getItem(KEY_POINTER) || DEFAULT_KEY;

let _pendingImport = null;
let _saveTimer     = null;

const _beforeSaveHooks = [];
const _afterLoadHooks  = [];
export function registerBeforeSave(fn) { _beforeSaveHooks.push(fn); }
export function registerAfterLoad(fn)  { _afterLoadHooks.push(fn); }

export function getSaveKey() { return SAVE_KEY; }

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
    [
      'heroEpithet', 'charDeity', 'charPlayerName', 'langComp',
      'personalityTraits', 'personalityIdeals', 'personalityBonds', 'personalityFlaws'
    ].forEach(id => {
      const val = data[id] ?? data.editables?.[id];
      if (val != null) {
        const el = g(id);
        if (el) el.textContent = val;
      }
    });
    ['combatNotesCE', 'charHistoryCE', 'generalNotes'].forEach(id => {
      const val = data[id] ?? data.editables?.[id];
      if (val != null) {
        const el = g(id);
        if (el) el.innerHTML = val;
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
    setTimeout(() => openRoster(false), 300);
  }
}

function _rosterChars() {
  const chars = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith('dnd_ficha_') || !key.endsWith('_v1')) continue;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data?.charName) chars.push({ key, data });
    } catch {}
  }
  return chars.sort((a, b) =>
    (a.data.charName || '').localeCompare(b.data.charName || '', 'es'));
}

function _renderRosterCards(cards) {
  cards.innerHTML = '';
  const chars = _rosterChars();
  if (chars.length === 0) {
    cards.innerHTML = '<div class="roster-loading">No hay personajes guardados.<br>Creá uno nuevo o importá un JSON.</div>';
    return;
  }
  chars.forEach(({ key, data }) => {
    const isActive = key === SAVE_KEY;
    const card = document.createElement('div');
    card.className = 'roster-card' + (isActive ? ' roster-card-active' : '');

    const delBtn = document.createElement('button');
    delBtn.className = 'roster-card-del';
    delBtn.title = 'Eliminar personaje';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteRosterCharacter(key); });
    card.appendChild(delBtn);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'roster-card-name';
    nameDiv.textContent = data.charName || 'Personaje';
    card.appendChild(nameDiv);

    const classDiv = document.createElement('div');
    classDiv.className = 'roster-card-class';
    classDiv.textContent = data.metaValues?.[0] || '—';
    card.appendChild(classDiv);

    const raceDiv = document.createElement('div');
    raceDiv.className = 'roster-card-race';
    raceDiv.textContent = [data.metaValues?.[2], data.metaValues?.[3]].filter(Boolean).join(' · ') || '—';
    card.appendChild(raceDiv);

    if (!isActive) card.onclick = () => loadRosterCharacter(data);
    cards.appendChild(card);
  });
}

export function openRoster(allowClose) {
  const overlay  = document.getElementById('rosterOverlay');
  const cards    = document.getElementById('rosterCards');
  const closeBtn = document.getElementById('rosterCloseBtn');
  if (!overlay) return;
  if (closeBtn) closeBtn.style.display = allowClose ? 'inline-flex' : 'none';
  overlay.classList.add('open');
  _renderRosterCards(cards);
}

export function closeRoster() {
  document.getElementById('rosterOverlay')?.classList.remove('open');
}

export function loadRosterCharacter(data) {
  const newKey = makeSaveKey(data.charName);
  SAVE_KEY = newKey;
  localStorage.setItem(KEY_POINTER, SAVE_KEY);
  _saveImages(SAVE_KEY, data);
  const slim = { ...data, portrait: null, bgImage: null };
  localStorage.setItem(SAVE_KEY, JSON.stringify(slim));
  window.loadState?.(data);
  closeRoster();
  showToast(`✦ ${data.charName} cargado`);
}

export function deleteRosterCharacter(key) {
  let name = key;
  try { name = JSON.parse(localStorage.getItem(key) || '{}').charName || key; } catch {}
  if (!confirm(`¿Eliminar la ficha de "${name}"?\nEsta acción no se puede deshacer.`)) return;
  localStorage.removeItem(key);
  localStorage.removeItem(_imgKey(key, 'portrait'));
  localStorage.removeItem(_imgKey(key, 'bgImage'));
  if (key === SAVE_KEY) {
    localStorage.removeItem(KEY_POINTER);
    SAVE_KEY = DEFAULT_KEY;
  }
  const cards = document.getElementById('rosterCards');
  if (cards) _renderRosterCards(cards);
  showToast(`✦ Ficha de "${name}" eliminada`);
}

export function autoSave() {
  setInterval(saveState, 30000);
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(KEY_POINTER);
  SAVE_KEY = DEFAULT_KEY;
  showToast('Datos borrados');
  location.reload();
}

export function newSheet() {
  if (!confirm('¿Crear una ficha en blanco?\nSe perderán todos los datos actuales.')) return;
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(KEY_POINTER);
  SAVE_KEY = DEFAULT_KEY;
  location.reload();
}

export function exportHTML() {
  const html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const baseName = CHARACTER_STATE.charName
    ? CHARACTER_STATE.charName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    : 'personaje';
  a.download = baseName + '_ficha.html';
  a.click();
  showToast('✦ HTML exportado');
}

export function exportJSON() {
  window.saveState?.();
  const blob = new Blob([JSON.stringify(CHARACTER_STATE, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const baseName = CHARACTER_STATE.charName
    ? CHARACTER_STATE.charName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    : 'personaje';
  a.download = baseName + '_ficha.json';
  a.click();
  showToast('✦ JSON exportado');
}

export function importJSON() {
  document.getElementById('jsonImport').click();
}

export function doImportJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.charName || typeof imported.charName !== 'string') throw new Error('Falta charName');
      if (!imported.scores || typeof imported.scores !== 'object')     throw new Error('Falta scores (atributos)');
      if (!imported.hp || isNaN(parseInt(imported.hp.max)))            throw new Error('Falta hp.max (valor inválido o faltante)');
      showJSONReview(imported);
    } catch(err) {
      showToast('✕ Error al importar JSON: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

export function showJSONReview(data) {
  _pendingImport = data;
  document.getElementById('jsonReviewModal')?.remove();

  const scores = data.scores || {};
  const hp     = data.hp     || {};
  const meta   = data.metaValues || [];

  const nSpells  = Array.isArray(data.spells)    ? data.spells.length    : 0;
  const nTraits  = Array.isArray(data.traits)    ? data.traits.length    : 0;
  const nItems   = Array.isArray(data.inventory) ? data.inventory.length : 0;
  const nAttacks = Array.isArray(data.attacks)   ? data.attacks.length   : 0;
  const summaryParts = [
    nSpells  ? `${nSpells} conjuro${nSpells  !== 1 ? 's' : ''}`  : '',
    nTraits  ? `${nTraits} rasgo${nTraits    !== 1 ? 's' : ''}`  : '',
    nItems   ? `${nItems} ítem${nItems       !== 1 ? 's' : ''}`  : '',
    nAttacks ? `${nAttacks} ataque${nAttacks !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);
  const summaryHTML = summaryParts.length
    ? `<div style="background:var(--bg-deep);border:1px solid var(--border);border-radius:6px;padding:9px 14px;font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:4px;">
         También se importará: ${summaryParts.join(' · ')}
       </div>`
    : '';

  const sI = 'width:100%;background:var(--bg-deep);border:1px solid var(--border);color:var(--text-primary);padding:5px 8px;border-radius:6px;font-family:Cinzel,serif;font-size:12px;box-sizing:border-box;';
  const sL = 'font-family:Cinzel,serif;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:3px;';
  const field = (id, label, val, type = 'text') =>
    `<div><label style="${sL}">${label}</label><input id="jr_${id}" type="${type}" value="${escapeAttr(String(val ?? ''))}" style="${sI}"></div>`;

  const modal = document.createElement('div');
  modal.id = 'jsonReviewModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9997;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);overflow-y:auto;padding:16px;';
  modal.innerHTML = `
    <div style="background:var(--bg-card);border:2px solid var(--gold);border-radius:12px;padding:28px;max-width:520px;width:100%;box-shadow:0 0 60px rgba(201,168,76,0.25);font-family:'IM Fell English',serif;">
      <div style="font-family:'Cinzel Decorative',serif;font-size:18px;color:var(--gold);text-align:center;margin-bottom:4px;">⚔ Revisar personaje</div>
      <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:20px;">Revisá y editá los datos antes de cargar</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        ${field('name',  'Nombre',                    data.charName)}
        ${field('class', 'Clase y nivel',             meta[0] || '')}
        ${field('race',  'Raza',                      meta[2] || '')}
        ${field('bg',    'Trasfondo / Alineamiento',  meta[3] || '')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
        ${field('hpMax', 'PG Máximos', parseInt(hp.max)  || 1,   'number')}
        ${field('ac',    'CA',         parseInt(data.statAC)  || 10,  'number')}
        ${field('speed', 'Velocidad',  data.statSpeed || '9m')}
      </div>

      <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">Puntuaciones de característica</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:16px;">
        ${['STR','DEX','CON','INT','WIS','CHA'].map(a =>
          `<div><label style="${sL}">${a}</label><input id="jr_${a}" type="number" min="1" max="30" value="${parseInt(scores[a]) || 10}" style="${sI}"></div>`
        ).join('')}
      </div>

      ${summaryHTML}

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button class="btn btn-sm" onclick="document.getElementById('jsonReviewModal').remove();">✕ Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="confirmJSONImport()">✦ Importar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

export function confirmJSONImport() {
  if (!_pendingImport) return;
  const g = id => document.getElementById('jr_' + id);

  const name  = g('name')?.value.trim()  || _pendingImport.charName;
  const cls   = g('class')?.value.trim() || '';
  const race  = g('race')?.value.trim()  || '';
  const bg    = g('bg')?.value.trim()    || '';
  const hpMax = parseInt(g('hpMax')?.value) || parseInt(_pendingImport.hp?.max) || 1;
  const ac    = parseInt(g('ac')?.value)    || 10;
  const speed = g('speed')?.value.trim()   || _pendingImport.statSpeed || '9m';

  const scores = {};
  ['STR','DEX','CON','INT','WIS','CHA'].forEach(a => {
    scores[a] = String(Math.max(1, Math.min(30, parseInt(g(a)?.value) || parseInt(_pendingImport.scores?.[a]) || 10)));
  });

  const meta = [...(_pendingImport.metaValues || ['', '', '', ''])];
  if (cls)  meta[0] = cls;
  if (race) meta[2] = race;
  if (bg)   meta[3] = bg;

  const imported = {
    ..._pendingImport,
    charName:  name,
    scores,
    statAC:    String(ac),
    statSpeed: String(speed),
    metaValues: meta,
    hp: {
      ..._pendingImport.hp,
      max:     String(hpMax),
      current: String(Math.min(parseInt(_pendingImport.hp?.current || hpMax), hpMax)),
    },
  };

  try {
    state.spells      = [];
    state.inventory   = [];
    state.attacks     = [];
    state.traits      = [];
    state.combatLog   = [];
    renderCombatLog();
    state.concentrationSpell = null;
    state.spellSlotsState = Object.fromEntries([1,2,3,4,5,6,7,8,9].map(i => [i, {max:0,used:0}]));
    state.pactSlotsState  = { level: 0, max: 0, used: 0 };

    const newKey = makeSaveKey(name);
    SAVE_KEY = newKey;
    localStorage.setItem(KEY_POINTER, SAVE_KEY);
    _saveImages(SAVE_KEY, imported);
    const slim = { ...imported, portrait: null, bgImage: null };
    localStorage.setItem(SAVE_KEY, JSON.stringify(slim));
    window.loadState?.(imported);
    document.getElementById('jsonReviewModal')?.remove();
    _pendingImport = null;
    showToast('✦ JSON importado correctamente');
  } catch(err) {
    showToast('✕ Error al importar: ' + err.message);
  }
}

export async function shareViaURL() {
  window.saveState?.();
  const st = { ...CHARACTER_STATE };
  delete st.portrait;
  delete st.bgImage;
  delete st.heroBgStyle;

  const json = JSON.stringify(st);
  let encoded;
  try {
    const blob   = new Blob([json]);
    const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
    const buf    = await new Response(stream).arrayBuffer();
    const bytes  = new Uint8Array(buf);
    let binary   = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    encoded = btoa(binary);
  } catch {
    encoded = btoa(unescape(encodeURIComponent(json)));
  }

  const url = location.origin + location.pathname + '#share=' + encoded;
  try {
    await navigator.clipboard.writeText(url);
    showToast('🔗 URL copiada al portapapeles');
  } catch {
    prompt('Copia esta URL para compartir la ficha:', url);
  }
}

export async function checkShareHash() {
  const hash = location.hash;
  if (!hash.startsWith('#share=')) return;
  const encoded = hash.slice(7);
  if (!encoded) return;
  try {
    let json;
    try {
      const bytes  = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      json = await new Response(stream).text();
    } catch {
      json = decodeURIComponent(escape(atob(encoded)));
    }
    const data = JSON.parse(json);
    const name = data.charName || 'Sin nombre';
    if (confirm(`¿Importar la ficha de "${name}" recibida por URL?`)) {
      const key = makeSaveKey(name);
      localStorage.setItem(key, json);
      localStorage.setItem(KEY_POINTER, key);
      SAVE_KEY = key;
      loadFromLocal();
      history.replaceState(null, '', location.pathname);
      showToast('✦ Ficha importada desde URL');
    }
  } catch(e) {
    console.warn('[share] Error al leer hash:', e);
  }
}

// Window bridge
window.saveToLocal           = saveToLocal;
window.openRoster            = openRoster;
window.closeRoster           = closeRoster;
window.loadRosterCharacter   = loadRosterCharacter;
window.deleteRosterCharacter = deleteRosterCharacter;
window.clearSave             = clearSave;
window.newSheet              = newSheet;
window.exportHTML            = exportHTML;
window.exportJSON            = exportJSON;
window.importJSON            = importJSON;
window.doImportJSON          = doImportJSON;
window.confirmJSONImport     = confirmJSONImport;
window.shareViaURL           = shareViaURL;
window.makeSaveKey           = makeSaveKey;
window.migrateState          = migrateState;
