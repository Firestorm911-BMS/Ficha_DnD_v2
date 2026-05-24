import { state } from '../state.js';
import { showToast, addCombatLog } from './toast-log.js';

const FULL_CASTER_SLOTS = [
  [2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1],
];
const HALF_CASTER_SLOTS = [
  [0,0,0,0,0,0,0,0,0],[2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],[4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],[4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,0,0,0,0],
];
const WARLOCK_SLOTS = [
  [1,0,0,0,0,0,0,0,0],[2,0,0,0,0,0,0,0,0],[0,2,0,0,0,0,0,0,0],[0,2,0,0,0,0,0,0,0],
  [0,0,2,0,0,0,0,0,0],[0,0,2,0,0,0,0,0,0],[0,0,0,2,0,0,0,0,0],[0,0,0,2,0,0,0,0,0],
  [0,0,0,0,2,0,0,0,0],[0,0,0,0,2,0,0,0,0],[0,0,0,0,3,0,0,0,0],[0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],[0,0,0,0,3,0,0,0,0],[0,0,0,0,3,0,0,0,0],[0,0,0,0,3,0,0,0,0],
  [0,0,0,0,4,0,0,0,0],[0,0,0,0,4,0,0,0,0],[0,0,0,0,4,0,0,0,0],[0,0,0,0,4,0,0,0,0],
];
export const CASTER_TYPE = {
  'Bardo':'full','Clérigo':'full','Druida':'full','Hechicero':'full','Mago':'full',
  'Explorador':'half','Paladín':'half',
  'Brujo':'warlock',
};

export function computeSpellSlots(classText) {
  const parts = classText.split('/').map(p => {
    const m = p.trim().match(/^(.+?)\s+(\d+)$/);
    return m ? { name: m[1].trim(), level: parseInt(m[2]) } : null;
  }).filter(Boolean);
  if (!parts.length) return null;

  let fullLvl = 0, halfLvl = 0, warlockLvl = 0;
  parts.forEach(p => {
    const ct = CASTER_TYPE[p.name];
    if (ct === 'full') fullLvl += p.level;
    else if (ct === 'half') halfLvl += p.level;
    else if (ct === 'warlock') warlockLvl = p.level;
  });

  const result = {};
  const halfParts = parts.filter(p => CASTER_TYPE[p.name] === 'half');
  const isSingleHalfCaster = fullLvl === 0 && warlockLvl === 0 && halfParts.length === 1;

  if (isSingleHalfCaster) {
    const tbl = HALF_CASTER_SLOTS[Math.min(halfParts[0].level, 20) - 1];
    [1,2,3,4,5,6,7,8,9].forEach((lv, i) => {
      if (tbl[i] > 0) result[lv] = { max: tbl[i], used: state.spellSlotsState[lv]?.used || 0 };
    });
  } else {
    const effectiveLvl = fullLvl + Math.floor(halfLvl / 2);
    if (effectiveLvl > 0) {
      const tbl = FULL_CASTER_SLOTS[Math.min(effectiveLvl, 20) - 1];
      [1,2,3,4,5,6,7,8,9].forEach((lv, i) => {
        result[lv] = { max: tbl[i] || 0, used: state.spellSlotsState[lv]?.used || 0 };
      });
    }
  }
  return Object.keys(result).length ? result : null;
}

export function computePactSlots(classText) {
  const parts = classText.split('/').map(p => {
    const m = p.trim().match(/^(.+?)\s+(\d+)$/);
    return m ? { name: m[1].trim(), level: parseInt(m[2]) } : null;
  }).filter(Boolean);
  const warlockPart = parts.find(p => CASTER_TYPE[p.name] === 'warlock');
  if (!warlockPart) return { level: 0, max: 0 };
  const wtbl = WARLOCK_SLOTS[Math.min(warlockPart.level, 20) - 1];
  const idx  = wtbl.findIndex(n => n > 0);
  return idx < 0 ? { level: 0, max: 0 } : { level: idx + 1, max: wtbl[idx] };
}

export function _syncPactSlots(classText) {
  const computed = computePactSlots(classText);
  state.pactSlotsState.level = computed.level;
  state.pactSlotsState.max   = computed.max;
  state.pactSlotsState.used  = Math.min(state.pactSlotsState.used, computed.max);
}

export function renderSpellSlots() {
  const c = document.getElementById('spellSlotsList');
  if (!c) return;
  const editMode = document.body.classList.contains('edit-mode');
  const active = [1,2,3,4,5,6,7,8,9].filter(i => state.spellSlotsState[i]?.max > 0);

  const hasPact = state.pactSlotsState.level > 0 && state.pactSlotsState.max > 0;
  if (active.length === 0 && !hasPact && !editMode) {
    c.innerHTML = `<div class="spell-empty">Sin ranuras de conjuro configuradas</div>`;
    return;
  }
  c.innerHTML = '';

  if (hasPact) {
    const pactAvail = state.pactSlotsState.max - state.pactSlotsState.used;
    const pips = Array.from({length: state.pactSlotsState.max}, (_, i) =>
      `<div class="spell-slot ${i < state.pactSlotsState.used ? 'used' : 'available'}" onclick="togglePactSlotPip(${i})"></div>`
    ).join('');
    const pactBlock = document.createElement('div');
    pactBlock.className = 'spell-level-block';
    pactBlock.dataset.lv = 'pact';
    pactBlock.style.cssText = 'border-left:2px solid var(--gold-dark);padding-left:8px;margin-bottom:4px;';
    pactBlock.innerHTML = `
      <div class="spell-level-header">
        <span class="spell-level-name" title="Se recuperan en descanso corto">🌑 Pacto Nv${state.pactSlotsState.level}</span>
        <div class="spell-slots">${pips}</div>
        <span style="font-size:10px;color:var(--text-muted);min-width:28px;text-align:right;">${pactAvail}/${state.pactSlotsState.max}</span>
        <span style="font-size:9px;color:var(--text-muted);white-space:nowrap;">☾ corto</span>
      </div>`;
    c.appendChild(pactBlock);
  }
  active.forEach(lv => {
    const slot = state.spellSlotsState[lv];
    const avail = slot.max - slot.used;
    const pips = Array.from({length:slot.max},(_,i) =>
      `<div class="spell-slot ${i<slot.used?'used':'available'}" onclick="toggleSpellSlotPip(${lv},${i})"></div>`
    ).join('');
    const block = document.createElement('div');
    block.className = 'spell-level-block';
    block.dataset.lv = lv;
    block.innerHTML = `
      <div class="spell-level-header">
        <span class="spell-level-name">Nv ${lv}</span>
        <div class="spell-slots">${pips}</div>
        <span style="font-size:10px;color:var(--text-muted);min-width:28px;text-align:right;">${avail}/${slot.max}</span>
        ${editMode ? `
          <button class="btn btn-sm" style="padding:2px 6px;" onclick="adjustSlotMax(${lv},-1)">−</button>
          <button class="btn btn-sm" style="padding:2px 6px;" onclick="adjustSlotMax(${lv},+1)">+</button>
          <button class="btn btn-sm" style="padding:2px 6px;" onclick="removeSlotLevel(${lv})">✕</button>` : ''}
      </div>`;
    c.appendChild(block);
  });
  if (editMode) {
    const missing = [1,2,3,4,5,6,7,8,9].filter(i => !state.spellSlotsState[i] || state.spellSlotsState[i].max === 0);
    if (missing.length) {
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;';
      missing.slice(0,5).forEach(i => {
        const btn = document.createElement('button');
        btn.className='btn btn-sm'; btn.textContent=`+ Nv ${i}`;
        btn.onclick=()=>{ state.spellSlotsState[i]={max:1,used:0}; renderSpellSlots(); window.saveToLocal?.(); };
        footer.appendChild(btn);
      });
      c.appendChild(footer);
    }
  }
}

export function togglePactSlotPip(pipIndex) {
  state.pactSlotsState.used = pipIndex < state.pactSlotsState.used
    ? Math.max(0, state.pactSlotsState.used - 1)
    : Math.min(state.pactSlotsState.max, state.pactSlotsState.used + 1);
  renderSpellSlots(); window.saveToLocal?.();
}

export function toggleSpellSlotPip(level, pipIndex) {
  const slot = state.spellSlotsState[level];
  if (!slot) return;
  slot.used = pipIndex < slot.used ? Math.max(0,slot.used-1) : Math.min(slot.max,slot.used+1);
  renderSpellSlots(); window.saveToLocal?.();
}

export function adjustSlotMax(level, delta) {
  const slot = state.spellSlotsState[level];
  if (!slot) return;
  slot.max = Math.max(0, slot.max+delta);
  slot.used = Math.min(slot.used, slot.max);
  renderSpellSlots(); window.saveToLocal?.();
}

export function removeSlotLevel(level) {
  state.spellSlotsState[level] = {max:0,used:0};
  renderSpellSlots(); window.saveToLocal?.();
}

export function restorePactSlots() {
  if (state.pactSlotsState.level === 0) return;
  state.pactSlotsState.used = 0;
  renderSpellSlots();
  showToast('☾ Descanso corto: Espacios de Pacto recuperados');
  addCombatLog('☾ Descanso corto — Espacios de Pacto recuperados');
  window.saveToLocal?.();
}

export function restoreAllSlots() {
  [1,2,3,4,5,6,7,8,9].forEach(i => { if (state.spellSlotsState[i]) state.spellSlotsState[i].used = 0; });
  state.pactSlotsState.used = 0;
  renderSpellSlots();
  state.rageActive = false;
  document.body.classList.remove('rage-active');
  window.renderRage?.();
  state.concentrationSpell = null;
  window.renderConcentration?.();
  showToast('✦ Descanso largo completado');
  addCombatLog('✦ Descanso largo — todos los recursos restaurados');
  window.saveToLocal?.();
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.computeSpellSlots  = computeSpellSlots;
window.computePactSlots   = computePactSlots;
window._syncPactSlots     = _syncPactSlots;
window.renderSpellSlots   = renderSpellSlots;
window.togglePactSlotPip  = togglePactSlotPip;
window.toggleSpellSlotPip = toggleSpellSlotPip;
window.adjustSlotMax      = adjustSlotMax;
window.removeSlotLevel    = removeSlotLevel;
window.restorePactSlots   = restorePactSlots;
window.restoreAllSlots    = restoreAllSlots;
