import { state } from '../state.js';
import { getMod, getProfBonus } from './attributes.js';
import { getRageDamageBonus } from './rage.js';
import { showToast, addCombatLog } from './toast-log.js';
import { escapeAttr, signed } from './utils.js';
import { getEquipmentAttackBonus } from './inventory.js';

const ATTACK_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

const DAMAGE_TYPES = [
  'Ácido', 'Contundente', 'Cortante', 'Frío', 'Fuego', 'Fuerza',
  'Necrótico', 'Perforante', 'Psíquico', 'Radiante', 'Relámpago', 'Trueno', 'Veneno',
];

const WEAPON_PRESETS = [
  // Simple · CaC
  { name: 'Garrote',            cat: 'Simple · CaC',    damage: '1d4',  type: 'Contundente', melee: true,  ability: 'STR', props: ['Ligera'] },
  { name: 'Daga',               cat: 'Simple · CaC',    damage: '1d4',  type: 'Perforante',  melee: true,  ability: 'DEX', props: ['Fineza', 'Ligera', 'Arrojadiza'] },
  { name: 'Gran mazo',          cat: 'Simple · CaC',    damage: '1d8',  type: 'Contundente', melee: true,  ability: 'STR', props: ['Dos manos'] },
  { name: 'Hacha de mano',      cat: 'Simple · CaC',    damage: '1d6',  type: 'Cortante',    melee: true,  ability: 'STR', props: ['Ligera', 'Arrojadiza'] },
  { name: 'Jabalina',           cat: 'Simple · CaC',    damage: '1d6',  type: 'Perforante',  melee: true,  ability: 'STR', props: ['Arrojadiza'] },
  { name: 'Maza ligera',        cat: 'Simple · CaC',    damage: '1d4',  type: 'Contundente', melee: true,  ability: 'STR', props: ['Ligera', 'Arrojadiza'] },
  { name: 'Maza',               cat: 'Simple · CaC',    damage: '1d6',  type: 'Contundente', melee: true,  ability: 'STR', props: [] },
  { name: 'Bastón',             cat: 'Simple · CaC',    damage: '1d6',  type: 'Contundente', melee: true,  ability: 'STR', props: ['Versátil (1d8)'] },
  { name: 'Hoz',                cat: 'Simple · CaC',    damage: '1d4',  type: 'Cortante',    melee: true,  ability: 'STR', props: ['Ligera'] },
  { name: 'Lanza',              cat: 'Simple · CaC',    damage: '1d6',  type: 'Perforante',  melee: true,  ability: 'STR', props: ['Arrojadiza', 'Versátil (1d8)'] },
  // Simple · Dist.
  { name: 'Ballesta ligera',    cat: 'Simple · Dist.',  damage: '1d8',  type: 'Perforante',  melee: false, ability: 'DEX', props: ['Munición', 'Dos manos'] },
  { name: 'Dardo',              cat: 'Simple · Dist.',  damage: '1d4',  type: 'Perforante',  melee: false, ability: 'DEX', props: ['Fineza', 'Arrojadiza'] },
  { name: 'Arco corto',         cat: 'Simple · Dist.',  damage: '1d6',  type: 'Perforante',  melee: false, ability: 'DEX', props: ['Munición', 'Dos manos'] },
  { name: 'Honda',              cat: 'Simple · Dist.',  damage: '1d4',  type: 'Contundente', melee: false, ability: 'DEX', props: ['Munición'] },
  // Marcial · CaC
  { name: 'Hacha de batalla',   cat: 'Marcial · CaC',   damage: '1d8',  type: 'Cortante',    melee: true,  ability: 'STR', props: ['Versátil (1d10)'] },
  { name: 'Flagelo',            cat: 'Marcial · CaC',   damage: '1d8',  type: 'Contundente', melee: true,  ability: 'STR', props: [] },
  { name: 'Guja',               cat: 'Marcial · CaC',   damage: '1d10', type: 'Cortante',    melee: true,  ability: 'STR', props: ['Pesada', 'Alcance', 'Dos manos'] },
  { name: 'Gran hacha',         cat: 'Marcial · CaC',   damage: '1d12', type: 'Cortante',    melee: true,  ability: 'STR', props: ['Pesada', 'Dos manos'] },
  { name: 'Gran espada',        cat: 'Marcial · CaC',   damage: '2d6',  type: 'Cortante',    melee: true,  ability: 'STR', props: ['Pesada', 'Dos manos'] },
  { name: 'Alabarda',           cat: 'Marcial · CaC',   damage: '1d10', type: 'Cortante',    melee: true,  ability: 'STR', props: ['Pesada', 'Alcance', 'Dos manos'] },
  { name: 'Lanza de guerra',    cat: 'Marcial · CaC',   damage: '1d12', type: 'Perforante',  melee: true,  ability: 'STR', props: ['Alcance'] },
  { name: 'Espada larga',       cat: 'Marcial · CaC',   damage: '1d8',  type: 'Cortante',    melee: true,  ability: 'STR', props: ['Versátil (1d10)'] },
  { name: 'Mayal de guerra',    cat: 'Marcial · CaC',   damage: '2d6',  type: 'Contundente', melee: true,  ability: 'STR', props: ['Pesada', 'Dos manos'] },
  { name: 'Estrella de mañana', cat: 'Marcial · CaC',   damage: '1d8',  type: 'Perforante',  melee: true,  ability: 'STR', props: [] },
  { name: 'Pica',               cat: 'Marcial · CaC',   damage: '1d10', type: 'Perforante',  melee: true,  ability: 'STR', props: ['Pesada', 'Alcance', 'Dos manos'] },
  { name: 'Rapiera',            cat: 'Marcial · CaC',   damage: '1d8',  type: 'Perforante',  melee: true,  ability: 'DEX', props: ['Fineza'] },
  { name: 'Cimitarra',          cat: 'Marcial · CaC',   damage: '1d6',  type: 'Cortante',    melee: true,  ability: 'DEX', props: ['Fineza', 'Ligera'] },
  { name: 'Espada corta',       cat: 'Marcial · CaC',   damage: '1d6',  type: 'Perforante',  melee: true,  ability: 'DEX', props: ['Fineza', 'Ligera'] },
  { name: 'Tridente',           cat: 'Marcial · CaC',   damage: '1d6',  type: 'Perforante',  melee: true,  ability: 'STR', props: ['Arrojadiza', 'Versátil (1d8)'] },
  { name: 'Pico de guerra',     cat: 'Marcial · CaC',   damage: '1d8',  type: 'Perforante',  melee: true,  ability: 'STR', props: [] },
  { name: 'Martillo de guerra', cat: 'Marcial · CaC',   damage: '1d8',  type: 'Contundente', melee: true,  ability: 'STR', props: ['Versátil (1d10)'] },
  { name: 'Látigo',             cat: 'Marcial · CaC',   damage: '1d4',  type: 'Cortante',    melee: true,  ability: 'DEX', props: ['Fineza', 'Alcance'] },
  // Marcial · Dist.
  { name: 'Ballesta de mano',   cat: 'Marcial · Dist.', damage: '1d6',  type: 'Perforante',  melee: false, ability: 'DEX', props: ['Munición', 'Ligera'] },
  { name: 'Ballesta pesada',    cat: 'Marcial · Dist.', damage: '1d10', type: 'Perforante',  melee: false, ability: 'DEX', props: ['Munición', 'Pesada', 'Dos manos'] },
  { name: 'Arco largo',         cat: 'Marcial · Dist.', damage: '1d8',  type: 'Perforante',  melee: false, ability: 'DEX', props: ['Munición', 'Pesada', 'Dos manos'] },
];

let _attackModalIndex = -1;

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
    magicBonus: typeof atk.magicBonus === 'number' ? atk.magicBonus : 0,
    extraDamage: Array.isArray(atk.extraDamage) ? atk.extraDamage : [],
    weight: parseFloat(atk.weight) || 0,
  };
}

export function normalizeAttacks() {
  state.attacks = state.attacks.map(normalizeAttack);
}

export function getAttackBonus(atk) {
  const abilityMod = (atk.ability === 'NONE') ? 0 : getMod(atk.ability || 'STR');
  const base = Number.isFinite(atk.attackBonus)
    ? atk.attackBonus
    : abilityMod + (atk.proficient ? getProfBonus() : 0);
  return base + getEquipmentAttackBonus() + (atk.magicBonus || 0);
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
    const stateTag = atk.equipped
      ? '<span class="attack-state-tag equipped">Equipado</span>'
      : '<span class="attack-state-tag">Guardado</span>';
    const magicTag = (atk.magicBonus || 0) > 0
      ? `<span class="attack-magic-tag">+${atk.magicBonus} mágico</span>`
      : '';
    let extraDmgHtml = '';
    for (const ed of (atk.extraDamage || [])) {
      if (ed.dice) extraDmgHtml += `<span class="attack-extra-dmg">+ ${escapeAttr(ed.dice)} <em>${escapeAttr(ed.type || '')}</em></span>`;
    }
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
        ${magicTag}
        ${atk.properties?.length ? `<span class="attack-props">${atk.properties.join(' · ')}</span>` : ''}
        ${extraDmgHtml}
        ${rageTag}
        <div class="attack-actions">
          <button type="button" class="attack-mini-btn" onclick="rollAttackDamage(${i}, false)">Daño</button>
          <button type="button" class="attack-mini-btn" onclick="rollAttackDamage(${i}, true)">Crítico</button>
          <button type="button" class="attack-mini-btn attack-edit-btn" onclick="openAttackModal(${i})">✎ Editar</button>
        </div>
      </td>
      <td><button class="attack-btn" onclick="deleteAttack(${i})">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

export function addAttack() {
  openAttackModal();
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

// ── Modal ──────────────────────────────────────────────────────────────────

export function openAttackModal(i) {
  _attackModalIndex = (i !== undefined && i !== null) ? Number(i) : -1;
  const modal = document.getElementById('attackModal');
  if (!modal) return;

  _buildPresetOptions();

  const presetSel = document.getElementById('amPreset');
  if (_attackModalIndex >= 0 && state.attacks[_attackModalIndex]) {
    const atk = state.attacks[_attackModalIndex];
    document.getElementById('amName').value = atk.name || '';
    _setDamageSelect(atk.damage || '1d6');
    _setSelectValue('amType', atk.type || 'Cortante');
    _setSelectValue('amAbility', atk.ability || 'STR');
    _setSelectValue('amMagicBonus', String(atk.magicBonus || 0));
    document.getElementById('amProperties').value = (atk.properties || []).join(', ');
    document.getElementById('amProficient').checked = atk.proficient !== false;
    document.getElementById('amEquipped').checked = atk.equipped !== false;
    document.getElementById('amMelee').checked = atk.melee !== false;
    document.getElementById('amRage').checked = atk.rage !== false;
    document.getElementById('amWeight').value = atk.weight || 0;
    document.getElementById('amSyncInventory').checked = false;
    if (presetSel) presetSel.value = '';
    _buildExtraDamageRows(atk.extraDamage || []);
  } else {
    _attackModalIndex = -1;
    document.getElementById('amName').value = '';
    _setSelectValue('amDamage', '1d6');
    _setSelectValue('amType', 'Cortante');
    _setSelectValue('amAbility', 'STR');
    _setSelectValue('amMagicBonus', '0');
    document.getElementById('amProperties').value = '';
    document.getElementById('amProficient').checked = true;
    document.getElementById('amEquipped').checked = true;
    document.getElementById('amMelee').checked = true;
    document.getElementById('amRage').checked = true;
    document.getElementById('amWeight').value = 0;
    document.getElementById('amSyncInventory').checked = true;
    if (presetSel) presetSel.value = '';
    _buildExtraDamageRows([]);
  }

  _updateAttackPreview();
  modal.classList.add('open');
}

export function closeAttackModal() {
  document.getElementById('attackModal')?.classList.remove('open');
}

export function onAttackPresetChange() {
  const sel = document.getElementById('amPreset');
  const idx = parseInt(sel?.value);
  if (isNaN(idx) || idx < 0 || idx >= WEAPON_PRESETS.length) return;
  const w = WEAPON_PRESETS[idx];
  document.getElementById('amName').value = w.name;
  document.getElementById('amDamage').value = w.damage;
  _setSelectValue('amType', w.type);
  _setSelectValue('amAbility', w.ability);
  document.getElementById('amMelee').checked = w.melee;
  document.getElementById('amProperties').value = w.props.join(', ');
  _updateAttackPreview();
}

export function addAttackExtraDamageRow() {
  _addExtraDamageRow('1d6', 'Fuego');
  _updateAttackPreview();
}

export function updateAttackPreview() {
  _updateAttackPreview();
}

export function saveAttackFromModal() {
  const name = document.getElementById('amName')?.value?.trim() || 'Nuevo Ataque';
  const damage = document.getElementById('amDamage')?.value?.trim() || '1d6';
  const type = document.getElementById('amType')?.value || 'Cortante';
  const ability = document.getElementById('amAbility')?.value || 'STR';
  const magicBonus = parseInt(document.getElementById('amMagicBonus')?.value || '0') || 0;
  const propsRaw = document.getElementById('amProperties')?.value || '';
  const properties = propsRaw.split(',').map(s => s.trim()).filter(Boolean);
  const proficient = document.getElementById('amProficient')?.checked ?? true;
  const equipped = document.getElementById('amEquipped')?.checked ?? true;
  const melee = document.getElementById('amMelee')?.checked ?? true;
  const rage = document.getElementById('amRage')?.checked ?? true;

  const extraDamage = [];
  document.querySelectorAll('#amExtraDamageList .am-extra-row').forEach(row => {
    const dice = row.querySelector('.am-extra-dice')?.value?.trim() || '';
    const edType = row.querySelector('.am-extra-type')?.value || '';
    if (dice) extraDamage.push({ dice, type: edType });
  });

  const weight = parseFloat(document.getElementById('amWeight')?.value || '0') || 0;
  const syncInventory = document.getElementById('amSyncInventory')?.checked ?? false;

  const atk = { name, damage, type, ability, magicBonus, properties, proficient, equipped, melee, rage, attackBonus: null, extraDamage, weight };

  if (_attackModalIndex >= 0 && state.attacks[_attackModalIndex]) {
    state.attacks[_attackModalIndex] = atk;
  } else {
    state.attacks.push(atk);
  }

  if (syncInventory && weight > 0) {
    state.inventory.push({ icon: '⚔', name, qty: 1, type: 'weapon', equipped: true, weight, acBonus: 0, acBase: null, attackBonus: 0, speedBonus: 0 });
    window.renderInventory?.();
  }

  closeAttackModal();
  renderAttacks();
  window.saveToLocal?.();
}

// ── Helpers del modal ──────────────────────────────────────────────────────

function _buildPresetOptions() {
  const sel = document.getElementById('amPreset');
  if (!sel || sel.dataset.built) return;
  const groups = {};
  WEAPON_PRESETS.forEach((w, idx) => {
    if (!groups[w.cat]) groups[w.cat] = [];
    groups[w.cat].push({ idx, name: w.name });
  });
  let html = '<option value="">— Personalizada —</option>';
  for (const [cat, weapons] of Object.entries(groups)) {
    html += `<optgroup label="${cat}">`;
    weapons.forEach(w => { html += `<option value="${w.idx}">${w.name}</option>`; });
    html += '</optgroup>';
  }
  sel.innerHTML = html;
  sel.dataset.built = '1';
}

function _setDamageSelect(damage) {
  const sel = document.getElementById('amDamage');
  if (!sel) return;
  // strip embedded bonus (+3, -1…) to get just the dice part
  const dicePart = String(damage).replace(/\s*[+-]\s*\d+$/, '').trim();
  sel.value = dicePart;
  if (sel.value !== dicePart) {
    // custom value not in preset list — add temporarily
    const opt = document.createElement('option');
    opt.value = dicePart;
    opt.textContent = dicePart;
    sel.insertBefore(opt, sel.firstChild);
    sel.value = dicePart;
  }
}

function _setSelectValue(id, value) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.value = value;
  if (sel.value !== String(value)) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    sel.appendChild(opt);
    sel.value = value;
  }
}

function _buildExtraDamageRows(extraDamage) {
  const list = document.getElementById('amExtraDamageList');
  if (!list) return;
  list.innerHTML = '';
  extraDamage.forEach(ed => _addExtraDamageRow(ed.dice, ed.type));
}

function _addExtraDamageRow(dice = '1d6', type = 'Fuego') {
  const list = document.getElementById('amExtraDamageList');
  if (!list) return;
  const typeOpts = DAMAGE_TYPES.map(t => `<option value="${t}" ${t === type ? 'selected' : ''}>${t}</option>`).join('');
  const row = document.createElement('div');
  row.className = 'am-extra-row';
  row.innerHTML = `
    <input class="am-extra-dice" value="${escapeAttr(dice)}" placeholder="1d6" oninput="updateAttackPreview()">
    <select class="am-extra-type" onchange="updateAttackPreview()">${typeOpts}</select>
    <button type="button" class="am-extra-remove" onclick="this.closest('.am-extra-row').remove();updateAttackPreview()">✕</button>
  `;
  list.appendChild(row);
}

function _updateAttackPreview() {
  const preview = document.getElementById('amPreview');
  if (!preview) return;
  const ability = document.getElementById('amAbility')?.value || 'STR';
  const proficient = document.getElementById('amProficient')?.checked ?? true;
  const magicBonus = parseInt(document.getElementById('amMagicBonus')?.value || '0') || 0;
  const damage = document.getElementById('amDamage')?.value || '1d6';
  const type = document.getElementById('amType')?.value || 'Cortante';

  const abilityMod = (ability === 'NONE') ? 0 : getMod(ability);
  const profBonus = proficient ? getProfBonus() : 0;
  const attackTotal = abilityMod + profBonus + magicBonus;
  const attackStr = attackTotal >= 0 ? `+${attackTotal}` : `${attackTotal}`;

  const damageBonus = abilityMod + magicBonus;
  const bonusStr = damageBonus !== 0 ? (damageBonus > 0 ? `+${damageBonus}` : `${damageBonus}`) : '';
  let damageDisplay = `${damage}${bonusStr} ${type}`;

  document.querySelectorAll('#amExtraDamageList .am-extra-row').forEach(row => {
    const d = row.querySelector('.am-extra-dice')?.value || '1d6';
    const t = row.querySelector('.am-extra-type')?.value || '';
    damageDisplay += ` + ${d} ${t}`;
  });

  preview.innerHTML =
    `<span class="am-preview-attack">Ataque: <strong>${attackStr}</strong></span>` +
    `<span class="am-preview-sep">·</span>` +
    `<span class="am-preview-damage">Daño: <strong>${escapeAttr(damageDisplay)}</strong></span>`;
}

// ── Window bridges ─────────────────────────────────────────────────────────
window.normalizeAttack        = normalizeAttack;
window.renderAttacks          = renderAttacks;
window.addAttack              = addAttack;
window.updateAttackField      = updateAttackField;
window.deleteAttack           = deleteAttack;
window.getAttackBonus         = getAttackBonus;
window.formatDamageBonus      = formatDamageBonus;
window.openAttackModal        = openAttackModal;
window.closeAttackModal       = closeAttackModal;
window.onAttackPresetChange   = onAttackPresetChange;
window.saveAttackFromModal    = saveAttackFromModal;
window.addAttackExtraDamageRow = addAttackExtraDamageRow;
window.updateAttackPreview    = updateAttackPreview;
