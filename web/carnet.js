/* Carnet de séances : rendu d'une séance, glossaire au survol, validation. Partagé, ne pas modifier la mise en page ici sans raison. */
const PH = {1:"Placement",2:"Déséquilibre",3:"Projection / immobilisation"};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function icon(p,s=12,label){
  const c = `var(--p${p})`;
  const shape = p===1 ? `<polygon points="7,1.5 12.8,12.5 1.2,12.5"/>` : p===2 ? `<circle cx="7" cy="7" r="5.6"/>` : `<rect x="1.8" y="1.8" width="10.4" height="10.4"/>`;
  const a = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  return `<svg class="ico-ph" width="${s}" height="${s}" viewBox="0 0 14 14" style="fill:${c};stroke:${c};stroke-width:1.2" ${a}><title>${PH[p]}</title>${shape}</svg>`;
}

/* ---------- glossary ---------- */
const G0 = {
  "Shisei":["姿勢","shisei","Attitude, posture vivante : naturelle, relâchée, verticale, adaptable. Unité du corps."],
  "Kokyu":["呼吸","kokyū","Respiration, et rythme de l'échange entre les partenaires."],
  "Kokyu Ryoku":["呼吸力","kokyū ryoku","Expression du Kokyu : coordination de la puissance, de la respiration et du rythme."],
  "Kamae":["構え","kamae","État de vigilance, position de garde avant l'engagement."],
  "Hanmi":["半身","hanmi","Position asymétrique, une jambe en avant, le corps de trois quarts."],
  "Aï-hanmi":["相半身","ai hanmi","Garde identique : Tori et Uke ont le même pied devant (droit-droit ou gauche-gauche)."],
  "Gyaku-hanmi":["逆半身","gyaku hanmi","Garde inversée : Tori et Uke ont des pieds opposés devant (droit face à gauche)."],
  "Maaï":["間合い","maai","La distance juste entre les partenaires, dans l'espace et dans le temps."],
  "Irimi":["入身","irimi","Entrer, pénétrer la sphère du partenaire. Élément fondamental du placement initial."],
  "Tenkan":["転換","tenkan","Pivot qui s'efface devant l'action. Complémentaire d'Irimi."],
  "Omote":["表","omote","Forme « devant » : logique de pression, Tori passe devant le partenaire."],
  "Ura":["裏","ura","Forme « derrière » : logique de contournement, Tori passe derrière le partenaire."],
  "Taï Sabaki":["体捌き","tai sabaki","Déplacement du corps qui crée l'ouverture et le déséquilibre."],
  "Atemi":["当身","atemi","Frappe : pour Tori, un moyen de déstabiliser ou de provoquer une réaction, pas une fin en soi."],
  "Metsuke":["目付","metsuke","Le regard, physique et mental : voir le partenaire en entier, pas un seul point."],
  "Zanshin":["残心","zanshin","Vigilance permanente, avant, pendant et après l'échange."],
  "Kimusubi":["気結び","kimusubi","Connexion mentale et physique entre les partenaires."],
  "Awase":["合わせ","awase","S'harmoniser avec le mouvement du partenaire, l'accompagner."],
  "De-Aï":["出合い","deai","Le moment de la rencontre et le placement initial qui en découle."],
  "Kiryoku":["気力","kiryoku","Détermination, engagement dans l'action."],
  "Reigisaho":["礼儀作法","reigi sahō","Comportement général qui donne du sens à l'étiquette."],
  "Reishiki":["礼式","reishiki","Étiquette : saluts et rituel du dojo."],
  "Seishin Jotaï":["精神状態","seishin jōtai","État mental."],
  "Kokoro no Mochikata":["心の持ち方","kokoro no mochikata","Contrôle des émotions, sérénité."],
  "Arukikata":["歩き方","arukikata","Façon de marcher : liberté et légèreté des appuis."],
  "Sokudo":["速度","sokudo","Vivacité dans la disponibilité, vitesse potentielle née du relâchement."],
  "Sen no Sen":["先の先","sen no sen","Capacité à anticiper l'attaque."],
  "Tori":["取り","tori","Celui qui exécute la technique."],
  "Uke":["受け","uke","Celui qui attaque et reçoit la technique (aussi appelé Aïte)."],
  "Aïte":["相手","aite","Le partenaire, celui qui attaque (Uke)."],
  "Ukemi":["受身","ukemi","Art de chuter et de recevoir la technique sans se blesser."],
  "Seiza":["正座","seiza","Position assise à genoux, sur les talons, dos droit."],
  "Shikko":["膝行","shikkō","Déplacement à genoux."],
  "Tai no henko":["体の変更","tai no henkō","Exercice de base : pivot (Tenkan) sous une saisie au poignet, pour se placer à côté du partenaire."],
  "Dojo":["道場","dōjō","Le lieu de pratique, « lieu où l'on étudie la voie »."],
  "O Senseï":["大先生","ō sensei","« Grand maître » : nom donné au fondateur de l'Aïkido, Morihei Ueshiba."],
  "Suwariwaza":["座り技","suwari waza","Travail à genoux, Tori et Uke tous deux à genoux."],
  "Hanmihandachiwaza":["半身半立ち技","hanmi handachi waza","Tori à genoux, Uke debout."],
  "Tachiwaza":["立ち技","tachi waza","Travail debout, Tori et Uke tous deux debout."],
  "Ushirowaza":["後ろ技","ushiro waza","Techniques sur attaques par l'arrière."],
  "Bukiwaza":["武器技","buki waza","Travail avec les armes (Tanto, Jo, Tachi)."],
  "Tanto Dori":["短刀取り","tantō dori","Techniques à mains nues contre un couteau (Tanto)."],
  "Jo Dori":["杖取り","jō dori","Techniques à mains nues contre un bâton (Jo)."],
  "Jo Nage Waza":["杖投げ技","jō nage waza","Projections réalisées avec le bâton, quand Uke le saisit."],
  "Tachi Dori":["太刀取り","tachi dori","Techniques à mains nues contre un sabre de bois."],
  "Ken Tai Ken":["剣対剣","ken tai ken","Pratique sabre contre sabre."],
  "Jo Tai Jo":["杖対杖","jō tai jō","Pratique bâton contre bâton."],
  "Randori":["乱取り","randori","Pratique libre contre plusieurs attaques."],
  "Taninzugake":["多人数掛け","taninzu gake","Travail contre plusieurs partenaires."],
  "Niningake":["二人掛け","ninin gake","Travail contre deux partenaires."],
  "Saningake":["三人掛け","sannin gake","Travail contre trois partenaires."],
  "Futaridori":["二人取り","futari dori","Saisie par deux partenaires à la fois."],
  "Jyuwaza":["自由技","jiyū waza","Techniques libres sur une même attaque."],
  "Henka Waza":["変化技","henka waza","Variantes et enchaînements d'une technique à une autre."],
  "Buki":["武器","buki","Les armes (Tanto, Jo, Tachi) ; désigne aussi les attaques avec armes."],
  "Tanto":["短刀","tantō","Couteau ; en bois pour la pratique."],
  "Jo":["杖","jō","Bâton de bois, d'environ 1,30 m."],
  "Tachi":["太刀","tachi","Sabre ; en bois pour la pratique."],
  "Ken":["剣","ken","Sabre ; en pratique, le sabre de bois (Bokken)."],
  "Honte":["本手","honte","Tenue normale de l'arme : au Tanto, la lame sort du côté du pouce."],
  "Gyakute":["逆手","gyakute","Tenue inversée de l'arme : au Tanto, la lame sort du côté de l'auriculaire."],
  "Kihon":["基本","kihon","Les formes de base."],
  "Kogekiho":["攻撃法","kōgeki hō","Les formes d'attaque : saisies, frappes, attaques à plusieurs et avec armes."],
  "Katate Dori":["片手取り","katate dori","Saisie d'un poignet par une main. Sans précision, en garde inversée (Gyakuhanmi Katate Dori) : la main droite d'Uke saisit le poignet gauche de Tori, ou l'inverse."],
  "Aïhanmi Katate Dori":["相半身片手取り","ai hanmi katate dori","Saisie croisée en garde identique : la main droite d'Uke saisit le poignet droit de Tori, ou gauche-gauche."],
  "Katate Ryote Dori":["片手両手取り","katate ryōte dori","Saisie d'un avant-bras par les deux mains (aussi Morote Dori)."],
  "Morote Dori":["諸手取り","morote dori","Saisie d'un avant-bras par les deux mains."],
  "Ryote Dori":["両手取り","ryōte dori","Saisie des deux poignets, une main d'Uke sur chaque poignet de Tori."],
  "Kata Dori":["肩取り","kata dori","Saisie à l'épaule."],
  "Ryokata Dori":["両肩取り","ryōkata dori","Saisie des deux épaules, de face."],
  "Muna Dori":["胸取り","muna dori","Saisie au revers du keikogi, à la poitrine."],
  "Kata Dori Men Uchi":["肩取り面打ち","kata dori men uchi","Saisie à l'épaule suivie d'une frappe à la tête."],
  "Shomen Uchi":["正面打ち","shōmen uchi","Frappe verticale descendante au sommet de la tête."],
  "Yokomen Uchi":["横面打ち","yokomen uchi","Frappe circulaire au côté de la tête."],
  "Chudan Tsuki":["中段突き","chūdan tsuki","Coup de poing direct au ventre."],
  "Jodan Tsuki":["上段突き","jōdan tsuki","Coup de poing direct au visage."],
  "Ushiro Eri Dori":["後ろ襟取り","ushiro eri dori","Saisie du col par derrière."],
  "Ushiro Ryote Dori":["後ろ両手取り","ushiro ryōte dori","Saisie des deux poignets par derrière."],
  "Ushiro Ryokata Dori":["後ろ両肩取り","ushiro ryōkata dori","Saisie des deux épaules par derrière."],
  "Ushiro Ryohiji Dori":["後ろ両肘取り","ushiro ryōhiji dori","Saisie des deux coudes par derrière."],
  "Ushiro Katate Dori Kubishime":["後ろ片手取り首絞め","ushiro katate dori kubi shime","Par derrière : saisie d'un poignet et étranglement de l'autre bras."],
  "Kubishime":["首絞め","kubi shime","Étranglement, au cou."],
  "Ikkyo":["一教","ikkyō","Première immobilisation : contrôle du poignet et du coude, Uke amené au sol face contre le tapis."],
  "Nikyo":["二教","nikyō","Deuxième immobilisation : torsion du poignet vers l'intérieur, contrôle du coude."],
  "Sankyo":["三教","sankyō","Troisième immobilisation : torsion du poignet en spirale, qui remonte le bras."],
  "Yonkyo":["四教","yonkyō","Quatrième immobilisation : pression sur l'avant-bras, contrôle du poignet."],
  "Gokyo":["五教","gokyō","Cinquième immobilisation, adaptée notamment au désarmement contre couteau."],
  "Iriminage":["入身投げ","irimi nage","Projection en entrant derrière le partenaire, en contrôlant sa tête et son centre."],
  "Iriminage Sokumen":["入身投げ側面","irimi nage sokumen","Forme d'Iriminage par le côté du partenaire (aussi Naname Kokyunage)."],
  "Naname Kokyunage":["斜め呼吸投げ","naname kokyū nage","Projection en diagonale, sur le côté du partenaire."],
  "Shihonage":["四方投げ","shihō nage","Projection « des quatre directions » : Tori passe sous le bras d'Uke et coupe vers le bas."],
  "Kotegaeshi":["小手返し","kote gaeshi","Projection par retournement du poignet vers l'extérieur."],
  "Kaitennage":["回転投げ","kaiten nage","Projection en rotation : la tête d'Uke est amenée vers le bas, le bras tourne vers l'avant."],
  "Uchikaiten":["内回転","uchi kaiten","Rotation intérieure : Tori passe sous le bras d'Uke. Donne Uchi Kaitennage et Uchikaiten Sankyo."],
  "Sotokaiten":["外回転","soto kaiten","Rotation extérieure : Tori reste à l'extérieur du bras d'Uke. Donne Soto Kaitennage et Sotokaiten Sankyo."],
  "Tenchinage":["天地投げ","tenchi nage","Projection « ciel et terre » : une main monte, l'autre descend."],
  "Koshinage":["腰投げ","koshi nage","Projection par-dessus les hanches."],
  "Ushiro Kiriotoshi":["後ろ切り落とし","ushiro kiri otoshi","Projection vers l'arrière en coupant au niveau des épaules."],
  "Udekimenage":["腕極め投げ","ude kime nage","Projection en contrôlant le bras tendu au niveau du coude."],
  "Jujigarami":["十字絡み","jūji garami","Projection en croisant les bras d'Uke."],
  "Sumiotoshi":["隅落とし","sumi otoshi","Projection « dans le coin », vers l'angle mort d'Uke."],
  "Kokyunage":["呼吸投げ","kokyū nage","Projection par le rythme et le déséquilibre, sans clé articulaire."],
  "Kokyuho":["呼吸法","kokyūhō","Exercice de respiration et de coordination, souvent à genoux sur Ryote Dori, qui travaille le déséquilibre par le centre."],
  "Hijikimeosae":["肘極め押さえ","hiji kime osae","Immobilisation par contrôle du coude."],
  "Udegarami":["腕絡み","ude garami","Immobilisation par enroulement du bras."],
  "Aikiotoshi":["合気落とし","aiki otoshi","Projection en soulevant les jambes d'Uke par derrière."],
  "Nage Waza":["投げ技","nage waza","Famille des techniques de projection."],
  "Katame Waza":["固め技","katame waza","Famille des techniques de contrôle ou d'immobilisation."],
  "Nage Katame Waza":["投げ固め技","nage katame waza","Techniques de projection suivies d'un contrôle (Kotegaeshi, Iriminage, Shihonage)."],
  "Kyu":["級","kyū","Grade d'élève, avant le 1er Dan."],
  "Dan":["段","dan","Grade de ceinture noire."],
  "Shodan":["初段","shodan","Premier Dan."],
  "Nidan":["二段","nidan","Deuxième Dan."],
  "Sandan":["三段","sandan","Troisième Dan."],
  "Yondan":["四段","yondan","Quatrième Dan."],
  "Godan":["五段","godan","Cinquième Dan."],
  "Rokudan":["六段","rokudan","Sixième Dan."],
  "Nanadan":["七段","nanadan","Septième Dan."],
  "Hachidan":["八段","hachidan","Huitième Dan."]
};
const ALIAS = {
  "Ai-hanmi":"Aï-hanmi","Aïhanmi":"Aï-hanmi","Aihanmi":"Aï-hanmi","Ai hanmi":"Aï-hanmi",
  "Gyakuhanmi":"Gyaku-hanmi","Gyaku hanmi":"Gyaku-hanmi",
  "Ma-Aï":"Maaï","Maai":"Maaï","Shiseï":"Shisei","Tai Sabaki":"Taï Sabaki","Aite":"Aïte","De-Ai":"De-Aï","Deaï":"De-Aï",
  "Seishin Jotai":"Seishin Jotaï","Hanmi Handachi Waza":"Hanmihandachiwaza","Suwari Waza":"Suwariwaza","Tachi Waza":"Tachiwaza","Ushiro Waza":"Ushirowaza",
  "Irimi Nage":"Iriminage","Shiho Nage":"Shihonage","Kote Gaeshi":"Kotegaeshi","Kokyu Nage":"Kokyunage","Kaiten Nage":"Kaitennage","Tenchi Nage":"Tenchinage","Koshi Nage":"Koshinage",
  "Jiyu Waza":"Jyuwaza","Jyu-Waza":"Jyuwaza","Futari Dori":"Futaridori","Taninzu Gake":"Taninzugake","Ninin Gake":"Niningake","Sannin Gake":"Saningake",
  "Kokoro no Mochi Kata":"Kokoro no Mochikata","Sen No Sen":"Sen no Sen","Henka-Waza":"Henka Waza","Jyu Waza":"Jyuwaza",
  "Randori Niningake":"Niningake","Randori Saningake":"Saningake","Sanin Gake":"Saningake","Taninzu Dori":"Taninzugake",
  "Buki Waza":"Bukiwaza","Bokken":"Ken","Kogeki Ho":"Kogekiho",
  "Aihanmi Katate Dori":"Aïhanmi Katate Dori","Ai-hanmi Katate Dori":"Aïhanmi Katate Dori","Gyakuhanmi Katate Dori":"Katate Dori","Katadori":"Kata Dori","Kata Dori Menuchi":"Kata Dori Men Uchi",
  "Nagewaza":"Nage Waza","Katamewaza":"Katame Waza","Nagekatamewaza":"Nage Katame Waza",
  "Sokumen Iriminage":"Iriminage Sokumen","Sokumen":"Iriminage Sokumen","Irimi Sokumen":"Iriminage Sokumen",
  "Uchi Kaiten":"Uchikaiten","Soto Kaiten":"Sotokaiten","Uchikaiten Sankyo":"Uchikaiten","Sotokaiten Sankyo":"Sotokaiten",
  "Uchi Kaitennage":"Kaitennage","Soto Kaitennage":"Kaitennage",
  "kyu":"Kyu","dan":"Dan","Dan":"Dan"
};
let G = {};
function buildGlossary(extra){
  G = Object.assign({}, G0, extra || {});
  const lookup = {};
  for (const k of Object.keys(G)) lookup[k] = k;
  for (const [a,k] of Object.entries(ALIAS)) if (G[k]) lookup[a] = k;
  return lookup;
}
let LOOKUP = buildGlossary();
let RE;
function compileRe(){
  const terms = Object.keys(LOOKUP).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  RE = new RegExp(`(?<![\\p{L}-])(${terms.join("|")})(?![\\p{L}-])`,"gu");
}
function wrap(root){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n){
      if(!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if(!p || p.closest("script,style,.jp,.kanji,#tip,button,svg")) return NodeFilter.FILTER_REJECT;
      RE.lastIndex = 0;
      return RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes = []; while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n=>{
    const frag = document.createDocumentFragment();
    let last = 0; const s = n.nodeValue; RE.lastIndex = 0; let m;
    while((m = RE.exec(s))){
      if(m.index>last) frag.appendChild(document.createTextNode(s.slice(last,m.index)));
      const span = document.createElement("span");
      span.className = "jp"; span.tabIndex = 0; span.dataset.term = LOOKUP[m[1]]; span.textContent = m[1];
      span.setAttribute("aria-describedby","tip");
      frag.appendChild(span); last = m.index + m[1].length;
    }
    if(last<s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    n.parentNode.replaceChild(frag, n);
  });
}

/* ---------- validation ---------- */
function parseLesson(text){
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("Aucun bloc JSON trouvé. Copiez tout le bloc proposé par l'assistant, de { à }.");
  let data;
  try { data = JSON.parse(t.slice(a, b+1)); }
  catch(e){ throw new Error("Le JSON est incomplet ou mal formé (" + e.message + "). Recopiez le bloc en entier."); }
  if (!data || typeof data !== "object" || !Array.isArray(data.situations) || !data.theme)
    throw new Error("Ce JSON n'est pas une séance : il manque « theme » ou « situations ».");
  return data;
}
function checks(d){
  const w = [];
  const sum = (d.echauffement?.duree||0) + d.situations.reduce((s,x)=>s+(+x.duree||0),0) + (d.bilan?.duree||0);
  if (d.duree && sum !== +d.duree) w.push(`Les blocs totalisent ${sum} min pour une séance annoncée de ${d.duree} min.`);
  d.situations.forEach((x,i)=>{
    if (!Array.isArray(x.phases) || !x.phases.length || x.phases.some(p=>![1,2,3].includes(p))) w.push(`Situation ${i+1} : phases manquantes ou invalides (attendu 1, 2 ou 3).`);
    if (!x.gabarit) w.push(`Situation ${i+1} : gabarit manquant.`);
    if (!Array.isArray(x.consignes) || !x.consignes.length) w.push(`Situation ${i+1} : consignes détaillées manquantes.`);
    if (!Array.isArray(x.verification) || !x.verification.length) w.push(`Situation ${i+1} : vérification spatiale manquante.`);
  });
  if (!d.public) w.push("Le public (grades ou niveaux) n'est pas précisé.");
  return w;
}

/* ---------- render ---------- */
let current = null, currentIsExample = false;
function render(d, isExample){
  current = d; currentIsExample = !!isExample;
  LOOKUP = buildGlossary(d.glossaire); compileRe();
  const sits = d.situations;
  const warm = d.echauffement || {duree:0};
  const bil = d.bilan || {duree:0};
  const blocks = [];
  if (warm.duree) blocks.push({id:"warmup", n:"Échauffement", min:+warm.duree, phases:[], forme:warm.forme||"—"});
  sits.forEach((x,i)=>blocks.push({id:"ex"+(i+1), n:x.titre, min:+x.duree||0, phases:x.phases||[], forme:x.forme || x.gabarit?.formeAttaque || "—"}));
  if (bil.duree) blocks.push({id:"bilan", n:"Bilan", min:+bil.duree, phases:[], forme:"Co-évaluation"});
  const total = blocks.reduce((s,b)=>s+b.min,0) || 1;
  let t = 0; blocks.forEach(b=>{ b.start = t; t += b.min; });
  const byId = Object.fromEntries(blocks.map(b=>[b.id,b]));
  const w = checks(d);

  const tickStep = total <= 30 ? 10 : total <= 60 ? 15 : 30;
  const ticks = []; for (let v=0; v<total; v+=tickStep) ticks.push(v); ticks.push(total);
  const tickHtml = ticks.map(v=>{
    const left = v/total*100; const tf = v===0 ? "none" : v===total ? "translateX(-100%)" : "translateX(-50%)";
    return `<span style="left:${left}%;transform:${tf}">${v}′</span>`;
  }).join("");

  const tpl = g => [
    ["Objectif spécifique",g.objectif],["Forme et attaque",g.formeAttaque],["Technique",g.technique],["Principes",g.principes],
    ["Critère de réalisation",g.critereRealisation],["Critère de réussite",g.critereReussite],["Variantes",g.variantes],["Sécurité",g.securite]
  ];

  const html = `
  <header>
    <span class="eyebrow">Plan de séance</span>
    <h1>${esc(d.theme)}${d.kanji?`<span class="kanji">${esc(d.kanji)}</span>`:""}</h1>
    <div class="meta">
      <span class="chip"><b>Public</b> ${esc(d.public||"—")}</span>
      <span class="chip"><b>Durée</b> ${esc(d.duree||total)} min</span>
      ${d.intitule?`<span class="chip"><b>Thème</b> ${esc(d.intitule)}</span>`:""}
      ${isExample?`<span class="chip example">Exemple</span>`:""}
    </div>
    <div class="goals">
      <div><h3>Objectif général</h3><p>${esc(d.objectifGeneral||"—")}</p></div>
      <div><h3>Observables</h3><ul>${(d.observables||[]).map(o=>`<li>${esc(o)}</li>`).join("")}</ul></div>
    </div>
  </header>
  ${w.length?`<div class="warnings"><b>À vérifier dans cette séance</b>${w.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`:""}

  <section class="structure" aria-labelledby="st">
    <div class="struct-head">
      <h2 id="st">Structure de la séance</h2>
      <div class="legend">${[1,2,3].map(p=>`<span>${icon(p,12)} ${PH[p]}</span>`).join("")}</div>
    </div>
    <div class="timeline">${blocks.map(b=>{
      const bars = b.phases.length ? b.phases.map(p=>`<i style="background:var(--p${p})"></i>`).join("") : `<i style="background:var(--neutral)"></i>`;
      return `<button class="seg" data-go="${b.id}" style="flex:${b.min}" aria-label="${esc(b.n)}, ${b.min} minutes"><span class="t">${b.start}′–${b.start+b.min}′<span class="seg-ic">${b.phases.map(p=>icon(p,11)).join("")}</span></span><span class="n">${esc(b.n)}</span><span class="bars">${bars}</span></button>`;
    }).join("")}</div>
    <div class="ticks">${tickHtml}</div>
    <div class="matrix-wrap">
      <table class="matrix">
        <thead><tr><th>Bloc</th><th>Forme et attaque</th>${[1,2,3].map(p=>`<th class="c">${icon(p,12)} ${p===3?"Proj. / immo.":PH[p]}</th>`).join("")}</tr></thead>
        <tbody>${blocks.map(b=>`<tr class="row" tabindex="0" data-go="${b.id}"><td><b>${esc(b.n)}</b> <span class="flow">${b.min}′</span></td><td>${esc(b.forme)}</td>${[1,2,3].map(p=>`<td class="c">${b.phases.includes(p)?icon(p,15,PH[p]):`<span class="off" aria-label="non">–</span>`}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
    <p class="note">${d.progression?esc(d.progression)+" ":""}Les trois phases suivent le triangle, le cercle et le carré : ▲ entrer et se placer, ● conduire le déséquilibre, ■ projeter ou contrôler. Cliquez sur un bloc pour l'ouvrir.</p>
  </section>

  <div class="band">
    <div id="warmup">
      <span class="eyebrow">0′ → ${warm.duree||0}′</span>
      <h3>Échauffement</h3>
      <p>${esc(warm.texte||"—")}</p>
    </div>
    <div>
      <span class="eyebrow">Sécurité générale</span>
      <h3>Points d'attention</h3>
      <p>${esc(d.securite||"—")}</p>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:24px">${sits.map((x,i)=>{
    const b = byId["ex"+(i+1)]; const g = x.gabarit || {};
    return `<article class="ex" id="ex${i+1}">
      <div class="ex-head">
        <span class="ex-num">${i+1}</span>
        <div class="ex-title"><h2>${esc(x.titre)}</h2><small>${esc(x.technique||"")}</small></div>
        <span class="time">${b.start}′ → ${b.start+b.min}′ · ${b.min} min</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${(x.phases||[]).filter(p=>PH[p]).map(p=>`<span class="phase ph${p}">${icon(p,11)}${PH[p]}</span>`).join("")}</div>
      </div>
      <div class="ex-body">
        <section>
          <span class="eyebrow">Gabarit de situation</span>
          <table class="tpl"><tbody>${tpl(g).map(([k,v])=>`<tr><th>${k}</th><td>${esc(v||"—")}</td></tr>`).join("")}</tbody></table>
        </section>
        <section>
          <span class="eyebrow">Consignes détaillées</span>
          <ol class="steps">${(x.consignes||[]).map(c=>`<li><span><b>${esc(c.titre)}</b> : ${esc(c.texte)}</span></li>`).join("")}</ol>
          <div class="check">
            <span class="eyebrow">Vérification spatiale</span>
            <ul>${(x.verification||[]).map(v=>{ const ok = v.statut==="ok"; return `<li class="${ok?"ok":"warn"}"><span class="ico">${ok?"✓":"⚠"}</span><span>${esc(v.texte)}${ok?"":' <span class="mat">à vérifier sur le tapis</span>'}</span></li>`; }).join("")}</ul>
          </div>
        </section>
      </div>
    </article>`;
  }).join("")}</div>

  <div class="band">
    <div id="bilan">
      <span class="eyebrow">${byId.bilan?`${byId.bilan.start}′ → ${byId.bilan.start+byId.bilan.min}′`:"Fin de séance"}</span>
      <h3>Retour au calme et bilan</h3>
      <p>${esc(bil.texte||"—")}</p>
    </div>
    <div>
      <span class="eyebrow">Pour aller plus loin</span>
      <h3>Justifier ses choix</h3>
      ${d.justifier?.question?`<p><b>« ${esc(d.justifier.question.replace(/^«\s*|\s*»$/g,""))} »</b></p>`:""}
      <p>${esc(d.justifier?.reponse||"—")}</p>
    </div>
  </div>

  <p class="note">Les placements marqués <span class="mat">à vérifier sur le tapis</span> sont restés incertains après l'auto-vérification. Proposition générée, à valider par l'enseignant ou le tuteur.</p>`;

  const root = document.getElementById("lesson");
  root.innerHTML = html;
  wrap(root);
  document.title = `${d.theme} · Carnet de séances`;
  hideTip();
}

/* ---------- navigation ---------- */
function go(id){
  const el = document.getElementById(id);
  if(!el) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block:"start"});
  if(el.classList.contains("ex")){ el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1200); }
}
document.addEventListener("click",e=>{ const g = e.target.closest("[data-go]"); if(g) go(g.dataset.go); });
document.addEventListener("keydown",e=>{
  const g = e.target.closest && e.target.closest("tr[data-go]");
  if(g && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); go(g.dataset.go); }
});

/* ---------- tooltips ---------- */
const tip = document.getElementById("tip");
let tipFor = null;
function showTip(el){
  const g = G[el.dataset.term]; if(!g) return;
  tipFor = el;
  tip.innerHTML = `<span class="k">${esc(g[0])}</span><span class="r">${esc(el.dataset.term)}</span> <span style="opacity:.7">· ${esc(g[1])}</span><p>${esc(g[2])}</p>`;
  tip.hidden = false;
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  let x = Math.min(Math.max(8, r.left + r.width/2 - w/2), innerWidth - w - 8);
  let y = r.top - h - 8; if(y < 8) y = r.bottom + 8;
  tip.style.left = x+"px"; tip.style.top = y+"px";
}
function hideTip(){ tip.hidden = true; tipFor = null; }
document.addEventListener("mouseover",e=>{ const el = e.target.closest(".jp"); if(el) showTip(el); });
document.addEventListener("mouseout",e=>{ if(e.target.closest(".jp")) hideTip(); });
document.addEventListener("focusin",e=>{ const el = e.target.closest(".jp"); if(el) showTip(el); });
document.addEventListener("focusout",e=>{ if(e.target.closest(".jp")) hideTip(); });
document.addEventListener("click",e=>{ const el = e.target.closest(".jp"); if(el){ tipFor===el ? hideTip() : showTip(el); } else if(!e.target.closest("#tip")) hideTip(); });
addEventListener("scroll",hideTip,{passive:true});
document.addEventListener("keydown",e=>{ if(e.key==="Escape") hideTip(); });
