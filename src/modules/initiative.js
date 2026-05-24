import { state } from '../state.js';
import { addCombatLog } from './toast-log.js';
import { saveToLocal } from './persistence.js';

// ── Volatile state ──────────────────────────────────────────────────────────
let _currentTurnId = null;  // resets on reload — just lose tracking, entries persist
let _entrySeq = 0;

// ── Render ──────────────────────────────────────────────────────────────────
export function renderTracker() {
  const tracker = document.getElementById('initTracker');
  if (!tracker) return;

  // Auto-sync player init from statInit span each render
  const player = state.trackerEntries.find(e => e.type === 'player');
  if (player) {
    const statInit = parseInt(document.getElementById('statInit')?.textContent) || 0;
    player.init = statInit;
  }

  tracker.innerHTML = '';

  if (!state.trackerEntries.length) {
    const empty = document.createElement('div');
    empty.className = 'init-empty';
    empty.textContent = 'Sin combatientes — añade aliados o enemigos';
    tracker.appendChild(empty);
    return;
  }

  state.trackerEntries.forEach(entry => {
    const div = document.createElement('div');
    div.className = `init-entry init-entry-${entry.type}${_currentTurnId === entry.id ? ' current-turn' : ''}`;
    div.dataset.id = entry.id;

    // ── Type badge ──
    const badge = document.createElement('div');
    badge.className = `init-type-badge init-type-${entry.type}`;
    const LABELS = { player: 'J', ally: 'A', enemy: 'E' };
    const TITLES = { player: 'Jugador', ally: 'Aliado', enemy: 'Enemigo' };
    badge.textContent = LABELS[entry.type] || 'E';
    badge.title = TITLES[entry.type] || 'Enemigo';

    // ── Init number ──
    const initNum = document.createElement('div');
    initNum.className = 'init-num';
    initNum.contentEditable = entry.type === 'player' ? 'false' : 'true';
    initNum.textContent = entry.init;
    initNum.dataset.field = 'init';

    // ── Name ──
    const nameEl = document.createElement('div');
    nameEl.className = 'init-name';
    nameEl.contentEditable = 'true';
    nameEl.textContent = entry.name;
    nameEl.dataset.field = 'name';

    // ── HP group ──
    const hpGroup = document.createElement('div');
    hpGroup.className = 'init-hp-group';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'init-hp-btn';
    minusBtn.textContent = '−';
    minusBtn.dataset.action = 'hp-minus';
    minusBtn.title = 'Aplicar daño (1)';

    const hpPct  = entry.hpMax > 0 ? Math.max(0, Math.round(entry.hp / entry.hpMax * 100)) : 100;
    const hpColor = entry.hpMax === 0 ? 'var(--text-muted)'
                  : hpPct > 50         ? 'var(--green-light)'
                  : hpPct > 25         ? '#f0a030'
                                       : '#e74c3c';

    const hpVal = document.createElement('span');
    hpVal.className = 'init-hp-val';
    hpVal.textContent = entry.hpMax > 0 ? `${entry.hp}/${entry.hpMax}` : '—';
    hpVal.style.color = hpColor;
    hpVal.dataset.action = 'hp-edit';
    hpVal.title = 'Click para editar PG';

    const plusBtn = document.createElement('button');
    plusBtn.className = 'init-hp-btn';
    plusBtn.textContent = '+';
    plusBtn.dataset.action = 'hp-plus';
    plusBtn.title = 'Curar (1)';

    hpGroup.append(minusBtn, hpVal, plusBtn);

    // ── Delete button ──
    const delBtn = document.createElement('button');
    delBtn.className = 'init-del';
    delBtn.textContent = '✕';
    delBtn.dataset.action = 'del-entry';

    div.append(badge, initNum, nameEl, hpGroup, delBtn);
    tracker.appendChild(div);
  });
}

// ── Event delegation ─────────────────────────────────────────────────────────
function _onTrackerClick(e) {
  const entryEl = e.target.closest('.init-entry[data-id]');
  if (!entryEl) return;
  const id = entryEl.dataset.id;
  const entry = state.trackerEntries.find(en => en.id === id);
  if (!entry) return;

  const action = e.target.dataset.action;
  if (!action) return;

  if (action === 'del-entry') {
    state.trackerEntries = state.trackerEntries.filter(en => en.id !== id);
    if (_currentTurnId === id) _currentTurnId = state.trackerEntries[0]?.id ?? null;
    renderTracker();
    saveToLocal();
    return;
  }
  if (action === 'hp-minus') { _adjustHP(id, -1); return; }
  if (action === 'hp-plus')  { _adjustHP(id,  1); return; }
  if (action === 'hp-edit') {
    const cur = entry.hpMax > 0 ? `${entry.hp}/${entry.hpMax}` : `${entry.hp}/0`;
    const v = prompt(`PG de ${entry.name} (actual/máximo):`, cur);
    if (v === null) return;
    const parts = v.split('/');
    const newCur = parseInt(parts[0]);
    const newMax = parts.length > 1 ? parseInt(parts[1]) : undefined;
    if (!isNaN(newCur)) entry.hp = Math.max(0, newCur);
    if (newMax !== undefined && !isNaN(newMax)) entry.hpMax = Math.max(0, newMax);
    renderTracker();
    saveToLocal();
    return;
  }
}

function _onTrackerBlur(e) {
  const entryEl = e.target.closest('.init-entry[data-id]');
  if (!entryEl) return;
  const id = entryEl.dataset.id;
  const entry = state.trackerEntries.find(en => en.id === id);
  if (!entry) return;

  const field = e.target.dataset.field;
  if (field === 'init') {
    entry.init = parseInt(e.target.textContent) || 0;
    e.target.textContent = entry.init;
    saveToLocal();
  } else if (field === 'name') {
    const v = e.target.textContent.trim();
    if (v) entry.name = v;
    else e.target.textContent = entry.name;
    saveToLocal();
  }
}

function _adjustHP(id, delta) {
  const entry = state.trackerEntries.find(en => en.id === id);
  if (!entry) return;
  entry.hp = Math.max(0, entry.hp + delta);
  if (entry.hp === 0 && delta < 0) addCombatLog(`💀 ${entry.name} — a 0 PG`);
  renderTracker();
  saveToLocal();
}

// ── Public API ────────────────────────────────────────────────────────────────

export function addInitEntry(type = 'enemy') {
  _entrySeq++;
  const NAMES = { player: 'Personaje', ally: `Aliado ${_entrySeq}`, enemy: `Criatura ${_entrySeq}` };
  state.trackerEntries.push({
    id: `ie-${Date.now()}-${_entrySeq}`,
    name: NAMES[type] || `Criatura ${_entrySeq}`,
    init: 0,
    hp:   0,
    hpMax: 0,
    type,
  });
  renderTracker();
  saveToLocal();
}

export function addPlayerEntry() {
  if (state.trackerEntries.find(e => e.type === 'player')) return; // ya existe
  const statInit = parseInt(document.getElementById('statInit')?.textContent) || 0;
  const charName = document.getElementById('charName')?.textContent?.trim() || 'Personaje';
  const hpCur   = parseInt(document.getElementById('hpCurrent')?.textContent) || 0;
  const hpMax   = parseInt(document.getElementById('hpMax')?.textContent) || 0;
  state.trackerEntries.unshift({
    id:    'ie-player',
    name:  charName,
    init:  statInit,
    hp:    hpCur,
    hpMax,
    type:  'player',
  });
  renderTracker();
  saveToLocal();
}

export function nextTurn() {
  const entries = state.trackerEntries;
  if (!entries.length) return;
  const idx  = _currentTurnId ? entries.findIndex(e => e.id === _currentTurnId) : -1;
  const next = (idx + 1) % entries.length;
  _currentTurnId = entries[next].id;
  renderTracker();
  document.querySelector(`.init-entry[data-id="${_currentTurnId}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  if (next === 0 && entries.length > 1) {
    const rcEl = document.getElementById('roundCounter');
    if (rcEl) {
      const newRound = (parseInt(rcEl.textContent) || 1) + 1;
      rcEl.textContent = newRound;
      addCombatLog(`⏱ Ronda ${newRound}`);
    }
    saveToLocal();
  }
  if (state.CHARACTER_STATE.classResource?.recovery === 'turn' && state.CHARACTER_STATE.sneakAttackUsed) {
    state.CHARACTER_STATE.sneakAttackUsed = false;
    window.renderRage?.();
    addCombatLog(`🗡 ${state.CHARACTER_STATE.classResource.name} — disponible (nuevo turno)`);
  }
}

export function incrementRound() {
  const el = document.getElementById('roundCounter');
  if (el) { el.textContent = (parseInt(el.textContent) || 1) + 1; saveToLocal(); }
}

export function sortInit() {
  state.trackerEntries.sort((a, b) => b.init - a.init);
  renderTracker();
  saveToLocal();
}

export function clearCombat() {
  if (!confirm('¿Limpiar todos los combatientes y reiniciar la ronda?')) return;
  state.trackerEntries = [];
  _currentTurnId = null;
  const rcEl = document.getElementById('roundCounter');
  if (rcEl) rcEl.textContent = '1';
  addCombatLog('🔄 Combate reiniciado');
  renderTracker();
  saveToLocal();
}

export function rollInitiativeAll() {
  const dexScore = parseInt(document.getElementById('score-DEX')?.value || '10');
  const dexMod   = Math.floor((dexScore - 10) / 2);
  const bonus    = (state.CHARACTER_STATE.initBonus || 0) + dexMod;
  const playerRoll = Math.floor(Math.random() * 20) + 1 + bonus;

  // Update existing entries
  state.trackerEntries.forEach(e => {
    if (e.type === 'player') { e.init = playerRoll; }
    else { e.init = Math.floor(Math.random() * 20) + 1; }
  });

  // Auto-add player if none present
  if (!state.trackerEntries.find(e => e.type === 'player')) {
    addPlayerEntry();
    const p = state.trackerEntries.find(e => e.type === 'player');
    if (p) p.init = playerRoll;
  }

  sortInit();
  addCombatLog(`🎲 Iniciativa tirada — tú: ${playerRoll}`);
}

// ── Window bridges ──────────────────────────────────────────────────────────
// window bridge — eliminar cuando se migre el HTML
window.addInitEntry      = addInitEntry;
window.addPlayerEntry    = addPlayerEntry;
window.nextTurn          = nextTurn;
window.incrementRound    = incrementRound;
window.sortInit          = sortInit;
window.clearCombat       = clearCombat;
window.rollInitiativeAll = rollInitiativeAll;
window.renderTracker     = renderTracker;

// ── Init (ES modules corren diferidos — DOM ya está listo) ──────────────────
const _trackerEl = document.getElementById('initTracker');
if (_trackerEl) {
  _trackerEl.addEventListener('click', _onTrackerClick);
  _trackerEl.addEventListener('blur',  _onTrackerBlur, true);
}
