import { state } from '../state.js';
import { getMod, getProfBonus } from './attributes.js';

export function renderSkills() {
  const list = document.getElementById('skillsList');
  if (!list) return;
  list.innerHTML = '';
  state.skillsState.forEach((skill, i) => {
    const mod = getMod(skill.attr);
    const pb = getProfBonus();
    const bonus = mod + (skill.prof ? pb : 0) + (skill.expert ? pb : 0);
    const bonusStr = bonus >= 0 ? '+' + bonus : '' + bonus;
    const row = document.createElement('div');
    row.className = 'skill-row';
    row.innerHTML = `
      <div class="skill-prof ${skill.prof ? 'active' : ''} ${skill.expert ? 'expert' : ''}" onclick="cycleSkillProf(${i})" title="${skill.expert?'Experto':skill.prof?'Competente':'No competente'}"></div>
      <span class="skill-name">${skill.name}</span>
      <span class="skill-attr">${skill.attr}</span>
      <span class="skill-bonus">${bonusStr}</span>
    `;
    list.appendChild(row);
  });
}

export function cycleSkillProf(i) {
  const s = state.skillsState[i];
  if (!s.prof && !s.expert) { s.prof = true; }
  else if (s.prof && !s.expert) { s.expert = true; }
  else { s.prof = false; s.expert = false; }
  renderSkills();
  updatePassivePerception();
  window.saveToLocal?.();
}

export function updatePassivePerception() {
  const wisMod = getMod('WIS');
  const intMod = getMod('INT');
  const pb = getProfBonus();

  function passiveVal(skillName, attrMod) {
    const sk = state.skillsState.find(s => s.name === skillName);
    const bonus = sk ? (sk.expert ? pb * 2 : sk.prof ? pb : 0) : 0;
    return 10 + attrMod + bonus;
  }

  const ppEl  = document.getElementById('passivePerception');
  const piEl  = document.getElementById('passiveInvestigation');
  const insEl = document.getElementById('passiveInsight');
  if (ppEl)  ppEl.textContent  = passiveVal('Percepción',    wisMod);
  if (piEl)  piEl.textContent  = passiveVal('Investigación', intMod);
  if (insEl) insEl.textContent = passiveVal('Perspicacia',   wisMod);
}

// ── Window bridge ──────────────────────────────────────────────────────────
window.renderSkills          = renderSkills;
window.cycleSkillProf        = cycleSkillProf;
window.updatePassivePerception = updatePassivePerception;
