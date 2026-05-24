import { state } from '../state.js';
import { showToast } from './toast-log.js';

let _editingSpellId  = null;
let _spellPresetsData = null;   // cache: spells.json { "0":[...], ..., "9":[...] }

export function addSpell()   { openSpellModal(null, 1); }
export function addCantrip() { openSpellModal(null, 0); }

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Asigna `val` al <select id=`id`>.
 * Si el valor no existe entre las opciones lo inserta como opción temporal
 * (data-custom="1") al principio, para que los presets con valores no estándar
 * (p.ej. "Personal (cono 4.5m)") no queden silenciados.
 */
function _setSelectValue(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  // Eliminar opción temporal anterior si existe
  el.querySelector('option[data-custom="1"]')?.remove();
  if (!val) { el.value = ''; return; }
  const exists = Array.from(el.options).some(o => o.value === val || o.text === val);
  if (!exists) {
    const opt = document.createElement('option');
    opt.value         = val;
    opt.textContent   = val;
    opt.dataset.custom = '1';
    el.insertBefore(opt, el.options[0]);
  }
  el.value = val;
}

// ── Preset PHB (spells.json) ────────────────────────────────────────────────

async function _loadSpellPresets() {
  if (_spellPresetsData) { _buildPhbOptions(); return; }
  try {
    const res = await fetch('src/data/spells.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _spellPresetsData = await res.json();
    _buildPhbOptions();
  } catch (e) {
    console.warn('[spell-modal] No se pudo cargar spells.json:', e);
  }
}

/** Rellena #smPreset con todos los hechizos de spells.json (por nivel). */
function _buildPhbOptions() {
  const sel = document.getElementById('smPreset');
  if (!sel || sel.dataset.built) return;
  const LEVEL_LABELS = [
    'Trucos (0)', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4',
    'Nivel 5',    'Nivel 6', 'Nivel 7', 'Nivel 8', 'Nivel 9',
  ];
  let html = '<option value="">— Elegir hechizo —</option>';
  for (let lv = 0; lv <= 9; lv++) {
    const spells = _spellPresetsData?.[String(lv)];
    if (!spells?.length) continue;
    html += `<optgroup label="${LEVEL_LABELS[lv]}">`;
    spells.forEach((sp, idx) => {
      html += `<option value="phb|${lv}|${idx}">${sp.name}</option>`;
    });
    html += '</optgroup>';
  }
  sel.innerHTML = html;
  sel.dataset.built  = '1';
  sel.dataset.source = 'phb';
}

// ── Selector de clase → hechizos de SPELL_PRESETS ───────────────────────────

/** Cambia #smPreset al listado de hechizos de la clase elegida. */
export function onSpellClassChange() {
  const cls     = document.getElementById('smSourceClass')?.value || '';
  const presetSel = document.getElementById('smPreset');
  if (!presetSel) return;

  if (!cls) {
    // Sin clase → volver al listado PHB completo
    delete presetSel.dataset.built;
    delete presetSel.dataset.source;
    delete presetSel.dataset.cls;
    _loadSpellPresets();
    return;
  }

  const data = window.getSpellsForClass?.(cls);
  if (!data) {
    presetSel.innerHTML = '<option value="">— Sin datos para esta clase —</option>';
    return;
  }

  let html = '<option value="">— Elegir hechizo —</option>';
  if (data.cantrips.length) {
    html += '<optgroup label="Trucos">';
    data.cantrips.forEach((sp, idx) => {
      html += `<option value="class|cantrip|${idx}">${sp.name}</option>`;
    });
    html += '</optgroup>';
  }
  const byLevel = {};
  data.spells.forEach((sp, idx) => {
    (byLevel[sp.level] ??= []).push({ sp, idx });
  });
  Object.keys(byLevel).sort((a, b) => a - b).forEach(lv => {
    html += `<optgroup label="Nivel ${lv}">`;
    byLevel[lv].forEach(({ sp, idx }) => {
      html += `<option value="class|spell|${idx}">${sp.name}</option>`;
    });
    html += '</optgroup>';
  });

  presetSel.innerHTML    = html;
  presetSel.dataset.source = 'class';
  presetSel.dataset.cls    = cls;
  delete presetSel.dataset.built;
}

/** Rellena el formulario con el hechizo elegido en #smPreset. */
export function onSpellPresetChange() {
  const sel = document.getElementById('smPreset');
  if (!sel?.value) return;

  let sp = null;

  if (sel.dataset.source === 'class') {
    // Datos desde SPELL_PRESETS (via getSpellsForClass)
    const cls  = sel.dataset.cls;
    const data = window.getSpellsForClass?.(cls);
    if (!data) return;
    const [, type, rawIdx] = sel.value.split('|');
    const idx = parseInt(rawIdx);
    sp = type === 'cantrip'
      ? { ...data.cantrips[idx], level: 0 }
      : { ...data.spells[idx] };
  } else {
    // Datos desde spells.json (PHB list)
    const [, lv, idx] = sel.value.split('|');
    sp = _spellPresetsData?.[lv]?.[parseInt(idx)];
  }
  if (!sp) return;

  _fillFormFromSpell(sp);
}

function _fillFormFromSpell(sp) {
  document.getElementById('smName').value   = sp.name;
  document.getElementById('smLevel').value  = sp.level ?? 0;
  _setSelectValue('smSchool',     sp.school      || '');
  _setSelectValue('smCastTime',   sp.castTime    || '1 acción');
  _setSelectValue('smRange',      sp.range       || '');
  _setSelectValue('smComponents', sp.components  || '');
  _setSelectValue('smDuration',   sp.duration    || '');
  document.getElementById('smConc').checked    = sp.concentration || false;
  document.getElementById('smRitual').checked  = sp.ritual       || false;
  const saveEl = document.getElementById('smSave');
  if (saveEl) saveEl.value = sp.save   || '';
  const atkEl  = document.getElementById('smAttack');
  if (atkEl)  atkEl.value  = sp.attack || '';
  document.getElementById('smDesc').value       = sp.desc        || '';
  // smCastAttr y smSourceClass no se tocan aquí (el usuario los controla)
}

// ── Modal open / save / close ───────────────────────────────────────────────

export function openSpellModal(id = null, forceLevel = null) {
  const modal = document.getElementById('spellModal');
  if (!modal) return;
  _editingSpellId = id;
  const spell = id ? state.spells.find(s => s.id === id) : null;
  const lv    = spell?.level ?? (forceLevel !== null ? forceLevel : 1);

  // Resetear selectors
  const clsSel    = document.getElementById('smSourceClass');
  const presetSel = document.getElementById('smPreset');
  if (clsSel)    clsSel.value    = spell?.sourceClass || '';
  if (presetSel) presetSel.value = '';

  // Repoblar #smPreset según la clase que tenga el conjuro (si hay)
  if (clsSel?.value) {
    onSpellClassChange();
  } else {
    delete presetSel?.dataset?.built;
    _loadSpellPresets();
  }

  document.getElementById('smName').value  = spell?.name || '';
  document.getElementById('smLevel').value = lv;
  _setSelectValue('smSchool',     spell?.school      || '');
  _setSelectValue('smCastTime',   spell?.castTime    || '1 acción');
  _setSelectValue('smRange',      spell?.range       || '');
  _setSelectValue('smComponents', spell?.components  || '');
  _setSelectValue('smDuration',   spell?.duration    || '');
  document.getElementById('smConc').checked     = spell?.concentration || false;
  document.getElementById('smRitual').checked   = spell?.ritual        || false;
  document.getElementById('smSave').value       = spell?.save         || '';
  document.getElementById('smAttack').value     = spell?.attack       || '';
  document.getElementById('smCastAttr').value   = spell?.castingAttr  || '';
  document.getElementById('smDesc').value       = spell?.desc         || '';

  modal.classList.add('open');
  setTimeout(() => document.getElementById('smName').focus(), 50);
}

export function saveSpellModal() {
  const name = document.getElementById('smName').value.trim();
  if (!name) { showToast('El nombre es obligatorio'); return; }
  const sourceClass = document.getElementById('smSourceClass')?.value?.trim() || null;
  const data = {
    name,
    level:         parseInt(document.getElementById('smLevel').value) || 0,
    school:        document.getElementById('smSchool').value.trim(),
    castTime:      document.getElementById('smCastTime').value.trim(),
    range:         document.getElementById('smRange').value.trim(),
    components:    document.getElementById('smComponents').value.trim(),
    duration:      document.getElementById('smDuration').value.trim(),
    concentration: document.getElementById('smConc').checked,
    ritual:        document.getElementById('smRitual').checked,
    save:          document.getElementById('smSave').value || null,
    attack:        document.getElementById('smAttack').value || null,
    castingAttr:   document.getElementById('smCastAttr').value || null,
    sourceClass:   sourceClass || null,
    desc:          document.getElementById('smDesc').value.trim(),
    prepared:      true,
  };
  if (_editingSpellId) {
    const idx = state.spells.findIndex(s => s.id === _editingSpellId);
    if (idx >= 0) state.spells[idx] = { ...state.spells[idx], ...data };
  } else {
    data.id = `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    state.spells.push(data);
  }
  closeSpellModal();
  window.renderSpellBook?.();
  window.saveToLocal?.();
}

export function closeSpellModal() {
  document.getElementById('spellModal')?.classList.remove('open');
  _editingSpellId = null;
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.addSpell             = addSpell;
window.addCantrip           = addCantrip;
window.openSpellModal       = openSpellModal;
window.saveSpellModal       = saveSpellModal;
window.closeSpellModal      = closeSpellModal;
// window bridge — eliminar cuando se migre el HTML
window.onSpellPresetChange  = onSpellPresetChange;
window.onSpellClassChange   = onSpellClassChange;
