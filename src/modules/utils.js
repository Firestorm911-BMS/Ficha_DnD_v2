export function escapeAttr(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function signed(n) {
  const value = parseInt(n) || 0;
  return value >= 0 ? `+${value}` : `${value}`;
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.escapeAttr = escapeAttr;
window.signed     = signed;
