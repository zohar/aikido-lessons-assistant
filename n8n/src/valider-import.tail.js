// « Valider l'import » (Run Once for Each Item): a lesson JSON pasted or uploaded in the app
// (action "import"), checked with the same rules as generated lessons, before it is saved as ready.
const body = $('Requête du Carnet').item.json.body || {};
let d = body.lesson;
if (typeof d === 'string') {
  try { d = JSON.parse(d); } catch (e) { return { json: { ok: false, errors: ['Le JSON est mal formé.'] } }; }
}
if (JSON.stringify(d || null).length > 200000) return { json: { ok: false, errors: ['La séance est trop volumineuse (200 Ko au plus).'] } };
const { errors, fixes } = validate(d);
if (errors.length === 0) delete d.relecture;
return { json: { ok: errors.length === 0, errors, fixes, data: d, author: $json.author } };
