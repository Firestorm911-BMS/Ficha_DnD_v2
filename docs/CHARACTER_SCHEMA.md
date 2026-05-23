# Schema de Personaje — Ficha D&D 5e

**Versión de schema**: `2` (campo `version: '2.0'` en `CHARACTER_STATE`)  
**Última actualización**: 2026-05-23  
**Fuente**: `src/state.js` + `src/modules/persistence.js` (`saveState` / `loadState` / `migrateState`)

---

## Regla para features nuevas

> Toda feature que persista campos nuevos debe:
> 1. Agregar el campo con su **default** en `state.js` (`CHARACTER_STATE` o el array correspondiente).
> 2. Agregar una **migración** en `migrateState()` de `persistence.js` (bump `CURRENT_SCHEMA_VERSION`).
> 3. Agregar al menos un **test** de migración en `tests/tests.html`.

---

## Versión del schema

| Versión | Qué agrega | Migración en |
|---------|------------|--------------|
| 1 | Schema original (sin campo `version`) | — |
| 2 | `deathSaves`, `concentrationSpell`, `rageActive`, `conditions`, `exhaustion`, `initBonus`, `unarmedDefFormula`, `multiclass`, `spellcastingAttr` | `migrateState()` en `persistence.js` |

`CURRENT_SCHEMA_VERSION = 2` — definido implícitamente en `migrateState`. Al agregar la siguiente versión, incrementar ahí y agregar `if (data.version < 3) { ... }`.

---

## `CHARACTER_STATE` — campos persistidos

Todos los campos que `saveState()` serializa al localStorage. Llave `dnd_ficha_<nombre>_v1`.

### Identidad y estadísticas

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `version` | `string` | `'2.0'` | Versión del schema. |
| `charName` | `string\|null` | `null` | Nombre del personaje. |
| `metaValues` | `string[]` | `[]` | Valores de las hero-pills: `[clase, trasfondo, especie, subraza, alineamiento, ...]`. |
| `hp` | `{current,max,temp}` | `{current:null,max:null,temp:null}` | Puntos de golpe. |
| `xp` | `{current,next}` | `{current:null,next:null}` | XP actual y umbral del siguiente nivel. |
| `statAC` | `string\|null` | `null` | Clase de Armadura calculada. |
| `statInit` | `string\|null` | `null` | Iniciativa calculada. |
| `statSpeed` | `string\|null` | `null` | Velocidad en metros. |
| `scores` | `{STR,DEX,CON,INT,WIS,CHA}` | `{}` | Puntuaciones de atributo (strings del input). |
| `profBonus` | `string\|null` | `null` | Bonificador de competencia. |
| `initBonus` | `number` | `0` | Bonus manual de iniciativa. |
| `subclass` | `string` | `''` | Nombre de la subclase (pill opcional). |
| `bgPersonality` | `any` | `null` | Datos de personalidad del trasfondo (legacy). |

### Estado de juego

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `skills` | `{prof,expert}[]` | `[]` | Estado de competencia por habilidad (paralelo a `SKILLS_DATA`). |
| `saveProfs` | `boolean[]` | — | Competencia en cada salvación (6 elementos). Serializado en `saveState`, hidratado en `loadState`. |
| `inspiration` | `boolean` | `false` | Dado de inspiración activo. |
| `rageActive` | `boolean` | `false` | Furia activa. |
| `rageUsesSpent` | `number` | `0` | Usos gastados del recurso de clase. |
| `classResource` | `object` | `{name:'',icon:'⚡',maxUses:0,...}` | Recurso de clase principal (ver estructura abajo). |
| `extraResources` | `object[]` | `[]` | Recursos extra (multiclase). Gestionados por `extra_resources.js`. |
| `exhaustion` | `number` | `0` | Nivel de agotamiento (0-6). |
| `deathSaves` | `{s:number,f:number}` | `{s:0,f:0}` | Éxitos y fallos de salvación de muerte. |
| `unarmedDefFormula` | `'standard'\|'monk'\|'barbarian'` | `'standard'` | Fórmula de CA sin armadura. |
| `multiclass` | `boolean` | `false` | Flag de build multiclase. |
| `activeConditions` | `boolean[]` | `[]` | Estado de cada condición tag (paralelo al DOM). |
| `sneakAttackUsed` | `boolean` | `false` | Ataque furtivo usado en el turno actual. |
| `roundCounter` | `string` | `'1'` | Número de ronda actual. |
| `savedAt` | `number` | `null` | Timestamp del último guardado (`Date.now()`). |

### Conjuros y slots

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `spells` | `Spell[]` | `[]` | Lista de conjuros. Ver estructura `Spell` abajo. |
| `spellSlotsState` | `{1..9: {max,used}}` | `{1:{max:0,used:0},...}` | Estado de ranuras por nivel. |
| `pactSlotsState` | `{level,max,used}` | `{level:0,max:0,used:0}` | Espacios de Pacto del Brujo (separado del pool normal). |
| `concentrationSpell` | `{id,name}\|null` | `null` | Conjuro en concentración activa. |
| `spellcastingAttr` | `string` | `'INT'` | Atributo de lanzamiento global (`'INT'/'WIS'/'CHA'`). |

### Inventario y combate

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `attacks` | `Attack[]` | `[]` | Lista de ataques. Ver estructura `Attack` abajo. |
| `inventory` | `InventoryItem[]` | `[]` | Lista de objetos. Ver estructura `InventoryItem` abajo. |
| `currency` | `{pc,pp,ep,po,pe}` | — | Monedas. Gestionado por `inventory_extras.js`. Default `{pc:0,...}`. |

### Rasgos y personaje

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `traits` | `Trait[]` | `[]` | Lista de rasgos/dotes. Ver estructura `Trait` abajo. |
| `hitDice` | `{die,count,spent}[]` | `[]` | Grupos de dados de golpe. |
| `hitDiceSpent` | `number` | `0` | Total de dados de golpe gastados (legacy, se mantiene por compatibilidad). |
| `editables` | `{[id]:html}` | `{}` | Contenido de campos `contenteditable`. Los ricos se sanitizan al cargar. |
| `journalHTML` | `string` | `''` | HTML del diario. Sanitizado al cargar. |
| `traitsHTML` | `string` | `''` | HTML legacy de rasgos (pre-array). Solo se usa si `traits` está vacío. |
| `combatLogEntries` | `string[]` | `[]` | Historial de log de combate. |
| `conditions` | `any[]` | `[]` | Datos de condiciones (legacy). |

### Apariencia

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `classThemeIndex` | `number` | `4` | Índice del tema de clase activo. |
| `customBg` | `string` | `'#070e07'` | Color de fondo personalizado. |
| `customGold` | `string` | `'#c9a84c'` | Color dorado personalizado. |
| `customBorder` | `string` | `'#8a6b2a'` | Color de borde personalizado. |
| `customFont` | `string` | `"'IM Fell English', serif"` | Fuente personalizada. |
| `fontScale` | `number` | `1` | Escala de fuente (0.8–1.4). |
| `panelOpacity` | `number` | `0.70` | Opacidad de paneles (0–1). |
| `heroBgStyle` | `string` | `''` | `backgroundImage` CSS del hero. |
| `bgLayerOpacity` | `string` | `'8'` | Opacidad de la capa de fondo (0-100). |
| `portrait` | `string\|null` | `null` | Data-URI del retrato. Guardado en clave separada del localStorage. |
| `bgImage` | `string\|null` | `null` | Data-URI del fondo. Guardado en clave separada. |

---

## Estructuras de entidades

### `Spell`

```js
{
  id:          string,        // UUID generado al crear
  name:        string,
  level:       number,        // 0 = truco
  school:      string,
  ritual:      boolean,
  concentration: boolean,
  prepared:    boolean,
  desc:        string,
  castingTime: string,
  range:       string,
  components:  string,
  duration:    string,
  castingAttr: string|undefined, // CODEX-08: atrib. propio, omitido = usa global
}
```

### `InventoryItem`

```js
{
  icon:        string,
  name:        string,
  qty:         number,
  type:        'weapon'|'armor'|'shield'|'consumable'|'wondrous'|'tool'|'treasure'|'ammo',
  equipped:    boolean,
  acBonus:     number,
  acBase:      number|null,   // CA base (armaduras)
  weight:      number,        // lb
  attackBonus: number,
  speedBonus:  number,
  dexLimit:    number|undefined, // límite de DES para armaduras medias
}
```

### `Attack`

```js
{
  name:        string,
  attackBonus: number|null,   // null = calculado automáticamente
  damage:      string,        // ej. "1d8+3"
  damageType:  string,
  ability:     'STR'|'DEX'|undefined,
  melee:       boolean,
  notes:       string,
}
```

### `Trait`

```js
{
  name:          string,
  desc:          string,
  maxUses:       number,      // 0 = pasivo
  usesLeft:      number,
  restType:      'short'|'long'|'turn'|'none',
  subProperties: object|undefined,  // datos opcionales de subclase
}
```

### `classResource`

```js
{
  name:        string,
  icon:        string,
  maxUses:     number,
  recovery:    'short'|'long'|'turn',
  damageBonus: number,
  physResist:  boolean,      // resistencia a daño físico (Bárbaro)
  effects:     string[],
}
```

### `extraResources[]` (gestionado por `extra_resources.js`)

```js
{
  name:        string,
  icon:        string,
  maxUses:     number,
  spent:       number,
  recovery:    'short'|'long'|'turn',
  damageBonus: number,
  physResist:  boolean,
  effects:     string[],
}
```

---

## Claves de localStorage

| Clave | Contenido |
|-------|-----------|
| `dnd_active_key` (`KEY_POINTER`) | Nombre de la clave activa del personaje. |
| `dnd_ficha_<nombre>_v1` | JSON del personaje (sin imágenes). |
| `dnd_ficha_<nombre>_v1_img_portrait` | Data-URI del retrato. |
| `dnd_ficha_<nombre>_v1_img_bgImage` | Data-URI del fondo. |

---

## Notas de compatibilidad

- **`hitDiceSpent`** (legacy): puede coexistir con `hitDice[]`. `_migrateHitDice()` convierte el legacy al array.
- **`traitsHTML`** (legacy): solo se usa si `traits` es `undefined` o array vacío. Nuevos personajes usan `traits[]`.
- **`deathChecks`** (legacy): array de 6 booleans. Migrado a `{s,f}` en schema v2.
- **`ragePipsUsed`** (legacy): array de booleans. Migrado a `rageUsesSpent` number en schema v2.
- **`conditions`**: campo legacy, reemplazado por `activeConditions` en la práctica.
