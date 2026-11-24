// « Appliquer la relecture » (Run Once for Each Item). The review sends corrections only:
// { corrections: [{ index, consigne, texte, titre? }], verification: [{ index, items }], relecture: [] }.
// If the review failed, the instructions are kept and flagged as not reviewed.
const base = $('Analyser les consignes').first().json;
const data = clone(base.data);
const done = base.done || [];
let notes = [];
try {
  const answer = parseJson(extractText($json));
  for (const c of Array.isArray(answer.corrections) ? answer.corrections : []) {
    const i = Number(c && c.index), k = Number(c && c.consigne);
    const s = done.includes(i) ? data.situations[i] : null;
    if (!s || !isStr(c.texte) || !(k >= 0) || k > s.consignes.length) continue;
    if (k === s.consignes.length) s.consignes.push({ titre: isStr(c.titre) ? c.titre.trim() : 'Précision', texte: c.texte.trim() });
    else { s.consignes[k].texte = c.texte.trim(); if (isStr(c.titre)) s.consignes[k].titre = c.titre.trim(); }
  }
  for (const v of Array.isArray(answer.verification) ? answer.verification : []) {
    const i = Number(v && v.index);
    if (!done.includes(i) || !Array.isArray(v.items)) continue;
    const items = v.items.filter(x => x && isStr(x.texte)).map(x => ({ statut: x.statut === 'ok' ? 'ok' : 'warn', texte: x.texte.trim() }));
    if (items.length) data.situations[i].verification = items;
  }
  notes = (Array.isArray(answer.relecture) ? answer.relecture : []).filter(isStr);
} catch (e) {
  for (const i of done) data.situations[i].verification.unshift({ statut: 'warn', texte: "La vérification automatique n'a pas abouti : consignes non relues." });
  notes = ["Relecture des consignes non aboutie."];
}
data.relecture = notes.concat(base.errors || []);
return { json: { data, usage: $json.usage || null } };
