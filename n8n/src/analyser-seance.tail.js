// « Analyser la séance » and « Analyser la réparation » (Run Once for Each Item).
// New lesson: full lesson, detailed instructions removed (they come on request).
// Revision: the changes are merged into the current lesson (see mergeRevision).
const mode = $('Préparer la demande').first().json.mode;
const current = mode === 'revise' ? $('Continuer si la séance existe').first().json.data : null;
const raw = (() => { try { return extractText($json); } catch (e) { return ''; } })();
let out;
try {
  const text = extractText($json);
  const answer = parseJson(text);
  let data;
  if (current) data = mergeRevision(current, answer);
  else {
    data = answer;
    if (Array.isArray(data.situations)) data.situations.forEach(s => { if (s && typeof s === 'object') { delete s.consignes; delete s.verification; delete s.aRedetailler; } });
  }
  const { errors, fixes } = validate(data);
  out = { ok: errors.length === 0, data, errors, fixes, raw: text };
} catch (e) {
  out = { ok: false, data: null, errors: [e.message], fixes: [], raw };
}
out.usage = $json.usage || null;
return { json: out };
