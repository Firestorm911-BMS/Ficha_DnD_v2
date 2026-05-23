import { state } from '../state.js';
import { calcProfBonus } from './attributes.js';
import { renderHitDice, _migrateHitDice } from './hit-dice.js';
import { computeSpellSlots, _syncPactSlots, renderSpellSlots, CASTER_TYPE } from './spell-slots.js';
import { calcResourceMaxUses, renderRage } from './rage.js';
import { showToast, addCombatLog } from './toast-log.js';

const CHARACTER_STATE = state.CHARACTER_STATE;

export const XP_TABLE = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];

export function getCurrentLevel() {
  const cur = parseInt(document.getElementById('xpCurrent')?.textContent) || 0;
  let level = 1;
  for (let i = 1; i < XP_TABLE.length; i++) {
    if (cur >= XP_TABLE[i]) level = i + 1;
    else break;
  }
  return Math.min(level, 20);
}

export function updateXP() {
  const cur = parseInt(document.getElementById('xpCurrent')?.textContent) || 0;
  const next = parseInt(document.getElementById('xpNext')?.textContent) || 300;
  const pct = Math.min(100, (cur / next) * 100);

  const bar = document.getElementById('xpBar');
  if (bar) { bar.style.width = pct + '%'; bar.classList.toggle('full', pct >= 100); }

  const level = getCurrentLevel();
  const badge = document.getElementById('xpLevelBadge');
  if (badge) badge.textContent = `Nv ${level}`;

  calcProfBonus();
  renderHitDice();

  const label = document.getElementById('xpNextLabel');
  if (label) {
    if (level >= 20) {
      label.innerHTML = `<span style="color:var(--gold);font-style:normal;">⭐ Nivel máximo alcanzado</span>`;
    } else if (pct >= 100) {
      label.innerHTML = `<span style="color:var(--gold);font-style:normal;animation:xpFullPulse 1.8s ease-in-out infinite;">✦ ¡NIVEL DISPONIBLE! — Habla con tu DM</span>`;
    } else {
      label.textContent = `${Math.max(0, next - cur)} XP para el siguiente nivel`;
    }
  }
  window.saveToLocal?.();
}

export function addXP() {
  const input = document.getElementById('xpAddAmt');
  const amt = Math.max(0, parseInt(input?.value) || 0);
  if (!amt) return;
  input.value = '';

  const curEl = document.getElementById('xpCurrent');
  const nextEl = document.getElementById('xpNext');
  const levelBefore = getCurrentLevel();
  let cur = parseInt(curEl?.textContent) || 0;
  cur += amt;
  if (curEl) curEl.textContent = cur;

  const levelAfter = getCurrentLevel();

  // Auto-advance xpNext threshold when level goes up
  if (levelAfter > levelBefore && levelAfter <= 20) {
    const newThreshold = XP_TABLE[levelAfter] ?? XP_TABLE[XP_TABLE.length - 1];
    if (nextEl && newThreshold) nextEl.textContent = newThreshold;
    // Auto-update class level en pill solo si es clase única (sin multiclase)
    const meta0 = document.querySelector('.hero-pill[data-field="class"] .meta-value');
    if (meta0) {
      const currentClassText = meta0.textContent.trim();
      if (!currentClassText.includes('/')) {
        const m = currentClassText.match(/^(.+?)\s+(\d+)$/);
        if (m) meta0.textContent = `${m[1]} ${levelAfter}`;
      } else {
        // El asistente de nivel maneja la actualización de la pill en multiclase
      }
    }
    addCombatLog(`✦ Subiste al nivel ${levelAfter} con ${cur} XP acumulados`);
    if ((CHARACTER_STATE.hitDice || []).length === 1) {
      CHARACTER_STATE.hitDice[0].count = levelAfter;
      CHARACTER_STATE.hitDice[0].spent = Math.min(CHARACTER_STATE.hitDice[0].spent || 0, levelAfter);
    }
    const classTextLU = document.querySelector('.hero-pill[data-field="class"] .meta-value')?.textContent?.trim() || '';
    const primaryMatchLU = classTextLU.match(/^(.+?)\s+(\d+)/);
    if (primaryMatchLU) {
      const classLevelLU = parseInt(primaryMatchLU[2]) || levelAfter;
      const newUses = calcResourceMaxUses(primaryMatchLU[1].trim(), classLevelLU);
      if (newUses !== null && CHARACTER_STATE.classResource) {
        CHARACTER_STATE.classResource.maxUses = newUses;
        renderRage();
      }
    }
    const newSlotsLU = computeSpellSlots(classTextLU);
    if (newSlotsLU) {
      [1,2,3,4,5,6,7,8,9].forEach(lv => {
        if (state.spellSlotsState[lv] && newSlotsLU[lv]) state.spellSlotsState[lv].max = newSlotsLU[lv].max;
      });
    }
    _syncPactSlots(classTextLU);
    renderSpellSlots();
    setTimeout(() => window.openLevelUpAssistant?.(levelAfter), 400);
  } else {
    showToast(`✦ +${amt} XP (total ${cur})`);
  }
  updateXP();
}

export function setLevelDirect(level) {
  level = Math.max(1, Math.min(20, parseInt(level) || 1));
  const xp = XP_TABLE[level - 1] || 0;
  const curEl = document.getElementById('xpCurrent');
  const nextEl = document.getElementById('xpNext');
  if (curEl) curEl.textContent = xp;
  const nextXP = XP_TABLE[level] || XP_TABLE[XP_TABLE.length - 1];
  if (nextEl) nextEl.textContent = nextXP;
  // Sincronizar dado de golpe solo si es personaje de una clase
  _migrateHitDice();
  if ((CHARACTER_STATE.hitDice||[]).length === 1) {
    CHARACTER_STATE.hitDice[0].count = level;
    CHARACTER_STATE.hitDice[0].spent = Math.min(CHARACTER_STATE.hitDice[0].spent, level);
  }
  updateXP();
  renderHitDice();
  // Actualizar meta-value de clase + recurso + ranuras (solo clase única sin multiclase)
  const metaElSD = document.querySelector('.hero-pill[data-field="class"] .meta-value');
  const oldClassTextSD = metaElSD?.textContent?.trim() || '';
  const classNameSD = oldClassTextSD.replace(/\s+\d+$/, '').trim();
  if (metaElSD && classNameSD && !oldClassTextSD.includes('/')) {
    const newClassTextSD = `${classNameSD} ${level}`;
    metaElSD.textContent = newClassTextSD;
    if (CHARACTER_STATE.classResource) {
      const newUses = calcResourceMaxUses(classNameSD, level);
      if (newUses !== null) { CHARACTER_STATE.classResource.maxUses = newUses; renderRage(); }
    }
    if (CASTER_TYPE[classNameSD]) {
      const newSlots = computeSpellSlots(newClassTextSD);
      if (newSlots) {
        [1,2,3,4,5,6,7,8,9].forEach(lv => {
          const used = Math.min(state.spellSlotsState[lv]?.used || 0, newSlots[lv]?.max || 0);
          state.spellSlotsState[lv] = { max: newSlots[lv]?.max || 0, used };
        });
      }
      _syncPactSlots(newClassTextSD);
      renderSpellSlots();
    }
  }
  showToast(`✦ Nivel ${level} fijado`);
  window.saveToLocal?.();
}

// Window bridge
window.getCurrentLevel = getCurrentLevel;
window.updateXP        = updateXP;
window.addXP           = addXP;
window.setLevelDirect  = setLevelDirect;
window.XP_TABLE        = XP_TABLE;
