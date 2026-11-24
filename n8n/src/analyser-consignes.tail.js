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
