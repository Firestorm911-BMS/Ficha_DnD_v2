import { state } from '../state.js';
import { calcProfBonus, getMod } from './attributes.js';
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
    if (CHARACTER_STATE.extraClassResources?.length) {
      CHARACTER_STATE.extraClassResources.forEach(r => {
        if (!r.className) return;
        const escaped = r.className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m = classTextLU.match(new RegExp(`(?:^|\\/)\\s*${escaped}\\s+(\\d+)`));
        if (m) {
          const newUses = calcResourceMaxUses(r.className, parseInt(m[1]) || 1);
          if (newUses !== null) r.maxUses = newUses;
        }
      });
      renderRage();
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

function _setLevelDirectMulticlass(metaEl, pillText, targetLevel) {
  const parts = pillText.split('/').map(p => {
    const m = p.trim().match(/^(.+?)\s+(\d+)$/);
    return m ? { clase: m[1].trim(), nivel: parseInt(m[2]) } : null;
  }).filter(Boolean);

  const totalCurrent = parts.reduce((s, p) => s + p.nivel, 0);
  if (targetLevel >= totalCurrent) return; // subiendo o mismo nivel, sin cambios

  // Reducir niveles empezando por la última clase
  let toRemove = totalCurrent - targetLevel;
  const newParts = parts.map(p => ({ ...p }));
  for (let i = newParts.length - 1; i >= 0 && toRemove > 0; i--) {
    const removable = Math.min(newParts[i].nivel, toRemove);
    newParts[i].nivel -= removable;
    toRemove -= removable;
  }
  const activeParts = newParts.filter(p => p.nivel > 0);

  // Reducir HP por promedio de cada nivel eliminado
  const conMod = getMod('CON');
  let hpReduction = 0;
  for (let i = 0; i < parts.length; i++) {
    const removed = parts[i].nivel - (newParts[i]?.nivel || 0);
    if (removed > 0) {
      const dieStr   = window.CLASS_TEMPLATES?.[parts[i].clase]?.hitDie || 'd8';
      const dieSides = parseInt(dieStr.replace('d', '')) || 8;
      hpReduction   += removed * Math.max(1, Math.ceil(dieSides / 2 + 0.5) + conMod);
    }
  }
  if (hpReduction > 0) {
    const maxEl  = document.getElementById('hpMax');
    const curHpEl = document.getElementById('hpCurrent');
    if (maxEl)   maxEl.textContent   = Math.max(1, (parseInt(maxEl.textContent)   || 0) - hpReduction);
    if (curHpEl) curHpEl.textContent = Math.max(0, (parseInt(curHpEl.textContent) || 0) - hpReduction);
    window.updateHP?.();
  }

  // Actualizar hitDice — reducir conteo por tipo de dado
  for (let i = 0; i < parts.length; i++) {
    const removed = parts[i].nivel - (newParts[i]?.nivel || 0);
    if (removed > 0) {
      const dieStr = window.CLASS_TEMPLATES?.[parts[i].clase]?.hitDie || 'd8';
      const entry  = CHARACTER_STATE.hitDice?.find(d => d.die === dieStr);
      if (entry) {
        entry.count = Math.max(0, entry.count - removed);
        entry.spent = Math.min(entry.spent || 0, entry.count);
      }
    }
  }
  CHARACTER_STATE.hitDice = (CHARACTER_STATE.hitDice || []).filter(d => d.count > 0);
  if (!CHARACTER_STATE.hitDice.length) _migrateHitDice();

  // Quitar recursos extra de clases eliminadas
  const activeClassNames = new Set(activeParts.map(p => p.clase));
  if (CHARACTER_STATE.extraClassResources?.length) {
    CHARACTER_STATE.extraClassResources = CHARACTER_STATE.extraClassResources.filter(
      r => activeClassNames.has(r.className)
    );
  }

  // Si quedó una sola clase, sincronizar recurso principal y ranuras
  const newPillText = activeParts.map(p => `${p.clase} ${p.nivel}`).join('/');
  if (metaEl) metaEl.textContent = newPillText;

  if (activeParts.length === 1 && CHARACTER_STATE.classResource) {
    const newUses = calcResourceMaxUses(activeParts[0].clase, activeParts[0].nivel);
    if (newUses !== null) CHARACTER_STATE.classResource.maxUses = newUses;
  }
  _syncPactSlots(newPillText);
  const newSlots = computeSpellSlots(newPillText);
  if (newSlots) {
    [1,2,3,4,5,6,7,8,9].forEach(lv => {
      const used = Math.min(state.spellSlotsState[lv]?.used || 0, newSlots[lv]?.max || 0);
      state.spellSlotsState[lv] = { max: newSlots[lv]?.max || 0, used };
    });
  }
  renderSpellSlots();
  renderRage();
  renderHitDice();

  if (hpReduction > 0) {
    showToast(`⚠ HP reducido ~${hpReduction} PG (promedio). Ajustá si es necesario.`);
  }
}

function _restoreFromSnapshot(snapshot, targetLevel) {
  // Restaurar HP exacto
  if (snapshot.hpMax) {
    const maxEl   = document.getElementById('hpMax');
    const curHpEl = document.getElementById('hpCurrent');
    const oldMax  = parseInt(maxEl?.textContent) || 0;
    const oldCur  = parseInt(curHpEl?.textContent) || 0;
    const hpLost  = Math.max(0, oldMax - snapshot.hpMax);
    if (maxEl)   maxEl.textContent   = snapshot.hpMax;
    if (curHpEl) curHpEl.textContent = Math.max(0, oldCur - hpLost);
    window.updateHP?.();
  }

  // Restaurar pill y sincronizar estado derivado
  const metaEl    = document.querySelector('.hero-pill[data-field="class"] .meta-value');
  const classText = snapshot.classText || '';
  if (metaEl && classText) {
    metaEl.textContent = classText;

    // Reconstruir hitDice desde las clases del snapshot (unificar mismo tipo de dado)
    const snapParts = classText.split('/').map(p => {
      const m = p.trim().match(/^(.+?)\s+(\d+)$/);
      return m ? { clase: m[1].trim(), nivel: parseInt(m[2]) } : null;
    }).filter(Boolean);

    const hitDiceMap = new Map();
    for (const { clase, nivel } of snapParts) {
      const die = window.CLASS_TEMPLATES?.[clase]?.hitDie || 'd8';
      const cur = hitDiceMap.get(die) || 0;
      hitDiceMap.set(die, cur + nivel);
    }
    CHARACTER_STATE.hitDice = Array.from(hitDiceMap.entries()).map(([die, count]) => {
      const prevSpent = CHARACTER_STATE.hitDice?.find(d => d.die === die)?.spent || 0;
      return { die, count, spent: Math.min(prevSpent, count) };
    });

    // Filtrar extraClassResources a clases secundarias del snapshot
    const secondaryClasses = new Set(snapParts.slice(1).map(p => p.clase));
    CHARACTER_STATE.extraClassResources = (CHARACTER_STATE.extraClassResources || []).filter(
      r => secondaryClasses.has(r.className)
    );

    // Sincronizar recurso de clase primaria
    if (snapParts[0] && CHARACTER_STATE.classResource) {
      const newUses = calcResourceMaxUses(snapParts[0].clase, snapParts[0].nivel);
      if (newUses !== null) CHARACTER_STATE.classResource.maxUses = newUses;
    }

    // Sincronizar ranuras de conjuro
    _syncPactSlots(classText);
    const newSlots = computeSpellSlots(classText);
    if (newSlots) {
      [1,2,3,4,5,6,7,8,9].forEach(lv => {
        const used = Math.min(state.spellSlotsState[lv]?.used || 0, newSlots[lv]?.max || 0);
        state.spellSlotsState[lv] = { max: newSlots[lv]?.max || 0, used };
      });
    }
    renderSpellSlots();
    renderRage();
    renderHitDice();
  }
}

export function setLevelDirect(level) {
  level = Math.max(1, Math.min(20, parseInt(level) || 1));

  // Capturar nivel actual ANTES de cambiar XP.
  // Usar también los niveles de la pill como fuente de verdad (puede ser mayor al XP
  // si el XP no está sincronizado con la pill multiclase).
  const oldLevel = getCurrentLevel();
  const metaElSD       = document.querySelector('.hero-pill[data-field="class"] .meta-value');
  const oldClassTextSD = metaElSD?.textContent?.trim() || '';
  const pillTotalLevels = oldClassTextSD.split('/').reduce((s, p) => {
    const m = p.trim().match(/\s+(\d+)$/);
    return s + (m ? parseInt(m[1]) : 0);
  }, 0);
  const effectiveOldLevel = Math.max(oldLevel, pillTotalLevels);
  const goingDown = level < effectiveOldLevel;

  const xp = XP_TABLE[level - 1] || 0;
  const curEl = document.getElementById('xpCurrent');
  const nextEl = document.getElementById('xpNext');
  if (curEl) curEl.textContent = xp;
  const nextXP = XP_TABLE[level] || XP_TABLE[XP_TABLE.length - 1];
  if (nextEl) nextEl.textContent = nextXP;

  if (goingDown) {
    const snapshot = (CHARACTER_STATE.levelHistory || {})[level];
    if (snapshot?.hpMax) {
      // ── Restauración exacta desde historial ──
      _restoreFromSnapshot(snapshot, level);
    } else {
      // ── Fallback aproximado (sin historial previo) ──
      if (oldClassTextSD.includes('/')) {
        _setLevelDirectMulticlass(metaElSD, oldClassTextSD, level);
        const afterPill = metaElSD?.textContent?.trim() || '';
        if (!afterPill.includes('/')) {
          _migrateHitDice();
          if ((CHARACTER_STATE.hitDice||[]).length === 1) {
            CHARACTER_STATE.hitDice[0].count = level;
            CHARACTER_STATE.hitDice[0].spent = Math.min(CHARACTER_STATE.hitDice[0].spent || 0, level);
          }
        }
      } else {
        _migrateHitDice();
        if ((CHARACTER_STATE.hitDice||[]).length === 1) {
          CHARACTER_STATE.hitDice[0].count = level;
          CHARACTER_STATE.hitDice[0].spent = Math.min(CHARACTER_STATE.hitDice[0].spent || 0, level);
        }
        const classNameSD = oldClassTextSD.replace(/\s+\d+$/, '').trim();
        if (metaElSD && classNameSD) {
          metaElSD.textContent = `${classNameSD} ${level}`;
          const dieStr   = window.CLASS_TEMPLATES?.[classNameSD]?.hitDie || CHARACTER_STATE.hitDieType || 'd8';
          const dieSides = parseInt(dieStr.replace('d', '')) || 8;
          const hpPerLvl = Math.max(1, Math.ceil(dieSides / 2 + 0.5) + getMod('CON'));
          const hpReduction = (oldLevel - level) * hpPerLvl;
          const maxEl   = document.getElementById('hpMax');
          const curHpEl = document.getElementById('hpCurrent');
          if (maxEl)   maxEl.textContent   = Math.max(1, (parseInt(maxEl.textContent)   || 0) - hpReduction);
          if (curHpEl) curHpEl.textContent = Math.max(0, (parseInt(curHpEl.textContent) || 0) - hpReduction);
          window.updateHP?.();
          if (CHARACTER_STATE.classResource) {
            const newUses = calcResourceMaxUses(classNameSD, level);
            if (newUses !== null) { CHARACTER_STATE.classResource.maxUses = newUses; renderRage(); }
          }
          if (CASTER_TYPE[classNameSD]) {
            const newClassTextSD = `${classNameSD} ${level}`;
            const newSlots = computeSpellSlots(newClassTextSD);
            if (newSlots) {
              [1,2,3,4,5,6,7,8,9].forEach(lv => {
                const used = Math.min(state.spellSlotsState[lv]?.used || 0, newSlots[lv]?.max || 0);
                state.spellSlotsState[lv] = { max: newSlots[lv]?.max || 0, used };
              });
            }
            _syncPactSlots(`${classNameSD} ${level}`);
            renderSpellSlots();
          }
          showToast(`⚠ HP reducido ~${hpReduction} PG (promedio). Ajustá si es necesario.`);
        }
      }
    }

    // Borrar historial por encima del nivel al que se bajó
    if (CHARACTER_STATE.levelHistory) {
      Object.keys(CHARACTER_STATE.levelHistory).forEach(k => {
        if (parseInt(k) > level) delete CHARACTER_STATE.levelHistory[k];
      });
    }
  } else {
    // Subiendo o mismo nivel — lógica existente para clase única
    _migrateHitDice();
    if ((CHARACTER_STATE.hitDice||[]).length === 1) {
      CHARACTER_STATE.hitDice[0].count = level;
      CHARACTER_STATE.hitDice[0].spent = Math.min(CHARACTER_STATE.hitDice[0].spent || 0, level);
    }
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
  }

  // Safety net: si la pill sigue teniendo más niveles de clase que el nivel fijado,
  // forzar limpieza (cubre casos donde goingDown fue falso por XP desincronizado
  // o snapshot con classText vacío/erróneo).
  const finalPill = metaElSD?.textContent?.trim() || '';
  if (finalPill.includes('/')) {
    const finalTotal = finalPill.split('/').reduce((s, p) => {
      const m = p.trim().match(/\s+(\d+)$/);
      return s + (m ? parseInt(m[1]) : 0);
    }, 0);
    if (finalTotal > level) _setLevelDirectMulticlass(metaElSD, finalPill, level);
  }

  updateXP();
  renderHitDice();
  showToast(`✦ Nivel ${level} fijado`);
  window.saveToLocal?.();
}

// Window bridge
window.getCurrentLevel = getCurrentLevel;
window.updateXP        = updateXP;
window.addXP           = addXP;
window.setLevelDirect  = setLevelDirect;
window.XP_TABLE        = XP_TABLE;
