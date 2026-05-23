import { state } from '../state.js';
import { getMod, getProfBonus } from './attributes.js';
import { getRageDamageBonus } from './rage.js';
import { showToast, addCombatLog } from './toast-log.js';
import { escapeAttr, signed } from './utils.js';
import { getEquipmentAttackBonus } from './inventory.js';

const ATTACK_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

export function normalizeAttack(atk = {}) {
  const rawBonus = atk.attackBonus ?? atk.bonus ?? null;
  const parsedBonus = rawBonus !== null
    ? Number(String(rawBonus).replace(/[^\-0-9]/g, '') || 'NaN')
    : NaN;
  const rawDamage = String(atk.damage || '1d6+0').trim();
  const splitDamage = rawDamage.match(/^(\d+d\d+(?:\s*[+-]\s*\d+)?)(?:\s+(.+))?$/i);
  return {
    name: atk.name || 'Nuevo Ataque',
    ability: ATTACK_ABILITIES.includes(atk.ability) ? atk.ability : 'STR',
    proficient: atk.proficient !== false,
    equipped: atk.equipped !== false,
    melee: atk.melee !== false,
    rage: atk.rage !== false,
    attackBonus: Number.isFinite(parsedBonus) ? parsedBonus : null,
    damage: splitDamage ? splitDamage[1].replace(/\s/g, '') : rawDamage,
    type: atk.type || (splitDamage && splitDamage[2]) || 'Cortante',
    properties: Array.isArray(atk.properties) ? atk.properties : (atk.properties ? String(atk.properties).split(',').map(s=>s.trim()).filter(Boolean) : []),
  };
}

export function normalizeAttacks() {
  state.attacks = state.attacks.map(normalizeAttack);
}

export function getAttackBonus(atk) {
  const base = Number.isFinite(atk.attackBonus)
    ? atk.attackBonus
    : getMod(atk.ability || 'STR') + (atk.proficient ? getProfBonus() : 0);
  return base + getEquipmentAttackBonus();
}

export function formatDamageBonus(n) {
  const value = parseInt(n) || 0;
  if (!value) return '';
  return value > 0 ? `+${value}` : `${value}`;
}

export function renderAttacks() {
  const tbody = document.getElementById('attacksList');
  if (!tbody) return;
  normalizeAttacks();
  tbody.innerHTML = '';
  const crName = state.CHARACTER_STATE.classResource?.name || 'Recurso';
  const editMode = document.body.classList.contains('edit-mode');
  state.attacks.forEach((atk, i) => {
    const rageBonus = getRageDamageBonus(atk);
    const rageTag = rageBonus ? `<span class="attack-rage-tag">${crName} +${rageBonus}</span>` : '';
    const stateTag = atk.equipped ? '<span class="attack-state-tag equipped">Equipado</span>' : '<span class="attack-state-tag">Guardado</span>';
    const abilityOptions = ATTACK_ABILITIES.map(a => `<option value="${a}" ${atk.ability === a ? 'selected' : ''}>${a}</option>`).join('');
    const editControls = editMode ? `
      <div class="attack-edit-grid">
        <label>Atributo <select onchange="updateAttackField(${i}, 'ability', this.value)">${abilityOptions}</select></label>
        <label>Daño <input value="${escapeAttr(atk.damage)}" oninput="updateAttackField(${i}, 'damage', this.value)"></label>
        <label>Tipo <input value="${escapeAttr(atk.type)}" oninput="updateAttackField(${i}, 'type', this.value)"></label>
        <label style="grid-column:1/-1;">Props. <input value="${escapeAttr((atk.properties||[]).join(', '))}" placeholder="Finesse, Light, Arrojadiza…" oninput="updateAttackField(${i}, 'properties', this.value.split(',').map(s=>s.trim()).filter(Boolean))"></label>
        <label><input type="checkbox" ${atk.proficient ? 'checked' : ''} onchange="updateAttackField(${i}, 'proficient', this.checked)"> Comp.</label>
        <label><input type="checkbox" ${atk.equipped ? 'checked' : ''} onchange="updateAttackField(${i}, 'equipped', this.checked)"> Equipado</label>
        <label><input type="checkbox" ${atk.melee !== false ? 'checked' : ''} onchange="updateAttackField(${i}, 'melee', this.checked)"> CaC</label>
        <label><input type="checkbox" ${atk.rage ? 'checked' : ''} onchange="updateAttackField(${i}, 'rage', this.checked)"> ${crName}</label>
      </div>` : '';
    const tr = document.createElement('tr');
    tr.className = atk.equipped ? 'attack-equipped' : 'attack-unequipped';
    tr.innerHTML = `
      <td>
        <span class="attack-name" contenteditable="${editMode ? 'true' : 'false'}" oninput="updateAttackField(${i}, 'name', this.textContent)">${escapeAttr(atk.name)}</span>
        <span class="attack-meta">${atk.ability} ${atk.proficient ? '+ comp.' : ''}</span>
        ${stateTag}
      </td>
      <td><span class="roll-badge" onclick="rollAttack(${i})">${signed(getAttackBonus(atk))}</span></td>
      <td>
        <span class="attack-damage-text">${escapeAttr(atk.damage)} ${escapeAttr(atk.type || '')}</span>
        ${atk.properties?.length ? `<span class="attack-props">${atk.properties.join(' · ')}</span>` : ''}
        ${rageTag}
        <div class="attack-actions">
          <button type="button" class="attack-mini-btn" onclick="rollAttackDamage(${i}, false)">Daño</button>
          <button type="button" class="attack-mini-btn" onclick="rollAttackDamage(${i}, true)">Crítico</button>
        </div>
        ${editControls}
      </td>
      <td><button class="attack-btn" onclick="deleteAttack(${i})">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

export function addAttack() {
  state.attacks.push({ name: 'Nuevo Ataque', ability: 'STR', proficient: true, equipped: true, melee: true, rage: true, attackBonus: null, damage: '1d6+0', type: 'Cortante' });
  renderAttacks();
  window.saveToLocal?.();
}

export function updateAttackField(i, field, value) {
  if (!state.attacks[i]) return;
  state.attacks[i][field] = value;
  if (field === 'ability' || field === 'proficient' || field === 'equipped' || field === 'rage') {
    renderAttacks();
  }
  window.saveToLocal?.();
}

export function deleteAttack(i) {
  state.attacks.splice(i, 1);
  renderAttacks();
  window.saveToLocal?.();
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.normalizeAttack   = normalizeAttack;
window.renderAttacks     = renderAttacks;
window.addAttack         = addAttack;
window.updateAttackField = updateAttackField;
window.deleteAttack      = deleteAttack;
window.getAttackBonus    = getAttackBonus;
window.formatDamageBonus = formatDamageBonus;
