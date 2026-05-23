/* ═══════════════════════════════════════════════
   EXTRA RESOURCES — soporte multiclase para recursos
   de clase secundarios (ej. Furia del Bárbaro + Ki del
   Monje en una build Bárbaro/Monje).
═══════════════════════════════════════════════ */
import { state }                        from './state.js';
import { showToast, addCombatLog }      from './modules/toast-log.js';
import { registerRestHook }             from './modules/rests.js';
import { registerAfterLoad }            from './modules/persistence.js';
import { saveToLocal }                  from './modules/persistence.js';
import { escapeAttr }                   from './modules/utils.js';

const CHARACTER_STATE = state.CHARACTER_STATE;

function ensureExtras() {
  if (!Array.isArray(CHARACTER_STATE.extraResources)) {
    CHARACTER_STATE.extraResources = [];
  }
  return CHARACTER_STATE.extraResources;
}

export function addExtraResource(resource) {
  const list = ensureExtras();
  if (!resource?.name) return;
  if (list.some(r => r.name === resource.name)) return;
  list.push({
    name:        resource.name,
    icon:        resource.icon || '⚡',
    maxUses:     resource.maxUses || 0,
    spent:       0,
    recovery:    resource.recovery || 'long',
    damageBonus: resource.damageBonus || 0,
    physResist:  !!resource.physResist,
    effects:     [...(resource.effects || [])],
  });
  renderExtraResources();
  saveToLocal();
}

export function removeExtraResource(idx) {
  const list = ensureExtras();
  if (idx < 0 || idx >= list.length) return;
  list.splice(idx, 1);
  renderExtraResources();
  saveToLocal();
}

export function useExtraResource(idx) {
  const list = ensureExtras();
  const r = list?.[idx];
  if (!r) return;
  if (r.spent >= r.maxUses) {
    showToast(`⚠ Sin usos de ${r.name}`);
    return;
  }
  r.spent++;
  addCombatLog(`${r.icon} ${r.name} usado (${r.maxUses - r.spent}/${r.maxUses})`);
  renderExtraResources();
  saveToLocal();
}

export function restoreExtraResource(idx) {
  const list = ensureExtras();
  const r = list?.[idx];
  if (!r || r.spent <= 0) return;
  r.spent--;
  renderExtraResources();
  saveToLocal();
}

// ─── Render ───────────────────────────────────────────────
function renderExtraResources() {
  const list = ensureExtras();
  renderInHost('resourcePipsMain', list, 'main');
  renderInHost('rageCard',         list, 'combat');
}

function renderInHost(anchorId, list, mode) {
  const anchor = document.getElementById(anchorId);
  if (!anchor) return;

  if (mode === 'main') {
    const card = anchor.closest('.card');
    if (!card) return;
    let extras = card.querySelector('.extra-resources-main');
    if (!extras) {
      extras = document.createElement('div');
      extras.className = 'extra-resources-main';
      card.appendChild(extras);
    }
    if (list.length === 0) { extras.innerHTML = ''; return; }
    extras.innerHTML = list.map((r, i) => `
      <div class="resource-box extra-resource" data-idx="${i}">
        <div class="resource-name">${r.icon} ${r.name}</div>
        <div class="resource-pips">${pips(r)}</div>
        <div class="resource-label">${r.maxUses - r.spent}/${r.maxUses}${recLabel(r)}</div>
      </div>
    `).join('');
  } else if (mode === 'combat') {
    const parent = anchor.parentElement;
    if (!parent) return;
    parent.querySelectorAll('.extra-resource-card').forEach(el => el.remove());
    list.forEach((r, i) => {
      const div = document.createElement('div');
      div.className = 'card extra-resource-card';
      div.dataset.idx = i;
      div.innerHTML = `
        <div class="card-title"><span class="card-title-icon">${r.icon}</span>${r.name}</div>
        <div style="display:flex;flex-direction:column;align-items:center;padding:12px;gap:10px;">
          <div class="resource-pips" style="display:flex;gap:8px;justify-content:center;">
            ${pips(r, i)}
          </div>
          <div style="font-family:'IM Fell English',serif;font-size:13px;color:var(--text-muted);font-style:italic;">
            ${r.maxUses - r.spent} de ${r.maxUses} disponibles${recLabel(r)}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
            <button class="btn btn-sm" onclick="useExtraResource(${i})" ${r.spent >= r.maxUses ? 'disabled style="opacity:0.45;"' : ''}>${r.icon} Usar uno</button>
            <button class="btn btn-sm" onclick="restoreExtraResource(${i})" ${r.spent <= 0 ? 'disabled style="opacity:0.45;"' : ''}>↺ Restaurar</button>
            <button class="btn btn-sm" onclick="if(confirm('¿Quitar ${escapeAttr(r.name)}?')) removeExtraResource(${i})" style="opacity:0.5;font-size:10px;">✕</button>
          </div>
          ${r.effects?.length ? `<ul style="list-style:none;padding:8px 12px;margin:0;background:rgba(var(--panel-rgb),0.4);border:1px solid var(--border);border-radius:4px;font-family:'IM Fell English',serif;font-size:12px;color:var(--text-secondary);line-height:1.6;width:100%;box-sizing:border-box;">
            ${r.effects.map(e => `<li style="margin-bottom:2px;">⚡ ${e}</li>`).join('')}
          </ul>` : ''}
        </div>
      `;
      const last = parent.querySelectorAll('.extra-resource-card');
      const after = last.length ? last[last.length - 1] : anchor;
      after.parentNode.insertBefore(div, after.nextSibling);
    });
  }
}

function pips(r, idx) {
  const avail = r.maxUses - r.spent;
  let html = '';
  for (let i = 0; i < r.maxUses; i++) {
    const used = i >= avail;
    html += `<div class="pip ${used ? 'used' : 'available'}" ${idx != null ? `onclick="__extraPip(${idx},${i})"` : ''} style="cursor:pointer;"></div>`;
  }
  return html || '<span style="font-size:11px;color:var(--text-muted);font-style:italic;">Pasivo</span>';
}

export function __extraPip(idx, pipIdx) {
  const list = ensureExtras();
  const r = list?.[idx];
  if (!r) return;
  const avail = r.maxUses - r.spent;
  if (pipIdx < avail) r.spent++;
  else r.spent = Math.max(0, r.spent - 1);
  renderExtraResources();
  saveToLocal();
}

function recLabel(r) {
  if (r.recovery === 'short') return ' · desc. corto';
  if (r.recovery === 'long')  return ' · desc. largo';
  if (r.recovery === 'turn')  return ' · 1/turno';
  return '';
}

// ─── Hooks de descanso ─────────────────────────────────────────────────────
registerRestHook('short', () => {
  const list = ensureExtras();
  list.forEach(r => { if (r.recovery === 'short') r.spent = 0; });
  renderExtraResources();
});

registerRestHook('long', () => {
  const list = ensureExtras();
  list.forEach(r => { if (r.recovery === 'short' || r.recovery === 'long') r.spent = 0; });
  renderExtraResources();
});

registerAfterLoad((data) => {
  if (data?.extraResources) CHARACTER_STATE.extraResources = data.extraResources;
  renderExtraResources();
});

// ─── Init ──────────────────────────────────────────────────────────────────
function init() {
  setTimeout(renderExtraResources, 300);
  setTimeout(renderExtraResources, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ─── Window bridge para onclick inline ────────────────────────────────────
window.renderExtraResources = renderExtraResources;
window.addExtraResource     = addExtraResource;
window.removeExtraResource  = removeExtraResource;
window.useExtraResource     = useExtraResource;
window.restoreExtraResource = restoreExtraResource;
window.__extraPip           = __extraPip;
