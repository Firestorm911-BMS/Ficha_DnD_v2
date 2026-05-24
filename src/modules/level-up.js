import { state } from '../state.js';
import { getMod } from './attributes.js';
import { computeSpellSlots, renderSpellSlots, CASTER_TYPE, _syncPactSlots } from './spell-slots.js';
import { calcResourceMaxUses, getResourceScale, renderRage } from './rage.js';
import { _migrateHitDice, renderHitDice } from './hit-dice.js';
import { updateHP } from './hp.js';
import { showToast, addCombatLog } from './toast-log.js';

const PROF_BONUS_TABLE = [0, 2,2,2,2, 3,3,3,3, 4,4,4,4, 5,5,5,5, 6,6,6,6];
const FULL_CASTERS  = new Set(['Bardo','Clérigo','Druida','Mago','Hechicero']);
const HALF_CASTERS  = new Set(['Paladín','Explorador']);
const WARLOCK_CLASS = 'Brujo';
const ALL_CLASSES   = ['Bárbaro','Bardo','Clérigo','Druida','Guerrero','Hechicero','Mago','Monje','Paladín','Pícaro','Explorador','Brujo'];

// ── Devuelve un array de 9 elementos con las ranuras por nivel de conjuro
// para una clase y nivel dados. Usa computeSpellSlots internamente.
export function getSlotTableForLevel(className, level) {
  if (!FULL_CASTERS.has(className) && !HALF_CASTERS.has(className) && className !== WARLOCK_CLASS) {
    return null;
  }
  const slots = computeSpellSlots(`${className} ${level}`);
  if (!slots) return null;
  return [1,2,3,4,5,6,7,8,9].map(lv => slots[lv]?.max || 0);
}

// ── Parsea pill multiclase en partes individuales.
// NOTA: diseñado para procesar hasta 2 clases simultáneas.
// Si el personaje tiene más de 2 clases, solo se procesan las primeras 2.
function _parseMulticlassParts(pillText) {
  if (!pillText.includes('/')) return null;
  const parts = pillText.split('/').slice(0, 2); // máx 2 clases
  const result = [];
  for (const p of parts) {
    const m = p.trim().match(/^(.+?)\s+(\d+)$/);
    if (!m) return null;
    const clase = m[1].trim();
    const nivel = parseInt(m[2]);
    const hitDie = window.CLASS_TEMPLATES?.[clase]?.hitDie || 'd8';
    result.push({ clase, nivel, hitDie });
  }
  return result.length >= 2 ? result : null;
}

// ── Maneja la selección de clase en el asistente de nivel (multiclase)
export function selectLevelUpClass(className) {
  // Destacar card seleccionada
  document.querySelectorAll('.lv-class-card').forEach(c => {
    c.style.borderColor = 'rgba(201,168,76,0.3)';
    c.style.background = 'transparent';
    c.style.transform = '';
  });
  const selCard = document.getElementById('lvCard_' + className);
  if (selCard) {
    selCard.style.borderColor = 'var(--gold)';
    selCard.style.background = 'rgba(201,168,76,0.12)';
    selCard.style.transform = 'scale(1.02)';
  }

  // Habilitar sección de HP
  const hpSec = document.getElementById('lvHpSection');
  if (hpSec) {
    hpSec.style.opacity = '1';
    hpSec.style.pointerEvents = 'auto';
    hpSec.style.transition = 'opacity 0.25s';
  }

  // Actualizar botones de HP con el dado de la clase elegida
  const dieStr  = window.CLASS_TEMPLATES?.[className]?.hitDie || 'd8';
  const sides   = parseInt(dieStr.replace('d', '')) || 8;
  const conMod  = getMod('CON');
  const avg     = Math.ceil(sides / 2 + 0.5) + conMod;
  const conSign = conMod >= 0 ? '+' : '';

  const rollBtn = document.getElementById('lvRollBtn');
  const avgBtn  = document.getElementById('lvAvgBtn');
  if (rollBtn) {
    rollBtn.textContent = `🎲 Tirar ${dieStr}${conSign}${conMod} CON`;
    rollBtn.onclick = () => rollLevelUpHP(sides, conMod);
  }
  if (avgBtn) {
    avgBtn.textContent = `Promedio (${avg})`;
    avgBtn.onclick = () => takeLevelUpHPAvg(sides, conMod);
  }

  // Guardar clase seleccionada en el modal
  const modal = document.getElementById('levelUpModal');
  if (modal) modal.dataset.selectedClass = className;
}

// ── Confirma la subida de nivel multiclase: actualiza pill + hitDice + slots
export function _confirmMulticlassLevelUp(originalPillText) {
  const modal = document.getElementById('levelUpModal');
  const selectedClass = modal?.dataset.selectedClass;
  if (!selectedClass) {
    showToast('⚠ Seleccioná una clase para continuar');
    return;
  }

  const pillEl = document.querySelector('.hero-pill[data-field="class"] .meta-value');
  if (pillEl) {
    // Incrementar solo la clase elegida en el texto de la pill
    const newText = originalPillText.replace(
      new RegExp(`(${selectedClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s+(\\d+)`),
      (_, cls, lvl) => `${cls} ${parseInt(lvl) + 1}`
    );
    pillEl.textContent = newText;

    // Incrementar count en hitDice para el die de esa clase
    const dieType = window.CLASS_TEMPLATES?.[selectedClass]?.hitDie || 'd8';
    const diceEntry = (state.CHARACTER_STATE.hitDice || []).find(d => d.die === dieType);
    if (diceEntry) diceEntry.count++;

    // Recalcular ranuras con el nuevo texto de clase
    const newSlots = computeSpellSlots(newText);
    if (newSlots) {
      [1,2,3,4,5,6,7,8,9].forEach(lv => {
        if (state.spellSlotsState[lv] && newSlots[lv]) state.spellSlotsState[lv].max = newSlots[lv].max;
      });
      renderSpellSlots();
    }

    addCombatLog(`⬆ ${selectedClass} subió de nivel → ${newText}`);
    window.saveToLocal?.();
  }
  modal?.remove();
}

export function switchLevelUpMode(mode) {
  const modal   = document.getElementById('levelUpModal');
  if (!modal) return;

  // Deshacer cualquier gain de HP del modo anterior antes de cambiar
  const prevGain = parseInt(modal.dataset.hpGain || '0');
  if (prevGain > 0) {
    const maxEl = document.getElementById('hpMax');
    const curEl = document.getElementById('hpCurrent');
    if (maxEl) maxEl.textContent = Math.max(1, (parseInt(maxEl.textContent) || 0) - prevGain);
    if (curEl) curEl.textContent = Math.max(0, (parseInt(curEl.textContent) || 0) - prevGain);
    window.updateHP?.();
    modal.dataset.hpGain = '0';
    const r1 = document.getElementById('lvHpResult');
    if (r1) r1.innerHTML = '<span style="color:var(--text-muted)">— Tira el dado</span>';
    const r2 = document.getElementById('lvHpResultNueva');
    if (r2) r2.innerHTML = '— Seleccioná una clase';
  }

  const btnSubir = document.getElementById('lvModeSubir');
  const btnNueva = document.getElementById('lvModeNueva');
  const secSubir = document.getElementById('lvSectionSubir');
  const secNueva = document.getElementById('lvSectionNueva');
  if (mode === 'subir') {
    if (btnSubir) { btnSubir.style.background = 'rgba(201,168,76,0.85)'; btnSubir.style.color = '#1a1209'; }
    if (btnNueva) { btnNueva.style.background = 'transparent';           btnNueva.style.color = 'var(--gold)'; }
    if (secSubir) secSubir.style.display = '';
    if (secNueva) secNueva.style.display = 'none';
    modal.dataset.mode = 'subir';
  } else {
    if (btnNueva) { btnNueva.style.background = 'rgba(201,168,76,0.85)'; btnNueva.style.color = '#1a1209'; }
    if (btnSubir) { btnSubir.style.background = 'transparent';           btnSubir.style.color = 'var(--gold)'; }
    if (secSubir) secSubir.style.display = 'none';
    if (secNueva) secNueva.style.display = '';
    modal.dataset.mode = 'nueva';
  }
}

export function selectNewMulticlassClass(className) {
  document.querySelectorAll('.lv-new-class-card').forEach(c => {
    c.style.borderColor = 'rgba(201,168,76,0.3)';
    c.style.background  = 'transparent';
  });
  const card = document.getElementById('lvNewCard_' + className);
  if (card) { card.style.borderColor = 'var(--gold)'; card.style.background = 'rgba(201,168,76,0.12)'; }

  const modal = document.getElementById('levelUpModal');
  if (modal) modal.dataset.selectedNewClass = className;

  const dieType = window.CLASS_TEMPLATES?.[className]?.hitDie || 'd8';
  const sides   = parseInt(dieType.replace('d', '')) || 8;
  const conMod  = getMod('CON');
  const avg     = Math.ceil(sides / 2 + 0.5) + conMod;
  const conSign = conMod >= 0 ? '+' : '';

  const hpSec = document.getElementById('lvHpSectionNueva');
  if (hpSec) { hpSec.style.opacity = '1'; hpSec.style.pointerEvents = 'auto'; hpSec.style.transition = 'opacity 0.25s'; }

  const rollBtn = document.getElementById('lvRollBtnNueva');
  const avgBtn  = document.getElementById('lvAvgBtnNueva');
  if (rollBtn) {
    rollBtn.textContent = `🎲 Tirar ${dieType}${conSign}${conMod} CON`;
    rollBtn.onclick = () => {
      const roll = Math.ceil(Math.random() * sides);
      const gain = Math.max(1, roll + conMod);
      applyLevelUpHP(gain, `1d${sides}(${roll}) ${conSign}${conMod} CON`);
      const res = document.getElementById('lvHpResultNueva');
      if (res) res.innerHTML = `<span style="color:var(--gold);font-weight:bold;">+${gain} PG</span>`;
    };
  }
  if (avgBtn) {
    avgBtn.textContent = `Promedio (${avg})`;
    avgBtn.onclick = () => {
      const gain = Math.max(1, Math.ceil(sides / 2 + 0.5) + conMod);
      applyLevelUpHP(gain, `Promedio ${Math.ceil(sides / 2 + 0.5)} ${conSign}${conMod} CON`);
      const res = document.getElementById('lvHpResultNueva');
      if (res) res.innerHTML = `<span style="color:var(--gold);font-weight:bold;">+${gain} PG</span>`;
    };
  }
}

export function _confirmNewMulticlass(currentPillText) {
  const modal = document.getElementById('levelUpModal');
  const selectedClass = modal?.dataset.selectedNewClass;
  if (!selectedClass) { showToast('⚠ Seleccioná una clase para continuar'); return; }

  const pillEl = document.querySelector('.hero-pill[data-field="class"] .meta-value');
  if (!pillEl) { modal?.remove(); return; }

  const newPillText = `${currentPillText}/${selectedClass} 1`;
  pillEl.textContent = newPillText;

  const dieType = window.CLASS_TEMPLATES?.[selectedClass]?.hitDie || 'd8';
  if (!state.CHARACTER_STATE.hitDice) state.CHARACTER_STATE.hitDice = [];
  const existing = state.CHARACTER_STATE.hitDice.find(d => d.die === dieType);
  if (existing) { existing.count++; } else { state.CHARACTER_STATE.hitDice.push({ die: dieType, count: 1, spent: 0 }); }

  const newSlots = computeSpellSlots(newPillText);
  if (newSlots) {
    [1,2,3,4,5,6,7,8,9].forEach(lv => {
      if (newSlots[lv]) {
        if (!state.spellSlotsState[lv]) state.spellSlotsState[lv] = { max: 0, used: 0 };
        state.spellSlotsState[lv].max = newSlots[lv].max;
      }
    });
    renderSpellSlots();
  }
  _syncPactSlots(newPillText);
  renderHitDice();

  // Agregar recurso de la nueva clase al array de extras (sin tocar el primario)
  const newTemplate = window.CLASS_TEMPLATES?.[selectedClass];
  if (newTemplate?.resource?.name) {
    const scaledUses = getResourceScale(selectedClass, 1);
    const extraRes   = { ...newTemplate.resource, usesSpent: 0, className: selectedClass };
    if (scaledUses !== null) extraRes.maxUses = scaledUses;
    window.addExtraResource?.(extraRes);
  }

  // Actualizar classText en el snapshot del nivel actual (pill ya cambió a multiclase)
  const currentLevel = window.getCurrentLevel?.() || 1;
  if (state.CHARACTER_STATE.levelHistory?.[currentLevel]) {
    state.CHARACTER_STATE.levelHistory[currentLevel].classText = newPillText;
  }

  addCombatLog(`⬆ Multiclase iniciada: ${newPillText}`);
  showToast(`✦ ${newPillText}`);
  window.saveToLocal?.();
  modal?.remove();
}

export function _handleLevelUpConfirm() {
  const modal = document.getElementById('levelUpModal');
  if ((modal?.dataset.mode || 'subir') === 'nueva') {
    _confirmNewMulticlass(modal?.dataset.pillText || '');
  } else {
    modal?.remove();
  }
}

export function openLevelUpAssistant(newLevel) {
  const existing = document.getElementById('levelUpModal');
  if (existing) existing.remove();

  const conMod = getMod('CON');
  const pb     = PROF_BONUS_TABLE[newLevel] || 2;

  // Detectar multiclase — parsear pill (hasta 2 clases)
  const pillText   = (document.querySelector('.hero-pill[data-field="class"] .meta-value')?.textContent || '').trim();

  // addXP ya bumpeó "Clase N-1" → "Clase N" antes de abrir el modal.
  // Para el snapshot previo y para la base de multiclase necesitamos "Clase N-1".
  let prevPillText = pillText;
  if (!pillText.includes('/')) {
    const _bm = pillText.match(/^(.+?)\s+(\d+)$/);
    if (_bm && parseInt(_bm[2]) === newLevel) {
      prevPillText = `${_bm[1].trim()} ${newLevel - 1}`;
    }
  }

  // Guardar snapshot del nivel anterior con la pill correcta (pre-bump)
  const prevLevel = newLevel - 1;
  if (prevLevel >= 1) {
    state.CHARACTER_STATE.levelHistory = state.CHARACTER_STATE.levelHistory || {};
    if (!state.CHARACTER_STATE.levelHistory[prevLevel]) {
      state.CHARACTER_STATE.levelHistory[prevLevel] = {
        hpMax: parseInt(document.getElementById('hpMax')?.textContent) || 0,
        classText: prevPillText
      };
    }
  }
  const multiParts = _parseMulticlassParts(pillText);
  const isMulti    = !!multiParts;

  // Clase principal (para clase única o fallback)
  const classMeta = isMulti ? '' : pillText.split(' ')[0];

  // ── Tabla de ASI por clase (PHB 5e)
  const ASI_LEVELS = {
    'Guerrero': [4, 6, 8, 12, 14, 16, 19],
    'Pícaro':   [4, 8, 10, 12, 16, 19],
  };

  // ── ASI (solo clase única — para multi se muestra por card)
  const isASI = !isMulti && (ASI_LEVELS[classMeta] || [4, 8, 12, 16, 19]).includes(newLevel);
  const asiHTML = isASI
    ? `<div class="lv-row" style="border:1px solid var(--gold-dark);border-radius:6px;padding:8px 10px;background:rgba(201,168,76,0.08);">
        <span class="lv-label">📈 ASI / Dote</span>
        <span class="lv-val" style="color:var(--gold);">+2 a un atributo, o +1 a dos, o una Dote</span>
       </div>`
    : '';

  // ── Slots (solo clase única)
  const newSlots = !isMulti ? getSlotTableForLevel(classMeta, newLevel) : null;
  let slotsHTML = '';
  if (newSlots) {
    const parts = newSlots.map((n, i) => n > 0 ? `Nv${i+1}: ${n}` : '').filter(Boolean);
    if (parts.length) slotsHTML = `<div class="lv-row"><span class="lv-label">💠 Ranuras totales</span><span class="lv-val">${parts.join(' · ')}</span></div>`;
  }

  // ── Recurso de clase
  const cr = state.CHARACTER_STATE.classResource || {};
  const crHTML = cr.name && cr.maxUses > 0
    ? `<div class="lv-row"><span class="lv-label">${cr.icon||'⚡'} ${cr.name}</span><span class="lv-val">Ajusta tus usos según la tabla de clase</span></div>`
    : '';

  // ── Cards de selección de clase (multiclase)
  let classSelectionHTML = '';
  if (isMulti) {
    const cards = multiParts.map(({ clase, nivel, hitDie }) => {
      const sides   = parseInt(hitDie.replace('d', '')) || 8;
      const newNv   = nivel + 1;
      const hasASI  = (ASI_LEVELS[clase] || [4, 8, 12, 16, 19]).includes(newNv);
      const avg     = Math.ceil(sides / 2 + 0.5) + conMod;
      const conSign = conMod >= 0 ? '+' : '';
      return `
        <div class="lv-class-card" id="lvCard_${clase}"
          onclick="selectLevelUpClass('${clase}')"
          style="flex:1;padding:12px 8px;border:1px solid rgba(201,168,76,0.3);border-radius:8px;
                 cursor:pointer;text-align:center;transition:all 0.2s;user-select:none;">
          <div style="font-family:'Cinzel',serif;font-size:14px;color:var(--gold);">${clase}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">Nv ${nivel} → ${newNv}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${hitDie} · prom ~${avg}</div>
          ${hasASI ? `<div style="font-size:11px;color:var(--gold);margin-top:4px;">📈 ASI / Dote</div>` : ''}
        </div>`;
    }).join('');
    classSelectionHTML = `
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;color:var(--text-muted);text-align:center;letter-spacing:1px;margin-bottom:8px;">¿EN QUÉ CLASE SUBÍS?</div>
        <div style="display:flex;gap:10px;">${cards}</div>
      </div>`;
  }

  // ── Sección HP — deshabilitada hasta seleccionar clase (en multi)
  const hpStyle    = isMulti ? 'opacity:0.4;pointer-events:none;' : '';
  const dieType    = !isMulti ? (state.CHARACTER_STATE.hitDice?.[0]?.die || 'd8') : 'd8';
  const dieSides   = parseInt(dieType.replace('d','')) || 8;
  const conSign0   = conMod >= 0 ? '+' : '';
  const hpAvgLabel = Math.ceil(dieSides/2+0.5)+conMod;
  const hpSection  = `
    <div id="lvHpSection" style="${hpStyle}">
      <div class="lv-row" style="align-items:flex-start;">
        <span class="lv-label">❤ Puntos de Golpe</span>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div id="lvHpResult" style="font-family:'Cinzel',serif;font-size:13px;color:var(--text-muted);">— Tira el dado</div>
          <div style="display:flex;gap:6px;">
            <button id="lvRollBtn" class="btn btn-sm" onclick="rollLevelUpHP(${dieSides},${conMod})">🎲 Tirar ${dieType}${conSign0}${conMod} CON</button>
            <button id="lvAvgBtn" class="btn btn-sm" onclick="takeLevelUpHPAvg(${dieSides},${conMod})">Promedio (${hpAvgLabel})</button>
          </div>
        </div>
      </div>
    </div>`;

  // ── Mode selector y sección nueva clase (solo para clase única)
  const modeSelectorHTML = !isMulti ? `
    <div style="display:flex;gap:0;margin-bottom:16px;border-radius:6px;overflow:hidden;border:1px solid rgba(201,168,76,0.4);">
      <button id="lvModeSubir" onclick="switchLevelUpMode('subir')"
        style="flex:1;padding:8px 4px;background:rgba(201,168,76,0.85);color:#1a1209;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:11px;letter-spacing:0.5px;transition:all 0.2s;">
        ▲ Subir ${classMeta || 'clase actual'}
      </button>
      <button id="lvModeNueva" onclick="switchLevelUpMode('nueva')"
        style="flex:1;padding:8px 4px;background:transparent;color:var(--gold);border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:11px;letter-spacing:0.5px;transition:all 0.2s;">
        ✦ Nueva clase
      </button>
    </div>` : '';

  let sectionNuevaHTML = '';
  if (!isMulti) {
    const otherClasses  = ALL_CLASSES.filter(c => c !== classMeta);
    const newClassCards = otherClasses.map(c => {
      const die = window.CLASS_TEMPLATES?.[c]?.hitDie || 'd8';
      return `<div class="lv-new-class-card" id="lvNewCard_${c}" onclick="selectNewMulticlassClass('${c}')"
        style="padding:8px 4px;border:1px solid rgba(201,168,76,0.3);border-radius:6px;cursor:pointer;text-align:center;transition:all 0.2s;user-select:none;">
        <div style="font-family:'Cinzel',serif;font-size:12px;color:var(--gold);">${c}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${die}</div>
      </div>`;
    }).join('');
    sectionNuevaHTML = `
    <div id="lvSectionNueva" style="display:none">
      <div style="font-size:11px;color:var(--text-muted);text-align:center;letter-spacing:1px;margin-bottom:8px;">ELEGÍ LA NUEVA CLASE</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px;">${newClassCards}</div>
      <div id="lvHpSectionNueva" style="opacity:0.4;pointer-events:none;">
        <div class="lv-row" style="align-items:flex-start;">
          <span class="lv-label">❤ PG nueva clase</span>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            <div id="lvHpResultNueva" style="font-family:'Cinzel',serif;font-size:13px;color:var(--text-muted);">— Seleccioná una clase</div>
            <div style="display:flex;gap:6px;">
              <button id="lvRollBtnNueva" class="btn btn-sm">🎲 Tirar dado</button>
              <button id="lvAvgBtnNueva" class="btn btn-sm">Promedio</button>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top:10px;padding:8px;border-radius:6px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.15);">
        <span style="font-size:11px;color:var(--text-muted);">⚠ El recurso de la nueva clase deberá configurarse manualmente.</span>
      </div>
    </div>`;
  }

  const secSubirOpen  = !isMulti ? '<div id="lvSectionSubir">' : '';
  const secSubirClose = !isMulti ? '</div>' : '';

  // ── Botón Listo
  const confirmFn = isMulti
    ? `_confirmMulticlassLevelUp('${pillText.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')`
    : `_handleLevelUpConfirm()`;

  const modal = document.createElement('div');
  modal.id = 'levelUpModal';
  modal.dataset.pillText = prevPillText;
  modal.dataset.mode     = 'subir';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  modal.innerHTML = `
    <div style="background:var(--bg-card);border:2px solid var(--gold);border-radius:12px;padding:30px;max-width:460px;width:92%;box-shadow:0 0 80px rgba(201,168,76,0.3);font-family:'IM Fell English',serif;">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:26px;color:var(--gold);animation:xpFullPulse 1.5s ease-in-out infinite;">✦ ¡Nivel ${newLevel}!</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:6px;">Aplica los cambios de subida de nivel</div>
      </div>

      ${modeSelectorHTML}
      ${classSelectionHTML}

      ${secSubirOpen}
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
        <div class="lv-row"><span class="lv-label">🛡 Bonif. Competencia</span><span class="lv-val">+${pb}</span></div>
        ${slotsHTML}
        ${crHTML}
        ${asiHTML}
        ${hpSection}
      </div>
      ${secSubirClose}

      ${sectionNuevaHTML}

      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="lvConfirmBtn" class="btn btn-sm" onclick="${confirmFn}">✓ Listo</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

export function rollLevelUpHP(dieSides, conMod) {
  const roll = Math.ceil(Math.random() * dieSides);
  const gain = Math.max(1, roll + conMod);
  applyLevelUpHP(gain, `1d${dieSides}(${roll}) ${conMod>=0?'+':''}${conMod} CON`);
}

export function takeLevelUpHPAvg(dieSides, conMod) {
  const avg = Math.ceil(dieSides / 2 + 0.5);
  const gain = Math.max(1, avg + conMod);
  applyLevelUpHP(gain, `Promedio ${avg} ${conMod>=0?'+':''}${conMod} CON`);
}

export function applyLevelUpHP(gain, label) {
  const maxEl = document.getElementById('hpMax');
  const curEl = document.getElementById('hpCurrent');
  // Deshacer tirada previa de esta sesión antes de aplicar la nueva
  const modal    = document.getElementById('levelUpModal');
  const prevGain = parseInt(modal?.dataset.hpGain || '0');
  const baseMax  = Math.max(1, (parseInt(maxEl?.textContent)  || 0) - prevGain);
  const baseCur  = Math.max(0, (parseInt(curEl?.textContent)  || 0) - prevGain);
  const newMax   = baseMax + gain;
  if (maxEl) maxEl.textContent = newMax;
  if (curEl) curEl.textContent = baseCur + gain;
  updateHP();
  window.saveToLocal?.();
  const res = document.getElementById('lvHpResult');
  if (res) res.innerHTML = `<span style="color:var(--gold);font-weight:bold;">+${gain} PG</span> <span style="color:var(--text-muted);font-size:11px;">(${label})</span>`;
  addCombatLog(`❤ Nivel: ${label} = +${gain} PG · nuevo máx ${newMax}`);
  if (modal) modal.dataset.hpGain = String(gain);

  // Guardar snapshot del nivel actual con el nuevo hpMax
  const currentLevel = window.getCurrentLevel?.() || 1;
  state.CHARACTER_STATE.levelHistory = state.CHARACTER_STATE.levelHistory || {};
  state.CHARACTER_STATE.levelHistory[currentLevel] = {
    hpMax: newMax,
    classText: document.querySelector('.hero-pill[data-field="class"] .meta-value')?.textContent?.trim() || ''
  };
}

export function applyClassTemplate(className) {
  const t = window.CLASS_TEMPLATES?.[className];
  if (!t) return;
  if (!confirm(`¿Aplicar plantilla de ${className}? Esto reemplazará la configuración actual del recurso de clase.`)) return;
  if (t.resource) state.CHARACTER_STATE.classResource = { ...t.resource };
  if (t.hitDie) {
    state.CHARACTER_STATE.hitDieType = t.hitDie;
    // Actualizar hitDice array si es una sola clase
    _migrateHitDice();
    if ((state.CHARACTER_STATE.hitDice||[]).length === 1) {
      state.CHARACTER_STATE.hitDice[0].die = t.hitDie;
    }
    renderHitDice();
  }
  state.CHARACTER_STATE.rageUsesSpent = 0;
  state.rageActive = false;
  const levelNow = window.getCurrentLevel?.();
  const scaledUses = getResourceScale(className, levelNow);
  if (scaledUses !== null && state.CHARACTER_STATE.classResource) {
    state.CHARACTER_STATE.classResource.maxUses = scaledUses;
  }
  renderRage();
  if (CASTER_TYPE[className]) {
    const classTextNow = document.querySelector('.hero-pill[data-field="class"] .meta-value')?.textContent?.trim()
      || `${className} ${levelNow}`;
    const newSlots = computeSpellSlots(classTextNow);
    if (newSlots) {
      [1,2,3,4,5,6,7,8,9].forEach(lv => {
        if (newSlots[lv]) state.spellSlotsState[lv] = { max: newSlots[lv].max, used: state.spellSlotsState[lv]?.used || 0 };
      });
    }
    _syncPactSlots(classTextNow);
    renderSpellSlots();
  }
  renderHitDice();
  window.saveToLocal?.();
  showToast(`✦ Plantilla de ${className} aplicada`);
  addCombatLog(`⚙ Plantilla aplicada: ${className} — recurso: ${t.resource?.name || 'ninguno'}`);
}

// Window bridge
window.openLevelUpAssistant       = openLevelUpAssistant;
window.selectLevelUpClass         = selectLevelUpClass;
window.rollLevelUpHP              = rollLevelUpHP;
window.takeLevelUpHPAvg           = takeLevelUpHPAvg;
window.applyLevelUpHP             = applyLevelUpHP;
window.applyClassTemplate         = applyClassTemplate;
window.getSlotTableForLevel       = getSlotTableForLevel;
window._confirmMulticlassLevelUp  = _confirmMulticlassLevelUp;
window.switchLevelUpMode          = switchLevelUpMode;
window.selectNewMulticlassClass   = selectNewMulticlassClass;
window._confirmNewMulticlass      = _confirmNewMulticlass;
window._handleLevelUpConfirm      = _handleLevelUpConfirm;
