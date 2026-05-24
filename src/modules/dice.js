import { state } from '../state.js';
import { addCombatLog, showToast } from './toast-log.js';
import { getMod, getProfBonus } from './attributes.js';
import { normalizeAttack, getAttackBonus, formatDamageBonus } from './attacks.js';
import { getRageDamageBonus } from './rage.js';
import { escapeAttr } from './utils.js';

const CHARACTER_STATE = state.CHARACTER_STATE;

// ═══════════════════════════════════════════════
//  PANEL BÁSICO DE DADOS
// ═══════════════════════════════════════════════

export function toggleDicePanel() {
  const panel = document.getElementById('dicePanel');
  panel.classList.toggle('open');
}

function rollDice(sides) {
  const num = parseInt(document.getElementById('numDice')?.value) || 1;
  const bonus = parseInt(document.getElementById('dieBonus')?.value) || 0;
  let results = [];
  for (let i = 0; i < num; i++) results.push(Math.ceil(Math.random() * sides));
  const total = results.reduce((a, b) => a + b, 0) + bonus;
  const resultEl = document.getElementById('diceResult');
  const labelEl = document.getElementById('diceLabel');
  if (resultEl) {
    resultEl.style.animation = 'none';
    resultEl.offsetHeight;
    resultEl.style.animation = 'diceRoll 0.4s ease forwards';
    resultEl.textContent = total;
  }
  if (labelEl) {
    const bonusStr = bonus !== 0 ? (bonus > 0 ? ' + ' + bonus : ' - ' + Math.abs(bonus)) : '';
    labelEl.textContent = `${num}d${sides}${bonusStr} [${results.join(', ')}]`;
  }
  const bonusStr = bonus !== 0 ? (bonus > 0 ? '+' + bonus : '' + bonus) : '';
  addCombatLog(`⚄ ${num}d${sides}${bonusStr}: [${results.join(', ')}] = <strong>${total}</strong>`);
}

export function rollCustom() {
  const sides = parseInt(document.getElementById('dieSides')?.value) || 20;
  rollDice(sides);
}

// ═══════════════════════════════════════════════
//  DADOS POLIÉDRICOS CON ANIMACIÓN
// ═══════════════════════════════════════════════

const DICE_SVGS = {
  4: `<svg viewBox="0 0 100 100"><polygon points="50,8 88,78 12,78" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><line x1="50" y1="8" x2="50" y2="78" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/><line x1="12" y1="78" x2="88" y2="78" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/><line x1="12" y1="78" x2="50" y2="8" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/><line x1="88" y1="78" x2="50" y2="8" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/></svg>`,

  6: `<svg viewBox="0 0 100 100"><polygon points="23,30 50,13 77,30 77,77 50,93 23,77" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><line x1="23" y1="30" x2="77" y2="30" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/><line x1="50" y1="13" x2="50" y2="93" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/><polygon points="23,30 50,13 50,53 23,70" fill="rgba(201,168,76,0.10)" stroke="none"/><polygon points="50,13 77,30 77,70 50,53" fill="rgba(201,168,76,0.05)" stroke="none"/></svg>`,

  8: `<svg viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><polygon points="50,5 95,50 50,50 5,50" fill="rgba(201,168,76,0.15)" stroke="var(--gold-dark)" stroke-width="0.5"/><polygon points="50,50 95,50 50,95 5,50" fill="rgba(201,168,76,0.08)" stroke="var(--gold-dark)" stroke-width="0.5"/></svg>`,

  10: `<svg viewBox="0 0 100 100"><polygon points="50,5 85,25 85,75 50,95 15,75 15,25" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><line x1="50" y1="5" x2="50" y2="95" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/><line x1="15" y1="25" x2="85" y2="25" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/><line x1="15" y1="75" x2="85" y2="75" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/></svg>`,

  12: `<svg viewBox="0 0 100 100"><polygon points="50,5 80,15 95,40 85,70 60,90 40,90 15,70 5,40 20,15" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><polygon points="50,25 70,35 65,60 35,60 30,35" fill="rgba(201,168,76,0.12)" stroke="var(--gold-dark)" stroke-width="0.5"/></svg>`,

  20: `<svg viewBox="0 0 100 100"><polygon points="50,3 90,20 95,60 70,90 30,90 5,60 10,20" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><polygon points="50,3 90,20 50,50 10,20" fill="rgba(201,168,76,0.18)" stroke="var(--gold-dark)" stroke-width="0.5"/><polygon points="50,50 90,20 95,60 70,90 30,90 5,60 10,20" fill="rgba(201,168,76,0.08)" stroke="var(--gold-dark)" stroke-width="0.5"/><polygon points="50,3 50,50 30,90 70,90" fill="none" stroke="var(--gold-dark)" stroke-width="0.5" opacity="0.5"/></svg>`,

  100: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><circle cx="50" cy="50" r="25" fill="none" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/><line x1="20" y1="70" x2="80" y2="30" stroke="var(--gold-dark)" stroke-width="0.8" opacity="0.5"/><text x="50" y="55" text-anchor="middle" font-family="Cinzel" font-size="18" fill="var(--gold)" opacity="0.6">%</text></svg>`
};

function rollPolyhedral(sides, count, bonus, label) {
  const stage = document.getElementById('rollStage');
  const die = document.getElementById('rollDie');
  const lbl = document.getElementById('rollLabel');
  const brk = document.getElementById('rollBreakdown');
  const tag = document.getElementById('rollTag');

  if (!stage || !die) {
    window.rollFromChest?.(sides);
    return;
  }

  const svg = DICE_SVGS[sides] || DICE_SVGS[20];
  die.innerHTML = svg + '<div class="roll-num" id="rollNum">?</div>';

  let rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.ceil(Math.random() * sides));
  }

  const total = rolls.reduce((a,b) => a+b, 0) + bonus;
  const isMax = rolls.every(r => r === sides);
  const isMin = rolls.every(r => r === 1);
  const isCritDie = sides === 20 && count === 1;

  stage.classList.remove('crit', 'fumble');
  stage.classList.add('open');
  lbl.textContent = label || `${count}d${sides}`;
  brk.textContent = '';
  tag.textContent = '';

  const dieInner = die.querySelector('svg') || die;
  dieInner.classList.remove('spinning');
  void dieInner.offsetHeight;
  dieInner.classList.add('spinning');

  let flickI = 0;
  const rollNumEl = die.querySelector('.roll-num');
  rollNumEl.textContent = '?';

  const flicker = setInterval(() => {
    rollNumEl.textContent = Math.ceil(Math.random() * sides);
    if (++flickI > 15) clearInterval(flicker);
  }, 50);

  setTimeout(() => {
    clearInterval(flicker);
    rollNumEl.textContent = total;

    const bonusStr = bonus !== 0 ? (bonus > 0 ? ' + ' + bonus : ' − ' + Math.abs(bonus)) : '';
    const detail = `[${rolls.join(', ')}]${bonusStr}`;
    brk.innerHTML = `${count}d${sides} ${detail} = <strong style="color:var(--gold-light);font-size:24px;">${total}</strong>`;

    if (isMax && isCritDie) {
      stage.classList.add('crit');
      tag.textContent = '✦ MÁXIMO ✦';
    } else if (isMin && isCritDie) {
      stage.classList.add('fumble');
      tag.textContent = '✕ MÍNIMO ✕';
      document.body.classList.add('shake-fumble');
      setTimeout(() => document.body.classList.remove('shake-fumble'), 420);
    }

    addCombatLog(`🎲 ${label}: ${count}d${sides} ${detail}`);
  }, 800);

  setTimeout(() => stage.classList.remove('open'), 2500);
}

// window.rollFromChest is defined by the initDiceChestV15 IIFE in app.js (runs after this module)

// ═══════════════════════════════════════════════
//  DAMAGE PARSER & DICE CONFIGURATION v2
// ═══════════════════════════════════════════════

export function parseDamageString(str) {
  if (!str) return { groups: [{ count: 1, sides: 6 }], bonus: 0, primary: { count: 1, sides: 6 }, raw: '1d6' };
  const clean = String(str).replace(/\s/g, '').toLowerCase();

  const groups = [];
  let bonus = 0;
  const tokenRe = /([+-]?)(\d*)d(\d+)|([+-])(\d+)(?!d)/g;
  let m;
  let hasToken = false;

  while ((m = tokenRe.exec(clean)) !== null) {
    hasToken = true;
    if (m[3]) {
      const sign = m[1] === '-' ? -1 : 1;
      const count = (m[2] === '' ? 1 : parseInt(m[2])) * sign;
      const sides = parseInt(m[3]);
      groups.push({ count, sides });
    } else {
      bonus += (m[4] === '-' ? -1 : 1) * parseInt(m[5]);
    }
  }

  if (!hasToken) return { groups: [{ count: 1, sides: 6 }], bonus: 0, primary: { count: 1, sides: 6 }, raw: str };

  const primary = groups.reduce((best, g) => (!best || g.sides > best.sides ? g : best), null)
    || { count: 1, sides: 6 };

  return {
    groups,
    bonus,
    primary,
    count: Math.abs(primary.count),
    sides: primary.sides,
    raw: str,
  };
}

export function configureDiceForDamage(dmg) {
  const numDice = document.getElementById('numDice');
  const dieSides = document.getElementById('dieSides');
  const dieBonus = document.getElementById('dieBonus');
  if (numDice) numDice.value = dmg.count;
  if (dieSides) dieSides.value = dmg.sides;
  if (dieBonus) dieBonus.value = dmg.bonus;
  document.querySelectorAll('.dice-shape').forEach(sh => {
    sh.classList.remove('last-rolled');
    if (parseInt(sh.dataset.sides) === dmg.sides) sh.classList.add('last-rolled');
  });
}

export function rollAllDiceGroups(groups, multiplier) {
  let total = 0;
  const parts = [];
  (groups || []).forEach(({ count, sides }) => {
    const n = Math.abs(count) * multiplier;
    const sign = count < 0 ? -1 : 1;
    let groupTotal = 0;
    const rolls = [];
    for (let j = 0; j < n; j++) {
      const r = Math.ceil(Math.random() * sides);
      rolls.push(r);
      groupTotal += r;
    }
    total += sign * groupTotal;
    parts.push(`${n}d${sides}(${rolls.join('+')})`);
  });
  return { total, parts };
}

function showDamagePrompt(atk, dmg, isCrit, attackIndex) {
  const existing = document.getElementById('damagePrompt');
  if (existing) existing.remove();
  const mult = isCrit ? 2 : 1;
  const rageBonus = getRageDamageBonus(atk);
  const magicBonus = atk.magicBonus || 0;
  const groupsLabel = (dmg.groups || [{ count: dmg.count, sides: dmg.sides }])
    .map(g => `${Math.abs(g.count) * mult}d${g.sides}`).join('+');
  const bonusLabel = formatDamageBonus(dmg.bonus + rageBonus + magicBonus);
  const extraLabel = (atk.extraDamage || []).map(ed => `+${ed.dice} ${ed.type}`).join(' ');
  const prompt = document.createElement('div');
  prompt.id = 'damagePrompt';
  prompt.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,rgba(8,14,8,0.97),rgba(20,12,6,0.97));border:2px solid var(--gold);border-radius:8px;padding:24px 32px;z-index:10000;text-align:center;box-shadow:0 0 40px var(--gold-glow),0 20px 60px rgba(0,0,0,0.8);animation:promptIn 0.3s ease;min-width:280px;`;
  prompt.innerHTML = `
    <div style="font-family:'Cinzel Decorative',serif;font-size:22px;color:var(--gold-light);margin-bottom:8px;">${isCrit ? '✦ ¡CRÍTICO!' : '⚔ Impacto'}</div>
    <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">${escapeAttr(atk.name)} · ${escapeAttr(dmg.raw)}${rageBonus ? ` · ${CHARACTER_STATE.classResource?.name || 'Recurso'} +${rageBonus}` : ''}${magicBonus ? ` · +${magicBonus} mágico` : ''}${extraLabel ? ` · ${extraLabel}` : ''}${isCrit ? ' · dados ×2' : ''}</div>
    <div style="display:flex;gap:12px;justify-content:center;">
      <button class="btn btn-primary" onclick="rollAttackDamage(${attackIndex},${isCrit})" style="font-size:13px;padding:10px 20px;">🎲 Tirar ${groupsLabel}${bonusLabel}${extraLabel ? ' ' + extraLabel : ''}</button>
      <button class="btn" onclick="this.closest('#damagePrompt').remove()" style="font-size:11px;">✕ Omitir</button>
    </div>`;
  document.body.appendChild(prompt);
  setTimeout(() => { const p = document.getElementById('damagePrompt'); if (p) p.remove(); }, 8000);
}

function rollDamageNow(sides, count, bonus, multiplier, weaponName) {
  const prompt = document.getElementById('damagePrompt');
  if (prompt) prompt.remove();
  document.getElementById('numDice').value = count * multiplier;
  document.getElementById('dieSides').value = sides;
  document.getElementById('dieBonus').value = bonus;
  rollPolyhedral(sides, count * multiplier, bonus, `Daño · ${weaponName}`);
}

function rollAttackDamage(i, isCrit = false) {
  const atk = state.attacks[i];
  if (!atk) return;
  const prompt = document.getElementById('damagePrompt');
  if (prompt) prompt.remove();

  const dmg = parseDamageString(atk.damage);
  const rageBonus = getRageDamageBonus(atk);
  const magicBonus = atk.magicBonus || 0;
  const mult = isCrit ? 2 : 1;
  const { total: diceTotal, parts } = rollAllDiceGroups(dmg.groups, mult);
  const baseBonus = dmg.bonus + rageBonus + magicBonus;
  let total = Math.max(0, diceTotal + baseBonus);
  const bonusStr = formatDamageBonus(baseBonus);
  let detail = parts.join(' + ') + (bonusStr ? ` ${bonusStr}` : '');
  if (rageBonus) detail += ` (${CHARACTER_STATE.classResource?.name || 'Recurso'})`;
  if (magicBonus) detail += ` [+${magicBonus}✦]`;

  for (const ed of (atk.extraDamage || [])) {
    const edDmg = parseDamageString(ed.dice || '1d6');
    const { total: edTotal, parts: edParts } = rollAllDiceGroups(edDmg.groups, mult);
    total += edTotal;
    detail += ` + ${edParts.join('+')} ${ed.type}`;
  }

  addCombatLog(
    `⚔ Daño <em>${escapeAttr(atk.name)}</em>${isCrit ? ' ✦ CRÍTICO' : ''}: ${detail} = ` +
    `<strong style="color:var(--gold);font-size:15px;">${total}</strong> · ` +
    `<button class="log-apply-btn" onclick="applyDamageAmount(${total},{physical:${atk.melee !== false}});this.parentElement.querySelector('.log-apply-btn').remove()">← Aplicar</button>`
  );
  showToast(`${isCrit ? '✦ CRÍTICO · ' : ''}Daño: ${total}`);
}

// ═══════════════════════════════════════════════
//  V13 — DADO VIVO (cinematic roller module)
// ═══════════════════════════════════════════════
(function() {
  const ROLL_KEY = 'dnd-roll-log';
  let rollLog = JSON.parse(localStorage.getItem(ROLL_KEY) || '[]');
  let advMode = 'normal';
  let _prevAdv = null;

  // Inject overlay markup
  const stage = document.createElement('div');
  stage.className = 'roll-stage';
  stage.id = 'rollStage';
  stage.innerHTML = `
    <svg class="roll-burst" viewBox="0 0 700 700" aria-hidden="true">
      <defs>
        <linearGradient id="rayGrad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stop-color="#ffd166" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#ffd166" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g transform="translate(350,350)">
        ${Array.from({length: 28}, (_, i) =>
          `<rect x="0" y="-2" width="340" height="4" fill="url(#rayGrad)" transform="rotate(${i * (360/28)})"/>`
        ).join('')}
      </g>
    </svg>
    <div class="roll-weapon-icon" id="rollWeaponIcon"></div>
    <div class="roll-die" id="rollDie">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="50,4 93,28 93,72 50,96 7,72 7,28"
                 fill="rgba(8,16,8,0.92)" stroke="#c9a84c" stroke-width="1.5"/>
        <polygon points="50,4 93,28 50,52 7,28" fill="rgba(201,168,76,0.18)" stroke="#8a6b2a" stroke-width="0.5"/>
        <polygon points="50,52 93,28 93,72 50,96" fill="rgba(201,168,76,0.08)" stroke="#8a6b2a" stroke-width="0.5"/>
        <polygon points="50,52 7,28 7,72 50,96" fill="rgba(201,168,76,0.22)" stroke="#8a6b2a" stroke-width="0.5"/>
      </svg>
      <div class="roll-num" id="rollNum">20</div>
    </div>
    <div class="roll-label" id="rollLabel">— Tirada —</div>
    <div class="roll-breakdown" id="rollBreakdown"></div>
    <div class="roll-tag" id="rollTag"></div>
  `;
  document.body.appendChild(stage);
  const DEFAULT_DIE_CONTENT = document.getElementById('rollDie').innerHTML;

  stage.addEventListener('click', () => {
    stage.classList.remove('open');
    _resetDie();
    document.getElementById('rollBreakdown')?.querySelectorAll('.roll-dmg-btn,.roll-skip-btn').forEach(b => b.remove());
  });

  // Adv/Dis chip
  const advChip = document.createElement('div');
  advChip.className = 'adv-chip open';
  advChip.id = 'advChip';
  advChip.innerHTML = `
    <button data-mode="dis"    title="Desventaja (Alt)">Desv.</button>
    <button data-mode="normal" class="active">Normal</button>
    <button data-mode="adv"    title="Ventaja (Shift)">Vent.</button>
    <span class="adv-chip-hint">Shift = ventaja · Alt = desventaja</span>
  `;
  document.body.appendChild(advChip);
  advChip.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      advMode = b.dataset.mode;
      advChip.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    });
  });

  // Roll log panel
  const logPanel = document.createElement('div');
  logPanel.className = 'roll-log';
  logPanel.id = 'rollLogPanel';
  logPanel.innerHTML = `
    <div class="roll-log-title">
      <span>⚄ Bitácora de Tiradas</span>
      <button class="roll-log-close" title="Cerrar">✕</button>
    </div>
    <div id="rollLogList"></div>
    <button class="btn btn-sm" style="margin-top:10px;width:100%;" id="rollLogClear">Limpiar bitácora</button>
  `;
  document.body.appendChild(logPanel);
  logPanel.querySelector('.roll-log-close').onclick = () => logPanel.classList.remove('open');
  logPanel.querySelector('#rollLogClear').onclick = () => {
    rollLog = [];
    localStorage.setItem(ROLL_KEY, '[]');
    renderLog();
    updateBadge();
  };

  // Bitácora button
  const logBtn = document.createElement('button');
  logBtn.className = 'log-btn';
  logBtn.innerHTML = '⚄ Bitácora <span class="badge" id="rollBadge">0</span>';
  logBtn.onclick = () => { logPanel.classList.toggle('open'); renderLog(); };
  document.body.appendChild(logBtn);

  function updateBadge() {
    const b = document.getElementById('rollBadge');
    if (b) b.textContent = rollLog.length;
  }

  function renderLog() {
    const list = document.getElementById('rollLogList');
    if (!list) return;
    if (!rollLog.length) {
      list.innerHTML = '<div style="color:var(--text-muted);font-style:italic;text-align:center;padding:14px 0;">Aún no has lanzado dados.</div>';
      return;
    }
    list.innerHTML = rollLog.slice(0, 20).map(r => {
      const cls = r.crit ? 'crit' : r.fumble ? 'fumble' : '';
      const t = new Date(r.t).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
      const tagTxt = r.crit ? '✦ CRÍTICO' : r.fumble ? '✕ PIFIA' : '';
      return `<div class="roll-log-entry ${cls}">
        <div class="roll-log-meta">${t} · ${escapeHtml(r.label)} ${tagTxt}</div>
        <div><span class="roll-log-total">${r.total}</span><span class="roll-log-detail">${escapeHtml(r.detail)}</span></div>
      </div>`;
    }).join('');
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function pushLog(entry) {
    rollLog.unshift(entry);
    if (rollLog.length > 60) rollLog.length = 60;
    localStorage.setItem(ROLL_KEY, JSON.stringify(rollLog));
    renderLog();
    updateBadge();
  }

  function rollD20() { return Math.ceil(Math.random() * 20); }

  // ── Condition disadvantage hints ─────────────
  const CONDITION_DISADVANTAGE = {
    'Envenenado': ['ataque', 'habilidad'],
    'Asustado':   ['ataque', 'habilidad'],
    'Contenido':  ['ataque'],
    'Cegado':     ['ataque'],
    'Derribado':  ['ataque'],
  };

  function _getActiveCondNames() {
    return Array.from(document.querySelectorAll('.condition-tag.active')).map(el => {
      const icon = el.querySelector('.cond-icon');
      return el.textContent.slice(icon ? icon.textContent.length : 0).trim();
    });
  }

  function _rollType(label) {
    if (/^[⚔🎯]/.test(label)) return 'ataque';
    if (label.startsWith('Salv.') || label === 'Salvación de Muerte') return 'salvacion';
    return 'habilidad';
  }

  function _warnConditions(label, mode) {
    if (mode !== 'normal') return;
    const type  = _rollType(label);
    const names = _getActiveCondNames();
    const why   = names.filter(n => (CONDITION_DISADVANTAGE[n] || []).includes(type));
    const exh   = state.CHARACTER_STATE.exhaustion || 0;
    if (exh >= 1 && type === 'habilidad') why.push(`Agotamiento Nv.${exh}`);
    if (exh >= 3 && (type === 'ataque' || type === 'salvacion')) why.push(`Agotamiento Nv.${exh}`);
    if (!why.length) return;
    showToast(`⚠ ${why.join(' · ')} → desventaja sugerida`);
    const disBtn = advChip.querySelector('[data-mode="dis"]');
    if (disBtn) {
      Object.assign(disBtn.style, { background: 'rgba(231,76,60,0.25)', borderColor: '#e74c3c', color: '#e74c3c' });
      setTimeout(() => Object.assign(disBtn.style, { background: '', borderColor: '', color: '' }), 3000);
    }
  }

  const WEAPON_SVGS = {
    sword:  `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,6 58,58 50,65 42,58" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><polygon points="50,6 42,58 50,62" fill="rgba(201,168,76,0.20)" stroke="none"/><rect x="26" y="64" width="48" height="6" rx="2" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><rect x="46" y="70" width="8" height="16" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><line x1="46" y1="75" x2="54" y2="75" stroke="var(--gold)" stroke-width="0.7" opacity="0.5"/><line x1="46" y1="80" x2="54" y2="80" stroke="var(--gold)" stroke-width="0.7" opacity="0.5"/><circle cx="50" cy="92" r="5.5" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/></svg>`,
    axe:    `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="47" y="8" width="6" height="82" rx="3" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><polygon points="50,12 82,5 88,22 88,45 82,54 50,44" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><polygon points="50,12 82,5 88,28 50,28" fill="rgba(201,168,76,0.13)" stroke="none"/></svg>`,
    bow:    `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M28,8 Q5,50 28,92" fill="none" stroke="var(--gold)" stroke-width="4" stroke-linecap="round"/><line x1="28" y1="8" x2="28" y2="92" stroke="var(--gold)" stroke-width="1.2" opacity="0.6"/><line x1="28" y1="50" x2="76" y2="50" stroke="var(--gold)" stroke-width="2" stroke-linecap="round"/><polygon points="78,50 67,44 67,56" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><line x1="32" y1="50" x2="20" y2="42" stroke="var(--gold)" stroke-width="1.2" opacity="0.7" stroke-linecap="round"/><line x1="32" y1="50" x2="20" y2="58" stroke="var(--gold)" stroke-width="1.2" opacity="0.7" stroke-linecap="round"/></svg>`,
    spear:  `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="47" y="40" width="6" height="55" rx="3" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><polygon points="50,5 62,36 50,44 38,36" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><polygon points="50,5 62,36 50,40" fill="rgba(201,168,76,0.18)" stroke="none"/><line x1="50" y1="5" x2="50" y2="44" stroke="var(--gold)" stroke-width="0.7" opacity="0.5"/></svg>`,
    mace:   `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="47" y="56" width="6" height="38" rx="3" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><circle cx="50" cy="34" r="25" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><polygon points="50,5 55,15 45,15" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1"/><polygon points="77,20 69,28 68,17" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1"/><polygon points="23,20 31,28 32,17" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1"/><polygon points="77,50 69,42 68,52" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1"/><polygon points="23,50 31,42 32,52" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1"/><polygon points="50,63 55,53 45,53" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1"/><circle cx="50" cy="34" r="12" fill="rgba(201,168,76,0.12)" stroke="var(--gold)" stroke-width="0.7" opacity="0.7"/></svg>`,
    dagger: `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,10 59,56 50,62 41,56" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><polygon points="50,10 41,56 50,59" fill="rgba(201,168,76,0.20)" stroke="none"/><rect x="20" y="61" width="60" height="5" rx="2" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><rect x="46" y="66" width="8" height="13" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><polygon points="50,84 56,89 50,95 44,89" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    staff:  `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="47" y="22" width="6" height="74" rx="3" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><circle cx="50" cy="16" r="14" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><circle cx="50" cy="16" r="7" fill="rgba(201,168,76,0.25)" stroke="var(--gold)" stroke-width="0.8"/><circle cx="45" cy="11" r="3" fill="rgba(201,168,76,0.30)" stroke="none"/></svg>`,
    whip:   `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="12" y="70" width="30" height="8" rx="4" fill="rgba(8,16,8,0.92)" stroke="var(--gold)" stroke-width="1.5"/><path d="M28,70 Q50,56 64,36 Q78,16 70,6" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round"/><path d="M70,6 L77,10 M70,6 L74,0" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/></svg>`,
  };

  function _resetDie() {
    const d = document.getElementById('rollDie');
    if (d) { d.innerHTML = DEFAULT_DIE_CONTENT; d.classList.remove('spinning'); }
  }

  function _showDamageAnimation(attackIndex, isCrit) {
    const atk = state.attacks[attackIndex];
    if (!atk) { stage.classList.remove('open'); _resetDie(); return; }

    const dmg = parseDamageString(atk.damage);
    const mult = isCrit ? 2 : 1;
    const rageBonus = getRageDamageBonus(atk);
    const magicBonus = atk.magicBonus || 0;
    const baseBonus = dmg.bonus + rageBonus + magicBonus;

    const { total: diceTotal, parts } = rollAllDiceGroups(dmg.groups, mult);
    let totalDmg = Math.max(0, diceTotal + baseBonus);
    let detail = parts.join(' + ');
    const bonusStr = formatDamageBonus(baseBonus);
    if (bonusStr) detail += ` ${bonusStr}`;
    if (rageBonus) detail += ` (${state.CHARACTER_STATE.classResource?.name || 'Recurso'})`;
    if (magicBonus) detail += ` [+${magicBonus}✦]`;

    for (const ed of (atk.extraDamage || [])) {
      const edDmg = parseDamageString(ed.dice || '1d6');
      const { total: edTotal, parts: edParts } = rollAllDiceGroups(edDmg.groups, mult);
      totalDmg += edTotal;
      detail += ` + ${edParts.join('+')} ${ed.type}`;
    }

    const primarySides = dmg.primary?.sides || 6;
    const svg = DICE_SVGS[primarySides] || DICE_SVGS[6];
    const die = document.getElementById('rollDie');
    const lbl = document.getElementById('rollLabel');
    const brk = document.getElementById('rollBreakdown');
    const tag = document.getElementById('rollTag');

    stage.classList.remove('crit', 'fumble');
    die.innerHTML = svg + '<div class="roll-num" id="rollNum">?</div>';
    lbl.textContent = `Daño — ${atk.name}`;
    brk.textContent = '';
    tag.textContent = isCrit ? '✦ CRÍTICO' : '';
    if (isCrit) stage.classList.add('crit');

    const dieInner = die.querySelector('svg') || die;
    dieInner.classList.remove('spinning');
    void dieInner.offsetHeight;
    dieInner.classList.add('spinning');

    const rollNumEl = die.querySelector('.roll-num');
    rollNumEl.textContent = '?';
    let flickI = 0;
    const flicker = setInterval(() => {
      rollNumEl.textContent = Math.ceil(Math.random() * primarySides);
      if (++flickI > 15) clearInterval(flicker);
    }, 50);

    setTimeout(() => {
      clearInterval(flicker);
      rollNumEl.textContent = totalDmg;
      brk.innerHTML = `${detail} = <strong style="color:var(--gold-light);font-size:24px;">${totalDmg}</strong>`;
      addCombatLog(
        `⚔ Daño <em>${escapeAttr(atk.name)}</em>${isCrit ? ' ✦ CRÍTICO' : ''}: ${detail} = ` +
        `<strong style="color:var(--gold);font-size:15px;">${totalDmg}</strong> · ` +
        `<button class="log-apply-btn" onclick="applyDamageAmount(${totalDmg},{physical:${atk.melee !== false}});this.parentElement.querySelector('.log-apply-btn').remove()">← Aplicar</button>`
      );
      showToast(`${isCrit ? '✦ CRÍTICO · ' : ''}Daño: ${totalDmg}`);
    }, 800);

    setTimeout(() => { stage.classList.remove('open'); _resetDie(); }, 3200);
  }

  // ── Master cinematic roll ─────────────────────
  window.LL_cinematicRoll = function(opts) {
    opts = opts || {};
    const mode = opts.mode || advMode;
    const mod = parseInt(opts.mod) || 0;
    const label = opts.label || 'Tirada';
    const critOk = opts.critOk !== false;
    const onComplete = opts.onComplete || null;

    _warnConditions(label, mode);

    let r1 = rollD20(), r2 = null, chosen = r1;
    let detail = `d20(${r1})`;
    if (mode === 'adv') {
      r2 = rollD20();
      chosen = Math.max(r1, r2);
      detail = `2d20(${r1},${r2}) ⏶${chosen}`;
    } else if (mode === 'dis') {
      r2 = rollD20();
      chosen = Math.min(r1, r2);
      detail = `2d20(${r1},${r2}) ⏷${chosen}`;
    }
    const total = chosen + mod;
    const isCrit   = critOk && chosen === 20;
    const isFumble = critOk && chosen === 1;

    const die = document.getElementById('rollDie');
    if (opts.weaponSvg) die.innerHTML = opts.weaponSvg + '<div class="roll-num" id="rollNum">?</div>';
    const num = die.querySelector('.roll-num');
    const lbl = document.getElementById('rollLabel');
    const brk = document.getElementById('rollBreakdown');
    const tag = document.getElementById('rollTag');

    stage.classList.remove('crit', 'fumble');
    stage.classList.add('open');
    lbl.textContent = label;
    brk.textContent = '';
    tag.textContent = '';

    if (!opts.noSpin) {
      die.classList.remove('spinning');
      void die.offsetHeight;
      die.classList.add('spinning');
    }

    let flickI = 0;
    num.textContent = '?';
    const flicker = setInterval(() => {
      num.textContent = Math.ceil(Math.random() * 20);
      if (++flickI > 17) clearInterval(flicker);
    }, 55);

    setTimeout(() => {
      clearInterval(flicker);
      num.textContent = chosen;
      const modStr = mod !== 0 ? (mod > 0 ? ' + ' + mod : ' − ' + Math.abs(mod)) : '';
      brk.innerHTML = `${detail}${modStr} = <strong style="color:var(--gold-light);font-size:24px;">${total}</strong>`;
      if (isCrit) {
        stage.classList.add('crit');
        tag.textContent = '✦ CRÍTICO ✦';
      } else if (isFumble) {
        stage.classList.add('fumble');
        tag.textContent = '✕ PIFIA ✕';
        document.body.classList.add('shake-fumble');
        setTimeout(() => document.body.classList.remove('shake-fumble'), 420);
      }
      pushLog({ t: Date.now(), label, total, detail: `${detail}${modStr}`, crit: isCrit, fumble: isFumble });
      if (onComplete) {
        onComplete({ total: total, crit: isCrit, fumble: isFumble, chosen: chosen, mod: mod });
      }
      const color = isCrit ? '#ffd166' : isFumble ? '#e74c3c' : 'var(--gold)';
      addCombatLog(`⚄ ${label}: ${detail}${modStr} = <strong style="color:${color}">${total}${isCrit?' ¡CRÍTICO!':isFumble?' ¡PIFIA!':''}</strong>`);
    }, 950);

    const _stageDur = opts.stageDuration !== undefined ? opts.stageDuration : ((isCrit || isFumble) ? 2900 : 2000);
    if (_stageDur > 0) setTimeout(() => stage.classList.remove('open'), _stageDur);
  };

  function _weaponKey(atk) {
    const n = (atk.name || '').toLowerCase();
    if (atk.melee === false || /arco|ballesta|honda|dardo/.test(n)) return 'bow';
    if (/hacha/.test(n))                                             return 'axe';
    if (/tridente|lanza|pica|alabarda|guadaña|jabalina/.test(n))    return 'spear';
    if (/mazo|maza|porra|garrote|clava/.test(n))                    return 'mace';
    if (/daga|cuchillo/.test(n))                                     return 'dagger';
    if (/báculo|bastón|cayado/.test(n))                              return 'staff';
    if (/látigo/.test(n))                                            return 'whip';
    return 'sword';
  }

  window.rollAttack = function(i) {
    const atk = state.attacks[i] || { name: 'Ataque', bonus: '+0', damage: '1d6+0' };
    const mod = getAttackBonus(normalizeAttack(atk));
    const dmg = parseDamageString(atk.damage);

    window.LL_cinematicRoll({
      label: `⚔ ${atk.name}`,
      mod: mod,
      stageDuration: 0,
      weaponSvg: WEAPON_SVGS[_weaponKey(atk)],
      noSpin: true,
      onComplete: function(result) {
        const brk = document.getElementById('rollBreakdown');
        if (!brk) return;

        if (result.fumble) {
          setTimeout(() => {
            _resetDie();
            stage.classList.remove('open');
          }, 3200);
          return;
        }

        setTimeout(() => {
          brk.querySelectorAll('.roll-dmg-btn,.roll-skip-btn').forEach(b => b.remove());

          const mult   = result.crit ? 2 : 1;
          const rageB  = getRageDamageBonus(atk);
          const magicB = atk.magicBonus || 0;
          const glabel = (dmg.groups || []).map(g => `${Math.abs(g.count) * mult}d${g.sides}`).join('+');
          const blabel = formatDamageBonus(dmg.bonus + rageB + magicB);

          const dmgBtn = document.createElement('button');
          dmgBtn.className   = 'btn btn-primary roll-dmg-btn';
          dmgBtn.textContent = `🎲 Tirar daño  ${glabel}${blabel}`;
          dmgBtn.addEventListener('click', e => {
            e.stopPropagation();
            brk.querySelectorAll('.roll-dmg-btn,.roll-skip-btn').forEach(b => b.remove());
            _showDamageAnimation(i, result.crit);
          });

          const skipBtn = document.createElement('button');
          skipBtn.className   = 'btn roll-skip-btn';
          skipBtn.textContent = '✕ Omitir daño';
          skipBtn.addEventListener('click', e => {
            e.stopPropagation();
            brk.querySelectorAll('.roll-dmg-btn,.roll-skip-btn').forEach(b => b.remove());
            stage.classList.remove('open');
            _resetDie();
          });

          brk.appendChild(dmgBtn);
          brk.appendChild(skipBtn);
        }, result.crit ? 1300 : 650);
      }
    });
  };

  window.rollInitiative = function() {
    const initMod = parseInt(document.getElementById('statInit')?.textContent?.replace(/[^\-0-9]/g,'')) || 0;
    window.LL_cinematicRoll({ label: 'Iniciativa', mod: initMod });
  };
  window.rollInitiativeAll = window.rollInitiative;

  window.rollDeathSave = function() {
    window.LL_cinematicRoll({ label: 'Salvación de Muerte', mod: 0, critOk: true });
  };

  // ── Delegated click-to-roll ──
  document.addEventListener('click', (e) => {
    if (stage.classList.contains('open')) return;
    if (e.target.closest('.roll-log, .log-btn, .adv-chip')) return;

    const skillRow = e.target.closest('.skill-row');
    if (skillRow && !e.target.classList.contains('skill-prof')) {
      const list = skillRow.parentElement;
      const idx = Array.from(list.children).indexOf(skillRow);
      const skill = window.skillsState?.[idx];
      if (skill) {
        const mod = getMod(skill.attr);
        const pb = getProfBonus();
        const bonus = mod + (skill.prof ? pb : 0) + (skill.expert ? pb : 0);
        window.LL_cinematicRoll({ label: skill.name, mod: bonus });
        return;
      }
    }

    const saveRow = e.target.closest('.save-row');
    if (saveRow && !e.target.classList.contains('save-prof')) {
      const name = saveRow.querySelector('.save-name')?.textContent || 'Salvación';
      const bonusStr = saveRow.querySelector('.save-bonus')?.textContent || '0';
      const bonus = parseInt(bonusStr.replace(/[^\-0-9]/g,'')) || 0;
      window.LL_cinematicRoll({ label: `Salv. ${name}`, mod: bonus });
      return;
    }

    const attrBox = e.target.closest('.attr-box');
    if (attrBox && !e.target.matches('input') && !e.target.classList.contains('attr-score')) {
      const attr = attrBox.dataset.attr;
      if (attr) {
        window.LL_cinematicRoll({ label: `Prueba de ${attr}`, mod: getMod(attr) });
      }
    }
  });

  // ── Keyboard: Shift=adv, Alt=dis ──
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'Shift' && advMode !== 'adv') {
      _prevAdv = advMode; advMode = 'adv';
      advChip.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.mode === 'adv'));
    } else if (e.key === 'Alt' && advMode !== 'dis') {
      _prevAdv = advMode; advMode = 'dis';
      advChip.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.mode === 'dis'));
    }
  });
  document.addEventListener('keyup', (e) => {
    if ((e.key === 'Shift' || e.key === 'Alt') && _prevAdv) {
      advMode = _prevAdv; _prevAdv = null;
      advChip.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.mode === advMode));
    }
  });

  updateBadge();
  renderLog();
})();

// ═══════════════════════════════════════════════
//  TIRADA LIBRE DE DADOS
// ═══════════════════════════════════════════════

export function openDiceRoller() {
  let modal = document.getElementById('diceRollerModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'diceRollerModal';
    modal.className = 'dice-modal-overlay';
    modal.innerHTML = `
      <div class="dice-roller-box">
        <div style="font-family:'Cinzel Decorative',serif;font-size:18px;color:var(--gold);text-align:center;margin-bottom:16px;">🎲 Tirada Libre</div>
        <div class="dice-config-row">
          <div>
            <label class="dice-label">Cantidad</label>
            <input id="diceCount" type="number" min="1" max="20" value="1" class="dice-num-input">
          </div>
          <div>
            <label class="dice-label">Modificador</label>
            <input id="diceMod" type="number" value="0" class="dice-num-input">
          </div>
        </div>
        <div class="dice-btn-grid">
          ${[4,6,8,10,12,20,100].map(d =>
            `<button class="btn dice-die-btn" onclick="rollFreeDice(${d})">d${d}</button>`
          ).join('')}
        </div>
        <div id="diceRollerResult" class="dice-result-area"></div>
        <button class="btn" style="width:100%;margin-top:10px;" onclick="document.getElementById('diceRollerModal').remove()">✕ Cerrar</button>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }
}

export function rollFreeDice(sides) {
  const count = Math.max(1, Math.min(20, parseInt(document.getElementById('diceCount')?.value) || 1));
  const mod   = parseInt(document.getElementById('diceMod')?.value) || 0;
  const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * sides));
  const sum   = rolls.reduce((a, b) => a + b, 0);
  const total = sum + mod;
  const label = `${count}d${sides}${mod > 0 ? '+' + mod : mod < 0 ? mod : ''}`;

  const maxPossible = count * sides + mod;
  const minPossible = count + mod;
  const color = total === maxPossible ? 'var(--gold-light)' : total === minPossible ? 'var(--red)' : 'var(--text-primary)';

  const res = document.getElementById('diceRollerResult');
  if (res) {
    res.innerHTML = `
      <div style="font-family:'Cinzel',serif;font-size:10px;color:var(--text-muted);letter-spacing:1px;">${label}</div>
      <div style="font-size:36px;font-family:'Cinzel Decorative',serif;color:${color};line-height:1.1;">${total}</div>
      <div style="font-size:11px;color:var(--text-muted);">[${rolls.join(' + ')}]${mod !== 0 ? ` ${mod >= 0 ? '+' : ''}${mod}` : ''}</div>`;
  }
  addCombatLog(`🎲 ${label} = <strong style="color:var(--gold)">${total}</strong> [${rolls.join(', ')}]`);
}

// Window bridge
window.toggleDicePanel    = toggleDicePanel;
window.rollDice           = rollDice;
window.rollCustom         = rollCustom;
window.rollPolyhedral     = rollPolyhedral;
window.parseDamageString  = parseDamageString;
window.configureDiceForDamage = configureDiceForDamage;
window.rollAllDiceGroups  = rollAllDiceGroups;
window.showDamagePrompt   = showDamagePrompt;
window.rollDamageNow      = rollDamageNow;
window.rollAttackDamage   = rollAttackDamage;
window.openDiceRoller     = openDiceRoller;
window.rollFreeDice       = rollFreeDice;
window.DICE_SVGS          = DICE_SVGS;
