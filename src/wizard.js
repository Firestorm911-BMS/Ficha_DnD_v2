/* ═══════════════════════════════════════════════
   WIZARD V2 — Creación de personaje
   ES Module — importa state.js y toast-log.js directamente.
═══════════════════════════════════════════════ */

import { state } from './state.js';
import { showToast } from './modules/toast-log.js';

// ─── Constantes ──────────────────────────────
  const ATTRS = ['STR','DEX','CON','INT','WIS','CHA'];
  const ES    = { STR:'FUE', DEX:'DES', CON:'CON', INT:'INT', WIS:'SAB', CHA:'CAR' };
  const ES_LONG = { STR:'Fuerza', DEX:'Destreza', CON:'Constitución', INT:'Inteligencia', WIS:'Sabiduría', CHA:'Carisma' };
  const PB_COST = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
  const PB_POOL = 27;
  const STANDARD_ARRAY = [15,14,13,12,10,8];

  const ALIGNMENTS = [
    'Legal Bueno','Neutral Bueno','Caótico Bueno',
    'Legal Neutral','Neutral','Caótico Neutral',
    'Legal Malvado','Neutral Malvado','Caótico Malvado',
    'Sin alineamiento'
  ];

  // Idiomas comunes en D&D 5e
  const LANGUAGES_POOL = [
    'Común','Enano','Élfico','Gigante','Gnomo','Goblin','Mediano','Orco',
    'Abisal','Celestial','Dracónico','Profundo','Infernal','Primordial','Silvano','Subcomún'
  ];

  // ─── Estado del wizard ─────────────────────────────────────────
  const W = window._wiz = {
    step: 1,
    steps: 9,
    names: ['Identidad','Especie','Clase','Trasfondo','Atributos','Habilidades','Equipo','Historia','Resumen'],
    classes: null,
    species: null,
    backgrounds: null,
    data: defaultData(),
  };

  function defaultData() {
    return {
      // Identidad
      name: '', epithet: '', player: '',
      alignment: 'Neutral', deity: '',
      // Especie
      raceId: '', subraceId: '', racialChoices: [], extraLang: '',
      // Clase
      cls: '', level: 1, cls2: '', level2: 0, subclass: '',
      // Trasfondo
      backgroundId: '', bgLanguages: [],
      // Atributos
      attrMethod: 'pointbuy',
      pb: { STR:8,DEX:8,CON:8,INT:8,WIS:8,CHA:8 },
      array: { STR:null,DEX:null,CON:null,INT:null,WIS:null,CHA:null },
      rolledPool: [],
      rolled: { STR:null,DEX:null,CON:null,INT:null,WIS:null,CHA:null },
      manual: { STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10 },
      // Habilidades de clase
      classSkills: [],
      // Equipo de clase (paso 7)
      equipmentChoices: [],
      // Historia (paso 8)
      pTraits: '', pIdeals: '', pBonds: '', pFlaws: '',
      appGender: '', appAge: '', appHeight: '', appWeight: '',
      appSkin: '', appEyes: '', appHair: '',
      historia: '',
    };
  }

  // ─── Helpers visuales ──────────────────────────────────────────
  const css = {
    L:  'font-family:Cinzel,serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:5px;',
    S:  'width:100%;background:var(--bg-deep);border:1px solid var(--border);color:var(--text-primary);padding:8px 10px;border-radius:6px;font-family:Cinzel,serif;font-size:12px;box-sizing:border-box;',
    info: 'background:rgba(var(--panel-rgb),0.45);border:1px solid var(--border);border-radius:6px;padding:10px 12px;font-size:12px;color:var(--text-secondary);line-height:1.55;',
    hint: 'font-size:10px;color:var(--text-muted);font-style:italic;font-family:\'IM Fell English\',serif;margin-top:4px;',
    panel: 'background:rgba(var(--panel-rgb),0.35);border:1px solid var(--border);border-radius:8px;padding:14px;',
    chip: 'display:inline-block;padding:3px 9px;border:1px solid var(--gold-dark);border-radius:12px;font-size:10px;color:var(--gold);background:rgba(var(--panel-rgb),0.5);margin:2px 4px 2px 0;',
    btn: 'font-family:Cinzel,serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;padding:6px 12px;border:1px solid var(--border);background:var(--bg-deep);color:var(--text-primary);border-radius:4px;cursor:pointer;transition:all 0.2s;',
    btnActive: 'border-color:var(--gold);background:linear-gradient(180deg,var(--gold-dark),rgba(var(--panel-rgb),0.7));color:var(--gold-light);box-shadow:0 0 14px -4px var(--gold-glow);'
  };

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ═══════════════════════════════════════════════
  //  Entradas públicas (reemplazan a las del app.js)
  // ═══════════════════════════════════════════════
  window.openCreationWizard = function () {
    const w = document.getElementById('creationWizard');
    if (!w) return;
    w.style.display = 'flex';
    W.data = defaultData();
    W.step = 1;
    // Reload if never loaded OR if previous load failed (empty arrays)
    if (!W.classes || !W.classes.length) {
      _loadData().then(() => _render());
    } else {
      _render();
    }
  };

  window.closeCreationWizard = function () {
    const w = document.getElementById('creationWizard');
    if (w) w.style.display = 'none';
  };

  window._wizBack = function () { if (W.step > 1) { _saveStep(); W.step--; _render(); } };
  window._wizNext = function () {
    if (!_validate()) return;
    _saveStep();
    if (W.step === W.steps) { _complete(); return; }
    W.step++; _render();
  };

  // Carga de datos JSON
  async function _loadData() {
    const _tryFetch = async (url, label) => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
      } catch (e) {
        showToast(`Wizard: no se pudo cargar ${label}. Abrí con servidor local (http.server 8080).`, 'warn');
        console.warn(`[wizard] fetch ${url}:`, e);
        return null;
      }
    };
    W.classes     = await _tryFetch('./src/data/classes.json',     'clases');
    W.backgrounds = await _tryFetch('./src/data/backgrounds.json', 'trasfondos');
    W.species     = await _tryFetch('./src/data/species.json',     'especies');
  }

  // ═══════════════════════════════════════════════
  //  Render + navegación
  // ═══════════════════════════════════════════════
  function _render() {
    _updateBar();
    const fns = [null, _step1, _step2, _step3, _step4, _step5, _step6, _step7, _step8, _step9];
    const body = document.getElementById('wizBody');
    if (body && fns[W.step]) {
      body.innerHTML = fns[W.step]();
      body.scrollTop = 0;
    }
    _updateNav();
    // Hooks post-render para refrescar info contextual
    if (W.step === 2 && W.data.raceId) _onRaceChange();
    if (W.step === 3 && W.data.cls)    _onClsChange();
    if (W.step === 3 && W.data.cls2)   _onCls2Change();
    if (W.step === 4 && W.data.backgroundId) _onBgChange();
  }

  function _updateBar() {
    const bar = document.getElementById('wizStepBar');
    if (!bar) return;
    bar.innerHTML = W.names.map((n, i) => {
      const idx = i + 1, active = idx === W.step, done = idx < W.step;
      const col = active ? 'var(--gold)' : done ? 'var(--gold-dark)' : 'var(--border)';
      const tc  = active || done ? 'var(--text-muted)' : 'var(--border)';
      return `${i > 0 ? `<div style="flex:1;height:1px;background:${done?'var(--gold-dark)':'var(--border)'};margin:0 2px;align-self:flex-start;margin-top:11px;"></div>` : ''}
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${col};background:${active?'var(--gold)':'var(--bg-deep)'};display:flex;align-items:center;justify-content:center;font-family:Cinzel,serif;font-size:9px;color:${active?'var(--bg-deep)':done?'var(--gold-dark)':'var(--border)'};">${done?'✓':idx}</div>
          <div style="font-family:Cinzel,serif;font-size:7px;letter-spacing:.4px;text-transform:uppercase;color:${tc};white-space:nowrap;">${n}</div>
        </div>`;
    }).join('');
    const lbl = document.getElementById('wizStepLabel');
    if (lbl) lbl.textContent = `Paso ${W.step} de ${W.steps}`;
  }

  function _updateNav() {
    const back = document.getElementById('wizBtnBack');
    const next = document.getElementById('wizBtnNext');
    if (back) back.style.visibility = W.step > 1 ? 'visible' : 'hidden';
    if (next) next.textContent = W.step === W.steps ? '✦ Crear Personaje' : 'Siguiente →';
  }

  // ═══════════════════════════════════════════════
  //  Validación por paso
  // ═══════════════════════════════════════════════
  function _validate() {
    const d = W.data;

    if (W.step === 1) {
      const name = (document.getElementById('wz_name')?.value || '').trim();
      if (!name) { showToast('⚠ Escribe un nombre'); return false; }
    }

    if (W.step === 2) {
      const raceId = document.getElementById('wz_race')?.value || '';
      if (!raceId) { showToast('⚠ Elige una especie'); return false; }
      const race = W.species.find(r => r.id === raceId);
      if (race?.subraces?.length && !document.getElementById('wz_subrace')?.value) {
        showToast('⚠ Elige una subraza'); return false;
      }
      const sub = race?.subraces?.find(s => s.id === document.getElementById('wz_subrace')?.value) || null;
      if (race?.abilityBonus?._choose2 || sub?.abilityBonus?._choose2) {
        const picks = [...document.querySelectorAll('.wz_racial_pick')].map(s => s.value).filter(Boolean);
        if (picks.length < 2 || new Set(picks).size < 2) {
          showToast('⚠ Elige dos atributos distintos para el bono racial'); return false;
        }
      }
    }

    if (W.step === 3) {
      if (!W.classes) { showToast('⚠ Datos de clase no disponibles. Abrí el wizard con servidor local.', 'error'); return false; }
      const cls = document.getElementById('wz_cls')?.value || '';
      if (!cls) { showToast('⚠ Elige una clase'); return false; }
      const lvl = parseInt(document.getElementById('wz_lvl')?.value) || 0;
      if (lvl < 1 || lvl > 20) { showToast('⚠ Nivel entre 1 y 20'); return false; }
      if (document.getElementById('wz_multi')?.checked) {
        const c2 = document.getElementById('wz_cls2')?.value || '';
        if (!c2) { showToast('⚠ Elige la segunda clase o desmarca multiclase'); return false; }
        if (c2 === cls) { showToast('⚠ Las dos clases deben ser distintas'); return false; }
        if (lvl + (parseInt(document.getElementById('wz_lvl2')?.value) || 0) > 20) {
          showToast('⚠ Nivel total no puede superar 20'); return false;
        }
      }
    }

    if (W.step === 4) {
      if (!document.getElementById('wz_bg')?.value) { showToast('⚠ Elige un trasfondo'); return false; }
    }

    if (W.step === 5) {
      const m = d.attrMethod;
      if (m === 'pointbuy' && _pbSpent() > PB_POOL) {
        showToast(`⚠ Gastaste ${_pbSpent()} pts (máx ${PB_POOL})`); return false;
      }
      if (m === 'array') {
        const used = ATTRS.map(a => d.array[a]).filter(v => v != null);
        if (used.length < 6 || new Set(used).size < 6) {
          showToast('⚠ Asigna cada valor del array a un atributo distinto'); return false;
        }
      }
      if (m === 'roll') {
        const used = ATTRS.map(a => d.rolled[a]).filter(v => v != null);
        if (!d.rolledPool.length) { showToast('⚠ Tira los dados primero'); return false; }
        if (used.length < 6 || new Set(ATTRS.map(a => d.rolled[a]).filter(Boolean).map((v,i) => i+'-'+v)).size < 6) {
          showToast('⚠ Asigna las 6 tiradas a los 6 atributos'); return false;
        }
      }
      // Multiclase req check
      if (d.cls2 && d.level2 > 0) {
        const scores = _finalScores();
        const cd1 = W.classes.find(c => c.id === d.cls);
        const cd2 = W.classes.find(c => c.id === d.cls2);
        if (cd1?.multiclassReqs && !_meetsMultiReq(cd1.multiclassReqs, scores)) {
          showToast(`⚠ Req. multiclase ${d.cls}: ${cd1.multiclassReqs.display}`); return false;
        }
        if (cd2?.multiclassReqs && !_meetsMultiReq(cd2.multiclassReqs, scores)) {
          showToast(`⚠ Req. multiclase ${d.cls2}: ${cd2.multiclassReqs.display}`); return false;
        }
      }
    }

    if (W.step === 6) {
      const cls = W.classes.find(c => c.id === d.cls);
      const want = cls?.skills?.choose || 0;
      const picks = [...document.querySelectorAll('.wz_skill_pick:checked')].map(c => c.value);
      if (picks.length < want) { showToast(`⚠ Elige ${want} habilidades de clase`); return false; }
    }

    return true;
  }

  function _meetsMultiReq(reqs, scores) {
    if (!reqs?.check) return true;
    if (reqs.logic === 'or') return reqs.check.some(c => Object.entries(c).every(([k,v]) => (scores[k]||0) >= v));
    return reqs.check.every(c => Object.entries(c).every(([k,v]) => (scores[k]||0) >= v));
  }

  function _saveStep() {
    const d = W.data;
    if (W.step === 1) {
      d.name      = (document.getElementById('wz_name')?.value || '').trim();
      d.epithet   = (document.getElementById('wz_epithet')?.value || '').trim();
      d.player    = (document.getElementById('wz_player')?.value || '').trim();
      d.alignment = document.getElementById('wz_align')?.value || 'Neutral';
      d.deity     = (document.getElementById('wz_deity')?.value || '').trim();
    }
    if (W.step === 2) {
      d.raceId    = document.getElementById('wz_race')?.value || '';
      d.subraceId = document.getElementById('wz_subrace')?.value || '';
      d.racialChoices = [...new Set([...document.querySelectorAll('.wz_racial_pick')].map(s => s.value).filter(Boolean))];
      d.extraLang = document.getElementById('wz_extra_lang')?.value || '';
    }
    if (W.step === 3) {
      d.cls      = document.getElementById('wz_cls')?.value || '';
      d.level    = parseInt(document.getElementById('wz_lvl')?.value) || 1;
      d.subclass = document.getElementById('wz_subclass')?.value || '';
      const isM  = document.getElementById('wz_multi')?.checked;
      d.cls2   = isM ? (document.getElementById('wz_cls2')?.value || '') : '';
      d.level2 = isM && d.cls2 ? (parseInt(document.getElementById('wz_lvl2')?.value) || 1) : 0;
    }
    if (W.step === 4) {
      d.backgroundId = document.getElementById('wz_bg')?.value || '';
      d.bgLanguages  = [...document.querySelectorAll('.wz_bg_lang')].map(s => s.value).filter(Boolean);
    }
    if (W.step === 5) {
      // pb/array/rolled/manual ya se actualizan in-place
    }
    if (W.step === 6) {
      d.classSkills = [...document.querySelectorAll('.wz_skill_pick:checked')].map(c => c.value);
    }
    if (W.step === 8) {
      d.pTraits   = (document.getElementById('wz_pTraits')?.value   || '').trim();
      d.pIdeals   = (document.getElementById('wz_pIdeals')?.value   || '').trim();
      d.pBonds    = (document.getElementById('wz_pBonds')?.value    || '').trim();
      d.pFlaws    = (document.getElementById('wz_pFlaws')?.value    || '').trim();
      d.appGender = (document.getElementById('wz_appGender')?.value || '').trim();
      d.appAge    = (document.getElementById('wz_appAge')?.value    || '').trim();
      d.appHeight = (document.getElementById('wz_appHeight')?.value || '').trim();
      d.appWeight = (document.getElementById('wz_appWeight')?.value || '').trim();
      d.appSkin   = (document.getElementById('wz_appSkin')?.value   || '').trim();
      d.appEyes   = (document.getElementById('wz_appEyes')?.value   || '').trim();
      d.appHair   = (document.getElementById('wz_appHair')?.value   || '').trim();
      d.historia  = (document.getElementById('wz_historia')?.value  || '').trim();
    }
    if (W.step === 7) {
      (d.equipmentChoices || []).forEach((choice, i) => {
        if (choice.type === 'radio') {
          const checked = document.querySelector(`input[name="wz_eq_${i}"]:checked`);
          if (checked) choice.selected = parseInt(checked.value);
        } else {
          const cb = document.getElementById(`wz_eq_${i}`);
          if (cb) choice.checked = cb.checked;
        }
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  STEP 1 — Identidad
  // ═══════════════════════════════════════════════
  function _step1() {
    const d = W.data;
    return `
      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:16px;color:var(--gold);letter-spacing:2px;">¿Quién es tu héroe?</div>
        <div style="${css.hint}margin-top:2px;">Lo único obligatorio es el nombre. Lo demás lo podés dejar para después.</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr;gap:14px;">
        <div>
          <label style="${css.L}">Nombre del personaje *</label>
          <input id="wz_name" value="${esc(d.name)}" placeholder="Ej. Thorin, Llüfken, Elara…"
            style="${css.S}font-family:'IM Fell English',serif;font-size:18px;text-align:center;"
            onkeydown="if(event.key==='Enter')_wizNext()">
        </div>

        <div>
          <label style="${css.L}">Epíteto / Título <span style="text-transform:none;color:var(--text-muted);">(opcional)</span></label>
          <input id="wz_epithet" value="${esc(d.epithet)}" placeholder="Ej. Portador del Relámpago, el Errante…"
            style="${css.S}font-family:'IM Fell English',serif;font-style:italic;">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="${css.L}">Alineamiento</label>
            <select id="wz_align" style="${css.S}">
              ${ALIGNMENTS.map(a => `<option ${a===d.alignment?'selected':''}>${a}</option>`).join('')}
            </select>
            <div style="${css.hint}">Cómo se comporta moralmente.</div>
          </div>
          <div>
            <label style="${css.L}">Fe / Deidad <span style="text-transform:none;color:var(--text-muted);">(opcional)</span></label>
            <input id="wz_deity" value="${esc(d.deity)}" placeholder="Naturaleza, Tyr, Tharizdun…"
              style="${css.S}">
          </div>
        </div>

        <div>
          <label style="${css.L}">Jugador <span style="text-transform:none;color:var(--text-muted);">(opcional)</span></label>
          <input id="wz_player" value="${esc(d.player)}" placeholder="Tu nombre o nick"
            style="${css.S}">
        </div>
      </div>`;
  }

  // ═══════════════════════════════════════════════
  //  STEP 2 — Especie
  // ═══════════════════════════════════════════════
  function _step2() {
    const d = W.data;
    const opts = (W.species || []).map(r =>
      `<option value="${r.id}" ${r.id===d.raceId?'selected':''}>${r.nombre}</option>`
    ).join('');
    return `
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:14px;color:var(--gold);">Tu linaje</div>
        <div style="${css.hint}">La especie define ajustes a tus atributos, velocidad, sentidos y rasgos innatos.</div>
      </div>

      <div style="margin-bottom:14px;">
        <label style="${css.L}">Especie / Raza</label>
        <select id="wz_race" style="${css.S}" onchange="_wizOnRaceChange()">
          <option value="">— Elige especie —</option>${opts}
        </select>
      </div>

      <div id="wz_subrace_row" style="margin-bottom:12px;"></div>
      <div id="wz_racial_choices_row" style="margin-bottom:12px;"></div>
      <div id="wz_extra_lang_row" style="margin-bottom:12px;"></div>
      <div id="wz_race_info" style="${css.info}min-height:50px;"></div>`;
  }

  window._wizOnRaceChange = _onRaceChange;
  function _onRaceChange() {
    const raceId = document.getElementById('wz_race')?.value || '';
    const race = (W.species || []).find(r => r.id === raceId);
    const sub = race?.subraces?.[0] || null;

    // Subraza
    const subRow = document.getElementById('wz_subrace_row');
    if (subRow) {
      if (race?.subraces?.length) {
        const opts = race.subraces.map(s =>
          `<option value="${s.id}" ${s.id===W.data.subraceId?'selected':''}>${s.nombre}</option>`
        ).join('');
        subRow.innerHTML = `<label style="${css.L}">Subraza / Variante</label>
          <select id="wz_subrace" style="${css.S}" onchange="_wizOnSubraceChange()">
            <option value="">— Elige subraza —</option>${opts}
          </select>`;
      } else {
        subRow.innerHTML = '';
        W.data.subraceId = '';
      }
    }

    _renderRaceInfo(race, race?.subraces?.find(s => s.id === W.data.subraceId) || null);
    _renderRacialChoices(race, race?.subraces?.find(s => s.id === W.data.subraceId) || null);
    _renderExtraLang(race);
  }

  window._wizOnSubraceChange = _onSubraceChange;
  function _onSubraceChange() {
    const raceId = document.getElementById('wz_race')?.value || '';
    const subraceId = document.getElementById('wz_subrace')?.value || '';
    const race = (W.species || []).find(r => r.id === raceId);
    const sub = race?.subraces?.find(s => s.id === subraceId);
    _renderRaceInfo(race, sub);
    _renderRacialChoices(race, sub);
  }

  function _renderRaceInfo(race, sub) {
    const el = document.getElementById('wz_race_info');
    if (!el || !race) { if (el) el.innerHTML = ''; return; }
    const traits = [...(race.traits || []), ...(sub ? sub.traits || [] : [])]
      .map(t => `<li style="margin-bottom:3px;">${esc(t)}</li>`).join('');
    const bonStr = _bonusStr(race.abilityBonus, sub?.abilityBonus);
    const langs = (race.languages || []).join(', ') || '—';
    el.innerHTML = `
      <div style="font-family:Cinzel,serif;font-size:12px;color:var(--gold);margin-bottom:6px;letter-spacing:1px;">${esc(sub ? sub.nombre : race.nombre)}</div>
      <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Atributos:</strong> ${bonStr || '—'}</div>
      <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Velocidad:</strong> ${sub?.speed ?? race.speed} ft · <strong>Visión:</strong> ${esc(sub?.vision ?? race.vision)}</div>
      <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Idiomas:</strong> ${esc(langs)}</div>
      ${traits ? `<ul style="margin:6px 0 0 16px;padding:0;color:var(--text-secondary);font-size:11px;">${traits}</ul>` : ''}
      ${sub?.desc ? `<div style="${css.hint}margin-top:6px;">${esc(sub.desc)}</div>` : ''}`;
  }

  function _bonusStr(base, sub) {
    const m = {};
    for (const [k,v] of Object.entries(base || {})) m[k] = (m[k]||0) + v;
    for (const [k,v] of Object.entries(sub  || {})) m[k] = (m[k]||0) + v;
    return Object.entries(m).map(([k,v]) =>
      k === '_choose2' ? `+${v} a 2 (elección)` :
      (ATTRS.includes(k) ? `+${v} ${ES[k]}` : null)
    ).filter(Boolean).join(', ');
  }

  function _renderRacialChoices(race, sub) {
    const el = document.getElementById('wz_racial_choices_row');
    if (!el) return;
    const hasChoose = race?.abilityBonus?._choose2 || sub?.abilityBonus?._choose2;
    if (!hasChoose) { el.innerHTML = ''; return; }
    const fixed = Object.keys(Object.assign({}, race?.abilityBonus, sub?.abilityBonus)).filter(k => ATTRS.includes(k));
    const opts = ATTRS.filter(a => !fixed.includes(a)).map(a => `<option value="${a}">${ES_LONG[a]}</option>`).join('');
    const prev = W.data.racialChoices || [];
    const mk = (i) => `<select class="wz_racial_pick" style="${css.S}"><option value="">— Atrib. ${i+1} —</option>${opts}</select>`;
    el.innerHTML = `<label style="${css.L}">Elige 2 atributos para el bono racial +${hasChoose}</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${mk(0)}${mk(1)}</div>`;
    const sels = [...el.querySelectorAll('.wz_racial_pick')];
    if (prev[0] && sels[0]) sels[0].value = prev[0];
    if (prev[1] && sels[1]) sels[1].value = prev[1];
  }

  function _renderExtraLang(race) {
    const el = document.getElementById('wz_extra_lang_row');
    if (!el) return;
    const needs = (race?.languages || []).some(l => /elección|extra|adicional/i.test(l));
    if (!needs) { el.innerHTML = ''; W.data.extraLang = ''; return; }
    const known = new Set((race?.languages || []).filter(l => !/elección|extra|adicional/i.test(l)));
    const opts = LANGUAGES_POOL.filter(l => !known.has(l))
      .map(l => `<option ${l===W.data.extraLang?'selected':''}>${l}</option>`).join('');
    el.innerHTML = `<label style="${css.L}">Idioma extra a elección</label>
      <select id="wz_extra_lang" style="${css.S}"><option value="">— Elige idioma —</option>${opts}</select>`;
  }

  // ═══════════════════════════════════════════════
  //  STEP 3 — Clase
  // ═══════════════════════════════════════════════
  function _step3() {
    const d = W.data;
    const opts1 = (W.classes || []).map(c => `<option value="${c.id}" ${c.id===d.cls?'selected':''}>${c.id}</option>`).join('');
    const opts2 = (W.classes || []).map(c => `<option value="${c.id}" ${c.id===d.cls2?'selected':''}>${c.id}</option>`).join('');
    return `
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:14px;color:var(--gold);">Tu oficio</div>
        <div style="${css.hint}">Define tus dados de golpe, competencias, recursos y arquetipo.</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 80px;gap:12px;margin-bottom:8px;">
        <div>
          <label style="${css.L}">Clase principal</label>
          <select id="wz_cls" style="${css.S}" onchange="_wizOnClsChange()">
            <option value="">— Elige clase —</option>${opts1}
          </select>
        </div>
        <div>
          <label style="${css.L}">Nivel</label>
          <input id="wz_lvl" type="number" min="1" max="20" value="${d.level}" style="${css.S}font-size:14px;text-align:center;" oninput="_wizCheckLevelSum(); _wizRefreshSubclass()">
        </div>
      </div>
      <div id="wz_cls_desc" style="${css.info}min-height:60px;margin-bottom:10px;"></div>
      <div id="wz_subclass_row" style="margin-bottom:14px;"></div>

      <div style="border-top:1px solid var(--border);padding-top:12px;margin-bottom:10px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;${css.L}margin-bottom:0;">
          <input type="checkbox" id="wz_multi" ${d.cls2?'checked':''} onchange="_wizToggleMulti()"
            style="accent-color:var(--gold);width:14px;height:14px;"> ¿Multiclase?
        </label>
        <div style="${css.hint}">Combinás dos clases. Requiere ciertos mínimos de atributo.</div>
      </div>

      <div id="wz_multi_row" style="display:${d.cls2?'block':'none'};">
        <div style="display:grid;grid-template-columns:1fr 80px;gap:12px;">
          <div>
            <label style="${css.L}">Segunda clase</label>
            <select id="wz_cls2" style="${css.S}" onchange="_wizOnCls2Change()">
              <option value="">— Elige —</option>${opts2}
            </select>
            <div id="wz_cls2_req" style="font-size:11px;color:var(--gold-dark);margin-top:5px;font-style:italic;"></div>
          </div>
          <div>
            <label style="${css.L}">Niveles</label>
            <input id="wz_lvl2" type="number" min="1" max="19" value="${d.level2||1}" style="${css.S}font-size:14px;text-align:center;" oninput="_wizCheckLevelSum()">
          </div>
        </div>
      </div>
      <div id="wz_level_warn" style="font-size:11px;color:var(--red,#c0392b);margin-top:6px;"></div>`;
  }

  window._wizOnClsChange = _onClsChange;
  function _onClsChange() {
    const cls = document.getElementById('wz_cls')?.value || '';
    const cd = (W.classes || []).find(c => c.id === cls);
    const el = document.getElementById('wz_cls_desc');
    if (el && cd) {
      const sv = (cd.savingThrows || []).map(a => ES[a] || a).join(', ');
      const skills = cd.skills?.options?.length ? `Elige ${cd.skills.choose} de: ${cd.skills.options.join(', ')}` : '—';
      const arm = (cd.armorProf || []).join(', ') || '—';
      const wpn = (cd.weaponProf || []).join(', ') || '—';
      const cast = cd.casterType ? `${cd.casterType === 'full' ? 'Lanzador completo' : cd.casterType === 'half' ? 'Medio lanzador' : cd.casterType === 'warlock' ? 'Pacto (Brujo)' : '—'} (${ES[cd.spellcastingAttr] || cd.spellcastingAttr})` : 'No lanzador';
      el.innerHTML = `
        <div style="font-family:Cinzel,serif;font-size:12px;color:var(--gold);margin-bottom:6px;letter-spacing:1px;">${esc(cd.id)} <span style="color:var(--text-muted);font-size:10px;">· Dados de Golpe: ${cd.hitDie}</span></div>
        <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Salvaciones competentes:</strong> ${sv}</div>
        <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Habilidades:</strong> ${esc(skills)}</div>
        <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Armaduras:</strong> ${esc(arm)} · <strong>Armas:</strong> ${esc(wpn)}</div>
        <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Conjuros:</strong> ${esc(cast)}</div>
        <div style="${css.hint}margin-top:6px;">${esc(cd.desc || '')}</div>`;
    } else if (el) el.innerHTML = '';
    _renderSubclassRow(cd);
    _checkLevelSum();
  }

  window._wizRefreshSubclass = function() {
    const cls = document.getElementById('wz_cls')?.value || '';
    const cd = (W.classes || []).find(c => c.id === cls);
    _renderSubclassRow(cd);
  };

  function _renderSubclassRow(cd) {
    const el = document.getElementById('wz_subclass_row');
    if (!el) return;
    if (!cd?.subclasses?.length) { el.innerHTML = ''; W.data.subclass = ''; return; }
    const minLvl = cd.subclasses[0]?.nivel ?? 3;
    const currentLvl = parseInt(document.getElementById('wz_lvl')?.value) || W.data.level || 1;
    if (currentLvl < minLvl) {
      el.innerHTML = `<div style="font-size:11px;color:var(--text-muted);font-family:'IM Fell English',serif;font-style:italic;padding:8px 10px;background:rgba(var(--panel-rgb),0.3);border:1px solid var(--border);border-radius:6px;">🔒 El arquetipo se elige a nivel ${minLvl} — sube el nivel para seleccionarlo.</div>`;
      W.data.subclass = '';
      return;
    }
    const opts = cd.subclasses.map(s =>
      `<option value="${s.id}" ${s.id === W.data.subclass ? 'selected' : ''}>${s.nombre}</option>`
    ).join('');
    el.innerHTML = `
      <label style="${css.L}">Arquetipo / Subclase <span style="text-transform:none;color:var(--text-muted);">(nivel ${minLvl}+)</span></label>
      <select id="wz_subclass" style="${css.S}" onchange="_wizOnSubclassChange()">
        <option value="">— Elige arquetipo (opcional) —</option>${opts}
      </select>
      <div id="wz_subclass_desc" style="font-size:11px;color:var(--text-secondary);font-family:'IM Fell English',serif;margin-top:6px;line-height:1.5;"></div>`;
    if (W.data.subclass) _onSubclassChange();
  }

  window._wizOnSubclassChange = _onSubclassChange;
  function _onSubclassChange() {
    const val = document.getElementById('wz_subclass')?.value || '';
    W.data.subclass = val;
    const cls = (W.classes || []).find(c => c.id === W.data.cls);
    const sub = cls?.subclasses?.find(s => s.id === val);
    const el = document.getElementById('wz_subclass_desc');
    if (el) el.textContent = sub?.desc || '';
  }

  window._wizToggleMulti = _toggleMulti;
  function _toggleMulti() {
    const cb = document.getElementById('wz_multi');
    const row = document.getElementById('wz_multi_row');
    if (row) row.style.display = cb?.checked ? 'block' : 'none';
  }

  window._wizOnCls2Change = _onCls2Change;
  function _onCls2Change() {
    const cd = (W.classes || []).find(c => c.id === document.getElementById('wz_cls2')?.value);
    const el = document.getElementById('wz_cls2_req');
    if (el) el.textContent = cd?.multiclassReqs?.display ? `Requisito: ${cd.multiclassReqs.display}` : '';
  }

  window._wizCheckLevelSum = _checkLevelSum;
  function _checkLevelSum() {
    const l1 = parseInt(document.getElementById('wz_lvl')?.value) || 0;
    const isM = document.getElementById('wz_multi')?.checked;
    const l2 = isM ? (parseInt(document.getElementById('wz_lvl2')?.value) || 0) : 0;
    const el = document.getElementById('wz_level_warn');
    if (el) el.textContent = (l1 + l2 > 20) ? `⚠ Nivel total (${l1 + l2}) supera el máximo de 20` : '';
  }

  // ═══════════════════════════════════════════════
  //  STEP 4 — Trasfondo
  // ═══════════════════════════════════════════════
  function _step4() {
    const d = W.data;
    const opts = (W.backgrounds || []).map(b =>
      `<option value="${b.id}" ${b.id===d.backgroundId?'selected':''}>${b.nombre}</option>`
    ).join('');
    return `
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:14px;color:var(--gold);">Tu pasado</div>
        <div style="${css.hint}">El trasfondo te da 2 competencias de habilidad, herramientas o idiomas, y un rasgo único.</div>
      </div>

      <div style="margin-bottom:14px;">
        <label style="${css.L}">Trasfondo</label>
        <select id="wz_bg" style="${css.S}" onchange="_wizOnBgChange()">
          <option value="">— Elige trasfondo —</option>${opts}
        </select>
      </div>

      <div id="wz_bg_langs_row" style="margin-bottom:14px;"></div>
      <div id="wz_bg_info" style="${css.info}min-height:90px;"></div>`;
  }

  window._wizOnBgChange = _onBgChange;
  function _onBgChange() {
    const bg = (W.backgrounds || []).find(b => b.id === document.getElementById('wz_bg')?.value);
    const el = document.getElementById('wz_bg_info');
    const langRow = document.getElementById('wz_bg_langs_row');
    if (!bg) {
      if (el) el.innerHTML = '';
      if (langRow) langRow.innerHTML = '';
      return;
    }
    const tools = bg.toolProf?.length ? bg.toolProf.join(', ') : '—';
    el.innerHTML = `
      <div style="font-family:Cinzel,serif;font-size:12px;color:var(--gold);margin-bottom:6px;letter-spacing:1px;">${esc(bg.nombre)}</div>
      <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Habilidades:</strong> ${esc(bg.skills.join(', '))}</div>
      <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Herramientas:</strong> ${esc(tools)}</div>
      <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Rasgo:</strong> <em>${esc(bg.feature)}</em> — ${esc(bg.featureDesc)}</div>
      <div style="margin-bottom:4px;"><strong style="color:var(--text-primary);">Equipo inicial:</strong> ${esc(bg.equipment)}</div>
      <div style="${css.hint}margin-top:6px;">${esc(bg.desc)}</div>`;

    // Selección de idiomas extra del trasfondo
    if (langRow) {
      if (bg.languages > 0) {
        const opts = LANGUAGES_POOL.map(l => `<option>${l}</option>`).join('');
        const selectors = [];
        for (let i = 0; i < bg.languages; i++) {
          const val = W.data.bgLanguages[i] || '';
          selectors.push(`<select class="wz_bg_lang" style="${css.S}"><option value="">— Idioma ${i+1} —</option>${opts.replace(`<option>${val}</option>`, `<option selected>${val}</option>`)}</select>`);
        }
        langRow.innerHTML = `<label style="${css.L}">${bg.languages} idioma(s) a elección</label>
          <div style="display:grid;grid-template-columns:repeat(${bg.languages},1fr);gap:8px;">${selectors.join('')}</div>`;
      } else {
        langRow.innerHTML = '';
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  STEP 5 — Atributos (4 métodos)
  // ═══════════════════════════════════════════════
  function _step5() {
    const d = W.data;
    const methods = [
      { id: 'pointbuy', label: 'Compra de Puntos', hint: '27 pts, valores 8–15. Estándar competitivo.' },
      { id: 'array',    label: 'Array Estándar',    hint: 'Asigna [15, 14, 13, 12, 10, 8] como prefieras.' },
      { id: 'roll',     label: 'Tirar 4d6',         hint: '6 tiradas (4d6, descartar el menor). Aleatorio.' },
      { id: 'manual',   label: 'Manual',            hint: 'Ingresa los valores que quieras (3–20).' },
    ];
    const tabs = methods.map(m =>
      `<button onclick="_wizSetAttrMethod('${m.id}')" style="${css.btn}${d.attrMethod===m.id?css.btnActive:''}">${m.label}</button>`
    ).join('');
    const activeHint = methods.find(m => m.id === d.attrMethod)?.hint || '';

    return `
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:14px;color:var(--gold);">Tus puntuaciones</div>
        <div style="${css.hint}">Elige el método. Los bonos de especie se aplican automáticamente.</div>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:8px;">${tabs}</div>
      <div style="${css.hint}text-align:center;margin-bottom:14px;">${activeHint}</div>

      <div id="wz_attr_panel">${_attrPanel()}</div>

      <div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--border);">
        <div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Resumen final (con bonos raciales)</div>
        <div id="wz_attr_final" style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;">${_attrFinalRow()}</div>
      </div>`;
  }

  window._wizSetAttrMethod = function (m) {
    W.data.attrMethod = m;
    document.getElementById('wizBody').innerHTML = _step5();
  };

  function _attrPanel() {
    const m = W.data.attrMethod;
    if (m === 'pointbuy') return _pbPanel();
    if (m === 'array')    return _arrayPanel();
    if (m === 'roll')     return _rollPanel();
    if (m === 'manual')   return _manualPanel();
    return '';
  }

  // ── Point Buy
  function _pbSpent() { return ATTRS.reduce((s,a) => s + (PB_COST[W.data.pb[a]] ?? 0), 0); }

  function _pbPanel() {
    const spent = _pbSpent();
    const left = PB_POOL - spent;
    const final = _finalScores();
    const cd1 = W.data.cls ? (W.classes||[]).find(c => c.id === W.data.cls) : null;
    const cd2 = W.data.cls2 ? (W.classes||[]).find(c => c.id === W.data.cls2) : null;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--text-muted);">PHB · valores 8–15 · ${PB_POOL} puntos</div>
        <div style="font-family:'Cinzel Decorative',serif;font-size:16px;color:${left<0?'var(--red,#e74c3c)':'var(--gold)'};">${left} pts</div>
      </div>
      ${_multireqBanner(cd1, cd2)}
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${ATTRS.map(attr => {
          const base = W.data.pb[attr] ?? 8;
          const cost = PB_COST[base] ?? 0;
          const fin = final[attr];
          const bon = _racialBonus()[attr] || 0;
          const canDec = base > 8;
          const canInc = base < 15 && (_pbSpent() - cost + (PB_COST[base+1] ?? 99)) <= PB_POOL;
          const incCost = (PB_COST[base+1] ?? 0) - cost;
          return `<div style="display:grid;grid-template-columns:60px 28px 36px 36px 36px 38px;align-items:center;gap:8px;">
            <div style="font-family:Cinzel,serif;font-size:11px;color:var(--text-primary);">${ES_LONG[attr].substring(0,8)}</div>
            <button onclick="_wizPbAdj('${attr}',-1)" ${canDec?'':'disabled'} style="${_bnBtn()}">−</button>
            <div style="font-family:Cinzel,serif;font-size:16px;color:var(--text-primary);text-align:center;">${base}</div>
            <button onclick="_wizPbAdj('${attr}',1)" ${canInc?'':'disabled'} style="${_bnBtn()}${incCost===2?'border-color:var(--gold-dark);color:var(--gold-dark);font-size:11px;':''}">${incCost===2?'+2':'+'}</button>
            <div style="font-size:11px;color:var(--gold-dark);text-align:center;">${bon>0?'+'+bon:bon<0?bon:''}</div>
            <div style="font-family:'Cinzel Decorative',serif;font-size:15px;color:var(--gold);text-align:center;">${fin}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid var(--border);">
        <div style="font-size:9px;color:var(--text-muted);">attr · − · base · + · racial · total</div>
        <div style="font-size:9px;color:var(--text-muted);font-style:italic;">⚠ 14 y 15 cuestan 2 pts c/u</div>
        <button onclick="_wizPbReset()" style="font-family:Cinzel,serif;font-size:9px;color:var(--text-muted);background:none;border:none;cursor:pointer;text-decoration:underline;letter-spacing:1px;">Reiniciar</button>
      </div>`;
  }

  function _bnBtn() {
    return 'width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:var(--bg-deep);color:var(--text-primary);cursor:pointer;font-size:14px;line-height:1;';
  }

  window._wizPbAdj = function (attr, delta) {
    const cur = W.data.pb[attr] ?? 8;
    const next = cur + delta;
    if (next < 8 || next > 15) return;
    const newSpent = _pbSpent() - (PB_COST[cur] ?? 0) + (PB_COST[next] ?? 0);
    if (newSpent > PB_POOL) { showToast('⚠ Sin puntos disponibles'); return; }
    W.data.pb[attr] = next;
    document.getElementById('wz_attr_panel').innerHTML = _pbPanel();
    _updateAttrFinal();
  };

  window._wizPbReset = function () {
    ATTRS.forEach(a => W.data.pb[a] = 8);
    document.getElementById('wz_attr_panel').innerHTML = _pbPanel();
    _updateAttrFinal();
  };

  // ── Standard Array
  function _arrayPanel() {
    const used = new Set(ATTRS.map(a => W.data.array[a]).filter(v => v != null));
    return `
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;text-align:center;">
        Asigna cada valor del array a un atributo distinto.
      </div>
      <div style="${css.panel}">
        ${ATTRS.map(attr => {
          const cur = W.data.array[attr];
          const opts = STANDARD_ARRAY.map(v => {
            const isCurrent = v === cur;
            const taken = used.has(v) && !isCurrent;
            return `<option value="${v}" ${isCurrent?'selected':''} ${taken?'disabled':''}>${v}${taken?' (en uso)':''}</option>`;
          }).join('');
          return `<div style="display:grid;grid-template-columns:120px 1fr;align-items:center;gap:10px;margin-bottom:6px;">
            <label style="${css.L}margin-bottom:0;">${ES_LONG[attr]}</label>
            <select onchange="_wizArraySet('${attr}',this.value)" style="${css.S}">
              <option value="">— sin asignar —</option>${opts}
            </select>
          </div>`;
        }).join('')}
      </div>`;
  }

  window._wizArraySet = function (attr, val) {
    W.data.array[attr] = val === '' ? null : parseInt(val);
    document.getElementById('wz_attr_panel').innerHTML = _arrayPanel();
    _updateAttrFinal();
  };

  // ── 4d6 roll
  function _rollPanel() {
    const pool = W.data.rolledPool;
    const assigned = new Set(ATTRS.map(a => W.data.rolled[a]).filter(v => v != null).map(v => v.id));

    if (!pool.length) {
      return `<div style="${css.panel}text-align:center;">
        <div style="${css.hint}margin-bottom:10px;">Tira 6 conjuntos de <strong>4d6 quedándote con los 3 mejores</strong>. Después asigna cada tirada a un atributo.</div>
        <button onclick="_wizRollDice()" style="font-family:Cinzel,serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:10px 22px;background:linear-gradient(180deg,var(--gold),var(--gold-dark));color:var(--bg-deep);border:1px solid var(--gold-dark);border-radius:6px;cursor:pointer;box-shadow:0 0 16px -4px var(--gold-glow);">🎲 Tirar 4d6 × 6</button>
      </div>`;
    }

    const chips = pool.map(r => {
      const taken = assigned.has(r.id);
      return `<div style="${css.chip}${taken?'opacity:0.35;':''}padding:6px 12px;font-size:13px;font-family:'Cinzel Decorative',serif;" title="Tirada: ${r.rolls.join(', ')} → keep ${r.kept.join('+')}">${r.value}</div>`;
    }).join('');

    return `<div style="margin-bottom:12px;">
        <div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;">Tus tiradas (${pool.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;background:rgba(var(--panel-rgb),0.4);padding:10px;border-radius:8px;border:1px solid var(--border);">${chips}</div>
        <div style="text-align:right;margin-top:6px;"><button onclick="_wizRollDice()" style="font-family:Cinzel,serif;font-size:9px;color:var(--text-muted);background:none;border:none;cursor:pointer;text-decoration:underline;letter-spacing:1px;">🎲 Volver a tirar</button></div>
      </div>
      <div style="${css.panel}">
        ${ATTRS.map(attr => {
          const cur = W.data.rolled[attr];
          const opts = pool.map(r => {
            const taken = assigned.has(r.id) && r.id !== cur?.id;
            return `<option value="${r.id}" ${cur?.id===r.id?'selected':''} ${taken?'disabled':''}>${r.value}${taken?' (en uso)':''}</option>`;
          }).join('');
          return `<div style="display:grid;grid-template-columns:120px 1fr;align-items:center;gap:10px;margin-bottom:6px;">
            <label style="${css.L}margin-bottom:0;">${ES_LONG[attr]}</label>
            <select onchange="_wizRolledSet('${attr}',this.value)" style="${css.S}">
              <option value="">— sin asignar —</option>${opts}
            </select>
          </div>`;
        }).join('')}
      </div>`;
  }

  window._wizRollDice = function () {
    const pool = [];
    for (let i = 0; i < 6; i++) {
      const rolls = [1,2,3,4].map(() => 1 + Math.floor(Math.random()*6));
      const kept = [...rolls].sort((a,b)=>b-a).slice(0,3);
      pool.push({ id: 'r'+i, rolls, kept, value: kept.reduce((a,b)=>a+b,0) });
    }
    W.data.rolledPool = pool;
    ATTRS.forEach(a => W.data.rolled[a] = null);
    document.getElementById('wz_attr_panel').innerHTML = _rollPanel();
    _updateAttrFinal();
  };

  window._wizRolledSet = function (attr, id) {
    if (!id) { W.data.rolled[attr] = null; }
    else {
      const r = W.data.rolledPool.find(x => x.id === id);
      W.data.rolled[attr] = r ? { id: r.id, value: r.value } : null;
    }
    document.getElementById('wz_attr_panel').innerHTML = _rollPanel();
    _updateAttrFinal();
  };

  // ── Manual
  function _manualPanel() {
    return `<div style="${css.panel}">
      <div style="${css.hint}text-align:center;margin-bottom:10px;">Ingresá valores entre 3 y 20. Sin validación de PB.</div>
      ${ATTRS.map(attr => {
        const cur = W.data.manual[attr] ?? 10;
        return `<div style="display:grid;grid-template-columns:120px 80px 1fr;align-items:center;gap:10px;margin-bottom:6px;">
          <label style="${css.L}margin-bottom:0;">${ES_LONG[attr]}</label>
          <input type="number" min="3" max="20" value="${cur}" oninput="_wizManualSet('${attr}',this.value)" style="${css.S}text-align:center;font-family:'Cinzel Decorative',serif;font-size:14px;">
          <span style="font-size:10px;color:var(--text-muted);font-family:Cinzel,serif;letter-spacing:1px;">mod ${_mod(_finalScores()[attr])}</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  window._wizManualSet = function (attr, val) {
    W.data.manual[attr] = Math.max(3, Math.min(20, parseInt(val) || 10));
    _updateAttrFinal();
  };

  // ── Final scores helpers
  function _baseFromMethod(attr) {
    const d = W.data;
    if (d.attrMethod === 'pointbuy') return d.pb[attr] ?? 8;
    if (d.attrMethod === 'array')    return d.array[attr] ?? 10;
    if (d.attrMethod === 'roll')     return d.rolled[attr]?.value ?? 10;
    if (d.attrMethod === 'manual')   return d.manual[attr] ?? 10;
    return 10;
  }

  function _racialBonus() {
    const r = Object.fromEntries(ATTRS.map(a => [a, 0]));
    const race = (W.species || []).find(x => x.id === W.data.raceId);
    const sub  = race?.subraces?.find(s => s.id === W.data.subraceId);
    [race?.abilityBonus, sub?.abilityBonus].forEach(b => {
      if (!b) return;
      for (const [k, v] of Object.entries(b)) {
        if (ATTRS.includes(k)) r[k] += v;
        else if (k === '_choose2') (W.data.racialChoices || []).forEach(a => {
          if (ATTRS.includes(a)) r[a] += v;
        });
      }
    });
    return r;
  }

  function _finalScores() {
    const bon = _racialBonus(), final = {};
    ATTRS.forEach(a => final[a] = Math.min(30, _baseFromMethod(a) + (bon[a] || 0)));
    return final;
  }

  function _mod(score) {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? '+'+m : String(m);
  }

  function _attrFinalRow() {
    const f = _finalScores();
    return ATTRS.map(a => {
      const v = f[a], mod = _mod(v);
      return `<div style="text-align:center;background:rgba(var(--panel-rgb),0.5);border:1px solid var(--border);padding:6px;border-radius:4px;">
        <div style="font-family:Cinzel,serif;font-size:8px;color:var(--text-muted);letter-spacing:1px;">${ES[a]}</div>
        <div style="font-family:'Cinzel Decorative',serif;font-size:18px;color:var(--gold);line-height:1;">${v}</div>
        <div style="font-size:10px;color:var(--text-muted);">${mod}</div>
      </div>`;
    }).join('');
  }

  function _updateAttrFinal() {
    const el = document.getElementById('wz_attr_final');
    if (el) el.innerHTML = _attrFinalRow();
  }

  function _multireqBanner(cd1, cd2) {
    if (!cd2) return '';
    const reqs = [cd1?.multiclassReqs?.display, cd2?.multiclassReqs?.display].filter(Boolean);
    if (!reqs.length) return '';
    return `<div style="background:rgba(201,168,76,0.08);border:1px solid var(--gold-dark);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--gold-dark);margin-bottom:10px;">
      ⚠ Multiclase requiere: ${reqs.join(' · ')}
    </div>`;
  }

  // ═══════════════════════════════════════════════
  //  STEP 6 — Habilidades
  // ═══════════════════════════════════════════════
  function _step6() {
    const d = W.data;
    const cls = (W.classes || []).find(c => c.id === d.cls);
    const cls2 = (W.classes || []).find(c => c.id === d.cls2);
    const bg  = (W.backgrounds || []).find(b => b.id === d.backgroundId);
    const bgSkills = new Set(bg?.skills || []);
    const clsOpts = cls?.skills?.options || [];
    const choose = cls?.skills?.choose || 0;

    const checks = clsOpts.map(sk => {
      const taken = bgSkills.has(sk);
      const checked = d.classSkills.includes(sk) && !taken;
      return `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(var(--panel-rgb),0.4);border:1px solid ${taken?'var(--gold-dark)':'var(--border)'};border-radius:4px;cursor:${taken?'not-allowed':'pointer'};${taken?'opacity:0.55;':''}">
        <input type="checkbox" class="wz_skill_pick" value="${sk}" ${checked?'checked':''} ${taken?'disabled':''} onchange="_wizSkillCount()" style="accent-color:var(--gold);">
        <span style="font-family:'IM Fell English',serif;font-size:13px;color:var(--text-primary);">${sk}</span>
        ${taken?'<span style="font-size:9px;color:var(--gold-dark);font-family:Cinzel,serif;letter-spacing:1px;margin-left:auto;">YA · BG</span>':''}
      </label>`;
    }).join('');

    return `
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:14px;color:var(--gold);">Competencias de habilidad</div>
        <div style="${css.hint}">El trasfondo aporta 2 automáticas. Elegí ${choose} más de tu clase.</div>
      </div>

      ${bgSkills.size ? `<div style="${css.panel}margin-bottom:14px;">
        <div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold-dark);margin-bottom:6px;">Del trasfondo (automáticas)</div>
        <div>${[...bgSkills].map(s => `<span style="${css.chip}">${esc(s)}</span>`).join('')}</div>
      </div>` : ''}

      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-family:Cinzel,serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);">${esc(d.cls)} — elige ${choose}</span>
          <span id="wz_skill_count" style="font-family:'Cinzel Decorative',serif;font-size:14px;color:var(--gold);">0 / ${choose}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${checks}</div>
      </div>

      ${cls2 ? `<div style="${css.hint}margin-top:12px;">📌 La segunda clase (${esc(d.cls2)}) no concede competencias de habilidad por multiclasear, solo de armas/armaduras.</div>` : ''}`;
  }

  window._wizSkillCount = function () {
    const cls = (W.classes || []).find(c => c.id === W.data.cls);
    const want = cls?.skills?.choose || 0;
    const got = document.querySelectorAll('.wz_skill_pick:checked').length;
    const el = document.getElementById('wz_skill_count');
    if (el) {
      el.textContent = `${got} / ${want}`;
      el.style.color = got === want ? 'var(--green-light, #4caf80)' : got > want ? 'var(--red, #e74c3c)' : 'var(--gold)';
    }
    // Hard cap
    if (got > want) {
      const all = [...document.querySelectorAll('.wz_skill_pick:checked')];
      all[all.length - 1].checked = false;
      _wizSkillCount();
    }
  };

  // ═══════════════════════════════════════════════
  //  STEP 7 — Resumen
  // ═══════════════════════════════════════════════
  // ═══════════════════════════════════════════════
  //  STEP 7 — Equipo inicial de clase
  // ═══════════════════════════════════════════════
  function parseEquipmentLine(line) {
    const options = (line || '').split(/\s+o\s+/).map(s => s.trim()).filter(Boolean);
    return { options, type: options.length > 1 ? 'radio' : 'check' };
  }

  function _step7() {
    const d = W.data;
    const cls1 = (W.classes||[]).find(c => c.id === d.cls);
    const cls2 = (W.classes||[]).find(c => c.id === d.cls2);

    // Build choices: preserve prior selections if class unchanged
    const old = d.equipmentChoices || [];
    const choices = [];
    function addLines(clsObj) {
      if (!clsObj?.equipment?.length) return;
      clsObj.equipment.forEach(line => {
        const { options: opts, type: lineType } = parseEquipmentLine(line);
        const prev = old.find(c => c.raw === line);
        choices.push({
          cls: clsObj.id,
          raw: line,
          options: opts,
          type: lineType,
          selected: prev ? (prev.selected ?? 0) : 0,
          checked:  prev ? (prev.checked !== false) : true,
        });
      });
    }
    addLines(cls1);
    if (cls2) addLines(cls2);
    d.equipmentChoices = choices;

    if (!choices.length) {
      return `<div style="text-align:center;padding:30px 0;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:14px;color:var(--gold);margin-bottom:10px;">⚔ Equipo inicial</div>
        <div style="color:var(--text-muted);font-size:12px;">No hay datos de equipo para esta clase.<br>Podés añadir ítems manualmente desde el inventario.</div>
      </div>`;
    }

    function renderChoices(clsId, label) {
      const clsChoices = choices.filter(c => c.cls === clsId);
      if (!clsChoices.length) return '';
      return `
        <div style="font-family:Cinzel,serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold-dark);margin:14px 0 8px;">${esc(label)}</div>
        ${clsChoices.map(choice => {
          const i = choices.indexOf(choice);
          if (choice.type === 'radio') {
            return `<div style="background:rgba(var(--panel-rgb),0.35);border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin-bottom:8px;">
              <div style="font-size:10px;color:var(--text-muted);font-family:Cinzel,serif;margin-bottom:7px;letter-spacing:.5px;">ELIGE UNA OPCIÓN:</div>
              ${choice.options.map((opt, j) => `
                <label style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;cursor:pointer;font-family:'IM Fell English',serif;font-size:13px;line-height:1.4;">
                  <input type="radio" name="wz_eq_${i}" value="${j}" ${choice.selected===j?'checked':''} style="margin-top:3px;accent-color:var(--gold);">
                  <span>${esc(opt)}</span>
                </label>`).join('')}
            </div>`;
          } else {
            return `<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:rgba(var(--panel-rgb),0.25);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;cursor:pointer;font-family:'IM Fell English',serif;font-size:13px;line-height:1.4;">
              <input type="checkbox" id="wz_eq_${i}" ${choice.checked?'checked':''} style="margin-top:3px;accent-color:var(--gold);">
              <span>${esc(choice.options[0])}</span>
            </label>`;
          }
        }).join('')}`;
    }

    return `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:14px;color:var(--gold);">⚔ Equipo inicial</div>
        <div style="font-size:11px;color:var(--text-muted);font-family:'IM Fell English',serif;margin-top:4px;">
          Seleccioná el equipo de inicio de tu clase. Podés ajustarlo luego desde el inventario.
        </div>
      </div>
      ${renderChoices(d.cls, d.cls)}
      ${d.cls2 ? renderChoices(d.cls2, d.cls2) : ''}`;
  }

  // ═══════════════════════════════════════════════
  //  STEP 8 — Historia, Apariencia y Personalidad
  // ═══════════════════════════════════════════════
  function _step8() {
    const d = W.data;
    const bg = (W.backgrounds||[]).find(b => b.id === d.backgroundId);

    const inp = (id, label, val, placeholder) =>
      `<div><label style="${css.L}">${label}</label>
        <input id="${id}" value="${esc(val)}" placeholder="${esc(placeholder)}"
          style="${css.S}font-family:'IM Fell English',serif;font-size:13px;"></div>`;

    const ta = (id, label, val, placeholder, rows) =>
      `<div><label style="${css.L}">${label}</label>
        <textarea id="${id}" placeholder="${esc(placeholder)}"
          style="${css.S}resize:vertical;min-height:${rows*22}px;font-family:'IM Fell English',serif;font-size:13px;line-height:1.55;">${esc(val)}</textarea></div>`;

    return `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-family:'Cinzel Decorative',serif;font-size:14px;color:var(--gold);">📜 Historia y Apariencia</div>
        <div style="${css.hint}margin-top:2px;">Todos los campos son opcionales — podés completarlos o editarlos en la ficha en cualquier momento.</div>
      </div>

      <div style="${css.panel}margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-family:Cinzel,serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold-dark);">🌀 Personalidad</div>
          ${bg ? `<button onclick="_wizSuggestPersonality()" style="${css.btn}font-size:9px;padding:4px 10px;">🎲 Sugerir del trasfondo</button>` : `<span style="font-size:10px;color:var(--text-muted);font-style:italic;">Elegí un trasfondo para sugerencias</span>`}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${ta('wz_pTraits','⚡ Rasgos',d.pTraits,'Dos rasgos de personalidad...',4)}
          ${ta('wz_pIdeals','⚖ Ideales',d.pIdeals,'Un principio o creencia...',4)}
          ${ta('wz_pBonds', '❤ Vínculos',d.pBonds,'Personas o lugares importantes...',4)}
          ${ta('wz_pFlaws', '⚠ Defectos',d.pFlaws,'Debilidades o vicios...',4)}
        </div>
      </div>

      <div style="${css.panel}margin-bottom:12px;">
        <div style="font-family:Cinzel,serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold-dark);margin-bottom:10px;">🪞 Apariencia Física</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${inp('wz_appGender','Género',      d.appGender,'Ej. Masculino, femenino…')}
          ${inp('wz_appAge',   'Edad',        d.appAge,   'Ej. 28 años')}
          ${inp('wz_appHeight','Altura',      d.appHeight,'Ej. 1,80 m')}
          ${inp('wz_appWeight','Peso',        d.appWeight,'Ej. 80 kg')}
          ${inp('wz_appSkin',  'Piel',        d.appSkin,  'Ej. Bronceada, pálida…')}
          ${inp('wz_appEyes',  'Ojos',        d.appEyes,  'Ej. Azules, verdes…')}
          ${inp('wz_appHair',  'Cabello',     d.appHair,  'Ej. Negro largo, rizado…')}
        </div>
      </div>

      <div style="${css.panel}">
        <div style="font-family:Cinzel,serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold-dark);margin-bottom:8px;">📜 Historia del Personaje</div>
        ${ta('wz_historia','',d.historia,'Narra el trasfondo de tu personaje: de dónde viene, qué lo motiva, qué eventos marcaron su vida…',7)}
      </div>`;
  }

  window._wizSuggestPersonality = function() {
    const bg = (W.backgrounds||[]).find(b => b.id === W.data.backgroundId);
    if (!bg) { showToast('⚠ Elegí un trasfondo primero'); return; }
    const pick = (arr) => arr?.length ? arr[Math.floor(Math.random() * arr.length)] : '';
    const set  = (id, val) => { if (val) { const el = document.getElementById(id); if (el) el.value = val; } };
    set('wz_pTraits', pick(bg.personalityTraits));
    set('wz_pIdeals', pick(bg.ideals));
    set('wz_pBonds',  pick(bg.bonds));
    set('wz_pFlaws',  pick(bg.flaws));
  };

  // ═══════════════════════════════════════════════
  //  STEP 9 — Resumen
  // ═══════════════════════════════════════════════
  function _step9() {
    const d = W.data;
    const cls  = (W.classes||[]).find(c => c.id === d.cls);
    const cls2 = (W.classes||[]).find(c => c.id === d.cls2);
    const race = (W.species||[]).find(r => r.id === d.raceId);
    const sub  = race?.subraces?.find(s => s.id === d.subraceId);
    const bg   = (W.backgrounds||[]).find(b => b.id === d.backgroundId);
    const final = _finalScores();
    const conMod = Math.floor((final.CON - 10) / 2);
    const totalLvl = d.level + (d.level2 || 0);
    const hp = _calcMaxHP(cls, cls2, d.level, d.level2, conMod);
    const ac = _calcAC(final, cls, cls2);
    const speed = sub?.speed ?? race?.speed ?? 9;
    const profBonus = [0,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6][totalLvl] || 2;
    const langs = _collectLanguages(race, sub, bg);
    const armorProfs = _collectArmorProf(cls, cls2);
    const weaponProfs = _collectWeaponProf(cls, cls2);
    const allSkills = [...new Set([...(bg?.skills || []), ...(d.classSkills || [])])];
    const initBonus = _mod(final.DEX);

    const scoreCell = (a) => {
      const v = final[a], mod = _mod(v);
      return `<div style="text-align:center;padding:6px 4px;background:rgba(var(--panel-rgb),0.5);border:1px solid var(--border);border-radius:4px;">
        <div style="font-family:Cinzel,serif;font-size:8px;color:var(--text-muted);letter-spacing:1px;">${ES[a]}</div>
        <div style="font-family:'Cinzel Decorative',serif;font-size:18px;color:var(--gold);line-height:1;">${v}</div>
        <div style="font-size:10px;color:var(--text-muted);">${mod}</div>
      </div>`;
    };

    const row = (lbl, val) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding:6px 0;font-size:12px;gap:10px;">
      <span style="color:var(--text-muted);font-family:Cinzel,serif;font-size:9px;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;">${lbl}</span>
      <span style="text-align:right;font-family:'IM Fell English',serif;">${val}</span></div>`;

    const stat = (lbl, val, color = 'var(--gold)') => `<div style="text-align:center;background:rgba(var(--panel-rgb),0.5);border:1px solid var(--border);padding:8px 4px;border-radius:6px;">
      <div style="font-family:'Cinzel Decorative',serif;font-size:18px;color:${color};line-height:1;">${val}</div>
      <div style="font-family:Cinzel,serif;font-size:8px;color:var(--text-muted);letter-spacing:1px;margin-top:3px;">${lbl}</div>
    </div>`;

    return `
      <div style="font-family:'Cinzel Decorative',serif;font-size:18px;color:var(--gold);text-align:center;margin-bottom:2px;">${esc(d.name)||'—'}</div>
      ${d.epithet ? `<div style="text-align:center;font-style:italic;color:var(--text-muted);font-size:12px;margin-bottom:14px;">${esc(d.epithet)}</div>` : '<div style="height:14px;"></div>'}

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;">
        ${stat('HP', hp, 'var(--green-light, #4caf80)')}
        ${stat('CA', ac, 'var(--blue-light, #4a9ede)')}
        ${stat('Inic', initBonus, 'var(--gold)')}
        ${stat('Vel', speed + ' ft', 'var(--text-primary)')}
      </div>

      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-bottom:12px;">${ATTRS.map(scoreCell).join('')}</div>

      ${row('Clase', cls2 ? `${d.cls} ${d.level} / ${d.cls2} ${d.level2}` : `${d.cls} ${d.level}${d.subclass ? ' · ' + d.subclass : ''}`)}
      ${row('Nivel total', `${totalLvl}  ·  Bonif. Comp. +${profBonus}`)}
      ${row('Especie', sub?.nombre || race?.nombre || '—')}
      ${row('Trasfondo', bg?.nombre || '—')}
      ${row('Alineamiento', esc(d.alignment))}
      ${d.deity ? row('Fe / Deidad', esc(d.deity)) : ''}
      ${row('Salvaciones competentes', ((cls?.savingThrows||[]).map(a=>ES[a]).join(', '))||'—')}
      ${row('Habilidades competentes', allSkills.join(', ') || '—')}
      ${row('Idiomas', langs.join(' · '))}
      ${row('Armaduras', armorProfs.join(', ') || '—')}
      ${row('Armas', weaponProfs.join(', ') || '—')}
      ${cls?.casterType ? row('Conjuros', `${cls.casterType === 'full' ? 'Lanzador completo' : cls.casterType === 'half' ? 'Medio lanzador' : 'Pacto'} (${ES[cls.spellcastingAttr]})`) : ''}

      <div style="margin-top:14px;padding:10px;background:rgba(var(--panel-rgb),0.4);border:1px dashed var(--gold-dark);border-radius:6px;font-size:11px;color:var(--text-muted);font-family:'IM Fell English',serif;line-height:1.6;">
        ✦ Al confirmar se aplica todo a la ficha, se aplica el tema visual de tu clase principal, se calculan HP/CA/slots y se descarga un respaldo JSON.
      </div>`;
  }

  // ═══════════════════════════════════════════════
  //  Cálculos de cierre
  // ═══════════════════════════════════════════════
  function _hitDieMax(d) { return parseInt((d || 'd8').replace('d','')) || 8; }
  function _hitDieAvg(d) { return Math.floor(_hitDieMax(d) / 2) + 1; }

  function _calcMaxHP(cls, cls2, l1, l2, conMod) {
    if (!cls) return 10;
    let hp = _hitDieMax(cls.hitDie) + conMod;          // primer nivel: máximo
    for (let i = 1; i < l1; i++) hp += _hitDieAvg(cls.hitDie) + conMod;
    if (cls2 && l2 > 0) {
      // Multiclase: nivel 1 de segunda clase usa promedio (no máximo)
      for (let i = 0; i < l2; i++) hp += _hitDieAvg(cls2.hitDie) + conMod;
    }
    return Math.max(1, hp);
  }

  function _calcAC(final, cls, cls2) {
    const dexMod = Math.floor((final.DEX - 10) / 2);
    const conMod = Math.floor((final.CON - 10) / 2);
    const wisMod = Math.floor((final.WIS - 10) / 2);
    // Detección: si Bárbaro está en la build → defensa sin armadura del bárbaro (10 + DES + CON)
    const isBarbarian = cls?.id === 'Bárbaro' || cls2?.id === 'Bárbaro';
    const isMonk = cls?.id === 'Monje' || cls2?.id === 'Monje';
    if (isBarbarian) return 10 + dexMod + conMod;
    if (isMonk)      return 10 + dexMod + wisMod;
    return 10 + dexMod; // sin armadura, fórmula estándar
  }

  function _collectLanguages(race, sub, bg) {
    const out = new Set();
    out.add('Común');
    (race?.languages || []).forEach(l => { if (!/elección|extra|adicional/i.test(l)) out.add(l); });
    if (W.data.extraLang) out.add(W.data.extraLang);
    (W.data.bgLanguages || []).forEach(l => l && out.add(l));
    return [...out];
  }

  function _collectArmorProf(cls, cls2) {
    const out = new Set();
    (cls?.armorProf || []).forEach(a => out.add(a));
    (cls2?.multiclassGains?.armorProf || []).forEach(a => out.add(a));
    return [...out];
  }

  function _collectWeaponProf(cls, cls2) {
    const out = new Set();
    (cls?.weaponProf || []).forEach(a => out.add(a));
    (cls2?.multiclassGains?.weaponProf || []).forEach(a => out.add(a));
    return [...out];
  }

  // ═══════════════════════════════════════════════
  //  Helpers de equipo (compartidos por bg y clase)
  // ═══════════════════════════════════════════════
  const EQUIP_ICONS = [
    [/po\b|piezas de oro|monedas/i,           '💰', 'treasure'],
    [/símbolo|sagrado|relicario|amuleto/i,    '✨', 'wondrous'],
    [/libro|pergamino|carta|mapa|anotac/i,    '📜', 'wondrous'],
    [/instrumento|laúd|flauta|arpa|tambor/i,  '🎵', 'wondrous'],
    [/armadura|cota|loriga|cuero tachon/i,    '🛡', 'armor'],
    [/escudo/i,                               '🛡', 'shield'],
    [/paquete de/i,                           '🎒', 'wondrous'],
    [/hacha(?! de mano)|hachas(?! de mano)/i, '⚔', 'weapon'],
    [/espada|daga|bastón|palanca|lanza|cuchillo|arco|ballesta|estoque|jabalina/i, '⚔', 'weapon'],
    [/kit|herramientas|herramienta|juego de/i,'🔧', 'wondrous'],
    [/ropa|vestidura|capa|disfraz|manto/i,    '👘', 'wondrous'],
    [/cuerda/i,                               '🪢', 'wondrous'],
    [/bolsa|saco|mochila/i,                   '👜', 'wondrous'],
    [/pala|olla|linterna/i,                   '🪣', 'wondrous'],
    [/trofeo|insignia|anillo|sello/i,         '💍', 'wondrous'],
  ];

  function _addEquipItem(text) {
    if (!text) return;
    const goldM = text.match(/^(\d+)\s*po\b/i);
    if (goldM) {
      state.inventory.push({ icon:'💰', name:`${goldM[1]} monedas de oro (po)`, qty:parseInt(goldM[1]), type:'treasure', equipped:false, acBonus:0, acBase:null });
      return;
    }
    const qtyM = text.match(/^(\d+)\s+(.+)/);
    const qty  = qtyM ? parseInt(qtyM[1]) : 1;
    const name = qtyM ? qtyM[2] : text;
    let icon = '📦', type = 'wondrous';
    for (const [re, ic, ty] of EQUIP_ICONS) {
      if (re.test(name)) { icon = ic; type = ty; break; }
    }
    state.inventory.push({ icon, name, qty, type, equipped:false, acBonus:0, acBase:null });
  }

  // ═══════════════════════════════════════════════
  //  Crear personaje — aplica a la ficha
  // ═══════════════════════════════════════════════
  function _complete() {
    const d = W.data;
    if (!d.name) { showToast('⚠ Sin nombre'); return; }
    if (!d.cls)  { showToast('⚠ Sin clase'); return; }
    const final = _finalScores();
    const race = (W.species||[]).find(r => r.id === d.raceId);
    const sub  = race?.subraces?.find(s => s.id === d.subraceId);
    const bg   = (W.backgrounds||[]).find(b => b.id === d.backgroundId);
    const cls  = (W.classes||[]).find(c => c.id === d.cls);
    const cls2 = (W.classes||[]).find(c => c.id === d.cls2);
    const totalLvl = d.level + (d.level2 || 0);
    const conMod = Math.floor((final.CON - 10) / 2);
    const speed = sub?.speed ?? race?.speed ?? 9;

    // ─── Identidad ──────────────────────
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('charName', d.name);
    if (d.epithet) { set('heroEpithet', d.epithet);                  state.CHARACTER_STATE.heroEpithet    = d.epithet; }
    if (d.deity)   { set('charDeity', 'Fe: ' + d.deity);             state.CHARACTER_STATE.charDeity      = 'Fe: ' + d.deity; }
    if (d.player)  { set('charPlayerName', 'Jugador: ' + d.player);  state.CHARACTER_STATE.charPlayerName = 'Jugador: ' + d.player; }

    // Alineamiento
    const alignSel = document.getElementById('alignSelect');
    if (alignSel) alignSel.value = d.alignment;
    const metas = document.querySelectorAll('.meta-value');
    if (metas[3]) metas[3].textContent = d.alignment;

    // ─── Atributos ───────────────────────
    ATTRS.forEach(attr => {
      const el = document.getElementById('score-' + attr);
      if (el) { el.value = final[attr]; window.calcMod?.(attr); }
    });

    // ─── Clase / nivel / recursos ─────────
    if (cls) {
      // Carga el recurso de clase de la PRIMERA clase con recurso real
      // (la principal puede no tener — ej. Explorador 1 / Bárbaro 1 → Furia del Bárbaro)
      {
        const CT = window.CLASS_TEMPLATES;
        if (CT) {
          const t1 = CT[d.cls];
          const t2 = d.cls2 ? CT[d.cls2] : null;
          const pick = (t1?.resource?.name ? { template: t1, className: d.cls,  level: d.level  }
                      : t2?.resource?.name ? { template: t2, className: d.cls2, level: d.level2 }
                      : null);
          if (pick) {
            state.CHARACTER_STATE.classResource = { ...pick.template.resource };
            const uses = window.calcResourceMaxUses?.(pick.className, pick.level);
            if (uses !== null) state.CHARACTER_STATE.classResource.maxUses = uses;
          }
          if (t1?.resource?.name && t2?.resource?.name) {
            const primaryLoaded = t1?.resource?.name && state.CHARACTER_STATE.classResource?.name === t1.resource.name;
            const extraToAdd = primaryLoaded ? t2.resource : t1.resource;
            if (extraToAdd.name !== state.CHARACTER_STATE.classResource?.name) {
              const extraClassName = primaryLoaded ? d.cls2 : d.cls;
              const extraClassLevel = primaryLoaded ? (d.level2 || 1) : d.level;
              const scaledExtra = { ...extraToAdd };
              const uses = window.calcResourceMaxUses?.(extraClassName, extraClassLevel);
              if (uses !== null) scaledExtra.maxUses = uses;
              window.addExtraResource?.({ ...scaledExtra, className: extraClassName });
            }
          }
        }
      }
      state.CHARACTER_STATE.rageUsesSpent = 0;
      state.rageActive = false;

      // Defensa sin armadura: detectar en TODA la build (principal + multi)
      let formula = 'standard';
      if (d.cls === 'Bárbaro' || d.cls2 === 'Bárbaro') formula = 'barbarian';
      else if (d.cls === 'Monje' || d.cls2 === 'Monje') formula = 'monk';
      state.CHARACTER_STATE.unarmedDefFormula = formula;
      const defSel = document.getElementById('unarmedDefSelect');
      if (defSel) defSel.value = formula;

      // Salvaciones competentes
      const saveAttrs = new Set(cls.savingThrows || []);
      // Solo clase principal aporta salvaciones (regla de multiclase 5e)
      const saveIdxMap = { STR:0, DEX:1, CON:2, INT:3, WIS:4, CHA:5 };
      document.querySelectorAll('.save-row').forEach((row, i) => {
        const attr = Object.keys(saveIdxMap).find(k => saveIdxMap[k] === i);
        row.querySelector('.save-prof')?.classList.toggle('active', saveAttrs.has(attr));
      });
      window.renderSaves?.();

      state.CHARACTER_STATE.initBonus = 0;

      // Tema de clase
      const themeIdx = window.CLASS_THEMES ? window.CLASS_THEMES.findIndex(th => th.name === d.cls) : -1;
      if (themeIdx >= 0) window.applyClassTheme?.(themeIdx);

      // Slots de conjuro (si lanza)
      window.loadSpellPreset?.(d.cls);
    }

    // ─── Dados de Golpe (correcto para multiclase) ────
    {
      const hd = [];
      const add = (die, count) => {
        const ex = hd.find(h => h.die === die);
        if (ex) ex.count += count; else hd.push({ die, count, spent: 0 });
      };
      if (cls)  add(cls.hitDie, d.level);
      if (cls2 && d.level2 > 0) add(cls2.hitDie, d.level2);
      state.CHARACTER_STATE.hitDice = hd;
      state.CHARACTER_STATE.hitDiceSpent = 0;
    }

    // ─── Nivel total + bonif. comp. ─────────────
    window.setLevelDirect?.(totalLvl);

    // ─── Velocidad ───────────────────────────
    set('statSpeed', speed + ' ft');

    // ─── Hero pills: clase, trasfondo, especie ───
    const raceLabel = sub ? sub.nombre : (race?.nombre || d.raceId);
    state.CHARACTER_STATE.subclass = d.subclass || '';
    const clsLabel = cls2 ? `${d.cls} ${d.level} / ${d.cls2} ${d.level2}` : `${d.cls} ${d.level}`;
    if (metas[0]) metas[0].textContent = clsLabel;
    // Corregir ranuras de conjuro al nivel inicial (loadSpellPreset usa slots fijos de nv1)
    const initSlots = window.computeSpellSlots?.(clsLabel);
    if (initSlots) {
      [1,2,3,4,5,6,7,8,9].forEach(i => {
        state.spellSlotsState[i] = { max: initSlots[i]?.max || 0, used: 0 };
      });
      window.renderSpellSlots?.();
    }
    // CODEX-01: Brujo — inicializar pact slots separados del pool regular (PHB 5e)
    window._syncPactSlots?.(clsLabel);
    // Pill de arquetipo — mostrar solo si hay subclase
    const subPill  = document.getElementById('subclassPill');
    const subLabel = document.getElementById('charSubclass');
    if (d.subclass) {
      if (subLabel) subLabel.textContent = d.subclass;
      if (subPill)  subPill.style.display = '';
    } else {
      if (subPill) subPill.style.display = 'none';
    }
    if (metas[1] && bg) metas[1].textContent = bg.nombre;
    if (metas[2]) metas[2].textContent = raceLabel;

    const clsSel = document.getElementById('classSelect1');
    if (clsSel && d.cls) clsSel.value = d.cls;
    const clsLvl = document.getElementById('classLevel1');
    if (clsLvl) clsLvl.value = d.level;
    if (cls2) {
      const clsSel2 = document.getElementById('classSelect2');
      if (clsSel2) clsSel2.value = d.cls2;
      const clsLvl2 = document.getElementById('classLevel2');
      if (clsLvl2) clsLvl2.value = d.level2;
    }

    // ─── HP ─────────────────────────────────
    const hp = _calcMaxHP(cls, cls2, d.level, d.level2 || 0, conMod);
    const hpMax = document.getElementById('hpMax');
    const hpCur = document.getElementById('hpCurrent');
    if (hpMax) hpMax.textContent = hp;
    if (hpCur) hpCur.textContent = hp;
    window.updateHP?.();

    // ─── Habilidades competentes ─────────────
    state.skillsState.forEach(s => { s.prof = false; s.expert = false; });
    const profSet = new Set([...(bg?.skills || []), ...(d.classSkills || [])]);
    // Semi-Orco: Intimidar gratis
    if (race?.id === 'Semi-Orco') profSet.add('Intimidar');
    profSet.forEach(name => {
      const s = state.skillsState.find(x => x.name === name);
      if (s) s.prof = true;
    });
    window.renderSkills?.();

    // ─── Idiomas + visión + competencias en el panel ──
    const langs = _collectLanguages(race, sub, bg);
    const armorProfs = _collectArmorProf(cls, cls2);
    const weaponProfs = _collectWeaponProf(cls, cls2);
    const toolProfs = [...new Set([...(cls?.toolProf || []), ...(bg?.toolProf || [])])];
    const vision = sub?.vision ?? race?.vision ?? 'Normal';
    const langPanel = document.getElementById('langComp');
    if (langPanel) {
      langPanel.innerHTML = `
        <strong style="color:var(--gold-dark);font-family:Cinzel,serif;font-size:10px;letter-spacing:1px;">VISIÓN:</strong><br>
        ${esc(vision)}<br><br>
        <strong style="color:var(--gold-dark);font-family:Cinzel,serif;font-size:10px;letter-spacing:1px;">IDIOMAS:</strong><br>
        ${langs.join(' · ')}<br><br>
        <strong style="color:var(--gold-dark);font-family:Cinzel,serif;font-size:10px;letter-spacing:1px;">ARMADURAS:</strong><br>
        ${armorProfs.join(' · ') || '—'}<br><br>
        <strong style="color:var(--gold-dark);font-family:Cinzel,serif;font-size:10px;letter-spacing:1px;">ARMAS:</strong><br>
        ${weaponProfs.join(' · ') || '—'}<br><br>
        <strong style="color:var(--gold-dark);font-family:Cinzel,serif;font-size:10px;letter-spacing:1px;">HERRAMIENTAS:</strong><br>
        ${toolProfs.join(' · ') || '—'}`;
    }

    // ─── Rasgos raciales → traits[] persistente ──────────────────
    // Empuja directamente al array global (declarado en app.js)
    // para que renderTraits() los muestre y saveState() los persista.
    state.concentrationSpell = null;
    window.renderConcentration?.();
    state.traits.length = 0;

    const raceTraitList = [
      ...(race?.traits || []),
      ...(sub?.traits  || []),
    ];
    raceTraitList.forEach(t => {
      const parenIdx = t.indexOf('(');
      const name = parenIdx > 0 ? t.slice(0, parenIdx).trim() : t;
      let maxUses = 0, restType = 'none';
      if (/implacable|1 vez por descanso largo/i.test(t)) { maxUses = 1; restType = 'long'; }
      state.traits.push({ name, desc: t, maxUses, usesLeft: maxUses, restType });
    });

    if (bg?.feature) {
      state.traits.push({ name: bg.feature, desc: bg.featureDesc || '', maxUses: 0, usesLeft: 0, restType: 'none' });
    }

    window.renderTraits?.();

    // ─── Personalidad (sugerencias del trasfondo) ─────────────────
    if (bg) {
      state.CHARACTER_STATE.bgPersonality = {
        personalityTraits: bg.personalityTraits || [],
        ideals:            bg.ideals            || [],
        bonds:             bg.bonds             || [],
        flaws:             bg.flaws             || [],
      };
      const _setIfEmpty = (id, text) => {
        const el = document.getElementById(id);
        if (el && !el.textContent.trim()) el.textContent = text;
      };
      const pick = (arr) => arr?.length ? arr[Math.floor(Math.random() * arr.length)] : '';
      _setIfEmpty('personalityTraits', pick(bg.personalityTraits));
      _setIfEmpty('personalityIdeals', pick(bg.ideals));
      _setIfEmpty('personalityBonds',  pick(bg.bonds));
      _setIfEmpty('personalityFlaws',  pick(bg.flaws));
    }

    // ─── Historia y apariencia del paso 8 (prioridad sobre sugerencias) ──
    const _setField = (id, val) => {
      if (!val) return;
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    _setField('personalityTraits', d.pTraits);
    _setField('personalityIdeals', d.pIdeals);
    _setField('personalityBonds',  d.pBonds);
    _setField('personalityFlaws',  d.pFlaws);
    _setField('charHistoryCE',     d.historia);
    _setField('appearGender',      d.appGender);
    _setField('appearAge',         d.appAge);
    _setField('appearHeight',      d.appHeight);
    _setField('appearWeight',      d.appWeight);
    _setField('appearSkin',        d.appSkin);
    _setField('appearEyes',        d.appEyes);
    _setField('appearHair',        d.appHair);

    // ─── Equipo inicial del trasfondo → inventario ──────────────
    if (bg?.equipment) {
      const raw = bg.equipment
        .replace(/,\s*y\s+/g, ', ')
        .replace(/ y ([^,]+)$/, ', $1');
      raw.split(/,\s+/).map(s => s.trim()).filter(Boolean).forEach(_addEquipItem);
    }

    // ─── Equipo inicial de clase → inventario ───────────────────
    if (d.equipmentChoices?.length) {
      d.equipmentChoices.forEach(choice => {
        if (choice.type === 'check' && !choice.checked) return;
        const idx = choice.type === 'radio' ? (choice.selected ?? 0) : 0;
        const text = (choice.options[idx] || '').trim();
        if (text) _addEquipItem(text);
      });
    }

    window.renderInventory?.();

    // ─── Re-render + cierre ─────────────────
    window.renderRage?.();
    window.renderHitDice?.();
    window.updateArmorClass?.();
    closeCreationWizard();
    window.saveState?.();

    _downloadJSON(d.name);
    showToast(`✦ ¡${d.name} está listo para la aventura!`);
  }

  window.parseEquipmentLine = parseEquipmentLine;

  function _downloadJSON(name) {
    try {
      const blob = new Blob([JSON.stringify({ ...state.CHARACTER_STATE }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(name || 'personaje').replace(/[^a-zA-Z0-9_\-áéíóúüñÁÉÍÓÚÜÑ]/g, '_')}_v1.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.warn('[wizard] descarga JSON falló:', e); }
  }

