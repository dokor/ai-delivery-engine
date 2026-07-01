# AI Delivery Engine — Instructions pour Claude Code

Ce projet est **AI Delivery Engine (ADE)** — un outil local de gestion de backlog piloté par des profils IA (PO/PM, UX/UI, Security, QA, Tech Lead…). Il transforme un brief Markdown en backlog structuré et génère des prompts spécialistes pour chaque étape de livraison.

---

## Commandes disponibles

```bash
pnpm typecheck                                     # vérification TypeScript (0 erreurs attendues)
pnpm test                                          # tests unitaires (node:test, pas de build)
pnpm backlog:run                                   # génère un backlog déterministe depuis un brief
pnpm prompt:po                                     # génère le prompt PO/PM
pnpm import:po                                     # importe et valide une réponse PO/PM JSON
pnpm backlog:review                                # vérifie la qualité du backlog
pnpm backlog:export                                # exporte les items en Markdown
pnpm prompt:specialists                            # génère tous les prompts spécialistes en batch
pnpm prompt:specialist <role> <item.md>            # génère un prompt pour un item précis
pnpm specialist:check <response.md>                # valide une réponse spécialiste
pnpm project:status                                # état du projet local
pnpm demo:validate                                 # valide le workflow complet en mode demo
```

Rôles spécialistes disponibles : `ux-ui`, `frontend`, `backend`, `qa`, `tech-lead`,
`legal-compliance`, `security`, `devops`, `data-analytics`, `customer-success`

---

## Workflow 1 — Enrichissement des issues GitHub

**Déclencheur :** "Parcours les issues et améliore leurs descriptions" (ou variante)

### Étapes

**1. Lister les issues non traitées**
```bash
gh issue list --state open --json number,title,body,labels,url --limit 50
```

**2. Filtrer** celles sans label `backlog-refined` ET sans label `ready-for-dev`.

**3. Pour chaque issue à enrichir :**

a. Analyser le contenu (titre + description existante)

b. Identifier le profil le plus pertinent :
   - PO/PM → objectifs produit, user stories, scope
   - Security → vulnérabilités, authentification, données sensibles
   - DevOps → déploiement, CI/CD, infrastructure
   - QA → tests, régressions, couverture

c. Générer une description améliorée contenant :
   - Objectif clair (user story ou énoncé technique)
   - Critères d'acceptation (≥3 checkboxes `- [ ]`)
   - Contexte technique si pertinent (stack, contraintes, fichiers concernés)
   - Labels suggérés (voir convention ci-dessous)

d. Si l'issue couvre **plus de 3 jours de travail**, la découper :
   ```bash
   gh issue create --title "<titre sous-issue>" --body "<description>"
   ```
   Puis fermer ou modifier l'issue parent pour indiquer le découpage.

e. Mettre à jour l'issue enrichie :
   ```bash
   gh issue edit <NUMBER> --body "<IMPROVED_BODY>"
   gh issue edit <NUMBER> --add-label "backlog-refined"
   ```

**4. Résumer** : lister les issues traitées, les labels ajoutés, les sous-issues créées.

### Convention de labels GitHub

| Label | Signification |
|---|---|
| `backlog-refined` | Issue enrichie, prête pour estimation |
| `ready-for-dev` | Prête à développer (estimée, critères clairs) |
| `in-progress` | Développement en cours |
| `pr-ready` | PR créée, en attente de review humaine |
| `needs-info` | Informations manquantes |
| `backend` / `frontend` / `security` / `devops` / `qa` / `legal-compliance` | Domaine |
| `good-first-issue` | Adaptée pour contribuer facilement |

---

## Workflow 2 — Développement d'une issue

**Déclencheur :** "Prends l'issue <N> et développe-la" ou "développe une issue ready-for-dev"

### Étapes

**1. Lire l'issue**
```bash
gh issue view <N> --json number,title,body,labels,url
```

**2. Marquer comme in-progress**
```bash
gh issue edit <N> --add-label "in-progress"
```

**3. Créer une branche**
```bash
git checkout -b feat/issue-<N>-<slug-du-titre>
# Exemple : feat/issue-42-add-rate-limiting
```

**4. Planifier avec le rôle Tech Lead**
- Lire `templates/tech-lead.md` pour le cadre de réflexion
- Identifier les fichiers à modifier, les dépendances, l'approche

**5. Implémenter**
- Écrire le code en TypeScript strict
- Vérifier régulièrement :
  ```bash
  pnpm typecheck && pnpm test
  ```
- Respecter les conventions : pas de build step, `node:test` pour les tests, ESM

**6. Générer les reviews spécialistes post-développement**

Créer un fichier Markdown décrivant les changements :
```bash
# Créer un fichier de description de l'implémentation
cat > /tmp/issue-<N>-impl.md << 'EOF'
# Issue #<N>: <Titre>

## Ce qui a été implémenté

<description des changements>

## Fichiers modifiés

<liste>

## Questions ouvertes

<si applicable>
EOF
```

Générer les prompts :
```bash
node --experimental-strip-types src/promptSpecialist.ts security /tmp/issue-<N>-impl.md outputs/
node --experimental-strip-types src/promptSpecialist.ts qa /tmp/issue-<N>-impl.md outputs/
node --experimental-strip-types src/promptSpecialist.ts tech-lead /tmp/issue-<N>-impl.md outputs/
```

Lire les prompts générés, produire les reviews (tu joues les rôles), corriger le code si des points sont soulevés.

**7. Vérification finale**
```bash
pnpm typecheck && pnpm test
```

**8. Créer la PR**
```bash
gh pr create \
  --title "feat: <titre court>" \
  --body "$(cat <<'PREOF'
Closes #<N>

## Résumé

<Décrire les changements en 2-3 lignes>

## Changements

- <fichier 1> : <ce qui a changé>
- <fichier 2> : <ce qui a changé>

---

## Security Review

<synthèse de la review sécurité — points soulevés et corrections apportées>

## QA Review

<synthèse de la review QA — cas de test couverts, risques résiduels>

## Tech Lead Review

<synthèse de la review tech lead — séquençage, architecture, dettes techniques>

---

*Généré par AI Delivery Engine. Review humaine requise avant merge.*
PREOF
)"
```

**9. Notifier et linker**
```bash
# Récupérer le numéro de la PR créée
PR_NUMBER=$(gh pr list --head "feat/issue-<N>-<slug>" --json number --jq '.[0].number')

# Commenter sur l'issue
gh issue comment <N> --body "PR prête pour review : #${PR_NUMBER} — cc @alelouet"

# Mettre à jour les labels
gh issue edit <N> --remove-label "in-progress" --add-label "pr-ready"
```

---

## Workflow 3 — Notification et merge

Ce workflow est **entièrement manuel** : @alelouet reçoit la notification GitHub, fait une review finale de la PR, et merge si tout est en ordre.

Claude Code ne merge jamais une PR sans validation humaine explicite.

---

## Règles importantes

- **Ne jamais merger sans validation humaine.** Même si tous les tests passent.
- **Toujours lancer `pnpm typecheck && pnpm test`** avant de créer une PR.
- **Les reviews spécialistes sont des recommandations**, pas des approbations automatiques.
- La variable d'environnement `GITHUB_REPO` peut être définie pour éviter de répéter le repo : `export GITHUB_REPO=dokor/ai-delivery-engine`
- Le projet utilise TypeScript strict avec Node.js 22 `--experimental-strip-types` — pas de compilation nécessaire.
- Les templates de rôle sont dans `templates/` (10 rôles V1, format Markdown).
- Les briefs sont dans `examples/`, les sorties dans `outputs/`.

---

## Prérequis GitHub

```bash
# Authentification gh CLI (à faire une seule fois)
gh auth login

# Vérifier que tu as accès au repo
gh repo view dokor/ai-delivery-engine

# Pour le repo Argos
gh repo view dokor/argos
```
