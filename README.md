# Ficha de Personaje — D&D 5e

Aplicación web para gestionar personajes de Dungeons & Dragons 5ª edición. Sin servidor, sin framework, sin build step. Abrís `index.html` y funciona.

**[Demo en GitHub Pages](https://firestorm911-bms.github.io/Ficha_DnD_v2/)**

---

## Características

### Personaje y combate
- Atributos, modificadores, tiradas de salvación y 18 habilidades con competencia/maestría
- HP, dados de golpe, salvaciones de muerte con tracker visual
- Clase de armadura automática según equipo (fórmulas estándar, Monje, Bárbaro)
- Lista de ataques con bonus automático por atributo y equipamiento
- Recursos de clase (Furia, Ki, Canal Divino, etc.) con recuperación por descanso
- Concentración — check automático al recibir daño (CD `max(10, daño/2)`, RAW)
- Condiciones de estado (Envenenado, Asustado, etc.) con efectos visuales
- Rastreador de ronda, log de combate persistente, tirada cinemática de dados

### Magia
- Ranuras de conjuro por nivel (1–9) para lanzadores completos, medios y Brujo
- Espacios de Pacto del Brujo con recuperación en descanso corto independiente
- Libro de conjuros con preparación, ritual, concentración y tiradas de ataque/CD
- Atributo de lanzamiento configurable por personaje (INT / SAB / CAR)

### Inventario y economía
- Tipos: arma, armadura, escudo, consumible, objeto maravilloso, herramienta, tesoro, munición
- Peso y capacidad de carga
- Monedas (PC, PP, EP, PO, PE)

### Progresión
- XP y nivel 1–20 con tabla oficial
- Asistente de creación de personaje (6 pasos: clase, trasfondo, especie, atributos, rasgos, equipo)
- Asistente de subida de nivel con ranuras, recursos y opciones de clase
- Multiclase con hasta 2 clases

### UX y personalización
- 12 temas visuales de clase + modo personalizado (colores, fuente, opacidad)
- Retrato y fondo personalizados (compresión automática del lado del cliente)
- Exportar / Importar JSON — portabilidad total entre dispositivos
- Compartir personaje vía URL (estado comprimido en el hash, sin servidor)
- Diario de campaña con editor rich text
- Rasgos y dotes con contador de usos y recuperación por descanso
- PWA instalable en móvil (funciona sin conexión)
- Roster de múltiples personajes en localStorage

---

## Uso rápido

```
Abrir index.html en Chrome o Firefox
```

> Los fetch de datos de clase/especie requieren servidor local.  
> `npm run serve` levanta Python en `localhost:8080`, o usá Live Server de VS Code.

### Crear un personaje

1. Click en el ícono de menú (hamburguesa) → **Nueva Ficha**.
2. El asistente guía por clase, trasfondo, especie, atributos, rasgos y equipo.
3. Los datos se guardan automáticamente en `localStorage`.

### Múltiples personajes

Menú → **Personajes** abre el roster. Cada personaje vive en su propia clave de localStorage.

### Instalar como PWA (móvil)

1. Abrir la URL en Chrome (Android) o Safari (iOS).
2. Menú del navegador → **Agregar a pantalla de inicio**.
3. Funciona sin conexión.

---

## Tests

```bash
npm install   # instala Playwright (solo la primera vez)
npm test      # corre ~59 tests en Chromium headless
```

CI automático en GitHub Actions en cada push a `main`.

Para correr la suite en el navegador: abrir `tests/tests.html` con servidor local activo.

---

## Arquitectura

Single-page app sin dependencias de producción. Código completamente modularizado en ES modules:

```
index.html                    ← UI completa (~1223 líneas)
src/
  app.js                      ← inicialización + event listeners (~825 líneas)
  wizard.js                   ← asistente de creación de personaje (~1553 líneas)
  state.js                    ← fuente de verdad del estado compartido
  modules/                    ← 24 módulos funcionales
    persistence.js            ← saveState / loadState / roster / import-export / URL
    rests.js                  ← descansos corto y largo con hook registry
    inventory.js              ← renderizado de inventario con hook registry
    dom-utils.js              ← sanitizeRichText (XSS hardening)
    attributes.js             ← atributos, salvaciones, CA
    skills.js                 ← habilidades y competencias
    spells.js / spell-slots.js← conjuros y ranuras
    hp.js / death-saves.js    ← HP y salvaciones de muerte
    rage.js / hit-dice.js     ← recursos de clase y dados de golpe
    attacks.js / traits.js    ← ataques y rasgos
    xp.js / level-up.js       ← XP, nivel, asistente de subida
    dice.js                   ← panel de dados cinemático
    theme.js                  ← temas, fuentes, colores
    ...y más
  data/
    classes.json              ← 12 clases PHB con subclases, conjuros, recursos
    species.json              ← especies y subespecies PHB
    backgrounds.json          ← trasfondos PHB
tests/
  tests.html                  ← suite de tests en browser
  run-tests.mjs               ← runner headless Playwright
docs/
  AUDIT.md                    ← bugs y estado de sesiones
  ROADMAP.md                  ← historial de modularización (FASES 0–9)
  CHARACTER_SCHEMA.md         ← schema completo de CHARACTER_STATE
```

**Persistencia**: 100% `localStorage`. Sin cuenta, sin servidor, sin base de datos.  
**Schema**: versionado con migración automática (`migrateState` en `persistence.js`). Ver `docs/CHARACTER_SCHEMA.md`.

---

## Stack

| Tecnología | Uso |
|------------|-----|
| HTML / CSS / JS vanilla | Todo el frontend |
| ES Modules (`type="module"`) | Arquitectura modular sin build step |
| `localStorage` | Persistencia del personaje |
| Service Worker | PWA / offline |
| Playwright | Tests headless (dev) |
| GitHub Actions | CI en cada push |

Sin React, sin Vue, sin bundler, sin TypeScript, sin servidor.

---

## Licencia

El **código fuente** de esta aplicación está bajo licencia [MIT](LICENSE).

---

## Aviso legal — Fan Content Policy

**Bitácora del Héroe** es Fan Content no oficial permitido bajo la [Fan Content Policy de Wizards of the Coast](https://company.wizards.com/en/legal/fancontentpolicy). No está aprobado ni respaldado por Wizards of the Coast.

Partes del material usado son propiedad de Wizards of the Coast LLC. ©Wizards of the Coast LLC.

Este proyecto es gratuito y sin fines comerciales. Dungeons & Dragons, D&D y Wizards of the Coast son marcas registradas de Wizards of the Coast LLC.
