/* Carnet de séances : logique de l'application (accès, liste, création, suivi, modification).
   Le rendu d'une séance vient de carnet.js (render, esc). L'API est le workflow n8n,
   joint en même origine via /api/carnet-seances (proxy nginx), avec l'en-tête X-Carnet-Code. */
"use strict";

const API = "api/carnet-seances";
const POLL_MS = 4000;
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

/* ---------- views ---------- */
const $ = id => document.getElementById(id);
const VIEWS = ["acces", "liste", "nouvelle", "seance"];
function show(view){
  VIEWS.forEach(v => { $("view-" + v).hidden = v !== view; });
  $("topActions").hidden = view === "acces";
  scrollTo(0, 0);
}
function fail(e, errEl){
  if (e instanceof AuthError){ store.del(LS_CODE); location.hash = "#acces"; return; }
  if (errEl) errEl.textContent = e.message; else alert(e.message);
}

let pollToken = 0;
function stopPolling(){ pollToken++; }

async function route(){
  stopPolling();
  const h = location.hash.replace(/^#/, "");
  if (!store.get(LS_CODE) && h !== "acces"){ location.hash = "#acces"; return; }
  if (h === "acces") return showAccess();
  if (h === "nouvelle") return showNew();
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
const STATUS = { generating: "En rédaction", reviewing: "En vérification", ready: "Prête", error: "Erreur" };
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
      <span class="m"><span>${fmtDate(s.updated_at)}${s.author ? " · " + esc(s.author) : ""}</span><span class="pill ${esc(s.status)}">${STATUS[s.status] || esc(s.status)}</span></span>
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
  const mins = Math.floor((Date.now() - startedAt) / 60000), secs = Math.floor((Date.now() - startedAt) / 1000) % 60;
  $("progressText").textContent = (status === "reviewing"
    ? "Une seconde lecture vérifie les pieds, les mains et les trajectoires de chaque situation."
    : "L'assistant rédige la séance. Comptez 3 à 6 minutes au total ; vous pouvez quitter cette page et revenir plus tard.")
    + ` (${mins} min ${String(secs).padStart(2, "0")} s)`;
  document.querySelectorAll("#stages li").forEach(li => {
    const s = li.dataset.stage;
    li.className = status === "reviewing" ? (s === "write" ? "done" : s === "review" ? "now" : "") : (s === "write" ? "now" : "");
  });
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
  const tick = async () => {
    if (token !== pollToken) return;
    try {
      const r = await api("get", { id });
      if (token !== pollToken) return;
      paint(r);
      if (r.status === "generating" || r.status === "reviewing") setTimeout(tick, POLL_MS);
    } catch (e){
      if (token !== pollToken) return;
      if (e instanceof AuthError) return fail(e);
      $("errorCard").hidden = false; $("errorText").textContent = e.message; $("btnRelancer").hidden = true;
    }
  };
  tick();
}

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
