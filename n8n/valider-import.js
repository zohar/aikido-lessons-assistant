// n8n Code node « Valider l'import », mode "Run Once for Each Item".
// Checks a lesson JSON pasted or uploaded in the app (action "import") with the same
// rules as generated lessons, before it is saved as ready.

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
    errors.push('« situations » doit contenir de 2 à 5 situations.');
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

const body = $('Requête du Carnet').item.json.body || {};
let d = body.lesson;
if (typeof d === 'string') {
  try { d = JSON.parse(d); } catch (e) { return { json: { ok: false, errors: ['Le JSON est mal formé.'] } }; }
}
if (JSON.stringify(d || null).length > 200000) return { json: { ok: false, errors: ['La séance est trop volumineuse (200 Ko au plus).'] } };
const { errors, fixes } = validate(d);
if (errors.length === 0) delete d.relecture;
return { json: { ok: errors.length === 0, errors, fixes, data: d, author: $json.author } };
