import { state } from '../state.js';
import { showToast, addCombatLog } from './toast-log.js';

export function renderDeathSaves() {
  if (!state.CHARACTER_STATE.deathSaves) state.CHARACTER_STATE.deathSaves = { s: 0, f: 0 };
  const { s, f } = state.CHARACTER_STATE.deathSaves;
  document.querySelectorAll('.death-check.success-check').forEach((el, i) => {
    el.classList.toggle('filled', (i % 3) < s);
  });
  document.querySelectorAll('.death-check.failure-check').forEach((el, i) => {
    el.classList.toggle('filled', (i % 3) < f);
  });
}

export function checkDeathOutcome() {
  const { s, f } = state.CHARACTER_STATE.deathSaves;
  if (s >= 3) {
    setTimeout(() => {
      showToast('💫 ¡Estabilizado! El personaje sobrevive.');
      addCombatLog('💫 Salvaciones de muerte: 3 éxitos — Personaje estabilizado');
      const hpEl = document.getElementById('hpCurrent');
      if (hpEl && parseInt(hpEl.textContent) <= 0) { hpEl.textContent = '1'; window.updateHP?.(); }
      resetDeathSaves();
    }, 200);
  } else if (f >= 3) {
    setTimeout(() => {
      showToast('💀 El personaje ha muerto (3 fallos)');
      addCombatLog('💀 Salvaciones de muerte: 3 fallos — El personaje ha muerto');
      resetDeathSaves();
    }, 200);
  }
}

export function toggleDeath(el) {
  if (!state.CHARACTER_STATE.deathSaves) state.CHARACTER_STATE.deathSaves = { s: 0, f: 0 };
  const isSuccess = el.classList.contains('success-check');
  const key = isSuccess ? 's' : 'f';
  const siblings = Array.from(el.parentElement.querySelectorAll(isSuccess ? '.success-check' : '.failure-check'));
  const idx = siblings.indexOf(el);
  const cur = state.CHARACTER_STATE.deathSaves[key];
  state.CHARACTER_STATE.deathSaves[key] = idx < cur ? idx : Math.min(3, idx + 1);
  renderDeathSaves();
  checkDeathOutcome();
  window.saveToLocal?.();
}

export function rollDeathSave() {
  if (!state.CHARACTER_STATE.deathSaves) state.CHARACTER_STATE.deathSaves = { s: 0, f: 0 };
  const d20 = Math.ceil(Math.random() * 20);
  if (d20 === 20) {
    addCombatLog('💫 Salvación de muerte: 20 — ¡Recuperado con 1 PG!');
    showToast('💫 ¡Recuperado!');
    const hpEl = document.getElementById('hpCurrent');
    if (hpEl) { hpEl.textContent = '1'; window.updateHP?.(); }
    resetDeathSaves();
    return;
  }
  if (d20 === 1) {
    state.CHARACTER_STATE.deathSaves.f = Math.min(3, state.CHARACTER_STATE.deathSaves.f + 2);
    addCombatLog('💀 Salvación de muerte: 1 — ¡Doble fallo!');
    showToast('💀 ¡Doble fallo!');
  } else if (d20 >= 10) {
    state.CHARACTER_STATE.deathSaves.s = Math.min(3, state.CHARACTER_STATE.deathSaves.s + 1);
    addCombatLog(`✦ Salvación de muerte: ${d20} — Éxito`);
    showToast(`✦ Éxito (${d20})`);
  } else {
    state.CHARACTER_STATE.deathSaves.f = Math.min(3, state.CHARACTER_STATE.deathSaves.f + 1);
    addCombatLog(`✕ Salvación de muerte: ${d20} — Fallo`);
    showToast(`✕ Fallo (${d20})`);
  }
  renderDeathSaves();
  checkDeathOutcome();
  window.saveToLocal?.();
}

export function resetDeathSaves() {
  state.CHARACTER_STATE.deathSaves = { s: 0, f: 0 };
  renderDeathSaves();
  window.saveToLocal?.();
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.renderDeathSaves  = renderDeathSaves;
window.checkDeathOutcome = checkDeathOutcome;
window.toggleDeath       = toggleDeath;
window.rollDeathSave     = rollDeathSave;
window.resetDeathSaves   = resetDeathSaves;
