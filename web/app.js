/* Carnet de séances : logique de l'application (accès, liste, création, suivi, modification).
   Le rendu d'une séance vient de carnet.js (render, esc). L'API est le workflow n8n,
   joint en même origine via /api/carnet-seances (proxy nginx), avec l'en-tête X-Carnet-Code.
   Pendant la rédaction, l'avancement est lu directement dans Supabase (fonction carnet_statut),
   pour ne pas lancer une exécution n8n à chaque vérification. */
"use strict";

const API = "api/carnet-seances";
const POLL_MS = 10000;          // progress check while a lesson is being written
const POLL_RETRY_MS = 30000;    // after a failed check
const STALE_S = 30 * 60;        // n8n stops a run after 30 min: no news for longer = interrupted
// Public by design (Supabase "publishable" key): it can only call carnet_statut(),
// which returns the status of one lesson whose id is known, never its content.
const SUPABASE_URL = "https://ueuauhnlzhwxqnnwfxzk.supabase.co";
const SUPABASE_KEY = "sb_publishable_Lyd7sKRG9cF2OlYM0brUHw_lxny1OiU";
const LS_CODE = "carnet-code";
const LS_AUTHOR = "carnet-auteur";
const store = {
  get(k){ try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch {} },
  del(k){ try { localStorage.removeItem(k); } catch {} }
};

class AuthError extends Error {}

async function api(action, payload = {}) {
  const code = store.get(LS_CODE);
  if (!code) throw new AuthError("Code manquant");
  let res;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Carnet-Code": code },
      body: JSON.stringify({ action, ...payload })
    });
  } catch {
    throw new Error("Le serveur ne répond pas. Vérifiez votre connexion, puis réessayez.");
  }
  if (res.status === 401 || res.status === 403) throw new AuthError("Code refusé");
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && data.error) || `Le serveur a renvoyé une erreur (${res.status}). Réessayez dans un instant.`);
  return data;
}

// Lightweight status: { status, step, age_s } or null if the lesson no longer exists.
async function statut(id){
  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/carnet_statut", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify({ p_id: id })
  });
  if (!res.ok) throw new Error("statut " + res.status);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
const isBusy = st => st === "generating" || st === "reviewing";

/* ---------- views ---------- */
const $ = id => document.getElementById(id);
const VIEWS = ["acces", "liste", "nouvelle", "seance", "glossaire", "importer"];
function show(view){
  VIEWS.forEach(v => { $("view-" + v).hidden = v !== view; });
  $("topActions").hidden = view === "acces";
  scrollTo(0, 0);
}
function fail(e, errEl){
  if (e instanceof AuthError){ store.del(LS_CODE); location.hash = "#acces"; return; }
  if (errEl) errEl.textContent = e.message; else alert(e.message);
}

let pollToken = 0, pollTimer = 0, clockTimer = 0, resume = null;
function stopPolling(){ pollToken++; clearTimeout(pollTimer); clearInterval(clockTimer); resume = null; }

async function route(){
  stopPolling();
  const h = location.hash.replace(/^#/, "");
  if (h === "glossaire") return showGlossary();          // static: no access code needed
  if (!store.get(LS_CODE) && h !== "acces"){ location.hash = "#acces"; return; }
  if (h === "acces") return showAccess();
  if (h === "nouvelle") return showNew();
  if (h === "importer") return showImport();
  if (h.startsWith("seance/")) return showLesson(h.slice(7));
  return showList();
}
addEventListener("hashchange", route);

/* ---------- access ---------- */
function showAccess(){
  document.title = "Carnet de séances";
  $("auteur").value = store.get(LS_AUTHOR) || "";
  $("accesErr").textContent = "";
  show("acces");
  $("code").focus();
}
$("formAcces").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true;
  store.set(LS_CODE, $("code").value.trim());
  store.set(LS_AUTHOR, $("auteur").value.trim());
  try { await api("list"); $("code").value = ""; location.hash = ""; }
  catch (err){
    if (err instanceof AuthError){ store.del(LS_CODE); $("accesErr").textContent = "Ce code n'est pas reconnu. Vérifiez-le auprès du club."; }
    else $("accesErr").textContent = err.message;
  } finally { btn.disabled = false; }
});

/* ---------- list ---------- */
const STATUS = { generating: "En rédaction", reviewing: "En vérification", ready: "Prête", error: "Erreur", stale: "Interrompue" };
const listStatus = s => isBusy(s.status) && Date.now() - new Date(s.updated_at) > STALE_S * 1000 ? "stale" : s.status;
const fmtDate = s => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); };

async function showList(){
  document.title = "Mes séances · Carnet de séances";
  show("liste");
  $("listeStatus").textContent = "Chargement…";
  $("listeStatus").hidden = false;
  $("lessons").innerHTML = "";
  try {
    const { items = [] } = await api("list") || {};
    if (!items.length){ $("listeStatus").textContent = "Aucune séance pour l'instant. Commencez par « Nouvelle séance »."; return; }
    $("listeStatus").hidden = true;
    $("lessons").innerHTML = items.map(s => `<li><a href="#seance/${esc(s.id)}">
      <span class="t">${esc(s.theme || "Sans titre")}</span>
      <span class="p">${esc(s.public || "")}</span>
      <span class="m"><span>${fmtDate(s.updated_at)}${s.author ? " · " + esc(s.author) : ""}</span><span class="pill ${esc(listStatus(s))}">${STATUS[listStatus(s)] || esc(s.status)}</span></span>
    </a></li>`).join("");
  } catch (e){ fail(e, $("listeStatus")); }
}

/* ---------- new lesson ---------- */
const DEFAULT_PUBLIC = "5e à 1er kyu, adultes";
const DEFAULT_DUREE = 30;
// Each group inserts "label : value" lines. "single" groups replace their existing line.
const TOKENS = [
  { key: "principe", label: "principe", values: ["Irimi", "Tenkan", "Maaï", "Shiseï", "Kamae", "Hanmi", "Zanshin", "Kokyu", "Metsuke", "Atemi", "Taï Sabaki", "Omote et Ura", "Kimusubi", "Awase", "De-Aï", "Sen no Sen", "Kiryoku", "Kokyu Ryoku", "Sokudo", "Arukikata", "Reigisaho", "Reishiki", "Seishin Jotaï", "Kokoro no Mochikata", "absence d'ouverture"] },
  { key: "technique", label: "technique", values: ["Ikkyo", "Nikyo", "Sankyo", "Yonkyo", "Gokyo", "Iriminage", "Shihonage", "Kotegaeshi", "Kaitennage", "Tenchinage", "Koshinage", "Kokyunage", "Udekimenage", "Jujigarami", "Sumiotoshi", "Kokyuho", "Ushiro Kiriotoshi", "Hijikimeosae", "Udegarami", "Aikiotoshi", "Iriminage Sokumen (Naname Kokyunage)", "Uchi Kaitennage", "Soto Kaitennage", "Uchikaiten Sankyo", "Sotokaiten Sankyo"] },
  { key: "attaque", label: "attaque", values: ["Katate Dori", "Aï-hanmi Katate Dori", "Ryote Dori", "Katate Ryote Dori", "Kata Dori", "Muna Dori", "Ryokata Dori", "Shomen Uchi", "Yokomen Uchi", "Kata Dori Men Uchi", "Chudan Tsuki", "Jodan Tsuki", "Ushiro Ryote Dori", "Ushiro Ryokata Dori", "Ushiro Eri Dori", "Ushiro Ryohiji Dori", "Ushiro Katate Dori Kubishime", "Futaridori", "Taninzugake"] },
  { key: "forme", label: "forme", values: ["Suwariwaza", "Hanmihandachiwaza", "Tachiwaza", "Ushirowaza", "Bukiwaza", "Tanto Dori", "Jo Dori", "Jo Nage Waza", "Tachi Dori", "Ken Tai Ken", "Jo Tai Jo", "Randori", "Niningake", "Saningake", "Futaridori", "Jyuwaza", "Henka Waza"] },
  { key: "concept", label: "concept", values: ["le déséquilibre", "la connexion", "le placement", "la distance", "la vigilance", "la sécurité et les chutes"] },
  { key: "public", label: "public", single: true, values: ["débutants, 6e kyu, adultes", "6e à 4e kyu, adultes", "5e à 1er kyu, adultes", "2e à 1er kyu, préparation 1er Dan", "1er Dan", "2e Dan et plus", "enfants 6-8 ans", "enfants 8-12 ans", "adolescents 12-15 ans"] },
  { key: "duree", label: "durée", single: true, values: ["30 min", "45 min", "60 min", "90 min"] },
  { key: "cadre", label: "cadre", single: true, values: ["cours ordinaire", "préparation BF"] }
];
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const lineKey = line => { const m = line.match(/^\s*([^:\n]{2,20}?)\s*:/); return m ? norm(m[1]) : null; };
const demande = $("demande");

$("tokens").innerHTML = TOKENS.map((g, i) => `<div class="token-group" data-key="${g.key}">
  <span class="token-label">${esc(g.label)}</span>
  <div class="token-body">
    <div class="tokens" id="tokens-${g.key}">${g.values.map(v => `<button type="button" class="token" data-g="${i}" data-v="${esc(v)}">${esc(v)}</button>`).join("")}</div>
    <button type="button" class="token-more" aria-controls="tokens-${g.key}" aria-expanded="false" hidden></button>
  </div>
</div>`).join("");

// Show two lines per group; the rest behind "+ N autres".
function layoutTokens(){
  document.querySelectorAll(".token-group").forEach(group => {
    const box = group.querySelector(".tokens"), more = group.querySelector(".token-more");
    const open = more.getAttribute("aria-expanded") === "true";
    box.style.maxHeight = "";
    const chips = [...box.children];
    const tops = [...new Set(chips.map(c => c.offsetTop))].sort((x, y) => x - y);
    if (tops.length <= 2){ more.hidden = true; return; }
    const hidden = chips.filter(c => c.offsetTop >= tops[2]);
    hidden.forEach(c => { c.tabIndex = open ? 0 : -1; });
    more.hidden = false;
    more.textContent = open ? "Moins" : `+ ${hidden.length} autre${hidden.length > 1 ? "s" : ""}`;
    if (!open) box.style.maxHeight = (tops[2] - tops[0] - 1) + "px";
  });
}
$("tokens").addEventListener("click", e => {
  const m = e.target.closest(".token-more"); if (!m) return;
  m.setAttribute("aria-expanded", m.getAttribute("aria-expanded") === "true" ? "false" : "true");
  layoutTokens();
});
let resizeTimer;
addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!$("view-nouvelle").hidden) layoutTokens(); }, 150); });

function addToken(group, value){
  const line = `${group.label} : ${value}`;
  const lines = demande.value.split("\n");
  if (group.single){
    const k = norm(group.label);
    const at = lines.findIndex(l => lineKey(l) === k);
    if (at >= 0){ lines[at] = line; demande.value = lines.join("\n"); return; }
  }
  if (lines.some(l => norm(l) === norm(line))) return;
  const text = demande.value.replace(/\s+$/, "");
  demande.value = (text ? text + "\n" : "") + line;
}
$("tokens").addEventListener("click", e => {
  const b = e.target.closest(".token"); if (!b) return;
  addToken(TOKENS[+b.dataset.g], b.dataset.v);
  demande.focus();
  demande.setSelectionRange(demande.value.length, demande.value.length);
  refreshDemande();
});

// Reads "public :" and "durée :" lines; everything else is the request itself.
function parseDemande(text){
  let pub = "", duree = 0;
  const rest = [];
  text.split("\n").map(l => l.trim()).filter(Boolean).forEach(l => {
    const k = lineKey(l), v = l.slice(l.indexOf(":") + 1).trim();
    if (k === "public" && v) pub = v;
    else if (k === "duree" && v) duree = parseInt(v, 10) || 0;
    else rest.push(l);
  });
  return { public: pub || DEFAULT_PUBLIC, duree: Math.min(Math.max(duree || DEFAULT_DUREE, 15), 120), demande: rest.join("\n"), pubSet: !!pub, dureeSet: !!duree };
}
function refreshDemande(){
  const p = parseDemande(demande.value);
  $("defaults").innerHTML = `Public : <b>${esc(p.public)}</b>${p.pubSet ? "" : " (par défaut)"} · Durée : <b>${p.duree} min</b>${p.dureeSet ? "" : " (par défaut)"}`;
  const present = new Set(demande.value.split("\n").map(norm));
  document.querySelectorAll(".token").forEach(b => {
    const g = TOKENS[+b.dataset.g];
    b.classList.toggle("on", present.has(norm(`${g.label} : ${b.dataset.v}`)));
  });
}
demande.addEventListener("input", refreshDemande);
demande.addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); $("formNouvelle").requestSubmit(); }
});

function showNew(){
  document.title = "Nouvelle séance · Carnet de séances";
  $("nouvelleErr").textContent = "";
  refreshDemande();
  show("nouvelle");
  layoutTokens();
  demande.focus();
}
$("formNouvelle").addEventListener("submit", async e => {
  e.preventDefault();
  const p = parseDemande(demande.value);
  if (!p.demande){ $("nouvelleErr").textContent = "Indiquez au moins un principe, une technique ou un concept."; return; }
  const btn = $("btnGenerer"); btn.disabled = true; $("nouvelleErr").textContent = "";
  const oneLine = p.demande.split("\n").join(" ; ");
  try {
    const r = await api("generate", {
      startingPoint: oneLine.slice(0, 300),
      public: p.public,
      duree: p.duree,
      notes: oneLine.length > 300 ? p.demande : "",
      author: store.get(LS_AUTHOR) || ""
    });
    demande.value = "";
    location.hash = "#seance/" + r.id;
  } catch (err){ fail(err, $("nouvelleErr")); }
  finally { btn.disabled = false; }
});

/* ---------- one lesson ---------- */
let row = null;
let startedAt = 0;

function setProgress(status, step){
  const p = $("progress");
  p.hidden = false;
  $("progressTitle").textContent = step || (status === "reviewing" ? "Vérification spatiale" : "Rédaction de la séance");
  $("progressText").textContent = status === "reviewing"
    ? "Une seconde lecture vérifie les pieds, les mains et les trajectoires de chaque situation."
    : "L'assistant rédige la séance.";
  tickClock();
  document.querySelectorAll("#stages li").forEach(li => {
    const s = li.dataset.stage;
    li.className = status === "reviewing" ? (s === "write" ? "done" : s === "review" ? "now" : "") : (s === "write" ? "now" : "");
  });
}
function tickClock(){
  const t = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  $("progressClock").textContent = `${Math.floor(t / 60)} min ${String(t % 60).padStart(2, "0")} s`;
}

function paint(r){
  row = r;
  const busy = r.status === "generating" || r.status === "reviewing";
  $("errorCard").hidden = r.status !== "error";
  if (r.status === "error") $("errorText").textContent = r.error || "Erreur inconnue.";
  $("btnRelancer").hidden = !!r.data;
  if (busy) setProgress(r.status, r.step); else $("progress").hidden = true;
  if (r.data && !busy){ render(r.data, false); $("modifyCard").hidden = false; }
  else { $("lesson").innerHTML = ""; $("modifyCard").hidden = true; document.title = (r.theme || "Séance") + " · Carnet de séances"; }
}

async function showLesson(id){
  show("seance");
  $("lesson").innerHTML = ""; $("modifyCard").hidden = true; $("errorCard").hidden = true; $("progress").hidden = true;
  $("modifierErr").textContent = "";
  startedAt = Date.now();
  const token = ++pollToken;
  try {
    const r = await api("get", { id });
    if (token !== pollToken) return;
    paint(r);
    if (isBusy(r.status)) waitFor(id, token);
  } catch (e){
    if (token !== pollToken) return;
    if (e instanceof AuthError) return fail(e);
    $("errorCard").hidden = false; $("errorText").textContent = e.message; $("btnRelancer").hidden = true;
  }
}

// While the lesson is being written: check its status in Supabase every 10 s (paused while the
// page is hidden), then load the finished lesson from n8n once.
function waitFor(id, token){
  let first = true;
  clearInterval(clockTimer);
  clockTimer = setInterval(() => { if (token === pollToken && !$("progress").hidden) tickClock(); }, 1000);
  const later = ms => { clearTimeout(pollTimer); pollTimer = setTimeout(check, ms); };
  const finish = async () => {
    const r = await api("get", { id });
    if (token !== pollToken) return;
    paint(r);
    if (isBusy(r.status)) later(POLL_MS); else clearInterval(clockTimer);
  };
  const check = async () => {
    if (token !== pollToken) return;
    if (document.hidden){ resume = () => { resume = null; later(0); }; return; }
    try {
      const s = await statut(id);
      if (token !== pollToken) return;
      if (s && isBusy(s.status)){
        if (first){ startedAt = Date.now() - (s.age_s || 0) * 1000; first = false; }
        if (s.age_s > STALE_S) return interrupted();
        if (s.status !== row.status || s.step !== row.step){ row.status = s.status; row.step = s.step; setProgress(s.status, s.step); }
        return later(POLL_MS);
      }
      await finish();                       // ready, error or deleted
    } catch (e){
      if (token !== pollToken) return;
      if (e instanceof AuthError) return fail(e);
      try { await finish(); } catch { later(POLL_RETRY_MS); }   // Supabase unreachable: ask n8n instead
    }
  };
  check();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && resume) resume(); });

function interrupted(){
  clearInterval(clockTimer);
  paint({ ...row, status: "error", error: row.data
    ? "La modification n'a pas abouti (aucune nouvelle depuis plus de 30 minutes). Voici la version précédente ; vous pouvez redemander la modification."
    : "La rédaction semble interrompue : aucune nouvelle depuis plus de 30 minutes. Relancez la demande." });
}

/* ---------- import ---------- */
// Paste or drop a lesson JSON; it is checked here for quick feedback, then by n8n
// (same rules as generated lessons) before being saved as ready.
const IMPORT_MAX = 200000;
const importText = $("importText");
let imported = null;

function showImport(){
  document.title = "Importer une séance · Carnet de séances";
  $("importErr").textContent = "";
  show("importer");
  checkImport();
  importText.focus();
}
function checkImport(){
  const text = importText.value.trim();
  const out = $("importCheck"), warn = $("importWarn");
  imported = null; warn.hidden = true; warn.innerHTML = "";
  $("importErr").textContent = "";
  if (!text){ out.hidden = true; $("btnImporter").disabled = true; return; }
  out.hidden = false;
  try {
    if (text.length > IMPORT_MAX) throw new Error("Ce texte est trop long pour une séance (200 Ko au plus).");
    const d = parseLesson(text);
    const n = d.situations.length;
    out.className = "import-check ok";
    out.textContent = `Séance reconnue : ${d.theme}${d.public ? " · " + d.public : ""} · ${n} situation${n > 1 ? "s" : ""}${d.duree ? " · " + d.duree + " min" : ""}`;
    const w = checks(d);
    if (w.length){ warn.innerHTML = w.map(x => `<li>${esc(x)}</li>`).join(""); warn.hidden = false; }
    imported = d;
  } catch (e){
    out.className = "import-check bad";
    out.textContent = e.message;
  }
  $("btnImporter").disabled = !imported;
}
function readImportFile(file){
  if (!file) return;
  if (file.size > IMPORT_MAX){ $("importErr").textContent = "Ce fichier est trop volumineux pour une séance (200 Ko au plus)."; return; }
  const r = new FileReader();
  r.onload = () => { importText.value = String(r.result || ""); checkImport(); };
  r.onerror = () => { $("importErr").textContent = "Impossible de lire ce fichier."; };
  r.readAsText(file);
}
importText.addEventListener("input", checkImport);
$("importFile").addEventListener("change", e => { readImportFile(e.target.files[0]); e.target.value = ""; });
importText.addEventListener("dragover", e => { if ([...e.dataTransfer.types].includes("Files")){ e.preventDefault(); importText.classList.add("drop"); } });
importText.addEventListener("dragleave", () => importText.classList.remove("drop"));
importText.addEventListener("drop", e => {
  importText.classList.remove("drop");
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f){ e.preventDefault(); readImportFile(f); }
});
$("formImporter").addEventListener("submit", async e => {
  e.preventDefault();
  if (!imported) return;
  const btn = $("btnImporter"); btn.disabled = true; $("importErr").textContent = "";
  try {
    const r = await api("import", { lesson: imported, author: store.get(LS_AUTHOR) || "" });
    importText.value = ""; imported = null;
    location.hash = "#seance/" + r.id;
  } catch (err){ fail(err, $("importErr")); btn.disabled = false; }
});

/* ---------- glossary ---------- */
// Same terms as the hover explanations (G0 in carnet.js), grouped by category.
// G0 is ordered by category; each key below opens a new category.
const GLOSS_CATS = [
  { key: "principe", label: "Principes" }, { key: "pratique", label: "Pratique" }, { key: "forme", label: "Formes de travail" },
  { key: "arme", label: "Armes" }, { key: "attaque", label: "Attaques" }, { key: "technique", label: "Techniques" }, { key: "grade", label: "Grades" }
];
const GLOSS_STARTS = { "Shisei": "principe", "Tori": "pratique", "Suwariwaza": "forme", "Buki": "arme", "Kihon": "pratique", "Kogekiho": "attaque", "Ikkyo": "technique", "Kyu": "grade" };
let glossCat = "", glossBuilt = false;
const glossEntries = (() => {
  const aliases = {};
  Object.entries(ALIAS).forEach(([a, k]) => { if (a !== k) (aliases[k] = aliases[k] || []).push(a); });
  let cat = "principe";
  return Object.entries(G0).map(([term, [kanji, romaji, def]]) => {
    if (GLOSS_STARTS[term]) cat = GLOSS_STARTS[term];
    const alt = (aliases[term] || []).filter(a => a.toLowerCase() !== term.toLowerCase());
    return { term, kanji, romaji, def, cat, alt, search: norm([term, romaji, def, ...alt].join(" ")) };
  });
})();

function buildGlossaryPage(){
  const byCat = c => glossEntries.filter(e => e.cat === c).sort((a, b) => a.term.localeCompare(b.term, "fr", { sensitivity: "base" }));
  $("glossCats").innerHTML = `<button type="button" class="gcat on" data-cat="" aria-pressed="true">Tous <span>${glossEntries.length}</span></button>`
    + GLOSS_CATS.map(c => `<button type="button" class="gcat" data-cat="${c.key}" data-key="${c.key}" aria-pressed="false">${c.label} <span>${byCat(c.key).length}</span></button>`).join("");
  $("gloss").innerHTML = GLOSS_CATS.map(c => `<section class="gl-sec" data-key="${c.key}" aria-labelledby="gl-${c.key}">
    <h2 id="gl-${c.key}">${c.label}</h2>
    <ul class="gl-list">${byCat(c.key).map(e => `<li class="gl" data-s="${esc(e.search)}">
      <div class="gl-head"><span class="gl-term">${esc(e.term)}</span><span class="gl-kanji" lang="ja">${esc(e.kanji)}</span></div>
      <p class="gl-def"><span class="gl-romaji">${esc(e.romaji)}</span>${esc(e.def)}${e.alt.length ? `<span class="gl-alt">Aussi : ${e.alt.map(esc).join(", ")}</span>` : ""}</p>
    </li>`).join("")}</ul>
  </section>`).join("");
  glossBuilt = true;
}
function filterGlossary(){
  const q = norm($("glossQ").value);
  let n = 0;
  document.querySelectorAll(".gl-sec").forEach(sec => {
    let k = 0;
    const inCat = !glossCat || sec.dataset.key === glossCat;
    sec.querySelectorAll(".gl").forEach(li => { const on = inCat && (!q || li.dataset.s.includes(q)); li.hidden = !on; if (on) k++; });
    sec.hidden = k === 0; n += k;
  });
  $("glossEmpty").hidden = n > 0;
  $("glossCount").textContent = `${n} terme${n > 1 ? "s" : ""}`;
}
function showGlossary(){
  document.title = "Glossaire · Carnet de séances";
  if (!glossBuilt) buildGlossaryPage();
  show("glossaire");
  $("topActions").hidden = false;
  filterGlossary();
}
$("glossQ").addEventListener("input", filterGlossary);
$("glossCats").addEventListener("click", e => {
  const b = e.target.closest(".gcat"); if (!b) return;
  glossCat = b.dataset.cat;
  document.querySelectorAll(".gcat").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
  filterGlossary();
});

$("formModifier").addEventListener("submit", async e => {
  e.preventDefault();
  if (!row) return;
  const btn = e.submitter; btn.disabled = true; $("modifierErr").textContent = "";
  try {
    await api("revise", { id: row.id, message: $("message").value.trim() });
    $("message").value = "";
    showLesson(row.id);
  } catch (err){ fail(err, $("modifierErr")); }
  finally { btn.disabled = false; }
});

$("btnRelancer").addEventListener("click", async () => {
  if (!row || !row.request) return;
  const old = row.id;
  try {
    const r = await api("generate", { ...row.request, author: row.author || store.get(LS_AUTHOR) || "" });
    api("delete", { id: old }).catch(() => {});
    location.hash = "#seance/" + r.id;
  } catch (err){ fail(err, $("errorText")); }
});

$("btnSupprimer").addEventListener("click", async () => {
  if (!row || !confirm(`Supprimer la séance « ${row.theme || ""} » ? Cette action est définitive.`)) return;
  try { await api("delete", { id: row.id }); location.hash = ""; }
  catch (err){ fail(err, $("modifierErr")); }
});

$("btnImprimer").addEventListener("click", () => print());

$("btnCopier").addEventListener("click", async e => {
  if (!row || !row.data) return;
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(JSON.stringify(row.data, null, 2)); btn.textContent = "JSON copié"; }
  catch { btn.textContent = "Copie impossible"; }
  setTimeout(() => { btn.textContent = "Copier le JSON"; }, 1600);
});

route();
