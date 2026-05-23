import { state } from '../state.js';

const _restHooks = { short: [], long: [] };
export function registerRestHook(type, fn) { _restHooks[type].push(fn); }
import { showToast, addCombatLog } from './toast-log.js';
import { renderRage, resetRageState } from './rage.js';
import { resetDeathSaves } from './death-saves.js';
import { renderExhaustion } from './conditions.js';
import { _migrateHitDice, _hdTotalDice, renderHitDice } from './hit-dice.js';

export function shortRest() {
  const rName = state.CHARACTER_STATE.classResource?.name || 'el recurso';
  if (!confirm(`¿Iniciar descanso corto? Se recuperarán los rasgos y recursos de descanso corto.`)) return false;
  resetRageState();
  window.resetTraitUses?.('short');
  if ((state.CHARACTER_STATE.classResource?.recovery || '') === 'short') {
    state.CHARACTER_STATE.rageUsesSpent = 0;
  }
  // Bardo nv.5+: Inspiración Bárdica se recupera en descanso corto
  const _classText = document.querySelector('.hero-pill[data-field="class"] .meta-value')?.textContent?.trim() || '';
  const _bardMatch = _classText.split('/').map(p => p.trim().match(/^Bardo\s+(\d+)$/)).find(Boolean);
  if (_bardMatch && parseInt(_bardMatch[1]) >= 5 && state.CHARACTER_STATE.classResource?.name === 'Insp. Bárdica') {
    state.CHARACTER_STATE.rageUsesSpent = 0;
    renderRage();
  }
  // Brujo: recupera Espacios de Pacto en descanso corto (PHB 5e)
  if (state.pactSlotsState.level > 0) {
    state.pactSlotsState.used = 0;
    window.renderSpellSlots?.();
  }
  document.querySelectorAll('.condition-tag').forEach(tag => {
    if (tag.textContent.includes('Furia') || tag.textContent.includes(rName)) tag.classList.remove('active');
  });
  addCombatLog(`☾ Descanso corto: dados de golpe disponibles, recursos de desc. corto recuperados`);
  showToast('Descanso corto registrado');
  _restHooks.short.forEach(fn => fn());
  window.saveState?.();
  return true;
}

export function longRest() {
  if (!confirm('¿Iniciar descanso largo? Esto restaurará PG, recursos de clase, dados de golpe y conjuros.')) return false;
  const max = parseInt(document.getElementById('hpMax')?.textContent) || 0;
  window.setHP?.(max, 0);
  const recovery = state.CHARACTER_STATE.classResource?.recovery || 'long';
  if (recovery === 'long' || recovery === 'short') state.CHARACTER_STATE.rageUsesSpent = 0;
  resetRageState();
  window.resetTraitUses?.('long');
  resetDeathSaves();
  _migrateHitDice();
  const totalDice = _hdTotalDice();
  let toRestore = Math.max(1, Math.ceil(totalDice / 2));
  (state.CHARACTER_STATE.hitDice || []).forEach(d => {
    const restore = Math.min(d.spent, toRestore);
    d.spent -= restore; toRestore -= restore;
  });
  state.CHARACTER_STATE.hitDiceSpent = (state.CHARACTER_STATE.hitDice || []).reduce((s, d) => s + d.spent, 0);
  renderHitDice();
  // Restaurar todos los slots de conjuro (incluyendo Espacios de Pacto)
  [1,2,3,4,5,6,7,8,9].forEach(i => { if (state.spellSlotsState[i]) state.spellSlotsState[i].used = 0; });
  state.pactSlotsState.used = 0;
  window.renderSpellSlots?.();
  // Romper concentración
  state.concentrationSpell = null;
  window.renderConcentration?.();
  document.querySelectorAll('.pip').forEach(p => { p.classList.remove('used'); p.classList.add('available'); });
  document.querySelectorAll('.condition-tag').forEach(tag => tag.classList.remove('active'));
  const round = document.getElementById('roundCounter');
  if (round) round.textContent = '1';
  // PHB: un descanso largo reduce el agotamiento en 1 nivel
  if (state.CHARACTER_STATE.exhaustion > 0) {
    state.CHARACTER_STATE.exhaustion = Math.max(0, state.CHARACTER_STATE.exhaustion - 1);
    renderExhaustion();
  }
  addCombatLog('☀ Descanso largo: PG completos, conjuros y recursos restaurados, condiciones limpiadas');
  showToast('Descanso largo completado');
  _restHooks.long.forEach(fn => fn());
  window.saveState?.();
  return true;
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.shortRest = shortRest;
window.longRest  = longRest;
