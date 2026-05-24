import { state } from './state.js';
import { showToast, addCombatLog, clearCombatLog, renderCombatLog } from './modules/toast-log.js';
import { addJournalEntry } from './modules/journal.js';
import { loadPortrait, loadBg } from './modules/images.js';
import { CONDITIONS, EXHAUSTION_EFFECTS, renderConditions, renderExhaustion, changeExhaustion } from './modules/conditions.js';
import { getScore, getMod, calcMod, calcProfBonus, getProfBonus, renderSaves, setSpellcastingAttr, renderSpellStats } from './modules/attributes.js';
import { renderSkills, cycleSkillProf, updatePassivePerception } from './modules/skills.js';
import { renderDeathSaves, checkDeathOutcome, toggleDeath, rollDeathSave, resetDeathSaves } from './modules/death-saves.js';
import { addInitEntry, nextTurn, incrementRound, sortInit } from './modules/initiative.js';
import { getResourceScale, calcResourceMaxUses, getRageDamageBonus, renderRage, toggleRage, toggleRagePip, resetRageState } from './modules/rage.js';
import { updateHP, changeHP, syncCombatOverlay, openCombatOverlay, applyDamageAmount, applyDamage, applyHeal, undoHP, setHP, rollConcentrationCheck } from './modules/hp.js';
import { _migrateHitDice, _hdTotalDice, _hdTotalSpent, updateRestNote, renderHitDice, _hdChangeDie, _hdAdjCount, _hdRemoveGroup, spendHitDie } from './modules/hit-dice.js';
import { shortRest, longRest } from './modules/rests.js';
import { escapeAttr, signed } from './modules/utils.js';
import { normalizeAttack, renderAttacks } from './modules/attacks.js';
import { normalizeInventoryItem, renderInventory, updateArmorClass, getTotalCarryWeight } from './modules/inventory.js';
import { computeSpellSlots, computePactSlots, _syncPactSlots, renderSpellSlots, CASTER_TYPE } from './modules/spell-slots.js';
import { renderSpellBook, renderConcentration, breakConcentration, loadSpellPreset } from './modules/spells.js';
import { renderTraits, resetTraitUses, WARLOCK_INVOCATIONS, FEATS_DATA, SORCERER_METAMAGIC } from './modules/traits.js';
import { setTheme, lightenColor, applyCustomColor, adjustHex, hexToRgba, hexToRgbComponents, PATHS, applyPath, FONTS, applyFont, CLASS_THEMES, applyClassTheme, applyCustomThemeFull, applyFontScale, applyFontSize, applyPanelOpacity, buildThemes, applyTheme2, applyCustomTheme, showSaveFlash, toggleCP } from './modules/theme.js';
import { XP_TABLE, getCurrentLevel, updateXP, addXP, setLevelDirect } from './modules/xp.js';
import { openLevelUpAssistant, selectLevelUpClass, rollLevelUpHP, takeLevelUpHPAvg, applyLevelUpHP, applyClassTemplate, getSlotTableForLevel, _confirmMulticlassLevelUp } from './modules/level-up.js';
import { toggleDicePanel, rollCustom, parseDamageString, configureDiceForDamage, rollAllDiceGroups, openDiceRoller, rollFreeDice } from './modules/dice.js';
import { saveState, saveToLocal, loadState, loadFromLocal, autoSave, getSaveKey } from './modules/persistence.js';
import { openRoster, closeRoster, loadRosterCharacter, deleteRosterCharacter, clearSave, newSheet } from './modules/roster.js';
import { exportHTML, exportJSON, importJSON, doImportJSON, confirmJSONImport, shareViaURL, checkShareHash } from './modules/share.js';
import './modules/spell-modal.js';

// ═══════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════

const PROF_BONUS_TABLE = [0, 2,2,2,2, 3,3,3,3, 4,4,4,4, 5,5,5,5, 6,6,6,6];

const SKILLS_DATA = [
  { name: 'Acrobacias', attr: 'DEX', prof: false },
  { name: 'Arcanos', attr: 'INT', prof: false },
  { name: 'Atletismo', attr: 'STR', prof: false },
  { name: 'Engañar', attr: 'CHA', prof: false },
  { name: 'Historia', attr: 'INT', prof: false },
  { name: 'Interpretación', attr: 'CHA', prof: false },
  { name: 'Intimidar', attr: 'CHA', prof: false },
  { name: 'Investigación', attr: 'INT', prof: false },
  { name: 'Juego de Manos', attr: 'DEX', prof: false },
  { name: 'Medicina', attr: 'WIS', prof: false },
  { name: 'Naturaleza', attr: 'INT', prof: false },
  { name: 'Percepción', attr: 'WIS', prof: false },
  { name: 'Perspicacia', attr: 'WIS', prof: false },
  { name: 'Persuasión', attr: 'CHA', prof: false },
  { name: 'Religión', attr: 'INT', prof: false },
  { name: 'Sigilo', attr: 'DEX', prof: false },
  { name: 'Supervivencia', attr: 'WIS', prof: false },
  { name: 'Trato con Animales', attr: 'WIS', prof: false },
];

let skillsState = SKILLS_DATA.map(s => ({ ...s }));
state.skillsState = skillsState;

const CLASS_TEMPLATES = {
  'Bárbaro':    { hitDie: 'd12', attr: 'FUE',     desc: 'Defensa sin armadura: 10+DEX+CON. Resistencia a daño físico en furia.',           resource: { name:'Furia',             icon:'🔥', maxUses:2, recovery:'long',  damageBonus:2, physResist:true,  effects:['Ventaja en TS y pruebas de FUE','+2 al daño CaC','Resistencia física (contundente, cortante, perforante)','Sin conjuros ni concentración'] }},
  'Guerrero':   { hitDie: 'd10', attr: 'FUE/DES', desc: 'Más versátil en combate. Más ataques por acción que cualquier clase.',              resource: { name:'Segundo Aliento',   icon:'💪', maxUses:1, recovery:'short', damageBonus:0, physResist:false, effects:['Curar 1d10 + nivel como acción bonus (una vez por desc. corto)'] }},
  'Monje':      { hitDie: 'd8',  attr: 'DES/SAB', desc: 'Defensa sin armadura: 10+DES+SAB. Ataques sin armas escalan por nivel.',            resource: { name:'Ki',                icon:'🌀', maxUses:1, recovery:'short', damageBonus:0, physResist:false, effects:['Flurry of Blows: 2 ataques extra como acción bonus','Patient Defense: esquivar como acción bonus','Step of the Wind: desenganche/carrera como acción bonus'] }},
  'Druida':     { hitDie: 'd8',  attr: 'SAB',     desc: 'Lanzador de conjuros. Se transforma en animales proporcional a su nivel.',          resource: { name:'Forma Salvaje',     icon:'🐺', maxUses:2, recovery:'short', damageBonus:0, physResist:false, effects:['Transformarse en animal conocido','CR máx varía por nivel (2→1/4→1/2→1)','2 usos recuperados en desc. corto'] }},
  'Clérigo':    { hitDie: 'd8',  attr: 'SAB',     desc: 'Canaliza poder divino. Puede usar armadura según dominio.',                         resource: { name:'Canal Divinidad',   icon:'✨', maxUses:1, recovery:'short', damageBonus:0, physResist:false, effects:['Efecto varía según dominio divino','Reprender No-Muertos siempre disponible'] }},
  'Paladín':    { hitDie: 'd10', attr: 'CAR',     desc: 'Juramento sagrado. Aura de protección a aliados desde nivel 6.',                    resource: { name:'Manos Curadoras',   icon:'🤲', maxUses:0, recovery:'long',  damageBonus:0, physResist:false, effects:['PG totales = 5 × nivel','Repartir entre toques a voluntad','Curar enfermedad como acción bonus (1 PG)'] }},
  'Hechicero':  { hitDie: 'd6',  attr: 'CAR',     desc: 'Magia innata por linaje. Puede metamagiar hechizos.',                               resource: { name:'P. de Sorcería',    icon:'✦',  maxUses:1, recovery:'long',  damageBonus:0, physResist:false, effects:['Convertir espacios ↔ Puntos de Sorcería','Metamagia: Careful, Distant, Empowered, Quickened, Subtle, Twinned'] }},
  'Bardo':      { hitDie: 'd8',  attr: 'CAR',     desc: 'Lanzador de conjuros. Más competencias de habilidad que cualquier clase.',          resource: { name:'Insp. Bárdica',     icon:'🎵', maxUses:1, recovery:'long',  damageBonus:0, physResist:false, effects:['Otorgar dado (d6→d12) a aliado como acción bonus','Se añade a chequeo, ataque o salvación','Se recupera en desc. largo (corto a nivel 5)'] }},
  'Brujo':      { hitDie: 'd8',  attr: 'CAR',     desc: 'Pocos espacios de conjuro, pero se recuperan en descanso corto.',                   resource: { name:'Espacios de Pacto',  icon:'🌑', maxUses:1, recovery:'short', damageBonus:0, physResist:false, effects:['1-2 espacios de conjuro (según nivel)','Se recuperan en desc. corto','Invocaciones pasivas siempre activas'] }},
  'Explorador': { hitDie: 'd10', attr: 'DES',     desc: 'Experto en terreno. Magia de explorador desde nivel 2.',                            resource: { name:'Enemigo Predilecto', icon:'🎯', maxUses:0, recovery:'none', damageBonus:0, physResist:false, effects:['Ventaja en PER/SUP contra tipo de criatura elegido.','Terreno Natural: no puede estar perdido en terreno natural conocido, doble velocidad normal de viaje.'] }},
  'Mago':       { hitDie: 'd6',  attr: 'INT',     desc: 'Mayor repertorio arcano. Aprende hechizos de pergaminos y libros.',                 resource: { name:'Recuperación Arcana', icon:'📖', maxUses:1, recovery:'long', damageBonus:0, physResist:false, effects:['Recuperar ranuras de conjuro con niveles totales ≤ ½ nivel del mago (redondeo arriba) en descanso corto, 1 vez por descanso largo. No puede recuperar ranuras de nivel 6 o superior.'] }},
  'Pícaro':     { hitDie: 'd8',  attr: 'DES',     desc: 'Daño extra con ventaja o aliado adyacente. Experto en habilidades.',                resource: { name:'Ataque Furtivo',    icon:'🗡', maxUses:0, recovery:'turn', damageBonus:0, physResist:false, effects:['Daño extra: ⌈nivel/2⌉d6','Requiere ventaja o aliado adyacente','1 vez por turno — no requiere rastreo de usos'] }},
};

// ── Ranuras de conjuro por nivel ──────────────────────────────────────────
// TS competentes por clase: índices en saveProfs [FUE=0, DES=1, CON=2, INT=3, SAB=4, CAR=5]
const CLASS_SAVE_PROFS = {
  'Bárbaro':    [0, 2],
  'Bardo':      [1, 5],
  'Clérigo':    [4, 5],
  'Druida':     [3, 4],
  'Explorador': [0, 1],
  'Guerrero':   [0, 2],
  'Hechicero':  [2, 5],
  'Mago':       [3, 4],
  'Monje':      [0, 1],
  'Paladín':    [4, 5],
  'Pícaro':     [1, 3],
  'Brujo':      [4, 5],
};


const SPECIES_DATA = {
  'Enano de Colinas':     { speed: '7.5m',  sight: 'Oscuridad 18m',  trait: '+1 SAB, +1 PG por nivel. Resistencia al veneno.' },
  'Enano de Montañas':    { speed: '7.5m',  sight: 'Oscuridad 18m',  trait: '+2 FUE. Competencia con armaduras ligeras y medias.' },
  'Elfo Alto':            { speed: '9m',    sight: 'Oscuridad 18m',  trait: '+1 INT. Un truco de mago. Idioma adicional.' },
  'Elfo de los Bosques':  { speed: '10.5m', sight: 'Oscuridad 18m',  trait: 'Velocidad extra. Puede esconderse en terreno natural incluso cuando es observado.' },
  'Drow (Elfo Oscuro)':   { speed: '9m',    sight: 'Oscuridad 36m',  trait: 'Magia innata. Desventaja bajo luz solar directa.' },
  'Mediano Pie Ligero':   { speed: '7.5m',  sight: 'Normal',         trait: 'Suerte (relanzar 1s). Puede esconderse tras criaturas más grandes.' },
  'Mediano Robusto':      { speed: '7.5m',  sight: 'Normal',         trait: '+1 CON. Resistencia al veneno. Suerte.' },
  'Humano Estándar':      { speed: '9m',    sight: 'Normal',         trait: '+1 a todos los atributos. Un idioma adicional.' },
  'Humano Variante':      { speed: '9m',    sight: 'Normal',         trait: '+1 a dos atributos. Una competencia y una dote a nivel 1.' },
  'Dracónido':            { speed: '9m',    sight: 'Normal',         trait: '+2 FUE, +1 CAR. Arma de soplo y resistencia según linaje.' },
  'Gnomo de las Rocas':   { speed: '7.5m',  sight: 'Oscuridad 18m',  trait: '+2 INT, +1 CON. Herramientas de artesano. Ventaja vs. magia.' },
  'Gnomo de los Bosques': { speed: '7.5m',  sight: 'Oscuridad 18m',  trait: '+2 INT, +1 DES. Habla con animales pequeños. Truco de ilusión mayor.' },
  'Semi-Elfo':            { speed: '9m',    sight: 'Oscuridad 18m',  trait: '+2 CAR, +1 a dos atributos. Dos competencias. Resistencia a encantamientos.' },
  'Semi-Orco':            { speed: '9m',    sight: 'Oscuridad 18m',  trait: 'Resistencia feroz (sobrevive con 1 PG una vez). +1 dado en críticos.' },
  'Tiefling':             { speed: '9m',    sight: 'Oscuridad 18m',  trait: '+1 INT, +2 CAR. Resistencia al fuego. Magia infernal innata.' },
  'Personalizado':        { speed: '—',     sight: '—',              trait: 'Especie de campaña o personalizada.' }
};

// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════

// Enter en .personality-text inserta <br> en lugar de <div> (comportamiento de navegador)
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (!e.target.classList?.contains('personality-text')) return;
  if (e.target.contentEditable !== 'true') return;
  e.preventDefault();
  document.execCommand('insertLineBreak');
});

document.addEventListener('DOMContentLoaded', () => {
  ['STR','DEX','CON','INT','WIS','CHA'].forEach(a => calcMod(a));
  renderSkills();
  renderAttacks();
  _renderInvFn();
  renderConditions();
  renderExhaustion();
  renderTraits();
  renderHitDice();
  renderRage();
  renderSaves();
  updatePassivePerception();
  updateHP();
  updateXP();
  renderSpellBook();
  renderSpellSlots();
  renderConcentration();
  renderSpellStats();
  buildThemes();
  loadFromLocal();
  checkShareHash();
  autoSave();

  const img = document.getElementById('portrait-img');
  img.onerror = () => { img.setAttribute('data-empty', 'true'); };

  const invSel = document.getElementById('invocationSelect');
  if (invSel) WARLOCK_INVOCATIONS.forEach(d => {
    const opt = document.createElement('option'); opt.value = opt.textContent = d.name; invSel.appendChild(opt);
  });
  const metaSel = document.getElementById('metamagicSelect');
  if (metaSel) SORCERER_METAMAGIC.forEach(d => {
    const opt = document.createElement('option'); opt.value = opt.textContent = d.name; metaSel.appendChild(opt);
  });
  const featSel = document.getElementById('featSelect');
  if (featSel) FEATS_DATA.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.name;
    opt.textContent = d.req ? `${d.name} [${d.req}]` : d.name;
    featSel.appendChild(opt);
  });

  document.addEventListener('click', (e) => {
    const panel = document.getElementById('dicePanel');
    const fab   = document.querySelector('.dice-fab');
    if (panel && !panel.contains(e.target) && e.target !== fab) {
      panel.classList.remove('open');
    }
  });
});

// ═══════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════

function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}



// setLevelDirect, XP_TABLE, getCurrentLevel, updateXP, addXP → modules/xp.js
// HP → modules/hp.js | Attacks → modules/attacks.js | Inventory → modules/inventory.js
// Rage → modules/rage.js | toggleDicePanel, rollCustom → modules/dice.js

// ── V15 — Cofre de Dados wiring ──
(function initDiceChestV15(){
  if (window.__diceChestV15) return;
  window.__diceChestV15 = true;
  document.addEventListener('DOMContentLoaded', function() {
    const panel = document.getElementById('dicePanel');
    if (!panel || !panel.classList.contains('dice-panel-v15')) return;

    // Stepper buttons (count + modifier)
    panel.querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = document.getElementById('numDice');
        const v = Math.max(1, Math.min(20, (parseInt(inp.value) || 1) + parseInt(btn.dataset.step)));
        inp.value = v;
      });
    });
    panel.querySelectorAll('[data-modstep]').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = document.getElementById('dieBonus');
        inp.value = (parseInt(inp.value) || 0) + parseInt(btn.dataset.modstep);
      });
    });

    // Segmented adv control (synced to global advMode if exists)
    panel.querySelectorAll('[data-adv]').forEach(b => {
      b.addEventListener('click', () => {
        panel.querySelectorAll('[data-adv]').forEach(x => x.classList.toggle('active', x === b));
        try { if (typeof advMode !== 'undefined') window.advMode = b.dataset.adv; } catch(e){}
        // also sync the top advChip if present
        document.querySelectorAll('.adv-chip button[data-mode]').forEach(x =>
          x.classList.toggle('active', x.dataset.mode === b.dataset.adv));
      });
    });

    // Dice shape click → roll + mark as last rolled
    panel.querySelectorAll('.dice-shape').forEach(sh => {
      sh.addEventListener('click', () => {
        const sides = parseInt(sh.dataset.sides);
        document.getElementById('dieSides').value = sides;
        panel.querySelectorAll('.dice-shape').forEach(x => x.classList.remove('last-rolled'));
        sh.classList.add('last-rolled');
        sh.classList.remove('rolling'); void sh.offsetWidth; sh.classList.add('rolling');
        const num = Math.max(1, parseInt(document.getElementById('numDice')?.value) || 1);
        const bonus = parseInt(document.getElementById('dieBonus')?.value) || 0;
        window.rollPolyhedral?.(sides, num, bonus, `Tirada · ${num}d${sides}`);
      });
    });

    // Lanzar button
    const go = document.getElementById('diceRollGo');
    if (go) go.addEventListener('click', () => {
      const sides = parseInt(document.getElementById('dieSides').value) || 20;
      const num = Math.max(1, parseInt(document.getElementById('numDice')?.value) || 1);
      const bonus = parseInt(document.getElementById('dieBonus')?.value) || 0;
      window.rollPolyhedral?.(sides, num, bonus, `Tirada · ${num}d${sides}`);
    });
  });

  window.rollFromChest = function(sides) {
    const num   = Math.max(1, parseInt(document.getElementById('numDice')?.value) || 1);
    const bonus = parseInt(document.getElementById('dieBonus')?.value) || 0;
    const advBtn = document.querySelector('#dicePanel [data-adv].active');
    const adv = advBtn ? advBtn.dataset.adv : 'normal';

    // d20 with count=1 → cinematic
    if (sides === 20 && num === 1 && typeof window.LL_cinematicRoll === 'function') {
      window.LL_cinematicRoll({ label: 'Tirada libre · d20', mod: bonus, mode: adv });
      return;
    }

    // multi-die / non-d20 → in-panel reveal
    let rolls = [];
    let count = num;
    if (sides === 20 && adv !== 'normal') count = 2;
    for (let i = 0; i < count; i++) rolls.push(Math.ceil(Math.random() * sides));

    let chosen;
    if (sides === 20 && num === 1 && adv !== 'normal') {
      chosen = adv === 'adv' ? Math.max(...rolls) : Math.min(...rolls);
    } else {
      chosen = rolls.reduce((a,b)=>a+b, 0);
    }
    const total = chosen + bonus;
    const r = document.getElementById('diceResult');
    const l = document.getElementById('diceLabel');
    if (r) {
      r.style.animation = 'none'; void r.offsetWidth;
      r.style.animation = 'diceRoll 0.4s ease forwards';
      r.textContent = total;
    }
    if (l) {
      const bs = bonus !== 0 ? (bonus > 0 ? ' + '+bonus : ' − '+Math.abs(bonus)) : '';
      const advTag = (sides===20 && num===1 && adv!=='normal') ? ` · ${adv==='adv'?'Vent.':'Desv.'}` : '';
      l.textContent = `${num}d${sides}${bs}${advTag} → [${rolls.join(', ')}]`;
    }
    if (typeof addCombatLog === 'function') {
      addCombatLog(`🎲 ${num}d${sides}${bonus?(bonus>0?'+'+bonus:bonus):''} = ${total} [${rolls.join(',')}]`);
    }
  };

  // ── Helper: bind a hero-pill select to its span + optional info strip ──
  function bindPillSelect(selectId, field, dataMap) {
    const sel  = document.getElementById(selectId);
    const span = document.querySelector(`.hero-pill[data-field="${field}"] .meta-value`);
    if (!sel || !span) return;

    function showInfo(key) {
      const strip = document.getElementById('heroInfoStrip');
      if (!strip || !dataMap) return;
      const d = dataMap[key];
      if (!d) { strip.style.display = 'none'; return; }
      const entries = Object.entries(d).filter(([k]) => k !== 'desc');
      strip.innerHTML = entries.map(([, v]) => `<span class="his-tag">${v}</span>`).join('') +
        (d.desc ? `<span class="his-desc">${d.desc}</span>` : '');
      strip.style.display = 'flex';
    }

    if (dataMap) {
      // Info-only select: no modifica el texto del pill, pero SÍ se sincroniza
      // con el texto cuando éste cambia (ej. al crear personaje en el wizard).
      const syncFromSpan = () => {
        const v = (span.textContent || '').trim();
        if (!v) return;
        // Buscar opción que matchee exactamente
        const opt = [...sel.options].find(o => o.text === v || o.value === v);
        if (opt) sel.value = opt.value;
      };
      syncFromSpan();
      sel.addEventListener('change', () => showInfo(sel.value));
      new MutationObserver(syncFromSpan).observe(span, {
        childList: true, characterData: true, subtree: true
      });
    } else {
      // Alignment: sí modifica el texto (opciones son el valor final)
      const cur = (span.textContent || '').trim();
      [...sel.options].forEach(o => { if (o.text === cur) o.selected = true; });
      sel.addEventListener('change', () => {
        span.textContent = sel.value;
        span.dispatchEvent(new Event('input', { bubbles: true }));
        span.dispatchEvent(new Event('blur', { bubbles: true }));
        if (typeof saveState === 'function') _saveStateFn();
      });
      new MutationObserver(() => {
        const v = (span.textContent || '').trim();
        if (v && sel.value !== v) [...sel.options].forEach(o => o.selected = (o.text === v));
      }).observe(span, { childList: true, characterData: true, subtree: true });
    }
  }

  function setupClassSelects() {
    const span = document.querySelector('.hero-pill[data-field="class"] .meta-value');
    const sel1 = document.getElementById('classSelect1');
    const lvl1 = document.getElementById('classLevel1');
    const sel2 = document.getElementById('classSelect2');
    const lvl2 = document.getElementById('classLevel2');
    if (!span || !sel1 || !sel2) return;

    function parseSpan() {
      const parts = (span.textContent || '').trim().split('/').map(p => p.trim());
      return parts.map(p => {
        const m = p.match(/^(.+?)\s+(\d+)$/);
        return m ? { name: m[1].trim(), level: parseInt(m[2]) } : { name: p, level: 1 };
      });
    }

    function showClassInfo(key) {
      const strip = document.getElementById('heroInfoStrip');
      if (!strip) return;
      const t = CLASS_TEMPLATES[key];
      if (!t) { strip.style.display = 'none'; return; }
      strip.innerHTML =
        `<span class="his-tag">${t.hitDie}</span>` +
        `<span class="his-tag">${t.attr}</span>` +
        `<span class="his-tag">${t.resource.name}</span>` +
        `<span class="his-desc">${t.desc}</span>` +
        `<button class="btn btn-sm his-apply-btn" onclick="applyClassTemplate('${key}')">⚙ Aplicar plantilla</button>`;
      strip.style.display = 'flex';
    }

    // Llamado al entrar en edición: parsea el span y pre-carga los selects
    window.__initClassSelects = function() {
      const parts = parseSpan();
      if (parts[0]?.name) {
        [...sel1.options].forEach(o => o.selected = (o.text === parts[0].name));
        if (lvl1) lvl1.value = parts[0].level || 1;
      }
      if (parts[1]?.name) {
        [...sel2.options].forEach(o => o.selected = (o.text === parts[1].name));
        if (lvl2) lvl2.value = parts[1].level || 1;
      }
    };

    // Llamado al salir de edición: compone el nombre y actualiza el span
    window.__composeClassName = function() {
      const c1 = sel1.value, l1 = parseInt(lvl1?.value) || 1;
      const c2 = sel2.value, l2 = parseInt(lvl2?.value) || 1;
      let text = c1 ? `${c1} ${l1}` : '';
      if (c2) text += (text ? ' / ' : '') + `${c2} ${l2}`;
      if (text) {
        span.textContent = text;
        span.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const strip = document.getElementById('heroInfoStrip');
      if (strip) strip.style.display = 'none';
    };

    sel1.addEventListener('change', () => showClassInfo(sel1.value));
    sel2.addEventListener('change', () => showClassInfo(sel2.value));

    // Auto-sync: cuando el texto del pill cambia (ej. al crear personaje en el wizard
    // o al cargar una ficha), los selects se rellenan automáticamente.
    new MutationObserver(() => {
      if (typeof window.__initClassSelects === 'function') window.__initClassSelects();
    }).observe(span, { childList: true, characterData: true, subtree: true });

    // Inicializar al cargar (por si ya hay valor)
    if (typeof window.__initClassSelects === 'function') window.__initClassSelects();
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindPillSelect('alignSelect',   'alignment', null);
    bindPillSelect('speciesSelect', 'species',   SPECIES_DATA);
    setupClassSelects();
  });
})();

function syncInitPlayerName() {
  const nameEl = document.getElementById('charName');
  const playerEntry = document.getElementById('initPlayer');
  if (!playerEntry || !nameEl) return;
  const nameDiv = playerEntry.querySelector('.init-name');
  if (nameDiv) nameDiv.textContent = nameEl.textContent || 'Personaje';
}

// rollInitiative, rollInitiativeAll → modules/dice.js | Spells → modules/spells.js
// applyClassTemplate → modules/level-up.js | Traits → modules/traits.js

// ═══════════════════════════════════════════════
//  TOGGLE HELPERS
// ═══════════════════════════════════════════════

function toggleSaveProf(el) {
  el.classList.toggle('active');
  renderSaves();
  saveToLocal();
}

function toggleHD(el) {
  el.classList.toggle('used');
  el.classList.toggle('available', !el.classList.contains('used'));
  saveToLocal();
}

function toggleInspiration() {
  const box = document.getElementById('inspirationBox');
  box.classList.toggle('active');
  saveToLocal();
}

// ═══════════════════════════════════════════════
//  EDIT MODE
// ═══════════════════════════════════════════════

let editMode     = false;
let _editSnapshot = null;  // Snapshot de localStorage para cancelar edición

function reshufflePersonality(field) {
  const pool = CHARACTER_STATE.bgPersonality;
  if (!pool) { showToast('⚠ Crea el personaje con el wizard para obtener sugerencias'); return; }
  const map = { personalityTraits:'personalityTraits', personalityIdeals:'ideals', personalityBonds:'bonds', personalityFlaws:'flaws' };
  const arr = pool[map[field]];
  if (!arr?.length) return;
  const el = document.getElementById(field);
  if (!el) return;
  el.textContent = arr[Math.floor(Math.random() * arr.length)];
  if (typeof saveState === 'function') _saveStateFn();
}

function toggleEditMode() {
  if (!editMode) {
    // Al entrar en edición: snapshot del estado actual para poder cancelar
    _editSnapshot = localStorage.getItem(getSaveKey()) || null;
    if (typeof window.__initClassSelects === 'function') window.__initClassSelects();
  }
  editMode = !editMode;
  document.body.classList.toggle('edit-mode', editMode);

  const fab     = document.getElementById('editFab');
  const diceFab = document.getElementById('diceFab');

  if (fab) {
    fab.textContent = editMode ? '💾' : '✎';
    fab.title       = editMode ? 'Guardar cambios' : 'Editar ficha';
    fab.classList.toggle('saving', editMode);
  }
  if (diceFab) {
    diceFab.textContent = editMode ? '✕' : '⚄';
    diceFab.title       = editMode ? 'Cancelar edición' : 'Lanzar dados';
    diceFab.classList.toggle('canceling', editMode);
  }
  renderAttacks();
  _renderInvFn();
  renderTraits();
  renderHitDice();
  renderSpellBook();

  // Hacer editables todos los campos de texto libre + XP
  [
    'xpCurrent', 'xpNext',
    'charName', 'heroEpithet', 'charPlayerName', 'charDeity', 'langComp',
    'charSubclass',
    'personalityTraits', 'personalityIdeals', 'personalityBonds', 'personalityFlaws',
    'combatNotesCE', 'charHistoryCE', 'generalNotes',
    'appearGender', 'appearAge', 'appearSize', 'appearHeight',
    'appearWeight', 'appearSkin', 'appearEyes', 'appearHair',
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.contentEditable = editMode ? 'true' : 'false';
  });
  _updateOptionalFields();
  // Entradas de diario: siempre editables al entrar en modo edición
  document.querySelectorAll('.journal-body').forEach(el => {
    el.contentEditable = editMode ? 'true' : 'false';
  });

  if (!editMode) {
    if (typeof window.__composeClassName === 'function') window.__composeClassName();
    _saveStateFn();
    showSaveFlash();
    showToast('✦ Cambios guardados');
  }
}

function handleDiceFab() {
  if (editMode) {
    // Cancelar: restaurar snapshot anterior sin guardar
    editMode = false;
    document.body.classList.remove('edit-mode');

    const fab     = document.getElementById('editFab');
    const diceFab = document.getElementById('diceFab');
    if (fab)     { fab.textContent = '✎'; fab.title = 'Editar ficha'; fab.classList.remove('saving'); }
    if (diceFab) { diceFab.textContent = '⚄'; diceFab.title = 'Lanzar dados'; diceFab.classList.remove('canceling'); }

    if (_editSnapshot) {
      localStorage.setItem(getSaveKey(), _editSnapshot);
      _loadStateFn();
      renderAttacks();
      renderTraits();
      renderHitDice();
      showToast('✦ Edición cancelada — restaurado');
    } else {
      showToast('✦ Edición cancelada');
    }
    _editSnapshot = null;
  } else {
    toggleDicePanel();
  }
}

// Theme → modules/theme.js | Images → modules/images.js
// Persistence (saveState, loadState, roster…) → modules/persistence.js

// CHARACTER_STATE vive en state.js — alias local para compatibilidad
const CHARACTER_STATE = state.CHARACTER_STATE;

// ── Window bridge: expone el estado del módulo como globals de window
// para los scripts no-module (wizard.js, extra_resources.js, etc.)
// Eliminado en FASE 8 cuando esos scripts sean módulos.
// Los getters cierran sobre la VARIABLE de módulo (binding vivo), no sobre el valor inicial.
window.CHARACTER_STATE = CHARACTER_STATE;

// ── Estado (getters/setters vivos sobre variables de módulo)
Object.defineProperties(window, {
  spells:             { get: () => state.spells,             set: v => { state.spells = v; },             configurable: true },
  inventory:          { get: () => state.inventory,          set: v => { state.inventory = v; },          configurable: true },
  attacks:            { get: () => state.attacks,            set: v => { state.attacks = v; },            configurable: true },
  traits:             { get: () => state.traits,             set: v => { state.traits = v; },             configurable: true },
  skillsState:        { get: () => skillsState,              set: v => { skillsState = state.skillsState = v; }, configurable: true },
  rageActive:         { get: () => state.rageActive,         set: v => { state.rageActive = v; },         configurable: true },
  concentrationSpell: { get: () => state.concentrationSpell, set: v => { state.concentrationSpell = v; }, configurable: true },
  spellSlotsState:    { get: () => state.spellSlotsState,    set: v => { state.spellSlotsState = v; },    configurable: true },
  pactSlotsState:     { get: () => state.pactSlotsState,     set: v => { state.pactSlotsState = v; },     configurable: true },
});

// ── Funciones hookeables por monkey-patching (inventory_extras.js, extra_resources.js)
// El getter/setter sobre _XXXFn permite que los hooks externos reemplacen la implementación
// y que app.js use la versión hookeada vía _XXXFn() en todos sus call sites.
let _saveStateFn     = saveState;
let _loadStateFn     = loadState;
let _renderInvFn     = renderInventory;
Object.defineProperties(window, {
  saveState:       { get: () => _saveStateFn,  set: v => { _saveStateFn = v; },  configurable: true },
  loadState:       { get: () => _loadStateFn,  set: v => { _loadStateFn = v; },  configurable: true },
  renderInventory: { get: () => _renderInvFn,  set: v => { _renderInvFn = v; },  configurable: true },
});

// ── Funciones de acceso directo (sin monkey-patching; hoisting garantiza que ya existen)
// showToast/addCombatLog/clearCombatLog/renderCombatLog → expuestas por modules/toast-log.js
// renderConditions/renderExhaustion/changeExhaustion   → expuestas por modules/conditions.js
// addJournalEntry                                       → expuesto por modules/journal.js
// loadPortrait/loadBg                                   → expuestos por modules/images.js
// shortRest/longRest                                    → expuestos por modules/rests.js
// updateHP/changeHP/applyDamageAmount/applyDamage/applyHeal/undoHP/setHP/openCombatOverlay/syncCombatOverlay/rollConcentrationCheck → modules/hp.js
// renderRage/toggleRage/toggleRagePip/resetRageState/getRageDamageBonus/getResourceScale/calcResourceMaxUses → modules/rage.js
// renderHitDice/spendHitDie/updateRestNote/_migrateHitDice/_hdTotalDice/_hdTotalSpent → modules/hit-dice.js
// saveToLocal → modules/persistence.js (window bridge)
window.CLASS_TEMPLATES      = CLASS_TEMPLATES;
window.computeSpellSlots    = computeSpellSlots;
window._syncPactSlots       = _syncPactSlots;
// getCurrentLevel, setLevelDirect → modules/xp.js
window.loadSpellPreset      = loadSpellPreset;
window.renderSpellSlots     = renderSpellSlots;
window.renderConcentration  = renderConcentration;
window.breakConcentration   = breakConcentration;
window.getTotalCarryWeight  = getTotalCarryWeight;
window.renderAttacks        = renderAttacks;
window.renderTraits         = renderTraits;
window.updateArmorClass     = updateArmorClass;
window.normalizeAttack      = normalizeAttack;
window.escapeAttr           = escapeAttr;
window.resetTraitUses       = resetTraitUses;
window.PROF_BONUS_TABLE     = PROF_BONUS_TABLE;
// applyClassTheme, CLASS_THEMES, PATHS, FONTS se asignan a window tras sus definiciones (más abajo)

// ── Funciones UI llamadas desde onclick en el HTML (módulo → necesitan window.*)
window.toggleEditMode       = toggleEditMode;
window.handleDiceFab        = handleDiceFab;
window.switchTab            = switchTab;
window.toggleSaveProf       = toggleSaveProf;
window.toggleHD             = toggleHD;
window.toggleInspiration    = toggleInspiration;
window.reshufflePersonality = reshufflePersonality;
window.printSheet           = printSheet;
window.toggleMulticlass     = toggleMulticlass;
// Llamadas por persistence.js vía window.*?.()
window.syncInitPlayerName   = syncInitPlayerName;
window._updateOptionalFields = _updateOptionalFields;

// saveState/loadState → persistence.js · roster → roster.js · export/import/share → share.js

// Guarda sincrónicamente antes de cerrar la pestaña o cambiar de app (mobile/PWA)
window.addEventListener('beforeunload', () => _saveStateFn());
document.addEventListener('visibilitychange', () => { if (document.hidden) _saveStateFn(); });

// Shortcut de teclado: N → siguiente turno (solo fuera de inputs)
document.addEventListener('keydown', e => {
  if (e.key !== 'n' && e.key !== 'N') return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
  window.nextTurn?.();
});

// Easter egg: Código Konami → Tema EVA-01 (desktop)
(function () {
  const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let _k = 0;
  document.addEventListener('keydown', e => {
    _k = (e.key === SEQ[_k]) ? _k + 1 : (e.key === SEQ[0] ? 1 : 0);
    if (_k < SEQ.length) return;
    _k = 0;
    applyClassTheme(12);
    showToast('⚡ UNIDAD-01 ACTIVADA — CAMPO AT AL MÁXIMO ⚡');
  });
})();

// Easter egg: 7 tiradas del d20 en ≤5 s → Tema EVA-01 (mobile)
(function () {
  let _count = 0, _timer = null;
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-sides="20"]')) return;
    _count++;
    clearTimeout(_timer);
    _timer = setTimeout(() => { _count = 0; }, 5000);
    if (_count < 7) return;
    _count = 0;
    clearTimeout(_timer);
    applyClassTheme(12);
    showToast('⚡ UNIDAD-01 ACTIVADA — CAMPO AT AL MÁXIMO ⚡');
  });
})();

// ═══════════════════════════════════════════════
// COMBATE TAB — Battle Stance sync + Rage Rounds
// ═══════════════════════════════════════════════
(function(){
  function readNum(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const n = parseInt((el.textContent || el.value || '').replace(/[^\-0-9]/g,''));
    return isNaN(n) ? fallback : n;
  }
  function syncBattleStance() {
    const cur = readNum('hpCurrent', 35);
    const max = readNum('hpMax', 35);
    const ac  = readNum('statAC', 14);
    const sp  = readNum('statSpeed', 30);
    const initText = document.getElementById('statInit')?.textContent?.trim() || '+0';
    const bs = document.getElementById('bsHp');
    const cEl = document.getElementById('bsHpCur');
    const mEl = document.getElementById('bsHpMax');
    const bar = document.getElementById('bsHpBar');
    if (cEl) cEl.textContent = cur;
    if (mEl) mEl.textContent = max;
    if (bar) {
      const pct = Math.max(0, Math.min(100, (cur/max)*100));
      bar.style.width = pct + '%';
      const hpState = (typeof hpStateFor === 'function') ? hpStateFor(cur, max) : 'healthy';
      bar.setAttribute('data-state', hpState);
      bs?.setAttribute('data-hp-state', hpState);
      bar.classList.remove('low','critical');
      bs?.classList.remove('low','critical');
      if (hpState === 'critical' || hpState === 'down') { bar.classList.add('critical'); bs?.classList.add('critical'); }
      else if (hpState === 'wounded') { bar.classList.add('low'); bs?.classList.add('low'); }
    }
    const acEl = document.getElementById('bsAc'); if (acEl) acEl.textContent = ac;
    const initEl = document.getElementById('bsInit'); if (initEl) initEl.textContent = initText;
    const spEl = document.getElementById('bsSpeed'); if (spEl) spEl.textContent = sp;
  }
  window.__syncBattleStance = syncBattleStance;
  ['hpCurrent','hpMax','statAC','statSpeed'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', syncBattleStance);
  });
  setInterval(syncBattleStance, 1500);
  document.addEventListener('DOMContentLoaded', syncBattleStance);
  syncBattleStance();

  // ── Rage Rounds Counter (10 rounds = 1 minute)
  const rageCard = document.getElementById('rageCard');
  if (rageCard) {
    const div = document.createElement('div');
    div.className = 'rage-rounds';
    div.id = 'rageRounds';
    div.innerHTML = `
      <div class="rage-rounds-label" id="rageRoundsLabel">⏱ Rondas restantes (max 10)</div>
      <div class="rage-pips-row" id="rageRoundsPips"></div>
      <div style="display:flex;gap:6px;justify-content:center;margin-top:10px;">
        <button class="btn btn-sm" onclick="window.__rageRoundConsume()">−1 ronda</button>
        <button class="btn btn-sm" onclick="window.__rageRoundReset()">↺ Reset</button>
      </div>
    `;
    rageCard.appendChild(div);
    const pipsRow = div.querySelector('#rageRoundsPips');
    let rageRoundsLeft = 10;
    function renderRageRounds() {
      pipsRow.innerHTML = '';
      for (let i = 0; i < 10; i++) {
        const p = document.createElement('div');
        p.className = 'rage-round-pip' + (i >= rageRoundsLeft ? ' spent' : '');
        pipsRow.appendChild(p);
      }
    }
    window.__rageRoundConsume = () => {
      if (rageRoundsLeft > 0) rageRoundsLeft--;
      renderRageRounds();
      if (rageRoundsLeft === 0 && typeof toggleRage === 'function' && state.rageActive) {
        toggleRage();
      }
    };
    window.__rageRoundReset = () => { rageRoundsLeft = 10; renderRageRounds(); };
    renderRageRounds();
    setInterval(() => {
      const isOn = state.rageActive;
      const cr = (typeof CHARACTER_STATE !== 'undefined') && CHARACTER_STATE.classResource;
      const isTemporal = cr && cr.physResist;
      div.style.display = isTemporal ? '' : 'none';
      div.classList.toggle('active', isOn && isTemporal);
      if (!isOn && rageRoundsLeft !== 10) rageRoundsLeft = 10;
      const lbl = document.getElementById('rageRoundsLabel');
      if (lbl && cr) lbl.textContent = `⏱ Rondas de ${cr.name || 'recurso'} restantes (max 10)`;
    }, 600);
  }

  // ── Hook nextTurn to consume rage round automatically
  if (typeof window.nextTurn === 'function') {
    const origNext = window.nextTurn;
    window.nextTurn = function() {
      origNext.apply(this, arguments);
      if (state.rageActive && window.__rageRoundConsume) {
        window.__rageRoundConsume();
      }
    };
  }
})();

// ═══════════════════════════════════════════════
//  CONDITIONS → ROLL PENALTY
//  Intercepta LL_cinematicRoll para aplicar
//  desventaja automática según condiciones activas
// ═══════════════════════════════════════════════
(function() {
  const PENALIZES_ATTACKS = {
    0:  'Cegado',
    2:  'Asustado',
    8:  'Envenenado',
    9:  'Derribado',
    10: 'Contenido',
    11: 'Aturdido',
    12: 'Inconsciente',
  };

  function getConditionPenalty() {
    const tags = document.querySelectorAll('.condition-tag.active');
    const active = Array.from(tags).map(el => el.dataset.conditionIndex ?? el.dataset.index);
    for (const idx of active) {
      const label = PENALIZES_ATTACKS[parseInt(idx)];
      if (label) return label;
    }
    return null;
  }

  document.addEventListener('DOMContentLoaded', function() {
    const check = setInterval(() => {
      if (typeof window.LL_cinematicRoll !== 'function') return;
      clearInterval(check);
      const _orig = window.LL_cinematicRoll;
      window.LL_cinematicRoll = function(opts) {
        opts = opts || {};
        if (!opts.mode || opts.mode === 'normal') {
          const inspired = document.getElementById('inspirationBox')?.classList.contains('active');
          const penalty  = getConditionPenalty();
          if (inspired && !penalty) {
            opts = { ...opts, mode: 'adv' };
            const origComplete = opts.onComplete;
            opts = { ...opts, onComplete: function(result) {
              document.getElementById('inspirationBox')?.classList.remove('active');
              saveToLocal();
              if (typeof showToast === 'function') showToast('✦ Inspiración consumida');
              if (origComplete) origComplete(result);
            }};
          } else if (!inspired && penalty) {
            opts = { ...opts, mode: 'dis' };
            if (typeof showToast === 'function')
              showToast(`⚠ ${penalty}: tirada con desventaja`);
          }
        }
        return _orig(opts);
      };
    }, 100);
  });
})();

function _updateOptionalFields() {
  ['charPlayerName','charDeity'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!editMode) {
      el.style.display = el.textContent.trim() ? 'inline' : 'none';
    }
  });
  const container = document.getElementById('charOptionals');
  if (container && !editMode) {
    const anyVisible = ['charPlayerName','charDeity'].some(id => {
      const el = document.getElementById(id);
      return el && el.textContent.trim();
    });
    container.style.minHeight = anyVisible ? '' : '0';
  }
}

// ═══════════════════════════════════════════════
//  CREATION WIZARD — V2 (ver src/wizard.js)
// ═══════════════════════════════════════════════

function toggleMulticlass(){ /* no-op — reemplazado por wizard multi-paso */ }

// ═══════════════════════════════════════════════
//  IMPRIMIR FICHA
// ═══════════════════════════════════════════════

function printSheet() {
  window.print();
}

// openDiceRoller, rollFreeDice → modules/dice.js
