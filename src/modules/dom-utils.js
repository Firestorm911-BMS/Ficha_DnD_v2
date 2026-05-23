const BLOCKED_TAGS = new Set([
  'script','iframe','object','embed','form',
  'base','meta','link','noscript','svg','math',
]);

/**
 * Sanitiza HTML rico (notas, diario) eliminando tags y atributos peligrosos.
 * Mantiene formato visual inocuo (b, i, p, ul, etc.) pero elimina todo
 * vector de ejecución JS. Usar antes de asignar innerHTML con datos importados.
 */
export function sanitizeRichText(html) {
  if (!html || typeof html !== 'string') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  (function walk(node) {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      if (BLOCKED_TAGS.has(child.tagName.toLowerCase())) { child.remove(); return; }
      Array.from(child.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') ||
            (name === 'href' && /^\s*javascript:/i.test(attr.value)) ||
            name === 'srcdoc') {
          child.removeAttribute(attr.name);
        }
      });
      walk(child);
    });
  })(doc.body);
  return doc.body.innerHTML;
}
