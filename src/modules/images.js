import { state } from '../state.js';

export function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function safePersistImage(key, dataUrl, label) {
  try {
    state.CHARACTER_STATE[key] = dataUrl;
    window.saveState?.();
    window.showToast?.(`✦ ${label} guardado`);
  } catch (err) {
    if (err && err.name === 'QuotaExceededError') {
      delete state.CHARACTER_STATE[key];
      try { window.saveState?.(); } catch(_) {}
      window.showToast?.('⚠ Imagen muy grande — visible esta sesión, no se persistió');
    } else {
      window.showToast?.('⚠ Error al guardar');
      console.error(err);
    }
  }
}

export function loadPortrait(event) {
  const file = event.target.files[0];
  if (!file) return;
  // Retrato: máx 600px, calidad 0.78 → ~80-150KB
  compressImage(file, 600, 0.78).then(data => {
    (() => { const i = document.getElementById('portrait-img'); i.src = data; i.removeAttribute('data-empty'); })();
    safePersistImage('portrait', data, 'Retrato');
  }).catch(() => window.showToast?.('⚠ No se pudo leer la imagen'));
}

export function loadBg(event) {
  const file = event.target.files[0];
  if (!file) return;
  compressImage(file, 1600, 0.72).then(data => {
    document.getElementById('bg-layer').style.backgroundImage = `url(${data})`;
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) heroBg.style.backgroundImage = `url(${data})`;
    safePersistImage('bgImage', data, 'Fondo');
  }).catch(() => window.showToast?.('⚠ No se pudo leer la imagen'));
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.loadPortrait = loadPortrait;
window.loadBg       = loadBg;
