// n8n Code node, mode "Run Once for Each Item".
// Reads the reviewer's OpenRouter answer; falls back to the retained lesson
// from the 'Séance retenue' node if the review is missing or invalid.

function extractText(json) {
  const choice = json && json.choices && json.choices[0];
  const content = choice && choice.message && choice.message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(p => (p && p.text) || '').join('');
  if (json && json.error) throw new Error('OpenRouter : ' + (json.error.message || JSON.stringify(json.error)));
  return '';
}

function parseLesson(text) {
  let t = String(text || '').trim();
  const ticks = String.fromCharCode(96).repeat(3);
  const f = t.indexOf(ticks);
  if (f >= 0) {
    const nl = t.indexOf(String.fromCharCode(10), f);
    const end = nl >= 0 ? t.indexOf(ticks, nl) : -1;
    if (end > nl) t = t.slice(nl + 1, end).trim();
  }
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('Aucun objet JSON dans la réponse.');
  return JSON.parse(t.slice(a, b + 1));
}

const GABARIT = ['objectif', 'formeAttaque', 'technique', 'principes', 'critereRealisation', 'critereReussite', 'variantes', 'securite'];

function validate(d) {
  const errors = [];
  const fixes = [];
  const isStr = v => typeof v === 'string' && v.trim().length > 0;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { errors: ["La réponse n'est pas un objet JSON."], fixes };
  d.format = 'seance-aikido/1';
  for (const k of ['theme', 'public', 'objectifGeneral']) if (!isStr(d[k])) errors.push('Champ « ' + k + ' » manquant ou vide.');
  if (typeof d.kanji !== 'string') d.kanji = '';
  if (!Array.isArray(d.observables) || d.observables.length === 0) errors.push('« observables » doit être une liste non vide.');
  if (!d.echauffement || typeof d.echauffement !== 'object') errors.push('« echauffement » manquant.');
  if (!d.bilan || typeof d.bilan !== 'object') errors.push('« bilan » manquant.');
  if (!d.justifier || !isStr(d.justifier.question) || !isStr(d.justifier.reponse)) errors.push('« justifier » doit contenir « question » et « reponse ».');
  if (!d.glossaire || typeof d.glossaire !== 'object' || Array.isArray(d.glossaire)) d.glossaire = {};
  if (!Array.isArray(d.situations) || d.situations.length < 2 || d.situations.length > 5) {
    errors.push('« situations » doit contenir 3 ou 4 situations.');
  } else {
    d.situations.forEach((s, i) => {
      const n = 'Situation ' + (i + 1);
      if (!isStr(s.titre)) errors.push(n + ' : « titre » manquant.');
      s.duree = Number(s.duree);
      if (!(s.duree > 0)) errors.push(n + ' : « duree » doit être un nombre de minutes.');
      if (!Array.isArray(s.phases)) s.phases = [];
      s.phases = s.phases.map(Number).filter(p => p === 1 || p === 2 || p === 3);
      if (s.phases.length === 0) errors.push(n + ' : « phases » doit contenir 1, 2 ou 3.');
      if (!isStr(s.forme)) s.forme = (s.gabarit && s.gabarit.formeAttaque) || '';
      if (!s.gabarit || typeof s.gabarit !== 'object') errors.push(n + ' : « gabarit » manquant.');
      else for (const k of GABARIT) if (!isStr(s.gabarit[k])) errors.push(n + ' : gabarit « ' + k + ' » vide.');
      if (!Array.isArray(s.consignes) || s.consignes.length < 3) errors.push(n + ' : il faut au moins 3 consignes détaillées.');
      else if (s.consignes.some(c => !c || !isStr(c.titre) || !isStr(c.texte))) errors.push(n + ' : chaque consigne doit avoir « titre » et « texte ».');
      if (!Array.isArray(s.verification) || s.verification.length === 0) errors.push(n + ' : « verification » manquante.');
      else s.verification.forEach(v => { if (v && v.statut !== 'ok') v.statut = 'warn'; });
    });
  }
  if (errors.length === 0) {
    const sum = (Number(d.echauffement.duree) || 0) + d.situations.reduce((t, s) => t + s.duree, 0) + (Number(d.bilan.duree) || 0);
    if (Number(d.duree) !== sum) { fixes.push('Durée totale recalculée : ' + sum + ' min.'); d.duree = sum; }
  }
  return { errors, fixes };
}

const retained = $('Séance retenue').first().json.data;
let finalData = retained;
let notes = [];
let reviewed = false;
try {
  const text = extractText($json);
  const data = parseLesson(text);
  const { errors, fixes } = validate(data);
  if (errors.length === 0) {
    finalData = data;
    reviewed = true;
    notes = Array.isArray(data.relecture) ? data.relecture.filter(x => typeof x === 'string' && x.trim()) : [];
    notes = notes.concat(fixes);
  } else {
    notes = ["La relecture automatique n'a pas pu être appliquée ; version non relue."];
  }
} catch (e) {
  notes = ["La relecture automatique n'a pas abouti ; version non relue."];
}
finalData.relecture = notes;
return { json: { data: finalData, reviewed, usage: $json.usage || null } };
