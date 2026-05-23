import { state } from '../state.js';
import { showToast } from './toast-log.js';
import { escapeAttr } from './utils.js';

export const WARLOCK_INVOCATIONS = [
  {name:'Golpe Agonizante',         lvl:null,  uses:0, rest:'none', desc:'Req: Golpe Sobrenatural. Añade tu modificador de CAR al daño de cada haz de Golpe Sobrenatural.'},
  {name:'Armadura de Sombras',      lvl:null,  uses:0, rest:'none', desc:'Puedes lanzar Armadura de Mago a voluntad, sin gastar una ranura y sin necesitar componentes.'},
  {name:'Hablar con Bestias',       lvl:null,  uses:0, rest:'none', desc:'Puedes lanzar Hablar con Animales a voluntad, sin gastar ranuras.'},
  {name:'Influencia Embaucadora',   lvl:null,  uses:0, rest:'none', desc:'Ganas competencia en Engaño y Persuasión.'},
  {name:'Vista Diabólica',          lvl:null,  uses:0, rest:'none', desc:'Ves en oscuridad mágica y no mágica hasta 36 m. Para ti no hay oscuridad total.'},
  {name:'Vista Sobrenatural',       lvl:null,  uses:0, rest:'none', desc:'Puedes lanzar Detectar Magia a voluntad, sin gastar ranuras.'},
  {name:'Lanza Sobrenatural',       lvl:null,  uses:0, rest:'none', desc:'Req: Golpe Sobrenatural. El alcance de Golpe Sobrenatural se convierte en 90 m.'},
  {name:'Golpe Repelente',          lvl:null,  uses:0, rest:'none', desc:'Req: Golpe Sobrenatural. Al golpear, puedes empujar al objetivo 3 m alejándolo de ti.'},
  {name:'Máscara de Muchos Rostros',lvl:null,  uses:0, rest:'none', desc:'Puedes lanzar Disfrazarte a voluntad, sin gastar ranuras.'},
  {name:'Ojos del Conservador de Runas',lvl:null,uses:0,rest:'none',desc:'Puedes leer todos los sistemas de escritura.'},
  {name:'Vigor Infernal',           lvl:null,  uses:0, rest:'none', desc:'Puedes lanzar Vida Falsa a voluntad sobre ti mismo, sin gastar ranuras.'},
  {name:'Visiones Neblinosas',      lvl:null,  uses:0, rest:'none', desc:'Puedes lanzar Imagen Silenciosa a voluntad, sin gastar ranuras.'},
  {name:'Mirada de Dos Mentes',     lvl:null,  uses:0, rest:'none', desc:'Acción bonus: percibe a través de los sentidos de una criatura voluntaria inteligente adyacente.'},
  {name:'Voz del Amo de la Cadena', lvl:null,  uses:0, rest:'none', desc:'Req: Pacto de la Cadena. Comunícate telepáticamente con tu familiar a cualquier distancia del mismo plano.'},
  {name:'Uno con las Sombras',      lvl:5,     uses:0, rest:'none', desc:'Req: nv. 5. Cuando estés en un área con penumbra u oscuridad, puedes volverte invisible como acción. La invisibilidad termina si actúas.'},
  {name:'Señal de Mal Augurio',     lvl:5,     uses:1, rest:'long', desc:'Req: nv. 5. Lanzas Maldecir una vez sin gastar ranuras. Recuperas el uso al terminar un descanso largo.'},
  {name:'Robo de los Cinco Destinos',lvl:null, uses:1, rest:'long', desc:'Lanzas Anatema una vez sin gastar ranuras. Recuperas el uso al terminar un descanso largo.'},
  {name:'Hoja Sedienta',            lvl:5,     uses:0, rest:'none', desc:'Req: nv. 5, Pacto de la Hoja. Puedes atacar dos veces cuando realizas la acción de Atacar.'},
  {name:'Escultor de Carne',        lvl:7,     uses:1, rest:'long', desc:'Req: nv. 7. Lanzas Polimorfia una vez sin gastar ranuras. Recuperas el uso al terminar un descanso largo.'},
  {name:'Susurros Seductores',      lvl:7,     uses:1, rest:'long', desc:'Req: nv. 7. Lanzas Compulsión una vez sin gastar ranuras. Recuperas el uso al terminar un descanso largo.'},
  {name:'Libro de Secretos Ancestrales',lvl:null,uses:0,rest:'none',desc:'Req: Pacto del Libro. Puedes añadir rituales de cualquier clase a tu Libro de las Sombras.'},
  {name:'Susurros de la Tumba',     lvl:9,     uses:0, rest:'none', desc:'Req: nv. 9. Puedes lanzar Hablar con los Muertos a voluntad, sin gastar ranuras.'},
];

export const FEATS_DATA = [
  {name:'Alerta',              req:null,  uses:0, rest:'none', desc:'+5 a la iniciativa. No puedes ser sorprendido mientras estás consciente. Los atacantes ocultos no tienen ventaja contra ti.'},
  {name:'Atlético',            req:null,  uses:0, rest:'none', desc:'+1 FUE o DES. Trepar sin costar movimiento extra. Levantarte cuesta 5 pies de movimiento. Saltar largo = COR completo.'},
  {name:'Actor',               req:null,  uses:0, rest:'none', desc:'+1 CAR. Ventaja en Engaño/Interpretación al pasar por otra persona. Puedes imitar voces y acentos.'},
  {name:'Mago de Batalla',     req:'capacidad de lanzar al menos 1 conjuro', uses:0, rest:'none', desc:'Ventaja en TS de CON para mantener concentración. Puedes lanzar conjuros con manos ocupadas. Puedes lanzar conjuros como ataque de oportunidad.'},
  {name:'Portador de Carga',   req:null,  uses:0, rest:'none', desc:'Al cargar (30 pies en línea recta), puedes atacar una vez como acción bonus y/o derribar al objetivo (TS de FUE CD 15).'},
  {name:'Experto en Ballesta', req:null,  uses:0, rest:'none', desc:'Ignoras la propiedad "carga". Sin desventaja en ataques a distancia en CaC. Con ballesta de mano: ataque extra de acción bonus.'},
  {name:'Duelista Defensivo',  req:'competencia en estoques', uses:0, rest:'none', desc:'Reacción: añade tu modificador de competencia a la CA cuando te golpean con un ataque CaC usando un estoque.'},
  {name:'Combatiente con Dos Armas', req:null, uses:0, rest:'none', desc:'+1 CA con dos armas. Puedes usar armas que no sean ligeras para combatir con dos armas. Puedes llevar escudo y usar combate con dos armas.'},
  {name:'Explorador de Mazmorras',req:null,uses:0,rest:'none', desc:'Ventaja en TS vs trampas. Ventaja en PER para detectar puertas secretas. Resistencia al daño por trampas. No te puedes ralentizar al buscar puertas secretas.'},
  {name:'Resistente',          req:null,  uses:0, rest:'none', desc:'+1 CON. Cuando hagas un descanso corto y uses dados de golpe, puedes volver a tirar y quedarte con el mayor resultado.'},
  {name:'Adepto Elemental',    req:'capaz de lanzar al menos 1 conjuro', uses:0, rest:'none', desc:'Elige ácido, frío, fuego, relámpago o trueno. Los conjuros que uses de ese tipo ignoran la resistencia. Tratas los 1s como 2s en ese tipo de daño.'},
  {name:'Luchador',            req:'FUE 13', uses:0, rest:'none', desc:'Ventaja en ataques vs. criaturas a las que agarras. Criaturas agarradas no tienen ventaja al atacarte.'},
  {name:'Gran Maestro del Arma', req:'FUE 13', uses:0, rest:'none', desc:'Con armas pesadas: al golpear después de ataque ventajoso, -5 al ataque pero +10 al daño. Cuando derriban o haces crítico, ataque de arma como acción bonus.'},
  {name:'Sanador',             req:null,  uses:1, rest:'short', desc:'Con Kit de sanación: estabiliza a 0 PG (recupera 1 PG). Por criatura: 1d6+4 + HD de la criatura PG (solo 1 vez hasta descanso corto).'},
  {name:'Armadura Pesada',     req:'Armadura Media', uses:0, rest:'none', desc:'+1 FUE. Competencia con armadura pesada.'},
  {name:'Maestro de Armadura Pesada', req:'FUE 15, competencia armadura pesada', uses:0, rest:'none', desc:'+3 de reducción de daño no mágico (contundente, cortante, perforante) cuando lleves armadura pesada.'},
  {name:'Líder Inspirador',    req:'CAR 13', uses:1, rest:'short', desc:'Charla inspiradora de 10 min: hasta 6 aliados (contigo) ganan PG temporales iguales a tu nivel + mod. CAR.'},
  {name:'Mente Aguda',         req:null,  uses:0, rest:'none', desc:'+1 INT. Siempre sabes norte. Recuerdas todo lo que hayas visto u oído en el último mes. Puedes retener detalles de mapas, texto, etc.'},
  {name:'Armadura Ligera',     req:null,  uses:0, rest:'none', desc:'+1 DES o FUE. Competencia con armadura ligera.'},
  {name:'Lingüista',           req:null,  uses:0, rest:'none', desc:'+1 INT. Aprendes 3 idiomas. Puedes crear y descifrar códigos escritos.'},
  {name:'Suertudo',            req:null,  uses:3, rest:'long', desc:'3 puntos de suerte por descanso largo. Gástalo para relanzar cualquier d20 propio o de un atacante.'},
  {name:'Asesino de Magos',   req:null,  uses:0, rest:'none', desc:'Ventaja en ataques vs. lanzadores de conjuros dentro de CaC. Puedes interrumpir conjuros como reacción (el lanzador hace TS de CON).'},
  {name:'Iniciado en Magia',   req:null,  uses:0, rest:'none', desc:'Elige Bardo, Clérigo, Druida, Hechicero, Mago o Brujo: aprende 2 trucos y 1 conjuro de nivel 1 de esa lista. Lanzas el de nv.1 1 vez sin ranura.'},
  {name:'Adepto Marcial',      req:null,  uses:2, rest:'long', desc:'Aprende 2 maniobras de combate del Maestro de Batalla. 1 dado de superioridad (d6) que se recarga al terminar descanso corto/largo.'},
  {name:'Maestro de Armadura Media',req:'competencia armadura media', uses:0, rest:'none', desc:'No hay desventaja en Sigilo con armadura media. CA máx. con armadura media = 15 + mod. DES (sin límite de 2).'},
  {name:'Móvil',               req:null,  uses:0, rest:'none', desc:'+3m (10 pies) de velocidad. Al cargar, los ataques de oportunidad por ese movimiento tienen desventaja. Si atacas a una criatura, no provoca AOO de ti.'},
  {name:'Armadura Moderada',   req:'competencia armadura ligera', uses:0, rest:'none', desc:'+1 DES o FUE. Competencia con armadura media y escudos.'},
  {name:'Combatiente Montado', req:null,  uses:0, rest:'none', desc:'Ventaja en ataques contra criaturas sin montura y más pequeñas que tu montura. Puedes redirigir ataques a tu montura hacia ti.'},
  {name:'Observador',          req:null,  uses:0, rest:'none', desc:'+5 a Percepción e Investigación pasivas. Puedes leer labios si oyes el idioma.'},
  {name:'Maestro del Arma de Asta', req:null, uses:0, rest:'none', desc:'Ataques de oportunidad al entrar en tu alcance. Acción bonus: ataque con el extremo del arma por 1d4 + mod. FUE.'},
  {name:'Robusto',             req:null,  uses:0, rest:'none', desc:'+1 a una característica. Competencia en TS con esa misma característica.'},
  {name:'Lanzador Ritual',     req:'INT/SAB/CAR 13', uses:0, rest:'none', desc:'Elige una clase: aprende 2 conjuros rituales de nivel 1 de esa clase. Puedes copiar más rituales de rollos (en un libro de rituales).'},
  {name:'Atacante Salvaje',    req:null,  uses:0, rest:'none', desc:'1 vez por turno, cuando golpees con un arma CaC: tira los dados de daño dos veces y quédate con el mayor resultado.'},
  {name:'Centinela',           req:null,  uses:0, rest:'none', desc:'Los AOO que hagas reducen la vel. a 0. Puedes atacar como reacción a criaturas que se alejan de tus aliados adyacentes. Las criaturas dentro de tu alcance no pueden desviar movimiento.'},
  {name:'Tirador Certero',     req:null,  uses:0, rest:'none', desc:'Ignoras cobertura media y tres cuartos. Sin desventaja por alcance largo. Opcionalmente: -5 al ataque de arma a distancia para +10 al daño.'},
  {name:'Maestro del Escudo',  req:null,  uses:0, rest:'none', desc:'Acción bonus: intentar derribar. Si pagas un TS de DES y el conjuro solo afecta a ti, puedes esquivarlo (no sufres daño con TS exitoso).'},
  {name:'Habilidoso',          req:null,  uses:0, rest:'none', desc:'Ganas competencia en 3 habilidades o herramientas a elección.'},
  {name:'Acechador',           req:'DES 13', uses:0, rest:'none', desc:'Puedes intentar esconderte en luz tenue (no total). No fallas Sigilo solo por moverte lentamente. Fallar un ataque oculto no te revela.'},
  {name:'Cazador de Conjuros', req:'capacidad de lanzar al menos 1 conjuro', uses:0, rest:'none', desc:'El alcance de tus conjuros de ataque se dobla. Ignoras cobertura media y tres cuartos. Aprendes 1 truco adicional de conjuro de ataque.'},
  {name:'Tabernero Pendenciero',req:null, uses:0, rest:'none', desc:'+1 FUE o CON. Competencia en armas improvisadas. Puedes agarrar como acción bonus al golpear con arma improvisada o sin arma.'},
  {name:'Resistente (Duro)',   req:null,  uses:0, rest:'none', desc:'+2 al máximo de PG y +2 PG por cada nivel que suba. (Nota: en PHB se llama "Tough").'},
  {name:'Maestro de Armas',    req:null,  uses:0, rest:'none', desc:'Competencia con 4 armas simples o marciales a elección.'},
];

export const SORCERER_METAMAGIC = [
  {name:'Conjuro Cuidadoso',  cost:1, desc:'Elige hasta (mod. CAR) criaturas: superan automáticamente la tirada de salvación del conjuro. Coste: 1 Punto de Hechicería.'},
  {name:'Conjuro Distante',   cost:1, desc:'Dobla el alcance del conjuro (o 9 m si el alcance era "toque"). Coste: 1 Punto de Hechicería.'},
  {name:'Conjuro Potenciado', cost:1, desc:'Vuelve a tirar hasta (mod. CAR) dados de daño; debes usar los nuevos resultados. Coste: 1 Punto de Hechicería.'},
  {name:'Conjuro Prolongado', cost:1, desc:'Dobla la duración del conjuro (máx. 24 h). Coste: 1 Punto de Hechicería.'},
  {name:'Conjuro Elevado',    cost:3, desc:'Una criatura afectada tiene desventaja en su primera tirada de salvación contra el conjuro. Coste: 3 Puntos de Hechicería.'},
  {name:'Conjuro Acelerado',  cost:2, desc:'Cambia el tiempo de lanzamiento de "1 acción" a "1 acción bonus". Coste: 2 Puntos de Hechicería.'},
  {name:'Conjuro Sutil',      cost:1, desc:'Lanza el conjuro sin componentes verbales ni gestuales. Coste: 1 Punto de Hechicería.'},
  {name:'Conjuro Gemelar',    cost:'= nivel', desc:'El conjuro de objetivo único afecta a un segundo objetivo. Coste: Puntos de Hechicería iguales al nivel del conjuro (mín. 1).'},
];

export function renderTraits() {
  const container = document.getElementById('traitsExtra');
  if (!container) return;
  if (state.traits.length === 0) {
    container.innerHTML = `<div style="font-family:'IM Fell English',serif;font-style:italic;color:var(--text-muted);font-size:13px;text-align:center;padding:12px 0;">Añade rasgos, dotes o habilidades especiales aquí</div>`;
    return;
  }
  const editMode = document.body.classList.contains('edit-mode');
  container.innerHTML = '';
  state.traits.forEach((t, i) => {
    const hasUses = t.maxUses > 0;
    const pipsHtml = hasUses
      ? Array.from({ length: t.maxUses }, (_, p) =>
          `<span class="trait-pip ${p < t.usesLeft ? 'available' : 'spent'}" onclick="spendTraitUse(${i},${p})" title="${p < t.usesLeft ? 'Gastar uso' : 'Recuperar uso'}"></span>`
        ).join('')
      : '';
    const restBadge = hasUses && t.restType !== 'none'
      ? `<span class="trait-rest-badge ${t.restType}">${t.restType === 'short' ? 'Desc. Corto' : 'Desc. Largo'}</span>`
      : '';
    const editControls = `
      <div class="trait-edit-controls">
        <label class="trait-edit-label">Usos:</label>
        <input type="number" min="0" max="20" value="${t.maxUses}" style="width:44px;" onchange="updateTraitField(${i},'maxUses',parseInt(this.value)||0)">
        <label class="trait-edit-label">Recarga:</label>
        <select onchange="updateTraitField(${i},'restType',this.value)">
          <option value="none" ${t.restType==='none'?'selected':''}>Ninguna</option>
          <option value="short" ${t.restType==='short'?'selected':''}>Desc. Corto</option>
          <option value="long" ${t.restType==='long'?'selected':''}>Desc. Largo</option>
        </select>
        <button class="trait-delete-btn" onclick="deleteTrait(${i})">✕ Eliminar</button>
      </div>`;
    const div = document.createElement('div');
    div.className = 'trait-entry';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
        <div class="trait-name" contenteditable="${editMode?'true':'false'}" onblur="updateTraitField(${i},'name',this.textContent.trim())">${escapeAttr(t.name)}</div>
        ${restBadge}
      </div>
      <div class="trait-desc" contenteditable="${editMode?'true':'false'}" onblur="updateTraitField(${i},'desc',this.textContent.trim())">${escapeAttr(t.desc)}</div>
      ${hasUses ? `<div class="trait-uses-row">${pipsHtml}</div>` : ''}
      ${editControls}
    `;
    container.appendChild(div);
  });
}

export function addTrait() {
  state.traits.push({ name: 'Nuevo rasgo', desc: 'Descripción del rasgo...', maxUses: 0, usesLeft: 0, restType: 'none' });
  renderTraits();
  window.saveToLocal?.();
}

export function addClassAbility(type, selectId) {
  const name = document.getElementById(selectId)?.value;
  if (!name) return;
  const dataMap = { invocation: WARLOCK_INVOCATIONS, metamagic: SORCERER_METAMAGIC, feat: FEATS_DATA };
  const data = dataMap[type] || [];
  const preset = data.find(d => d.name === name);
  if (!preset) return;
  if (state.traits.some(t => t.name === preset.name)) {
    showToast(`⚠ "${preset.name}" ya está en la lista`); return;
  }
  const maxUses = preset.uses ?? 0;
  state.traits.push({ name: preset.name, desc: preset.desc, maxUses, usesLeft: maxUses, restType: preset.rest || 'none' });
  renderTraits();
  showToast(`✦ ${preset.name} añadida`);
  window.saveToLocal?.();
}

export function updateTraitField(i, field, value) {
  if (!state.traits[i]) return;
  if (field === 'maxUses') {
    state.traits[i].maxUses = Math.max(0, parseInt(value) || 0);
    state.traits[i].usesLeft = Math.min(state.traits[i].usesLeft, state.traits[i].maxUses);
  } else {
    state.traits[i][field] = value;
  }
  renderTraits();
  window.saveToLocal?.();
}

export function spendTraitUse(i, pip) {
  if (!state.traits[i]) return;
  if (pip < state.traits[i].usesLeft) {
    state.traits[i].usesLeft--;
  } else {
    state.traits[i].usesLeft = Math.min(state.traits[i].maxUses, state.traits[i].usesLeft + 1);
  }
  renderTraits();
  window.saveToLocal?.();
}

export function deleteTrait(i) {
  state.traits.splice(i, 1);
  renderTraits();
  window.saveToLocal?.();
}

export function resetTraitUses(restType) {
  state.traits.forEach(t => {
    if (t.maxUses > 0 && (restType === 'long' || t.restType === restType)) {
      t.usesLeft = t.maxUses;
    }
  });
  renderTraits();
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.renderTraits    = renderTraits;
window.addTrait        = addTrait;
window.addClassAbility = addClassAbility;
window.updateTraitField = updateTraitField;
window.spendTraitUse   = spendTraitUse;
window.deleteTrait     = deleteTrait;
window.resetTraitUses  = resetTraitUses;
window.WARLOCK_INVOCATIONS = WARLOCK_INVOCATIONS;
window.SORCERER_METAMAGIC  = SORCERER_METAMAGIC;
window.FEATS_DATA          = FEATS_DATA;
