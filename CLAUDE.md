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
pnpm release:beta                                  # publie une version beta npm (dist-tag "beta")
```

Rôles spécialistes disponibles : `ux-ui`, `frontend`, `backend`, `qa`, `tech-lead`,
`legal-compliance`, `security`, `devops`, `data-analytics`, `customer-success`

---

## Releases

- **Beta** : `pnpm release:beta` (voir `scripts/release-beta.sh`) publie une
  prerelease npm (`X.Y.Z-beta.N`, dist-tag `beta`) sans jamais modifier la
  version committée sur `main`.
- **Release réelle** : entièrement automatisée par GitHub Actions
  (`.github/workflows/release-please.yml`, basé sur release-please). Le bump
  de version, le `CHANGELOG.md`, le tag git, la GitHub Release et la
  publication npm (dist-tag `latest`) sont gérés par ce workflow à partir des
  commits `feat:` / `fix:` / `feat!:` (Conventional Commits) mergés sur
  `main`. Ne jamais lancer `npm version` / `npm publish` manuellement pour
  une release réelle.

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

b. Identifier le rôle ADE dominant selon les mots-clés du titre/corps :
   - `backend`  → architecture TypeScript, Node.js, parsing, fichiers src/
   - `frontend` → pas applicable pour ADE (outil CLI sans UI)
   - `security` → vulnérabilités, path traversal, injection, données sensibles
   - `devops`   → CI/CD, release, npm publish, packaging
   - `qa`       → tests node:test, couverture, régressions, cas limites
   - `tech-lead` → architecture, performance, dette technique, refactoring
   - `legal-compliance` → licences, RGPD si applicable

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
| `backlog-refined` | Issue enrichie automatiquement par Claude Code |
| `ready-for-dev` | Prête à développer (estimée, critères clairs) |
| `in-progress` | Développement en cours |
| `pr-ready` | PR créée, reviews passées, en attente de merge |
| `needs-info` | Informations manquantes |
| `backend` / `frontend` / `security` / `devops` / `qa` / `legal-compliance` | Domaine |
| `good-first-issue` | Adaptée pour contribuer facilement |

---

## Workflow 2 — Développement d'une issue

**Déclencheur :** "Prends l'issue <N> et développe-la" ou "développe une issue ready-for-dev"

### ⚠️ Gate PO/PM obligatoire — à exécuter AVANT tout développement

**1. Lire l'issue**
```bash
gh issue view <N> --json number,title,body,labels,url
```

**2. Vérifier les labels**

- Si l'issue a le label `backlog-refined` ou `ready-for-dev` → continuer au développement.
- Si l'issue N'a PAS ces labels → **STOP. Enrichir d'abord.**

**Procédure d'enrichissement obligatoire (si pas backlog-refined) :**

a. Analyser l'issue dans le contexte ADE (templates, types, architecture src/).

b. Identifier le rôle ADE dominant (backend / security / devops / qa / tech-lead / legal-compliance)
   selon les mots-clés du titre/corps (voir Workflow 1 step 3b).

c. Rédiger une version enrichie en adoptant la perspective du rôle identifié :
   - Objectif clair (une phrase)
   - Critères d'acceptation (≥ 3 checkboxes `- [ ]`)
   - Contexte technique (fichiers concernés, dépendances, impact sur les tests)
   - Risques identifiés (régressions, breaking changes)

d. Mettre à jour l'issue et la labelliser :
   ```bash
   gh issue edit <N> --body "<ENRICHED_BODY>"
   gh issue edit <N> --add-label "backlog-refined"
   ```

e. Une fois l'issue mise à jour sur GitHub, **continuer automatiquement au développement**
   sans attendre de validation manuelle.

---

### Développement

**3. Marquer comme in-progress**
```bash
gh issue edit <N> --add-label "in-progress"
```

**4. Créer une branche**
```bash
git checkout -b feat/issue-<N>-<slug-du-titre>
# Exemple : feat/issue-42-add-rate-limiting
```

**5. Planifier avec le rôle Tech Lead**
- Lire `templates/tech-lead.md` pour le cadre de réflexion
- Identifier les fichiers à modifier, les dépendances, l'approche

**6. Implémenter**
- Écrire le code en TypeScript strict
- Vérifier régulièrement :
  ```bash
  pnpm typecheck && pnpm test
  ```
- Respecter les conventions : pas de build step, `node:test` pour les tests, ESM

**7. Générer les reviews spécialistes post-développement**

Créer un fichier Markdown décrivant les changements :
```bash
cat > /tmp/issue-<N>-impl.md << 'EOF'
# Issue #<N>: <Titre>

## Ce qui a été implémenté

<description des changements>

## Fichiers modifiés

<liste>
EOF
```

Sélectionner les rôles selon le domaine de l'issue :
- **Toujours** : `tech-lead` + `qa`
- Issue `backend`  → ajouter `backend` + `security`
- Issue `security` → ajouter `security` (prioritaire)
- Issue `devops`   → ajouter `devops` + `security`
- Issue `qa`       → `qa` seul suffit + `tech-lead`
- Issue `legal-compliance` → ajouter `legal-compliance`

```bash
# Exemple pour une issue backend :
pnpm prompt:specialist tech-lead /tmp/issue-<N>-impl.md outputs/
pnpm prompt:specialist qa /tmp/issue-<N>-impl.md outputs/
pnpm prompt:specialist backend /tmp/issue-<N>-impl.md outputs/
pnpm prompt:specialist security /tmp/issue-<N>-impl.md outputs/
```

Lire les prompts générés, produire les reviews (tu joues les rôles), corriger le code si des points sont soulevés.

**8. Vérification finale**
```bash
pnpm typecheck && pnpm test
```

**9. Pousser la branche et créer la PR**
```bash
git push -u origin $(git branch --show-current)
```

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

**10. Review post-PR — Tech Lead + QA sur le diff réel**

```bash
PR_NUMBER=$(gh pr list --head "feat/issue-<N>-<slug>" --json number --jq '.[0].number')

# Récupérer le diff complet de la PR
gh pr diff ${PR_NUMBER} > /tmp/pr-${PR_NUMBER}-diff.md

# Créer le fichier de contexte pour les reviews
cat > /tmp/pr-${PR_NUMBER}-review.md << EOF
# PR #${PR_NUMBER} — Review post-implémentation
Issue : #<N> — <Titre>

## Diff complet
$(cat /tmp/pr-${PR_NUMBER}-diff.md)
EOF
```

Générer les reviews sur le diff réel — mêmes rôles que l'étape 7 (toujours tech-lead + qa, plus les rôles domaine) :
```bash
pnpm prompt:specialist tech-lead /tmp/pr-${PR_NUMBER}-review.md outputs/
pnpm prompt:specialist qa /tmp/pr-${PR_NUMBER}-review.md outputs/
# Ajouter les rôles domaine selon le type de l'issue (backend+security, devops+security…)
```

Jouer les rôles Tech Lead et QA sur le diff. Deux cas possibles :

**Cas A — Aucun point bloquant** : passer à l'étape 11.

**Cas B — Des corrections sont nécessaires** :
- Corriger le code sur la même branche
- Relancer les tests :
  ```bash
  pnpm typecheck && pnpm test
  ```
- Pousser les corrections :
  ```bash
  git add . && git commit -m "fix: <description de la correction>"
  git push
  ```
- Retourner à l'étape 10 (re-review du nouveau diff)
- La PR reste `in-progress` pendant toute cette phase

**11. Notifier — uniquement quand toutes les reviews passent**
```bash
gh issue comment <N> --body "PR #${PR_NUMBER} prête pour review : cc @alelouet"
gh issue edit <N> --remove-label "in-progress" --add-label "pr-ready"
gh pr edit ${PR_NUMBER} --add-assignee "alelouet"
```

---

## Workflow 3 — Notification et merge

Ce workflow est **entièrement manuel** : @alelouet reçoit la notification GitHub (assignation + commentaire), fait une review finale de la PR, et merge si tout est en ordre.

Claude Code ne merge jamais une PR sans validation humaine explicite.

---

## Règles importantes

- **L'issue doit avoir le label `backlog-refined` avant tout développement** (ajouté automatiquement après enrichissement).
- **Ne jamais merger sans validation humaine.** Même si tous les tests passent.
- **Toujours lancer `pnpm typecheck &&