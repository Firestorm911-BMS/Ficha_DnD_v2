import { state } from '../state.js';
import { showToast } from './toast-log.js';

let _editingSpellId = null;

export function addSpell()   { openSpellModal(null, 1); }
export function addCantrip() { openSpellModal(null, 0); }

export function openSpellModal(id = null, forceLevel = null) {
  const modal = document.getElementById('spellModal');
  if (!modal) return;
  _editingSpellId = id;
  const spell = id ? state.spells.find(s => s.id === id) : null;
  const lv = spell?.level ?? (forceLevel !== null ? forceLevel : 1);
  document.getElementById('smName').value       = spell?.name       || '';
  document.getElementById('smLevel').value      = lv;
  document.getElementById('smSchool').value     = spell?.school     || '';
  document.getElementById('smCastTime').value   = spell?.castTime   || '1 acción';
  document.getElementById('smRange').value      = spell?.range      || '';
  document.getElementById('smComponents').value = spell?.components || '';
  document.getElementById('smDuration').value   = spell?.duration   || '';
  document.getElementById('smConc').checked     = spell?.concentration || false;
  document.getElementById('smSave').value       = spell?.save       || '';
  document.getElementById('smAttack').value     = spell?.attack     || '';
  document.getElementById('smCastAttr').value   = spell?.castingAttr || '';
  document.getElementById('smDesc').value       = spell?.desc       || '';
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
window.addSpell        = addSpell;
window.addCantrip      = addCantrip;
window.openSpellModal  = openSpellModal;
window.saveSpellModal  = saveSpellModal;
window.closeSpellModal = closeSpellModal;
