import { state } from '../state.js';
import { getMod } from './attributes.js';
import { showToast, addCombatLog } from './toast-log.js';
import { escapeAttr } from './utils.js';
import { syncCombatOverlay } from './hp.js';

const _renderHooks = [];
export function registerInventoryRenderHook(fn) { _renderHooks.push(fn); }

const INVENTORY_TYPES = [
  ['weapon', 'Arma'],
  ['armor', 'Armadura'],
  ['shield', 'Escudo'],
  ['wondrous', 'Objeto'],
  ['consumable', 'Consumible'],
  ['treasure', 'Tesoro'],
];

function inferInventoryType(item) {
  const text = `${item.icon || ''} ${item.name || ''}`.toLowerCase();
  if (text.includes('escudo')) return 'shield';
  if (text.includes('armadura') || text.includes('cota') || text.includes('loriga')) return 'armor';
  if (text.includes('hacha') || text.includes('karambit') || text.includes('daga')) return 'weapon';
  if (text.includes('moneda') || text.includes('oro')) return 'treasure';
  return 'wondrous';
}

export function normalizeInventoryItem(item = {}) {
  const type = item.type || inferInventoryType(item);
  return {
    icon: item.icon || '📦',
    name: item.name || 'Nuevo objeto',
    qty: parseInt(item.qty) || 1,
    type,
    equipped: item.equipped ?? (type !== 'treasure' && type !== 'consumable'),
    acBonus:     Number.isFinite(parseInt(item.acBonus))     ? parseInt(item.acBonus)     : (type === 'shield' ? 2 : 0),
    acBase:      Number.isFinite(parseInt(item.acBase))      ? parseInt(item.acBase)      : null,
    dexLimit:    item.dexLimit === '' || item.dexLimit == null ? null : parseInt(item.dexLimit),
    weight:      parseFloat(item.weight) || 0,
    attackBonus: parseInt(item.attackBonus) || 0,
    speedBonus:  parseInt(item.speedBonus)  || 0,
  };
}

export function normalizeInventory() {
  state.inventory = state.inventory.map(normalizeInventoryItem);
}

export function getEquippedInventory() {
  normalizeInventory();
  return state.inventory.filter(item => item.equipped && item.qty > 0);
}

export function getEquipmentAttackBonus() {
  normalizeInventory();
  return state.inventory
    .filter(item => item.equipped && item.qty > 0 && item.attackBonus)
    .reduce((sum, item) => sum + item.attackBonus, 0);
}

export function getEquipmentSpeedBonus() {
  normalizeInventory();
  return state.inventory
    .filter(item => item.equipped && item.qty > 0 && item.speedBonus)
    .reduce((sum, item) => sum + item.speedBonus, 0);
}

export function getTotalCarryWeight() {
  normalizeInventory();
  return state.inventory.reduce((sum, item) => sum + (item.weight || 0) * (item.qty || 1), 0);
}

export function updateArmorClass() {
  const dex = getMod('DEX');
  const con = getMod('CON');
  const wis = getMod('WIS');
  const formula = document.getElementById('unarmedDefSelect')?.value ||
                  state.CHARACTER_STATE.unarmedDefFormula || 'standard';
  state.CHARACTER_STATE.unarmedDefFormula = formula;
  const equipped = getEquippedInventory();
  const armorOptions = equipped
    .filter(item => item.type === 'armor' && item.acBase)
    .map(item => item.acBase + Math.min(dex, item.dexLimit ?? dex));
  const shieldBonus = equipped
    .filter(item => item.type === 'shield')
    .reduce((sum, item) => sum + (parseInt(item.acBonus) || 2), 0);
  const miscBonus = equipped
    .filter(item => item.type !== 'shield' && !item.acBase)
    .reduce((sum, item) => sum + (parseInt(item.acBonus) || 0), 0);
  const hasArmor  = armorOptions.length > 0;
  const hasShield = shieldBonus > 0;

  // CODEX-05: aplicar fórmulas de Defensa sin Armadura solo cuando las condiciones RAW se cumplen
  let effectiveUnarmored, unarmoredLabel;
  if (formula === 'monk') {
    if (!hasArmor && !hasShield) {
      effectiveUnarmored = 10 + dex + wis;
      unarmoredLabel = `Sin armadura (Monje) ${effectiveUnarmored}`;
    } else {
      effectiveUnarmored = 10 + dex;
      unarmoredLabel = null;
    }
  } else if (formula === 'barbarian') {
    if (!hasArmor) {
      effectiveUnarmored = 10 + dex + con;
      unarmoredLabel = `Sin armadura ${effectiveUnarmored}`;
    } else {
      effectiveUnarmored = 10 + dex;
      unarmoredLabel = null;
    }
  } else {
    effectiveUnarmored = 10 + dex;
    unarmoredLabel = null;
  }

  const allOptions = [...armorOptions, effectiveUnarmored];
  const base = Math.max(...allOptions);
  const total = base + shieldBonus + miscBonus;
  const ac = document.getElementById('statAC');
  const detail = document.getElementById('armorCalcDetail');
  if (ac) ac.textContent = String(total);
  if (detail) {
    const source = (base === effectiveUnarmored && !hasArmor)
      ? (unarmoredLabel || `Sin armadura ${effectiveUnarmored}`)
      : `Armadura ${base}`;
    const shieldText = shieldBonus ? ` + escudo ${shieldBonus}` : '';
    const miscText = miscBonus ? ` + bono ${miscBonus}` : '';
    detail.textContent = `${source}${shieldText}${miscText}`;
  }
  syncCombatOverlay();
  if (typeof window.__syncBattleStance === 'function') window.__syncBattleStance();
  return total;
}

export function renderInventory() {
  const list = document.getElementById('inventoryList');
  if (!list) return;
  normalizeInventory();
  list.innerHTML = '';
  const editMode = document.body.classList.contains('edit-mode');

  state.inventory.forEach((item, i) => {
    const typeOptions = INVENTORY_TYPES.map(([v, l]) =>
      `<option value="${v}" ${item.type === v ? 'selected' : ''}>${l}</option>`).join('');
    const isConsumable = item.type === 'consumable';

    const mechanics = editMode ? `
      <div class="inv-edit-grid">
        <label>Tipo <select onchange="updateInventoryField(${i},'type',this.value)">${typeOptions}</select></label>
        <label>Peso <input type="number" step="0.1" min="0" value="${item.weight || 0}" onchange="updateInventoryField(${i},'weight',parseFloat(this.value)||0)"> lb</label>
        <label>Bono CA <input type="number" value="${item.acBonus || 0}" onchange="updateInventoryField(${i},'acBonus',parseInt(this.value)||0)"></label>
        <label>CA base <input type="number" value="${item.acBase ?? ''}" placeholder="—" onchange="updateInventoryField(${i},'acBase',this.value===''?null:parseInt(this.value))"></label>
        <label>+Ataque <input type="number" value="${item.attackBonus || 0}" onchange="updateInventoryField(${i},'attackBonus',parseInt(this.value)||0)"></label>
        <label>+Vel. <input type="number" value="${item.speedBonus || 0}" onchange="updateInventoryField(${i},'speedBonus',parseInt(this.value)||0)"></label>
      </div>` : '';

    const useBtn = (!editMode && isConsumable && item.qty > 0)
      ? `<button class="inv-use-btn" onclick="useConsumable(${i})" title="Gastar uno">Usar</button>`
      : '';

    const bonusTags = (!editMode && item.equipped)
      ? [
          item.attackBonus ? `<span class="inv-bonus-tag">+${item.attackBonus} atq</span>` : '',
          item.speedBonus  ? `<span class="inv-bonus-tag speed">+${item.speedBonus} vel</span>` : '',
        ].join('')
      : '';

    const n = state.inventory.length;
    const div = document.createElement('div');
    div.className = `inv-item ${item.equipped ? 'equipped' : ''}${item.qty === 0 ? ' depleted' : ''}`;
    div.innerHTML = `
      <span class="inv-icon">${item.icon}</span>
      <div class="inv-name-col">
        <span class="inv-name" contenteditable="${editMode ? 'true' : 'false'}" oninput="updateInventoryField(${i},'name',this.textContent)">${escapeAttr(item.name)}</span>
        ${bonusTags}
      </div>
      <input class="inv-qty" type="number" value="${item.qty}" min="0" oninput="inventory[${i}].qty=parseInt(this.value)||0;renderInventory();saveToLocal()">
      ${useBtn}
      <button class="inv-equip ${item.equipped ? 'active' : ''}" onclick="toggleInventoryEquipped(${i})" title="${item.equipped ? 'Equipado' : 'No equipado'}">${item.equipped ? 'Eq.' : 'Off'}</button>
      <button class="inv-del" onclick="deleteInvItem(${i})">✕</button>
      <div class="inv-sort-col">
        <button class="inv-sort-btn" onclick="moveInventoryItem(${i},-1)" title="Subir" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="inv-sort-btn" onclick="moveInventoryItem(${i}, 1)" title="Bajar" ${i === n - 1 ? 'disabled' : ''}>▼</button>
      </div>
      ${mechanics}
    `;
    list.appendChild(div);
  });

  const totalWeight = getTotalCarryWeight();
  const speedBonus  = getEquipmentSpeedBonus();
  let footer = document.getElementById('invFooter');
  if (!footer) {
    footer = document.createElement('div');
    footer.id = 'invFooter';
    footer.className = 'inv-footer';
    list.parentElement.appendChild(footer);
  }
  const speedNote = speedBonus ? ` · <span style="color:var(--gold)">+${speedBonus} ft vel. desde equipo</span>` : '';
  footer.innerHTML = `<span>Carga total: <strong>${totalWeight % 1 === 0 ? totalWeight : totalWeight.toFixed(1)} lb</strong></span>${speedNote}`;

  updateArmorClass();
  _renderHooks.forEach(fn => fn());
}

export function useConsumable(i) {
  if (!state.inventory[i] || state.inventory[i].qty <= 0) return;
  state.inventory[i].qty--;
  addCombatLog(`✦ Usado: ${state.inventory[i].name} (quedan ${state.inventory[i].qty})`);
  showToast(`${state.inventory[i].name} usado (${state.inventory[i].qty} restantes)`);
  window.renderInventory?.();
  window.saveToLocal?.();
}

export function addInventoryItem() {
  state.inventory.push({ icon: '📦', name: 'Nuevo objeto', qty: 1, type: 'wondrous', equipped: false, acBonus: 0, acBase: null });
  window.renderInventory?.();
  window.saveToLocal?.();
}

export function updateInventoryField(i, field, value) {
  if (!state.inventory[i]) return;
  state.inventory[i][field] = value;
  window.renderInventory?.();
  window.saveToLocal?.();
}

export function toggleInventoryEquipped(i) {
  if (!state.inventory[i]) return;
  state.inventory[i].equipped = !state.inventory[i].equipped;
  window.renderInventory?.();
  window.saveToLocal?.();
}

export function deleteInvItem(i) {
  state.inventory.splice(i, 1);
  window.renderInventory?.();
  window.saveToLocal?.();
}

export function moveInventoryItem(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= state.inventory.length) return;
  [state.inventory[i], state.inventory[j]] = [state.inventory[j], state.inventory[i]];
  window.renderInventory?.();
  window.saveToLocal?.();
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.normalizeInventoryItem  = normalizeInventoryItem;
window.renderInventory         = renderInventory;
window.updateArmorClass        = updateArmorClass;
window.getTotalCarryWeight     = getTotalCarryWeight;
window.addInventoryItem        = addInventoryItem;
window.updateInventoryField    = updateInventoryField;
window.toggleInventoryEquipped = toggleInventoryEquipped;
window.deleteInvItem           = deleteInvItem;
window.useConsumable           = useConsumable;
window.getEquipmentAttackBonus = getEquipmentAttackBonus;
window.getEquipmentSpeedBonus  = getEquipmentSpeedBonus;
window.moveInventoryItem       = moveInventoryItem;
