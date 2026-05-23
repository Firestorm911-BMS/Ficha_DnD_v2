import { state } from '../state.js';
import { showToast } from './toast-log.js';

// ═══════════════════════════════════════════════
//  THEME — Colores, fuentes, paths y temas visuales
//  Extraído de app.js (FASE 4)
// ═══════════════════════════════════════════════

// ── Utilidades de color ────────────────────────────────────────────────────

export function setTheme(gold, goldDark, goldGlow) {
  const root = document.documentElement;
  root.style.setProperty('--gold', gold);
  root.style.setProperty('--gold-dark', goldDark);
  root.style.setProperty('--gold-glow', goldGlow);
  const goldLight = lightenColor(gold, 20);
  root.style.setProperty('--gold-light', goldLight);

  document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
  event?.target?.classList.add('active');
  window.saveToLocal?.();
}

export function lightenColor(hex, pct) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+pct*2)},${Math.min(255,g+pct*2)},${Math.min(255,b+pct*2)})`;
}

export function applyCustomColor() {
  const color = document.getElementById('customColor')?.value || '#c9a84c';
  setTheme(color, adjustHex(color, -40), hexToRgba(color, 0.35));
}

export function adjustHex(hex, amount) {
  const r = Math.max(0,Math.min(255,parseInt(hex.slice(1,3),16)+amount));
  const g = Math.max(0,Math.min(255,parseInt(hex.slice(3,5),16)+amount));
  const b = Math.max(0,Math.min(255,parseInt(hex.slice(5,7),16)+amount));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

export function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Devuelve "r, g, b" para usarlo en rgba(var(--panel-rgb), var(--panel-opacity))
export function hexToRgbComponents(hex) {
  if (!hex || hex.length < 7) return '5, 12, 5';
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r}, ${g}, ${b}`;
}

// ── PATHS ──────────────────────────────────────────────────────────────────

export const PATHS = [
  {
    name:      "Senda del Guerrero",
    gold:      "#c9a84c",
    goldDark:  "#8a5a10",
    goldGlow:  "rgba(201,168,76,0.35)",
    bgDeep:    "#0f0403",
    bgDark:    "#1c0805",
  },
  {
    name:      "Cónclave Arcano",
    gold:      "#9b78e8",
    goldDark:  "#5a32aa",
    goldGlow:  "rgba(155,120,232,0.35)",
    bgDeep:    "#04040f",
    bgDark:    "#0a081e",
  },
  {
    name:      "Sombra del Pícaro",
    gold:      "#6aac4a",
    goldDark:  "#2e5e1a",
    goldGlow:  "rgba(106,172,74,0.35)",
    bgDeep:    "#050806",
    bgDark:    "#0a110a",
  },
  {
    name:      "Luz del Clérigo",
    gold:      "#f0d060",
    goldDark:  "#a89020",
    goldGlow:  "rgba(240,208,96,0.35)",
    bgDeep:    "#0d0c07",
    bgDark:    "#1a1808",
  },
];

export function applyPath(i) {
  const p = PATHS[i];
  const root = document.documentElement;
  /* Lógica de cambio de tema visual: actualiza variables CSS del :root */
  root.style.setProperty('--gold',      p.gold);
  root.style.setProperty('--gold-dark', p.goldDark);
  root.style.setProperty('--gold-light', lightenColor(p.gold, 20));
  root.style.setProperty('--gold-glow', p.goldGlow);
  root.style.setProperty('--bg-deep',   p.bgDeep);
  root.style.setProperty('--bg-dark',   p.bgDark);
  document.body.style.background = p.bgDeep;
  // Actualizar estado visual de botones
  document.querySelectorAll('.path-btn').forEach((btn, j) => {
    btn.classList.toggle('active', j === i);
  });
  showToast('✦ Senda: ' + p.name);
}

// ── FONTS ──────────────────────────────────────────────────────────────────

export const FONTS = [
  { name: 'Cinzel',           family: "'Cinzel', serif" },
  { name: 'IM Fell English',  family: "'IM Fell English', serif" },
  { name: 'Uncial Antiqua',   family: "'Uncial Antiqua', serif" },
];

export function applyFont(i) {
  document.body.style.fontFamily = FONTS[i].family;
  document.querySelectorAll('.font-btn').forEach((btn, j) => {
    btn.classList.toggle('active', j === i);
  });
  showToast('✦ Fuente: ' + FONTS[i].name);
}

// ── CLASS THEMES ───────────────────────────────────────────────────────────

export const CLASS_THEMES = [
  {name:"Bárbaro",    bg:"#1a0505", gold:"#d32f2f", border:"#7f0000", font:"'Cinzel', serif"},
  {name:"Bardo",      bg:"#1a0d1a", gold:"#e91e8c", border:"#6a0050", font:"'IM Fell English', serif"},
  {name:"Clérigo",    bg:"#0d0d0a", gold:"#f0d060", border:"#a09020", font:"'Cinzel', serif"},
  {name:"Druida",     bg:"#050f05", gold:"#7cb342", border:"#2e5e1a", font:"'Uncial Antiqua', serif"},
  {name:"Guerrero",   bg:"#0f0a04", gold:"#c9a84c", border:"#8a6b2a", font:"'Cinzel', serif"},
  {name:"Monje",      bg:"#05080d", gold:"#00bcd4", border:"#006064", font:"'IM Fell English', serif"},
  {name:"Paladín",    bg:"#0a0a14", gold:"#90caf9", border:"#1565c0", font:"'Cinzel', serif"},
  {name:"Explorador", bg:"#040d06", gold:"#66bb6a", border:"#1b5e20", font:"'Uncial Antiqua', serif"},
  {name:"Pícaro",     bg:"#080808", gold:"#6aac4a", border:"#2e5e1a", font:"'IM Fell English', serif"},
  {name:"Hechicero",  bg:"#0d0516", gold:"#ab47bc", border:"#4a0072", font:"'Cinzel', serif"},
  {name:"Brujo",      bg:"#060214", gold:"#7c4dff", border:"#2a0090", font:"'IM Fell English', serif"},
  {name:"Mago",       bg:"#0a0b1e", gold:"#8e7dbe", border:"#4a3b6e", font:"'IM Fell English', serif"},
  {name:"EVA-01",     bg:"#0a000f", gold:"#00ff41", border:"#6a006a", font:"'Courier New', monospace"},
  {name:"Manual",     bg:null,      gold:null,       border:null,      font:null},
];

// Grupos de clase que definen el "formato visual"
const CLASS_FORMAT = {
  // Marcial: esquinas cortadas, borde sólido grueso, fuentes pesadas
  martial:  { radius: '0px',  bstyle: 'solid',  bwidth: '1px' },
  // Mágico: esquinas redondeadas, borde doble fino, fuentes elegantes
  magic:    { radius: '8px',  bstyle: 'double', bwidth: '2px' },
  // EVA-01: sin radio, borde sólido, look técnico
  eva:      { radius: '0px',  bstyle: 'solid',  bwidth: '1px' },
  // Default
  default:  { radius: '6px',  bstyle: 'solid',  bwidth: '1px' },
};
// Mapeo índice → grupo de formato
const CLASS_FORMAT_MAP = [
  'martial','magic','default','magic','martial','martial',
  'martial','martial','magic','magic','magic','magic',
  'eva','default'
];

// skipSave=true al llamar desde loadState (evita loop)
export function applyClassTheme(i, skipSave = false) {
  const t = CLASS_THEMES[i];
  const root = document.documentElement;
  const isManual = t.bg === null;

  const customSection = document.getElementById('custom-section');
  if (customSection) {
    customSection.style.opacity      = isManual ? '1' : '0.4';
    customSection.style.pointerEvents = isManual ? 'auto' : 'none';
  }

  if (!isManual) {
    const fmt = CLASS_FORMAT[CLASS_FORMAT_MAP[i] || 'default'];
    const panelRgb = hexToRgbComponents(t.bg);

    // ── 4 vars semánticas que el usuario solicitó
    root.style.setProperty('--accent',    t.gold);
    root.style.setProperty('--bg-body',   t.bg);
    root.style.setProperty('--bg-panel',  t.bg);
    root.style.setProperty('--border',    hexToRgba(t.border, 0.38));

    // ── Aliases legacy (para que el CSS existente siga funcionando)
    root.style.setProperty('--gold',          t.gold);
    root.style.setProperty('--gold-dark',     adjustHex(t.gold, -40));
    root.style.setProperty('--gold-light',    lightenColor(t.gold, 20));
    root.style.setProperty('--gold-glow',     hexToRgba(t.gold, 0.35));
    root.style.setProperty('--bg-deep',       t.bg);
    root.style.setProperty('--bg-dark',       adjustHex(t.bg, 15));
    root.style.setProperty('--bg-card',       adjustHex(t.bg, 18));
    root.style.setProperty('--bg-card2',      adjustHex(t.bg, 28));
    root.style.setProperty('--border-bright', hexToRgba(t.border, 0.65));
    root.style.setProperty('--font-main',     t.font);
    root.style.setProperty('--panel-rgb',     panelRgb);

    // ── Formato de clase
    root.style.setProperty('--card-radius', fmt.radius);
    root.style.setProperty('--card-bstyle', fmt.bstyle);
    root.style.setProperty('--card-bwidth', fmt.bwidth);

    document.body.style.background = t.bg;
    document.body.style.fontFamily = t.font;
  }

  document.querySelectorAll('.class-btn').forEach((btn, j) => {
    btn.classList.toggle('active', j === i);
  });

  if (!skipSave) {
    state.CHARACTER_STATE.classThemeIndex = i;
    window.saveToLocal?.();
    showToast('✦ Clase: ' + t.name);
  }
}

// ── Custom theme full ──────────────────────────────────────────────────────

export function applyCustomThemeFull() {
  const bg     = document.getElementById('customBg')?.value        || '#070e07';
  const gold   = document.getElementById('customGold')?.value      || '#c9a84c';
  const border = document.getElementById('customBorderClr')?.value || '#8a6b2a';
  const font   = document.getElementById('customFont')?.value      || "'IM Fell English', serif";
  const root   = document.documentElement;

  // Semánticas
  root.style.setProperty('--accent',    gold);
  root.style.setProperty('--bg-body',   bg);
  root.style.setProperty('--bg-panel',  bg);
  root.style.setProperty('--border',    hexToRgba(border, 0.38));

  // Legacy
  root.style.setProperty('--bg-deep',       bg);
  root.style.setProperty('--bg-dark',       adjustHex(bg, 15));
  root.style.setProperty('--bg-card',       adjustHex(bg, 18));
  root.style.setProperty('--bg-card2',      adjustHex(bg, 28));
  root.style.setProperty('--gold',          gold);
  root.style.setProperty('--gold-dark',     adjustHex(gold, -40));
  root.style.setProperty('--gold-light',    lightenColor(gold, 20));
  root.style.setProperty('--gold-glow',     hexToRgba(gold, 0.35));
  root.style.setProperty('--border-bright', hexToRgba(border, 0.65));
  root.style.setProperty('--font-main',     font);
  root.style.setProperty('--panel-rgb',     hexToRgbComponents(bg));

  document.body.style.background = bg;
  document.body.style.fontFamily = font;

  // Guardar en estado
  state.CHARACTER_STATE.customBg     = bg;
  state.CHARACTER_STATE.customGold   = gold;
  state.CHARACTER_STATE.customBorder = border;
  state.CHARACTER_STATE.customFont   = font;
  window.saveToLocal?.();
}

// Slider de escala de fuente — actualiza --font-scale en html
// html { font-size: calc(var(--base-size) * var(--font-scale)) }
// → todos los rem escalan automáticamente
export function applyFontScale(v) {
  const val = parseFloat(v);
  document.documentElement.style.setProperty('--font-scale', val);
  const label = document.getElementById('fontSizeLabel');
  if (label) label.textContent = Math.round(val * 100) + '%';
  state.CHARACTER_STATE.fontScale = val;
  window.saveToLocal?.();
}

// Alias para compatibilidad con oninput="applyFontSize(this.value)"
export function applyFontSize(v) { applyFontScale(v); }

// Slider de opacidad de paneles — actualiza --panel-opacity
// .card usa rgba(var(--panel-rgb), var(--panel-opacity))
export function applyPanelOpacity(v) {
  const val = parseFloat(v);
  document.documentElement.style.setProperty('--panel-opacity', val);
  const label = document.getElementById('panelOpacityLabel');
  if (label) label.textContent = Math.round(val * 100) + '%';
  state.CHARACTER_STATE.panelOpacity = val;
  window.saveToLocal?.();
}

// ═══════════════════════════════════════════════
//  THEMES (sistema de colores al estilo Lyrith)
// ═══════════════════════════════════════════════

const THEMES2 = [
  { name:"Élfico",   gold:"#c9a84c", gd:"#8a6c2a", bg:"#070e07", dots:["#c9a84c","#1a3a1a","#070e07"] },
  { name:"Dorado",   gold:"#c9a84c", gd:"#8a6c2a", bg:"#0a0806", dots:["#c9a84c","#8a6c2a","#0a0806"] },
  { name:"Arcano",   gold:"#7ec8e3", gd:"#3a7a9a", bg:"#060a14", dots:["#7ec8e3","#3a7a9a","#060a14"] },
  { name:"Druida",   gold:"#7ecb7e", gd:"#3a7a3a", bg:"#060e06", dots:["#7ecb7e","#3a7a3a","#060e06"] },
  { name:"Infernal", gold:"#e05030", gd:"#802010", bg:"#120404", dots:["#e05030","#802010","#120404"] },
  { name:"Plata",    gold:"#c0c8d8", gd:"#7888a0", bg:"#080a10", dots:["#c0c8d8","#7888a0","#080a10"] },
];

export function buildThemes() {
  const g = document.getElementById("themes-container");
  if (!g) return;
  THEMES2.forEach((t, i) => {
    const d = document.createElement("div");
    d.className = "sw" + (i === 0 ? " sel" : "");
    d.onclick = () => applyTheme2(i);
    d.innerHTML = `<div class="sw-dots">${t.dots.map(c => `<div class="sw-dot" style="background:${c}"></div>`).join("")}</div><div class="sw-name">${t.name}</div>`;
    g.appendChild(d);
  });
}

export function applyTheme2(i) {
  const t = THEMES2[i];
  setTheme(t.gold, t.gd, hexToRgba(t.gold, 0.35));
  document.documentElement.style.setProperty("--bg-deep", t.bg);
  document.body.style.background = t.bg;
  const cpg = document.getElementById("cpg2");
  if (cpg) cpg.value = t.gold;
  const cpbg = document.getElementById("cpbg2");
  if (cpbg) cpbg.value = t.bg;
  document.querySelectorAll(".sw").forEach((s, j) => s.classList.toggle("sel", j === i));
  showToast("✦ Tema: " + t.name);
  window.saveToLocal?.();
}

export function applyCustomTheme() {
  const gold = document.getElementById("cpg2")?.value || "#c9a84c";
  const bg = document.getElementById("cpbg2")?.value || "#0a0806";
  setTheme(gold, adjustHex(gold, -40), hexToRgba(gold, 0.35));
  document.documentElement.style.setProperty("--bg-deep", bg);
  document.body.style.background = bg;
  document.querySelectorAll(".sw").forEach(s => s.classList.remove("sel"));
  window.saveToLocal?.();
}

export function showSaveFlash() {
  const fl = document.getElementById("sf2");
  if (!fl) return;
  fl.textContent = "✦ Guardado";
  fl.classList.add("show");
  setTimeout(() => fl.classList.remove("show"), 2500);
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.PATHS                = PATHS;
window.FONTS                = FONTS;
window.CLASS_THEMES         = CLASS_THEMES;
window.applyClassTheme      = applyClassTheme;
window.applyCustomThemeFull = applyCustomThemeFull;
window.applyFontScale       = applyFontScale;
window.applyFontSize        = applyFontSize;
window.applyPanelOpacity    = applyPanelOpacity;
window.buildThemes          = buildThemes;
window.showSaveFlash        = showSaveFlash;
window.setTheme             = setTheme;
window.adjustHex            = adjustHex;
window.hexToRgba            = hexToRgba;
window.lightenColor         = lightenColor;
window.applyPath            = applyPath;
window.applyFont            = applyFont;
window.applyTheme2            = applyTheme2;
window.applyCustomTheme       = applyCustomTheme;
window.applyCustomColor       = applyCustomColor;
window.hexToRgbComponents     = hexToRgbComponents;

export function toggleCP() { /* cpanel eliminado en v08 — función conservada para compatibilidad */ }
window.toggleCP               = toggleCP;
