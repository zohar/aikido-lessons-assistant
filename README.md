# Carnet de séances (Aïkido)

Web app that builds Aïkido lesson plans from a starting point (a principle, a technique or a concept), for ordinary classes and for Brevet Fédéral (BF) FFAAA preparation. Every lesson shows the same structure: a timeline, the three construction phases (▲ placement, ● déséquilibre, ■ projection / immobilisation), one template per exercise with detailed instructions and a spatial check, and hover explanations for every Japanese term.

## How it works

```
Browser ──POST /api/carnet-seances──▶ nginx (this container, Coolify)
                                         │  forwards only that path
                                         ▼
                         n8n workflow « Carnet de séances – API »
                         ├─ list / get / delete ──▶ Supabase aikido_seances
                         └─ generate / revise (async)
                              1. answers at once with the lesson id
                              2. Opus 5.5 writes the lesson JSON (OpenRouter)
                              3. code checks the format (Sonnet repairs it if needed)
                              4. Sonnet 5.5 re-checks feet, hands and paths
                              5. saves the lesson in Supabase (status = ready)
Browser polls « get » every 4 s and shows the progress.
```

- `web/`: the app (static HTML/CSS/JS, no build step). `carnet.js` holds the lesson rendering and glossary; `app.js` the screens.
- `deploy/`: nginx config template; `Dockerfile`: the container Coolify builds.
- `n8n/`: sources of the n8n workflow (prompts, validation code, generator). The live copy is in n8n; edit the prompts in the n8n node « Consignes de l'assistant ».
- `supabase/`: the table definition (already applied).

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

Open the site, enter the access code and your first name, then « Nouvelle séance »: describe the lesson in the text box or click the tokens (principe, technique, attaque, public, durée…). Defaults: 5e à 1er kyu, adultes, 30 minutes. A lesson takes about 3 to 8 minutes; you can leave the page and come back.

## Notes

- The access code is checked by n8n, not by the page. To change it, edit the credential value; everyone then re-enters the new code once.
- nginx forwards only `/api/carnet-seances`; no other n8n webhook is reachable through this site.
- The automatic review notes are stored in `data.relecture` in Supabase for control; they are not shown in the app.
- Each revision keeps the previous version in `versions` (last 10), not yet shown in the app.
- Placements are checked twice by the models, but stay a proposal: they must be validated on the mat by a teacher.
