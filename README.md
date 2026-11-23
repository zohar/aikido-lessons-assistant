# Carnet de séances (Aïkido)

Web app that builds Aïkido lesson plans from a starting point (a principle, a technique or a concept), for ordinary classes and for Brevet Fédéral (BF) FFAAA preparation. Every lesson shows the same structure: a timeline, the three construction phases (▲ placement, ● déséquilibre, ■ projection / immobilisation), one template per exercise with detailed instructions and a spatial check, and hover explanations for every Japanese term.

## How it works

```
Browser ──POST /api/carnet-seances──▶ nginx (this container, Coolify)
                                         │  forwards only that path
                                         ▼
                         n8n workflow « Carnet de séances – API »
                         ├─ list / get / delete ──▶ Supabase aikido_seances
                         ├─ import: checks a lesson JSON, saves it as ready
                         └─ generate / revise (async)
                              1. answers at once with the lesson id
                              2. Opus 5.5 writes the lesson JSON (OpenRouter)
                              3. code checks the format (Sonnet repairs it if needed)
                              4. Sonnet 5.5 re-checks feet, hands and paths
                              5. saves the lesson in Supabase (status = ready)
While waiting, the browser asks Supabase directly (function carnet_statut) every 10 s,
paused while the tab is hidden, and calls n8n « get » only once more, when the lesson is done.
```

- `web/`: the app (static HTML/CSS/JS, no build step). `carnet.js` holds the lesson rendering and glossary; `app.js` the screens.
- `deploy/`: nginx config template; `Dockerfile`: the container Coolify builds.
- `n8n/`: sources of the n8n workflow (prompts, validation code incl. `valider-import.js`, generator). The live copy is in n8n; edit the prompts in the n8n node « Consignes de l'assistant ».
- `supabase/`: the table and the status function (both already applied).

## Setup

### 1. n8n

1. Create a credential of type **Header Auth**, named `Carnet de séances – code d'accès`:
   - Name: `X-Carnet-Code`
   - Value: the access code you will give the teachers.
2. Open the workflow **Carnet de séances – API**, select the node « Requête du Carnet » and choose that credential (it currently points to an older « Header Auth account »).
3. Publish the workflow. The production URL is `https://n8n.ovadia.rocks/webhook/carnet-seances`.

### 2. Coolify

1. New resource → Public/Private Repository → this repo, branch `main`.
2. Build pack: **Dockerfile**. Port: **80**.
3. Environment variable (only if your n8n URL differs): `N8N_WEBHOOK_URL=https://n8n.ovadia.rocks/webhook/carnet-seances`.
4. Set the domain, deploy. Health check: `/healthz`.

### 3. First use

Open the site, enter the access code (the « Glossaire » page, with every term and a one-line explanation, works without it) and your first name, then « Nouvelle séance »: describe the lesson in the text box or click the tokens (principe, technique, attaque, public, durée…). Defaults: 5e à 1er kyu, adultes, 30 minutes. A lesson takes about 4 to 8 minutes; there is no need to stay on the page, it appears in « Mes séances » when ready.

## Notes

- Progress checks go straight to Supabase with the project's publishable key (public by design, so it sits in `web/app.js`). It can only call `carnet_statut(id)`, which returns the status, step and age of one lesson whose id is known, never its content. The lessons table itself needs no rule for the public role.
- A lesson with no news for 30 minutes (the n8n run limit) is shown as « Interrompue », with a button to start it again.
- The access code is checked by n8n, not by the page. To change it, edit the credential value; everyone then re-enters the new code once.
- nginx forwards only `/api/carnet-seances`; no other n8n webhook is reachable through this site.
- The automatic review notes are stored in `data.relecture` in Supabase for control; they are not shown in the app.
- « Importer » (on « Mes séances ») adds a lesson from its JSON: pasted (a block from the Claude Project, with or without the ``` fences) or a .json file. n8n checks it with the same rules as generated lessons; it is not re-reviewed by Sonnet. « Copier le JSON » on a lesson gives the same format back.
- Each revision keeps the previous version in `versions` (last 10), not yet shown in the app.
- Placements are checked twice by the models, but stay a proposal: they must be validated on the mat by a teacher.
