import { state } from '../state.js';
import { renderSkills, updatePassivePerception } from './skills.js';

const SAVE_ATTRS       = ['STR','DEX','CON','INT','WIS','CHA'];
const PROF_BONUS_TABLE = [0, 2,2,2,2, 3,3,3,3, 4,4,4,4, 5,5,5,5, 6,6,6,6];

export function getScore(attr) {
  return parseInt(document.getElementById('score-' + attr)?.value) || 10;
}

export function getMod(attr) {
  return Math.floor((getScore(attr) - 10) / 2);
}

export function calcMod(attr) {
  const mod = getMod(attr);
  const el = document.getElementById('mod-' + attr);
  if (el) el.textContent = mod >= 0 ? '+' + mod : '' + mod;
  if (attr === 'DEX') {
    const initEl = document.getElementById('statInit');
    if (initEl) {
      const bonus = state.CHARACTER_STATE.initBonus ?? 0;
      const v = mod + bonus;
      initEl.textContent = v >= 0 ? `+${v}` : `${v}`;
    }
  }
  renderSkills();
  window.renderAttacks?.();
  renderSaves();
  window.updateArmorClass?.();
  updatePassivePerception();
  renderSpellStats();
  window.saveToLocal?.();
}

export function renderSpellStats() {
  const attr = state.CHARACTER_STATE.spellcastingAttr || '';
  const pb   = getProfBonus();
  const mod  = attr ? getMod(attr) : 0;
  const dc   = 8 + pb + mod;
  const bonus = pb + mod;
  const attrEl   = document.getElementById('magicAttrCE');
  const dcEl     = document.getElementById('magicDCCE');
  const bonusEl  = document.getElementById('magicBonusCE');
  if (attrEl)  attrEl.textContent  = attr || '—';
  if (dcEl)    dcEl.textContent    = attr ? dc   : '—';
  if (bonusEl) bonusEl.textContent = attr ? (bonus >= 0 ? '+'+bonus : ''+bonus) : '—';
  const sel = document.getElementById('spellAttrSelect');
  if (sel && sel.value !== attr) sel.value = attr;
}

export function setSpellcastingAttr(attr) {
  state.CHARACTER_STATE.spellcastingAttr = attr;
  renderSpellStats();
  window.saveToLocal?.();
}

export function getProfBonus() {
  const pb = document.getElementById('profBonus');
  return parseInt(pb?.textContent?.replace('+','')) || 2;
}

export function calcProfBonus() {
  const level = window.getCurrentLevel?.() ?? 1;
  const pb = PROF_BONUS_TABLE[level] || 2;
  const el = document.getElementById('profBonus');
  if (el) el.textContent = `+${pb}`;
  renderSkills();
  window.renderAttacks?.();
  renderSaves();
  renderSpellStats();
  return pb;
}

export function renderSaves() {
  const rows = document.querySelectorAll('.save-row');
  const pb = getProfBonus();
  rows.forEach((row, i) => {
    const attr = SAVE_ATTRS[i];
    if (!attr) return;
    const prof = row.querySelector('.save-prof')?.classList.contains('active') || false;
    const bonus = getMod(attr) + (prof ? pb : 0);
    const bonusEl = row.querySelector('.save-bonus');
    if (bonusEl) bonusEl.textContent = bonus >= 0 ? `+${bonus}` : `${bonus}`;
  });
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.getScore          = getScore;
window.getMod            = getMod;
window.calcMod           = calcMod;
window.calcProfBonus     = calcProfBonus;
window.getProfBonus      = getProfBonus;
window.renderSaves       = renderSaves;
window.setSpellcastingAttr = setSpellcastingAttr;
window.renderSpellStats  = renderSpellStats;
