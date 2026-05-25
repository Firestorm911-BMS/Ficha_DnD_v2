import { state } from '../state.js';
import { getMod } from './attributes.js';
import { showToast, addCombatLog } from './toast-log.js';

const RESOURCE_SCALE = {
  'Bárbaro':   [2,2,3,3,3,4,4,4,4,4,4,5,5,5,5,5,6,6,6,6],
  'Guerrero':  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  'Monje':     [0,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
  'Druida':    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  'Clérigo':   [1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3],
  'Hechicero': [0,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
  'Brujo':     [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
};

export function getResourceScale(className, level) {
  const table = RESOURCE_SCALE[className];
  if (!table) return null;
  return table[Math.min(Math.max(level, 1), 20) - 1];
}

export function calcResourceMaxUses(className, level) {
  if (className === 'Bardo') return Math.max(1, getMod('CHA'));
  return getResourceScale(className, level);
}

export function getRageDamageBonus(atk) {
  // CODEX-07: Furia solo da bono a ataques CaC que usen FUE (PHB 5e p.48)
  // atk.ability === 'DEX' → finesse con DES → sin bono. undefined/null/'STR' → sí aplica.
  const usesStr = !atk || atk.ability !== 'DEX';
  const applies = state.rageActive && atk && atk.rage !== false && atk.melee !== false && usesStr;
  return applies ? (state.CHARACTER_STATE.classResource?.damageBonus || 0) : 0;
}

export function renderRage() {
  const cr      = state.CHARACTER_STATE.classResource || {};
  const maxUses = cr.maxUses || 0;
  const spent   = Math.min(state.CHARACTER_STATE.rageUsesSpent || 0, maxUses);
  const avail   = maxUses - spent;
  const rName   = cr.name  || 'Recurso';
  const rIcon   = cr.icon  || '⚡';
  const hasResource = maxUses > 0 || cr.effects?.length > 0;

  const card = document.getElementById('rageCard');
  if (card) card.style.display = hasResource ? '' : 'none';

  const cardTitle = card?.querySelector('.card-title');
  if (cardTitle) cardTitle.innerHTML = `<span class="card-title-icon">${rIcon}</span>${rName}`;

  ['resourcePipsMain', 'resourcePipsCombat'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < maxUses; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip ' + (i < avail ? 'available' : 'used');
      container.appendChild(pip);
    }
  });

  const resLabel = document.querySelector('.resource-box .resource-label');
  if (resLabel) {
    const bonusText = cr.damageBonus ? ` · +${cr.damageBonus} daño` : '';
    const recText = cr.recovery === 'short' ? ' · desc. corto' : cr.recovery === 'long' ? ' · desc. largo' : '';
    resLabel.textContent = maxUses > 0 ? `${avail}/${maxUses}${bonusText}${recText}` : (cr.effects?.length ? 'Pasivo' : '—');
  }

  const resName = document.querySelector('.resource-box .resource-name');
  if (resName) resName.textContent = `${rIcon} ${rName}`;

  const btn = document.getElementById('rageBtn');
  if (btn) {
    if (cr.recovery === 'turn') {
      const used = state.CHARACTER_STATE.sneakAttackUsed || false;
      btn.style.display = ''; btn.disabled = false;
      btn.style.opacity = used ? '0.55' : '';
      btn.style.background = '';
      btn.textContent = used ? `✕ ${rName}: Usado` : `${rIcon} Marcar como usado`;
    } else if (state.rageActive) {
      btn.textContent = `💨 Terminar ${rName}`;
      btn.style.background = 'linear-gradient(135deg,var(--red-dark),var(--red))';
      btn.disabled = false; btn.style.opacity = ''; btn.style.display = '';
    } else if (avail > 0) {
      btn.textContent = `${rIcon} Activar ${rName}`;
      btn.style.background = ''; btn.disabled = false; btn.style.opacity = ''; btn.style.display = '';
    } else if (maxUses > 0) {
      btn.textContent = `⚡ Sin ${rName}`;
      btn.style.background = ''; btn.disabled = true; btn.style.opacity = '0.45'; btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  }

  const status = document.getElementById('rageStatus');
  if (status) {
    if (cr.recovery === 'turn') {
      const used = state.CHARACTER_STATE.sneakAttackUsed || false;
      status.textContent = used
        ? `${rIcon} ${rName} — ya usado este turno`
        : `${rIcon} ${rName} — disponible (se recupera al inicio del turno)`;
      status.style.color = used ? 'var(--text-muted)' : 'var(--green-light)';
    } else if (state.rageActive) {
      const bonusText = cr.damageBonus ? ` · +${cr.damageBonus} daño` : '';
      const resistText = cr.physResist ? ' · Resistencia física' : '';
      status.textContent = `${rIcon} ¡${rName.toUpperCase()} ACTIVA!${bonusText}${resistText}`;
      status.style.color = '#e74c3c';
    } else if (maxUses > 0) {
      status.textContent = avail > 0
        ? `${rName} inactiva — ${avail} uso${avail !== 1 ? 's' : ''} disponible${avail !== 1 ? 's' : ''}`
        : `Sin usos de ${rName} — descansa para recuperar`;
      status.style.color = 'var(--text-muted)';
    } else {
      status.textContent = cr.effects?.length ? `${rName} — ver efectos` : '';
    }
  }

  const effectsEl = document.getElementById('rageEffects');
  if (effectsEl) {
    effectsEl.style.display = (state.rageActive || cr.recovery === 'turn' || (maxUses === 0 && cr.effects?.length)) ? 'block' : 'none';
    let effectsList = [...(cr.effects || [])];
    if (cr.recovery === 'turn' && effectsList.length > 0) {
      const lvl = window.getCurrentLevel?.() ?? 1;
      effectsList[0] = `Daño extra: ${Math.ceil(lvl / 2)}d6 (nivel ${lvl})`;
    }
    effectsEl.querySelector('ul').innerHTML = effectsList.map(e => `<li>⚡ ${e}</li>`).join('');
  }

  if (card) card.style.boxShadow = state.rageActive ? '0 0 30px var(--red-glow)' : '';

  const overlayPips = document.getElementById('overlayRagePips');
  if (overlayPips) {
    overlayPips.innerHTML = '';
    for (let i = 0; i < maxUses; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip ' + (i < avail ? 'available' : 'used');
      overlayPips.appendChild(pip);
    }
  }
  const overlayBtn = document.getElementById('overlayRageBtn');
  if (overlayBtn) {
    overlayBtn.style.display = hasResource ? '' : 'none';
    if (state.rageActive) {
      overlayBtn.textContent = `💨 Terminar`;
      overlayBtn.style.background = 'linear-gradient(135deg,var(--red-dark),var(--red))';
      overlayBtn.style.color = 'white'; overlayBtn.disabled = false; overlayBtn.style.opacity = '';
    } else if (avail > 0) {
      overlayBtn.textContent = `${rIcon} ${rName}`;
      overlayBtn.style.background = ''; overlayBtn.style.color = '';
      overlayBtn.disabled = false; overlayBtn.style.opacity = '';
    } else {
      overlayBtn.textContent = '⚡ Sin usos';
      overlayBtn.style.background = ''; overlayBtn.style.color = '';
      overlayBtn.disabled = true; overlayBtn.style.opacity = '0.45';
    }
  }
  const overlayStrip = document.getElementById('overlayRageStrip');
  if (overlayStrip) overlayStrip.style.display = hasResource ? '' : 'none';

  document.body.classList.toggle('rage-active', state.rageActive);
  window.renderAttacks?.();
  _renderExtraResources();
}

function _renderExtraResources() {
  const card = document.getElementById('rageCard');
  if (!card) return;
  const extras = state.CHARACTER_STATE.extraClassResources || [];

  let container = document.getElementById('extraResourcesContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'extraResourcesContainer';
    card.appendChild(container);
  }

  if (extras.length === 0) { container.style.display = 'none'; return; }
  container.style.display = '';
  container.innerHTML = extras.map((r, idx) => {
    const maxUses = r.maxUses || 0;
    const spent   = Math.min(r.usesSpent || 0, maxUses);
    const avail   = maxUses - spent;
    const rIcon   = r.icon  || '⚡';
    const rName   = r.name  || 'Recurso';
    const recText = r.recovery === 'short' ? ' · desc. corto' : r.recovery === 'long' ? ' · desc. largo' : r.recovery === 'turn' ? ' · por turno' : '';
    const pips    = Array.from({length: maxUses}, (_, i) =>
      `<div class="pip ${i < avail ? 'available' : 'used'}" onclick="toggleExtraResourcePip(${idx},this)" style="cursor:pointer;"></div>`
    ).join('');
    return `
      <div style="margin-top:8px;padding:8px 2px;border-top:1px solid rgba(201,168,76,0.18);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:12px;color:var(--text-muted);">${rIcon} ${rName}</span>
          <span style="font-size:11px;color:var(--text-muted);">${avail}/${maxUses}${recText}</span>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">${pips}</div>
      </div>`;
  }).join('');
}

export function toggleRage() {
  const cr      = state.CHARACTER_STATE.classResource || {};
  const maxUses = cr.maxUses || 0;
  const spent   = state.CHARACTER_STATE.rageUsesSpent || 0;
  const rName   = cr.name || 'Recurso';
  const rIcon   = cr.icon || '⚡';

  if (cr.recovery === 'turn') {
    state.CHARACTER_STATE.sneakAttackUsed = !state.CHARACTER_STATE.sneakAttackUsed;
    const used = state.CHARACTER_STATE.sneakAttackUsed;
    addCombatLog(used ? `${rIcon} ${rName} usado este turno` : `${rIcon} ${rName} disponible de nuevo`);
    renderRage(); window.saveState?.(); return;
  }

  if (!state.rageActive) {
    if (maxUses > 0 && spent >= maxUses) { showToast(`Sin usos de ${rName} disponibles`); return; }
    state.rageActive = true;
    if (maxUses > 0) state.CHARACTER_STATE.rageUsesSpent = spent + 1;
    addCombatLog(`${rIcon} ${rName} activada — uso ${spent + 1}/${maxUses}`);
    if (cr.physResist && state.concentrationSpell) {
      addCombatLog(`⚡ Concentración en "${state.concentrationSpell?.name}" rota por ${rName}`);
      window.breakConcentration?.();
    }
  } else {
    state.rageActive = false;
    addCombatLog(`💨 ${rName} terminada`);
  }
  renderRage();
  window.saveState?.();
}

export function toggleRagePip(el) {
  const maxUses = state.CHARACTER_STATE.classResource?.maxUses || 0;
  const spent   = state.CHARACTER_STATE.rageUsesSpent || 0;
  if (el.classList.contains('available')) {
    state.CHARACTER_STATE.rageUsesSpent = Math.min(maxUses, spent + 1);
  } else {
    state.CHARACTER_STATE.rageUsesSpent = Math.max(0, spent - 1);
  }
  renderRage();
  window.saveState?.();
}

export function addExtraResource(res) {
  if (!state.CHARACTER_STATE.extraClassResources) state.CHARACTER_STATE.extraClassResources = [];
  const idx = state.CHARACTER_STATE.extraClassResources.findIndex(r => r.name === res.name);
  if (idx >= 0) {
    state.CHARACTER_STATE.extraClassResources[idx] = { usesSpent: 0, ...res };
  } else {
    state.CHARACTER_STATE.extraClassResources.push({ usesSpent: 0, ...res });
  }
  renderRage();
}

export function toggleExtraResourcePip(idx, el) {
  const extras = state.CHARACTER_STATE.extraClassResources;
  if (!extras?.[idx]) return;
  const r       = extras[idx];
  const maxUses = r.maxUses || 0;
  const spent   = r.usesSpent || 0;
  r.usesSpent   = el.classList.contains('available') ? Math.min(maxUses, spent + 1) : Math.max(0, spent - 1);
  renderRage();
  window.saveState?.();
}

export function resetRageState() {
  // Termina el estado activo pero NO recupera usos — eso requiere descanso largo
  state.rageActive = false;
  renderRage();
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.getResourceScale      = getResourceScale;
window.calcResourceMaxUses   = calcResourceMaxUses;
window.getRageDamageBonus    = getRageDamageBonus;
window.renderRage            = renderRage;
window.toggleRage            = toggleRage;
window.toggleRagePip         = toggleRagePip;
window.resetRageState        = resetRageState;
window.addExtraResource      = addExtraResource;
window.toggleExtraResourcePip = toggleExtraResourcePip;
