// ---- Shared by every n8n Code node of the Carnet (built by n8n/build_codes.py) ----

function extractText(json) {
  const choice = json && json.choices && json.choices[0];
  const content = choice && choice.message && choice.message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(p => (p && p.text) || '').join('');
  if (json && json.error) throw new Error('OpenRouter : ' + (json.error.message || JSON.stringify(json.error)));
  return '';
}

// First JSON object in a model answer (with or without a fenced code block).
function parseJson(text) {
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
const isStr = v => typeof v === 'string' && v.trim().length > 0;

// Lesson format seance-aikido/1. Each exercise has its template (gabarit) and short notes
// (notes.uke, notes.enseignant). Detailed instructions (consignes + verification) are
// optional: they are added on request. Older lessons may have consignes without notes.
function validateSituation(s, n, errors) {
  if (!s || typeof s !== 'object') { errors.push(n + ' : situation invalide.'); return; }
  if (!isStr(s.titre)) errors.push(n + ' : « titre » manquant.');
  s.duree = Number(s.duree);
  if (!(s.duree > 0)) errors.push(n + ' : « duree » doit être un nombre de minutes.');
  if (!Array.isArray(s.phases)) s.phases = [];
  s.phases = s.phases.map(Number).filter(p => p === 1 || p === 2 || p === 3);
  if (s.phases.length === 0) errors.push(n + ' : « phases » doit contenir 1, 2 ou 3.');
  if (!isStr(s.forme)) s.forme = (s.gabarit && s.gabarit.formeAttaque) || '';
  if (!s.gabarit || typeof s.gabarit !== 'object') errors.push(n + ' : « gabarit » manquant.');
  else for (const k of GABARIT) if (!isStr(s.gabarit[k])) errors.push(n + ' : gabarit « ' + k + ' » vide.');
  const hasNotes = s.notes && typeof s.notes === 'object' && isStr(s.notes.uke) && isStr(s.notes.enseignant);
  const hasConsignes = Array.isArray(s.consignes) && s.consignes.length > 0;
  if (!hasNotes && !hasConsignes) errors.push(n + ' : « notes » doit contenir « uke » et « enseignant ».');
  if (s.notes !== undefined && !hasNotes) { if (hasConsignes) delete s.notes; }
  if (s.consignes !== undefined) {
    if (!Array.isArray(s.consignes) || s.consignes.some(c => !c || !isStr(c.titre) || !isStr(c.texte))) errors.push(n + ' : chaque consigne doit avoir « titre » et « texte ».');
  }
  if (s.verification !== undefined) {
    if (!Array.isArray(s.verification)) delete s.verification;
    else s.verification = s.verification.filter(v => v && isStr(v.texte)).map(v => ({ statut: v.statut === 'ok' ? 'ok' : 'warn', texte: v.texte }));
  }
  if (s.aRedetailler !== undefined) { if (s.aRedetailler === true) s.aRedetailler = true; else delete s.aRedetailler; }
}

function validate(d) {
  const errors = [];
  const fixes = [];
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
    d.situations.forEach((s, i) => validateSituation(s, 'Situation ' + (i + 1), errors));
  }
  if (errors.length === 0) {
    const sum = (Number(d.echauffement.duree) || 0) + d.situations.reduce((t, s) => t + s.duree, 0) + (Number(d.bilan.duree) || 0);
    if (Number(d.duree) !== sum) { fixes.push('Durée totale recalculée : ' + sum + ' min.'); d.duree = sum; }
  }
  return { errors, fixes };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = o => JSON.parse(JSON.stringify(o));

// An exercise that changed loses its detailed instructions; if it had some, it is
// tagged « à redétailler » so the teacher can ask for them again.
function dropDetails(s, hadDetails) {
  delete s.consignes; delete s.verification;
  if (hadDetails) s.aRedetailler = true; else delete s.aRedetailler;
  return s;
}

// A revision answer is either a set of changes, { modifications, situations, supprimer },
// or (if the model ignored that) a full lesson. Both are merged into the current lesson.
const TOP_KEYS = ['theme', 'kanji', 'intitule', 'public', 'duree', 'objectifGeneral', 'observables', 'progression', 'echauffement', 'securite', 'bilan', 'justifier', 'glossaire'];
function mergeRevision(current, answer) {
  const d = clone(current);
  const old = Array.isArray(d.situations) ? d.situations : [];
  const isFull = Array.isArray(answer.situations) && answer.situations.length > 0 && answer.situations.every(s => s && typeof s === 'object' && s.index === undefined && s.gabarit);
  if (isFull && isStr(answer.theme)) {
    for (const k of TOP_KEYS) if (answer[k] !== undefined) d[k] = answer[k];
    d.situations = answer.situations.map((s, i) => {
      const before = old[i];
      const hadDetails = !!(before && Array.isArray(before.consignes) && before.consignes.length);
      if (before && same(before.gabarit, s.gabarit) && same(before.titre, s.titre)) {
        // Unchanged exercise: keep its detailed instructions as they were.
        const keep = clone(s);
        if (hadDetails) { keep.consignes = before.consignes; if (before.verification) keep.verification = before.verification; }
        if (before.aRedetailler) keep.aRedetailler = true;
        if (!keep.notes && before.notes) keep.notes = before.notes;
        return keep;
      }
      return dropDetails(clone(s), hadDetails);
    });
    return d;
  }
  const mods = answer.modifications && typeof answer.modifications === 'object' ? answer.modifications : {};
  for (const k of TOP_KEYS) if (mods[k] !== undefined) d[k] = mods[k];
  const list = old.slice();
  const repl = Array.isArray(answer.situations) ? answer.situations : [];
  for (const r of repl) {
    if (!r || typeof r !== 'object') continue;
    const i = Number(r.index);
    const s = r.situation && typeof r.situation === 'object' ? clone(r.situation) : null;
    if (!s || !(i >= 0) || i > list.length) continue;
    const before = list[i];
    const hadDetails = !!(before && Array.isArray(before.consignes) && before.consignes.length);
    list[i] = dropDetails(s, hadDetails);
  }
  const del = Array.isArray(answer.supprimer) ? answer.supprimer.map(Number).filter(i => i >= 0 && i < list.length) : [];
  [...new Set(del)].sort((a, b) => b - a).forEach(i => list.splice(i, 1));
  d.situations = list;
  return d;
}

// « Analyser les consignes » (Run Once for Each Item): detailed instructions written on
// request for some exercises, { situations: [{ index, consignes, verification }] },
// merged into the lesson. Only the right-hand content of those exercises changes.
const prep = $('Préparer le détail').first().json;
const wanted = prep.indexes;
const raw = (() => { try { return extractText($json); } catch (e) { return ''; } })();
let out;
try {
  const text = extractText($json);
  const answer = parseJson(text);
  const data = clone(prep.data);
  const errors = [];
  const done = [];
  const list = Array.isArray(answer.situations) ? answer.situations : [];
  for (const r of list) {
    const i = Number(r && r.index);
    if (!wanted.includes(i)) continue;
    const consignes = Array.isArray(r.consignes) ? r.consignes.filter(c => c && isStr(c.titre) && isStr(c.texte)).map(c => ({ titre: c.titre.trim(), texte: c.texte.trim() })) : [];
    if (consignes.length < 3) { errors.push('Situation ' + (i + 1) + ' : il faut au moins 3 consignes détaillées.'); continue; }
    const verification = Array.isArray(r.verification) ? r.verification.filter(v => v && isStr(v.texte)).map(v => ({ statut: v.statut === 'ok' ? 'ok' : 'warn', texte: v.texte.trim() })) : [];
    const s = data.situations[i];
    s.consignes = consignes;
    s.verification = verification.length ? verification : [{ statut: 'warn', texte: 'Placements non vérifiés.' }];
    delete s.aRedetailler;
    done.push(i);
  }
  for (const i of wanted) if (!done.includes(i) && !errors.some(e => e.startsWith('Situation ' + (i + 1) + ' '))) errors.push('Situation ' + (i + 1) + ' : consignes absentes de la réponse.');
  out = { ok: done.length > 0, data, done, errors, raw: text };
} catch (e) {
  out = { ok: false, data: null, done: [], errors: [e.message], raw };
}
out.usage = $json.usage || null;
return { json: out };
