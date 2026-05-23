/* ═══════════════════════════════════════════════
   INVENTORY EXTRAS — moneda + encumbrance
   Extiende el panel de Equipo con:
     - Bolsa de monedas (5 denominaciones: PC, PP, EP, PO, PE)
     - Total en piezas de oro
     - Barra de capacidad de carga (STR × 15 lb)
═══════════════════════════════════════════════ */
import { state }                              from './state.js';
import { getTotalCarryWeight,
         registerInventoryRenderHook }        from './modules/inventory.js';
import { registerBeforeSave,
         registerAfterLoad,
         saveToLocal }                        from './modules/persistence.js';

const CHARACTER_STATE = state.CHARACTER_STATE;

const GP_VALUE = { pc: 0.01, pp: 0.1, ep: 0.5, po: 1, pe: 10 };
const COIN_LABELS = {
  pc: { name: 'Cobre',    short: 'pc', color: '#cd7f32' },
  pp: { name: 'Plata',    short: 'pp', color: '#c0c0c0' },
  ep: { name: 'Eléctrum', short: 'ep', color: '#dcdc78' },
  po: { name: 'Oro',      short: 'po', color: '#ffd700' },
  pe: { name: 'Platino',  short: 'pe', color: '#e5e4e2' },
};

function ensureCurrency() {
  if (!CHARACTER_STATE.currency) {
    CHARACTER_STATE.currency = { pc: 0, pp: 0, ep: 0, po: 0, pe: 0 };
  }
  return CHARACTER_STATE.currency;
}

function getTotalGold() {
  const c = ensureCurrency();
  return Object.entries(c).reduce((sum, [k, v]) => sum + (parseInt(v) || 0) * GP_VALUE[k], 0);
}

function getMaxCarry() {
  return (parseInt(document.getElementById('score-STR')?.value) || 10) * 15;
}

function getPushCarry() {
  return (parseInt(document.getElementById('score-STR')?.value) || 10) * 30;
}

// ─── Render del panel de extras ────────────────────────────────────────────
function renderExtras() {
  const list = document.getElementById('inventoryList');
  if (!list) return;
  const card = list.closest('.card');
  if (!card) return;

  const c = ensureCurrency();
  const totalGp = getTotalGold();
  const weight  = getTotalCarryWeight();
  const maxCarry  = getMaxCarry();
  const pushCarry = getPushCarry();
  const pct = maxCarry > 0 ? Math.min(100, (weight / maxCarry) * 100) : 0;
  let encState = 'ok';
  if (weight > pushCarry)       encState = 'critical';
  else if (weight > maxCarry)   encState = 'heavy';
  else if (weight > maxCarry * 0.66) encState = 'loaded';

  const stateColors = {
    ok:       'var(--green-light, #4caf80)',
    loaded:   'var(--gold-light, #e8c96a)',
    heavy:    'var(--hp-wounded, #f1a83c)',
    critical: 'var(--hp-critical, #e0573b)',
  };
  const stateLabels = {
    ok:       'Ligero',
    loaded:   'Cargado',
    heavy:    'Sobrecargado',
    critical: 'No puede moverse',
  };

  let host = document.getElementById('invExtras');
  if (!host) {
    host = document.createElement('div');
    host.id = 'invExtras';
    host.className = 'inv-extras';
    list.parentElement.insertBefore(host, list);
  }

  host.innerHTML = `
    <div class="inv-coins">
      <div class="inv-coins-title">
        <span>◇ Bolsa de Monedas</span>
        <span class="inv-coins-total">${formatGp(totalGp)} <small>po</small></span>
      </div>
      <div class="inv-coins-grid">
        ${Object.entries(COIN_LABELS).map(([k, info]) => `
          <div class="inv-coin" data-coin="${k}">
            <div class="inv-coin-dot" style="background:${info.color};"></div>
            <div class="inv-coin-meta">
              <div class="inv-coin-name">${info.short.toUpperCase()}</div>
              <div class="inv-coin-label">${info.name}</div>
            </div>
            <input class="inv-coin-input" type="number" min="0" value="${c[k] || 0}"
              oninput="__setCoin('${k}', this.value)">
          </div>
        `).join('')}
      </div>
    </div>
    <div class="inv-encumbrance" data-state="${encState}">
      <div class="inv-enc-bar-wrap">
        <div class="inv-enc-bar" style="width:${pct}%; background:${stateColors[encState]};"></div>
        ${weight > maxCarry ? `<div class="inv-enc-overflow" style="left:100%; width:${Math.min(100, ((weight - maxCarry) / maxCarry) * 100)}%;"></div>` : ''}
      </div>
      <div class="inv-enc-detail">
        <span><strong style="color:${stateColors[encState]};">${formatLb(weight)}</strong> / ${maxCarry} lb · <span style="color:${stateColors[encState]};letter-spacing:2px;">${stateLabels[encState]}</span></span>
        <span class="inv-enc-hint">Empujar/Arrastrar: ${pushCarry} lb</span>
      </div>
    </div>
  `;
}

function formatGp(n) {
  if (n === 0) return '0';
  if (n < 1)   return n.toFixed(2);
  if (n % 1 === 0) return String(n);
  return n.toFixed(1);
}

function formatLb(n) {
  return (n % 1 === 0) ? String(n) : n.toFixed(1);
}

// ─── Setter de monedas (llamado desde oninput en HTML) ─────────────────────
export function __setCoin(coin, val) {
  const c = ensureCurrency();
  c[coin] = Math.max(0, parseInt(val) || 0);
  saveToLocal();
  renderExtras();
}

// ─── Hooks ─────────────────────────────────────────────────────────────────
registerInventoryRenderHook(() => renderExtras());

registerBeforeSave(() => {
  const c = ensureCurrency();
  if (c) CHARACTER_STATE.currency = c;
});

registerAfterLoad((data) => {
  if (data?.currency) {
    ensureCurrency();
    Object.assign(CHARACTER_STATE.currency, data.currency);
  }
  renderExtras();
});

// ─── Init ──────────────────────────────────────────────────────────────────
function init() {
  renderExtras();
  const strInput = document.getElementById('score-STR');
  if (strInput) strInput.addEventListener('input', renderExtras);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ─── Window bridge para oninput inline ────────────────────────────────────
window.__setCoin = __setCoin;
