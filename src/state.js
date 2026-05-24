// ═══════════════════════════════════════════════
//  STATE — Fuente de verdad compartida (FASE 1)
//  Todos los módulos importan { state } desde aquí.
//  No importar desde app.js directamente.
// ═══════════════════════════════════════════════

function _emptySlots() {
  return Object.fromEntries([1,2,3,4,5,6,7,8,9].map(i => [i, { max: 0, used: 0 }]));
}

export const state = {
  // ── Objeto de personaje (fuente de verdad de todos los campos del personaje)
  CHARACTER_STATE: {
    version: '2.0',
    // Identidad
    charName: null,
    metaValues: [],
    hp: { current: null, max: null, temp: null },
    xp: { current: null, next: null },
    statAC: null, statInit: null, statSpeed: null,
    scores: {},
    profBonus: null,
    // Estado de juego
    skills: [],
    attacks: [],
    inventory: [],
    inspiration: false,
    rageActive: false,
    exhaustion: 0,
    classResource: {
      name: '', icon: '⚡', maxUses: 0, recovery: 'long',
      damageBonus: 0, physResist: false,
      effects: []
    },
    extraClassResources: [],
    // Tema activo
    classThemeIndex: 4,
    customBg: '#070e07',
    customGold: '#c9a84c',
    customBorder: '#8a6b2a',
    customFont: "'IM Fell English', serif",
    // Apariencia
    fontScale: 1,
    panelOpacity: 0.70,
    // Imágenes (guardadas por separado)
    portrait: null,
    bgImage: null,
    // Timestamp
    savedAt: null,
    // Contenteditables
    editables: {},
    // Estados toggle
    deathChecks: [],
    activeConditions: [],
    hitDice: [],
    hitDiceUsed: [],
    ragePipsUsed: [],
    // Contenedores dinámicos
    journalHTML: '',
    traitsHTML: '',
    spells: [],
    spellSlotsState: {},
    concentrationSpell: null,
    spellcastingAttr: '',
    // UI
    heroBgStyle: '',
    bgLayerOpacity: '8',
    roundCounter: '1',
    initBonus: 0,
    deathSaves: { s: 0, f: 0 },
    sneakAttackUsed: false,
    subclass: '',
    bgPersonality: null,
  },

  // ── Arrays de estado en memoria (fuente de verdad de cada pestaña)
  spells:       [],
  inventory:    [],
  attacks:      [],
  traits:       [],
  skillsState:  [],   // inicializado por app.js tras definir SKILLS_DATA

  // ── Ranuras de conjuro
  spellSlotsState: _emptySlots(),
  pactSlotsState:  { level: 0, max: 0, used: 0 },

  // ── Estado de combate volátil
  concentrationSpell: null,
  rageActive:         false,
  combatLog:          [],
};
