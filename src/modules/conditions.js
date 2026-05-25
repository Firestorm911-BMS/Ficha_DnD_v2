import { state } from '../state.js';

export const CONDITIONS = [
  { name: 'Cegado',        icon: '👁',  desc: 'Falla chequeos que requieran vista. Sus ataques con desventaja; ataques contra él con ventaja.' },
  { name: 'Encantado',     icon: '💫', desc: 'No puede atacar al encantador. El encantador tiene ventaja en interacción social con él.' },
  { name: 'Asustado',      icon: '😨', desc: 'Desventaja en ataques y chequeos mientras vea la fuente. No puede acercarse a ella.' },
  { name: 'Agarrado',      icon: '🤝', desc: 'Velocidad 0. Termina si el agarrador queda incapacitado o el objetivo escapa.' },
  { name: 'Incapacitado',  icon: '🚫', desc: 'No puede realizar acciones ni reacciones.' },
  { name: 'Invisible',     icon: '👻', desc: 'No puede ser visto. Sus ataques con ventaja; ataques contra él con desventaja.' },
  { name: 'Paralizado',    icon: '⚡', desc: 'Incapacitado, sin movimiento ni habla. Falla FUE/DES. Ataques contra él con ventaja. Impactos a ≤1.5m son críticos automáticos.' },
  { name: 'Petrificado',   icon: '🪨', desc: 'Incapacitado, transformado en sustancia sólida. Resistencia a todo daño. Inmune a veneno y enfermedad. Crítico a ≤1.5m.' },
  { name: 'Envenenado',    icon: '☠',  desc: 'Desventaja en tiradas de ataque y chequeos de habilidad.' },
  { name: 'Derribado',     icon: '⬇',  desc: 'Solo puede gatear (vel. ÷2) o levantarse (gasta mitad del mov.). Ataques propios con desventaja. Ataques CaC contra él con ventaja; a distancia, con desventaja.' },
  { name: 'Contenido',     icon: '🕸',  desc: 'Velocidad 0. Ataques propios con desventaja. Ataques contra él con ventaja. Desventaja en salvaciones de DES.' },
  { name: 'Aturdido',      icon: '💢', desc: 'Incapacitado, sin movimiento, habla titubeante. Falla FUE/DES. Ataques contra él con ventaja.' },
  { name: 'Inconsciente',  icon: '💤', desc: 'Incapacitado, sin movimiento ni habla. Falla FUE/DES. Ataques con ventaja. Impactos a ≤1.5m son críticos. Sin concentración.' },
  { name: 'En Furia',      icon: '🔥', desc: '+2 al daño CaC. Resistencia a daño contundente, perforante y cortante. No puede lanzar ni concentrar conjuros.' }
];

// Efecto acumulativo por nivel de agotamiento (índice = nivel 1-6)
export const EXHAUSTION_EFFECTS = [
  'Desventaja en chequeos de habilidad',
  'Velocidad reducida a la mitad',
  'Desventaja en tiradas de ataque y de salvación',
  'Máximo de PG reducido a la mitad',
  'Velocidad reducida a 0',
  '💀 Muerte',
];

export function renderExhaustion() {
  const container = document.getElementById('exhaustionTracker');
  if (!container) return;
  const lvl = Math.max(0, Math.min(6, state.CHARACTER_STATE.exhaustion || 0));

  const color = lvl === 0 ? 'var(--text-muted)'
              : lvl <= 2  ? '#d4ac0d'
              : lvl <= 4  ? '#e67e22'
                          : '#e74c3c';

  const pips = Array.from({length: 6}, (_, i) => {
    const pipColor = i < 2 ? '#d4ac0d' : i < 4 ? '#e67e22' : '#e74c3c';
    return `<span class="exhaustion-pip${i < lvl ? ' active' : ''}" ${i < lvl ? `style="background:${pipColor};border-color:${pipColor}"` : ''}></span>`;
  }).join('');

  let effectsHTML = '';
  if (lvl === 0) {
    effectsHTML = `<span style="color:var(--text-muted);font-size:10px;font-family:'IM Fell English',serif;">Sin efectos activos</span>`;
  } else {
    effectsHTML = EXHAUSTION_EFFECTS.slice(0, lvl).map((eff, i) => {
      const level = i + 1;
      let extra = '';
      if (level === 2) {
        const spd = parseInt(document.getElementById('statSpeed')?.textContent) || 0;
        extra = ` <span style="color:var(--text-muted)">(${Math.floor(spd / 2)} m)</span>`;
      } else if (level === 4) {
        const hpMax = parseInt(document.getElementById('hpMax')?.textContent) || 0;
        extra = ` <span style="color:var(--text-muted)">(efectivo: ${Math.floor(hpMax / 2)} PG)</span>`;
      }
      return `<div class="exhaustion-effect${level === lvl ? ' latest' : ''}" style="color:${level === lvl ? color : 'var(--text-muted)'}">⚠ ${eff}${extra}</div>`;
    }).join('');
  }

  container.innerHTML = `
    <div class="exhaustion-tracker">
      <div class="exhaustion-header">
        <span class="exhaustion-label">Agotamiento</span>
        <div class="exhaustion-controls">
          <button class="exhaustion-btn" onclick="changeExhaustion(-1)">−</button>
          <span class="exhaustion-level" style="color:${color}">${lvl}</span>
          <button class="exhaustion-btn" onclick="changeExhaustion(1)">+</button>
        </div>
      </div>
      <div class="exhaustion-pips">${pips}</div>
      <div class="exhaustion-effects">${effectsHTML}</div>
    </div>`;
}

export function changeExhaustion(delta) {
  const prev = state.CHARACTER_STATE.exhaustion || 0;
  state.CHARACTER_STATE.exhaustion = Math.max(0, Math.min(6, prev + delta));
  const lvl = state.CHARACTER_STATE.exhaustion;
  renderExhaustion();
  if (lvl !== prev) {
    if (lvl === 0) window.addCombatLog?.('✦ Agotamiento eliminado');
    else if (lvl === 6) window.addCombatLog?.('💀 Agotamiento nivel 6 — el personaje muere');
    else window.addCombatLog?.(`⚠ Agotamiento: nivel ${lvl} — ${EXHAUSTION_EFFECTS[lvl - 1]}`);
    // Agotamiento Nv.4+: clampear PG actuales al nuevo máximo efectivo (RAW: los PG no pueden
    // superar el máximo, y el máximo queda a la mitad — PHB 5e p.291 + regla general p.196)
    if (lvl >= 4) {
      const curEl = document.getElementById('hpCurrent');
      const maxEl = document.getElementById('hpMax');
      const cur  = parseInt(curEl?.textContent) || 0;
      const max  = parseInt(maxEl?.textContent) || 0;
      const effectiveMax = Math.max(1, Math.floor(max / 2));
      if (cur > effectiveMax) {
        if (curEl) curEl.textContent = String(effectiveMax);
        window.addCombatLog?.(
          `💀 Agotamiento Nv.4: PG reducidos ${cur}→${effectiveMax} (máximo a la mitad)`
        );
      }
    }
    // Actualizar HP y velocidad en tiempo real al cambiar el agotamiento
    window.updateHP?.();
    window.__syncBattleStance?.();
    window.saveToLocal?.();
  }
}

export function renderConditions() {
  const grid = document.getElementById('conditionsGrid');
  if (!grid) return;

  let infoPanel = document.getElementById('conditionInfoPanel');
  if (!infoPanel) {
    infoPanel = document.createElement('div');
    infoPanel.id = 'conditionInfoPanel';
    infoPanel.className = 'condition-info-panel';
    grid.parentElement.appendChild(infoPanel);
  }

  grid.innerHTML = '';
  CONDITIONS.forEach((c, idx) => {
    const div = document.createElement('div');
    div.className = 'condition-tag';
    div.dataset.conditionIndex = idx;
    div.innerHTML = `<span class="cond-icon">${c.icon}</span>${c.name}`;
    div.onclick = () => { div.classList.toggle('active'); window.saveToLocal?.(); };
    div.addEventListener('mouseenter', () => {
      infoPanel.innerHTML = `<strong>${c.icon} ${c.name}</strong> — ${c.desc}`;
      infoPanel.classList.add('visible');
    });
    div.addEventListener('mouseleave', () => infoPanel.classList.remove('visible'));
    grid.appendChild(div);
  });
}

export function getActiveConditions() {
  return Array.from(document.querySelectorAll('.condition-tag.active')).map(el => {
    const icon = el.querySelector('.cond-icon');
    return el.textContent.slice(icon ? icon.textContent.length : 0).trim();
  });
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.renderConditions = renderConditions;
window.renderExhaustion = renderExhaustion;
window.changeExhaustion = changeExhaustion;
