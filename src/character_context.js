/* ═══════════════════════════════════════════════
   CHARACTER CONTEXT — Panel auto-generado de info
   relevante del personaje, inyectado en las pestañas
   Combate (.combat-context) y Rasgos (.traits-context).

   Lee del DOM/CHARACTER_STATE:
     - Nombre de clase principal + nivel + multiclase
     - Especie/subraza
     - Trasfondo
     - Atributos (para fórmulas)
     - Ataques equipados (para mostrar propiedades)

   No reemplaza las notas/rasgos editables del usuario —
   se monta ARRIBA como sección de referencia 5e.
═══════════════════════════════════════════════ */
import { state } from './state.js';

  // ─── Base de datos 5e ──────────────────────────────────────────
  // Features de clase por nivel (sólo las más usadas en juego).
  const CLASS_FEATURES = {
    'Bárbaro': {
      armor: 'Defensa sin armadura: 10 + DES + CON. Resistencia a contundente, perforante y cortante mientras está en furia.',
      lvl: {
        1: ['Furia (2 usos / desc. largo): acción bonus para activar. +2 daño CaC, ventaja en pruebas y TS de FUE, resistencia física. No puede lanzar ni concentrar conjuros.', 'Defensa sin Armadura'],
        2: ['Sentido del Peligro: ventaja en TS de DES contra efectos que ves (trampas, hechizos).', 'Ataque Temerario: ataque CaC con ventaja a cambio de que ataques contra ti tengan ventaja hasta tu próximo turno.'],
        3: ['Senda Primaria (elige subclase)'],
        4: ['Mejora de característica (o dote)'],
        5: ['Ataque Adicional: 2 ataques por acción.', 'Movimiento Rápido: +1.5 m (5 ft) sin armadura.'],
      }
    },
    'Bardo': {
      armor: 'Armaduras ligeras. Sin restricciones.',
      lvl: {
        1: ['Inspiración Bárdica (d6): acción bonus, otorga dado a aliado para sumar a un d20 en el próximo minuto.', 'Conjuros conocidos (CAR)', 'Truco: Vicious Mockery — daño psíquico + desventaja en próximo ataque.'],
        2: ['Versátil: PB ÷ 2 a chequeos de habilidad no competente.', 'Canción de Descanso: cura 1d6 PG a aliados en descanso corto.'],
        3: ['Colegio Bárdico (elige subclase)', 'Experticia: 2 habilidades duplican PB.'],
        5: ['Inspiración Bárdica sube a d8', 'Fuente de Inspiración: recupera Inspiración en desc. corto.'],
      }
    },
    'Clérigo': {
      armor: 'Armaduras ligera y media + escudos.',
      lvl: {
        1: ['Conjuros (SAB)', 'Dominio Divino (elige subclase)', 'Truco: Sacred Flame, Guidance, Spare the Dying.'],
        2: ['Canalizar Divinidad (1/desc. corto): Reprender No-Muertos + efecto de dominio.'],
        5: ['Destruir No-Muertos (CR 1/2)'],
      }
    },
    'Druida': {
      armor: 'Armadura ligera + media + escudos (sin metal por código druídico).',
      lvl: {
        1: ['Conjuros (SAB)', 'Druídico: idioma secreto + mensajes ocultos.', 'Truco: Druidcraft, Produce Flame, Shillelagh.'],
        2: ['Forma Salvaje (2/desc. corto): transformar en bestia CR ≤ 1/4.', 'Círculo Druídico (elige subclase)'],
        4: ['Forma Salvaje sube a CR 1/2 (sin vuelo)'],
        5: ['Conjuros nivel 3'],
      }
    },
    'Explorador': {
      armor: 'Armaduras ligera + media + escudos.',
      lvl: {
        1: ['Enemigo Favorecido: ventaja en Supervivencia para rastrearlos + INT para info.', 'Explorador Natural: terreno favorito otorga ventaja de viaje + sin terreno difícil + alerta.'],
        2: ['Conjuros (SAB) desde nivel 2', 'Estilo de Combate (elige uno: Arquería, Defensa, Duelo, Dos Armas)'],
        3: ['Conclave del Explorador (elige subclase)', 'Conjuro primario'],
        5: ['Ataque Adicional: 2 ataques por acción.'],
      }
    },
    'Guerrero': {
      armor: 'Todas las armaduras + escudos.',
      lvl: {
        1: ['Estilo de Combate (Arquería/Defensa/Duelo/Gran arma/Protección/Dos armas)', 'Segundo Aliento (1/desc. corto): acción bonus, cura 1d10 + nivel.'],
        2: ['Acción de Frenesí (1/desc. corto): repite una acción gratis.'],
        3: ['Arquetipo Marcial (elige subclase)'],
        5: ['Ataque Adicional: 2 ataques por acción.'],
      }
    },
    'Hechicero': {
      armor: 'Sin armadura.',
      lvl: {
        1: ['Conjuros (CAR)', 'Origen Hechicero (elige subclase)', 'Truco conocido + 2 conjuros.'],
        2: ['Puntos de Sorcería (= nivel): convertir slots ↔ puntos. Metamagia desde nivel 3.'],
        3: ['Metamagia (elige 2): Cuidadosa, Distante, Empoderada, Apresurada, Sutil, Gemela, Extendida.'],
      }
    },
    'Brujo': {
      armor: 'Armadura ligera.',
      lvl: {
        1: ['Patrón Otherworldly (elige subclase)', 'Conjuros pacto (CAR): 1 slot, recupera en desc. corto.'],
        2: ['Invocaciones de Pacto (elige 2): efectos pasivos permanentes.'],
        3: ['Vínculo de Pacto (Tomo/Cadena/Hoja).'],
        5: ['Conjuros pacto suben a nivel 3'],
      }
    },
    'Mago': {
      armor: 'Sin armadura.',
      lvl: {
        1: ['Conjuros (INT)', 'Recuperación Arcana (1/día): recupera slots por nivel ≤ 5.', 'Libro de Conjuros: 6 conjuros + 3 trucos al inicio.'],
        2: ['Tradición Arcana (elige subclase)'],
        3: ['Conjuros nivel 2 disponibles'],
      }
    },
    'Monje': {
      armor: 'Sin armadura, sin escudo.',
      lvl: {
        1: ['Defensa sin Armadura: 10 + DES + SAB.', 'Artes Marciales: 1d4 con golpe sin armas o armas monje (sube a 1d6 en lv5).', 'Golpe sin armas con DES.'],
        2: ['Ki (= nivel): 3 técnicas iniciales — Flurry of Blows, Patient Defense, Step of the Wind.', 'Movimiento sin Armadura: +3 m (10 ft).'],
        3: ['Tradición Monástica (elige subclase)', 'Deflectar Proyectiles: reduce daño de proyectil a distancia.'],
        4: ['Caída Lenta: reduce daño por caída en 5 × nivel.'],
        5: ['Ataque Adicional', 'Golpe Aturdidor: gasta 1 Ki para aturdir hasta tu próximo turno (TS CON).'],
      }
    },
    'Paladín': {
      armor: 'Todas las armaduras + escudos.',
      lvl: {
        1: ['Sentido Divino (1+CAR-mod/desc. largo): detecta celestial/demonio/no-muerto en 18 m.', 'Manos Sanadoras: pool de 5×nivel PG para curar al toque.'],
        2: ['Conjuros (CAR)', 'Estilo de Combate', 'Castigo Divino: gasta slot para +2d8 daño radiante en ataque CaC (+1d8 contra no-muerto/demonio).'],
        3: ['Juramento Sagrado (elige subclase)', 'Salud Divina: inmune a enfermedad.'],
        5: ['Ataque Adicional'],
      }
    },
    'Pícaro': {
      armor: 'Armadura ligera.',
      lvl: {
        1: ['Experticia: 2 habilidades + Herr. Ladrón duplican PB.', 'Ataque Furtivo: +⌈nivel/2⌉d6 daño con arma sutil/a distancia, una vez por turno, con ventaja o aliado adyacente.', 'Jerga de Ladrón.'],
        2: ['Acción Astuta: acción bonus para Correr/Esconderse/Desencajarse.'],
        3: ['Arquetipo Pícaro (elige subclase)'],
        4: ['Mejora de característica'],
        5: ['Esquiva Sobrenatural: reacción para reducir a la mitad daño de ataque visible.'],
      }
    },
  };

  // Rasgos comunes de raza (lo esencial; más detalle vive en src/data/species.json)
  const RACE_TRAITS = {
    'Humano': ['+1 a todos los atributos (Estándar) o +1 a dos + dote + habilidad (Variante).', 'Idioma extra a elección.'],
    'Enano': ['Resistencia y ventaja en TS contra veneno.', 'Visión en la Oscuridad 18m.', 'Conocimiento de la piedra: bonificación doble en pruebas de Historia sobre piedra.', 'Entrenamiento de combate con hachas y martillos.'],
    'Elfo': ['Visión en la Oscuridad 18m.', 'Ventaja en TS contra Encantado, inmune a ser dormido mágicamente.', 'Reposo Élfico: 4 h de trance equivalen a 8 h de sueño.', 'Sentidos Agudos: competencia en Percepción.'],
    'Mediano': ['Suerte: re-tira los 1 en ataques, pruebas y TS.', 'Valiente: ventaja contra ser Asustado.', 'Agilidad de Mediano: puede pasar por casillas de criaturas más grandes.'],
    'Gnomo': ['Visión en la Oscuridad 18m.', 'Astucia Gnoma: ventaja en TS INT/SAB/CAR contra magia.'],
    'Semi-Elfo': ['+2 CAR + 1 a dos atributos a elección.', 'Visión en la Oscuridad 18m.', 'Ventaja contra Encantado, inmune a dormido mágicamente.', 'Competencia en 2 habilidades a elección.'],
    'Semi-Orco': ['+2 FUE, +1 CON.', 'Visión en la Oscuridad 18m.', 'Resistencia Feroz: cuando bajaría a 0 PG, queda en 1 (1/desc. largo).', 'Ataques Salvajes: en críticos CaC, +1 dado de daño del arma.', 'Competencia en Intimidar.'],
    'Tiefling': ['+1 INT, +2 CAR.', 'Visión en la Oscuridad 18m.', 'Resistencia infernal: resistencia a daño por fuego.', 'Legado infernal: Taumaturgia (truco). En lv3, Reprensión Infernal 1/largo. En lv5, Oscuridad 1/largo. Lanza con CAR.'],
    'Dracónido': ['+2 FUE, +1 CAR.', 'Linaje Dracónico: tipo de daño según linaje (fuego/frío/rayo/ácido/veneno).', 'Arma de Soplo (acción, recargable en desc. corto): cono o línea, 2d6 daño, TS DES o CON mitad.', 'Resistencia al daño de tu linaje.'],
  };

  // Inicializa raceMap más detallado leyendo de species.json si está cargado
  function getRaceTraits(raceId, subraceId) {
    // Primero intenta usar species.json (cargado por wizard)
    const wiz = window._wiz || {};
    if (wiz.species) {
      const race = wiz.species.find(r => r.id === raceId);
      if (race) {
        const sub = race.subraces?.find(s => s.id === subraceId);
        return [...(race.traits || []), ...(sub?.traits || [])];
      }
    }
    return RACE_TRAITS[raceId] || [];
  }

  function getBgFeature(bgId) {
    const wiz = window._wiz || {};
    if (wiz.backgrounds) {
      const bg = wiz.backgrounds.find(b => b.id === bgId);
      if (bg) return { name: bg.feature, desc: bg.featureDesc };
    }
    return null;
  }

  // ─── Lectura del estado del personaje ─────────────────────────
  function readChar() {
    const metas = document.querySelectorAll('.meta-value');
    const clsRaw = (metas[0]?.textContent || '').trim();
    const bg     = (metas[1]?.textContent || '').trim();
    const speciesRaw = (metas[2]?.textContent || '').trim();
    // Parse "Explorador 1 / Bárbaro 1"
    const classes = clsRaw.split('/').map(p => {
      const m = p.trim().match(/^(.+?)\s+(\d+)$/);
      return m ? { name: m[1].trim(), level: parseInt(m[2]) } : null;
    }).filter(Boolean);
    // Identificar raza base + subraza
    const raceId = inferRaceId(speciesRaw);
    return {
      classes,
      bg,
      speciesLabel: speciesRaw,
      raceId,
      subraceId: speciesRaw, // El "subraceId" en nuestra data es igual al label en el pill
      totalLevel: classes.reduce((s, c) => s + c.level, 0),
      ac: document.getElementById('statAC')?.textContent || '—',
      speed: document.getElementById('statSpeed')?.textContent || '—',
      rageActive: state.rageActive || false,
    };
  }

  function inferRaceId(label) {
    // El pill puede tener "Enano de Colinas" o "Humano Estándar" → mapea a raza base
    if (/^Enano/.test(label)) return 'Enano';
    if (/^Elfo|^Drow/.test(label)) return 'Elfo';
    if (/^Mediano/.test(label)) return 'Mediano';
    if (/^Humano/.test(label)) return 'Humano';
    if (/^Gnomo/.test(label)) return 'Gnomo';
    if (/^Semi-Elfo/.test(label)) return 'Semi-Elfo';
    if (/^Semi-Orco/.test(label)) return 'Semi-Orco';
    if (/Tiefling/.test(label)) return 'Tiefling';
    if (/Drac/.test(label)) return 'Dracónido';
    return '';
  }

  // ─── Render ───────────────────────────────────────────────────
  const css = {
    section: 'background:rgba(var(--panel-rgb),0.4);border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin-bottom:10px;',
    title: 'font-family:Cinzel,serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);margin-bottom:6px;display:flex;align-items:center;gap:8px;',
    pill: 'display:inline-block;padding:1px 8px;border:1px solid var(--gold-dark);border-radius:10px;font-size:9px;color:var(--gold);background:rgba(var(--panel-rgb),0.5);font-family:Cinzel,serif;letter-spacing:1px;',
    list: 'list-style:none;padding-left:14px;margin:4px 0 0;color:var(--text-secondary);font-family:\'IM Fell English\',serif;font-size:13px;line-height:1.55;',
    item: 'margin-bottom:4px;position:relative;',
    bullet: 'position:absolute;left:-12px;color:var(--gold-dark);',
    hint: 'font-size:10px;color:var(--text-muted);font-style:italic;font-family:\'IM Fell English\',serif;margin-top:6px;',
  };

  function _section(title, pill, items) {
    if (!items || !items.length) return '';
    return `<div style="${css.section}">
      <div style="${css.title}">
        <span>${title}</span>
        ${pill ? `<span style="${css.pill}">${pill}</span>` : ''}
      </div>
      <ul style="${css.list}">
        ${items.map(t => `<li style="${css.item}"><span style="${css.bullet}">◆</span>${t}</li>`).join('')}
      </ul>
    </div>`;
  }

  // ─── Combat context ───────────────────────────────────────────
  function renderCombatContext() {
    const host = document.getElementById('combatContext');
    if (!host) return;
    const c = readChar();
    let html = '';

    // Sección por cada clase: features hasta el nivel del personaje
    for (const cls of c.classes) {
      const feats = CLASS_FEATURES[cls.name];
      if (!feats) continue;
      const items = [];
      if (feats.armor) items.push(`<strong style="color:var(--gold-light);">Armadura:</strong> ${feats.armor}`);
      for (let lv = 1; lv <= Math.min(cls.level, 5); lv++) {
        if (feats.lvl[lv]) {
          feats.lvl[lv].forEach(f => items.push(`<span style="color:var(--gold-dark);font-family:Cinzel,serif;font-size:9px;letter-spacing:1px;">L${lv}</span> ${f}`));
        }
      }
      html += _section(cls.name, `Nv ${cls.level}`, items);
    }

    // Estado actual (CA, vel, furia)
    const stateItems = [
      `<strong style="color:var(--gold-light);">CA:</strong> ${c.ac}`,
      `<strong style="color:var(--gold-light);">Velocidad:</strong> ${c.speed}m`,
    ];
    if (c.rageActive) {
      stateItems.unshift(`<strong style="color:#e74c3c;">🔥 EN FURIA</strong> — +2 daño CaC, resistencia física, sin conjuros, ventaja en TS y pruebas de FUE.`);
    }
    html += _section('Estado actual', null, stateItems);

    host.innerHTML = html || `<div style="${css.hint}text-align:center;padding:20px;">Crea un personaje para ver la información de combate.</div>`;
  }

  // ─── Traits context ───────────────────────────────────────────
  function renderTraitsContext() {
    const host = document.getElementById('traitsContext');
    if (!host) return;
    const c = readChar();
    let html = '';

    // Raza
    if (c.raceId) {
      const traits = getRaceTraits(c.raceId, c.subraceId);
      if (traits.length) html += _section(c.speciesLabel || c.raceId, 'Especie', traits);
    }

    // Clases
    for (const cls of c.classes) {
      const feats = CLASS_FEATURES[cls.name];
      if (!feats) continue;
      const items = [];
      for (let lv = 1; lv <= Math.min(cls.level, 5); lv++) {
        if (feats.lvl[lv]) {
          feats.lvl[lv].forEach(f => items.push(`<span style="color:var(--gold-dark);font-family:Cinzel,serif;font-size:9px;letter-spacing:1px;">L${lv}</span> ${f}`));
        }
      }
      if (items.length) html += _section(cls.name, `Nv ${cls.level}`, items);
    }

    // Trasfondo
    if (c.bg) {
      const feat = getBgFeature(c.bg);
      if (feat) html += _section(c.bg, 'Trasfondo', [`<strong style="color:var(--gold-light);">${feat.name}</strong> — ${feat.desc}`]);
    }

    host.innerHTML = html || `<div style="${css.hint}text-align:center;padding:20px;">Crea un personaje para ver sus rasgos automáticos.</div>`;
  }

  // ─── Inyectar contenedores ────────────────────────────────────
  function injectContainers() {
    // Combate: antes de combatNotesCE (notas de combate)
    const combatNotes = document.getElementById('combatNotesCE');
    if (combatNotes && !document.getElementById('combatContext')) {
      const wrap = document.createElement('div');
      wrap.id = 'combatContext';
      wrap.className = 'character-context';
      // Insertar antes del padre .card del combatNotesCE
      const card = combatNotes.closest('.card');
      const parent = card?.parentElement;
      if (parent && card) parent.insertBefore(wrap, card);
    }
    // Rasgos: antes de traitsExtra
    const traitsBox = document.getElementById('traitsExtra');
    if (traitsBox && !document.getElementById('traitsContext')) {
      const wrap = document.createElement('div');
      wrap.id = 'traitsContext';
      wrap.className = 'character-context';
      const card = traitsBox.closest('.card');
      const parent = card?.parentElement;
      if (parent && card) parent.insertBefore(wrap, card);
    }
  }

  // ─── Hook auto-refresh ────────────────────────────────────────
  function setupObservers() {
    const metas = document.querySelectorAll('.meta-value');
    metas.forEach(m => {
      new MutationObserver(refresh).observe(m, { childList: true, characterData: true, subtree: true });
    });
    // Refrescar al cambiar de pestaña
    document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => setTimeout(refresh, 100)));
    // Cuando se activa/desactiva Furia
    document.addEventListener('click', e => {
      if (e.target.closest('#rageBtn, #overlayRageBtn')) setTimeout(refresh, 200);
    });
  }

  function refresh() {
    renderCombatContext();
    renderTraitsContext();
  }

  // ─── Init ─────────────────────────────────────────────────────
  function init() {
    injectContainers();
    setupObservers();
    // Esperar un poco para que el wizard/loadState haya inyectado los valores
    setTimeout(refresh, 300);
    setTimeout(refresh, 1500);
  }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.refreshCharacterContext = refresh;
