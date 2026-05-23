import { state } from '../state.js';
import { showToast, renderCombatLog } from './toast-log.js';
import { escapeAttr } from './utils.js';
import { getSaveKey, setSaveKey, makeSaveKey, _imgKey, _saveImages, loadFromLocal, KEY_POINTER } from './persistence.js';

const CHARACTER_STATE = state.CHARACTER_STATE;
let _pendingImport = null;

export function exportHTML() {
  const html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const baseName = CHARACTER_STATE.charName
    ? CHARACTER_STATE.charName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    : 'personaje';
  a.download = baseName + '_ficha.html';
  a.click();
  showToast('✦ HTML exportado');
}

export function exportJSON() {
  window.saveState?.();
  const blob = new Blob([JSON.stringify(CHARACTER_STATE, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const baseName = CHARACTER_STATE.charName
    ? CHARACTER_STATE.charName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    : 'personaje';
  a.download = baseName + '_ficha.json';
  a.click();
  showToast('✦ JSON exportado');
}

export function importJSON() {
  document.getElementById('jsonImport').click();
}

export function doImportJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.charName || typeof imported.charName !== 'string') throw new Error('Falta charName');
      if (!imported.scores || typeof imported.scores !== 'object')     throw new Error('Falta scores (atributos)');
      if (!imported.hp || isNaN(parseInt(imported.hp.max)))            throw new Error('Falta hp.max (valor inválido o faltante)');
      showJSONReview(imported);
    } catch(err) {
      showToast('✕ Error al importar JSON: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

export function showJSONReview(data) {
  _pendingImport = data;
  document.getElementById('jsonReviewModal')?.remove();

  const scores = data.scores || {};
  const hp     = data.hp     || {};
  const meta   = data.metaValues || [];

  const nSpells  = Array.isArray(data.spells)    ? data.spells.length    : 0;
  const nTraits  = Array.isArray(data.traits)    ? data.traits.length    : 0;
  const nItems   = Array.isArray(data.inventory) ? data.inventory.length : 0;
  const nAttacks = Array.isArray(data.attacks)   ? data.attacks.length   : 0;
  const summaryParts = [
    nSpells  ? `${nSpells} conjuro${nSpells  !== 1 ? 's' : ''}`  : '',
    nTraits  ? `${nTraits} rasgo${nTraits    !== 1 ? 's' : ''}`  : '',
    nItems   ? `${nItems} ítem${nItems       !== 1 ? 's' : ''}`  : '',
    nAttacks ? `${nAttacks} ataque${nAttacks !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);
  const summaryHTML = summaryParts.length
    ? `<div style="background:var(--bg-deep);border:1px solid var(--border);border-radius:6px;padding:9px 14px;font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:4px;">
         También se importará: ${summaryParts.join(' · ')}
       </div>`
    : '';

  const sI = 'width:100%;background:var(--bg-deep);border:1px solid var(--border);color:var(--text-primary);padding:5px 8px;border-radius:6px;font-family:Cinzel,serif;font-size:12px;box-sizing:border-box;';
  const sL = 'font-family:Cinzel,serif;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:3px;';
  const field = (id, label, val, type = 'text') =>
    `<div><label style="${sL}">${label}</label><input id="jr_${id}" type="${type}" value="${escapeAttr(String(val ?? ''))}" style="${sI}"></div>`;

  const modal = document.createElement('div');
  modal.id = 'jsonReviewModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9997;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);overflow-y:auto;padding:16px;';
  modal.innerHTML = `
    <div style="background:var(--bg-card);border:2px solid var(--gold);border-radius:12px;padding:28px;max-width:520px;width:100%;box-shadow:0 0 60px rgba(201,168,76,0.25);font-family:'IM Fell English',serif;">
      <div style="font-family:'Cinzel Decorative',serif;font-size:18px;color:var(--gold);text-align:center;margin-bottom:4px;">⚔ Revisar personaje</div>
      <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:20px;">Revisá y editá los datos antes de cargar</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        ${field('name',  'Nombre',                    data.charName)}
        ${field('class', 'Clase y nivel',             meta[0] || '')}
        ${field('race',  'Raza',                      meta[2] || '')}
        ${field('bg',    'Trasfondo / Alineamiento',  meta[3] || '')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;">
        ${field('hpMax', 'PG Máximos', parseInt(hp.max)  || 1,   'number')}
        ${field('ac',    'CA',         parseInt(data.statAC)  || 10,  'number')}
        ${field('speed', 'Velocidad',  data.statSpeed || '9m')}
      </div>

      <div style="font-family:'Cinzel',serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">Puntuaciones de característica</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:16px;">
        ${['STR','DEX','CON','INT','WIS','CHA'].map(a =>
          `<div><label style="${sL}">${a}</label><input id="jr_${a}" type="number" min="1" max="30" value="${parseInt(scores[a]) || 10}" style="${sI}"></div>`
        ).join('')}
      </div>

      ${summaryHTML}

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
        <button class="btn btn-sm" onclick="document.getElementById('jsonReviewModal').remove();">✕ Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="confirmJSONImport()">✦ Importar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

export function confirmJSONImport() {
  if (!_pendingImport) return;
  const g = id => document.getElementById('jr_' + id);

  const name  = g('name')?.value.trim()  || _pendingImport.charName;
  const cls   = g('class')?.value.trim() || '';
  const race  = g('race')?.value.trim()  || '';
  const bg    = g('bg')?.value.trim()    || '';
  const hpMax = parseInt(g('hpMax')?.value) || parseInt(_pendingImport.hp?.max) || 1;
  const ac    = parseInt(g('ac')?.value)    || 10;
  const speed = g('speed')?.value.trim()   || _pendingImport.statSpeed || '9m';

  const scores = {};
  ['STR','DEX','CON','INT','WIS','CHA'].forEach(a => {
    scores[a] = String(Math.max(1, Math.min(30, parseInt(g(a)?.value) || parseInt(_pendingImport.scores?.[a]) || 10)));
  });

  const meta = [...(_pendingImport.metaValues || ['', '', '', ''])];
  if (cls)  meta[0] = cls;
  if (race) meta[2] = race;
  if (bg)   meta[3] = bg;

  const imported = {
    ..._pendingImport,
    charName:  name,
    scores,
    statAC:    String(ac),
    statSpeed: String(speed),
    metaValues: meta,
    hp: {
      ..._pendingImport.hp,
      max:     String(hpMax),
      current: String(Math.min(parseInt(_pendingImport.hp?.current || hpMax), hpMax)),
    },
  };

  try {
    state.spells      = [];
    state.inventory   = [];
    state.attacks     = [];
    state.traits      = [];
    state.combatLog   = [];
    renderCombatLog();
    state.concentrationSpell = null;
    state.spellSlotsState = Object.fromEntries([1,2,3,4,5,6,7,8,9].map(i => [i, {max:0,used:0}]));
    state.pactSlotsState  = { level: 0, max: 0, used: 0 };

    const newKey = makeSaveKey(name);
    setSaveKey(newKey);
    localStorage.setItem(KEY_POINTER, newKey);
    _saveImages(newKey, imported);
    const slim = { ...imported, portrait: null, bgImage: null };
    localStorage.setItem(newKey, JSON.stringify(slim));
    window.loadState?.(imported);
    document.getElementById('jsonReviewModal')?.remove();
    _pendingImport = null;
    showToast('✦ JSON importado correctamente');
  } catch(err) {
    showToast('✕ Error al importar: ' + err.message);
  }
}

export async function shareViaURL() {
  window.saveState?.();
  const st = { ...CHARACTER_STATE };
  delete st.portrait;
  delete st.bgImage;
  delete st.heroBgStyle;

  const json = JSON.stringify(st);
  let encoded;
  try {
    const blob   = new Blob([json]);
    const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
    const buf    = await new Response(stream).arrayBuffer();
    const bytes  = new Uint8Array(buf);
    let binary   = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    encoded = btoa(binary);
  } catch {
    encoded = btoa(unescape(encodeURIComponent(json)));
  }

  const url = location.origin + location.pathname + '#share=' + encoded;
  try {
    await navigator.clipboard.writeText(url);
    showToast('🔗 URL copiada al portapapeles');
  } catch {
    prompt('Copia esta URL para compartir la ficha:', url);
  }
}

export async function checkShareHash() {
  const hash = location.hash;
  if (!hash.startsWith('#share=')) return;
  const encoded = hash.slice(7);
  if (!encoded) return;
  try {
    let json;
    try {
      const bytes  = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      json = await new Response(stream).text();
    } catch {
      json = decodeURIComponent(escape(atob(encoded)));
    }
    const data = JSON.parse(json);
    const name = data.charName || 'Sin nombre';
    if (confirm(`¿Importar la ficha de "${name}" recibida por URL?`)) {
      const key = makeSaveKey(name);
      localStorage.setItem(key, json);
      localStorage.setItem(KEY_POINTER, key);
      setSaveKey(key);
      loadFromLocal();
      history.replaceState(null, '', location.pathname);
      showToast('✦ Ficha importada desde URL');
    }
  } catch(e) {
    console.warn('[share] Error al leer hash:', e);
  }
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.exportHTML        = exportHTML;
window.exportJSON        = exportJSON;
window.importJSON        = importJSON;
window.doImportJSON      = doImportJSON;
window.confirmJSONImport = confirmJSONImport;
window.shareViaURL       = shareViaURL;
