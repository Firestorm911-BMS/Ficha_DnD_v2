import { state } from '../state.js';

// ── Toast ──────────────────────────────────────────────────────────────────

export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Combat log ─────────────────────────────────────────────────────────────

export function addCombatLog(msg) {
  state.combatLog.unshift(msg);
  if (state.combatLog.length > 50) state.combatLog.length = 50;
  const log = document.getElementById('combatLog');
  if (!log) return;
  const div = document.createElement('div');
  div.innerHTML = msg;
  div.style.borderBottom = '1px solid rgba(201,168,76,0.1)';
  div.style.paddingBottom = '3px';
  div.style.marginBottom = '3px';
  log.insertBefore(div, log.firstChild);
  while (log.children.length > 50) log.removeChild(log.lastChild);
}

export function clearCombatLog() {
  state.combatLog = [];
  const log = document.getElementById('combatLog');
  if (log) log.innerHTML = '';
  window.saveToLocal?.();
}

export function renderCombatLog() {
  const log = document.getElementById('combatLog');
  if (!log) return;
  log.innerHTML = '';
  state.combatLog.forEach(msg => {
    const div = document.createElement('div');
    div.innerHTML = msg;
    div.style.borderBottom = '1px solid rgba(201,168,76,0.1)';
    div.style.paddingBottom = '3px';
    div.style.marginBottom = '3px';
    log.appendChild(div);
  });
}

// ── Window bridge (scripts no-module y handlers inline) ────────────────────
window.showToast       = showToast;
window.addCombatLog    = addCombatLog;
window.clearCombatLog  = clearCombatLog;
window.renderCombatLog = renderCombatLog;
