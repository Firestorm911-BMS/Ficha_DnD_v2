let journalCount = 0;

export function addJournalEntry() {
  journalCount++;
  const container = document.getElementById('journalContainer');
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const div = document.createElement('div');
  div.className = 'journal-entry';
  div.dataset.id = journalCount;
  div.innerHTML = `
    <div class="journal-header">
      <span class="journal-session">Sesión ${journalCount}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="journal-date" contenteditable="false">${dateStr}</span>
        <button class="btn btn-sm btn-danger" onclick="this.closest('.journal-entry').remove();saveToLocal()">✕</button>
      </div>
    </div>
    <div class="journal-body" contenteditable="true" spellcheck="false" oninput="saveToLocal()" placeholder="Escribe lo que ocurrió en esta sesión...">
Escribe lo que ocurrió en esta sesión...
    </div>
  `;
  container.insertBefore(div, container.firstChild);
  div.querySelector('.journal-body').focus();
  window.saveToLocal?.();
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.addJournalEntry = addJournalEntry;
