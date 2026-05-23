# Roadmap Técnico — Ficha D&D 5e

**Creado**: 2026-05-22  
**Última actualización**: 2026-05-23  
**Estado**: ✅ FASE 9 completa  
**Cubre**: modularización de `app.js` (FASES 0–8 completas), hardening de seguridad, tooling de tests y eliminación de scripts legacy (FASE 9).

## Estado de fases

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0.2  | Backup `backup/pre-modularizacion` | ✅ commit `9844f46` |
| 0.4  | `type="module"` en `index.html` + `defer` en otros scripts | ✅ commit `9844f46` |
| 0.5  | `tests/tests.html` con casos RAW | ✅ commit `9844f46` |
| 1    | Extraer `state.js` — `CHARACTER_STATE` en módulo ES, window bridge | ✅ commit `9844f46` |
| 2    | Módulos "hoja": `toast-log.js`, `journal.js`, `images.js`, `conditions.js` | ✅ commit `d38e26f` |
| 3    | Atributos y habilidades: `skills.js`, `attributes.js`, `death-saves.js`, `initiative.js` | ✅ commit `31543a7` |
| 4    | Combate: `rage.js`, `hp.js`, `hit-dice.js`, `rests.js` | ✅ commit `50d94c7` |
| 5    | Equipamiento y magia: `inventory.js`, `attacks.js`, `spell-slots.js`, `spells.js`, `traits.js` | ✅ commit `d68235d` |
| 6    | UI compleja: `xp.js`, `dice.js`, `level-up.js`, `theme.js` | ✅ commit `e8e9126` |
| 7    | Persistencia: `persistence.js` | ✅ commit `4d9178a` |
| 8    | Limpieza: `app.js` residual, window bridge completo | ✅ commit `8a9bf16` |
| 9.1  | Hardening XSS: roster cards + `dom-utils.js` + `sanitizeRichText` | ✅ 2026-05-23 |
| 9.2  | Tests RAW: concentración (4 casos nuevos en `tests/tests.html`) | ✅ 2026-05-23 |
| 9.3  | Runner automático: `package.json` + `tests/run-tests.mjs` (Playwright) | ✅ 2026-05-23 |
| 9.4  | Eliminar legacy IIFE: hooks en `rests.js`/`persistence.js`, migrar 3 scripts legacy | ✅ 2026-05-23 |
| 9.5  | Documentación y política: `CHARACTER_SCHEMA.md` + reglas en `CLAUDE.md` | ✅ 2026-05-23 |

### Notas de implementación — FASE 1

**Window bridge** (`app.js` líneas 3406–3421): expone las variables de módulo como `window.*` para que `wizard.js`, `extra_resources.js` y otros scripts no-module accedan a ellas. Usar getters/setters vivos que cierran sobre la VARIABLE de módulo (binding), no sobre el valor inicial. Se elimina en FASE 8.

**CODEX-04 y CODEX-08**: explícitamente diferidos — requieren cambios de arquitectura de datos (equipo de clase con UI de elección, atributo por conjuro). Ver AUDIT.md.

### Notas de implementación — FASE 8

**app.js final**: 824 líneas (desde 5325 originales → -84%). Contiene: imports, DATA constants, DOMContentLoaded único, `initDiceChestV15` IIFE, toggle helpers, edit mode, window bridge, COMBATE TAB IIFE, CONDITIONS ROLL PENALTY IIFE, `_updateOptionalFields`, `printSheet`.

**Bug pre-existente corregido — window bridge faltante**: desde FASE 0.4 (`type="module"` en app.js), las funciones `toggleEditMode`, `handleDiceFab`, `switchTab`, `toggleSaveProf`, `toggleHD`, `toggleInspiration`, `reshufflePersonality`, `printSheet`, `toggleMulticlass` no estaban asignadas a `window.*`. Los `onclick` del HTML las necesitan explícitamente. Corregido añadiendo bloque de bridge UI al final del window bridge.

**Dos DOMContentLoaded fusionados en uno**: el original tenía dos handlers separados con muchas llamadas duplicadas (renderSkills, renderAttacks, etc.). Fusionados en uno único con: `calcMod` de todos los attrs, renders completos, `buildThemes`, `loadFromLocal`, `checkShareHash`, `autoSave`, listener de click para cerrar panel de dados.

**Secciones eliminadas del FASE 7 restauradas**: el bloque de eliminación por PowerShell en FASE 7 removió accidentalmente DOMContentLoaded #2, `beforeunload`/`visibilitychange`/`keydown`, COMBATE TAB IIFE, CONDITIONS ROLL PENALTY IIFE, `_updateOptionalFields` y `toggleMulticlass`. Todos restaurados en FASE 8.

**`wizard.js` y scripts no-module**: se mantienen como `defer` (no `type="module"`). Acceden a datos de app.js vía `window.*` que ya está completo. No se convierten a módulos — fuera del scope de estas fases.

---

### Notas de implementación — FASE 7

**Módulo creado**: `persistence.js` (~460 líneas) — `app.js` de 1619 → 644 líneas (-60%).

**Funciones extraídas**: `saveState`, `saveToLocal`, `loadState`, `loadFromLocal`, `_rosterChars`, `_renderRosterCards`, `openRoster`, `closeRoster`, `loadRosterCharacter`, `deleteRosterCharacter`, `autoSave`, `clearSave`, `newSheet`, `exportHTML`, `exportJSON`, `importJSON`, `doImportJSON`, `showJSONReview`, `confirmJSONImport`, `shareViaURL`, `checkShareHash`.

**Constantes extraídas**: `DEFAULT_KEY`, `KEY_POINTER`, `SAVE_KEY` (mutable `let`), `makeSaveKey`, `_imgKey`, `_saveImages`, `_loadImages`, `_pendingImport`, `_saveTimer`.

**`SAVE_KEY` mutable en módulo**: `SAVE_KEY` vive como `let` en `persistence.js`. Las dos references externas en `app.js` (`toggleEditMode` y `handleDiceFab`) usan `getSaveKey()` exportada del módulo.

**`_saveStateFn` y `_loadStateFn` permanecen en `app.js`**: el dispatch ref para monkey-patching se inicializa con `saveState` y `loadState` importados de `persistence.js`. El `Object.defineProperties` sobreescribe los `window.saveState`/`window.loadState` que `persistence.js` no registra (correctamente). Las funciones dentro de `persistence.js` que necesitan la versión monkey-patcheable llaman `window.saveState?.()` / `window.loadState?.()`.

**`skillsState` en `persistence.js`**: `saveState` y `loadState` acceden a `skillsState` vía `window.skillsState` — getter vivo definido en el `Object.defineProperties` de `app.js` que cierra sobre la variable de módulo.

**`syncInitPlayerName` y `_updateOptionalFields`**: llamadas en `loadState` vía `window.syncInitPlayerName?.()` y `window._updateOptionalFields?.()` para evitar importación circular.

**Modal de revisión JSON — cancel button**: se eliminó `;_pendingImport=null` del onclick del botón cancelar (era acceso directo a variable de módulo, inaccesible desde HTML). `_pendingImport` se limpia cuando el usuario confirma (`confirmJSONImport`) o inicia otra importación (`showJSONReview` reassigns). No hay fuga de estado.

---

### Notas de implementación — FASE 6

**Módulos creados**: `theme.js` (361 líneas), `xp.js` (158), `level-up.js` (325), `dice.js` (616) — `app.js` de 3029 → 1619 líneas (-46%).

**Dependencia circular xp.js ↔ level-up.js resuelta**: `addXP` llama `window.openLevelUpAssistant?.()` en lugar de importar de `level-up.js`; `applyClassTemplate` llama `window.getCurrentLevel?.()` en lugar de importar de `xp.js`.

**`window.rollFromChest` — dos versiones**: `dice.js` iba a proveer la versión cinématica, pero el `initDiceChestV15` IIFE en `app.js` (que se ejecuta DESPUÉS del eval de `dice.js` por ser el módulo importador) la sobreescribe con la versión completa que incluye manejo de ventaja/desventaja en el panel. Se eliminó la asignación de `dice.js`; se dejó un comentario explicativo. El fallback `window.rollFromChest?.(sides)` en `rollPolyhedral` funciona porque `initDiceChestV15` corre antes de que se registren los handlers de DOMContentLoaded.

**`rollPolyhedral` en `initDiceChestV15`**: las dos llamadas directas `rollPolyhedral(...)` en el IIFE (que permanece en `app.js`) se actualizaron a `window.rollPolyhedral?.(...)` — accessible porque `dice.js` lo asigna en su bridge.

**`getSlotTableForLevel` reescrita en `level-up.js`**: usa `computeSpellSlots(className + ' ' + level)` en lugar de las tablas `FULL_CASTER_SLOTS`/`HALF_CASTER_SLOTS`/`WARLOCK_SLOTS` que no están exportadas de `spell-slots.js`. Retorna array `[1..9]` de máximos — compatible con el consumer `openLevelUpAssistant`.

**V13 IIFE en `dice.js`**: se ejecuta al evaluar el módulo (antes de DOMContentLoaded), inyecta DOM (`rollStage`, `advChip`, `logPanel`, `logBtn`) directamente en `document.body`. Funciona porque los módulos ES se evalúan después del parsing del DOM pero antes de DOMContentLoaded.

---

### Notas de implementación — FASE 5

**Módulos creados**: `utils.js`, `attacks.js`, `inventory.js`, `spell-slots.js`, `spells.js`, `traits.js` — 6 módulos, ~1304 líneas eliminadas de `app.js` (4333 → 3029 líneas).

**`utils.js` para romper dependencia circular**: `escapeAttr` y `signed` movidas a `utils.js` sin dependencias. Evita un ciclo `attacks.js → inventory.js → attacks.js` dado que `attacks.js` necesita `getEquipmentAttackBonus` de `inventory.js`.

**`SPELL_PRESETS` extraído con encoding UTF-8**: Primera extracción con encoding por defecto producía mojibake (`BÃ¡rbaro`). Corregido con `-Encoding UTF8` en PowerShell `Get-Content`.

**Bridge getters migrados a `state.*`**: tras eliminar las declaraciones locales `let spells`, `let inventory`, etc., los getters del bridge actualizados de `() => spells` a `() => state.spells`. Los setters simplificados de `v => { spells = state.spells = v }` a `v => { state.spells = v }`.

**`_emptySlots()` en `app.js` eliminada**: era duplicado de la función homónima en `state.js`. El call site en el reset de importación (`_emptySlots()`) reemplazado por `Object.fromEntries([1,2,3,4,5,6,7,8,9].map(i => [i, {max:0,used:0}]))` directamente.

**`_renderInvFn` mantenido**: el dispatch ref para monkey-patching de `renderInventory` por `inventory_extras.js` se conserva en el bridge. `loadState` ahora usa `window.renderInventory?.()` que pasa por el getter → `_renderInvFn`. `inventory.js` también asigna `window.renderInventory = renderInventory` en su bridge, pero esa data property es sobreescrita por el accessor de `Object.defineProperties` de `app.js` (que se ejecuta después, al evaluar el cuerpo del módulo importador).

**`editMode` en módulos extraídos**: `renderAttacks`, `buildSpellCard`, `renderSpellSlots`, `renderInventory` usan `document.body.classList.contains('edit-mode')` — siempre sincronizado porque `toggleEditMode` en `app.js` hace `document.body.classList.toggle('edit-mode', editMode)`.

---

### Notas de implementación — FASE 4

**`rageActive` y `concentrationSpell` duplicados**: ambas variables existían como `let` locales en `app.js` Y como campos en `state.js`. El bridge getter leía la variable local → los módulos que usaban `state.rageActive` veían valores obsoletos. Fix: se eliminaron las declaraciones locales, el bridge leen de `state` directamente, y todos los usos restantes en `app.js` se migraron a `state.*`.

**`editMode` en `renderHitDice`**: `editMode` es variable local de `app.js`, no expuesta en window. Fix: `document.body.classList.contains('edit-mode')` — siempre sincronizado porque `toggleEditMode` hace `document.body.classList.toggle('edit-mode', editMode)`.

**`escapeAttr` / `resetTraitUses` / `breakConcentration` faltantes en bridge**: `hp.js`, `rests.js` y `rage.js` necesitaban estas funciones de `app.js`. Añadidas al bridge: `window.escapeAttr`, `window.resetTraitUses`, `window.breakConcentration`.

**IIFE de rabia-por-ronda**: tenía guards `typeof rageActive !== 'undefined'` defensivos para la var local. Tras su eliminación, simplificados a `state.rageActive` directos.

---

### Notas de implementación — FASE 3

**Importaciones circulares**: `attributes.js` importa de `skills.js` y `skills.js` importa de `attributes.js`. Funciona correctamente porque ES modules resuelven el grafo antes de ejecutar, y los llamados cruzados ocurren dentro de cuerpos de función (no en inicialización de módulo).

**`getCurrentLevel` en bridge**: `calcProfBonus` (ahora en `attributes.js`) necesita `getCurrentLevel()` de `app.js`. Se expone via `window.getCurrentLevel = getCurrentLevel` en el bridge de app.js.

**Monkey-patch de `nextTurn`**: el listener `keydown` en `app.js` que avanza turno con Space/Enter fue cambiado de `nextTurn()` (llamada directa al import) a `window.nextTurn?.()` para respetar el parche de furia que envuelve `nextTurn` con lógica de consumo de rabia por ronda.

**`PROF_BONUS_TABLE` duplicada**: declarada localmente en `attributes.js` (constante pequeña). La copia en `app.js` permanece para el código de level-up que aún vive en `app.js` — se eliminará en FASE 6.

**Redundancias del bridge eliminadas**: `window.renderSaves` y `window.renderSkills` se quitaron del bridge de `app.js` — los módulos respectivos ya asignan esas entradas en `window` al cargarse.

---

### Notas de implementación — FASE 2

**Módulos hoja**: no importan entre sí — usan `window.*` para llamadas cruzadas en runtime (e.g. `window.addCombatLog?.()` desde `conditions.js`, `window.saveToLocal?.()` desde todos). Bridge temporal; se limpia en FASE 7–8.

**combatLog en state**: `_combatLog` se movió de variable local de app.js a `state.combatLog` para que `saveState` y `loadState` lo accedan sin importar el módulo. Patrón: estado volátil compartido entre módulos va en `state.js`.

**Hallazgo FASE 2**: `changeExhaustion` estaba en el bloque inicial de app.js (líneas 34–120) junto con `CONDITIONS` y `EXHAUSTION_EFFECTS`. Al extraerlos, se detectó que `saveToLocal()` dentro de `changeExhaustion` y `renderConditions` era una llamada directa a función de app.js — corregida a `window.saveToLocal?.()` en el módulo.

---

## Contexto y restricciones

- Sin framework, sin build step.  
- ES modules (`type="module"`) funcionan en Chrome/Firefox modernos y ya se necesita servidor local para los JSON (`python3 -m http.server 8080`), por lo que no hay nuevas dependencias de entorno.  
- El estado compartido (`CHARACTER_STATE`, `spells`, `inventory`, `attacks`, `traits`, `spellSlotsState`, `pactSlotsState`, `concentrationSpell`, `rageActive`) vive hoy en `window`. Al migrar a módulos, estas variables pasan a vivir en un módulo `state.js` y se importan explícitamente.  
- Sin suite de tests → cada fase termina con verificación manual del checklist de regresión de `AUDIT.md`.

---

## Arquitectura objetivo

```
src/
  state.js                ← una sola fuente de verdad (CHARACTER_STATE + arrays globales)
  modules/
    attributes.js         ← scores, mods, saves, spell stats
    skills.js             ← habilidades + percepción pasiva
    hp.js                 ← HP, daño, curación, overlay de combate
    death-saves.js        ← salvaciones de muerte
    xp.js                 ← XP, nivel, level-up
    attacks.js            ← ataques, bonus, damage parser
    inventory.js          ← inventario, armadura, CA
    conditions.js         ← condiciones, agotamiento
    rage.js               ← recurso de clase, furia, renderRage
    hit-dice.js           ← dados de golpe, gasto en descanso corto
    rests.js              ← descanso corto y largo
    spells.js             ← libro de conjuros, preparación, concentración
    spell-slots.js        ← ranuras, Pacto, pips
    initiative.js         ← tracker de iniciativa
    traits.js             ← rasgos, dotes, invocaciones
    journal.js            ← diario
    dice.js               ← panel de dados, tirada cinemática, tirada libre
    toast-log.js          ← toast, log de combate
    images.js             ← retrato, fondo, compresión
    theme.js              ← sendas, fuentes, temas de clase, colores
    level-up.js           ← asistente de subida de nivel
    persistence.js        ← saveState, loadState, roster, import/export, URL
  app.js                  ← sólo: inicialización, event listeners globales, DOMContentLoaded
```

---

## Fases

### FASE 0 — Prerrequisitos (no tocar `app.js` todavía)
**Objetivo**: dejar la base estable antes de empezar a mover código.

| Tarea | Detalle |
|-------|---------|
| 0.1 Cerrar bugs pendientes | Resolver `CODEX-04` y `CODEX-08` (los únicos `[ ]` en AUDIT.md) o documentar explícitamente por qué se posponen |
| 0.2 Snapshot de rama | Crear `backup/pre-modularizacion` desde `main` antes de tocar cualquier archivo |
| 0.3 Checklist de regresión base | Correr el checklist de AUDIT.md y documentar el estado "verde" como línea base |
| 0.4 Habilitar `type="module"` en `index.html` | Cambiar todos los `<script src="...">` a `<script type="module" src="...">`. **Esto rompe los globals** → hacerlo sólo cuando `state.js` esté listo |
| 0.5 Crear `tests/tests.html` con casos RAW | Ver sección "Tests de regresión" más abajo. Sin framework — `console.assert` puro. Establece la red de seguridad antes de mover código. |

### Tests de regresión mínimos (tarea 0.5)

Un archivo `tests/tests.html` que corre en el browser con `python3 -m http.server 8080`. No requiere framework: cada test es un `console.assert` sobre las funciones de lógica pura. Casos prioritarios:

| Caso | Función a testear | Qué verifica |
|------|------------------|--------------|
| Brujo nv1 wizard | `_syncPactSlots('Brujo 1')` | `pactSlotsState.max === 1` (CODEX-01) |
| Brujo nv5 | `_syncPactSlots('Brujo 5')` | `pactSlotsState.level === 3`, `max === 2` |
| Monje + escudo | `updateArmorClass()` con escudo equipado | No usa `10+DEX+SAB`, usa `10+DEX+2` (CODEX-05) |
| Bárbaro + armadura | `updateArmorClass()` con armadura equipada | No usa `10+DEX+CON` (CODEX-05) |
| Daño a 0 PG | `applyDamageAmount(5)` con HP=0 | `deathSaves.f === 1` (CODEX-09) |
| Daño ≥ HP max a 0 PG | `applyDamageAmount(hpMax)` con HP=0 | `deathSaves.f === 3` |
| Furia + DEX attack | `getRageDamageBonus({ability:'DEX', melee:true})` | retorna `0` (CODEX-07) |
| Furia + STR attack | `getRageDamageBonus({melee:true})` | retorna `> 0` |
| HD round-up | desc. largo con 5 HD gastados | restaura 3, no 2 (BUG-18) |
| Bardo nv5 desc. corto | `shortRest()` con Bardo nv5 | restaura `rageUsesSpent` |
| Druida desc. corto | `shortRest()` con Druida | **no** restaura slots de conjuro (BUG-01) |
| `normalizeAttack({attackBonus:'3'})` | `normalizeAttack` | `attackBonus === 3` (BUG-02) |

Correr `tests.html` antes y después de cada fase de migración. Un test que falla post-migración indica que se rompió algo al mover código.

---

### FASE 1 — Extraer módulo `state.js`
**Por qué primero**: todos los demás módulos lo importarán. Sin él, no hay nada que mover.

**Contenido de `state.js`**:
```js
// Variables de estado compartido
export let CHARACTER_STATE = { ... };   // el objeto actual completo
export let spells = [];
export let inventory = [];
export let attacks = [];
export let traits = [];
export let spellSlotsState = _emptySlots();
export let pactSlotsState = { level: 0, max: 0, used: 0 };
export let concentrationSpell = null;
export let rageActive = false;
export let skillsState = SKILLS_DATA.map(s => ({ ...s }));

// Setters necesarios (los módulos no pueden reasignar un export importado)
export function setSpells(arr)          { spells = arr; }
export function setInventory(arr)       { inventory = arr; }
export function setAttacks(arr)         { attacks = arr; }
export function setTraits(arr)          { traits = arr; }
export function setSpellSlotsState(obj) { spellSlotsState = obj; }
export function setPactSlotsState(obj)  { pactSlotsState = obj; }
export function setConcentration(sp)    { concentrationSpell = sp; }
export function setRageActive(v)        { rageActive = v; }
export function setSkillsState(arr)     { skillsState = arr; }
```

> **Nota crítica**: en ES modules, un módulo que importa `spells` de `state.js` obtiene el valor en el momento del import, no una referencia viva. Para arrays que se reasignan (`spells = []`), el módulo consumidor debe re-importar o usar los setters. Alternativa más simple: exportar un objeto contenedor (`export const state = { spells: [], ... }`) y mutar propiedades en lugar de reasignar variables.

**Estrategia recomendada**: usar objeto contenedor.
```js
// state.js
export const state = {
  CHARACTER_STATE: { ... },
  spells: [],
  inventory: [],
  attacks: [],
  traits: [],
  spellSlotsState: _emptySlots(),
  pactSlotsState: { level: 0, max: 0, used: 0 },
  concentrationSpell: null,
  rageActive: false,
  skillsState: SKILLS_DATA.map(s => ({ ...s })),
};
```
Cualquier módulo hace `import { state } from './state.js'` y accede a `state.spells`, `state.CHARACTER_STATE`, etc. Las mutaciones funcionan porque se muta el objeto, no la referencia.

**Commit esperado**: `refactor: extraer state.js con estado compartido`  
**Verificación**: la app carga sin errores en consola, localStorage funciona.

---

### FASE 2 — Módulos "hoja" (sin dependencias de otros módulos)
Estos módulos solo dependen de `state.js` y del DOM. Son los más seguros para empezar.

| Módulo | Funciones a mover | Líneas en app.js |
|--------|-------------------|------------------|
| `toast-log.js` | `showToast`, `addCombatLog`, `clearCombatLog`, `renderCombatLog` | 3315–3359 |
| `journal.js` | `addJournalEntry` | 2287–2310 |
| `images.js` | `compressImage`, `safePersistImage`, `loadPortrait`, `loadBg` | 3249–3309 |
| `conditions.js` | `renderConditions`, `renderExhaustion`, `changeExhaustion`, `CONDITIONS`, `EXHAUSTION_EFFECTS` | 1–100, 1637–1667 |

**Un módulo por commit**. Después de cada uno: verificar que la función sigue operando en el browser.

---

### FASE 3 — Módulos de atributos y habilidades
Dependen de `state.js` y de `toast-log.js`.

| Módulo | Funciones | Líneas |
|--------|-----------|--------|
| `skills.js` | `renderSkills`, `cycleSkillProf`, `updatePassivePerception`, `SKILLS_DATA` | 914–947 |
| `attributes.js` | `getScore`, `getMod`, `calcMod`, `calcProfBonus`, `getProfBonus`, `renderSaves`, `setSpellcastingAttr`, `renderSpellStats` | 751–913 |
| `death-saves.js` | `renderDeathSaves`, `toggleDeath`, `rollDeathSave`, `checkDeathOutcome`, `resetDeathSaves` | 2141–2222 |
| `initiative.js` | `addInitEntry`, `nextTurn`, `incrementRound`, `sortInit` | 2224–2281 |

**Dependencias entre módulos de esta fase**: `attributes.js` llama a `renderSkills` y `renderSaves` → importar desde `skills.js`. Esto muestra el patrón: los módulos se importan entre sí, no todo pasa por `app.js`.

---

### FASE 4 — Módulos de combate (alta interdependencia)
El grupo más delicado. `hp.js`, `rage.js`, `hit-dice.js` y `rests.js` se llaman entre sí y todos dependen del estado.

**Orden recomendado**:
1. `rage.js` → depende de `state.js`, `attributes.js`, `toast-log.js`
2. `hp.js` → depende de `state.js`, `rage.js`, `attributes.js`, `death-saves.js`, `toast-log.js`
3. `hit-dice.js` → depende de `state.js`, `hp.js`, `toast-log.js`
4. `rests.js` → depende de todos los anteriores + `spell-slots.js` (Fase 5) + `traits.js` (Fase 5)

> `rests.js` se mueve último porque tiene las dependencias más amplias.

---

### FASE 5 — Módulos de equipamiento y magia

| Módulo | Funciones | Dependencias |
|--------|-----------|--------------|
| `inventory.js` | `normalizeInventory`, `renderInventory`, `updateArmorClass`, peso, CA | `state`, `attributes`, `toast-log` |
| `attacks.js` | `normalizeAttack`, `renderAttacks`, `getAttackBonus`, `getRageDamageBonus` | `state`, `attributes`, `rage`, `inventory` |
| `spell-slots.js` | `renderSpellSlots`, `toggleSpellSlotPip`, `togglePactSlotPip`, `adjustSlotMax`, `restoreAllSlots`, `computeSpellSlots` | `state` |
| `spells.js` | `renderSpellBook`, `loadSpellPreset`, `setConcentration`, `breakConcentration`, `rollSpellAttack`, modal de conjuro | `state`, `spell-slots`, `attributes`, `toast-log` |
| `traits.js` | `renderTraits`, `addTrait`, `addClassAbility`, `resetTraitUses` | `state`, `toast-log` |

---

### FASE 6 — Módulos de UI compleja

| Módulo | Contenido | Notas |
|--------|-----------|-------|
| `xp.js` | `getCurrentLevel`, `updateXP`, `addXP`, `setLevelDirect` | Depende de `spell-slots`, `attributes`, `toast-log` |
| `dice.js` | Panel de dados, `LL_cinematicRoll`, `parseDamageString`, `rollAttackDamage`, `openDiceRoller` | El bloque más grande después de `persistence.js` |
| `level-up.js` | `openLevelUpAssistant`, `rollLevelUpHP`, `takeLevelUpHPAvg`, `applyLevelUpHP`, `_parseMulticlassParts` | Depende de `xp`, `spell-slots`, `attributes`, `hp` |
| `theme.js` | `setTheme`, `applyClassTheme`, `applyFont`, `applyPath`, `applyFontScale`, `applyPanelOpacity`, `PATHS`, `FONTS`, `CLASS_THEMES` | Solo DOM + CSS variables, sin dependencias de estado |

---

### FASE 7 — Persistencia y compartir
El módulo más crítico y el más arriesgado. Toca todos los arrays y `CHARACTER_STATE`.

**Contenido de `persistence.js`**:
- `saveState()`, `saveToLocal()`, `loadState()`, `loadFromLocal()`
- `makeSaveKey()`, `_rosterChars()`, `openRoster()`, `closeRoster()`
- `loadRosterCharacter()`, `deleteRosterCharacter()`, `newSheet()`
- `exportJSON()`, `importJSON()`, `doImportJSON()`, `showJSONReview()`, `confirmJSONImport()`
- `exportHTML()`, `shareViaURL()`, `checkShareHash()`
- `autoSave()`

**Estrategia**: mover todo junto en un commit, no fragmentar. La persistencia es un monolito interno que funciona o no funciona — a medias no sirve.

**Verificación post-fase**:
1. Exportar JSON de personaje existente → reimportar → datos idénticos.
2. Compartir por URL → importar desde URL.
3. Cambiar de personaje en el roster → datos correctos.
4. Recargar página → localStorage persiste.

---

### FASE 8 — Limpiar `app.js` y actualizar archivos existentes
Una vez todos los módulos estén en su lugar:

1. `app.js` queda con:
   - Imports de todos los módulos
   - Constantes de datos puras: `PROF_BONUS_TABLE`, `FULL_CASTER_SLOTS`, `HALF_CASTER_SLOTS`, `WARLOCK_SLOTS`, `CASTER_TYPE`, `CLASS_TEMPLATES`, `XP_TABLE`, `SKILLS_DATA`
   - `DOMContentLoaded` con llamadas de inicialización
   - Event listeners globales (`beforeunload`, `visibilitychange`, `keydown`)

2. Actualizar `wizard.js`, `character_context.js`, `inventory_extras.js`, `extra_resources.js` para importar desde los módulos en lugar de depender de globals en `window`.

3. Actualizar `index.html`: reemplazar todos los `<script src>` por `<script type="module" src="src/app.js">` (un solo punto de entrada).

---

## Tamaño estimado de módulos resultantes

| Módulo | Líneas estimadas |
|--------|-----------------|
| `state.js` | ~80 |
| `persistence.js` | ~700 |
| `spells.js` | ~550 |
| `dice.js` | ~500 |
| `theme.js` | ~450 |
| `hp.js` | ~380 |
| `inventory.js` | ~320 |
| `attacks.js` | ~280 |
| `level-up.js` | ~270 |
| `attributes.js` | ~250 |
| `traits.js` | ~200 |
| `rage.js` | ~200 |
| `spell-slots.js` | ~180 |
| `hit-dice.js` | ~170 |
| `rests.js` | ~120 |
| `xp.js` | ~100 |
| `skills.js` | ~80 |
| `death-saves.js` | ~80 |
| `initiative.js` | ~80 |
| `conditions.js` | ~80 |
| `images.js` | ~70 |
| `toast-log.js` | ~60 |
| `journal.js` | ~30 |
| `app.js` (residual) | ~200 |
| **Total** | **~5430** |

---

## Reglas del proceso

1. **Un módulo por PR** — nunca mezclar dos módulos en el mismo commit de migración.  
2. **La app debe correr entre cada commit** — si algo no compila, no se avanza.  
3. **No reescribir lógica al mover** — el código migra idéntico; los refactors vienen después.  
4. **Correr el checklist de regresión de AUDIT.md** al terminar cada fase, no cada commit.  
5. **Si una fase tarda más de 2 sesiones de trabajo**, hacer commit `[WIP]` y documentar dónde quedó.

---

## Riesgos conocidos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Módulo importa variable antes de que exista | Alta | Usar objeto `state` contenedor (no variables sueltas exportadas) |
| `wizard.js` rompe al quitar globals de `window` | Media | Migrar `wizard.js` en Fase 8, no antes |
| Orden de carga de módulos en `index.html` cambia comportamiento | Media | Con `type="module"` el orden es por `import` graph, no por orden en HTML |
| `extra_resources.js` usa monkey-patching de `shortRest`/`longRest` | Alta | Reemplazar monkey-patching por hook explícito en `rests.js` al migrar |
| `localStorage` con claves legacy rompe al cambiar schema | Baja | `loadState` ya tiene migración de versión — no tocar durante la migración |

---

## Criterio de éxito

- `app.js` < 300 líneas al final de la Fase 8.  
- Todos los módulos < 600 líneas.  
- La app corre abriendo `index.html` con `python3 -m http.server 8080` sin errores en consola.  
- El checklist de regresión de AUDIT.md pasa en verde.  
- Todos los tests de `tests/tests.html` pasan (verde en consola).  
- GitHub Pages sigue funcionando (solo sirve estáticos, compatible con ES modules).

---

---

## FASE 9 — Hardening, tooling y eliminación de legacy IIFE

### 9.1 — Hardening XSS

**Prioridad**: P0 — única falla de seguridad concreta y verificada.

**Surface 1 — Roster cards** (`src/modules/persistence.js:401`): `charName` y `metaValues` se interpolan en `innerHTML` sin escapar. Un JSON importado con `"charName": "<img src=x onerror=alert(1)>"` ejecuta el payload al abrir el roster.

**Fix**: reemplazar la construcción con `innerHTML` por `createElement + textContent` para los datos del personaje.

**Surface 2 — `loadState` rich-text** (`persistence.js:238, 294, 328`): `editables`, `journalHTML` y `traitsHTML` se hidratan con `innerHTML` desde JSON importado. No se pueden escapar (son rich text), hay que sanitizarlos.

**Tareas**:
- `[x]` Crear `src/modules/dom-utils.js` con `sanitizeRichText(html)` (sanitizador propio ~40 líneas, sin deps externas, elimina atributos `on*` y `src` peligrosos).
- `[x]` Roster cards: reescribir con `createElement + textContent`.
- `[x]` `loadState`: aplicar `sanitizeRichText` en `editables`, `journalHTML`, `traitsHTML`.
- `[x]` Extender `tests/tests.html` con vectores XSS en `charName`, `metaValues`, `journalHTML`.

**Verificación**: importar `test-fichas/TEST_CODEX10_xss.json` con payloads en esos campos → ninguno ejecuta alert.

---

### 9.2 — Tests RAW: concentración

**Contexto**: `applyDamageAmount` en `hp.js:144-147` implementa correctamente el check de concentración (CD `max(10, floor(damage/2))`), pero no hay tests que la cubran.

**Tareas**:
- `[x]` Agregar en `tests/tests.html`:
  - Daño 5 con concentración activa → CD 10 (suelo RAW).
  - Daño 30 → CD 15 (`floor(30/2)`).
  - Daño 0 → no dispara prompt.
  - Sin concentración activa → no dispara prompt aunque haya daño.

**Esfuerzo estimado**: 30–45 min.

---

### 9.3 — Runner automático de tests

**Contexto**: `tests/tests.html` tiene 49 tests RAW. Sin runner automatizado se omiten en la práctica.

**Tareas**:
- `[x]` Crear `package.json` con scripts:
  ```json
  {
    "scripts": {
      "test": "node tests/run-tests.mjs",
      "check": "node --check src/app.js && node --check src/wizard.js && node --check src/modules/*.js",
      "serve": "python3 -m http.server 8080"
    },
    "devDependencies": { "playwright": "^1.50.0" }
  }
  ```
- `[x]` Crear `tests/run-tests.mjs`: levanta servidor local, abre `tests.html` con Playwright headless, lee `#summary`, falla con exit 1 si hay `.fail`.
- `[x]` (Opcional) GitHub Action que corra `npm test` en cada push a `main`.

**Criterio de éxito**: `npm test` pasa en verde desde terminal, falla si hay regresión RAW.

---

### 9.4 — Eliminar legacy IIFE

**Contexto**: `character_context.js`, `extra_resources.js` e `inventory_extras.js` son IIFEs legacy que hacen **monkey-patching** de `shortRest`, `longRest`, `loadState` y `renderInventory`. Cada vez que se toca esos módulos hay que recordar que estos archivos los envuelven desde afuera.

**Plan**:

1. `[x]` Añadir hook registry en `rests.js`:
   ```js
   const restHooks = { short: [], long: [] };
   export function registerRestHook(type, fn) { restHooks[type].push(fn); }
   // shortRest() y longRest() disparan restHooks[type] al completar
   ```

2. `[x]` Añadir hook registry en `persistence.js`:
   ```js
   const loadHooks = [];
   export function registerAfterLoad(fn) { loadHooks.push(fn); }
   // loadState() dispara loadHooks al final
   ```

3. `[x]` Añadir hook registry en `inventory.js`:
   ```js
   const renderHooks = [];
   export function registerInventoryRenderHook(fn) { renderHooks.push(fn); }
   // renderInventory() dispara renderHooks al final
   ```

4. `[x]` Convertir `extra_resources.js` a ES module: importar hooks de `rests.js` y `persistence.js`, registrar callbacks, eliminar wrapping de `window.*`.

5. `[x]` Convertir `inventory_extras.js` a ES module: importar hook de `inventory.js`, registrar callback, eliminar monkey-patching.

6. `[x]` Convertir `character_context.js` a ES module (no hace monkey-patching — basta con `type="module"` y migrar accesos a `window.*` por imports directos).

7. `[x]` Actualizar `index.html`: `<script defer>` → `<script type="module">` para los 3 scripts.

8. `[x]` Recortar `window bridge` en `app.js`: quitar entries que ya no necesita ningún consumidor externo.

**Riesgo**: medio. Comparar línea por línea con el monkey-patching original para que los hooks se disparen en el mismo momento.

**Criterio de éxito**: no quedan `window.shortRest = function(...)` wrappings desde archivos externos; el bridge queda reducido a funciones de UI llamadas desde `onclick` en HTML.

---

### 9.5 — Documentación y política

**Tareas**:
- `[x]` Crear `docs/CHARACTER_SCHEMA.md` con:
  - Todos los campos de `CHARACTER_STATE` (tipo, default, versión que los introdujo).
  - Estructura de `spells[]`, `inventory[]`, `attacks[]`, `traits[]`.
  - `CURRENT_SCHEMA_VERSION` y migraciones aplicadas.
  - Regla: toda feature que persista campos nuevos debe agregar default + migración + test.
- `[x]` Añadir a `CLAUDE.md` la política de código nuevo:
  - No agregar `onclick=` inline — usar `data-action` + event delegation en código nuevo.
  - No agregar `window.*` salvo bridge documentado de compatibilidad temporal.
  - No renderizar datos del usuario con `innerHTML` sin sanitizar.
  - Toda feature que persista campos nuevos agrega: default + migración en `migrateState` + test.

### Notas de implementación — FASE 9.5

**`CHARACTER_SCHEMA.md`**: documenta los 40+ campos de `CHARACTER_STATE` con tipo, default y descripción, las estructuras de `Spell`, `InventoryItem`, `Attack`, `Trait`, `classResource` y `extraResources[]`, la tabla de versiones de schema, las claves de localStorage y las notas de compatibilidad para campos legacy (`hitDiceSpent`, `traitsHTML`, `deathChecks`, `ragePipsUsed`, `conditions`).

**`CLAUDE.md` actualizado**: sección "Estructura de archivos" refleja los 24+ módulos ES actuales (vs. 5 scripts legacy originales); "Arquitectura de datos" describe `state.js` como fuente de verdad y el grafo de imports; "Convenciones del código" y nueva sección "Política de código nuevo" formalizan las 4 reglas de seguridad/calidad; "Cómo testear" documenta `npm test` como forma primaria y el servidor local para manual.

---

## Features habilitadas por la modularización

Estos son los trabajos que se vuelven factibles — o significativamente más seguros — una vez que los módulos estén en su lugar. No son parte de la migración en sí, pero justifican hacerla bien.

### 1. Condiciones → desventaja automática en tiradas
**Estado actual**: `CODEX-06` verificó que las condiciones son **solo etiquetas visuales**. La desventaja la activa el jugador manualmente. Ambas reviews externas lo leyeron como feature existente, lo que genera expectativa incorrecta.  
**Post-modularización**: `conditions.js` expone `getActiveConditions()`. `dice.js` lo importa y `LL_cinematicRoll` puede consultar si hay condiciones activas para sugerir (o forzar) desventaja automáticamente, con override manual. Implementación limpia sin tocar globals.

### 2. Atributo de conjuro por clase en multiclase (CODEX-08 diferido)
**Estado actual**: `CHARACTER_STATE.spellcastingAttr` es global — un Clérigo/Mago tiene que elegir entre SAB o INT para todas las tiradas.  
**Post-modularización**: `spells.js` puede añadir `sourceClass` a cada conjuro. `rollSpellAttack(id)` derivaría el atributo del `sourceClass` del conjuro en lugar del global. Cambio de schema de datos + UI mínima para editar atributo por conjuro.

### 3. Multiclase con 3+ clases
**Estado actual**: la hero-pill tiene dos selectores fijos. El asistente de nivel soporta "hasta 2 clases" (declarado en AUDIT.md).  
**Post-modularización**: `level-up.js` y `xp.js` como módulos separados hacen el refactor de la hero-pill a lista dinámica más aislado y testeable. El motor de slots combinados ya existe — es solo UI y parsing.

### 4. Sync multi-dispositivo
**Tier 1 — QR + URL comprimida**: ya existe `shareViaURL()` en `persistence.js`. Exponer como QR generado en cliente (librería pequeña, sin servidor) para escanear desde el celular.  
**Tier 2 — GitHub Gist como backend**: `persistence.js` como módulo puede añadir `syncToGist(token)` / `loadFromGist(id)` sin tocar el resto de la app. El token vive en `localStorage`, nunca en el código.

### 5. Companion sheet (familiar, montura, mascota)
**Estado actual**: no existe. El Beastmaster anota aparte.  
**Post-modularización**: nuevo módulo `companion.js` con su propio mini-state (`companionState` en `state.js`) y UI colapsable. No interfiere con `CHARACTER_STATE`. La estructura de datos de ataques/HP ya es la correcta — se reutiliza.
