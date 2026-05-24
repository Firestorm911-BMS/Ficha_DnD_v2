import { state } from '../state.js';
import { showToast } from './toast-log.js';

let _editingSpellId = null;
let _spellPresetsData = null;   // cache: { "0": [...spells], ..., "9": [...spells] }

export function addSpell()   { openSpellModal(null, 1); }
export function addCantrip() { openSpellModal(null, 0); }

// ── Preset loading ──────────────────────────────────────────────────────────

async function _loadSpellPresets() {
  if (_spellPresetsData) { _buildSpellPresetOptions(); return; }
  try {
    const res = await fetch('src/data/spells.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _spellPresetsData = await res.json();
    _buildSpellPresetOptions();
  } catch (e) {
    console.warn('[spell-modal] No se pudo cargar spells.json:', e);
  }
}

function _buildSpellPresetOptions() {
  const sel = document.getElementById('smPreset');
  if (!sel || sel.dataset.built) return;
  const LEVEL_LABELS = [
    'Trucos (0)', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4',
    'Nivel 5', 'Nivel 6', 'Nivel 7', 'Nivel 8', 'Nivel 9',
  ];
  let html = '<option value="">— Elegir preset —</option>';
  for (let lv = 0; lv <= 9; lv++) {
    const spells = _spellPresetsData?.[String(lv)];
    if (!spells?.length) continue;
    html += `<optgroup label="${LEVEL_LABELS[lv]}">`;
    spells.forEach((sp, idx) => {
      html += `<option value="${lv}|${idx}">${sp.name}</option>`;
    });
    html += '</optgroup>';
  }
  sel.innerHTML = html;
  sel.dataset.built = '1';
}

export function onSpellPresetChange() {
  const sel = document.getElementById('smPreset');
  if (!sel?.value) return;
  const [lv, idx] = sel.value.split('|').map(Number);
  const sp = _spellPresetsData?.[String(lv)]?.[idx];
  if (!sp) return;

  document.getElementById('smName').value       = sp.name;
  document.getElementById('smLevel').value      = lv;
  document.getElementById('smSchool').value     = sp.school      || '';
  document.getElementById('smCastTime').value   = sp.castTime    || '1 acción';
  document.getElementById('smRange').value      = sp.range       || '';
  document.getElementById('smComponents').value = sp.components  || '';
  document.getElementById('smDuration').value   = sp.duration    || '';
  document.getElementById('smConc').checked     = sp.concentration || false;
  document.getElementById('smRitual').checked   = sp.ritual       || false;
  const saveEl = document.getElementById('smSave');
  if (saveEl) saveEl.value = sp.save || '';
  const atkEl  = document.getElementById('smAttack');
  if (atkEl)  atkEl.value  = sp.attack || '';
  document.getElementById('smDesc').value       = sp.desc        || '';
  // smCastAttr queda como está — no está en los datos del preset
}

// ── Modal open / save / close ───────────────────────────────────────────────

export function openSpellModal(id = null, forceLevel = null) {
  const modal = document.getElementById('spellModal');
  if (!modal) return;
  _editingSpellId = id;
  const spell = id ? state.spells.find(s => s.id === id) : null;
  const lv = spell?.level ?? (forceLevel !== null ? forceLevel : 1);

  // Resetear el selector de presets
  const presetSel = document.getElementById('smPreset');
  if (presetSel) presetSel.value = '';

  document.getElementById('smName').value       = spell?.name         || '';
  document.getElementById('smLevel').value      = lv;
  document.getElementById('smSchool').value     = spell?.school       || '';
  document.getElementById('smCastTime').value   = spell?.castTime     || '1 acción';
  document.getElementById('smRange').value      = spell?.range        || '';
  document.getElementById('smComponents').value = spell?.components   || '';
  document.getElementById('smDuration').value   = spell?.duration     || '';
  document.getElementById('smConc').checked     = spell?.concentration || false;
  document.getElementById('smRitual').checked   = spell?.ritual        || false;
  document.getElementById('smSave').value       = spell?.save         || '';
  document.getElementById('smAttack').value     = spell?.attack       || '';
  document.getElementById('smCastAttr').value   = spell?.castingAttr  || '';
  document.getElementById('smDesc').value       = spell?.desc         || '';

  // Cargar presets en segundo plano (idempotente)
  _loadSpellPresets();

  modal.classList.add('open');
  setTimeout(() => document.getElementById('smName').focus(), 50);
}

export function saveSpellModal() {
  const name = document.getElementById('smName').value.trim();
  if (!name) { showToast('El nombre es obligatorio'); return; }
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
