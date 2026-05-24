import { showToast } from './toast-log.js';
import { getSaveKey, setSaveKey, makeSaveKey, _imgKey, _saveImages, DEFAULT_KEY, KEY_POINTER, skipNextSave } from './persistence.js';

function _rosterChars() {
  const chars = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith('dnd_ficha_') || !key.endsWith('_v1')) continue;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data?.charName) chars.push({ key, data });
    } catch {}
  }
  return chars.sort((a, b) =>
    (a.data.charName || '').localeCompare(b.data.charName || '', 'es'));
}

function _renderRosterCards(cards) {
  cards.innerHTML = '';
  const chars = _rosterChars();
  if (chars.length === 0) {
    cards.innerHTML = '<div class="roster-loading">No hay personajes guardados.<br>Creá uno nuevo o importá un JSON.</div>';
    return;
  }
  chars.forEach(({ key, data }) => {
    const isActive = key === getSaveKey();
    const card = document.createElement('div');
    card.className = 'roster-card' + (isActive ? ' roster-card-active' : '');

    const delBtn = document.createElement('button');
    delBtn.className = 'roster-card-del';
    delBtn.title = 'Eliminar personaje';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteRosterCharacter(key); });
    card.appendChild(delBtn);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'roster-card-name';
    nameDiv.textContent = data.charName || 'Personaje';
    card.appendChild(nameDiv);

    const classDiv = document.createElement('div');
    classDiv.className = 'roster-card-class';
    classDiv.textContent = data.metaValues?.[0] || '—';
    card.appendChild(classDiv);

    const raceDiv = document.createElement('div');
    raceDiv.className = 'roster-card-race';
    raceDiv.textContent = [data.metaValues?.[2], data.metaValues?.[3]].filter(Boolean).join(' · ') || '—';
    card.appendChild(raceDiv);

    if (!isActive) card.onclick = () => loadRosterCharacter(data);
    cards.appendChild(card);
  });
}

export function openRoster(allowClose) {
  const overlay  = document.getElementById('rosterOverlay');
  const cards    = document.getElementById('rosterCards');
  const closeBtn = document.getElementById('rosterCloseBtn');
  if (!overlay) return;
  if (closeBtn) closeBtn.style.display = allowClose ? 'inline-flex' : 'none';
  overlay.classList.add('open');
  _renderRosterCards(cards);
}

export function closeRoster() {
  document.getElementById('rosterOverlay')?.classList.remove('open');
}

export function loadRosterCharacter(data) {
  const newKey = makeSaveKey(data.charName);
  setSaveKey(newKey);
  localStorage.setItem(KEY_POINTER, newKey);
  _saveImages(newKey, data);
  const slim = { ...data, portrait: null, bgImage: null };
  localStorage.setItem(newKey, JSON.stringify(slim));
  window.loadState?.(data);
  closeRoster();
  showToast(`✦ ${data.charName} cargado`);
}

export function deleteRosterCharacter(key) {
  let name = key;
  try { name = JSON.parse(localStorage.getItem(key) || '{}').charName || key; } catch {}
  if (!confirm(`¿Eliminar la ficha de "${name}"?\nEsta acción no se puede deshacer.`)) return;
  localStorage.removeItem(key);
  localStorage.removeItem(_imgKey(key, 'portrait'));
  localStorage.removeItem(_imgKey(key, 'bgImage'));
  if (key === getSaveKey()) {
    localStorage.removeItem(KEY_POINTER);
    setSaveKey(DEFAULT_KEY);
  }
  const cards = document.getElementById('rosterCards');
  if (cards) _renderRosterCards(cards);
  showToast(`✦ Ficha de "${name}" eliminada`);
}

export function clearSave() {
  const key = getSaveKey();
  localStorage.removeItem(key);
  localStorage.removeItem(_imgKey(key, 'portrait'));
  localStorage.removeItem(_imgKey(key, 'bgImage'));
  localStorage.removeItem(DEFAULT_KEY);
  localStorage.removeItem(KEY_POINTER);
  setSaveKey(DEFAULT_KEY);
  skipNextSave();
  showToast('Datos borrados');
  location.reload();
}

export function newSheet() {
  if (!confirm('¿Crear una ficha en blanco?\nSe perderán todos los datos actuales.')) return;
  const key = getSaveKey();
  localStorage.removeItem(key);
  localStorage.removeItem(_imgKey(key, 'portrait'));
  localStorage.removeItem(_imgKey(key, 'bgImage'));
  localStorage.removeItem(DEFAULT_KEY);
  localStorage.removeItem(KEY_POINTER);
  setSaveKey(DEFAULT_KEY);
  skipNextSave();
  sessionStorage.setItem('openWizardOnLoad', '1');
  location.reload();
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.openRoster            = openRoster;
window.closeRoster           = closeRoster;
window.loadRosterCharacter   = loadRosterCharacter;
window.deleteRosterCharacter = deleteRosterCharacter;
window.clearSave             = clearSave;
window.newSheet              = newSheet;
