import { state } from '../state.js';
import { getMod, getProfBonus, renderSpellStats } from './attributes.js';
import { showToast, addCombatLog } from './toast-log.js';
import { escapeAttr } from './utils.js';
import { computeSpellSlots, computePactSlots, _syncPactSlots, renderSpellSlots } from './spell-slots.js';

let _spellFilter = 'all';
const SPELL_PRESETS = {
  'Bárbaro':  { caster:false }, 'Guerrero': { caster:false },
  'Monje':    { caster:false }, 'Pícaro':   { caster:false },
  'Bardo': {
    caster:true, attr:'CAR', dc:'8 + comp. + mod. CAR',
    cantrips:[
      {name:'Burla Viciosa',   school:'Encantamiento', castTime:'1 acción',      range:'18m',    components:'V',     duration:'Instantáneo',  concentration:false, desc:'TS de SAB. Fallo: 1d4 psíquico y desventaja en su próxima tirada de ataque. +1d4 a nv.5/11/17.', save:'WIS', attack:null},
      {name:'Luz',             school:'Evocación',     castTime:'1 acción',      range:'Toque',  components:'V, M',  duration:'1 hora',       concentration:false, desc:'Objeto emite luz brillante 6m, tenue 6m más. Solo un objeto a la vez.', save:null, attack:null},
      {name:'Amigos',          school:'Encantamiento', castTime:'1 acción',      range:'Personal',components:'S, M', duration:'Conc., 1 min', concentration:true,  desc:'Ventaja en todas las pruebas de CAR contra una criatura no hostil. Al terminar, sabe que fue manipulada.', save:null, attack:null},
      {name:'Prestidigitación',school:'Transmutación', castTime:'1 acción',      range:'3m',     components:'V, S',  duration:'Hasta 1 hora', concentration:false, desc:'Efectos mágicos menores: limpiar, colorear, encender/apagar, enfriar/calentar, crear olor o símbolo.', save:null, attack:null},
      {name:'Ilusión Menor',   school:'Ilusión',       castTime:'1 acción',      range:'9m',     components:'S, M',  duration:'1 min',        concentration:false, desc:'Crea un sonido o imagen inmóvil. Investigar con INT (CD de conjuro) para verla como ilusión.', save:null, attack:null},
      {name:'Mensaje',         school:'Transmutación', castTime:'1 acción',      range:'36m',    components:'V, S, M',duration:'1 ronda',     concentration:false, desc:'Susurras a una criatura que puede responderte telepáticamente. Pasa por muros delgados.', save:null, attack:null},
    ],
    spells:[
      {name:'Curar Heridas',        level:1, school:'Evocación',     castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cura 1d8 + mod. CAR PG. Por ranura extra: +1d8.', save:null, attack:null},
      {name:'Palabra de Curación',  level:1, school:'Evocación',     castTime:'1 acción bonus', range:'18m',     components:'V',      duration:'Instantáneo',  concentration:false, desc:'Un aliado visible recupera 1d4 + mod. CAR PG. Por ranura extra: +1d4.', save:null, attack:null},
      {name:'Encantar Persona',     level:1, school:'Encantamiento', castTime:'1 acción',       range:'9m',      components:'V, S',   duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: hechizado, te considera amigo. Nueva TS al ser dañado. Por ranura extra: +1 objetivo.', save:'WIS', attack:null},
      {name:'Susurros Disonantes',  level:1, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V',      duration:'Instantáneo',  concentration:false, desc:'TS de SAB. Fallo: 3d6 psíquico y reacción de huida (usa reacción). Éxito: mitad, sin huida. +3d6 por ranura extra.', save:'WIS', attack:null},
      {name:'Imagen Silenciosa',    level:1, school:'Ilusión',       castTime:'1 acción',       range:'18m',     components:'V, S, M',duration:'Conc., 10 min',concentration:true,  desc:'Objeto, criatura o fenómeno ilusorio de hasta 5×5×5 pies. Sin sonido. Interacción física la revela.', save:null, attack:null},
      {name:'Sueño',                level:1, school:'Encantamiento', castTime:'1 acción',       range:'27m',     components:'V, S, M',duration:'1 min',        concentration:false, desc:'Tira 5d8: PG totales para dormir criaturas (de menor a mayor PG actual). Por ranura extra: +2d8.', save:null, attack:null},
      {name:'Detectar Magia',       level:1, school:'Adivinación',   castTime:'1 acción',       range:'Personal',components:'V, S',   duration:'Conc., 10 min',concentration:true,  desc:'Percibes la presencia de magia en 9m. Puedes ver el aura y la escuela de cualquier efecto mágico.', save:null, attack:null},
      {name:'Risa Histérica de Tasha',level:1,school:'Encantamiento',castTime:'1 acción',       range:'9m',      components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'TS de SAB. Fallo: incapacitado y derribado, riendo. Nueva TS al recibir daño o al final de su turno.', save:'WIS', attack:null},
      {name:'Invisibilidad',        level:2, school:'Ilusión',       castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'Criatura invisible hasta atacar o lanzar un conjuro. Por ranura extra: +1 objetivo.', save:null, attack:null},
      {name:'Sugestión',            level:2, school:'Encantamiento', castTime:'1 acción',       range:'9m',      components:'V, M',   duration:'Conc., 8 h',   concentration:true,  desc:'TS de SAB. Fallo: sigue una sugestión razonable. Termina si la orden causaría daño directo.', save:'WIS', attack:null},
      {name:'Menor Restauración',   level:2, school:'Abjuración',   castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Elimina una enfermedad o una condición: cegado, sordo, paralizado o envenenado.', save:null, attack:null},
      {name:'Silencio',             level:2, school:'Ilusión',       castTime:'1 acción',       range:'36m',     components:'V, S',   duration:'Conc., 10 min',concentration:true,  desc:'Esfera de 6m sin sonido. Nada dentro puede emitir sonido. Inmune a daño sónico. Impide conjuros con componente V.', save:null, attack:null},
      {name:'Patrón Hipnótico',     level:3, school:'Ilusión',       castTime:'1 acción',       range:'36m',     components:'S, M',   duration:'Conc., 1 min', concentration:true,  desc:'Cubo 9m. TS de SAB. Fallo: hechizado e incapacitado. Nueva TS al recibir daño.', save:'WIS', attack:null},
      {name:'Disipar Magia',        level:3, school:'Abjuración',   castTime:'1 acción',       range:'36m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Termina efectos mágicos de nivel 3 o inferior automáticamente. Para mayor nivel: INT vs. CD (10 + nivel del conjuro).', save:null, attack:null},
      {name:'Lenguas',              level:3, school:'Adivinación',   castTime:'1 acción',       range:'Toque',   components:'V, M',   duration:'1 h',          concentration:false, desc:'El objetivo puede comprender y hablar cualquier idioma.', save:null, attack:null},
      {name:'Polimorfizar',         level:4, school:'Transmutación', castTime:'1 acción',       range:'18m',     components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: se transforma en una bestia. PG de la forma = PG de la bestia; si llegan a 0 revierte.', save:'WIS', attack:null},
      {name:'Confusión',            level:4, school:'Encantamiento', castTime:'1 acción',       range:'27m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Esfera 3m. TS de SAB. Fallo: acción aleatoria cada turno (1d10). Por ranura extra: radio +1.5m.', save:'WIS', attack:null},
      {name:'Dominar Persona',      level:5, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'TS de SAB. Fallo: hechizado, obedece tus órdenes. Nueva TS al recibir daño. Por ranura extra: duración mayor.', save:'WIS', attack:null},
      {name:'Curación Masiva',        level:5, school:'Evocación',     castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cura 3d8 + mod. CAR PG a hasta 6 criaturas visibles. Por ranura extra: +1d8.', save:null, attack:null},
      {name:'Sugestión Masiva',       level:6, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, M',   duration:'24 horas',     concentration:false, desc:'Hasta 12 criaturas hacen TS de SAB. Fallo: siguen una sugestión razonable. Ranura 7: 10 días. Ranura 8: 30 días. Ranura 9: 1 año.', save:'WIS', attack:null},
      {name:'Ver la Verdad',          level:6, school:'Adivinación',   castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Visión verdadera (18m): criaturas invisibles, formas verdaderas de cambiaformas y el Plano Etéreo.', save:null, attack:null},
      {name:'Proyección de Imagen',   level:7, school:'Ilusión',       castTime:'1 acción',       range:'800 km',  components:'V, S, M',duration:'Conc., 1 día', concentration:true,  desc:'Doble ilusorio en cualquier lugar conocido. Ves y hablas a través de él. Termina si el doble recibe daño.', save:null, attack:null},
      {name:'Cárcel de Fuerza',       level:7, school:'Evocación',     castTime:'1 acción',       range:'27m',     components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Jaula de fuerza mágica de hasta 3×3×3m o esfera de 3m de radio. Nada puede atravesarla. Inmune a Disipar Magia.', save:null, attack:null},
      {name:'Dominar Monstruo',       level:8, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: hechizado, obedece órdenes. Nueva TS al recibir daño. Funciona contra cualquier tipo de criatura.', save:'WIS', attack:null},
      {name:'Palabra de Poder: Aturdir',level:8,school:'Encantamiento',castTime:'1 acción',       range:'18m',     components:'V',      duration:'Hasta 1 min',  concentration:false, desc:'Criatura con ≤150 PG actuales queda aturdida. TS de CON al inicio de su turno para terminar el efecto.', save:'CON', attack:null},
      {name:'Polimorfia Verdadera',   level:9, school:'Transmutación', castTime:'1 acción',       range:'9m',      components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: transforma en criatura de cualquier CR. Si se concentra 1 h completa, la transformación es permanente.', save:'WIS', attack:null},
      {name:'Palabra de Poder: Matar',level:9, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V',      duration:'Instantáneo',  concentration:false, desc:'Criatura con ≤100 PG actuales muere instantáneamente. Sin tirada de salvación.', save:null, attack:null},
      {name:'Presciencia',            level:9, school:'Adivinación',   castTime:'1 minuto',       range:'Toque',   components:'V, S, M',duration:'8 horas',      concentration:false, desc:'El objetivo tiene ventaja en tiradas de ataque, pruebas y TS, y los ataques en su contra tienen desventaja.', save:null, attack:null},
    ],
    slots:{1:2,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  },
  'Clérigo': {
    caster:true, attr:'SAB', dc:'8 + comp. + mod. SAB',
    cantrips:[
      {name:'Llama Sagrada',   school:'Evocación',     castTime:'1 acción', range:'18m',   components:'V, S',  duration:'Instantáneo',  concentration:false, desc:'TS de DES. Fallo: 1d8 radiante. No se beneficia de cobertura. +1d8 a nv.5/11/17.', save:'DEX', attack:null},
      {name:'Guía',            school:'Adivinación',   castTime:'1 acción', range:'Toque', components:'V, S',  duration:'Conc., 1 min', concentration:true,  desc:'El objetivo añade 1d4 a una prueba de habilidad antes de que termine la concentración.', save:null, attack:null},
      {name:'Taumaturgia',     school:'Transmutación', castTime:'1 acción', range:'9m',    components:'V',     duration:'Hasta 1 min',  concentration:false, desc:'Efectos menores: voz retumba, llamas parpadean, suelo tiembla, puertas se abren/cierran.', save:null, attack:null},
      {name:'Resistencia',     school:'Abjuración',    castTime:'1 acción', range:'Toque', components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'El objetivo añade 1d4 a una tirada de salvación antes de que termine la concentración.', save:null, attack:null},
      {name:'Toque Escalofriante',school:'Nigromancia',castTime:'1 acción', range:'Toque', components:'V, S',  duration:'1 ronda',      concentration:false, desc:'Ataque de conjuro CaC. Impacto: 1d8 necrótico. No puede recuperar PG hasta tu próximo turno. +1d8 a nv.5/11/17.', save:null, attack:'melee'},
    ],
    spells:[
      {name:'Curar Heridas',      level:1, school:'Evocación',     castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cura 1d8 + mod. SAB PG. Por ranura extra: +1d8.', save:null, attack:null},
      {name:'Bendición',          level:1, school:'Encantamiento', castTime:'1 acción',       range:'9m',      components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Hasta 3 criaturas: +1d4 a tiradas de ataque y TS. Por ranura extra: +1 objetivo.', save:null, attack:null},
      {name:'Santuario',          level:1, school:'Abjuración',    castTime:'1 acción bonus', range:'9m',      components:'V, S, M',duration:'1 min',        concentration:false, desc:'Atacantes hacen TS de SAB. Fallo: eligen otro objetivo o pierden el ataque. Termina si el objetivo ataca.', save:'WIS', attack:null},
      {name:'Escudo de la Fe',    level:1, school:'Abjuración',    castTime:'1 acción bonus', range:'18m',     components:'V, S, M',duration:'Conc., 10 min',concentration:true,  desc:'+2 a la CA de la criatura objetivo durante la duración.', save:null, attack:null},
      {name:'Palabra de Curación',level:1, school:'Evocación',     castTime:'1 acción bonus', range:'18m',     components:'V',      duration:'Instantáneo',  concentration:false, desc:'Un aliado visible recupera 1d4 + mod. SAB PG. Por ranura extra: +1d4.', save:null, attack:null},
      {name:'Herida Infectada',   level:1, school:'Nigromancia',   castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Ataque de conjuro CaC. Impacto: 2d6 necrótico. TS de CON o el objetivo pierde 2d6 PG más al inicio de su turno. Por ranura extra: +1d6.', save:'CON', attack:'melee'},
      {name:'Menor Restauración', level:2, school:'Abjuración',    castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Elimina una enfermedad o condición: cegado, sordo, paralizado o envenenado.', save:null, attack:null},
      {name:'Oración de Curación',level:2, school:'Evocación',     castTime:'10 minutos',     range:'9m',      components:'V',      duration:'Instantáneo',  concentration:false, desc:'Hasta 6 criaturas visibles recuperan 2d8 + mod. SAB PG. Por ranura extra: +1d8.', save:null, attack:null},
      {name:'Rayo Espiritual',    level:2, school:'Evocación',     castTime:'1 acción bonus', range:'18m',     components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'Hacha de energía radiante: ataque de conjuro CaC (alcance 18m). 1d6 + mod. SAB radiante. Se mueve como acción bonus. +1d6 a nv.5/11/17.', save:null, attack:'melee'},
      {name:'Silencio',           level:2, school:'Ilusión',       castTime:'1 acción',       range:'36m',     components:'V, S',   duration:'Conc., 10 min',concentration:true,  desc:'Esfera de 6m sin sonido. Impide conjuros con componente verbal.', save:null, attack:null},
      {name:'Revivificar',        level:3, school:'Nigromancia',   castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Resucita a una criatura que murió en el último minuto con 1 PG. No funciona si el alma no puede o no quiere regresar.', save:null, attack:null},
      {name:'Luz del Día',        level:3, school:'Evocación',     castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'1 hora',       concentration:false, desc:'Objeto emite luz brillante de 18m (36m tenue). Disipa oscuridad mágica de nivel ≤3.', save:null, attack:null},
      {name:'Protección vs Energía',level:3,school:'Abjuración',   castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'Conc., 1 h',   concentration:true,  desc:'Resistencia al tipo de daño elegido (ácido, frío, fuego, relámpago o trueno).', save:null, attack:null},
      {name:'Libertad de Movimiento',level:4,school:'Abjuración',  castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Ignora terreno difícil. No puede ser restringido por efectos mágicos. Puede usar todo su movimiento estando bajo agua.', save:null, attack:null},
      {name:'Mayor Restauración', level:5, school:'Abjuración',    castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Elimina un efecto de reducción de atributo, maldición, encantamiento, petrificación o reducción de PG máx.', save:null, attack:null},
      {name:'Curación Masiva',    level:5, school:'Evocación',     castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cura 3d8 + mod. SAB PG a hasta 6 criaturas visibles. Por ranura extra: +1d8.', save:null, attack:null},
      {name:'Barrera de Cuchillas', level:6, school:'Conjuración',   castTime:'1 acción',       range:'27m',     components:'V, S',   duration:'Conc., 10 min',concentration:true,  desc:'Pared 30×3×1.5m de cuchillas. Al pasar: TS de DES o 6d10 cortante (éxito: mitad). +1d10 por ranura extra.', save:'DEX', attack:null},
      {name:'Curar',               level:6, school:'Evocación',     castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cura 70 PG. Elimina ceguera, sordera y enfermedades. No funciona en no-muertos ni constructos. Por ranura extra: +10 PG.', save:null, attack:null},
      {name:'Banquete de Héroes',  level:6, school:'Conjuración',   castTime:'10 minutos',     range:'9m',      components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Hasta 12 criaturas cenan: curan 2d10 PG, inmunidad a veneno y miedo, ventaja en TS de SAB.', save:null, attack:null},
      {name:'Ver la Verdad',       level:6, school:'Adivinación',   castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Visión verdadera (18m): criaturas invisibles, formas verdaderas de cambiaformas y el Plano Etéreo.', save:null, attack:null},
      {name:'Palabra Divina',      level:7, school:'Evocación',     castTime:'1 acción bonus', range:'9m',      components:'V',      duration:'Instantáneo',  concentration:false, desc:'Criaturas según PG: ≤20 muere, ≤30 cegada 1h, ≤40 sorda 10 min, ≤50 aturdida 1 min. Extraplanares: TS de CAR o expulsados.', save:'CHA', attack:null},
      {name:'Resurrección',        level:7, school:'Nigromancia',   castTime:'1 hora',         range:'Toque',   components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Resucita criatura muerta hace ≤100 años con plenos PG. No funciona si el alma no puede o no quiere volver.', save:null, attack:null},
      {name:'Tormenta de Fuego',   level:7, school:'Evocación',     castTime:'1 acción',       range:'45m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Área de hasta 10 cubos de 3m. TS de DES: 7d10 fuego (éxito: mitad). Plantas no mágicas mueren. +1d10 por ranura extra.', save:'DEX', attack:null},
      {name:'Campo de Antimagia',  level:8, school:'Abjuración',    castTime:'1 acción',       range:'Personal',components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'Esfera de 3m que te acompaña. Dentro: conjuros y efectos mágicos no funcionan.', save:null, attack:null},
      {name:'Control del Clima',   level:8, school:'Transmutación', castTime:'10 minutos',     range:'Personal',components:'V, S, M',duration:'Conc., 8 h',   concentration:true,  desc:'Controlas condiciones climáticas en 7 km. Requiere espacio exterior o ventanas.', save:null, attack:null},
      {name:'Terremoto',           level:8, school:'Evocación',     castTime:'1 acción',       range:'150m',    components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Terremoto radio 30m. TS de CON: concentración interrumpida. TS de DES: tumbado. Grietas y colapso de estructuras.', save:'CON', attack:null},
      {name:'Sanar en Masa',       level:9, school:'Evocación',     castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Hasta 6 criaturas visibles recuperan todos sus PG. También elimina ceguera, sordera y enfermedades.', save:null, attack:null},
      {name:'Resurrección Verdadera',level:9,school:'Nigromancia',  castTime:'1 hora',         range:'Toque',   components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Resucita criatura muerta hace ≤200 años. Restaura el cuerpo completo aunque no quede nada. No funciona si fue matada por Deseo.', save:null, attack:null},
    ],
    slots:{1:2,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  },
  'Druida': {
    caster:true, attr:'SAB', dc:'8 + comp. + mod. SAB',
    cantrips:[
      {name:'Producir Llama',  school:'Conjuración',   castTime:'1 acción', range:'Personal o 9m', components:'V, S', duration:'10 min',       concentration:false, desc:'Llama en mano: luz 3m brillante, 3m tenue. Como ataque ranged: 1d8 fuego. +1d8 a nv.5/11/17.', save:null, attack:'ranged'},
      {name:'Guía',            school:'Adivinación',   castTime:'1 acción', range:'Toque',         components:'V, S', duration:'Conc., 1 min', concentration:true,  desc:'El objetivo añade 1d4 a una prueba de habilidad antes de que termine la concentración.', save:null, attack:null},
      {name:'Druidcraft',      school:'Transmutación', castTime:'1 acción', range:'4.5m',          components:'V, S', duration:'Instantáneo',  concentration:false, desc:'Efectos naturales menores: predecir el tiempo, hacer florecer una semilla, crear un olor suave, etc.', save:null, attack:null},
      {name:'Látigo de Zarzas',school:'Transmutación', castTime:'1 acción', range:'9m',            components:'V, S, M',duration:'Instantáneo', concentration:false, desc:'Ataque de conjuro CaC (alcance 9m). 1d6 perforante y jalado 3m hacia ti. +1d6 a nv.5/11/17.', save:null, attack:'melee'},
      {name:'Resistencia',     school:'Abjuración',    castTime:'1 acción', range:'Toque',         components:'V, S, M',duration:'Conc., 1 min',concentration:true,  desc:'El objetivo añade 1d4 a una tirada de salvación antes de que termine la concentración.', save:null, attack:null},
    ],
    spells:[
      {name:'Curar Heridas',       level:1, school:'Evocación',   castTime:'1 acción',       range:'Toque',    components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cura 1d8 + mod. SAB PG. Por ranura extra: +1d8.', save:null, attack:null},
      {name:'Enredar',             level:1, school:'Conjuración', castTime:'1 acción',       range:'27m',      components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'Cuadrado 6×6m. TS de FUE. Fallo: restringido (vel. 0). Terreno difícil para todos.', save:'STR', attack:null},
      {name:'Hablar con Animales', level:1, school:'Adivinación', castTime:'1 acción',       range:'Personal', components:'V, S',   duration:'10 min',       concentration:false, desc:'Comprendes y hablas con bestias. Sus respuestas dependen de su inteligencia y conocimiento.', save:null, attack:null},
      {name:'Ola de Truenos',      level:1, school:'Evocación',   castTime:'1 acción',       range:'Personal', components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cubo 4.5m desde ti. TS de CON. Fallo: 2d8 trueno y empujado 3m. Éxito: mitad. Trueno fuerte audible 90m. +2d8 por ranura extra.', save:'CON', attack:null},
      {name:'Caída de Hojas',      level:1, school:'Transmutación',castTime:'1 reacción',    range:'18m',      components:'V, M',   duration:'1 min',        concentration:false, desc:'Hasta 5 criaturas que caen descienden 18m/ronda y no reciben daño por caída.', save:null, attack:null},
      {name:'Nube de Niebla',      level:1, school:'Conjuración', castTime:'1 acción',       range:'36m',      components:'V, S',   duration:'Conc., 1 h',   concentration:true,  desc:'Esfera de niebla de 6m de radio. El área queda totalmente oscurecida.', save:null, attack:null},
      {name:'Pasar sin Rastro',    level:2, school:'Abjuración',  castTime:'1 acción',       range:'Personal', components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'+10 a pruebas de Sigilo. No puede ser rastreado por medios no mágicos.', save:null, attack:null},
      {name:'Crecimiento de Espinas',level:2,school:'Transmutación',castTime:'1 acción',     range:'27m',      components:'V, S, M',duration:'Conc., 10 min',concentration:true,  desc:'Área 6m radio de terreno difícil y espinas. 2d4 perforante por cada 1.5m que se recorre.', save:null, attack:null},
      {name:'Llamar Rayo',         level:3, school:'Conjuración', castTime:'1 acción',       range:'36m',      components:'V, S',   duration:'Conc., 10 min',concentration:true,  desc:'Crea nube de tormenta. Cada turno, como acción: rayo en punto a 27m de ti. TS de DES: 3d10 relámpago (éxito: mitad). +1d10 por ranura extra.', save:'DEX', attack:null},
      {name:'Viento Cortante',     level:3, school:'Evocación',   castTime:'1 acción',       range:'Personal', components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'Línea 9×0.3m. TS de FUE. Fallo: 3d8 cortante y tumbado. Terreno difícil en la zona. +1d8 por ranura extra.', save:'STR', attack:null},
      {name:'Polimorfizar',        level:4, school:'Transmutación',castTime:'1 acción',       range:'18m',      components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: se transforma en una bestia. Sus PG son los de la bestia; si llegan a 0 revierte.', save:'WIS', attack:null},
      {name:'Control del Clima',   level:8, school:'Transmutación',castTime:'10 minutos',     range:'Personal', components:'V, S, M',duration:'Conc., 8 h',   concentration:true,  desc:'Controlas condiciones climáticas en 7 km. Requiere espacio exterior o ventanas.', save:null, attack:null},
      {name:'Mayor Restauración',  level:5, school:'Abjuración',  castTime:'1 acción',       range:'Toque',    components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Elimina efecto de reducción de atributo, maldición, encantamiento, petrificación o reducción de PG máx.', save:null, attack:null},
      {name:'Plaga de Insectos',      level:5, school:'Conjuración',   castTime:'1 acción',       range:'90m',      components:'V, S, M',duration:'Conc., 10 min',concentration:true,  desc:'Esfera 6m de langostas. Terreno difícil. Al entrar o iniciar turno: TS de CON o 4d10 perforante. +1d10 por ranura extra.', save:'CON', attack:null},
      {name:'Rayo Solar',            level:6, school:'Evocación',     castTime:'1 acción',       range:'Personal', components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Línea 18×1.5m de luz radiante. TS de CON: 6d8 radiante (éxito: mitad), cegado si falla. Cada turno: rayo como acción. +1d8 por ranura extra.', save:'CON', attack:null},
      {name:'Muro de Espinas',       level:6, school:'Conjuración',   castTime:'1 acción',       range:'27m',      components:'V, S, M',duration:'Conc., 10 min',concentration:true,  desc:'Pared 18×3×1.5m de zarzas. Al cruzar: TS de DES o 7d8 perforante (éxito: mitad). +1d8 por ranura extra.', save:'DEX', attack:null},
      {name:'Desplazamiento por Plantas',level:6,school:'Conjuración',castTime:'1 acción',       range:'Toque',    components:'V, S',   duration:'1 ronda',      concentration:false, desc:'Entras en una planta en tu espacio y sales de otra planta del mismo tamaño o mayor en distancia ilimitada.', save:null, attack:null},
      {name:'Tormenta de Fuego',     level:7, school:'Evocación',     castTime:'1 acción',       range:'45m',      components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Área de hasta 10 cubos de 3m. TS de DES: 7d10 fuego (éxito: mitad). Plantas no mágicas mueren. +1d10 por ranura extra.', save:'DEX', attack:null},
      {name:'Inversión de la Gravedad',level:7,school:'Transmutación',castTime:'1 acción',       range:'30m',      components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Revierte la gravedad en cilindro 30m radio y 30m alto. Criaturas sin suelo sólido caen hacia arriba (4d6 impacto al techo).', save:'DEX', attack:null},
      {name:'Regenerar',             level:7, school:'Transmutación', castTime:'1 minuto',       range:'Toque',    components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Objetivo: 4d8+15 PG y regenera 1 PG al inicio de cada turno durante 1 hora. Miembros cercenados vuelven a crecer (manos: 2 min, piernas: 4 días).', save:null, attack:null},
      {name:'Formas Animales',       level:8, school:'Transmutación', castTime:'1 acción',       range:'9m',       components:'V, S',   duration:'Conc., 24 h',  concentration:true,  desc:'Transforma hasta 10 aliados voluntarios en bestias CR 4 o menos por 24 h. Conservan PG; si los pierden, revierten.', save:null, attack:null},
      {name:'Terremoto',             level:8, school:'Evocación',     castTime:'1 acción',       range:'150m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Terremoto radio 30m. TS de CON: concentración interrumpida. TS de DES: tumbado. Grietas y colapso de estructuras.', save:'CON', attack:null},
      {name:'Tormenta de Venganza',  level:9, school:'Conjuración',   castTime:'1 acción',       range:'Personal', components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'Maelstrom de vientos, relámpagos, lluvia ácida y granizo en radio 180m. Efectos devastadores múltiples cada turno.', save:'CON', attack:null},
      {name:'Tormenta de Estrellas', level:9, school:'Evocación',     castTime:'1 acción',       range:'90m',      components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Lluvia de meteoros en radio 18m. TS de DES: 2d6 fuego + 2d6 impacto (éxito: mitad). Luz brillante 18m. +1d6 de cada tipo por ranura extra.', save:'DEX', attack:null},
    ],
    slots:{1:2,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  },
  'Explorador': {
    caster:true, attr:'SAB', dc:'8 + comp. + mod. SAB',
    cantrips:[],
    spells:[
      {name:'Marca del Cazador',    level:1, school:'Adivinación', castTime:'1 acción bonus', range:'27m',      components:'V',      duration:'Conc., 1 h',   concentration:true,  desc:'+1d6 daño en ataques contra el objetivo. Ventaja en PER/SUP para rastrearlo. Al morir: marcar otro. Ranura 3: 8 h. Ranura 5: 24 h.', save:null, attack:null},
      {name:'Enredar',              level:1, school:'Conjuración', castTime:'1 acción',       range:'27m',      components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'Cuadrado 6×6m. TS de FUE. Fallo: restringido. Terreno difícil para todos.', save:'STR', attack:null},
      {name:'Absorber Elementos',   level:1, school:'Abjuración',  castTime:'1 reacción',     range:'Personal', components:'S',      duration:'1 ronda',      concentration:false, desc:'Reacción a daño elemental (ácido, frío, fuego, relámpago, trueno): resistencia hasta tu próximo turno. Siguiente ataque CaC: +1d6 del mismo tipo.', save:null, attack:null},
      {name:'Nube de Niebla',       level:1, school:'Conjuración', castTime:'1 acción',       range:'36m',      components:'V, S',   duration:'Conc., 1 h',   concentration:true,  desc:'Esfera de niebla de 6m de radio. El área queda totalmente oscurecida.', save:null, attack:null},
      {name:'Caída de Hojas',       level:1, school:'Transmutación',castTime:'1 reacción',    range:'18m',      components:'V, M',   duration:'1 min',        concentration:false, desc:'Hasta 5 criaturas que caen descienden 18m/ronda y no reciben daño por caída.', save:null, attack:null},
      {name:'Pasar sin Rastro',     level:2, school:'Abjuración',  castTime:'1 acción',       range:'Personal', components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'+10 a pruebas de Sigilo. No puede ser rastreado por medios no mágicos.', save:null, attack:null},
      {name:'Protección vs Veneno', level:2, school:'Abjuración',  castTime:'1 acción',       range:'Toque',    components:'V, S',   duration:'1 hora',       concentration:false, desc:'Neutraliza un veneno activo. Durante 1 h: ventaja en TS vs. veneno y resistencia a daño venenoso.', save:null, attack:null},
      {name:'Localizar Animales',   level:2, school:'Adivinación', castTime:'1 acción',       range:'Personal', components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'Detectas la dirección de una especie de animal o planta a 7.5 km (5 km en ciudad).', save:null, attack:null},
      {name:'Silencio',             level:2, school:'Ilusión',     castTime:'1 acción',       range:'36m',      components:'V, S',   duration:'Conc., 10 min',concentration:true,  desc:'Esfera de 6m sin sonido. Impide conjuros con componente verbal.', save:null, attack:null},
      {name:'Conjurar Animales',    level:3, school:'Conjuración', castTime:'1 acción',       range:'18m',      components:'V, S',   duration:'Conc., 1 h',   concentration:true,  desc:'Convoca bestias CR ≤ 2 (o varias de CR menor). Obedecen órdenes. Por ranura extra: CR mayor.', save:null, attack:null},
      {name:'Viento Cortante',      level:3, school:'Evocación',   castTime:'1 acción',       range:'Personal', components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'Línea 9×0.3m. TS de FUE. Fallo: 3d8 cortante y tumbado. Terreno difícil en la zona.', save:'STR', attack:null},
      {name:'Libertad de Movimiento',level:4,school:'Abjuración',  castTime:'1 acción',       range:'Toque',    components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Ignora terreno difícil. No puede ser restringido por efectos mágicos. Puede usar todo el movimiento bajo el agua.', save:null, attack:null},
      {name:'Localizar Criatura',   level:4, school:'Adivinación', castTime:'1 acción',       range:'Personal', components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'Detectas la dirección de una criatura conocida a 300m si no hay agua entre ambos.', save:null, attack:null},
      {name:'Comunión con la Naturaleza',level:5,school:'Adivinación',castTime:'1 minuto',    range:'Personal', components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Recibes 3 conocimientos del entorno natural en 4.5 km (o 90m bajo tierra): tipos de criatura, recursos, asentamientos, terreno.', save:null, attack:null},
    ],
    slots:{1:0,2:2,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  },
  'Paladín': {
    caster:true, attr:'CAR', dc:'8 + comp. + mod. CAR',
    cantrips:[],
    spells:[
      {name:'Curar Heridas',      level:1, school:'Evocación',     castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cura 1d8 + mod. CAR PG. Por ranura extra: +1d8.', save:null, attack:null},
      {name:'Bendición',          level:1, school:'Encantamiento', castTime:'1 acción',       range:'9m',      components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Hasta 3 criaturas: +1d4 a tiradas de ataque y TS. Por ranura extra: +1 objetivo.', save:null, attack:null},
      {name:'Reprensión Divina',  level:1, school:'Evocación',     castTime:'1 reacción',     range:'18m',     components:'V',      duration:'Instantáneo',  concentration:false, desc:'Reacción al ver atacar a un enemigo. TS de SAB: fallo = 2d8 radiante (2d6 vs. no-muertos y demonios). Por ranura extra: +1d8.', save:'WIS', attack:null},
      {name:'Escudo de la Fe',    level:1, school:'Abjuración',    castTime:'1 acción bonus', range:'18m',     components:'V, S, M',duration:'Conc., 10 min',concentration:true,  desc:'+2 a la CA del objetivo.', save:null, attack:null},
      {name:'Detectar el Bien y el Mal',level:1,school:'Adivinación',castTime:'1 acción',     range:'Personal',components:'V, S',   duration:'Conc., 10 min',concentration:true,  desc:'Detectas aberraciones, celestiales, elementales, feéricos, fiendios y no-muertos en 9m. Terreno consagrado/maldito también.', save:null, attack:null},
      {name:'Favor Divino',       level:1, school:'Evocación',     castTime:'1 acción bonus', range:'Personal',components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'Tus ataques de arma causan +1d4 radiante adicional.', save:null, attack:null},
      {name:'Ayuda',              level:2, school:'Encantamiento', castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'8 horas',      concentration:false, desc:'+5 PG máx. y actuales al objetivo. Por ranura extra: +5 PG.', save:null, attack:null},
      {name:'Menor Restauración', level:2, school:'Abjuración',    castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Elimina una enfermedad o condición: cegado, sordo, paralizado o envenenado.', save:null, attack:null},
      {name:'Protección vs Veneno',level:2,school:'Abjuración',    castTime:'1 acción',       range:'Toque',   components:'V, S',   duration:'1 hora',       concentration:false, desc:'Neutraliza un veneno activo. Durante 1 h: ventaja en TS vs. veneno y resistencia a daño venenoso.', save:null, attack:null},
      {name:'Zona de Verdad',     level:2, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'10 min',       concentration:false, desc:'Esfera 4.5m. TS de CAR. Fallo: no puede mentir conscientemente. Sabe si falla.', save:'CHA', attack:null},
      {name:'Revivificar',        level:3, school:'Nigromancia',   castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Resucita a una criatura que murió en el último minuto con 1 PG.', save:null, attack:null},
      {name:'Luz del Día',        level:3, school:'Evocación',     castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'1 hora',       concentration:false, desc:'Objeto emite luz brillante 18m (36m tenue). Disipa oscuridad mágica de nivel ≤3.', save:null, attack:null},
      {name:'Destierro',          level:4, school:'Abjuración',    castTime:'1 acción',       range:'18m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'TS de CAR. Fallo: si es nativo del plano: incapacitado hasta fin de la concentración. Si es extraplanar: enviado a su plano de origen.', save:'CHA', attack:null},
      {name:'Libertad de Movimiento',level:4,school:'Abjuración',  castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Ignora terreno difícil. No puede ser restringido por efectos mágicos.', save:null, attack:null},
      {name:'Mayor Restauración', level:5, school:'Abjuración',    castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Elimina un efecto de reducción de atributo, maldición, encantamiento, petrificación o reducción de PG máx.', save:null, attack:null},
      {name:'Destruir No-Muertos',   level:5, school:'Nigromancia',   castTime:'1 acción',       range:'Personal',components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cada no-muerto en 9m hace TS de SAB. Fallo: 5d6 radiante y destruido si sus PG máx. ≤ umbral por nivel.', save:'WIS', attack:null},
      // ── Conjuros de Juramento — Devoción ──
      {name:'Protec. vs Bien/Mal',   level:1, school:'Abjuración',    castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Conc., 10 min',concentration:true,  desc:'[Devoción] Aberraciones, celestiales, elementales, feéricos, fiendios y no-muertos: desventaja en ataques contra el objetivo, e inmune a ser hechizado, aterrorizado o poseído.', save:null, attack:null},
      {name:'Baliza de Esperanza',   level:3, school:'Abjuración',    castTime:'1 acción',       range:'9m',      components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'[Devoción] Hasta 3 criaturas: ventaja en TS de SAB y TS de la muerte, y máximo en cada Dado de Golpe usado para curar.', save:null, attack:null},
      {name:'Guardián de la Fe',     level:4, school:'Conjuración',   castTime:'1 acción',       range:'9m',      components:'V',      duration:'8 horas',      concentration:false, desc:'[Devoción] Guardián espectral 2×2m. Intrusos: TS de DES o 20 radiante. Desaparece al infligir 60 puntos de daño total.', save:'DEX', attack:null},
      {name:'Golpe de Llama',        level:5, school:'Evocación',     castTime:'1 acción',       range:'Personal (cono 9m)',components:'V, S',duration:'Instantáneo',concentration:false, desc:'[Devoción] Cono de 9m. TS de DES: 4d6 fuego + 4d6 radiante (éxito: mitad). +1d6 de cada tipo por ranura extra.', save:'DEX', attack:null},
      // ── Conjuros de Juramento — Venganza ──
      {name:'Marca del Cazador',     level:1, school:'Adivinación',   castTime:'1 acción bonus', range:'27m',     components:'V',      duration:'Conc., 1 h',   concentration:true,  desc:'[Venganza] +1d6 daño en ataques contra el objetivo. Ventaja en PER/SUP para rastrearlo. Al morir: marcar otro. Ranura 3: 8 h.', save:null, attack:null},
      {name:'Asir a la Persona',     level:2, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'[Venganza] TS de SAB. Fallo: paralizado. Nueva TS al final de cada turno.', save:'WIS', attack:null},
      {name:'Prisa',                 level:3, school:'Transmutación', castTime:'1 acción',       range:'9m',      components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'[Venganza] El objetivo duplica velocidad, +2 CA, ventaja en TS de DES y una acción adicional por turno. Al terminar: no puede actuar 1 turno.', save:null, attack:null},
      {name:'Asir al Monstruo',      level:5, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'[Venganza] TS de SAB. Fallo: paralizado. Funciona contra cualquier tipo de criatura. Nueva TS al final de cada turno.', save:'WIS', attack:null},
      // ── Conjuros de Juramento — Ancestros ──
      {name:'Golpe Enredador',       level:1, school:'Conjuración',   castTime:'1 acción bonus', range:'Personal',components:'V',      duration:'Conc., 1 min', concentration:true,  desc:'[Ancestros] Siguiente ataque exitoso: TS de FUE o el objetivo queda restringido por zarcillos mágicos. Nueva TS al inicio de su turno.', save:'STR', attack:null},
      {name:'Rayo de Luna',          level:2, school:'Evocación',     castTime:'1 acción',       range:'45m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'[Ancestros] Cilindro 1.5m radio / 12m alto. TS de CON: 2d10 radiante (éxito: mitad). Cambiaformas con desventaja. Movible cada turno. +1d10 por ranura extra.', save:'CON', attack:null},
      {name:'Piel de Piedra',        level:4, school:'Abjuración',    castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'[Ancestros] La piel del objetivo se vuelve dura como piedra: resistencia a daño no mágico (contundente, perforante y cortante).', save:null, attack:null},
    ],
    slots:{1:2,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  },
  'Hechicero': {
    caster:true, attr:'CAR', dc:'8 + comp. + mod. CAR',
    cantrips:[
      {name:'Rayo de Fuego',      school:'Evocación',     castTime:'1 acción', range:'36m',    components:'V, S',  duration:'Instantáneo', concentration:false, desc:'Ataque de conjuro a distancia. Impacto: 1d10 fuego. +1d10 a nv.5/11/17.', save:null, attack:'ranged'},
      {name:'Escalofrío',         school:'Evocación',     castTime:'1 acción', range:'9m',     components:'V, S',  duration:'Instantáneo', concentration:false, desc:'TS de CON. Fallo: 1d8 frío y velocidad −3m hasta inicio de tu próximo turno. +1d8 a nv.5/11/17.', save:'CON', attack:null},
      {name:'Toque Escalofriante',school:'Nigromancia',   castTime:'1 acción', range:'Toque',  components:'V, S',  duration:'1 ronda',     concentration:false, desc:'Ataque de conjuro CaC. Impacto: 1d8 necrótico. No puede recuperar PG. No-muertos: desventaja en el ataque. +1d8 a nv.5/11/17.', save:null, attack:'melee'},
      {name:'Prestidigitación',   school:'Transmutación', castTime:'1 acción', range:'3m',     components:'V, S',  duration:'Hasta 1 hora',concentration:false, desc:'Efectos mágicos menores: limpiar, colorear, encender/apagar, calentar/enfriar, crear sabor u olor.', save:null, attack:null},
      {name:'Veneno Rociador',    school:'Conjuración',   castTime:'1 acción', range:'3m',     components:'V, S',  duration:'Instantáneo', concentration:false, desc:'TS de CON. Fallo: 1d12 veneno. Escala a 2d12 (nv.5), 3d12 (nv.11), 4d12 (nv.17).', save:'CON', attack:null},
    ],
    spells:[
      {name:'Misil Mágico',       level:1, school:'Evocación',  castTime:'1 acción',       range:'36m',     components:'V, S',   duration:'Instantáneo', concentration:false, desc:'3 misiles automáticos. 1d4+1 de fuerza c/u. Puedes distribuirlos. Por ranura extra: +1 misil.', save:null, attack:null},
      {name:'Escudo',             level:1, school:'Abjuración', castTime:'1 reacción',     range:'Personal',components:'V, S',   duration:'1 ronda',     concentration:false, desc:'+5 CA al ser atacado hasta tu siguiente turno. Inmune a Misil Mágico.', save:null, attack:null},
      {name:'Ola de Truenos',     level:1, school:'Evocación',  castTime:'1 acción',       range:'Personal',components:'V, S',   duration:'Instantáneo', concentration:false, desc:'Cubo 4.5m. TS de CON. Fallo: 2d8 trueno y empujado 3m. Éxito: mitad. +2d8 por ranura extra.', save:'CON', attack:null},
      {name:'Absorber Elementos', level:1, school:'Abjuración', castTime:'1 reacción',     range:'Personal',components:'S',      duration:'1 ronda',     concentration:false, desc:'Resistencia a daño elemental entrante. Siguiente ataque CaC: +1d6 de ese tipo.', save:null, attack:null},
      {name:'Orbe Cromático',     level:1, school:'Evocación',  castTime:'1 acción',       range:'27m',     components:'V, S, M',duration:'Instantáneo', concentration:false, desc:'Ataque de conjuro a distancia. Impacto: 3d8 del tipo elegido. Por ranura extra: +1d8.', save:null, attack:'ranged'},
      {name:'Paso Brumoso',       level:2, school:'Conjuración',castTime:'1 acción bonus', range:'Personal',components:'V',      duration:'Instantáneo', concentration:false, desc:'Te teletransportas hasta 9m a un espacio que puedas ver.', save:null, attack:null},
      {name:'Invisibilidad',      level:2, school:'Ilusión',    castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Conc., 1 h',  concentration:true,  desc:'Invisible hasta atacar o lanzar un conjuro. Por ranura extra: +1 objetivo.', save:null, attack:null},
      {name:'Destrozar',          level:2, school:'Evocación',  castTime:'1 acción',       range:'18m',     components:'V',      duration:'Instantáneo', concentration:false, desc:'TS de CON. Fallo: 3d8 trueno. Éxito: mitad. No-muertos y objetos inorgánicos con desventaja. +1d8 por ranura extra.', save:'CON', attack:null},
      {name:'Bola de Fuego',      level:3, school:'Evocación',  castTime:'1 acción',       range:'45m',     components:'V, S, M',duration:'Instantáneo', concentration:false, desc:'Esfera 6m de radio. TS de DES. Fallo: 8d6 fuego. Éxito: mitad. +1d6 por ranura extra.', save:'DEX', attack:null},
      {name:'Rayo de Relámpago',  level:3, school:'Evocación',  castTime:'1 acción',       range:'Personal',components:'V, S, M',duration:'Instantáneo', concentration:false, desc:'Línea 30×1.5m. TS de DES. Fallo: 8d6 relámpago. Éxito: mitad. +1d6 por ranura extra.', save:'DEX', attack:null},
      {name:'Contrahechizo',      level:3, school:'Abjuración', castTime:'1 reacción',     range:'18m',     components:'S',      duration:'Instantáneo', concentration:false, desc:'Interrumpe un conjuro de nivel ≤3 automáticamente. Para mayor nivel: CAR vs. CD (10 + nivel del conjuro).', save:null, attack:null},
      {name:'Vuelo',              level:3, school:'Transmutación',castTime:'1 acción',     range:'Toque',   components:'V, S, M',duration:'Conc., 10 min',concentration:true, desc:'El objetivo gana velocidad de vuelo de 18m. Por ranura extra: +1 objetivo.', save:null, attack:null},
      {name:'Polimorfizar',       level:4, school:'Transmutación',castTime:'1 acción',     range:'18m',     components:'V, S, M',duration:'Conc., 1 h',  concentration:true,  desc:'TS de SAB. Fallo: se transforma en una bestia.', save:'WIS', attack:null},
      {name:'Destierro',          level:4, school:'Abjuración', castTime:'1 acción',       range:'18m',     components:'V, S, M',duration:'Conc., 1 min',concentration:true,  desc:'TS de CAR. Fallo: criatura nativa incapacitada; extraplanar enviada a su plano.', save:'CHA', attack:null},
      {name:'Cono de Frío',       level:5, school:'Evocación',  castTime:'1 acción',       range:'Personal',components:'V, S, M',duration:'Instantáneo', concentration:false, desc:'Cono 18m. TS de CON. Fallo: 8d8 frío. Éxito: mitad. Criaturas a 0 PG: estatua de hielo. +1d8 por ranura extra.', save:'CON', attack:null},
      {name:'Dominar Persona',       level:5, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'TS de SAB. Fallo: hechizado, obedece órdenes. Nueva TS al recibir daño.', save:'WIS', attack:null},
      {name:'Rayo en Cadena',        level:6, school:'Evocación',     castTime:'1 acción',       range:'30m',     components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Rayo principal: TS de DES o 10d8 relámpago (éxito: mitad). Hasta 3 rayos secundarios a objetivos distintos a 9m. +1d8 y +1 rayo por ranura extra.', save:'DEX', attack:null},
      {name:'Círculo de la Muerte',  level:6, school:'Nigromancia',   castTime:'1 acción',       range:'60m',     components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Esfera 18m de radio. TS de CON: 8d6 necrótico (éxito: mitad). +2d6 por ranura extra.', save:'CON', attack:null},
      {name:'Desintegrar',           level:6, school:'Transmutación', castTime:'1 acción',       range:'18m',     components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Ataque de conjuro a distancia. Impacto: 10d6+40 de fuerza. Si reduce a 0 PG, desintegra totalmente.', save:null, attack:'ranged'},
      {name:'Globo de Invulnerabilidad',level:6,school:'Abjuración',  castTime:'1 acción',       range:'Personal',components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Esfera que te envuelve: bloquea conjuros de nivel 5 o inferior entrantes. Por ranura extra: +1 nivel de bloqueo.', save:null, attack:null},
      {name:'Bola de Fuego Retardada',level:7,school:'Evocación',     castTime:'1 acción',       range:'45m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Orbe que explota cuando termina la concentración o si se golpea. TS de DES: 12d6 fuego (éxito: mitad). +1d6 por ranura extra.', save:'DEX', attack:null},
      {name:'Teletransporte',        level:7, school:'Conjuración',   castTime:'1 acción',       range:'3m',      components:'V',      duration:'Instantáneo',  concentration:false, desc:'Teleportas hasta 8 criaturas voluntarias a un destino conocido en el mismo plano. Llegada imprecisa si el destino es poco familiar.', save:null, attack:null},
      {name:'Tiro Prismático',       level:7, school:'Evocación',     castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'8 rayos de colores al azar (1d8): rojo fuego, naranja ácido, amarillo relámpago, verde veneno, azul frío, índigo restringido, violeta cegado/plano, especial.', save:'DEX', attack:null},
      {name:'Incendio en la Nube',   level:8, school:'Conjuración',   castTime:'1 acción',       range:'45m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Nube de fuego 6m de radio. Al entrar o al inicio del turno: 10d8 fuego. La nube se mueve 3m/turno (tú la diriges).', save:null, attack:null},
      {name:'Dominar Monstruo',      level:8, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: hechizado, obedece órdenes. Nueva TS al recibir daño. Funciona contra cualquier tipo de criatura.', save:'WIS', attack:null},
      {name:'Palabra de Poder: Aturdir',level:8,school:'Encantamiento',castTime:'1 acción',      range:'18m',     components:'V',      duration:'Hasta 1 min',  concentration:false, desc:'Criatura con ≤150 PG actuales queda aturdida. TS de CON al inicio de su turno para terminar el efecto.', save:'CON', attack:null},
      {name:'Tormenta de Meteoros',  level:9, school:'Evocación',     castTime:'1 acción',       range:'1.5 km',  components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'4 meteoros (radio 13.5m c/u). TS de DES: 20d6 fuego + 20d6 impacto (éxito: mitad) por meteoro.', save:'DEX', attack:null},
      {name:'Deseo',                 level:9, school:'Conjuración',   castTime:'1 acción',       range:'Personal',components:'V',      duration:'Instantáneo',  concentration:false, desc:'Replica cualquier conjuro de nivel ≤8 sin componentes. O pronuncia un deseo libre; el DM lo interpreta. Riesgo de consecuencias adversas.', save:null, attack:null},
      {name:'Palabra de Poder: Matar',level:9,school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V',      duration:'Instantáneo',  concentration:false, desc:'Criatura con ≤100 PG actuales muere instantáneamente.', save:null, attack:null},
      {name:'Polimorfia Verdadera',  level:9, school:'Transmutación', castTime:'1 acción',       range:'9m',      components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: transforma en criatura de cualquier CR. Si se concentra 1 h completa, la transformación es permanente.', save:'WIS', attack:null},
    ],
    slots:{1:2,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  },
  'Brujo': {
    caster:true, attr:'CAR', dc:'8 + comp. + mod. CAR',
    cantrips:[
      {name:'Golpe Sobrenatural',school:'Evocación',     castTime:'1 acción', range:'36m',    components:'V, S', duration:'Instantáneo', concentration:false, desc:'Ataque ranged. 1d10 sombrío. Daño extra 1d10 vs. criatura a 0 PG (crítico). +1d10 a nv.5/11/17.', save:null, attack:'ranged'},
      {name:'Escalofrío',        school:'Evocación',     castTime:'1 acción', range:'9m',     components:'V, S', duration:'Instantáneo', concentration:false, desc:'TS de CON. Fallo: 1d8 frío y vel. −3m hasta inicio de tu turno. +1d8 a nv.5/11/17.', save:'CON', attack:null},
      {name:'Toque Agonizante',  school:'Nigromancia',   castTime:'1 acción', range:'Toque',  components:'V, S', duration:'1 ronda',     concentration:false, desc:'Ataque CaC. 1d8 necrótico. No recupera PG. No-muertos: desventaja en ataque. +1d8 a nv.5/11/17.', save:null, attack:'melee'},
      {name:'Ilusión Menor',     school:'Ilusión',       castTime:'1 acción', range:'9m',     components:'S, M', duration:'1 min',       concentration:false, desc:'Crea un sonido o imagen inmóvil. Investigar con INT para verla como ilusión.', save:null, attack:null},
      {name:'Manos Quemantes de Brujo',school:'Evocación',castTime:'1 acción',range:'Personal',components:'V, S',duration:'Instantáneo', concentration:false, desc:'Cono 4.5m. TS de DES. Fallo: 3d6 fuego. Éxito: mitad. +1d6 a nv.5/11/17.', save:'DEX', attack:null},
    ],
    spells:[
      {name:'Hex',                  level:1, school:'Encantamiento',castTime:'1 acción bonus',range:'27m',     components:'V, S, M',duration:'Conc., 1 h',  concentration:true,  desc:'+1d6 sombrío en ataques. Elige atributo: desventaja en chequeos de ese atributo. Al morir: marcar otro como acción bonus. Ranura 3: 8 h. Ranura 5: 24 h.', save:null, attack:null},
      {name:'Armadura de Agathys',  level:1, school:'Abjuración',   castTime:'1 acción',      range:'Personal',components:'V, S, M',duration:'1 hora',      concentration:false, desc:'5 PG temporales. Atacante recibe 5 frío mientras los tengas. Por ranura extra: +5 PG temp. y daño.', save:null, attack:null},
      {name:'Maldición de Brujo',   level:1, school:'Encantamiento',castTime:'1 acción',      range:'27m',     components:'V, S',   duration:'Conc., 1 min',concentration:true,  desc:'TS de SAB. Fallo: desventaja en TS de una característica y −1d4 a tiradas de daño.', save:'WIS', attack:null},
      {name:'Oscuridad',            level:2, school:'Evocación',    castTime:'1 acción',      range:'18m',     components:'V, M',   duration:'Conc., 10 min',concentration:true, desc:'Esfera 4.5m de magia que bloquea toda luz. No puede ser disipada por Luz o Luz del Día a menos que sean de mayor nivel.', save:null, attack:null},
      {name:'Paso Brumoso',         level:2, school:'Conjuración',  castTime:'1 acción bonus',range:'Personal',components:'V',      duration:'Instantáneo',  concentration:false, desc:'Teletransporte a un espacio visible a 9m.', save:null, attack:null},
      {name:'Sugestión',            level:2, school:'Encantamiento',castTime:'1 acción',      range:'9m',      components:'V, M',   duration:'Conc., 8 h',   concentration:true,  desc:'TS de SAB. Fallo: sigue una sugestión razonable. Termina si la orden causa daño directo.', save:'WIS', attack:null},
      {name:'Destrozar',            level:2, school:'Evocación',    castTime:'1 acción',      range:'18m',     components:'V',      duration:'Instantáneo',  concentration:false, desc:'TS de CON. Fallo: 3d8 trueno. Éxito: mitad. No-muertos con desventaja. +1d8 por ranura extra.', save:'CON', attack:null},
      {name:'Hambre de Hadar',      level:3, school:'Conjuración',  castTime:'1 acción',      range:'45m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Esfera 6m de oscuridad tentacular. Inicio de turno: TS de DES o 2d6 frío. Final de turno: TS de CON o 2d6 ácido. Terreno difícil.', save:'DEX', attack:null},
      {name:'Patrón Hipnótico',     level:3, school:'Ilusión',      castTime:'1 acción',      range:'36m',     components:'S, M',   duration:'Conc., 1 min', concentration:true,  desc:'Cubo 9m. TS de SAB. Fallo: hechizado e incapacitado. Nueva TS al recibir daño.', save:'WIS', attack:null},
      {name:'Contrahechizo',        level:3, school:'Abjuración',   castTime:'1 reacción',    range:'18m',     components:'S',      duration:'Instantáneo',  concentration:false, desc:'Interrumpe conjuro ≤3 automáticamente. Para mayor nivel: CAR vs. CD (10 + nivel del conjuro).', save:null, attack:null},
      {name:'Destierro',            level:4, school:'Abjuración',   castTime:'1 acción',      range:'18m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'TS de CAR. Fallo: criatura nativa incapacitada; extraplanar enviada a su plano.', save:'CHA', attack:null},
      {name:'Maldición Demoníaca',  level:4, school:'Nigromancia',  castTime:'1 acción',      range:'27m',     components:'V',      duration:'7 días',       concentration:false, desc:'TS de SAB. Fallo: desventaja en pruebas de un atributo elegido. El nombre del objetivo queda vinculado al tuyo.', save:'WIS', attack:null},
      {name:'Contacto con los Planos',level:5,school:'Adivinación', castTime:'1 minuto',      range:'Personal',components:'V',      duration:'1 minuto',     concentration:false, desc:'Contactas entidad extraplanar. 3 preguntas, responde sí/no/incierto/desconocido. TS de INT CD 17 o 6d6 psíquico y locura.', save:'INT', attack:null},
      {name:'Dominar Monstruo',      level:8, school:'Encantamiento', castTime:'1 acción',      range:'18m',     components:'V, S',   duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: hechizado, obedece órdenes. Nueva TS al recibir daño. Funciona contra cualquier tipo de criatura.', save:'WIS', attack:null},
      {name:'Círculo de la Muerte',  level:6, school:'Nigromancia',   castTime:'1 acción',      range:'60m',     components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Esfera 18m. TS de CON: 8d6 necrótico (éxito: mitad). +2d6 por ranura extra.', save:'CON', attack:null},
      {name:'Ver la Verdad',         level:6, school:'Adivinación',   castTime:'1 acción',      range:'Toque',   components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Visión verdadera (18m): criaturas invisibles, formas verdaderas de cambiaformas y el Plano Etéreo.', save:null, attack:null},
      {name:'Carne a Piedra',        level:6, school:'Transmutación', castTime:'1 acción',      range:'18m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'TS de CON. Fallo: restringido. Nueva TS cada turno. 3 fallos consecutivos = petrificado permanentemente.', save:'CON', attack:null},
      {name:'Dedo de la Muerte',     level:7, school:'Nigromancia',   castTime:'1 acción',      range:'18m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'TS de CON. Fallo: 7d8+30 necrótico. Éxito: mitad. Si la mata, resurge como zombie bajo tu control permanentemente.', save:'CON', attack:null},
      {name:'Plano Etéreo',          level:7, school:'Conjuración',   castTime:'1 acción',      range:'Personal',components:'V, S',   duration:'8 horas',      concentration:false, desc:'Entras en el Plano Etéreo con todos tus objetos. Puedes ver el Plano Material pero no interactuar con él.', save:null, attack:null},
      {name:'Semiplano',             level:8, school:'Conjuración',   castTime:'1 acción',      range:'9m',      components:'S',      duration:'1 hora',       concentration:false, desc:'Portal a tu bolsillo extradimensional de 9×9×9m. Cualquiera puede entrar. Al terminar: portal se cierra.', save:null, attack:null},
      {name:'Mente en Blanco',       level:8, school:'Abjuración',    castTime:'1 acción',      range:'Toque',   components:'V, S, M',duration:'24 horas',     concentration:false, desc:'Objetivo inmune a psíquico, lectura de mente, adivinaciones y efectos de encantamiento o ilusión.', save:null, attack:null},
      {name:'Encarcelamiento',       level:9, school:'Abjuración',    castTime:'1 minuto',      range:'9m',      components:'V, S, M',duration:'Hasta disiparse',concentration:false, desc:'TS de SAB. Fallo: confinado en uno de seis modos (enjaulado, enterrado, dormido...) hasta que el conjuro sea disipado por nombre.', save:'WIS', attack:null},
      {name:'Puerta',                level:9, school:'Conjuración',   castTime:'1 acción',      range:'18m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Abre portal a un plano o lugar designado. Criaturas del otro plano pueden cruzarlo o convocarse (TS de CAR).', save:'CHA', attack:null},
      {name:'Polimorfia Verdadera',  level:9, school:'Transmutación', castTime:'1 acción',      range:'9m',      components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: transforma en criatura de cualquier CR. Si se concentra 1 h completa, la transformación es permanente.', save:'WIS', attack:null},
    ],
    slots:{1:1,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  },
  'Mago': {
    caster:true, attr:'INT', dc:'8 + comp. + mod. INT',
    cantrips:[
      {name:'Rayo de Fuego',      school:'Evocación',     castTime:'1 acción', range:'36m',    components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Ataque ranged. Impacto: 1d10 fuego. +1d10 a nv.5/11/17.', save:null, attack:'ranged'},
      {name:'Prestidigitación',   school:'Transmutación', castTime:'1 acción', range:'3m',     components:'V, S',   duration:'Hasta 1 hora', concentration:false, desc:'Efectos mágicos menores: limpiar, colorear, encender/apagar, calentar/enfriar, crear sabor u olor.', save:null, attack:null},
      {name:'Mano de Mago',       school:'Conjuración',   castTime:'1 acción', range:'9m',     components:'V, S',   duration:'1 min',        concentration:false, desc:'Mano espectral: manipula objetos, abre puertas, deposita ítems, destapa recipientes.', save:null, attack:null},
      {name:'Toque Escalofriante',school:'Nigromancia',   castTime:'1 acción', range:'Toque',  components:'V, S',   duration:'1 ronda',      concentration:false, desc:'Ataque CaC. 1d8 necrótico. No recupera PG. No-muertos: desventaja en ataque. +1d8 a nv.5/11/17.', save:null, attack:'melee'},
      {name:'Escalofrío',         school:'Evocación',     castTime:'1 acción', range:'9m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'TS de CON. Fallo: 1d8 frío y vel. −3m hasta inicio de tu turno. +1d8 a nv.5/11/17.', save:'CON', attack:null},
      {name:'Ilusión Menor',      school:'Ilusión',       castTime:'1 acción', range:'9m',     components:'S, M',   duration:'1 min',        concentration:false, desc:'Crea un sonido o imagen inmóvil. INT vs. CD para verla como ilusión.', save:null, attack:null},
      {name:'Toque de Choque',    school:'Evocación',     castTime:'1 acción', range:'Toque',  components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Ataque CaC. 1d8 relámpago (2d8 vs. criaturas con armadura metálica). Desventaja en ataque si lleva metal. +1d8 a nv.5/11/17.', save:null, attack:'melee'},
    ],
    spells:[
      {name:'Misil Mágico',        level:1, school:'Evocación',     castTime:'1 acción',       range:'36m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'3 misiles automáticos. 1d4+1 de fuerza c/u. Puedes distribuirlos. Por ranura extra: +1 misil.', save:null, attack:null},
      {name:'Sueño',               level:1, school:'Encantamiento', castTime:'1 acción',       range:'27m',     components:'V, S, M',duration:'1 min',        concentration:false, desc:'Tira 5d8: PG totales para dormir criaturas (de menor a mayor). No afecta no-muertos ni inmunes al encantamiento. +2d8 por ranura extra.', save:null, attack:null},
      {name:'Escudo',              level:1, school:'Abjuración',    castTime:'1 reacción',     range:'Personal',components:'V, S',   duration:'1 ronda',      concentration:false, desc:'+5 CA al ser atacado hasta tu siguiente turno. Inmune a Misil Mágico.', save:null, attack:null},
      {name:'Detectar Magia',      level:1, school:'Adivinación',   castTime:'1 acción',       range:'Personal',components:'V, S',   duration:'Conc., 10 min',concentration:true,  desc:'Percibes la presencia de magia en 9m. Puedes ver el aura y la escuela del efecto mágico.', save:null, attack:null},
      {name:'Ola de Truenos',      level:1, school:'Evocación',     castTime:'1 acción',       range:'Personal',components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'Cubo 4.5m. TS de CON. Fallo: 2d8 trueno y empujado 3m. Éxito: mitad. +2d8 por ranura extra.', save:'CON', attack:null},
      {name:'Imagen Silenciosa',   level:1, school:'Ilusión',       castTime:'1 acción',       range:'18m',     components:'V, S, M',duration:'Conc., 10 min',concentration:true,  desc:'Objeto o criatura ilusoria de hasta 15×15×15 pies. Sin sonido ni olor. Investigar con INT para revelarla.', save:null, attack:null},
      {name:'Comprensión de Idiomas',level:1,school:'Adivinación',  castTime:'1 acción',       range:'Personal',components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Comprendes el significado literal de cualquier idioma hablado o texto que leas.', save:null, attack:null},
      {name:'Paso Brumoso',        level:2, school:'Conjuración',   castTime:'1 acción bonus', range:'Personal',components:'V',      duration:'Instantáneo',  concentration:false, desc:'Teletransporte a un espacio visible a 9m.', save:null, attack:null},
      {name:'Invisibilidad',       level:2, school:'Ilusión',       castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'Invisible hasta atacar o lanzar un conjuro. Por ranura extra: +1 objetivo.', save:null, attack:null},
      {name:'Destrozar',           level:2, school:'Evocación',     castTime:'1 acción',       range:'18m',     components:'V',      duration:'Instantáneo',  concentration:false, desc:'TS de CON. Fallo: 3d8 trueno. Éxito: mitad. No-muertos y objetos inorgánicos con desventaja. +1d8 por ranura extra.', save:'CON', attack:null},
      {name:'Sugestión',           level:2, school:'Encantamiento', castTime:'1 acción',       range:'9m',      components:'V, M',   duration:'Conc., 8 h',   concentration:true,  desc:'TS de SAB. Fallo: sigue una sugestión razonable. Termina si la orden causaría daño directo.', save:'WIS', attack:null},
      {name:'Bola de Fuego',       level:3, school:'Evocación',     castTime:'1 acción',       range:'45m',     components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Esfera 6m de radio. TS de DES. Fallo: 8d6 fuego. Éxito: mitad. +1d6 por ranura extra.', save:'DEX', attack:null},
      {name:'Rayo de Relámpago',   level:3, school:'Evocación',     castTime:'1 acción',       range:'Personal',components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Línea 30×1.5m. TS de DES. Fallo: 8d6 relámpago. Éxito: mitad. +1d6 por ranura extra.', save:'DEX', attack:null},
      {name:'Contrahechizo',       level:3, school:'Abjuración',    castTime:'1 reacción',     range:'18m',     components:'S',      duration:'Instantáneo',  concentration:false, desc:'Interrumpe conjuro ≤3 automáticamente. Para mayor nivel: INT vs. CD (10 + nivel del conjuro).', save:null, attack:null},
      {name:'Vuelo',               level:3, school:'Transmutación', castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'Conc., 10 min',concentration:true,  desc:'Velocidad de vuelo de 18m durante la duración. Por ranura extra: +1 objetivo.', save:null, attack:null},
      {name:'Patrón Hipnótico',    level:3, school:'Ilusión',       castTime:'1 acción',       range:'36m',     components:'S, M',   duration:'Conc., 1 min', concentration:true,  desc:'Cubo 9m. TS de SAB. Fallo: hechizado e incapacitado. Nueva TS al recibir daño.', save:'WIS', attack:null},
      {name:'Polimorfizar',        level:4, school:'Transmutación', castTime:'1 acción',       range:'18m',     components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: se transforma en una bestia. Sus PG son los de la bestia.', save:'WIS', attack:null},
      {name:'Destierro',           level:4, school:'Abjuración',    castTime:'1 acción',       range:'18m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'TS de CAR. Fallo: criatura nativa incapacitada; extraplanar enviada a su plano.', save:'CHA', attack:null},
      {name:'Cono de Frío',        level:5, school:'Evocación',     castTime:'1 acción',       range:'Personal',components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Cono 18m. TS de CON. Fallo: 8d8 frío. Éxito: mitad. Criaturas a 0 PG: estatua de hielo. +1d8 por ranura extra.', save:'CON', attack:null},
      {name:'Dominar Persona',     level:5, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Conc., 1 min', concentration:true,  desc:'TS de SAB. Fallo: hechizado, obedece órdenes. Nueva TS al recibir daño.', save:'WIS', attack:null},
      {name:'Evocar Elemental',      level:5, school:'Conjuración',   castTime:'1 minuto',       range:'27m',     components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'Convoca un elemental CR 5 o inferior (aire, tierra, fuego, agua). Obedece órdenes verbales.', save:null, attack:null},
      {name:'Rayo en Cadena',        level:6, school:'Evocación',     castTime:'1 acción',       range:'30m',     components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Rayo principal: TS de DES o 10d8 relámpago (éxito: mitad). Hasta 3 rayos secundarios a 9m. +1d8 y +1 rayo por ranura extra.', save:'DEX', attack:null},
      {name:'Círculo de la Muerte',  level:6, school:'Nigromancia',   castTime:'1 acción',       range:'60m',     components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Esfera 18m. TS de CON: 8d6 necrótico (éxito: mitad). +2d6 por ranura extra.', save:'CON', attack:null},
      {name:'Desintegrar',           level:6, school:'Transmutación', castTime:'1 acción',       range:'18m',     components:'V, S, M',duration:'Instantáneo',  concentration:false, desc:'Ataque de conjuro. Impacto: 10d6+40 de fuerza. Si reduce a 0 PG, desintegra completamente. Un objeto no mágico (cubo 3m): siempre destruido.', save:null, attack:'ranged'},
      {name:'Globo de Invulnerabilidad',level:6,school:'Abjuración',  castTime:'1 acción',       range:'Personal',components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Esfera que bloquea conjuros de nivel ≤5 que entren. Por ranura extra: +1 nivel de bloqueo.', save:null, attack:null},
      {name:'Ver la Verdad',         level:6, school:'Adivinación',   castTime:'1 acción',       range:'Toque',   components:'V, S, M',duration:'1 hora',       concentration:false, desc:'Visión verdadera (18m): criaturas invisibles, formas verdaderas de cambiaformas y el Plano Etéreo.', save:null, attack:null},
      {name:'Bola de Fuego Retardada',level:7,school:'Evocación',     castTime:'1 acción',       range:'45m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Orbe que explota al terminar la concentración. TS de DES: 12d6 fuego (éxito: mitad). +1d6 por ranura extra.', save:'DEX', attack:null},
      {name:'Teletransporte',        level:7, school:'Conjuración',   castTime:'1 acción',       range:'3m',      components:'V',      duration:'Instantáneo',  concentration:false, desc:'Teleportas hasta 8 criaturas voluntarias a un destino conocido en el mismo plano. Llegada imprecisa si el destino es poco familiar.', save:null, attack:null},
      {name:'Tiro Prismático',       level:7, school:'Evocación',     castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'8 rayos de colores al azar: rojo fuego, naranja ácido, amarillo relámpago, verde veneno, azul frío, índigo restringido, violeta cegado/desterrado, especial.', save:'DEX', attack:null},
      {name:'Dedo de la Muerte',     level:7, school:'Nigromancia',   castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'TS de CON. Fallo: 7d8+30 necrótico. Éxito: mitad. Si la mata, resurge como zombie bajo tu control permanentemente.', save:'CON', attack:null},
      {name:'Incendio en la Nube',   level:8, school:'Conjuración',   castTime:'1 acción',       range:'45m',     components:'V, S, M',duration:'Conc., 1 min', concentration:true,  desc:'Nube de fuego 6m de radio. Al entrar o inicio del turno: 10d8 fuego. La nube se mueve 3m/turno.', save:null, attack:null},
      {name:'Campo de Antimagia',    level:8, school:'Abjuración',    castTime:'1 acción',       range:'Personal',components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'Esfera de 3m que te acompaña. Dentro: conjuros y efectos mágicos no funcionan.', save:null, attack:null},
      {name:'Dominar Monstruo',      level:8, school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V, S',   duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: hechizado, obedece órdenes. Nueva TS al recibir daño. Funciona contra cualquier tipo de criatura.', save:'WIS', attack:null},
      {name:'Palabra de Poder: Aturdir',level:8,school:'Encantamiento',castTime:'1 acción',      range:'18m',     components:'V',      duration:'Hasta 1 min',  concentration:false, desc:'Criatura con ≤150 PG actuales queda aturdida. TS de CON al inicio de su turno para terminar.', save:'CON', attack:null},
      {name:'Tormenta de Meteoros',  level:9, school:'Evocación',     castTime:'1 acción',       range:'1.5 km',  components:'V, S',   duration:'Instantáneo',  concentration:false, desc:'4 meteoros (radio 13.5m c/u). TS de DES: 20d6 fuego + 20d6 impacto (éxito: mitad) por meteoro.', save:'DEX', attack:null},
      {name:'Deseo',                 level:9, school:'Conjuración',   castTime:'1 acción',       range:'Personal',components:'V',      duration:'Instantáneo',  concentration:false, desc:'Replica cualquier conjuro de nivel ≤8 sin componentes. O pronuncia un deseo libre. Posibles consecuencias adversas.', save:null, attack:null},
      {name:'Palabra de Poder: Matar',level:9,school:'Encantamiento', castTime:'1 acción',       range:'18m',     components:'V',      duration:'Instantáneo',  concentration:false, desc:'Criatura con ≤100 PG actuales muere instantáneamente.', save:null, attack:null},
      {name:'Detener el Tiempo',     level:9, school:'Transmutación', castTime:'1 acción',       range:'Personal',components:'V',      duration:'Hasta 5 rondas',concentration:false, desc:'Actúas durante 1d4+1 rondas adicionales. Las demás criaturas no pueden moverse ni ser afectadas. Termina si afectas a otra criatura.', save:null, attack:null},
      {name:'Polimorfia Verdadera',  level:9, school:'Transmutación', castTime:'1 acción',       range:'9m',      components:'V, S, M',duration:'Conc., 1 h',   concentration:true,  desc:'TS de SAB. Fallo: transforma en criatura de cualquier CR. Si se concentra 1 h completa, la transformación es permanente.', save:'WIS', attack:null},
    ],
    slots:{1:2,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
  },
};

export function rollSpellAttack(id) {
  const spell = state.spells.find(s => s.id === id);
  if (!spell || !spell.attack) return;
  const attr = spell.castingAttr || state.CHARACTER_STATE.spellcastingAttr;
  const bonus = getProfBonus() + (attr ? getMod(attr) : 0);
  const label = `${spell.attack === 'ranged' ? '🎯' : '⚔'} ${spell.name}`;
  if (typeof window.LL_cinematicRoll === 'function') {
    window.LL_cinematicRoll({ label, mod: bonus });
  } else {
    const roll = Math.ceil(Math.random() * 20) + bonus;
    showToast(`${label}: ${roll}`);
    addCombatLog(`${label}: ${roll} (bono ${bonus >= 0 ? '+' + bonus : bonus})`);
  }
}

export function loadSpellPreset(className, merge = false) {
  const preset = SPELL_PRESETS[className];
  if (!preset) { showToast('Sin plantilla para esta clase'); return; }
  if (!preset.caster) {
    if (!confirm(`${className} no usa magia. ¿Limpiar conjuros actuales?`)) return;
    state.spells = [];
    [1,2,3,4,5,6,7,8,9].forEach(i => state.spellSlotsState[i] = {max:0,used:0});
    renderSpellBook(); renderSpellSlots();
    showToast(`${className}: sin conjuros`); window.saveToLocal?.(); return;
  }
  const makeId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  if (merge) {
    const existingNames = new Set(state.spells.map(s => s.name));
    const newCantrips = (preset.cantrips||[]).filter(s => !existingNames.has(s.name))
      .map(s => ({...s, id:makeId(), level:0, prepared:true}));
    const newSpells = (preset.spells||[]).filter(s => !existingNames.has(s.name))
      .map(s => ({...s, id:makeId(), prepared:true}));
    state.spells.push(...newCantrips, ...newSpells);
    const mergeClassText = document.querySelector('.hero-pill[data-field="class"] .meta-value')?.textContent?.trim() || '';
    const mergeSlots = mergeClassText ? computeSpellSlots(mergeClassText) : null;
    if (mergeClassText) _syncPactSlots(mergeClassText);
    if (mergeSlots) {
      [1,2,3,4,5,6,7,8,9].forEach(i => {
        const used = state.spellSlotsState[i]?.used || 0;
        state.spellSlotsState[i] = { max: mergeSlots[i]?.max || 0, used };
      });
    } else {
      const rawSlots = preset.slots || {};
      [1,2,3,4,5,6,7,8,9].forEach(i => {
        const cur  = state.spellSlotsState[i]?.max  || 0;
        const used = state.spellSlotsState[i]?.used || 0;
        state.spellSlotsState[i] = { max: Math.max(cur, rawSlots[i]||0), used };
      });
    }
    if (!state.CHARACTER_STATE.spellcastingAttr) state.CHARACTER_STATE.spellcastingAttr = preset.attr || '';
    renderSpellBook(); renderSpellSlots(); renderSpellStats();
    showToast(`✦ +${newCantrips.length + newSpells.length} conjuros de ${className} añadidos`);
    window.saveToLocal?.();
  } else {
    if (state.spells.length > 0 && !confirm(`¿Reemplazar conjuros actuales con la plantilla de ${className}?`)) return;
    state.spells = [
      ...(preset.cantrips||[]).map(s => ({...s, id:makeId(), level:0, prepared:true})),
      ...(preset.spells  ||[]).map(s => ({...s, id:makeId(), prepared:true})),
    ];
    const rawSlots = preset.slots || {};
    [1,2,3,4,5,6,7,8,9].forEach(i => state.spellSlotsState[i] = {max:rawSlots[i]||0, used:0});
    state.CHARACTER_STATE.spellcastingAttr = preset.attr || '';
    renderSpellBook(); renderSpellSlots(); renderSpellStats();
    showToast(`✦ Plantilla de ${className} cargada`); window.saveToLocal?.();
  }
}

export function toggleSpellFilter() {
  _spellFilter = _spellFilter === 'all' ? 'prepared' : 'all';
  const btn = document.getElementById('spellFilterBtn');
  if (btn) btn.textContent = _spellFilter === 'prepared' ? 'Preparados' : 'Todos';
  renderSpellBook();
}

export function renderSpellBook() {
  const spellCont   = document.getElementById('spellBookList');
  const cantripCont = document.getElementById('cantripList');
  if (!spellCont || !cantripCont) return;
  renderConcentration();

  const cants  = state.spells.filter(s => s.level === 0);
  const allRegs = state.spells.filter(s => s.level >  0);
  const regs   = _spellFilter === 'prepared' ? allRegs.filter(s => s.prepared !== false) : allRegs;

  const prepared = allRegs.filter(s => s.prepared !== false).length;
  const counterEl = document.getElementById('spellPreparedCounter');
  if (counterEl) counterEl.textContent = allRegs.length ? `${prepared}/${allRegs.length}` : '';

  cantripCont.innerHTML = '';
  if (cants.length === 0) cantripCont.innerHTML = `<div class="spell-empty">Sin trucos — añade uno</div>`;
  else cants.forEach(s => cantripCont.appendChild(buildSpellCard(s)));

  spellCont.innerHTML = '';
  if (regs.length === 0) spellCont.innerHTML = `<div class="spell-empty">${_spellFilter==='prepared'?'Sin conjuros preparados':'Sin conjuros — añade uno'}</div>`;
  else {
    // Nivel máximo casteable — se calcula siempre fresco desde el class text
    // para evitar depender de que pactSlotsState/spellSlotsState estén actualizados.
    const _classText = (document.querySelector('.hero-pill[data-field="class"] .meta-value')
      ?.textContent?.trim()) || '';
    const _computed  = _classText ? computeSpellSlots(_classText) : null;
    const _pact      = _classText ? computePactSlots(_classText)  : { level: 0, max: 0 };
    const maxFromSlots = _computed
      ? Object.entries(_computed).reduce((acc, [k, v]) => v.max > 0 ? Math.max(acc, +k) : acc, 0)
      : 0;
    const maxFromPact  = _pact.max > 0 ? _pact.level : 0;
    const maxSlotLevel = Math.max(maxFromSlots, maxFromPact);

    const levels = [...new Set(regs.map(s=>s.level))].sort((a,b)=>a-b);
    const visible = maxSlotLevel > 0 ? levels.filter(lv => lv <= maxSlotLevel) : [];

    if (visible.length === 0) {
      spellCont.innerHTML = `<div class="spell-empty">Sin ranuras disponibles en este nivel</div>`;
    } else {
      visible.forEach(lv => {
        const div = document.createElement('div');
        div.className = 'spell-level-divider';
        div.textContent = `— Nivel ${lv} —`;
        spellCont.appendChild(div);
        regs.filter(s=>s.level===lv).forEach(s => spellCont.appendChild(buildSpellCard(s)));
      });
    }
  }
}

// Colores por clase — usados en el badge de sourceClass de cada tarjeta
const CLASS_COLORS = {
  'Bardo':      '#f472b6',
  'Clérigo':    '#fbbf24',
  'Druida':     '#4ade80',
  'Explorador': '#34d399',
  'Hechicero':  '#f87171',
  'Mago':       '#818cf8',
  'Paladín':    '#cbd5e1',
  'Brujo':      '#c084fc',
};

/** Devuelve los conjuros de una clase desde SPELL_PRESETS. */
export function getSpellsForClass(className) {
  const preset = SPELL_PRESETS[className];
  if (!preset?.caster) return null;
  return {
    cantrips: preset.cantrips || [],
    spells:   preset.spells   || [],
    attr:     preset.attr     || '',
  };
}

function buildSpellCard(spell) {
  const card = document.createElement('div');
  const isConc = state.concentrationSpell?.id === spell.id;
  const notPrep = spell.level > 0 && spell.prepared === false;
  const editMode = document.body.classList.contains('edit-mode');
  card.className = `spell-card${spell.concentration?' concentration':''}${notPrep?' not-prepared':''}`;
  card.dataset.spellId = spell.id;

  const lvlLabel = spell.level === 0 ? 'Truco' : `Nv ${spell.level}`;
  const srcColor = spell.sourceClass ? (CLASS_COLORS[spell.sourceClass] || 'var(--text-muted)') : null;
  const tags = [
    spell.concentration ? `<span class="spell-tag conc">⚡ Conc.</span>` : '',
    spell.save   ? `<span class="spell-tag save">TS ${spell.save}</span>` : '',
    spell.attack ? `<span class="spell-tag atk">${spell.attack==='ranged'?'🎯':'⚔'} Atq.</span>` : '',
    spell.castingAttr ? `<span class="spell-tag" style="border-color:var(--gold-dark);color:var(--text-muted);font-size:9px;">${spell.castingAttr}</span>` : '',
    isConc       ? `<span class="spell-tag conc" style="animation:hpPulse 1.2s ease-in-out infinite">✦ Activo</span>` : '',
    srcColor     ? `<span class="spell-tag" style="border-color:${srcColor};color:${srcColor};font-size:9px;">${escapeAttr(spell.sourceClass)}</span>` : '',
  ].join('');

  card.innerHTML = `
    <div class="spell-card-header" onclick="toggleSpellDetails(this)">
      <div class="spell-prepared-dot ${spell.prepared!==false?'active':''}" onclick="event.stopPropagation();toggleSpellPrepared('${spell.id}')"></div>
      <span class="spell-card-name">${escapeAttr(spell.name)}</span>
      <span class="spell-card-level">${lvlLabel}</span>
      <span class="spell-card-school">${escapeAttr(spell.school||'')}</span>
      ${tags}
    </div>
    <div class="spell-card-details" style="display:none;">
      <div class="spell-card-meta">${[spell.castTime,spell.range,spell.components,spell.duration].filter(Boolean).map(escapeAttr).join(' · ')}</div>
      <div class="spell-card-desc">${escapeAttr(spell.desc||'')}</div>
      <div class="spell-card-actions">
        ${spell.attack ? `<button class="btn btn-sm" onclick="rollSpellAttack('${spell.id}')">${spell.attack==='ranged'?'🎯':'⚔'} Tirar ataque</button>` : ''}
        ${spell.concentration&&!isConc ? `<button class="btn btn-sm btn-primary" onclick="setConcentration('${spell.id}')">⚡ Concentrarme</button>` : ''}
        ${isConc ? `<button class="btn btn-sm" style="border-color:#e74c3c;color:#e74c3c;" onclick="breakConcentration()">✕ Romper concentración</button>` : ''}
        <button class="btn btn-sm" onclick="openSpellModal('${spell.id}')">✎ Editar</button>
        ${editMode ? `<button class="btn btn-sm" onclick="deleteSpell('${spell.id}')">✕ Eliminar</button>` : ''}
      </div>
    </div>`;
  return card;
}

export function toggleSpellDetails(header) {
  const d = header.nextElementSibling;
  if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

export function toggleSpellPrepared(id) {
  const s = state.spells.find(x=>x.id===id);
  if (s) { s.prepared = !s.prepared; renderSpellBook(); window.saveToLocal?.(); }
}

export function deleteSpell(id) {
  state.spells = state.spells.filter(s=>s.id!==id);
  if (state.concentrationSpell?.id===id) state.concentrationSpell = null;
  renderSpellBook(); window.saveToLocal?.();
}

export function setConcentration(id) {
  const s = state.spells.find(x=>x.id===id);
  if (!s) return;
  if (state.concentrationSpell && state.concentrationSpell.id!==id)
    if (!confirm(`¿Romper concentración en "${state.concentrationSpell.name}" para "${s.name}"?`)) return;
  state.concentrationSpell = {id:s.id, name:s.name};
  renderSpellBook(); renderConcentration(); window.saveToLocal?.();
}

export function breakConcentration() {
  if (!state.concentrationSpell) return;
  showToast(`Concentración rota: ${state.concentrationSpell.name}`);
  state.concentrationSpell = null;
  renderSpellBook(); renderConcentration(); window.saveToLocal?.();
}

export function renderConcentration() {
  const banner = document.getElementById('concentrationBanner');
  if (!banner) return;
  if (!state.concentrationSpell) { banner.style.display='none'; return; }
  banner.style.display = 'flex';
  banner.innerHTML = `
    <span style="font-size:16px;">⚡</span>
    <span class="concentration-banner-name">Concentración: ${escapeAttr(state.concentrationSpell.name)}</span>
    <button class="btn btn-sm" style="border-color:#e74c3c;color:#e74c3c;margin-left:auto;" onclick="breakConcentration()">✕ Romper</button>`;
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.getSpellsForClass  = getSpellsForClass;
window.loadSpellPreset    = loadSpellPreset;
window.toggleSpellFilter  = toggleSpellFilter;
window.renderSpellBook    = renderSpellBook;
window.toggleSpellDetails = toggleSpellDetails;
window.toggleSpellPrepared = toggleSpellPrepared;
window.deleteSpell        = deleteSpell;
window.setConcentration   = setConcentration;
window.breakConcentration = breakConcentration;
window.renderConcentration = renderConcentration;
window.rollSpellAttack    = rollSpellAttack;
