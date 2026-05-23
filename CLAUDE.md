# Ficha D&D 5e — Contexto del Proyecto para IA

Léeme antes de tocar cualquier archivo. Este documento existe para que cualquier sesión de IA (Claude Code, Claude en VS Code, Claude Design, Codex, etc.) pueda retomar el trabajo sin contexto previo.

---

## Qué es este proyecto

Ficha de personaje D&D 5e como **single-page app** sin servidor ni build step. HTML + CSS + JS vanilla. Funciona abriendo `index.html` en el navegador. Persistencia 100% en `localStorage`.

## Ramas de git

| Rama | Rol |
|------|-----|
| `main` | **Rama activa de desarrollo** — aquí se trabaja y se deploya a Pages |

**Regla**: todo desarrollo va a `main`. GitHub Pages despliega automáticamente desde `main`.

## Estructura de archivos

```
index.html                    ← UI completa (~1223 líneas, contiene todo el HTML)
src/
  app.js                      ← Punto de entrada + lógica principal (~825 líneas, ES module)
  wizard.js                   ← Asistente de creación de personaje (~1553 líneas, ES module)
  character_context.js        ← Panel lateral de contexto (~359 líneas, ES module)
  inventory_extras.js         ← Lógica extra de inventario (~167 líneas, ES module)
  extra_resources.js          ← Recursos extra de clase (~197 líneas, ES module)
  state.js                    ← Fuente de verdad del estado compartido (ES module)
  styles.css                  ← Estilos principales (~5900 líneas)
  refresh.css                 ← Overrides y ajustes visuales
  modules/
    persistence.js            ← saveState / loadState / migrateState / hooks save-load
    rests.js                  ← shortRest / longRest / registerRestHook
    inventory.js              ← renderInventory / addItem / registerInventoryRenderHook
    dom-utils.js              ← sanitizeRichText (DOMParser, sin dependencias)
    attributes.js             ← scores, saving throws, AC
    skills.js                 ← habilidades y competencias
    spells.js                 ← gestión de conjuros
    spell-slots.js            ← ranuras de conjuro
    traits.js                 ← rasgos y dotes
    attacks.js                ← lista de ataques
    hp.js                     ← puntos de golpe
    hit-dice.js               ← dados de golpe
    death-saves.js            ← salvaciones de muerte
    initiative.js             ← iniciativa
    rage.js                   ← furia del Bárbaro
    conditions.js             ← condiciones de estado
    xp.js                     ← experiencia y nivel
    level-up.js               ← subida de nivel
    dice.js                   ← tiradas de dados
    theme.js                  ← temas visuales
    toast-log.js              ← notificaciones y log de combate
    journal.js                ← diario del personaje
    images.js                 ← retrato y fondo
    utils.js                  ← utilidades genéricas
  data/
    classes.json              ← 12 clases PHB 5e con subclases, conjuros, recursos
    species.json              ← Razas y subespecies PHB 5e
    backgrounds.json          ← Trasfondos PHB 5e
sw.js                         ← Service Worker para PWA
manifest.json                 ← Manifest PWA
package.json                  ← devDependencies: playwright; scripts: test, serve
tests/
  tests.html                  ← Suite de tests en-browser (~59 tests)
  run-tests.mjs               ← Runner headless Playwright (Node.js)
.github/workflows/tests.yml   ← CI: instala Playwright, corre npm test
docs/
  AUDIT.md                    ← Auditoría activa con bugs pendientes y resueltos
  ROADMAP.md                  ← Plan técnico: modularización, tests RAW y features futuras
  CHARACTER_SCHEMA.md         ← Schema completo de CHARACTER_STATE y entidades
```

## Arquitectura de datos

### Estado en memoria
- `state.js` exporta el objeto `state` con todo el estado compartido (ES module, fuente de verdad).
- `state.CHARACTER_STATE` — objeto plano del personaje (persistido en localStorage).
- `state.spells`, `state.inventory`, `state.attacks`, `state.traits`, `state.skillsState` — arrays del personaje.
- `state.spellSlotsState` — objeto `{1..9: {max, used}}`.
- Ver `docs/CHARACTER_SCHEMA.md` para la estructura completa.

### Persistencia (localStorage)
- Clave activa guardada en `KEY_POINTER` → apunta a `dnd_ficha_<nombre>_v1`.
- Imágenes (portrait, bgImage) se guardan en claves separadas para no saturar la clave principal.
- `saveState()` serializa todo. `loadState(data?)` restaura. `saveToLocal()` es wrapper debounced (500ms).
- Hook registries: `registerBeforeSave(fn)` / `registerAfterLoad(fn)` en `persistence.js`.

### Arquitectura de módulos
Todos los scripts son ES modules (`type="module"` en `index.html`). El grafo de imports:
```
index.html
  └─ app.js (import state.js, modules/*)
  └─ wizard.js (import state.js, modules/*)
  └─ character_context.js (import state.js)
  └─ inventory_extras.js (import state.js, modules/persistence.js, modules/inventory.js)
  └─ extra_resources.js (import state.js, modules/persistence.js, modules/rests.js)
```
Bridges de compatibilidad (funciones expuestas como `window.*`) están documentados con comentario `// window bridge` en el código.

## Tablas y constantes críticas

| Constante | Ubicación | Descripción |
|-----------|-----------|-------------|
| `PROF_BONUS_TABLE` | `app.js:5` | Array de 21 elementos — índice 0 es cero dummy, índices 1-20 = nivel 1-20 |
| `FULL_CASTER_SLOTS` | `app.js:158` | Tabla de ranuras lanzadores completos, 20 filas |
| `HALF_CASTER_SLOTS` | `app.js:165` | Tabla de ranuras medio-lanzadores, 20 filas |
| `WARLOCK_SLOTS` | `app.js:172` | Tabla de ranuras de Pacto del Brujo, 20 filas |
| `CASTER_TYPE` | `app.js:179` | Mapa clase→`'full'/'half'/'warlock'` |
| `CLASS_TEMPLATES` | `app.js:119` | Recursos de clase con `hitDie`, `resource`, `recovery` |
| `SPECIES_DATA` | `app.js` | Datos de especie hardcodeados — paralelo a `species.json` (no se carga del JSON) |
| `XP_TABLE` | `app.js` | Umbrales de XP por nivel 1-20 |
| `SKILLS_DATA` | `app.js` | Array de habilidades con atributo base |

## Convenciones del código

- ES modules en todos los scripts nuevos. Usar `import`/`export`.
- Funciones de render: `render*()` — solo escriben en el DOM, no modifican estado.
- Funciones de estado: modifican `state.*` o arrays en `state`, luego llaman render.
- IDs del DOM referenciados en JS: buscar con `document.getElementById('id')`.
- `saveToLocal()` = debounced. `saveState()` = inmediato. Usar `saveToLocal()` en eventos de usuario, `saveState()` en acciones de peso (descanso, importar, etc.).
- Hooks para extensibilidad: `registerRestHook`, `registerBeforeSave`, `registerAfterLoad`, `registerInventoryRenderHook` — no monkey-patching.

## Política de código nuevo

> Estas reglas aplican a TODO código nuevo. No son opcionales.

1. **Sin `onclick=` inline.** Usar `data-action` + event delegation o `addEventListener`. El HTML no debe contener lógica JS.
2. **Sin `window.*` salvo bridge documentado.** Si un módulo necesita exponer una función al HTML legacy (ej. `onclick="window.foo()"`), añadir un comentario `// window bridge — eliminar cuando se migre el HTML` inmediatamente encima.
3. **Sin `innerHTML` con datos del usuario sin sanitizar.** Usar `sanitizeRichText()` de `dom-utils.js` para HTML rico, o `createElement + textContent` para texto plano.
4. **Toda feature que persista campos nuevos debe:**
   - Agregar el campo con su default en `state.js` (`CHARACTER_STATE` o el array correspondiente).
   - Agregar una migración en `migrateState()` de `persistence.js` (bump `CURRENT_SCHEMA_VERSION`).
   - Agregar al menos un test en `tests/tests.html`.
   - Ver `docs/CHARACTER_SCHEMA.md` para la estructura del schema.

## Cómo testear

### Automatizado (CI)
```bash
npm install          # instala playwright (solo la primera vez)
npm test             # levanta servidor estático + corre tests headless en Chromium
```
CI corre automáticamente en GitHub Actions en cada push a `main`.

### Manual
1. Abrir `index.html` en el navegador (Chrome o Firefox, no Safari para algunas APIs).
   - Para datos de clase/especie: los fetch de JSON requieren servidor local. Usar `npm run serve` (python3) o Live Server de VS Code.
2. Para el wizard: botón "Nueva Ficha" desde el menú.
3. Para la suite completa en browser: abrir `tests/tests.html` con servidor local activo.
4. Verificar en DevTools → Application → Local Storage que los datos persisten correctamente.

## Estado actual del proyecto

Ver `docs/AUDIT.md` para la lista completa de bugs identificados, su prioridad y estado (pendiente / en progreso / resuelto).

**Rama activa**: `main`
**Última auditoría**: 2026-05-23
**Versión de schema de guardado**: `2.0` (campo `version` en CHARACTER_STATE)
**Arquitectura**: ES modules (FASE 9 completada — ver `docs/ROADMAP.md`)

---

## Metodología de trabajo entre sesiones

### Antes de empezar una sesión
1. Leer `docs/AUDIT.md` — ver qué está pendiente y qué está en progreso.
2. Identificar el bug a atacar por su número (ej: BUG-01).
3. Confirmar la rama activa: `git branch` debe mostrar `main`.

### Durante la sesión
1. Un bug a la vez. Marcar como `[EN PROGRESO]` en `AUDIT.md` al comenzar.
2. Hacer commit por bug corregido con mensaje: `fix(BUG-XX): descripción breve`.
3. Marcar como `[RESUELTO]` en `AUDIT.md` con la fecha y el commit hash.

### Al terminar una sesión
1. Hacer commit de `AUDIT.md` con el estado actualizado.
2. Pushear a `origin/main`.
3. No dejar código a mitad — si no se terminó el fix, hacer commit con `[WIP]` en el mensaje.

### Convención de commits
```
fix(BUG-XX): descripción del bug corregido
feat(TEMA): descripción de feature nueva
docs: actualizar AUDIT.md con estado de sesión
```
