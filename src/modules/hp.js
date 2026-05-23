import { state } from '../state.js';
import { getMod } from './attributes.js';
import { showToast, addCombatLog } from './toast-log.js';
import { renderDeathSaves, checkDeathOutcome } from './death-saves.js';

let _lastHpSnapshot = null;

const HP_STATE_TEXT = {
  down:     '✕ Inconsciente',
  critical: '◇ Crítico',
  wounded:  '◈ Herido',
  grazed:   '◆ Levemente herido',
  healthy:  '✦ Ileso',
};

function hpStateFor(cur, max) {
  if (max <= 0) return 'healthy';
  if (cur <= 0)   return 'down';
  const pct = (cur / max) * 100;
  if (pct < 25)   return 'critical';
  if (pct < 50)   return 'wounded';
  if (pct < 75)   return 'grazed';
  return 'healthy';
}

export function setHP(current, temp = null) {
  const hpCurrent = document.getElementById('hpCurrent');
  const hpTemp = document.getElementById('hpTemp');
  if (hpCurrent) hpCurrent.textContent = String(Math.max(0, current));
  if (hpTemp && temp != null) hpTemp.textContent = String(Math.max(0, temp));
  updateHP();
}

export function syncCombatOverlay() {
  const cur = parseInt(document.getElementById('hpCurrent')?.textContent) || 0;
  const max = parseInt(document.getElementById('hpMax')?.textContent) || 35;
  const pct = Math.max(0, Math.min(100, (cur / max) * 100));
  const numEl = document.getElementById('combatHpNum');
  if (numEl) {
    numEl.textContent = cur;
    if (pct < 25) numEl.style.color = '#e74c3c';
    else if (pct < 50) numEl.style.color = '#f39c12';
    else numEl.style.color = 'var(--green-light)';
  }
  const bar = document.getElementById('combatHpBar');
  if (bar) {
    bar.style.width = pct + '%';
    if (pct > 50) bar.style.backgroundPosition = 'right center';
    else if (pct > 25) bar.style.backgroundPosition = 'center center';
    else bar.style.backgroundPosition = 'left center';
  }
  const acEl = document.getElementById('statAC');
  const overlayAC = document.getElementById('overlayAC');
  if (acEl && overlayAC) overlayAC.textContent = acEl.textContent || '—';
  const speedEl = document.getElementById('bsSpeed');
  const overlaySpeed = document.getElementById('overlaySpeed');
  if (speedEl && overlaySpeed) overlaySpeed.textContent = speedEl.textContent ? speedEl.textContent + 'm' : '—';
  const temp = parseInt(document.getElementById('hpTemp')?.textContent) || 0;
  const tempPill = document.getElementById('overlayTempPill');
  const tempVal = document.getElementById('overlayTemp');
  if (tempPill && tempVal) {
    tempPill.style.display = temp > 0 ? 'flex' : 'none';
    tempVal.textContent = temp;
  }
  const deathSection = document.getElementById('overlayDeathSection');
  if (deathSection) deathSection.style.display = cur <= 0 ? 'block' : 'none';
}

export function updateHP() {
  const cur = parseInt(document.getElementById('hpCurrent')?.textContent) || 0;
  const max = parseInt(document.getElementById('hpMax')?.textContent) || 35;
  const pct = Math.max(0, Math.min(100, (cur / max) * 100));
  const hpState = hpStateFor(cur, max);

  const bar = document.getElementById('hpBar');
  if (bar) {
    bar.style.width = pct + '%';
    bar.setAttribute('data-state', hpState);
    bar.style.backgroundPosition = '';
  }

  const hpCard = document.querySelector('.hp-display');
  if (hpCard) hpCard.setAttribute('data-hp-state', hpState);

  const status = document.getElementById('hpStatus');
  if (status) {
    status.textContent = HP_STATE_TEXT[hpState];
    status.setAttribute('data-state', hpState);
    status.style.color = '';
  }
  syncCombatOverlay();
  window.saveToLocal?.();
}

export function openCombatOverlay() {
  syncCombatOverlay();
  document.getElementById('combatOverlay')?.classList.add('open');
}

export function changeHP(sign) {
  const amt = parseInt(document.getElementById('hpChangeAmt')?.value) || 0;
  document.getElementById('hpChangeAmt').value = '';
  if (sign < 0) {
    applyDamageAmount(amt, { physical: false, source: 'manual' });
  } else {
    applyHealingAmount(amt);
  }
}

export function applyDamageAmount(amount, options = {}) {
  const original = Math.max(0, parseInt(amount) || 0);
  const physical = options.physical === true;
  const isCritical = options.critical === true;
  const resisted = physical && state.rageActive && (state.CHARACTER_STATE.classResource?.physResist === true);
  const amt = resisted ? Math.floor(original / 2) : original;
  const curEl = document.getElementById('hpCurrent');
  const tempEl = document.getElementById('hpTemp');
  let cur = parseInt(curEl?.textContent) || 0;
  let temp = parseInt(tempEl?.textContent) || 0;
  _lastHpSnapshot = { cur, temp };
  const alreadyDowned = cur === 0;
  const tempAbsorb = Math.min(temp, amt);
  temp -= tempAbsorb;
  const hpDamage = amt - tempAbsorb;
  cur = Math.max(0, cur - hpDamage);
  if (curEl) curEl.textContent = cur;
  if (tempEl) tempEl.textContent = temp;
  updateHP();
  const resistText = resisted ? ` · furia resiste ${original}→${amt}` : '';
  const tempText = tempAbsorb ? ` · ${tempAbsorb} absorbido por PG temp.` : '';
  addCombatLog(`⚔ Daño: -${hpDamage} PG${tempText}${resistText} (quedan ${cur})`);
  // CODEX-09: daño a 0 PG suma fallos de salvación de muerte (PHB 5e p.197)
  if (alreadyDowned && hpDamage > 0) {
    const maxHP = parseInt(document.getElementById('hpMax')?.textContent) || 0;
    if (!state.CHARACTER_STATE.deathSaves) state.CHARACTER_STATE.deathSaves = { s: 0, f: 0 };
    if (maxHP > 0 && hpDamage >= maxHP) {
      state.CHARACTER_STATE.deathSaves.f = 3;
      renderDeathSaves();
      addCombatLog('💀 Muerte instantánea: daño ≥ PG máximo mientras estaba a 0 PG');
    } else {
      const failures = isCritical ? 2 : 1;
      state.CHARACTER_STATE.deathSaves.f = Math.min(3, state.CHARACTER_STATE.deathSaves.f + failures);
      renderDeathSaves();
      addCombatLog(`💀 Daño a 0 PG: +${failures} fallo${failures > 1 ? 's' : ''} de salvación de muerte`);
      checkDeathOutcome();
    }
  }
  if (amt > 0 && state.concentrationSpell) {
    const cd = Math.max(10, Math.floor(amt / 2));
    promptConcentrationCheck(cd);
  }
}

function applyHealingAmount(amount) {
  const amt = Math.max(0, parseInt(amount) || 0);
  const curEl = document.getElementById('hpCurrent');
  const max = parseInt(document.getElementById('hpMax')?.textContent) || 35;
  let cur = parseInt(curEl?.textContent) || 0;
  _lastHpSnapshot = { cur, temp: parseInt(document.getElementById('hpTemp')?.textContent) || 0 };
  cur = Math.min(max, cur + amt);
  if (curEl) curEl.textContent = cur;
  updateHP();
  addCombatLog(`✦ Curación: +${amt} PG (total ${cur})`);
}

export function applyDamage() {
  const amt = parseInt(document.getElementById('damageInput')?.value) || 0;
  const physical = document.getElementById('damagePhysical')?.checked ?? false;
  applyDamageAmount(amt, { physical, source: 'overlay' });
  document.getElementById('damageInput').value = '';
}

export function applyHeal() {
  const amt = parseInt(document.getElementById('healInput')?.value) || 0;
  applyHealingAmount(amt);
  document.getElementById('healInput').value = '';
}

export function undoHP() {
  if (!_lastHpSnapshot) { showToast('Sin acción de PG para deshacer'); return; }
  const curEl  = document.getElementById('hpCurrent');
  const tempEl = document.getElementById('hpTemp');
  if (curEl)  curEl.textContent  = _lastHpSnapshot.cur;
  if (tempEl) tempEl.textContent = _lastHpSnapshot.temp;
  _lastHpSnapshot = null;
  updateHP();
  addCombatLog('↩ PG restaurados (deshacer)');
  showToast('↩ Cambio de PG deshecho');
}

function getConSaveBonus() {
  const rows = document.querySelectorAll('.save-row');
  const bonusEl = rows[2]?.querySelector('.save-bonus');
  return parseInt(bonusEl?.textContent?.replace(/[^\-0-9]/g, '')) || getMod('CON');
}

function promptConcentrationCheck(cd) {
  const conBonus = getConSaveBonus();
  const sign = conBonus >= 0 ? `+${conBonus}` : `${conBonus}`;
  document.getElementById('concCheckPrompt')?.remove();
  const popup = document.createElement('div');
  popup.id = 'concCheckPrompt';
  popup.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,rgba(8,14,8,0.97),rgba(20,12,6,0.97));border:2px solid var(--gold);border-radius:8px;padding:24px 32px;z-index:10001;text-align:center;box-shadow:0 0 40px var(--gold-glow),0 20px 60px rgba(0,0,0,0.8);animation:promptIn 0.3s ease;min-width:240px;max-width:320px;`;
  popup.innerHTML = `
    <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px;">⚡ Concentración en riesgo</div>
    <div style="font-family:'IM Fell English',serif;font-size:15px;color:var(--gold-light);margin-bottom:6px;">${window.escapeAttr?.(state.concentrationSpell.name) ?? state.concentrationSpell.name}</div>
    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">CD ${cd} · TS de Constitución (${sign})</div>
    <button class="btn btn-primary" onclick="rollConcentrationCheck(${cd})" style="min-width:140px;margin-bottom:8px;">🎲 Tirar TS CON</button><br>
    <button class="btn btn-sm" onclick="breakConcentration();document.getElementById('concCheckPrompt')?.remove();" style="border-color:#e74c3c;color:#e74c3c;">✕ Romper</button>
    <button class="btn btn-sm" onclick="document.getElementById('concCheckPrompt')?.remove();" style="margin-left:6px;">Ignorar</button>`;
  document.body.appendChild(popup);
}

export function rollConcentrationCheck(cd) {
  const conBonus = getConSaveBonus();
  const d20 = Math.ceil(Math.random() * 20);
  const total = d20 + conBonus;
  const passed = total >= cd;
  const sign = conBonus >= 0 ? `+${conBonus}` : `${conBonus}`;
  document.getElementById('concCheckPrompt')?.remove();
  if (passed) {
    showToast(`⚡ Concentración mantenida (${d20}${sign} = ${total} ≥ CD ${cd})`);
    addCombatLog(`⚡ Conc. mantenida: d20(${d20})${sign} = ${total} vs CD ${cd} ✦`);
  } else {
    showToast(`✕ Concentración rota (${d20}${sign} = ${total} < CD ${cd})`);
    addCombatLog(`✕ Conc. rota: d20(${d20})${sign} = ${total} vs CD ${cd}`);
    window.breakConcentration?.();
  }
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.updateHP          = updateHP;
window.changeHP          = changeHP;
window.syncCombatOverlay = syncCombatOverlay;
window.openCombatOverlay = openCombatOverlay;
window.applyDamageAmount = applyDamageAmount;
window.applyDamage       = applyDamage;
window.applyHeal         = applyHeal;
window.undoHP            = undoHP;
window.setHP             = setHP;
window.rollConcentrationCheck = rollConcentrationCheck;
