# Auditoría Técnica — Ficha D&D 5e

**Fecha de última actualización**: 2026-05-23 (sesión 2)
**Rama activa**: `main`
**Arquitectura actual**: `app.js` (826 líneas) + 22 módulos ES bajo `src/modules/` + `src/state.js` + `src/wizard.js` (ES module)

---

## Leyenda de estados

| Estado | Significado |
|--------|-------------|
| `[ ]` | Pendiente |
| `[~]` | En progreso (indica en qué sesión/commit) |
| `[x]` | Resuelto (indica commit hash) |

---

## BUG-01 — CRÍTICO · `shortRest()` restaura slots de conjuro a clases que no deben

**Archivo**: `src/app.js`
**Línea**: 2807–2811
**Estado**: `[x]` — commit siguiente · 2026-05-19

### Descripción
La función `shortRest()` restaura **todos** los slots de conjuro cuando `classResource.recovery === 'short'`. Esta condición también se cumple para Guerrero, Monje, Druida y Clérigo, que tienen recursos de clase con `recovery: 'short'` pero **no** deben recuperar slots en descanso corto.

**Clases afectadas incorrectamente**:
- `Guerrero` → Segundo Aliento (`recovery: 'short'`) → restaura slots de multiclase incorrectamente
- `Monje` → Ki (`recovery: 'short'`) → ídem
- `Druida` → Forma Salvaje (`recovery: 'short'`) → **crítico**: el Druida es lanzador completo con muchos slots
- `Clérigo` → Canal Divinidad (`recovery: 'short'`) → **crítico**: ídem

Solo el **Brujo** (`recovery: 'short'`) debe recuperar sus espacios de conjuro en descanso corto.

### Código actual
```js
// app.js:2807
if ((CHARACTER_STATE.classResource?.recovery || '') === 'short') {
  CHARACTER_STATE.rageUsesSpent = 0;
  // Brujo: los slots de pacto se recuperan en descanso corto
  [1,2,3,4,5,6,7,8,9].forEach(i => { if (spellSlotsState[i]) spellSlotsState[i].used = 0; });
  renderSpellSlots();
}
```

### Fix propuesto
```js
// Restaurar usos del recurso de clase si se recupera en desc. corto
if ((CHARACTER_STATE.classResource?.recovery || '') === 'short') {
  CHARACTER_STATE.rageUsesSpent = 0;
}
// Slots de conjuro: SOLO Brujo los recupera en desc. corto
const className = (document.querySelector('.hero-pill[data-field="class"] .meta-value')
  ?.textContent?.trim()?.split(' ')[0]) || '';
if (className === 'Brujo') {
  [1,2,3,4,5,6,7,8,9].forEach(i => { if (spellSlotsState[i]) spellSlotsState[i].used = 0; });
  renderSpellSlots();
}
```

### Cómo verificar el fix
1. Crear personaje Druida nivel 5 con slots de conjuro.
2. Gastar 2 slots de nivel 1.
3. Hacer descanso corto.
4. **Antes del fix**: slots restaurados (bug). **Después**: slots sin restaurar.
5. Hacer lo mismo con Brujo → slots SÍ deben restaurarse.

---

## BUG-02 — CRÍTICO · `normalizeAttack()` pierde bonus de ataque si viene como string

**Archivo**: `src/app.js`
**Línea**: 1265, 1275
**Estado**: `[x]` — commit siguiente · 2026-05-19

### Descripción
Si `atk.attackBonus` es un string numérico (`"3"` en lugar de `3`), la función devuelve `null` silenciosamente. Esto afecta importaciones desde JSON de versiones anteriores u otros sistemas donde el bonus se guardó como string.

### Código actual
```js
// app.js:1265
const parsedBonus = atk.attackBonus ?? parseInt(String(atk.bonus ?? '').replace(/[^\-0-9]/g, ''));
// ...
attackBonus: Number.isFinite(parsedBonus) ? parsedBonus : null,
```
`Number.isFinite("3")` → `false` → `attackBonus = null` → el ataque usa `getMod + prof` silenciosamente.

### Fix propuesto
```js
// Convertir a número antes de validar
const rawBonus = atk.attackBonus ?? atk.bonus ?? null;
const parsedBonus = rawBonus !== null && rawBonus !== undefined
  ? Number(String(rawBonus).replace(/[^\-0-9]/g, '') || 'NaN')
  : NaN;
// ...
attackBonus: Number.isFinite(parsedBonus) ? parsedBonus : null,
```

### Cómo verificar el fix
1. Crear personaje con un ataque manual con bonus `+3`.
2. Exportar JSON.
3. Editar el JSON manualmente y cambiar `"attackBonus": 3` por `"attackBonus": "3"`.
4. Reimportar. **Antes del fix**: bonus desaparece. **Después**: bonus `+3` preservado.

---

## BUG-03 — ALTO · Inspiración Bárdica no cambia a descanso corto en nivel 5

**Archivo**: `src/app.js`
**Línea**: 127
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
PHB 5e: a partir del nivel 5, el Bardo recupera la Inspiración Bárdica en **descanso corto**. El código siempre usa `recovery: 'long'`. La propia descripción del efecto (línea 127) menciona "corto a nivel 5" pero no hay lógica que lo aplique.

### Código actual
```js
'Bardo': { hitDie: 'd8', resource: {
  name:'Insp. Bárdica', icon:'🎵', maxUses:1, recovery:'long', ...
  effects:['...Se recupera en desc. largo (corto a nivel 5)']
}}
```

### Fix propuesto
En `shortRest()`, después de restaurar recursos de descanso corto, agregar:
```js
// Bardo nv.5+: Inspiración Bárdica se recupera en desc. corto
const bardLevel = _getBardLevel(); // extraer nivel de Bardo del texto de clase
if (bardLevel >= 5 && CHARACTER_STATE.classResource?.name === 'Insp. Bárdica') {
  CHARACTER_STATE.rageUsesSpent = 0;
  renderRage();
}
```
Helper `_getBardLevel()`:
```js
function _getBardLevel() {
  const classText = document.querySelector('.hero-pill[data-field="class"] .meta-value')?.textContent?.trim() || '';
  const parts = classText.split('/');
  for (const p of parts) {
    const m = p.trim().match(/^Bardo\s+(\d+)$/);
    if (m) return parseInt(m[1]);
  }
  return 0;
}
```

### Cómo verificar el fix
1. Crear Bardo nivel 5, gastar toda la Inspiración Bárdica.
2. Descanso corto → **debe restaurar** los usos.
3. Crear Bardo nivel 4, gastar Inspiración.
4. Descanso corto → **no debe restaurar**.

---

## BUG-04 — ALTO · `addXP()` rompe la UI en personajes multiclase al subir de nivel

**Archivo**: `src/app.js`
**Línea**: 1214–1218
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
Al subir de nivel automáticamente por XP, el código intenta actualizar el texto de clase con:
```js
const m = meta0.textContent.trim().match(/^(.+?)\s+(\d+)$/);
if (m) meta0.textContent = `${m[1]} ${levelAfter}`;
```
Para "Guerrero 5/Mago 3", el regex no hace match (contiene `/`) → la pill de clase no se actualiza. Además, el cálculo de slots de conjuro se hace con el texto viejo del DOM, quedando desincronizado.

### Fix propuesto
Solo actualizar si es clase única (sin `/`):
```js
const meta0 = document.querySelector('.meta-value');
if (meta0) {
  const currentText = meta0.textContent.trim();
  if (!currentText.includes('/')) {  // solo actualizar si no es multiclase
    const m = currentText.match(/^(.+?)\s+(\d+)$/);
    if (m) meta0.textContent = `${m[1]} ${levelAfter}`;
  } else {
    // Multiclase: mostrar aviso, el usuario debe ajustar manualmente
    addCombatLog(`⚠ Multiclase: ajusta el nivel de tu clase manualmente en la pill de clase`);
  }
}
```

### Cómo verificar el fix
1. Crear personaje multiclase "Guerrero 3/Mago 2" con XP justo debajo del umbral de nivel 6.
2. Agregar XP suficiente para subir de nivel.
3. **Antes**: crash o texto erróneo. **Después**: aviso en log de combate, pill sin corromper.

---

## BUG-05 — ALTO · `shareViaURL()` puede causar stack overflow con fichas grandes

**Archivo**: `src/app.js`
**Línea**: 5001
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
```js
encoded = btoa(String.fromCharCode(...new Uint8Array(buf)));
```
El spread de arrays grandes supera el límite del call stack (`Maximum call stack size exceeded`) en Chrome cuando el buffer comprimido supera ~100KB. El fallback (sin compresión) produce URLs > 65535 chars que los navegadores truncan.

### Fix propuesto
Reemplazar el spread por un loop:
```js
const bytes = new Uint8Array(buf);
let binary = '';
const chunkSize = 8192;
for (let i = 0; i < bytes.length; i += chunkSize) {
  binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
}
encoded = btoa(binary);
```

### Cómo verificar el fix
1. Crear personaje con inventario largo, 30+ conjuros, 10+ rasgos, diario extenso.
2. Hacer click en "Compartir por URL".
3. **Antes**: posible error en consola. **Después**: URL generada correctamente.

---

## BUG-06 — ALTO · `importJSON()` no limpia estado anterior antes de cargar

**Archivo**: `src/app.js`
**Línea**: 3810
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
`loadState(imported)` hace `Object.assign(CHARACTER_STATE, data)` pero no resetea arrays globales (`spells`, `inventory`, `attacks`, `traits`, `_combatLog`) antes de cargar. Si el JSON importado no incluye alguno de estos campos, quedan los datos del personaje anterior.

### Fix propuesto
Al inicio de `doImportJSON`, antes de `loadState`, resetear el estado:
```js
// Limpiar estado en memoria antes de cargar el nuevo personaje
spells = [];
inventory = [];
attacks = [];
traits = [];
_combatLog = [];
spellSlotsState = Object.fromEntries([1,2,3,4,5,6,7,8,9].map(i => [i,{max:0,used:0}]));
concentrationSpell = null;
```

### Cómo verificar el fix
1. Cargar personaje A con 5 conjuros y log de combate extenso.
2. Importar JSON de personaje B que no tiene conjuros.
3. **Antes**: los conjuros de A siguen visibles. **Después**: pestaña de conjuros vacía.

---

## BUG-07 — ALTO · Wizard: epiteto y deidad del personaje no se persisten

**Archivo**: `src/wizard.js`
**Línea**: 1166–1167
**Estado**: `[x]` — commit siguiente · 2026-05-19

### Descripción
El epiteto y deidad se asignan al DOM pero no a `CHARACTER_STATE`. El primer `saveState()` automático los pierde.

### Código actual
```js
if (d.epithet) set('heroEpithet', d.epithet);
if (d.deity)   set('charDeity', 'Fe: ' + d.deity);
```

### Fix propuesto
Agregar antes de llamar a `saveState()` en `_complete()`:
```js
if (d.epithet) CHARACTER_STATE.heroEpithet = d.epithet;
if (d.deity)   CHARACTER_STATE.charDeity   = 'Fe: ' + d.deity;
```

### Cómo verificar el fix
1. Crear personaje con epiteto "El Sombrío" y deidad "Selûne".
2. Recargar la página.
3. **Antes**: epiteto y deidad vacíos. **Después**: valores preservados.

---

## BUG-08 — ~~Falso positivo~~ · Wizard: objeto de monedas de oro con clave `qty` duplicada

**Archivo**: `src/wizard.js`
**Estado**: `[x]` — nunca existió · verificado en commit `2378cf4`

Error de lectura durante la auditoría — la línea era larga y se leyó `qty` dos veces. El código siempre tuvo una sola `qty`. No requería acción.

### Descripción
```js
inventory.push({ icon:'💰', name:`${goldM[1]} monedas...`, qty:parseInt(goldM[1]), qty:parseInt(goldM[1]), ... });
```
Clave `qty` duplicada. JS descarta la primera silenciosamente, pero es un bug de copy-paste que puede romper linters y futuras refactorizaciones.

### Fix propuesto
Eliminar la segunda `qty:`:
```js
inventory.push({ icon:'💰', name:`${goldM[1]} monedas de oro (po)`, qty:parseInt(goldM[1]), type:'treasure', equipped:false, acBonus:0, acBase:null });
```

---

## BUG-09 — MEDIO · `initBonus` se desincroniza al cambiar DEX en sesión

**Archivo**: `src/app.js`
**Línea**: 3481–3483, 768
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
`initBonus` se calcula solo al cargar del localStorage. En sesión, si el usuario cambia DEX varias veces, `calcMod('DEX')` usa el `initBonus` almacenado que no se recalcula, acumulando error.

### Fix propuesto
En `calcMod()` (línea ~760), cuando se actualiza DEX, recalcular `initBonus` desde `statInit` actual:
```js
// Al cambiar DEX, sincronizar initBonus
if (attr === 'DEX') {
  const statInitEl = document.getElementById('statInit');
  const displayedInit = parseInt(statInitEl?.textContent) || 0;
  const newDexMod = Math.floor((parseInt(score) - 10) / 2);
  // initBonus = iniciativa total - mod DEX actual
  // Pero solo si statInit fue seteado manualmente por el usuario (no por calcMod)
  CHARACTER_STATE.initBonus = displayedInit - newDexMod;
}
```
Nota: requiere revisar el flujo completo de `calcMod`/`statInit` para no crear otro loop.

---

## BUG-10 — MEDIO · Brujo en multiclase fusiona slots con el pool general (no es RAW)

**Archivo**: `src/app.js`
**Línea**: 218–224
**Estado**: `[RESUELTO 2026-05-21]`

### Descripción
PHB 5e: los Espacios de Pacto del Brujo permanecen **separados** y no se fusionan con el pool de slots del multiclase. El código actual los suma:
```js
result[lv] = { max: (result[lv]?.max || 0) + wtbl[i], used: result[lv]?.used || 0 };
```

### Fix (commit c2bc524 + fix adicional 2026-05-21)
- `pactSlotsState` separado de `spellSlotsState`; renderizado propio en `renderSpellSlots()`
- `shortRest()` y `longRest()` resetean `pactSlotsState.used`
- **Bug adicional encontrado en testing**: `restoreAllSlots()` (botón "↺ Descanso largo" en pestaña Magia) no reseteaba `pactSlotsState.used`. Corregido: se agregó `pactSlotsState.used = 0` antes de `renderSpellSlots()`.
- Simplificada condición en `shortRest()`: de `_classText.includes(WARLOCK_CLASS) && pactSlotsState.level > 0` a solo `pactSlotsState.level > 0` (más robusto).

---

## BUG-11 — MEDIO · Asistente de subida de nivel no indica cuándo corresponde una ASI

**Archivo**: `src/app.js`
**Línea**: `openLevelUpAssistant()` (~4804)
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
Los niveles 4, 8, 12, 16, 19 (para la mayoría de clases) corresponden a una Mejora de Puntuación de Habilidad (ASI) o Dote. El asistente no lo menciona.

### Fix propuesto
En `openLevelUpAssistant(newLevel)`, agregar detección de ASI:
```js
const ASI_LEVELS = {
  default: [4, 8, 12, 16, 19],
  'Guerrero': [4, 6, 8, 12, 14, 16, 19],
  'Pícaro':   [4, 8, 10, 12, 16, 19],
};
const classNameASI = (document.querySelector('.meta-value')?.textContent || '').split(' ')[0];
const asiLevels = ASI_LEVELS[classNameASI] || ASI_LEVELS.default;
const isASI = asiLevels.includes(newLevel);
// Agregar al modal:
// isASI ? '<div>📈 Nivel de ASI — mejorá un atributo en +2 o dos en +1, o elegí una Dote</div>' : ''
```

---

## BUG-12 — BAJO · `CLASS_DATA` y `CLASS_TEMPLATES` son estructuras paralelas desincronizadas

**Archivo**: `src/app.js`
**Línea**: 119 (`CLASS_TEMPLATES`), 246 (`CLASS_DATA`)
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
Ambas estructuras tienen datos de las 12 clases: `CLASS_TEMPLATES` tiene `hitDie` y `resource`; `CLASS_DATA` tiene `die` (mismo dato, otra clave) y `attr`. Si se agrega una clase nueva, hay que actualizarla en dos lugares.

### Fix propuesto
Migrar los campos de `CLASS_DATA` a `CLASS_TEMPLATES` y eliminar `CLASS_DATA`. Requiere buscar todos los usos de `CLASS_DATA` y reemplazarlos. No urgente pero es deuda técnica que crece.

---

## BUG-13 — ~~CHARACTER_ROSTER hardcodeado~~ ✓ RESUELTO

**Archivo**: `src/app.js`
**Estado**: `[x]` — commit siguiente · 2026-05-19

Roster completamente reescrito para leer desde `localStorage` en lugar de rutas hardcodeadas.
- Eliminado `CHARACTER_ROSTER` con las 3 fichas de proyecto.
- `openRoster()` ahora llama a `_renderRosterCards()` que escanea `localStorage` buscando claves `dnd_ficha_*_v1`.
- Cards muestran nombre, clase y raza del personaje guardado.
- Card del personaje activo se marca con borde dorado y no es clickeable.
- Botón ✕ por card para eliminar la ficha del localStorage (con confirmación).
- Botón "Importar JSON" en las acciones del roster — cierra el panel y abre el selector de archivo existente.
- Sin límite de personajes — muestra todos los guardados en el browser.

---

## OMISIÓN-01 — ~~Parser de PDF eliminado~~ ✓ RESUELTO

**Archivo**: `src/app.js`
**Estado**: `[x]` — commit `a4b...` · 2026-05-19

Funcionalidad de importar PDF eliminada completamente del código.
Funciones removidas: `importPDF`, `doImportPDF`, `parseDnDPDFText`, `showPDFReview`, `confirmPDFImport`.
No había botón en el HTML — el código existía pero nunca estuvo conectado a la UI.
El botón de imprimir/exportar PDF (`printSheet()`) **no fue tocado**, es independiente.

---

## BUG-14 — MEDIO · `concentrationSpell` no se limpia al crear nuevo personaje en el wizard

**Archivo**: `src/wizard.js`
**Línea**: 1348, `src/app.js:3452`
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
El wizard resetea `traits.length = 0` (línea 1348) pero no limpia `concentrationSpell`. Cuando se llama `saveState()` al final del wizard, la línea 3452 de app.js serializa `CHARACTER_STATE.concentrationSpell = concentrationSpell`, copiando la concentración activa del personaje anterior al nuevo.

### Impacto
El personaje recién creado hereda el conjuro en concentración del anterior. Si el usuario recarga la página sin descanso largo, el banner de concentración aparece con un conjuro que el nuevo personaje no tiene.

### Fix propuesto
En `wizard.js`, antes del bloque que llama `saveState()` (cerca de línea 1433):
```js
if (typeof concentrationSpell !== 'undefined') { concentrationSpell = null; }
if (typeof renderConcentration === 'function') renderConcentration();
```

### Cómo verificar
1. Personaje A: poner un conjuro en concentración.
2. Crear personaje B via wizard sin recargar la página.
3. **Antes**: banner de concentración aparece en B. **Después**: banner vacío.

---

## BUG-15 — MEDIO · `concentrationSpell` usa objeto en lugar de `.name` en un log de combate

**Archivo**: `src/app.js`
**Línea**: 1785
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
```js
addCombatLog(`⚡ Concentración en "${concentrationSpell}" rota por ${rName}`);
```
`concentrationSpell` es un objeto `{id, name}`, no un string. El log muestra `[object Object]`.

### Fix propuesto
```js
addCombatLog(`⚡ Concentración en "${concentrationSpell?.name}" rota por ${rName}`);
```

---

## BUG-16 — BAJO · `visibilitychange` no manejado — datos pueden perderse en mobile/PWA

**Archivo**: `src/app.js`
**Línea**: ~4347 (cerca de `beforeunload`)
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
`beforeunload` no siempre se dispara en móvil cuando el usuario cambia de app o el sistema suspende el proceso. Si el auto-save (500ms debounce) aún no corrió, los últimos cambios se pierden.

### Fix propuesto
Junto al listener de `beforeunload` existente:
```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveState();
});
```

### Cómo verificar
1. Editar HP u otro campo en mobile.
2. Cambiar de app inmediatamente (antes de 500ms).
3. **Antes**: puede perderse. **Después**: siempre guardado.

---

## BUG-17 — BAJO · `newSpellSlots()` duplicado en 4 lugares — deuda técnica menor

**Archivo**: `src/app.js`
**Líneas**: 276, `confirmJSONImport`, `longRest`, `addMulticlass`
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
La inicialización `Object.fromEntries([1,2,3,4,5,6,7,8,9].map(i => [i, {max:0,used:0}]))` aparece 4 veces literalmente. Si se cambia la estructura, hay que actualizarla en 4 lugares.

### Fix propuesto
Extraer helper en la declaración de la constante:
```js
function _emptySlots() { return Object.fromEntries([1,2,3,4,5,6,7,8,9].map(i=>[i,{max:0,used:0}])); }
let spellSlotsState = _emptySlots();
```
Reemplazar las 3 otras ocurrencias con `_emptySlots()`.

---

## BUG-18 — ALTO · Dados de golpe recuperados en descanso largo usan `Math.floor` en vez de `Math.ceil`

**Archivo**: `src/app.js`
**Línea**: 2688 (tooltip) y 2884 (lógica real)
**Estado**: `[RESUELTO 2026-05-19]`

### Descripción
PHB 5e p.186 dice explícitamente: *"regain spent Hit Dice, up to a number of dice equal to half of the character's total number of Hit Dice (**round up**, minimum of one die)"*.

El código usaba `Math.floor`:
```js
let toRestore = Math.max(1, Math.floor(totalDice / 2));
```
Un personaje con 5 dados de golpe recuperaba 2 en vez de 3 en descanso largo.

### Fix
`Math.floor` → `Math.ceil` en líneas 2688 y 2884.

---

## BUG-19 / CODEX-10 — BAJO · `innerHTML` en campos de texto plano — riesgo XSS al importar JSON externo

**Archivo**: `src/app.js`
**Línea**: ~3758 (loadState)
**Estado**: `[x]` — 2026-05-21

### Descripción
Los campos de texto libre (`heroEpithet`, `charDeity`, `charPlayerName`, `personalityTraits`, etc.) se restauraban con `el.innerHTML = val`. Si alguien importaba un JSON crafteado de fuente externa, el HTML se ejecutaba en el navegador.

### Fix aplicado
- Campos de texto plano (`heroEpithet`, `charDeity`, `charPlayerName`, `langComp`, `personalityTraits/Ideals/Bonds/Flaws`) usan `el.textContent = val`.
- Campos de notas con posible formato (`combatNotesCE`, `charHistoryCE`, `generalNotes`) mantienen `innerHTML`.
- El diario (`journalHTML`) mantiene `innerHTML` por diseño (editor rich text).

### Cómo verificar
1. Crear un JSON con `"heroEpithet": "<img src=x onerror='alert(1)'>"`.
2. Importarlo → muestra el texto literal sin ejecutar el alert.

---

## BUG-20 — ALTO · Campos de notas ricas no pasan por `sanitizeRichText` al cargar JSON

**Archivo**: `src/modules/persistence.js`
**Línea**: 349–354
**Estado**: `[x]` — 2026-05-23

### Descripción
Los campos `combatNotesCE`, `charHistoryCE` y `generalNotes` se restauran con `el.innerHTML = val` sin sanitizar. Un JSON importado de fuente externa con `"combatNotesCE": "<img src=x onerror='alert(1)'>"` ejecuta el payload al cargar el personaje.

`sanitizeRichText` ya estaba importado en `persistence.js` desde la FASE 9.1 y se usaba para `journalHTML` y `traitsHTML` — faltaba aplicarlo a estos tres campos.

### Fix
```js
// Antes:
if (el) el.innerHTML = val;
// Después:
if (el) el.innerHTML = sanitizeRichText(val);
```

### Cómo verificar
1. Crear JSON con `"combatNotesCE": "<img src=x onerror='alert(1)'>"`.
2. Importar → el campo muestra texto literal / imagen rota, sin ejecutar alert.

---

## BUG-21 — ALTO · Campos de conjuro sin escapar en `buildSpellCard()` — XSS en import

**Archivo**: `src/modules/spells.js`
**Línea**: 461
**Estado**: `[x]` — 2026-05-23

### Descripción
En `buildSpellCard()`, los campos `spell.school`, `spell.castTime`, `spell.range`, `spell.components` y `spell.duration` se interpolan directamente en `innerHTML` sin pasar por `escapeAttr()`. Un JSON importado con `"school": "<img src=x onerror='alert(1)'>"` ejecuta el payload al renderizar el libro de conjuros.

`spell.name` y `spell.desc` ya usaban `escapeAttr()` — faltaba aplicarlo a la fila de metadatos.

### Fix
```js
// Antes:
<div class="spell-card-meta">${[spell.castTime, spell.range, spell.components, spell.duration].filter(Boolean).join(' · ')}</div>
// Después:
<div class="spell-card-meta">${[spell.castTime, spell.range, spell.components, spell.duration].filter(Boolean).map(escapeAttr).join(' · ')}</div>
```
Y en el badge de `spell.school`:
```js
// Antes:
<span class="spell-card-school">${spell.school||''}</span>
// Después:
<span class="spell-card-school">${escapeAttr(spell.school||'')}</span>
```

### Cómo verificar
1. Añadir conjuro con `school: "<img src=x onerror='alert(1)'>"` vía JSON import.
2. Abrir pestaña de Magia → sin alert, texto literal visible.

---

## DEUDA-01 — `persistence.js` excede límite de 600 líneas

**Archivos**: `src/modules/persistence.js`, `src/modules/roster.js` (nuevo), `src/modules/share.js` (nuevo)
**Tamaño original**: 754 líneas / 29 KB → **Estado**: `[x]` — 2026-05-23

### Descripción
El módulo mezcla tres responsabilidades distintas: persistencia local (save/load/migrate), roster (abrir/cerrar/cargar/borrar personajes) y compartir (exportJSON, importJSON, shareViaURL, checkShareHash). Es el módulo más grande y más tocado.

### Split propuesto
- `persistence.js` → solo `saveState`, `saveToLocal`, `loadState`, `loadFromLocal`, `autoSave`, `migrateState`, hooks (`registerBeforeSave`, `registerAfterLoad`). ~300 líneas.
- `roster.js` → `openRoster`, `closeRoster`, `loadRosterCharacter`, `deleteRosterCharacter`, `_rosterChars`, `_renderRosterCards`, `newSheet`, `clearSave`. ~200 líneas.
- `share.js` → `exportJSON`, `importJSON`, `doImportJSON`, `showJSONReview`, `confirmJSONImport`, `exportHTML`, `shareViaURL`, `checkShareHash`. ~280 líneas.

### Impacto
Bajo. El cambio es de organización; la lógica no cambia. Los imports de `app.js` se actualizan. Los hooks de `extra_resources.js`, `inventory_extras.js` y `character_context.js` apuntan a `persistence.js` — seguirían apuntando al mismo módulo.

---

## DEUDA-02 — `spells.js` concentra renderización + modal + lógica de conjuros (~586 líneas)

**Archivos**: `src/modules/spells.js`, `src/modules/spell-modal.js` (nuevo)
**Tamaño original**: 587 líneas → **Estado**: `[x]` — 2026-05-23

### Split aplicado
- `spells.js` → lógica de estado + render (587→522 líneas): `SPELL_PRESETS`, `loadSpellPreset`, `renderSpellBook`, `buildSpellCard`, `toggleSpellFilter`, `rollSpellAttack`, `setConcentration`, `breakConcentration`, `renderConcentration`, `toggleSpellPrepared`, `deleteSpell`.
- `spell-modal.js` (71 líneas, nuevo): `openSpellModal`, `saveSpellModal`, `closeSpellModal`, `addSpell`, `addCantrip`. Sin dep. circular: `saveSpellModal` llama `window.renderSpellBook?.()`.
- `app.js`: import side-effect `import './modules/spell-modal.js'` añadido.

---

## FEAT-01 — Condiciones → desventaja automática en tiradas de dado

**Archivos**: `src/modules/conditions.js`, `src/modules/dice.js`
**Estado**: `[x]` — 2026-05-23

### Descripción
PHB 5e: las condiciones `Asustado`, `Envenenado`, `Restringido` y otras imponen desventaja en categorías específicas de tiradas.

### Implementación aplicada
- `conditions.js`: nueva función `getActiveConditions()` exportada — lee `.condition-tag.active` del DOM y devuelve array de nombres.
- `dice.js` IIFE: `CONDITION_DISADVANTAGE` map (5 condiciones PHB), `_rollType(label)` (ataque/salvacion/habilidad por patrón de label), `_getActiveCondNames()` (DOM query), `_warnConditions(label, mode)` (evalúa condiciones + agotamiento). `LL_cinematicRoll` llama `_warnConditions(label, mode)` antes de tirar.
- Comportamiento: si el modo es `'normal'` y hay condiciones relevantes → toast "⚠ Envenenado · → desventaja sugerida" + botón "Desv." del advChip pulsea 3 s en rojo. Sin forzar — el usuario elige.
- Agotamiento: Nv.1+ → desventaja sugerida en habilidad. Nv.3+ → en ataque y salvación.

---

## FEAT-02 — Sync multi-dispositivo

**Archivos**: `src/modules/persistence.js`
**Estado**: `[ ]` — pendiente · bajo prioridad

### Tier 1 — QR desde URL comprimida
Exponer `shareViaURL()` como QR generado en cliente (ej. librería `qrcodejs` ~10KB, sin servidor).

### Tier 2 — GitHub Gist como backend
Añadir `syncToGist(token)` / `loadFromGist(id)` en `persistence.js`. Token en `localStorage`, nunca en código.

---

## FEAT-03 — Companion sheet (familiar, montura, mascota)

**Estado**: `[ ]` — pendiente · baja prioridad

Nuevo módulo `companion.js` con `companionState` en `state.js`. UI colapsable. Reutiliza estructura de `attacks` y `hp` existentes.

---

## FEAT-04 — Multiclase con 3+ clases

**Estado**: `[ ]` — pendiente · baja prioridad

La hero-pill actualmente tiene dos selectores fijos. Requiere refactor de UI a lista dinámica y ajuste del parser de texto de clase en `level-up.js` y `xp.js`.

---

## FEAT-06 — Modal de configuración de armas (Weapon Wizard)

**Archivos**: `src/modules/attacks.js`, `src/modules/dice.js`, `src/app.js`, `index.html`, `src/styles.css`
**Estado**: `[x]` — commits d1a7e88 (inicial) + fbd1c04 (mejoras)

### Descripción
El botón "+ Añadir" en la tarjeta de Ataques ahora abre un modal de creación/edición de armas con:
- **Arma base**: selector agrupado (Simple CaC/Dist. · Marcial CaC/Dist.) con 35 armas PHB 5e. Al seleccionar, auto-rellena nombre, dado de daño, tipo, atributo y propiedades.
- **Bono mágico**: +0/+1/+2/+3. Se suma al bono de ataque y al daño.
- **Daño extra**: filas dinámicas de `{dado, tipo}` para encantamientos (fuego, rayo, necrótico…). Botón "+" agrega filas; cada una tiene ✕ para eliminar.
- **Preview en vivo**: muestra bono de ataque y fórmula de daño completa mientras el usuario edita.
- **Botón ✎ Editar** por fila en los ataques existentes (abre el modal pre-cargado con los valores del ataque).

### Nuevos campos en el schema de ataque
- `magicBonus: 0` — número, se suma a `getAttackBonus()` y al bono de daño en `rollAttackDamage`
- `extraDamage: []` — array de `{dice, type}`. Se tiran en `rollAttackDamage` y se muestran en la ficha.
- `weight: 0` — peso en libras; se refleja en inventario si se activa el checkbox de sincronización.

### Mejoras posteriores (commit fbd1c04 · 2026-05-24)
- **Dado como select**: `amDamage` reemplazado por `<select>` con opciones 1, 1d4…2d12. `_setDamageSelect()` normaliza valores viejos con bonus embebido (`"1d6+3"` → `"1d6"`).
- **Sin atributo**: opción `NONE` en `amAbility`; `getAttackBonus` y preview usan modificador 0 (útil para mano secundaria u ataques sin stat).
- **Peso + sync inventario**: campo `amWeight` y checkbox `amSyncInventory`; al crear un arma con sync activo se inserta automáticamente en `state.inventory` con icono ⚔, tipo `weapon` y el peso indicado.
- **Fix personalidad**: Enter en campos `.personality-text` (contenteditable) insertaba `<div>`; ahora inserta `<br>` via `document.execCommand('insertLineBreak')` interceptado con `keydown` delegado en `app.js`.

### Funciones nuevas en attacks.js
`openAttackModal(i?)`, `closeAttackModal()`, `onAttackPresetChange()`, `saveAttackFromModal()`, `addAttackExtraDamageRow()`, `updateAttackPreview()`, más helpers internos.

### Cambios en dice.js
`rollAttackDamage`: incluye `magicBonus` en el bonus total; itera `extraDamage` y tira cada grupo.
`showDamagePrompt`: muestra los dados extra en el label del botón "Tirar".

---

## FEAT-05 — Iniciar multiclase desde asistente de nivel

**Archivos**: `src/modules/level-up.js`
**Estado**: `[x]` — 2026-05-23

### Descripción
Al subir de nivel con personaje de clase única, el asistente ahora muestra un toggle:
- **▲ Subir [Clase]**: flujo estándar (HP, slots, ASI/Dote) — sin cambios
- **✦ Nueva clase**: muestra grid de 11 clases disponibles (excluye la actual); al seleccionar, habilita sección de HP con el dado de la nueva clase

Al confirmar nueva clase:
- Actualiza pill de `"Explorador 2"` → `"Explorador 2/NuevaClase 1"`
- Agrega o incrementa entrada en `hitDice` según el dado de la nueva clase
- Recalcula ranuras de conjuro con el nuevo texto de clase combinado
- El recurso de clase de la nueva clase debe configurarse manualmente (aviso via toast)

**Funciones nuevas**: `switchLevelUpMode`, `selectNewMulticlassClass`, `_confirmNewMulticlass`, `_handleLevelUpConfirm`
**Constante nueva**: `ALL_CLASSES` (12 clases PHB)
**No cubre**: restricciones RAW de atributo mínimo para multiclase, ni 3+ clases simultáneas (FEAT-04)

### FEAT-05b — Recursos múltiples (extraClassResources)
Ampliación de FEAT-05 para mostrar ambos recursos de clase simultáneamente.
- `state.js`: campo `extraClassResources: []` en CHARACTER_STATE
- `rage.js`: `addExtraResource(res)` push/upsert; `toggleExtraResourcePip(idx,el)` manejo de usos; `_renderExtraResources()` paneles extra bajo el recurso primario en `#rageCard`
- `rests.js`: shortRest/longRest resetean `usesSpent` de extras según `recovery`
- `persistence.js`: carga `extraClassResources` al restaurar estado (default `[]`)
- `level-up.js`: `_confirmNewMulticlass` llama `addExtraResource` en vez de reemplazar el primario
- `xp.js`: escala `maxUses` de extras al subir de nivel usando `className` del recurso
- `wizard.js`: incluye `className` al llamar `addExtraResource` para el recurso secundario

---

## BUG-24 — ALTO · `setLevelDirect` no limpiaba clases ni ajustaba HP al bajar de nivel

**Archivos**: `src/modules/xp.js`, `src/modules/level-up.js`, `src/modules/persistence.js`, `src/state.js`
**Estado**: `[x]` — commits 83f5760 + a2bc486 · 2026-05-23

### Descripción
Al usar "Fijar Nv" para bajar el nivel de un personaje multiclase ocurrían dos problemas:
1. La segunda clase permanecía en la pill (ej. "Bárbaro 1/Explorador 1" → fijado a Nv1 → seguía mostrando "Bárbaro 1/Explorador 1")
2. El HP máximo no se reducía, quedando con los PG del nivel superior

### Fix — fase 1 (aproximado)
`xp.js`: nueva función `_setLevelDirectMulticlass()`:
- Parsea la pill, reduce niveles de derecha a izquierda hasta alcanzar el target
- Elimina clases con 0 niveles restantes y sus `extraClassResources`
- Reconstruye `hitDice` reduciendo conteo por tipo de dado
- Resta HP por promedio: `ceil(die/2+0.5) + CON` × niveles eliminados
- Clase única: misma lógica de reducción de HP aproximada

### Fix — fase 2 (historial exacto)
Se agrega `CHARACTER_STATE.levelHistory: {}` — snapshot `{hpMax, classText}` por cada nivel alcanzado.

**Dónde se graba:**
- `openLevelUpAssistant(newLevel)`: guarda snapshot del nivel `newLevel-1` con HP pre-tirada y classText actual (solo si no existía)
- `applyLevelUpHP(gain, label)`: guarda/actualiza snapshot del nivel actual con el `hpMax` resultante
- `_confirmNewMulticlass()`: actualiza `classText` del snapshot del nivel actual con la nueva pill multiclase

**Dónde se restaura (`setLevelDirect`):**
- Si existe `levelHistory[targetLevel]` → restaura HP exacto (diff aplicado a hpCurrent también), restaura classText en pill, reconstruye hitDice mergeando por tipo de dado, filtra extraClassResources a clases secundarias del snapshot, resincroniza recursos y ranuras
- Si no existe snapshot → fallback al cálculo aproximado por promedio
- Siempre borra entradas `levelHistory[k]` para `k > targetLevel`

**Persistencia**: `persistence.js` carga `levelHistory` en `loadState`; `state.js` inicializa el campo con `{}`.

---

---

## CODEX-01 — CRÍTICO · Brujo nuevo no inicializa Espacios de Pacto

**Archivo**: `src/wizard.js`, `_complete()`
**Estado**: `[x]` — 2026-05-21

### Descripción
El wizard llamaba `loadSpellPreset(d.cls)` (modo no-merge) antes de fijar `clsLabel`, y luego corregía los slots normales con `computeSpellSlots(clsLabel)`. Pero `computeSpellSlots` devuelve `null` para Brujo (pool separado), y nunca se llamaba `_syncPactSlots(clsLabel)`. Resultado: el Brujo recién creado quedaba con `pactSlotsState = {level:0, max:0, used:0}`, sin UI de Pacto y sin recuperar slots en descanso corto.

### Fix
Añadida llamada `if (typeof _syncPactSlots === 'function') _syncPactSlots(clsLabel);` después del bloque `computeSpellSlots`.

### Verificación manual
1. Crear Brujo nivel 1 → debe aparecer "🌑 Pacto Nv1 · 1/1 ☾ corto".
2. Gastar el espacio → 0/1.
3. Descanso corto → vuelve a 1/1.
4. Crear Brujo nivel 5 → debe mostrar "Pacto Nv3 · 2/2".

---

## CODEX-02 — CRÍTICO · Recursos extra restaurados aunque se cancele el descanso

**Archivo**: `src/extra_resources.js`, hooks de `shortRest`/`longRest`
**Estado**: `[x]` — 2026-05-21

### Descripción
Los hooks de `extra_resources.js` restauraban `r.spent = 0` ANTES de llamar a `origShort.apply()`. Dado que `shortRest()` y `longRest()` pedían confirmación al inicio, si el usuario cancelaba el diálogo los recursos extra ya estaban restaurados.

### Fix
- `shortRest()` retorna `false` al cancelar y `true` al completar; ídem `longRest()`.
- Los hooks en `extra_resources.js` mueven la restauración DESPUÉS de llamar al original y solo la ejecutan si el resultado no es `false`.

### Verificación manual
1. Crear personaje multiclase con recurso extra, gastar 2 usos.
2. Click en Descanso corto → Cancelar.
3. Los recursos extra deben seguir gastados.

---

## CODEX-03 — ALTO · Recurso extra multiclase no escala por nivel

**Archivo**: `src/wizard.js`, bloque de `extraResources` en `_complete()`
**Estado**: `[x]` — 2026-05-21

### Descripción
El recurso primario de clase escalaba correctamente con `calcResourceMaxUses(className, level)`. El recurso secundario (extra) se agregaba directamente desde `CLASS_TEMPLATES[cls2].resource` sin escalar, quedando con el `maxUses` base del template (generalmente 1).

### Fix
Antes de llamar a `addExtraResource()`, se calcula `calcResourceMaxUses(extraClassName, extraClassLevel)` y se aplica al recurso copiado.

### Verificación manual
1. Crear Bárbaro 5 / Monje 5 → Furia debe tener 3 usos, Ki debe tener 5 (el que sea principal vs. extra).
2. Crear Guerrero 6 / Bardo 6 → cada recurso debe reflejar su nivel.

---

## CODEX-05 — ALTO · CA con Defensa sin Armadura viola RAW

**Archivo**: `src/app.js`, `updateArmorClass()`
**Estado**: `[x]` — 2026-05-21

### Descripción
La función elegía `Math.max(unarmoredBase, ...armorOptions)` sin verificar las condiciones de la fórmula. Resultado: Monje con escudo equipado sumaba el bono de escudo más la fórmula de Monje (imposible por RAW). Bárbaro con armadura equipada podía seguir usando la fórmula de Bárbaro si era más alta.

### Fix RAW aplicado
- **Monje**: fórmula `10+DEX+SAB` solo si NO hay armadura NI escudo equipados. Si hay escudo → `10+DEX+escudo` (CA estándar con escudo).
- **Bárbaro**: fórmula `10+DEX+CON` solo si NO hay armadura. Si hay armadura → usa CA de armadura. Escudo siempre suma.
- **Estándar**: `10+DEX` siempre, sin condiciones.

### Verificación manual
1. Monje DES+3/SAB+3, sin equipo → CA 16. Equipar escudo → CA 15 (10+3+2, NO 18).
2. Bárbaro DES+2/CON+3, escudo → CA 17 (10+2+3+2). Equipar armadura media (CA 14+2) → CA 16+2 escudo = 18.

---

## CODEX-07 — MEDIO · Bono de Furia aplica a ataques con DES

**Archivo**: `src/app.js`, `getRageDamageBonus()`
**Estado**: `[x]` — 2026-05-21

### Descripción
PHB 5e p.48: el bono de Furia aplica al daño de ataques de arma CaC usando **Fuerza**. El código aplicaba el bono a cualquier ataque CaC (`atk.melee !== false`) independientemente del atributo.

### Fix
Añadida condición: si `atk.ability === 'DEX'` (finesse elegido con DES o ataque DEX-based), no se aplica el bono de Furia. Ataques sin `ability` definido (por defecto FUE en CaC) sí lo reciben.

### Verificación manual
1. Bárbaro en Furia, ataque CaC STR → bono de Furia sumado.
2. Bárbaro en Furia, ataque CaC con `ability:'DEX'` (finesse-DES) → sin bono de Furia.
3. Ataque a distancia → sin bono (ya controlado por `atk.melee !== false`).

---

## CODEX-09 — MEDIO · Daño a 0 PG no suma fallos de salvación de muerte

**Archivo**: `src/app.js`, `applyDamageAmount()`
**Estado**: `[x]` — 2026-05-21

### Descripción
PHB 5e p.197: si un personaje a 0 PG recibe daño, sufre 1 fallo de salvación de muerte (2 si es crítico). Si el daño ≥ PG máximos, muerte instantánea (3 fallos). El código solo bajaba HP sin actualizar el tracker de death saves.

### Fix
- Se registra si `cur === 0` antes de aplicar el daño (`alreadyDowned`).
- Si `alreadyDowned && hpDamage > 0`:
  - Daño ≥ PG máx → `deathSaves.f = 3` + log "Muerte instantánea".
  - Daño normal → `+1 fallo`.
  - `applyDamageAmount` acepta opción `{ critical: true }` → `+2 fallos`.
- Se llama `renderDeathSaves()` y `checkDeathOutcome()`.

### Verificación manual
1. Poner PG en 0. Aplicar 5 de daño → counter de fallos sube a 1.
2. Aplicar daño igual al PG máx → log "Muerte instantánea", 3 fallos.

---

## CODEX-04 — ALTO · Equipo inicial de clase no se carga al inventario

**Archivo**: `src/wizard.js`
**Estado**: `[x]` — 2026-05-23

### Descripción
El wizard cargaba el equipo del trasfondo al inventario pero ignoraba el campo `equipment` de `classes.json`. Las clases tienen opciones de elección ("Hacha grande **o** cualquier arma marcial") que no son ítems concretos sino descripciones de elección.

### Fix aplicado
- Agregado **Paso 7 "Equipo"** al wizard (el Resumen pasa a ser Paso 8).
- Cada línea del campo `equipment` de la clase se parsea: líneas con ` o ` → radio buttons (elige una); líneas sin ` o ` → checkbox (pre-marcado).
- Multiclase: muestra equipo de ambas clases con encabezado por clase.
- `_addEquipItem(text)` helper compartido entre trasfondo y clase; usa `EQUIP_ICONS` (ahora a nivel de módulo) para asignar ícono y tipo automáticamente. Agrega `🎒 paquete de`, `⚔ jabalina`, etc.
- Las selecciones se preservan si el usuario navega atrás y vuelve al paso.

### Verificación manual
1. Crear Bárbaro → paso 7 muestra "Hacha grande o cualquier arma marcial CaC" como radio, "Paquete de explorador y cuatro jabalinas" como checkbox separado.
2. Seleccionar "Dos hachas de mano" → inventario tiene ese ítem.
3. Crear Bardo multiclase → paso 7 muestra equipo de ambas clases con encabezado.

---

## CODEX-06 — FALSO POSITIVO · Condiciones aplican desventaja automática a tiradas

**Estado**: `[x]` — falso positivo verificado 2026-05-21

### Hallazgo de Codex
Codex reportó que el wrapper de `LL_cinematicRoll` aplicaba desventaja automática a cualquier d20 según condiciones activas.

### Resultado de verificación
**No confirmado.** `LL_cinematicRoll` usa únicamente el `advMode` que el usuario selecciona manualmente (chip de ventaja/desventaja). Las condiciones activas son solo etiquetas visuales; no modifican automáticamente los dados. No hay lógica de condición-a-tirada en el código.

---

## CODEX-08 — MEDIO · Multiclase usa un solo atributo de conjuro global

**Archivo**: `src/modules/spells.js`, `index.html`
**Estado**: `[x]` — 2026-05-23

### Descripción
`rollSpellAttack()` usaba `CHARACTER_STATE.spellcastingAttr` global. En builds Clérigo/Mago cada clase debería usar su propio atributo (SAB/INT).

### Fix aplicado
- Campo `castingAttr` (opcional) añadido a la estructura de cada conjuro.
- Modal de conjuro: nueva fila "Atrib. de lanzamiento" (`smCastAttr`), dropdown con `— Global —` + STR/DEX/CON/INT/WIS/CHA. Si se deja en `— Global —`, usa el global del personaje.
- `rollSpellAttack(id)`: usa `spell.castingAttr || state.CHARACTER_STATE.spellcastingAttr`.
- `buildSpellCard()`: muestra badge con el atributo (ej. "INT") cuando el conjuro tiene atrib. propio.
- Datos guardados existentes son compatibles: la ausencia de `castingAttr` cae al global sin migración.

### Verificación manual
1. Crear Clérigo/Mago multiclase. Añadir conjuro de Clérigo → "Atrib." = SAB. Añadir conjuro de Mago → "Atrib." = INT.
2. Tirar ataque de conjuro de Clérigo → bono = comp. + mod. SAB.
3. Tirar ataque de conjuro de Mago → bono = comp. + mod. INT.
4. Badge "SAB" / "INT" visible en la tarjeta del conjuro.

---



| Fecha | Sesión | Bugs atacados | Resultado |
|-------|--------|---------------|-----------|
| 2026-05-19 | Auditoría inicial | — | Identificados 13 bugs + 1 omisión |
| 2026-05-19 | Limpieza PDF | OMISIÓN-01 | Eliminadas 216 líneas de importación PDF (`app.js` 5325→5109) |
| 2026-05-19 | Roster local | BUG-13 | Roster reescrito: lee localStorage en lugar de rutas hardcodeadas |
| 2026-05-19 | BUG-01 | shortRest() | Separada recuperación de recurso (todas las clases) de restauración de slots (solo Brujo) |
| 2026-05-19 | BUG-02 | normalizeAttack() | Conversión a número antes de isFinite; soporta string "3", "+3" y number 3 |
| 2026-05-19 | BUG-07 | Wizard epiteto/deidad | Asignados a CHARACTER_STATE + charDeity/charPlayerName en lista de restauración de loadState |
| 2026-05-19 | BUG-08 | qty duplicada | Falso positivo de auditoría — nunca existió en el código |
| 2026-05-19 | BUG-03→BUG-12 | Todos resueltos | Bardo desc.corto nv5, addXP multiclase, shareViaURL chunks, import limpia estado, initBonus reset, ASI en level-up, CLASS_DATA eliminado, Espacios de Pacto separados |
| 2026-05-19 | Segunda auditoría | — | Identificados BUG-14 a BUG-17 (4 nuevos) |
| 2026-05-19 | Tercera auditoría | — | Identificados BUG-18 a BUG-19 (2 nuevos; 10 falsos positivos descartados) |
| 2026-05-19 | BUG-18 | longRest hit dice | Math.floor → Math.ceil (PHB p.186 dice "round up") |
| 2026-05-21 | BUG-10 fix adicional | restoreAllSlots() + shortRest() | `restoreAllSlots()` no reseteaba pactSlotsState.used; condición de shortRest() simplificada |
| 2026-05-21 | Verificación completa | BUG-03,04,06,09,10,11,14,15,16,18 | Todos verificados manualmente vía GitHub Pages — todos funcionan correctamente |
| 2026-05-21 | Fix adicional BUG-06 | renderCombatLog() en import | DOM del log de combate no se limpiaba al importar — `renderCombatLog()` agregado en `doImportJSON()` |
| 2026-05-21 | Mejora UX | Botón Descanso corto en Magia | `restorePactSlots()` + botón "☾ Descanso corto" en tarjeta Ranuras de Conjuro |
| 2026-05-21 | Mejora UX | Asistente nivel multiclase | `openLevelUpAssistant()` detecta multiclase y muestra cards para elegir qué clase subir; actualiza pill, hitDice y slots automáticamente. Nota: soporta hasta 2 clases. |
| 2026-05-21 | Mejora UX | Contador dados de golpe | Label `Xd10 Y/total` muestra disponibles/total en cada grupo de dados de golpe |
| 2026-05-21 | Auditoría Codex | — | Revisión AUDIT_CODEX_2026-05-21.md: 10 hallazgos analizados, 7 confirmados, 1 falso positivo (CODEX-06), 2 documentados (CODEX-04, CODEX-08) |
| 2026-05-21 | CODEX-01 | wizard.js `_complete()` | Brujo nuevo no inicializaba pact slots: añadida llamada `_syncPactSlots(clsLabel)` tras calcular `clsLabel` |
| 2026-05-21 | CODEX-02 | extra_resources.js hooks | Recursos extra se restauraban antes del `confirm()` del descanso: movida restauración post-llamada, `shortRest`/`longRest` retornan `false` al cancelar |
| 2026-05-21 | CODEX-03 | wizard.js recurso extra multiclase | Recurso secundario usaba `maxUses` de template sin escalar: añadido `calcResourceMaxUses(extraClassName, extraClassLevel)` antes de `addExtraResource` |
| 2026-05-21 | CODEX-05 | app.js `updateArmorClass()` | Monje podía usar escudo con Defensa sin Armadura; Bárbaro aplicaba fórmula aunque llevara armadura: reescrita lógica con condiciones RAW por fórmula |
| 2026-05-21 | CODEX-07 | app.js `getRageDamageBonus()` | Bono de Furia aplicaba a ataques CaC con DES: añadida condición `atk.ability !== 'DEX'` |
| 2026-05-21 | CODEX-09 | app.js `applyDamageAmount()` | Daño a 0 PG no sumaba fallos de muerte: añadida lógica RAW (1 fallo normal, 2 en crítico, muerte instantánea si daño ≥ PG máx) |
| 2026-05-21 | CODEX-10/BUG-19 | app.js `loadState()` | `heroEpithet`, `charDeity`, `charPlayerName`, `langComp` y campos de personalidad cambiados a `textContent`; campos de notas siguen con `innerHTML` |
| 2026-05-22 | FASE 1-8 Modularización | app.js 5325→824 líneas | Extraídos 23 módulos ES a `src/modules/`. FASE 7 (persistence.js) y FASE 8 (cleanup): merged DOMContentLoaded, restauradas IIFEs y listeners accidentalmente eliminados, corregido bug preexistente (window bridge incompleto para funciones UI llamadas desde HTML). |
| 2026-05-23 | Test de regresión post-modularización | Verificación manual de bridges | Confirmados 61/61 funciones HTML→window bridge. Verificados: `restoreAllSlots`/`restorePactSlots` (spell-slots.js), `toggleHD`/`_hdChangeDie`/`_hdAdjCount`/`_hdRemoveGroup` (hit-dice.js), `cycleSkillProf` (skills.js), round-trip de persistencia, imports de app.js (24 módulos). Sin regresiones detectadas. |
| 2026-05-23 | CODEX-04 | wizard.js: Paso 7 Equipo | Nuevo paso de elección de equipo de clase entre Habilidades y Resumen. Radio buttons para opciones alternativas ("o"), checkboxes para ítems fijos. Helper `_addEquipItem()` compartido con trasfondo. |
| 2026-05-23 | CODEX-08 | spells.js + index.html | Campo `castingAttr` por conjuro en modal y en `rollSpellAttack()`. Badge visible en tarjeta. Retrocompatible. |
| 2026-05-23 | Mejora calidad 9/10 | 4 cambios transversales | (A) `migrateState()` en persistence.js: migración schema v1→v2 con defaults para 9 campos. (B) Wizard: fetch individual con toast en error de carga JSON (antes: Promise.all silencioso). (C) `parseEquipmentLine()` extraída como función pura testeable en wizard.js. (D) 20 tests automáticos nuevos: migrateState (5), shortRest selectivo (4), parseEquipmentLine (4), PROF_BONUS_TABLE (5); total: 49 tests. |
| 2026-05-23 | Modularización wizard.js | IIFE → ES module | wizard.js convertido de IIFE de 1586 líneas a ES module. 5 commits (FASE A-E): quitar wrapper IIFE, imports state.js + toast-log.js, CHARACTER_STATE→state.*, inventory/skillsState/traits/concentrationSpell→state.*, todos los typeof guards eliminados → window.X?.(). index.html: defer→type=module. |
| 2026-05-23 | Auditoría post-FASE-9 | BUG-20, BUG-21, DEUDA-01/02, FEAT-01–04 | Identificados 2 bugs XSS residuales (notas ricas y campos de conjuro sin escapar), 2 deudas técnicas (split persistence.js, split spells.js) y 4 features pendientes del roadmap. Documentados en AUDIT.md. |
| 2026-05-23 | DEUDA-01 | Split persistence.js | persistence.js 754→392 líneas. roster.js (121 lín.) con funciones de roster + clearSave + newSheet. share.js (255 lín.) con export/import/URL. Clave SAVE_KEY mutable via getSaveKey/setSaveKey. app.js actualizado con 3 imports. |
| 2026-05-23 | DEUDA-02 | Split spells.js | spells.js 587→522 líneas. spell-modal.js (71 lín.) con openSpellModal/saveSpellModal/closeSpellModal/addSpell/addCantrip. Sin dep. circular: saveSpellModal usa window.renderSpellBook?(). app.js: import side-effect de spell-modal.js. |
| 2026-05-23 | FEAT-01 | Condiciones → desventaja sugerida | dice.js IIFE: CONDITION_DISADVANTAGE map + _warnConditions(). conditions.js: getActiveConditions() exportada. LL_cinematicRoll: toast + pulso "Desv." si hay condiciones activas con desventaja para el tipo de tirada. Agotamiento Nv.1/3+ incluido. |
| 2026-05-23 | BUG-22 | langComp renderizaba HTML crudo | persistence.js: langComp movido del grupo textContent al grupo innerHTML+sanitizeRichText. |
| 2026-05-23 | BUG-23 | clearSave/newSheet — beforeunload re-escribía datos | Causa: beforeunload dispara saveState() con CHARACTER_STATE en memoria antes de que el reload complete. Fix: persistence.js agrega `skipNextSave()` + flag `_skipSave`; saveState() y saveToLocal() retornan temprano si el flag está activo. roster.js llama `skipNextSave()` en clearSave y newSheet antes de location.reload(). newSheet además usa sessionStorage 'openWizardOnLoad' para que loadFromLocal() abra el wizard en vez del roster. |
| 2026-05-24 | FEAT-06: mejoras | dado→select, sin atributo, peso+sync inventario, fix Enter personalidad | attacks.js: select amDamage (1…2d12), NONE ability, weight+syncInventory en save. app.js: keydown delegado en .personality-text → execCommand insertLineBreak. commit fbd1c04. |
| 2026-05-23 | FEAT-06 | Modal de creación/edición de armas (Weapon Wizard) | attacks.js: WEAPON_PRESETS (35 armas PHB), campos magicBonus/extraDamage en normalizeAttack, openAttackModal/saveAttackFromModal/etc. dice.js: rollAttackDamage suma magicBonus + itera extraDamage; showDamagePrompt muestra extra en label. index.html: #attackModal HTML. styles.css: .attack-modal-box, .am-toggles, .am-extra-row, .am-preview, .attack-magic-tag, .attack-extra-dmg. |
| 2026-05-23 | FEAT-05 | Multiclase desde asistente de nivel | level-up.js: toggle "▲ Subir [Clase] / ✦ Nueva clase" en modal de subida de nivel para personajes de clase única. "Nueva clase" muestra grid de 11 clases (excluye la actual); confirmar actualiza pill, hitDice y recalcula ranuras. Nuevas funciones: switchLevelUpMode, selectNewMulticlassClass, _confirmNewMulticlass, _handleLevelUpConfirm. Constante ALL_CLASSES (12 PHB). |
| 2026-05-23 | FEAT-05b | extraClassResources — recursos múltiples en multiclase | state.js: campo `extraClassResources: []` en CHARACTER_STATE. rage.js: addExtraResource() (push/upsert), toggleExtraResourcePip(idx,el), _renderExtraResources() renderiza paneles extra bajo el recurso primario en #rageCard con pips clickeables. rests.js: shortRest/longRest resetean extras según recovery. persistence.js: carga extraClassResources al restaurar estado. level-up.js: _confirmNewMulticlass llama addExtraResource (no reemplaza primario). xp.js: escala maxUses de extras al subir de nivel si tienen className. wizard.js: pasa className al llamar addExtraResource para el recurso secundario. |
| 2026-05-23 | FEAT-05: fix re-tirada | HP acumulado al re-tirar dado en asistente de nivel | level-up.js `applyLevelUpHP`: lee `modal.dataset.hpGain` (gain previo), resta del HP actual para obtener base, aplica el nuevo gain, y sobreescribe (no acumula) el dataset. Previene que tirar el dado 3 veces sume HP de las 3 tiradas. commit bf51247. |
| 2026-05-23 | BUG-24 | setLevelDirect no limpiaba clases ni ajustaba HP al bajar nivel | Dos problemas: (1) personaje multiclase conservaba la segunda clase al bajar de nivel; (2) HP no se reducía. Fix inicial (commit 83f5760): xp.js agrega `_setLevelDirectMulticlass()` que elimina clases sobrantes de derecha a izquierda, limpia extraClassResources, rebuilding hitDice y ajusta HP por promedio de dado+CON. Clase única: misma lógica de HP aproximado. |
| 2026-05-23 | BUG-24: historial por nivel | Restauración exacta de HP/clase al bajar nivel | Mejora sobre el fix anterior: se agrega `CHARACTER_STATE.levelHistory` (objeto clave=nivel, valor={hpMax,classText}). Guardado en 3 puntos de level-up.js: openLevelUpAssistant guarda snapshot del nivel previo antes de la tirada; applyLevelUpHP guarda snapshot del nivel actual con HP resultante; _confirmNewMulticlass actualiza classText del snapshot al confirmar multiclase. setLevelDirect: si existe snapshot para el nivel destino → restaura HP exacto y classText (recomputa hitDice, extraClassResources, recursos y ranuras desde el snapshot). Si no hay snapshot → fallback aproximado. Siempre borra entradas de historia por encima del nivel destino. 4 archivos: state.js, persistence.js, level-up.js, xp.js. commit a2bc486. |

---

## FASE 9.5 — Documentación y política

**Archivos**: `docs/CHARACTER_SCHEMA.md` (nuevo), `CLAUDE.md`, `docs/ROADMAP.md`
**Estado**: `[x]` — 2026-05-23

### Descripción
Documentación actualizada para reflejar la arquitectura final tras FASE 9, y política formal de código nuevo para guiar sesiones futuras de IA sin necesidad de re-derivar convenciones.

### Cambios aplicados

**`docs/CHARACTER_SCHEMA.md`** (archivo nuevo):
- Tabla completa de los ~40 campos de `CHARACTER_STATE` con tipo, default y descripción.
- Estructuras de entidades: `Spell`, `InventoryItem`, `Attack`, `Trait`, `classResource`, `extraResources[]`.
- Tabla de versiones de schema (v1 → v2) y regla para features que persistan campos nuevos.
- Claves de localStorage y notas de compatibilidad para campos legacy.

**`CLAUDE.md`** (actualizado):
- "Estructura de archivos": refleja los 24+ módulos ES actuales, `tests/`, `package.json`, `CHARACTER_SCHEMA.md`.
- "Arquitectura de datos": `state.js` como fuente de verdad, grafo de imports, hook registries documentados.
- "Convenciones del código": refactorizado para ES modules (elimina "Sin módulos ES").
- Nueva sección **"Política de código nuevo"**: 4 reglas obligatorias (sin `onclick=` inline, sin `window.*` no documentado, sin `innerHTML` con datos de usuario sin sanitizar, migración obligatoria para campos persistidos).
- "Cómo testear": documenta `npm test` como forma primaria + `npm run serve`.
- "Estado actual del proyecto": fecha actualizada a 2026-05-23, nota de FASE 9 completada.

### Resultado
- CLAUDE.md ya no tiene referencias a "5325 líneas de app.js" ni a "sin módulos ES".
- Cualquier sesión futura de IA que lea CLAUDE.md tiene visibilidad de la arquitectura modular completa y las restricciones de seguridad aplicadas.

---

## FASE 9.4 — Eliminar legacy IIFE

**Archivos**: `src/extra_resources.js`, `src/inventory_extras.js`, `src/character_context.js`, `src/modules/rests.js`, `src/modules/persistence.js`, `src/modules/inventory.js`, `index.html`
**Estado**: `[x]` — 2026-05-23

### Descripción
Los tres scripts legacy usaban monkey-patching sobre `window.shortRest`, `window.longRest`, `window.loadState`, `window.saveState` y `window.renderInventory`. Frágil: cada toque en esos módulos requería recordar que estos archivos los envolvían desde afuera.

### Solución aplicada
**Hook registries** agregados en los módulos destino:
- `rests.js`: `registerRestHook(type, fn)` — `fn` se llama al completar `shortRest`/`longRest`, antes de `saveState`. Así el estado de extras ya está actualizado al guardar.
- `persistence.js`: `registerBeforeSave(fn)` (se llama al inicio de `saveState`, antes de serializar) y `registerAfterLoad(fn)` (se llama al final de `loadState` con `data`).
- `inventory.js`: `registerInventoryRenderHook(fn)` — `fn` se llama al final de cada `renderInventory`.

**Los tres scripts migrados a ES modules:**
- `extra_resources.js`: imports de `state`, `toast-log`, `rests`, `persistence`, `utils`. Elimina IIFE y monkey-patching. Registra hooks con la nueva API.
- `inventory_extras.js`: imports de `state`, `inventory`, `persistence`. Elimina IIFE y monkey-patching. Usa `getTotalCarryWeight` importado directamente (elimina el typeof guard y el fallback manual).
- `character_context.js`: imports de `state`. Elimina IIFE. `window.rageActive` → `state.rageActive`.

**`index.html`**: `<script defer>` → `<script type="module">` para los tres scripts.

### Resultado
- No quedan `window.shortRest = function(...)` wrappings desde archivos externos.
- No quedan `typeof X === 'function'` guards en los archivos migrados.
- Los hooks garantizan que extras/monedas queden guardados en el mismo `saveState` del descanso.

---

## FASE 9.3 — Runner automático de tests

**Archivos**: `package.json`, `tests/run-tests.mjs`, `.github/workflows/tests.yml`
**Estado**: `[x]` — 2026-05-23

### Descripción
Los 59 tests de `tests/tests.html` existían pero no tenían runner automático — se abrían manualmente en el browser. Sin runner, cada sesión podía silenciar los tests sin querer.

### Implementación
- **`package.json`**: scripts `test` (`node tests/run-tests.mjs`), `check` (sintaxis de entry points), `serve` (`python3 -m http.server 8080`). `playwright` como devDependency.
- **`tests/run-tests.mjs`**: servidor estático Node `http` en puerto 8765, Playwright headless abre `tests/tests.html`, espera `#summary` con contenido (los tests incluyen `await import()` async), reporta fallos y errores JS, sale con código 1 si hay regresiones.
- **`.github/workflows/tests.yml`**: CI en cada push/PR a `main` — instala Node 20, Playwright Chromium, corre `npm test`.

### Uso local
```
npm install           # primera vez (requiere Node.js instalado)
npm test              # corre los 59 tests RAW en headless
npm run check         # verifica sintaxis de entry points
```

### Prerequisito
Node.js debe estar instalado. Descarga desde nodejs.org (versión LTS recomendada).

---

## FASE 9.2 — Tests RAW: concentración

**Archivo**: `tests/tests.html`
**Estado**: `[x]` — 2026-05-23

### Descripción
`applyDamageAmount` en `hp.js:148-151` implementa correctamente el check de concentración (CD `max(10, floor(damage/2))`), pero no tenía cobertura de tests.

### Tests agregados (4 casos)
- Daño 5 con concentración activa → popup `#concCheckPrompt` con "CD 10" (suelo RAW).
- Daño 30 con concentración activa → popup con "CD 15" (`floor(30/2)`).
- Daño 0 con concentración activa → sin popup.
- Sin concentración activa → sin popup aunque haya daño.

Estrategia: `promptConcentrationCheck` crea `div#concCheckPrompt` con el texto "CD X" — verificable sin mocking. `state` se importa directamente desde `state.js` para setear `concentrationSpell`.

Total de tests en `tests/tests.html`: 59.

---

## FASE 9.1 — Hardening XSS

**Archivo**: `src/modules/persistence.js`, `src/modules/dom-utils.js`
**Estado**: `[x]` — 2026-05-23

### Descripción
Tres superficies donde datos del usuario (provenientes de JSON importado) se asignaban a `innerHTML` sin sanitizar:

1. **Roster cards** (`persistence.js:_renderRosterCards`): `charName` y `metaValues` interpolados directamente en `innerHTML`. Un JSON con `"charName": "<img src=x onerror=alert(1)>"` ejecutaba el payload al abrir el roster.
2. **`editables`** (`loadState`): campos `contenteditable` restaurados con `el.innerHTML = html` sin filtrar.
3. **`journalHTML` y `traitsHTML`** (`loadState`): ramas de rich text asignadas directamente.

### Fix aplicado
- Creado `src/modules/dom-utils.js` con `sanitizeRichText(html)`: usa `DOMParser`, elimina tags bloqueados (`script`, `iframe`, `object`, `embed`, `form`, `svg`, `math`…) y atributos peligrosos (`on*`, `href=javascript:`, `srcdoc`). Conserva tags de formato inocuos (`b`, `i`, `p`, `ul`, etc.).
- Roster cards reescritas con `createElement + textContent` — sin `innerHTML` para datos del usuario.
- `loadState`: `editables`, `journalHTML`, `traitsHTML` pasan por `sanitizeRichText` antes de `innerHTML`.
- 6 tests nuevos en `tests/tests.html` cubren: `<script>`, `onerror`, `onclick`, `href=javascript:`, formato inocuo preservado, input vacío/null.

---

## Checklist de regresión (correr después de cada fix)

Antes de marcar un bug como resuelto, verificar manualmente:

- [ ] Crear personaje nuevo desde el wizard (todas las clases deben funcionar)
- [ ] Subir de nivel 1→2 via XP y via botón directo
- [ ] Descanso corto: Brujo recupera slots, Druida NO
- [ ] Descanso largo: todos recuperan slots y HP
- [ ] Exportar JSON e importar → datos idénticos
- [ ] Compartir por URL → URL válida, importación correcta
- [ ] localStorage persiste entre recargas
- [ ] Conjuros: agregar, gastar slot, preparar, filtrar
- [ ] Inventario: agregar ítem, equipar, calcular CA
- [ ] Dados de golpe: gastar en descanso corto, restaurar en largo
