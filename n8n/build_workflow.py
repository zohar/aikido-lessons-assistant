"""Generates workflow.ts (n8n Workflow SDK) for the Carnet de séances API.

Prompts and Code-node scripts live in their own files and are embedded as
JSON string literals, so they never need manual escaping.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
S = lambda s: json.dumps(s, ensure_ascii=False)          # SDK string literal
T = lambda s: "`" + s + "`"  # template literal (texts contain no backtick, backslash or ${)
E = lambda s: "expr(" + S(s) + ")"                         # SDK expression

SYSTEM_PROMPT = (HERE / "prompt-systeme.md").read_text(encoding="utf-8")
REVIEW_PROMPT = (HERE / "prompt-relecture.md").read_text(encoding="utf-8")
CODE_ANALYSE = (HERE / "analyser-seance.js").read_text(encoding="utf-8")
CODE_REVIEW = (HERE / "analyser-relecture.js").read_text(encoding="utf-8")

SUPABASE_TABLE = "https://ueuauhnlzhwxqnnwfxzk.supabase.co/rest/v1/aikido_seances"
OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"
CRED_SUPABASE = "{ supabaseApi: { id: 'Yes9xYRTnuDRgnQj', name: 'x' } }"  # replaced below
CRED_SUPABASE = "{ supabaseApi: { id: '4yHWOHdhqFmTXqmD', name: 'Supabase - Zohar Personal' } }"
CRED_OPENROUTER = "{ openRouterApi: { id: '1sBYT7nqJu8nlLpk', name: 'z.stolar@gmail.com OpenRouter account' } }"

R = "$('Réglages').first().json"
N = "$('Normaliser la requête').first().json"
CTX = "$('Préparer la demande').first().json"
CONS = "$('Consignes de l\\'assistant').first().json"


def cond_expr(left_expr, op_type, operation, right=None):
    c = {"leftValue": "__L__", "operator": {"type": op_type, "operation": operation}}
    if right is not None:
        c["rightValue"] = right
    s = json.dumps(c, ensure_ascii=False).replace('"__L__"', E(left_expr))
    return s


def conditions(*conds, type_validation="loose"):
    return ("{ options: { caseSensitive: true, leftValue: '', typeValidation: '" + type_validation + "' }, "
            "conditions: [" + ", ".join(conds) + "], combinator: 'and' }")


def http(name, method, url_expr, *, cred, body_expr=None, headers=None, extra_config="", timeout=60000, output="[{ id: 'uuid' }]"):
    params = [f"method: '{method}'", f"url: {E(url_expr)}", "authentication: 'predefinedCredentialType'",
              f"nodeCredentialType: '{'supabaseApi' if 'supabase' in cred else 'openRouterApi'}'"]
    if headers:
        entries = ", ".join("{ name: " + S(k) + ", value: " + S(v) + " }" for k, v in headers.items())
        params += ["sendHeaders: true", "specifyHeaders: 'keypair'", "headerParameters: { parameters: [" + entries + "] }"]
    if body_expr:
        params += ["sendBody: true", "contentType: 'json'", "specifyBody: 'json'", f"jsonBody: {E(body_expr)}"]
    params.append(f"options: {{ timeout: {timeout} }}")
    return (f"node({{ type: 'n8n-nodes-base.httpRequest', version: 4.5, config: {{ name: {S(name)}, "
            f"parameters: {{ {', '.join(params)} }}, credentials: {cred}{extra_config} }}, output: {output} }})")


def respond(name, body_expr, code_expr=None):
    opts = f"{{ responseCode: {E(code_expr)} }}" if code_expr else "{}"
    return (f"node({{ type: 'n8n-nodes-base.respondToWebhook', version: 1.5, config: {{ name: {S(name)}, "
            f"parameters: {{ respondWith: 'json', responseBody: {E(body_expr)}, options: {opts} }} }} }})")


def set_node(name, assignments, include_other=False, extra_config="", output="[{}]"):
    items = []
    for i, (field, typ, value, is_expr) in enumerate(assignments):
        v = E(value) if is_expr else S(value)
        items.append(f"{{ id: {S(name + '-' + str(i))}, name: {S(field)}, value: {v}, type: {S(typ)} }}")
    return (f"node({{ type: 'n8n-nodes-base.set', version: 3.4, config: {{ name: {S(name)}, parameters: {{ mode: 'manual', "
            f"includeOtherFields: {'true' if include_other else 'false'}, assignments: {{ assignments: [{', '.join(items)}] }} }}{extra_config} }}, output: {output} }})")


def code_node(name, js):
    return (f"node({{ type: 'n8n-nodes-base.code', version: 2, config: {{ name: {S(name)}, parameters: {{ mode: 'runOnceForEachItem', "
            f"jsCode: {S(js)} }} }}, output: [{{ ok: true, data: {{}}, errors: [] }}] }})")


def openrouter_body(model_expr, system_expr, user_expr, effort=None, max_tokens=32000):
    reasoning = f", reasoning: {{ effort: '{effort}' }}" if effort else ""
    return ("{{ JSON.stringify({ model: " + model_expr + ", max_tokens: " + str(max_tokens) + reasoning +
            ", messages: [ { role: 'system', content: [ { type: 'text', text: " + system_expr +
            ", cache_control: { type: 'ephemeral' } } ] }, { role: 'user', content: " + user_expr + " } ] }) }}")


ID_RE = "/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i"

nodes = {}

nodes["webhook"] = ("trigger({ type: 'n8n-nodes-base.webhook', version: 2.2, config: { name: 'Requête du Carnet', parameters: { "
                    "httpMethod: 'POST', path: 'carnet-seances', authentication: 'headerAuth', responseMode: 'responseNode', "
                    "options: { allowedOrigins: '*' } }, credentials: { httpHeaderAuth: newCredential(\"Carnet de séances – code d'accès\") } }, "
                    "output: [{ body: { action: 'list' } }] })")

nodes["reglages"] = set_node("Réglages", [
    ("supabaseTable", "string", SUPABASE_TABLE, False),
    ("modelWriter", "string", "anthropic/claude-opus-5.5", False),
    ("modelReviewer", "string", "anthropic/claude-sonnet-5.5", False),
], include_other=True, output="[{ body: { action: 'list' }, supabaseTable: 'https://x', modelWriter: 'a', modelReviewer: 'b' }]")

nodes["normaliser"] = set_node("Normaliser la requête", [
    ("action", "string", "{{ String($json.body?.action ?? '').trim().toLowerCase() }}", True),
    ("id", "string", "{{ " + ID_RE + ".test(String($json.body?.id ?? '')) ? $json.body.id : '' }}", True),
    ("startingPoint", "string", "{{ String($json.body?.startingPoint ?? '').trim().slice(0, 300) }}", True),
    ("public", "string", "{{ String($json.body?.public ?? '').trim().slice(0, 200) }}", True),
    ("duree", "number", "{{ Math.min(Math.max(parseInt($json.body?.duree) || 30, 15), 120) }}", True),
    ("notes", "string", "{{ String($json.body?.notes ?? '').trim().slice(0, 1500) }}", True),
    ("message", "string", "{{ String($json.body?.message ?? '').trim().slice(0, 1500) }}", True),
    ("author", "string", "{{ String($json.body?.author ?? '').trim().slice(0, 80) }}", True),
], output="[{ action: 'list', id: '', startingPoint: '', public: '', duree: 30, notes: '', message: '', author: '' }]")

actions = ["list", "get", "delete", "generate", "revise"]
rules = []
for a in actions:
    rules.append("{ outputKey: " + S(a) + ", conditions: " + conditions(cond_expr("{{ $json.action }}", "string", "equals", a), type_validation="strict") + " }")
nodes["switch"] = ("switchCase({ version: 3.2, config: { name: \"Aiguiller l'action\", parameters: { rules: { values: [" + ", ".join(rules) +
                   "] }, options: { fallbackOutput: 'extra', renameFallbackOutput: 'Inconnue' } } } })")

# ---- list / get / delete ----
nodes["list"] = http("Lister les séances", "GET",
                     "{{ " + R + ".supabaseTable }}?select=id,theme,public,status,step,author,created_at,updated_at&order=updated_at.desc&limit=200",
                     cred=CRED_SUPABASE, extra_config=", alwaysOutputData: true")
nodes["respondList"] = respond("Renvoyer la liste", "{{ { items: $input.all().map(i => i.json).filter(j => j && j.id) } }}")

nodes["get"] = http("Lire la séance", "GET", "{{ " + R + ".supabaseTable }}?id=eq.{{ $json.id }}&select=*",
                    cred=CRED_SUPABASE, extra_config=", alwaysOutputData: true, onError: 'continueRegularOutput'")
nodes["respondGet"] = respond("Renvoyer la séance", "{{ $json.id ? $json : { error: 'Séance introuvable' } }}", "{{ $json.id ? 200 : 404 }}")

nodes["delete"] = http("Supprimer la séance", "DELETE", "{{ " + R + ".supabaseTable }}?id=eq.{{ $json.id }}",
                       cred=CRED_SUPABASE, extra_config=", alwaysOutputData: true, onError: 'continueRegularOutput'", output="[{}]")
nodes["respondDelete"] = respond("Confirmer la suppression", "{{ { ok: true } }}")

nodes["respondUnknown"] = respond("Action inconnue", "{{ { error: 'Action inconnue : ' + $json.action } }}", "{{ 400 }}")

# ---- start a generation or a revision ----
insert_body = ("{{ JSON.stringify({ status: 'generating', step: 'Rédaction de la séance', theme: $json.startingPoint, public: $json.public, "
               "author: $json.author, request: { startingPoint: $json.startingPoint, public: $json.public, duree: $json.duree, notes: $json.notes } }) }}")
nodes["insert"] = http("Créer la séance", "POST", "{{ " + R + ".supabaseTable }}", cred=CRED_SUPABASE,
                       headers={"Prefer": "return=representation"}, body_expr=insert_body)
revise_body = "{{ JSON.stringify({ status: 'generating', step: 'Modification de la séance', error: null }) }}"
nodes["revise"] = http("Passer en modification", "PATCH", "{{ " + R + ".supabaseTable }}?id=eq.{{ $json.id }}", cred=CRED_SUPABASE,
                       headers={"Prefer": "return=representation"}, body_expr=revise_body,
                       extra_config=", alwaysOutputData: true, onError: 'continueRegularOutput'")
nodes["respondStart"] = respond("Confirmer le lancement",
                                "{{ $json.id ? { id: $json.id, status: $json.status } : { error: 'Séance introuvable' } }}",
                                "{{ $json.id ? 200 : 404 }}")
nodes["filter"] = ("node({ type: 'n8n-nodes-base.filter', version: 2.2, config: { name: 'Continuer si la séance existe', parameters: { conditions: " +
                   conditions(cond_expr("{{ !!$json.id && (" + N + ".action === 'generate' || !!$json.data) }}", "boolean", "true")) +
                   " } }, output: [{ id: 'uuid', status: 'generating' }] })")

user_msg = ("{{ " + N + ".action === 'revise' "
            "? 'Voici la séance actuelle :\\n' + JSON.stringify($json.data) + '\\n\\nDemande de modification : ' + " + N + ".message + "
            "'\\n\\nModifie seulement ce qui est demandé, refais la vérification spatiale des situations touchées et renvoie l\\'objet JSON complet mis à jour, sans rien d\\'autre.' "
            ": 'Construis une séance complète.\\nPoint de départ : ' + " + N + ".startingPoint + "
            "'\\nPublic : ' + (" + N + ".public || 'adultes, niveau non précisé') + "
            "'\\nDurée : ' + " + N + ".duree + ' minutes' + "
            "'\\nPrécisions : ' + (" + N + ".notes || 'aucune') + "
            "'\\n\\nRéponds uniquement par l\\'objet JSON de la séance.' }}")
nodes["contexte"] = set_node("Préparer la demande", [
    ("id", "string", "{{ $json.id }}", True),
    ("mode", "string", "{{ " + N + ".action }}", True),
    ("versions", "array", "{{ (() => { const v = Array.isArray($json.versions) ? $json.versions : []; return $json.data ? [{ savedAt: $json.updated_at, data: $json.data }, ...v].slice(0, 10) : v; })() }}", True),
    ("userMessage", "string", user_msg, True),
], output="[{ id: 'uuid', mode: 'generate', versions: [], userMessage: 'x' }]")

nodes["consignes"] = set_node("Consignes de l'assistant", [
    ("systemPrompt", "string", "__T_SYSTEM__", False),
    ("reviewPrompt", "string", "__T_REVIEW__", False),
], include_other=True, output="[{ id: 'uuid', userMessage: 'x', systemPrompt: 'x', reviewPrompt: 'x' }]")

LLM_RETRY = ", retryOnFail: true, maxTries: 2, waitBetweenTries: 5000, onError: 'continueErrorOutput'"
nodes["writer"] = http("Rédiger la séance (Opus)", "POST", OPENROUTER, cred=CRED_OPENROUTER,
                       body_expr=openrouter_body(R + ".modelWriter", "$json.systemPrompt", "$json.userMessage", effort="medium"),
                       extra_config=LLM_RETRY, timeout=600000, output="[{ choices: [{ message: { content: '{}' } }] }]")
nodes["analyse1"] = code_node("Analyser la séance", "__T_ANALYSE__")
nodes["ifValid1"] = ("ifElse({ version: 2.2, config: { name: 'Séance valide ?', parameters: { conditions: " +
                     conditions(cond_expr("{{ $json.ok }}", "boolean", "true")) + " } } })")

repair_user = ("'La séance ci-dessous ne respecte pas le format attendu. Problèmes : ' + $json.errors.join(' ; ') + "
               "'\\n\\nCorrige-la sans changer son contenu pédagogique et renvoie uniquement l\\'objet JSON complet.\\n\\n' + ($json.raw || '')")
nodes["repair"] = http("Réparer le JSON (Sonnet)", "POST", OPENROUTER, cred=CRED_OPENROUTER,
                       body_expr=openrouter_body(R + ".modelReviewer", CONS + ".systemPrompt", repair_user),
                       extra_config=LLM_RETRY, timeout=600000, output="[{ choices: [{ message: { content: '{}' } }] }]")
nodes["analyse2"] = code_node("Analyser la réparation", "__T_ANALYSE__")
nodes["ifValid2"] = ("ifElse({ version: 2.2, config: { name: 'Réparation valide ?', parameters: { conditions: " +
                     conditions(cond_expr("{{ $json.ok }}", "boolean", "true")) + " } } })")

nodes["retained"] = set_node("Séance retenue", [("data", "object", "{{ $json.data }}", True)],
                             output="[{ data: {} }]")
nodes["markReviewing"] = http("Passer en vérification", "PATCH", "{{ " + R + ".supabaseTable }}?id=eq.{{ " + CTX + ".id }}", cred=CRED_SUPABASE,
                              headers={"Prefer": "return=minimal"},
                              body_expr="{{ JSON.stringify({ status: 'reviewing', step: 'Vérification spatiale' }) }}",
                              extra_config=", alwaysOutputData: true, onError: 'continueRegularOutput'", output="[{}]")
review_user = CONS + ".reviewPrompt + '\\n\\nSéance à relire :\\n' + JSON.stringify($('Séance retenue').first().json.data)"
nodes["reviewer"] = http("Relire la séance (Sonnet)", "POST", OPENROUTER, cred=CRED_OPENROUTER,
                         body_expr=openrouter_body(R + ".modelReviewer", CONS + ".systemPrompt", review_user, effort="medium"),
                         extra_config=LLM_RETRY, timeout=600000, output="[{ choices: [{ message: { content: '{}' } }] }]")
nodes["analyseReview"] = (f"node({{ type: 'n8n-nodes-base.code', version: 2, config: {{ name: 'Analyser la relecture', parameters: {{ mode: 'runOnceForEachItem', "
                          f"jsCode: {S('__T_REVIEW_CODE__')} }} }}, output: [{{ data: {{}}, reviewed: true }}] }})")
save_body = ("{{ JSON.stringify({ status: 'ready', step: null, error: null, data: $json.data, theme: $json.data.theme, "
             "public: $json.data.public, versions: " + CTX + ".versions }) }}")
nodes["save"] = http("Enregistrer la séance", "PATCH", "{{ " + R + ".supabaseTable }}?id=eq.{{ " + CTX + ".id }}", cred=CRED_SUPABASE,
                     headers={"Prefer": "return=minimal"}, body_expr=save_body, output="[{}]")
error_body = ("{{ JSON.stringify({ status: 'error', step: null, error: String(Array.isArray($json.errors) && $json.errors.length ? $json.errors.join(' ; ') "
              ": ($json.error?.message ?? $json.error ?? 'Erreur de génération')).slice(0, 1000) }) }}")
nodes["error"] = http("Enregistrer l'erreur", "PATCH", "{{ " + R + ".supabaseTable }}?id=eq.{{ " + CTX + ".id }}", cred=CRED_SUPABASE,
                      headers={"Prefer": "return=minimal"}, body_expr=error_body, output="[{}]")

sticky = ("sticky('## Carnet de séances : API\\n\\nUn seul webhook (POST /webhook/carnet-seances, en-tête protégé par le code d\\'accès). "
          "Champ « action » : list, get, delete, generate, revise.\\n\\n"
          "generate / revise répondent tout de suite avec l\\'id, puis : Opus rédige, le code valide (réparation par Sonnet si besoin), "
          "Sonnet relit la cohérence spatiale, la séance est enregistrée dans Supabase (aikido_seances). "
          "L\\'application interroge « get » jusqu\\'à status = ready.\\n\\n"
          "Les consignes de l\\'assistant sont modifiables dans le nœud « Consignes de l\\'assistant ».', [], { color: 5 })")

lines = ["import { workflow, node, trigger, sticky, newCredential, ifElse, switchCase, expr } from '@n8n/workflow-sdk';", ""]
for k, v in nodes.items():
    lines.append(f"const {k} = {v};")
lines.append(f"const note = {sticky};")
lines.append("")
lines.append("""export default workflow('carnet-seances-api', 'Carnet de séances – API')
  .add(webhook)
  .to(reglages)
  .to(normaliser)
  .to(switch
    .onCase(0, list.to(respondList))
    .onCase(1, get.to(respondGet))
    .onCase(2, delete.to(respondDelete))
    .onCase(3, insert.to(respondStart))
    .onCase(4, revise.to(respondStart))
    .onCase(5, respondUnknown))
  .add(respondStart)
  .to(filter)
  .to(contexte)
  .to(consignes)
  .to(writer)
  .to(analyse1)
  .to(ifValid1
    .onTrue(retained)
    .onFalse(repair.to(analyse2).to(ifValid2.onTrue(retained).onFalse(error))))
  .add(writer.onError(error))
  .add(repair.onError(error))
  .add(retained)
  .to(markReviewing)
  .to(reviewer)
  .to(analyseReview)
  .to(save)
  .add(reviewer.onError(analyseReview))
  .add(note)
  .group('Rédaction', [consignes, writer], { description: 'Opus rédige la séance au format JSON à partir des consignes et du référentiel.' })
  .group('Relecture et enregistrement', [markReviewing, reviewer, analyseReview, save], { description: 'Sonnet vérifie la cohérence spatiale, puis la séance est enregistrée dans Supabase.' });
""")
code = "\n".join(lines).replace("const delete = ", "const deleteRow = ").replace("delete.to(respondDelete)", "deleteRow.to(respondDelete)")
code = code.replace("const switch = ", "const router = ").replace(".to(switch\n", ".to(router\n")
code = code.replace("const filter = ", "const keepIfFound = ").replace(".to(filter)", ".to(keepIfFound)")
code = code.replace("const error = ", "const saveError = ").replace(".onFalse(error)", ".onFalse(saveError)").replace(".onError(error)", ".onError(saveError)")
for key, text in {"__T_SYSTEM__": SYSTEM_PROMPT, "__T_REVIEW__": REVIEW_PROMPT, "__T_ANALYSE__": CODE_ANALYSE, "__T_REVIEW_CODE__": CODE_REVIEW}.items():
    assert "`" not in text and "\\" not in text and "${" not in text, key
    code = code.replace('"' + key + '"', T(text))
(HERE / "workflow.ts").write_text(code, encoding="utf-8")
print(len(code))
