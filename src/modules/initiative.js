import { state } from '../state.js';
import { addCombatLog } from './toast-log.js';

let initEntryCount = 0;

export function addInitEntry() {
  initEntryCount++;
  const tracker = document.getElementById('initTracker');
  const div = document.createElement('div');
  div.className = 'init-entry';
  div.innerHTML = `
    <div class="init-num" contenteditable="false">0</div>
    <div class="init-name" contenteditable="false">Criatura ${initEntryCount}</div>
    <button class="init-del" onclick="this.closest('.init-entry').remove();saveToLocal()">✕</button>
  `;
  tracker.appendChild(div);
  window.saveToLocal?.();
}

export function nextTurn() {
  const entries = document.querySelectorAll('#initTracker .init-entry');
  if (!entries.length) return;
  let currentIdx = -1;
  entries.forEach((e, i) => { if (e.classList.contains('current-turn')) currentIdx = i; });
  entries.forEach(e => e.classList.remove('current-turn'));
  const next = (currentIdx + 1) % entries.length;
  entries[next].classList.add('current-turn');
  entries[next].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (next === 0 && entries.length > 1) {
    const rcEl = document.getElementById('roundCounter');
    if (rcEl) {
      const newRound = (parseInt(rcEl.textContent) || 1) + 1;
      rcEl.textContent = newRound;
      addCombatLog(`⏱ Ronda ${newRound}`);
    }
    window.saveToLocal?.();
  }
  if (state.CHARACTER_STATE.classResource?.recovery === 'turn' && state.CHARACTER_STATE.sneakAttackUsed) {
    state.CHARACTER_STATE.sneakAttackUsed = false;
    window.renderRage?.();
    addCombatLog(`🗡 ${state.CHARACTER_STATE.classResource.name} — disponible (nuevo turno)`);
  }
}

export function incrementRound() {
  const el = document.getElementById('roundCounter');
  if (el) { el.textContent = (parseInt(el.textContent) || 1) + 1; window.saveToLocal?.(); }
}

export function sortInit() {
  const tracker = document.getElementById('initTracker');
  const entries = Array.from(tracker.querySelectorAll('.init-entry'));
  entries.sort((a, b) => {
    const va = parseInt(a.querySelector('.init-num')?.textContent) || 0;
    const vb = parseInt(b.querySelector('.init-num')?.textContent) || 0;
    return vb - va;
  });
  entries.forEach(e => tracker.appendChild(e));
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.addInitEntry   = addInitEntry;
window.nextTurn       = nextTurn;
window.incrementRound = incrementRound;
window.sortInit       = sortInit;
