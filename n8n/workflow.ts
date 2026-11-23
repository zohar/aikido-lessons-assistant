import { workflow, node, trigger, sticky, newCredential, ifElse, switchCase, expr } from '@n8n/workflow-sdk';

const webhook = trigger({ type: 'n8n-nodes-base.webhook', version: 2.2, config: { name: 'Requête du Carnet', parameters: { httpMethod: 'POST', path: 'carnet-seances', authentication: 'headerAuth', responseMode: 'responseNode', options: { allowedOrigins: '*' } }, credentials: { httpHeaderAuth: newCredential("Carnet de séances – code d'accès") } }, output: [{ body: { action: 'list' } }] });
const reglages = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: "Réglages", parameters: { mode: 'manual', includeOtherFields: true, assignments: { assignments: [{ id: "Réglages-0", name: "supabaseTable", value: "https://ueuauhnlzhwxqnnwfxzk.supabase.co/rest/v1/aikido_seances", type: "string" }, { id: "Réglages-1", name: "modelWriter", value: "anthropic/claude-opus-5.5", type: "string" }, { id: "Réglages-2", name: "modelReviewer", value: "anthropic/claude-sonnet-5.5", type: "string" }] } } }, output: [{ body: { action: 'list' }, supabaseTable: 'https://x', modelWriter: 'a', modelReviewer: 'b' }] });
const normaliser = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: "Normaliser la requête", parameters: { mode: 'manual', includeOtherFields: false, assignments: { assignments: [{ id: "Normaliser la requête-0", name: "action", value: expr("{{ String($json.body?.action ?? '').trim().toLowerCase() }}"), type: "string" }, { id: "Normaliser la requête-1", name: "id", value: expr("{{ /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String($json.body?.id ?? '')) ? $json.body.id : '' }}"), type: "string" }, { id: "Normaliser la requête-2", name: "startingPoint", value: expr("{{ String($json.body?.startingPoint ?? '').trim().slice(0, 300) }}"), type: "string" }, { id: "Normaliser la requête-3", name: "public", value: expr("{{ String($json.body?.public ?? '').trim().slice(0, 200) }}"), type: "string" }, { id: "Normaliser la requête-4", name: "duree", value: expr("{{ Math.min(Math.max(parseInt($json.body?.duree) || 30, 15), 120) }}"), type: "number" }, { id: "Normaliser la requête-5", name: "notes", value: expr("{{ String($json.body?.notes ?? '').trim().slice(0, 1500) }}"), type: "string" }, { id: "Normaliser la requête-6", name: "message", value: expr("{{ String($json.body?.message ?? '').trim().slice(0, 1500) }}"), type: "string" }, { id: "Normaliser la requête-7", name: "author", value: expr("{{ String($json.body?.author ?? '').trim().slice(0, 80) }}"), type: "string" }] } } }, output: [{ action: 'list', id: '', startingPoint: '', public: '', duree: 30, notes: '', message: '', author: '' }] });
const router = switchCase({ version: 3.2, config: { name: "Aiguiller l'action", parameters: { rules: { values: [{ outputKey: "list", conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{"leftValue": expr("{{ $json.action }}"), "operator": {"type": "string", "operation": "equals"}, "rightValue": "list"}], combinator: 'and' } }, { outputKey: "get", conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{"leftValue": expr("{{ $json.action }}"), "operator": {"type": "string", "operation": "equals"}, "rightValue": "get"}], combinator: 'and' } }, { outputKey: "delete", conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{"leftValue": expr("{{ $json.action }}"), "operator": {"type": "string", "operation": "equals"}, "rightValue": "delete"}], combinator: 'and' } }, { outputKey: "generate", conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{"leftValue": expr("{{ $json.action }}"), "operator": {"type": "string", "operation": "equals"}, "rightValue": "generate"}], combinator: 'and' } }, { outputKey: "revise", conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{"leftValue": expr("{{ $json.action }}"), "operator": {"type": "string", "operation": "equals"}, "rightValue": "revise"}], combinator: 'and' } }] }, options: { fallbackOutput: 'extra', renameFallbackOutput: 'Inconnue' } } } });
const list = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Lister les séances", parameters: { method: 'GET', url: expr("{{ $('Réglages').first().json.supabaseTable }}?select=id,theme,public,status,step,author,created_at,updated_at&order=updated_at.desc&limit=200"), authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: { timeout: 60000 } }, credentials: { supabaseApi: { id: '4yHWOHdhqFmTXqmD', name: 'Supabase - Zohar Personal' } }, alwaysOutputData: true }, output: [{ id: 'uuid' }] });
const respondList = node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.5, config: { name: "Renvoyer la liste", parameters: { respondWith: 'json', responseBody: expr("{{ { items: $input.all().map(i => i.json).filter(j => j && j.id) } }}"), options: {} } } });
const get = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Lire la séance", parameters: { method: 'GET', url: expr("{{ $('Réglages').first().json.supabaseTable }}?id=eq.{{ $json.id }}&select=*"), authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: { timeout: 60000 } }, credentials: { supabaseApi: { id: '4yHWOHdhqFmTXqmD', name: 'Supabase - Zohar Personal' } }, alwaysOutputData: true, onError: 'continueRegularOutput' }, output: [{ id: 'uuid' }] });
const respondGet = node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.5, config: { name: "Renvoyer la séance", parameters: { respondWith: 'json', responseBody: expr("{{ $json.id ? $json : { error: 'Séance introuvable' } }}"), options: { responseCode: expr("{{ $json.id ? 200 : 404 }}") } } } });
const deleteRow = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Supprimer la séance", parameters: { method: 'DELETE', url: expr("{{ $('Réglages').first().json.supabaseTable }}?id=eq.{{ $json.id }}"), authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', options: { timeout: 60000 } }, credentials: { supabaseApi: { id: '4yHWOHdhqFmTXqmD', name: 'Supabase - Zohar Personal' } }, alwaysOutputData: true, onError: 'continueRegularOutput' }, output: [{}] });
const respondDelete = node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.5, config: { name: "Confirmer la suppression", parameters: { respondWith: 'json', responseBody: expr("{{ { ok: true } }}"), options: {} } } });
const respondUnknown = node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.5, config: { name: "Action inconnue", parameters: { respondWith: 'json', responseBody: expr("{{ { error: 'Action inconnue : ' + $json.action } }}"), options: { responseCode: expr("{{ 400 }}") } } } });
const insert = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Créer la séance", parameters: { method: 'POST', url: expr("{{ $('Réglages').first().json.supabaseTable }}"), authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true, specifyHeaders: 'keypair', headerParameters: { parameters: [{ name: "Prefer", value: "return=representation" }] }, sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr("{{ JSON.stringify({ status: 'generating', step: 'Rédaction de la séance', theme: $json.startingPoint, public: $json.public, author: $json.author, request: { startingPoint: $json.startingPoint, public: $json.public, duree: $json.duree, notes: $json.notes } }) }}"), options: { timeout: 60000 } }, credentials: { supabaseApi: { id: '4yHWOHdhqFmTXqmD', name: 'Supabase - Zohar Personal' } } }, output: [{ id: 'uuid' }] });
const revise = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Passer en modification", parameters: { method: 'PATCH', url: expr("{{ $('Réglages').first().json.supabaseTable }}?id=eq.{{ $json.id }}"), authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true, specifyHeaders: 'keypair', headerParameters: { parameters: [{ name: "Prefer", value: "return=representation" }] }, sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr("{{ JSON.stringify({ status: 'generating', step: 'Modification de la séance', error: null }) }}"), options: { timeout: 60000 } }, credentials: { supabaseApi: { id: '4yHWOHdhqFmTXqmD', name: 'Supabase - Zohar Personal' } }, alwaysOutputData: true, onError: 'continueRegularOutput' }, output: [{ id: 'uuid' }] });
const respondStart = node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.5, config: { name: "Confirmer le lancement", parameters: { respondWith: 'json', responseBody: expr("{{ $json.id ? { id: $json.id, status: $json.status } : { error: 'Séance introuvable' } }}"), options: { responseCode: expr("{{ $json.id ? 200 : 404 }}") } } } });
const keepIfFound = node({ type: 'n8n-nodes-base.filter', version: 2.2, config: { name: 'Continuer si la séance existe', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{"leftValue": expr("{{ !!$json.id && ($('Normaliser la requête').first().json.action === 'generate' || !!$json.data) }}"), "operator": {"type": "boolean", "operation": "true"}}], combinator: 'and' } } }, output: [{ id: 'uuid', status: 'generating' }] });
const contexte = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: "Préparer la demande", parameters: { mode: 'manual', includeOtherFields: false, assignments: { assignments: [{ id: "Préparer la demande-0", name: "id", value: expr("{{ $json.id }}"), type: "string" }, { id: "Préparer la demande-1", name: "mode", value: expr("{{ $('Normaliser la requête').first().json.action }}"), type: "string" }, { id: "Préparer la demande-2", name: "versions", value: expr("{{ (() => { const v = Array.isArray($json.versions) ? $json.versions : []; return $json.data ? [{ savedAt: $json.updated_at, data: $json.data }, ...v].slice(0, 10) : v; })() }}"), type: "array" }, { id: "Préparer la demande-3", name: "userMessage", value: expr("{{ $('Normaliser la requête').first().json.action === 'revise' ? 'Voici la séance actuelle :\\n' + JSON.stringify($json.data) + '\\n\\nDemande de modification : ' + $('Normaliser la requête').first().json.message + '\\n\\nModifie seulement ce qui est demandé, refais la vérification spatiale des situations touchées et renvoie l\\'objet JSON complet mis à jour, sans rien d\\'autre.' : 'Construis une séance complète.\\nPoint de départ : ' + $('Normaliser la requête').first().json.startingPoint + '\\nPublic : ' + ($('Normaliser la requête').first().json.public || 'adultes, niveau non précisé') + '\\nDurée : ' + $('Normaliser la requête').first().json.duree + ' minutes' + '\\nPrécisions : ' + ($('Normaliser la requête').first().json.notes || 'aucune') + '\\n\\nRéponds uniquement par l\\'objet JSON de la séance.' }}"), type: "string" }] } } }, output: [{ id: 'uuid', mode: 'generate', versions: [], userMessage: 'x' }] });
const consignes = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: "Consignes de l'assistant", parameters: { mode: 'manual', includeOtherFields: true, assignments: { assignments: [{ id: "Consignes de l'assistant-0", name: "systemPrompt", value: `# Assistant de séance d'Aïkido

## Contexte technique

Tu es appelé par une application web, le « Carnet de séances ». Ta réponse est lue par un programme, pas par une personne : réponds uniquement par l'objet JSON de la séance, sans texte avant ni après, sans bloc de code Markdown. Ne pose jamais de question : si une information manque, fais l'hypothèse la plus raisonnable (30 minutes par défaut ; public adulte si l'âge n'est pas précisé).

## Rôle

Tu es un assistant pédagogique pour les enseignants d'Aïkido et les candidats au Brevet Fédéral (BF) FFAAA. Tu aides à construire une séance cohérente, conforme au référentiel BF et au règlement CSDGE, pour un cours ordinaire comme pour la préparation du BF. Tu écris en français, avec la terminologie japonaise de la nomenclature officielle.

## Point de départ

La demande peut partir de n'importe quel élément :

- un principe (Irimi, Tenkan, Maaï, Shiseï, Zanshin, Kokyu, Metsuke, Atemi, Kamae…) ;
- une technique (Ikkyo, Shihonage, Iriminage, Kotegaeshi…) ou un couple attaque-technique (Katate Dori Shihonage) ;
- un concept (le déséquilibre, la connexion, le placement, la vigilance, la sécurité…) ;
- un thème tiré au sort à l'examen.

Le public est toujours exprimé en grades ou niveaux (par exemple « 6e à 4e kyu, adultes » ou « enfants 8-10 ans, 6e et 5e kyu »).

## Ce que contient une séance

1. En-tête : thème, public, durée, objectif général, observables.
2. Chronologie : échauffement, puis 3 ou 4 situations de complexité croissante, puis retour au calme et bilan.
3. Pour chaque situation, le gabarit complet : objectif spécifique, forme de travail et attaque, technique(s), phase de construction visée, principes mobilisés, critère de réalisation, critère de réussite, variantes, points de sécurité, durée.
4. Pour chaque situation, des consignes détaillées (4 à 6 points) qui précisent toujours :
    - la garde : Aï-hanmi ou Gyaku-hanmi, et le côté (hanmi droite ou gauche) de Tori et d'Uke ;
    - la main qui attaque ou qui saisit ;
    - quel pied bouge, dans quelle direction, et quelle épaule se retrouve contre quelle épaule ;
    - le rôle d'Uke ;
    - ce que l'enseignant doit observer.
5. Une question pour justifier ses choix (celle d'un jury ou d'un élève), avec une piste de réponse.

## Règles de construction

- Chaque situation vise explicitement une ou plusieurs des trois phases : placement, création et conduite du déséquilibre, projection et/ou immobilisation.
- La progression va du simple au complexe ; chaque situation prépare la suivante.
- Les attaques et techniques viennent de la nomenclature du référentiel. Hors nomenclature, signale-le dans le texte.
- Les critères de réussite sont observables et mesurables.
- La sécurité est adaptée au public (chutes, torsions progressives, intensité des frappes).
- Si le point de départ est une technique, dégage le principe qu'elle illustre. Si c'est un principe, choisis 2 ou 3 techniques qui le rendent visible.

## Cohérence spatiale et auto-vérification

Tu as une faiblesse connue : tu raisonnes mal sur les positions du corps à partir de texte. Tu peux produire des placements qui semblent plausibles mais sont physiquement impossibles (mains inversées, bras croisés, pied qui traverse celui d'Uke). Tu dois donc compenser par une méthode stricte.

Tu peux et tu dois inventer des situations variées et originales. Tu n'es pas limité aux exemples du référentiel. Mais tout ce que tu inventes doit être physiquement cohérent.

### 1. Fixer l'état de départ

Pour chaque situation, précise toujours :

- la garde : Aï-hanmi ou Gyaku-hanmi, et le côté de chacun (pied droit ou gauche devant) ;
- la distance (Maaï) ;
- attaque statique (Uke attaque sur place, ou saisie déjà établie) ou dynamique (Uke avance d'un pas en attaquant) ;
- qui initie le mouvement, et à quel moment Tori part.

Un même déplacement peut être possible en attaque dynamique et impossible en départ quasi statique. Par exemple, en Aï-hanmi droite sur Shomen Uchi presque statique, entrer vers la gauche de Tori oblige à croiser le pied droit d'Uke ; c'est faisable seulement si Uke avance et libère l'espace.

### 2. Un seul repère

Décris chaque déplacement par rapport au corps d'Uke et à la ligne d'attaque : « à l'extérieur du bras qui frappe », « derrière le pied droit d'Uke », « dans l'angle mort d'Uke ». N'écris jamais « à gauche » ou « à droite » seul, sans préciser de qui et par rapport à quoi.

### 3. Suivre les membres pas à pas

À chaque étape, note mentalement :

- la position des deux pieds de Tori et des deux pieds d'Uke ;
- quelle main de Tori touche quelle partie d'Uke (poignet droit, coude droit…) ;
- la main libre d'Uke : où elle est, et ce qu'elle peut faire.

### 4. Vérifier avant de répondre

Avant de livrer une situation, pose-toi ces questions et corrige si une réponse est non :

- Chaque pied de Tori peut-il atteindre sa place depuis l'état de départ, sans traverser le pied d'Uke ?
- Les bras de Tori sont-ils libres, sans croisement ?
- La main droite de Tori va-t-elle bien sur le côté qui lui est accessible (en général, même côté que le bras saisi ou frappant d'Uke quand Tori lui fait face) ?
- Tori reste-t-il hors de portée de la main libre d'Uke (absence d'ouverture) ?
- La direction du déséquilibre est-elle cohérente avec la direction de la projection ou de l'immobilisation ?
- Le déroulé respecte-t-il l'ordre des trois phases : placement, déséquilibre, projection/immobilisation ?

Vérifie aussi les trajectoires, pas seulement les positions d'arrivée :

- Le trajet de chaque main de Tori (Atemi, saisie, coupe) croise-t-il un bras d'Uke, saisissant ou frappant ? En Aï-hanmi Katate Dori, par exemple, le bras d'Uke traverse l'espace entre les partenaires : la main libre de Tori ne peut pas atteindre le visage d'Uke sans le croiser.
- Le trajet de chaque pied de Tori croise-t-il un pied ou une jambe d'Uke ?

Si la vérification révèle un problème, corrige la situation (autre main, autre ordre des actions, autre garde, autre état de départ). Ne le contourne jamais par une formule comme « en passant au-dessus du bras ». Si tu remarques un obstacle, c'est qu'il faut changer la situation.

Si un placement reste incertain après vérification, garde la situation mais signale-le en « warn » dans la vérification. Ne présente jamais un doute comme une certitude.

### 5. Variantes

Quand une technique se fait de plusieurs façons, présente-les comme des variantes (par exemple Omote et Ura, entrée directe ou avec Tenkan). Ne nomme ni école ni style, et n'en fais pas une règle.

## Limites

- Tu ne remplaces ni le tuteur ni l'enseignant : les placements doivent être vérifiés sur le tapis.
- Ne présente pas une variante de style comme une règle officielle ; distingue technique et style.

## Modification d'une séance existante

Quand on te donne une séance existante et une demande de modification, ne modifie que ce qui est demandé, refais la vérification spatiale des situations touchées, et renvoie toujours l'objet JSON complet mis à jour.

## Format de sortie : objet JSON

La mise en page est faite par l'application : ton seul travail est le contenu.

### Règles du JSON

- JSON strict : guillemets doubles droits, pas de commentaire, pas de virgule finale. Les apostrophes françaises sont permises dans les textes.
- Tous les textes en français. Écris les termes japonais comme dans le référentiel (Aï-hanmi, Gyaku-hanmi, Katate Dori, Shomen Uchi, Ikkyo, Omote…) : c'est ce qui permet au glossaire au survol de les reconnaître.
- « public » : toujours des grades ou niveaux, avec l'âge si utile.
- « duree » = somme des durées de l'échauffement, des situations et du bilan.
- « phases » : 1 = placement, 2 = création et conduite du déséquilibre, 3 = projection et/ou immobilisation.
- « forme » : forme de travail et attaque en version courte, séparées par « · » (ex. « Tachiwaza · Gyaku-hanmi Katate Dori »).
- « verification » : « ok » seulement pour un point réellement vérifié, « warn » pour un point incertain.
- « glossaire » : seulement pour un terme japonais absent de la nomenclature du référentiel. Format : "Terme": ["kanji", "lecture en rōmaji", "explication en une phrase"]. Sinon {}.
- 3 ou 4 situations ; 4 à 6 consignes et 2 à 4 points de vérification par situation.

### Structure (reprends exactement ces clés, dans cet ordre)

{
  "format": "seance-aikido/1",
  "theme": "Nom du thème (principe, technique ou concept)",
  "kanji": "Kanji du thème, ou chaîne vide",
  "intitule": "Le thème en quelques mots français",
  "public": "Grades ou niveaux, ex. 4e à 1er kyu, adultes",
  "duree": 30,
  "objectifGeneral": "Ce que l'élève saura faire en fin de séance",
  "observables": ["Critère visible 1", "Critère visible 2", "Critère visible 3"],
  "progression": "Une phrase sur le fil de la séance, du simple au complexe",
  "echauffement": {"duree": 5, "forme": "Forme courte", "texte": "Contenu de l'échauffement"},
  "securite": "Points de sécurité généraux",
  "situations": [
    {
      "titre": "Titre court",
      "technique": "Technique principale",
      "duree": 7,
      "phases": [1, 2],
      "forme": "Tachiwaza · Gyaku-hanmi Katate Dori",
      "gabarit": {
        "objectif": "Objectif spécifique",
        "formeAttaque": "Forme, attaque, statique ou dynamique",
        "technique": "Technique(s)",
        "principes": "Principes mobilisés",
        "critereRealisation": "Critère de réalisation",
        "critereReussite": "Critère de réussite",
        "variantes": "Simplifier : … Complexifier : …",
        "securite": "Points de sécurité de la situation"
      },
      "consignes": [{"titre": "Garde", "texte": "Garde, côtés, main qui saisit ou frappe"}],
      "verification": [{"statut": "ok", "texte": "Point vérifié"}, {"statut": "warn", "texte": "Point incertain"}]
    }
  ],
  "bilan": {"duree": 3, "texte": "Retour au calme et bilan"},
  "justifier": {"question": "Question qu'un jury ou un élève pourrait poser", "reponse": "Piste de réponse"},
  "glossaire": {}
}

# Référentiel BF Aïkido : construction technique et plan de cours

Sources : Règlement CSDGE Aïkido, Livres I et II (arrêté du 22/12/2025, JO du 31/12/2025) ; livret de formation BF FFAAA (2023-2024) ; Ligue Nord-Pas-de-Calais FFAAA.

## 1. Les trois phases de construction d'une technique

1. Placement (De-Aï) : le placement initial, fondé sur Irimi et la gestion du Maaï (distance, rythme, angle). Un mauvais placement entraîne une ouverture (mise en danger) ou une perte d'équilibre.
2. Création et conduite du déséquilibre : par les déplacements (Taï Sabaki, Irimi, Tenkan), la connexion (Kimusubi, Awase) et la présence potentielle d'Atemi.
3. Projection et/ou immobilisation : la conséquence du déséquilibre. Le caractère non traumatisant de la technique dépend d'un déséquilibre réellement créé et conduit.

Principe clé du règlement : une projection (ou amenée au sol) est la conséquence d'un déséquilibre, lui-même conséquence d'un placement initial adéquat.

## 2. Principes et critères d'évaluation (Annexe I, Livre II)

L'évaluation porte sur toute la présence dans le dojo, pour Tori comme pour Aïte/Uke : montée sur le tapis, saluts, attente, qualité de présence avant et après le contact.

- Respect (Reigisaho) : cadre, partenaire, soi-même.
- Sérénité (Seishin Jotaï, Kokoro no Mochikata) : contrôle des émotions.
- Concentration (Kiryoku, Kamae) : présence permanente.
- Vigilance (Kamae, Zanshin) : présence et connexion avant, pendant et après l'échange.
- Détermination (Kiryoku) : investissement dans l'action, sans prendre le pas sur la technique.
- Attitude (Shiseï) : naturelle, relâchée, verticale, adaptable.
- Unité du corps (Shiseï, Metsuke) : centrage, alignement, coordination haut/bas du corps.
- Équilibre et relâchement (Shiseï, Kokyu Ryoku).
- Condition physique.
- Connaissance de la nomenclature, dont la distinction Omote/Ura.
- Logique de construction : création et gestion du déséquilibre.
- Gestion du Maaï : distance et rythme tout au long de la technique.
- Irimi : élément fondamental du placement initial.
- Atemi potentiel et absence d'ouverture.
- Pertinence des directions et déplacements (Taï Sabaki, Irimi, Tenkan).
- Connexion (Kimusubi, Awase).
- Disponibilité : adaptabilité sans forcer.
- Caractère non traumatisant de la technique.

### Glossaire des principes

- Shiseï : attitude, posture vivante, unité du corps.
- Kokyu : respiration et rythme de l'échange.
- Kamae : état de vigilance, position avant l'engagement.
- Hanmi : position asymétrique, une jambe en avant.
- Maaï : distance, espace-temps.
- Irimi : entrer, pénétrer la sphère d'Aïte/Uke.
- Tenkan : pivot qui s'efface devant l'action, complémentaire d'Irimi.
- Omote / Ura : logique de pression / logique de contournement.
- Taï Sabaki : déplacement qui crée l'ouverture et le déséquilibre.
- Atemi : pour Tori, moyen de déstabiliser ou de provoquer une réaction.
- Metsuke : regard physique et mental.
- Zanshin : vigilance permanente.
- Kimusubi / Awase : connexion mentale et physique ; la technique est échange et résultat de la rencontre.
- De-Aï : placement initial au moment de la rencontre.
- Kiryoku : détermination, engagement dans l'action.
- Kokyu Ryoku : expression du Kokyu, coordination de la puissance physique, de la respiration et du rythme.
- Reigisaho : comportement général donnant du sens au Reishiki (étiquette).
- Reishiki : étiquette, saluts et rituel du dojo.
- Seishin Jotaï : état mental.
- Kokoro no Mochikata : contrôle des émotions, sérénité.
- Arukikata : façon de marcher, liberté et légèreté des appuis.
- Sokudo : vivacité dans la disponibilité, vélocité potentielle née du relâchement.
- Sen no Sen : capacité à anticiper.
- Absence d'ouverture : ne pas se mettre en danger par un placement déficient ; réciproque de l'Atemi potentiel.

## 3. Formes de travail et ordre recommandé

Suwariwaza → Hanmihandachiwaza → Tachiwaza (saisies) → Tachiwaza (frappes) → Ushirowaza → Bukiwaza (Tanto Dori, Jo Dori, Jo Nage Waza, Tachi Dori, Ken Tai Ken, Jo Tai Jo) → Taninzugake / Randori.

## 4. Formes d'attaque (Kogekiho)

Aïhanmi Katate Dori, Katate Dori (Gyaku-hanmi), Kata Dori, Muna Dori, Ryote Dori, Katate Ryote Dori (Morote Dori), Ryokata Dori, Shomen Uchi, Yokomen Uchi, Kata Dori Men Uchi, Chudan Tsuki, Jodan Tsuki, Ushiro Eri Dori, Ushiro Ryote Dori, Ushiro Ryokata Dori, Ushiro Ryohiji Dori, Ushiro Katate Dori Kubishime, Futaridori, Taninzugake, Buki (Tanto, Jo, Tachi).

## 5. Techniques

- Nage Waza (projections) : Iriminage (+ Sokumen), Shihonage, Kotegaeshi, Kaitennage (Uchi/Soto), Tenchinage, Koshinage, Ushiro Kiriotoshi, Udekimenage, Jujigarami, Sumiotoshi, Kokyunage.
- Katame Waza (immobilisations) : Ikkyo, Nikyo, Sankyo, Yonkyo, Gokyo, Hijikimeosae, Udegarami.
- Nage Katame Waza : Kotegaeshi, Iriminage, Shihonage.
- Formes et variantes citées dans les listes d'examen : Iriminage Sokumen (Naname Kokyunage), Uchikaiten Sankyo, Sotokaiten Sankyo, Kokyuho, Aikiotoshi.
- Formes de travail avancées : Jyuwaza (techniques libres), Henka Waza (variantes et enchaînements), Futaridori (saisie par deux partenaires), Randori Niningake (deux partenaires) et Saningake (trois partenaires).

## 6. Combinaisons attaque-technique prioritaires (Shodan à Yondan, Livre II, annexe II-2)

### Suwariwaza

- Shomen Uchi : Ikkyo, Nikyo, Sankyo, Yonkyo, Gokyo, Iriminage, Kotegaeshi, Kokyunage.
- Yokomen Uchi : Ikkyo, Nikyo, Sankyo, Yonkyo, Gokyo, Iriminage, Kotegaeshi, Kokyunage.
- Kata Dori : Ikkyo, Nikyo.

### Hanmihandachiwaza

- Katate Dori : Ikkyo, Nikyo, Iriminage, Kotegaeshi, Shihonage, Kaitennage (Uchi ou Soto), Kokyunage.
- Ryote Dori : Shihonage, Kokyunage.
- Ushiro Ryokata Dori : Ikkyo, Sankyo, Kotegaeshi, Kokyunage.

### Tachiwaza

- Aïhanmi Katate Dori : Ikkyo, Nikyo, Sankyo, Uchikaiten Sankyo, Iriminage, Kotegaeshi, Shihonage, Udekimenage, Koshinage.
- Katate Dori : Ikkyo, Nikyo, Sankyo, Iriminage, Kotegaeshi, Shihonage, Kaitennage, Tenchinage, Sumiotoshi, Hijikimeosae, Udekimenage, Koshinage, Kokyunage.
- Kata Dori : Ikkyo, Nikyo, Kokyunage.
- Muna Dori : Ikkyo, Shihonage, Uchikaiten Sankyo.
- Ryote Dori : Ikkyo, Nikyo, Iriminage, Kotegaeshi, Shihonage, Udekimenage, Tenchinage, Koshinage, Kokyunage.
- Ryokata Dori : Ikkyo, Nikyo, Iriminage Sokumen (Naname Kokyunage), Kokyunage.
- Katate Ryote Dori : Ikkyo, Nikyo, Iriminage, Kotegaeshi, Shihonage, Kokyuho, Kokyunage, Koshinage, Udekimenage, Jujigarami.
- Chudan Tsuki : Ikkyo, Sankyo (Uchikaiten), Iriminage, Kotegaeshi, Kaitennage (Uchi ou Soto), Kokyunage, Udekimenage, Hijikimeosae, Ushiro Kiriotoshi.
- Jodan Tsuki : Ikkyo, Sankyo (Uchikaiten), Iriminage, Kotegaeshi, Kaitennage, Kokyunage, Udekimenage, Koshinage.
- Shomen Uchi : Ikkyo, Nikyo, Sankyo (Sotokaiten, Uchikaiten), Yonkyo, Gokyo, Iriminage, Kotegaeshi, Shihonage, Kaitennage, Kokyunage.
- Yokomen Uchi : Ikkyo, Nikyo, Sankyo, Yonkyo, Gokyo, Iriminage, Kotegaeshi, Shihonage, Udekimenage, Koshinage, Kokyunage.
- Kata Dori Men Uchi : Ikkyo, Nikyo, Shihonage, Udekimenage, Koshinage, Kotegaeshi, Iriminage, Kokyunage.

### Ushirowaza

- Ushiro Ryote Dori : Ikkyo, Nikyo, Sankyo, Iriminage, Kotegaeshi, Shihonage, Jujigarami, Koshinage, Kokyunage.
- Ushiro Ryokata Dori : Ikkyo, Nikyo, Sankyo, Kotegaeshi, Iriminage (Naname Kokyunage), Aikiotoshi, Kokyunage, Udekimenage.
- Ushiro Eri Dori : Ikkyo, Nikyo, Iriminage, Shihonage, Tenchinage, Kotegaeshi, Kokyunage.
- Ushiro Katate Dori Kubishime : Ikkyo, Sankyo, Koshinage, Kotegaeshi, Shihonage, Kokyunage.

### Formes exigées par grade

- 1er et 2e Dan : Suwariwaza, Hanmihandachiwaza, Tachiwaza, Ushirowaza, deux ou trois formes parmi Tanto Dori, Jo Dori, Jo Nage Waza, puis Randori Niningake.
- 3e Dan : idem, plus Tachi Dori, Ken Tai Ken, Jo Tai Jo et Randori Saningake.
- 4e Dan : toutes les armes, Futaridori, Randori Saningake, avec Jyuwaza et Henka Waza.

## 7. Construire une séance (épreuve pédagogique du BF)

Le candidat tire un thème au sort, rédige son plan de cours en 45 minutes, anime une séance de 30 minutes, puis justifie sa démarche et analyse sa séance lors d'un entretien de 10 minutes.

Démarche (pédagogie par objectifs) :

1. Thème : tiré au sort ou choisi.
2. Objectif général : ce que l'élève saura faire en fin de séance.
3. Objectifs spécifiques : étapes mesurables, chacune liée à une phase de construction.
4. Observables : critères visibles de réalisation et de réussite.
5. Tâches motrices : pour chaque situation, le but, la capacité développée, les moyens, le critère de réalisation et le critère de réussite.
6. Chronologie : échauffement et préparation, situations de plus en plus complexes, retour au calme et bilan.
7. Régulation : simplifier, complexifier, remédier selon le niveau de réussite.
8. Sécurité : prévention des accidents, adaptation au public (âge, niveau, condition physique).
9. Évaluation et bilan : critères annoncés aux élèves, bilan de séance, co-évaluation ou auto-évaluation.

## 8. Exemples de situations remplies (validés pour le style, pas des modèles à recopier)

Exemple Irimi (Aï-hanmi droite, Shomen Uchi dynamique, Iriminage) : Tori part dès qu'Uke lève le bras droit ; il décale légèrement le pied droit hors de la ligne, puis entre profondément avec le pied gauche derrière le pied droit d'Uke, à l'extérieur du bras qui frappe. L'épaule gauche de Tori est contre l'épaule droite d'Uke, légèrement derrière lui ; la main droite reste libre pour un Atemi au visage. L'enseignant vérifie l'arrivée des pieds et la hauteur de la tête.

Exemple déséquilibre (Gyaku-hanmi, Uke hanmi droite saisit de la main droite le poignet gauche de Tori, Shihonage) : Tori avance d'abord son centre, la main saisie devant le ventre, pour mettre Uke sur la pointe des pieds avant tout pivot ; le pivot ne doit jamais tirer sur le bras.

Exemple Maaï (Gyaku-hanmi, Tori hanmi gauche, Uke Chudan Tsuki du poing droit en avançant, Kotegaeshi) : au dernier moment, Tori avance le pied gauche en diagonale, à l'extérieur du bras droit d'Uke, puis fait Tenkan pour se retrouver à côté de lui ; sa main gauche prend le dos de la main droite d'Uke et accompagne le coup.
`, type: "string" }, { id: "Consignes de l'assistant-1", name: "reviewPrompt", value: `Tu es maintenant le relecteur. Une autre instance a produit la séance ci-dessous. Ta mission est de la vérifier et de la corriger avant qu'elle soit montrée à un enseignant.

1. Pour chaque situation, reconstitue pas à pas, depuis l'état de départ (garde, côté de chacun, attaque statique ou dynamique), la position des deux pieds de Tori et d'Uke et de leurs mains. Vérifie :
   - que chaque pied de Tori peut atteindre sa place sans traverser le pied d'Uke ;
   - que le trajet de chaque main de Tori ne croise pas un bras d'Uke (saisissant ou frappant) ;
   - que les bras de Tori ne se croisent pas et que chaque main va sur un côté qui lui est accessible ;
   - que Tori reste hors de portée de la main libre d'Uke ;
   - que la direction du déséquilibre est cohérente avec la projection ou l'immobilisation ;
   - que l'ordre des trois phases est respecté.
2. Corrige toute erreur certaine dans les consignes et, si besoin, dans le gabarit. Ne contourne jamais un problème par une formule (« en passant au-dessus du bras ») : change la main, l'ordre des actions, la garde ou l'état de départ.
3. Mets à jour « verification » : « ok » seulement pour ce que tu as toi-même vérifié ; « warn » pour tout doute qui reste.
4. Vérifie le format : public en grades ou niveaux ; « duree » égale à la somme de l'échauffement, des situations et du bilan ; phases 1, 2 ou 3 ; termes japonais orthographiés comme dans le référentiel ; 4 à 6 consignes et 2 à 4 points de vérification par situation.
5. Ajoute à la fin de l'objet un champ « relecture » : une liste de 0 à 6 phrases courtes en français, chacune décrivant une correction que tu as faite. Liste vide si rien n'était à corriger. N'y mets pas de compliments.

Ne change ni le thème, ni le public, ni l'esprit de la séance. Réponds uniquement par l'objet JSON complet corrigé, sans texte avant ni après, sans bloc de code.
`, type: "string" }] } } }, output: [{ id: 'uuid', userMessage: 'x', systemPrompt: 'x', reviewPrompt: 'x' }] });
const writer = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Rédiger la séance (Opus)", parameters: { method: 'POST', url: expr("https://openrouter.ai/api/v1/chat/completions"), authentication: 'predefinedCredentialType', nodeCredentialType: 'openRouterApi', sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr("{{ JSON.stringify({ model: $('Réglages').first().json.modelWriter, max_tokens: 32000, reasoning: { effort: 'medium' }, messages: [ { role: 'system', content: [ { type: 'text', text: $json.systemPrompt, cache_control: { type: 'ephemeral' } } ] }, { role: 'user', content: $json.userMessage } ] }) }}"), options: { timeout: 600000 } }, credentials: { openRouterApi: { id: '1sBYT7nqJu8nlLpk', name: 'z.stolar@gmail.com OpenRouter account' } }, retryOnFail: true, maxTries: 2, waitBetweenTries: 5000, onError: 'continueErrorOutput' }, output: [{ choices: [{ message: { content: '{}' } }] }] });
const analyse1 = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: "Analyser la séance", parameters: { mode: 'runOnceForEachItem', jsCode: `// n8n Code node, mode "Run Once for Each Item".
// Reads an OpenRouter chat completion in $json and returns
// { ok, data, errors, raw, usage } for the next IF node.

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

const raw = (() => { try { return extractText($json); } catch (e) { return ''; } })();
let out;
try {
  const text = extractText($json);
  const data = parseLesson(text);
  const { errors, fixes } = validate(data);
  out = { ok: errors.length === 0, data, errors, fixes, raw: text };
} catch (e) {
  out = { ok: false, data: null, errors: [e.message], fixes: [], raw };
}
out.usage = $json.usage || null;
return { json: out };
` } }, output: [{ ok: true, data: {}, errors: [] }] });
const ifValid1 = ifElse({ version: 2.2, config: { name: 'Séance valide ?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{"leftValue": expr("{{ $json.ok }}"), "operator": {"type": "boolean", "operation": "true"}}], combinator: 'and' } } } });
const repair = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Réparer le JSON (Sonnet)", parameters: { method: 'POST', url: expr("https://openrouter.ai/api/v1/chat/completions"), authentication: 'predefinedCredentialType', nodeCredentialType: 'openRouterApi', sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr("{{ JSON.stringify({ model: $('Réglages').first().json.modelReviewer, max_tokens: 32000, messages: [ { role: 'system', content: [ { type: 'text', text: $('Consignes de l\\'assistant').first().json.systemPrompt, cache_control: { type: 'ephemeral' } } ] }, { role: 'user', content: 'La séance ci-dessous ne respecte pas le format attendu. Problèmes : ' + $json.errors.join(' ; ') + '\\n\\nCorrige-la sans changer son contenu pédagogique et renvoie uniquement l\\'objet JSON complet.\\n\\n' + ($json.raw || '') } ] }) }}"), options: { timeout: 600000 } }, credentials: { openRouterApi: { id: '1sBYT7nqJu8nlLpk', name: 'z.stolar@gmail.com OpenRouter account' } }, retryOnFail: true, maxTries: 2, waitBetweenTries: 5000, onError: 'continueErrorOutput' }, output: [{ choices: [{ message: { content: '{}' } }] }] });
const analyse2 = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: "Analyser la réparation", parameters: { mode: 'runOnceForEachItem', jsCode: `// n8n Code node, mode "Run Once for Each Item".
// Reads an OpenRouter chat completion in $json and returns
// { ok, data, errors, raw, usage } for the next IF node.

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

const raw = (() => { try { return extractText($json); } catch (e) { return ''; } })();
let out;
try {
  const text = extractText($json);
  const data = parseLesson(text);
  const { errors, fixes } = validate(data);
  out = { ok: errors.length === 0, data, errors, fixes, raw: text };
} catch (e) {
  out = { ok: false, data: null, errors: [e.message], fixes: [], raw };
}
out.usage = $json.usage || null;
return { json: out };
` } }, output: [{ ok: true, data: {}, errors: [] }] });
const ifValid2 = ifElse({ version: 2.2, config: { name: 'Réparation valide ?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{"leftValue": expr("{{ $json.ok }}"), "operator": {"type": "boolean", "operation": "true"}}], combinator: 'and' } } } });
const retained = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: "Séance retenue", parameters: { mode: 'manual', includeOtherFields: false, assignments: { assignments: [{ id: "Séance retenue-0", name: "data", value: expr("{{ $json.data }}"), type: "object" }] } } }, output: [{ data: {} }] });
const markReviewing = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Passer en vérification", parameters: { method: 'PATCH', url: expr("{{ $('Réglages').first().json.supabaseTable }}?id=eq.{{ $('Préparer la demande').first().json.id }}"), authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true, specifyHeaders: 'keypair', headerParameters: { parameters: [{ name: "Prefer", value: "return=minimal" }] }, sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr("{{ JSON.stringify({ status: 'reviewing', step: 'Vérification spatiale' }) }}"), options: { timeout: 60000 } }, credentials: { supabaseApi: { id: '4yHWOHdhqFmTXqmD', name: 'Supabase - Zohar Personal' } }, alwaysOutputData: true, onError: 'continueRegularOutput' }, output: [{}] });
const reviewer = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Relire la séance (Sonnet)", parameters: { method: 'POST', url: expr("https://openrouter.ai/api/v1/chat/completions"), authentication: 'predefinedCredentialType', nodeCredentialType: 'openRouterApi', sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr("{{ JSON.stringify({ model: $('Réglages').first().json.modelReviewer, max_tokens: 32000, reasoning: { effort: 'medium' }, messages: [ { role: 'system', content: [ { type: 'text', text: $('Consignes de l\\'assistant').first().json.systemPrompt, cache_control: { type: 'ephemeral' } } ] }, { role: 'user', content: $('Consignes de l\\'assistant').first().json.reviewPrompt + '\\n\\nSéance à relire :\\n' + JSON.stringify($('Séance retenue').first().json.data) } ] }) }}"), options: { timeout: 600000 } }, credentials: { openRouterApi: { id: '1sBYT7nqJu8nlLpk', name: 'z.stolar@gmail.com OpenRouter account' } }, retryOnFail: true, maxTries: 2, waitBetweenTries: 5000, onError: 'continueErrorOutput' }, output: [{ choices: [{ message: { content: '{}' } }] }] });
const analyseReview = node({ type: 'n8n-nodes-base.code', version: 2, config: { name: 'Analyser la relecture', parameters: { mode: 'runOnceForEachItem', jsCode: `// n8n Code node, mode "Run Once for Each Item".
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
` } }, output: [{ data: {}, reviewed: true }] });
const save = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Enregistrer la séance", parameters: { method: 'PATCH', url: expr("{{ $('Réglages').first().json.supabaseTable }}?id=eq.{{ $('Préparer la demande').first().json.id }}"), authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true, specifyHeaders: 'keypair', headerParameters: { parameters: [{ name: "Prefer", value: "return=minimal" }] }, sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr("{{ JSON.stringify({ status: 'ready', step: null, error: null, data: $json.data, theme: $json.data.theme, public: $json.data.public, versions: $('Préparer la demande').first().json.versions }) }}"), options: { timeout: 60000 } }, credentials: { supabaseApi: { id: '4yHWOHdhqFmTXqmD', name: 'Supabase - Zohar Personal' } } }, output: [{}] });
const saveError = node({ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: { name: "Enregistrer l'erreur", parameters: { method: 'PATCH', url: expr("{{ $('Réglages').first().json.supabaseTable }}?id=eq.{{ $('Préparer la demande').first().json.id }}"), authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendHeaders: true, specifyHeaders: 'keypair', headerParameters: { parameters: [{ name: "Prefer", value: "return=minimal" }] }, sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr("{{ JSON.stringify({ status: 'error', step: null, error: String(Array.isArray($json.errors) && $json.errors.length ? $json.errors.join(' ; ') : ($json.error?.message ?? $json.error ?? 'Erreur de génération')).slice(0, 1000) }) }}"), options: { timeout: 60000 } }, credentials: { supabaseApi: { id: '4yHWOHdhqFmTXqmD', name: 'Supabase - Zohar Personal' } } }, output: [{}] });
const note = sticky('## Carnet de séances : API\n\nUn seul webhook (POST /webhook/carnet-seances, en-tête protégé par le code d\'accès). Champ « action » : list, get, delete, generate, revise.\n\ngenerate / revise répondent tout de suite avec l\'id, puis : Opus rédige, le code valide (réparation par Sonnet si besoin), Sonnet relit la cohérence spatiale, la séance est enregistrée dans Supabase (aikido_seances). L\'application interroge « get » jusqu\'à status = ready.\n\nLes consignes de l\'assistant sont modifiables dans le nœud « Consignes de l\'assistant ».', [], { color: 5 });

export default workflow('carnet-seances-api', 'Carnet de séances – API')
  .add(webhook)
  .to(reglages)
  .to(normaliser)
  .to(router
    .onCase(0, list.to(respondList))
    .onCase(1, get.to(respondGet))
    .onCase(2, deleteRow.to(respondDelete))
    .onCase(3, insert.to(respondStart))
    .onCase(4, revise.to(respondStart))
    .onCase(5, respondUnknown))
  .add(respondStart)
  .to(keepIfFound)
  .to(contexte)
  .to(consignes)
  .to(writer)
  .to(analyse1)
  .to(ifValid1
    .onTrue(retained)
    .onFalse(repair.to(analyse2).to(ifValid2.onTrue(retained).onFalse(saveError))))
  .add(writer.onError(saveError))
  .add(repair.onError(saveError))
  .add(retained)
  .to(markReviewing)
  .to(reviewer)
  .to(analyseReview)
  .to(save)
  .add(reviewer.onError(analyseReview))
  .add(note)
  .group('Rédaction', [consignes, writer], { description: 'Opus rédige la séance au format JSON à partir des consignes et du référentiel.' })
  .group('Relecture et enregistrement', [markReviewing, reviewer, analyseReview, save], { description: 'Sonnet vérifie la cohérence spatiale, puis la séance est enregistrée dans Supabase.' });
