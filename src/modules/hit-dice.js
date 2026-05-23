import { state } from '../state.js';
import { getMod } from './attributes.js';
import { showToast, addCombatLog } from './toast-log.js';

export function _migrateHitDice() {
  if (state.CHARACTER_STATE.hitDice?.length) return;
  const die = state.CHARACTER_STATE.hitDieType || 'd8';
  const level = window.getCurrentLevel?.() ?? 1;
  const spent = state.CHARACTER_STATE.hitDiceSpent || 0;
  state.CHARACTER_STATE.hitDice = [{ die, count: level, spent: Math.min(spent, level) }];
}

export function _hdTotalDice() {
  return (state.CHARACTER_STATE.hitDice || []).reduce((s, d) => s + d.count, 0);
}

export function _hdTotalSpent() {
  return (state.CHARACTER_STATE.hitDice || []).reduce((s, d) => s + d.spent, 0);
}

export function updateRestNote() {
  _migrateHitDice();
  const hd = state.CHARACTER_STATE.hitDice || [];
  const dieStr = hd.map(d => `${d.count}${d.die}`).join(' + ') || 'd8';
  const total = _hdTotalDice();
  const toRestore = Math.max(1, Math.ceil(total / 2));
  const el = document.getElementById('restNote');
  const rName = state.CHARACTER_STATE.classResource?.name || 'recurso de clase';
  if (el) el.textContent = `Dado de golpe: ${dieStr} + CON por uso. Descanso largo restaura PG, ${rName}, conjuros, salvaciones y ${toRestore} dado${toRestore > 1 ? 's' : ''} de golpe.`;
}

export function renderHitDice() {
  _migrateHitDice();
  const section = document.getElementById('hitDiceSection');
  if (!section) return;
  section.innerHTML = '';

  const hd = state.CHARACTER_STATE.hitDice || [];
  const editMode = document.body.classList.contains('edit-mode');

  hd.forEach((entry, gi) => {
    const available = entry.count - entry.spent;
    const group = document.createElement('div');
    group.className = 'hd-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'hd-group-label';
    labelRow.innerHTML = `${entry.count}${entry.die} <span style="font-size:11px;color:${available > 0 ? 'var(--gold)' : 'var(--text-muted)'};">${available}/${entry.count}</span>`;

    if (editMode) {
      const editRow = document.createElement('div');
      editRow.className = 'hd-edit-row';
      editRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;';
      const dieOpts = ['d6','d8','d10','d12'].map(d => `<option ${d===entry.die?'selected':''}>${d}</option>`).join('');
      editRow.innerHTML = `
        <select style="font-family:'Cinzel',serif;font-size:9px;background:rgba(0,0,0,0.4);border:1px solid var(--border);color:var(--gold);padding:1px 3px;border-radius:3px;"
          onchange="_hdChangeDie(${gi},this.value)">${dieOpts}</select>
        <button onclick="_hdAdjCount(${gi},-1)" style="width:18px;height:18px;border-radius:50%;border:1px solid var(--border);background:var(--bg-deep);color:var(--text-primary);cursor:pointer;font-size:11px;line-height:1;">−</button>
        <span style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold);">${entry.count}</span>
        <button onclick="_hdAdjCount(${gi},1)" style="width:18px;height:18px;border-radius:50%;border:1px solid var(--border);background:var(--bg-deep);color:var(--text-primary);cursor:pointer;font-size:11px;line-height:1;">+</button>
        ${hd.length > 1 ? `<button onclick="_hdRemoveGroup(${gi})" style="font-size:9px;color:var(--text-muted);background:none;border:none;cursor:pointer;">✕</button>` : ''}
      `;
      group.appendChild(labelRow);
      group.appendChild(editRow);
    } else {
      group.appendChild(labelRow);
    }

    const pipsRow = document.createElement('div');
    pipsRow.className = 'hd-group-pips';
    for (let i = 0; i < entry.count; i++) {
      const isAvail = i < available;
      const pip = document.createElement('div');
      pip.className = `pip ${isAvail ? 'available' : 'used'}`;
      pip.title = isAvail ? `${entry.die} disponible — click para gastar` : `${entry.die} gastado — click para recuperar`;
      pip.onclick = () => {
        if (isAvail) _doSpendHitDie(gi);
        else { entry.spent = Math.max(0, entry.spent - 1); renderHitDice(); window.saveToLocal?.(); }
      };
      pipsRow.appendChild(pip);
    }
    group.appendChild(pipsRow);
    section.appendChild(group);
  });

  if (editMode && hd.length < 4) {
    const addBtn = document.createElement('button');
    addBtn.style.cssText = 'font-family:Cinzel,serif;font-size:9px;color:var(--text-muted);background:none;border:1px dashed var(--border);border-radius:4px;padding:4px 8px;cursor:pointer;align-self:center;';
    addBtn.textContent = '+ Tipo';
    addBtn.onclick = () => { state.CHARACTER_STATE.hitDice.push({ die:'d8', count:1, spent:0 }); renderHitDice(); window.saveToLocal?.(); };
    section.appendChild(addBtn);
  }

  state.CHARACTER_STATE.hitDieType  = hd[0]?.die || 'd8';
  state.CHARACTER_STATE.hitDiceSpent = _hdTotalSpent();
  updateRestNote();
}

export function _hdChangeDie(gi, die) {
  if (state.CHARACTER_STATE.hitDice[gi]) state.CHARACTER_STATE.hitDice[gi].die = die;
  renderHitDice(); window.saveToLocal?.();
}

export function _hdAdjCount(gi, delta) {
  const entry = state.CHARACTER_STATE.hitDice[gi];
  if (!entry) return;
  entry.count = Math.max(1, Math.min(20, entry.count + delta));
  entry.spent = Math.min(entry.spent, entry.count);
  renderHitDice(); window.saveToLocal?.();
}

export function _hdRemoveGroup(gi) {
  state.CHARACTER_STATE.hitDice.splice(gi, 1);
  renderHitDice(); window.saveToLocal?.();
}

function showHitDieResult(dieType, roll, conMod, healed) {
  const existing = document.getElementById('hitDiePopup');
  if (existing) existing.remove();
  const popup = document.createElement('div');
  popup.id = 'hitDiePopup';
  popup.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,rgba(8,14,8,0.97),rgba(20,12,6,0.97));border:2px solid var(--gold);border-radius:8px;padding:28px 36px;z-index:10000;text-align:center;box-shadow:0 0 40px var(--gold-glow),0 20px 60px rgba(0,0,0,0.8);animation:promptIn 0.3s ease;min-width:220px;`;
  popup.innerHTML = `
    <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px;">☾ Dado de Golpe · 1${dieType}</div>
    <div style="font-family:'Cinzel Decorative',serif;font-size:56px;color:var(--gold-light);line-height:1;margin-bottom:10px;text-shadow:0 0 20px var(--gold-glow);">${roll}</div>
    <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--text-secondary);margin-bottom:18px;">
      ${roll} ${conMod >= 0 ? `+${conMod}` : conMod} CON = <strong style="color:var(--gold);font-size:18px;">${healed}</strong> <span style="color:var(--text-muted);font-size:11px;">PG recuperados</span>
    </div>
    <button class="btn btn-sm" onclick="document.getElementById('hitDiePopup').remove()" style="font-size:11px;min-width:80px;">✓ Ok</button>`;
  document.body.appendChild(popup);
  setTimeout(() => { const p = document.getElementById('hitDiePopup'); if (p) p.remove(); }, 6000);
}

function _doSpendHitDie(gi) {
  if (!confirm('¿Gastar un dado de golpe para curarte?')) return;
  const entry = state.CHARACTER_STATE.hitDice[gi];
  if (!entry || entry.spent >= entry.count) { showToast('Sin dados de golpe disponibles'); return; }
  const dieSides = parseInt(entry.die.replace('d', '')) || 8;
  const conMod = getMod('CON');
  const roll = Math.ceil(Math.random() * dieSides);
  const healed = Math.max(1, roll + conMod);
  const cur = parseInt(document.getElementById('hpCurrent')?.textContent) || 0;
  const max = parseInt(document.getElementById('hpMax')?.textContent) || cur;
  entry.spent++;
  renderHitDice();
  window.setHP?.(Math.min(max, cur + healed));
  showHitDieResult(entry.die, roll, conMod, healed);
  const remaining = _hdTotalDice() - _hdTotalSpent();
  const detail = `1${entry.die}(${roll}) ${conMod>=0?'+':''}${conMod} CON = ${healed} PG`;
  addCombatLog(`☾ Dado de golpe: ${detail} · quedan ${remaining} dados`);
  showToast(`☾ ${detail}`);
  window.saveState?.();
}

export function spendHitDie() {
  _migrateHitDice();
  const hd = state.CHARACTER_STATE.hitDice || [];
  const avail = hd.filter(d => d.spent < d.count);
  if (!avail.length) { showToast('Sin dados de golpe disponibles'); return; }
  if (avail.length === 1) {
    _doSpendHitDie(hd.indexOf(avail[0]));
    return;
  }
  const existing = document.getElementById('_hdSelector');
  if (existing) existing.remove();
  const box = document.createElement('div');
  box.id = '_hdSelector';
  box.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,rgba(8,14,8,0.97),rgba(20,12,6,0.97));border:2px solid var(--gold);border-radius:8px;padding:20px 28px;z-index:10001;text-align:center;min-width:200px;box-shadow:0 0 30px var(--gold-glow);';
  box.innerHTML = `<div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;color:var(--text-muted);margin-bottom:14px;">¿QUÉ DADO GASTAS?</div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
      ${avail.map(d => `<button onclick="_doSpendHitDie(${hd.indexOf(d)});document.getElementById('_hdSelector')?.remove()" style="font-family:'Cinzel Decorative',serif;font-size:20px;color:var(--gold);background:rgba(201,168,76,0.1);border:1px solid var(--gold-dark);border-radius:6px;padding:8px 16px;cursor:pointer;">${d.die}<br><span style="font-size:9px;font-family:'Cinzel',serif;color:var(--text-muted);">${d.count-d.spent} disp.</span></button>`).join('')}
    </div>
    <button onclick="document.getElementById('_hdSelector')?.remove()" style="margin-top:14px;font-family:'Cinzel',serif;font-size:9px;color:var(--text-muted);background:none;border:none;cursor:pointer;text-decoration:underline;">Cancelar</button>`;
  document.body.appendChild(box);
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.renderHitDice  = renderHitDice;
window.spendHitDie    = spendHitDie;
window.updateRestNote = updateRestNote;
window._migrateHitDice = _migrateHitDice;
window._hdTotalDice   = _hdTotalDice;
window._hdTotalSpent  = _hdTotalSpent;
window._hdChangeDie   = _hdChangeDie;
window._hdAdjCount    = _hdAdjCount;
window._hdRemoveGroup = _hdRemoveGroup;
window._doSpendHitDie = _doSpendHitDie;
