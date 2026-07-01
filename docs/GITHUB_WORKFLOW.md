# GitHub Workflow — AI Delivery Engine

Ce document décrit les trois boucles d'automatisation GitHub disponibles dans ADE,
la manière de les utiliser avec Claude Code, et les prérequis.

---

## Prérequis

### 1. GitHub CLI (`gh`)

```bash
# Installation (macOS)
brew install gh

# Authentification
gh auth login
# → Choisir GitHub.com, HTTPS, login via navigateur

# Vérifier l'accès
gh repo view dokor/ai-delivery-engine
```

### 2. Variable d'environnement (optionnelle)

```bash
export GITHUB_REPO=dokor/ai-delivery-engine
# ou pour Argos :
export GITHUB_REPO=dokor/argos
```

### 3. Claude Code installé

Claude Code (CLI Anthropic) est l'orchestrateur LLM. Il lit `CLAUDE.md` et applique
les templates ADE. Installation : https://docs.claude.ai/claude-code

---

## Boucle 1 — Enrichissement des issues

**Objectif :** Prendre des issues vagues ou incomplètes et les transformer en issues
actionables avec des critères d'acceptation clairs.

### Utilisation

**Option A — Depuis le terminal puis Claude Code :**
```bash
# Voir quelles issues ont besoin d'enrichissement
pnpm issues:enrich
# → Affiche la liste des issues non raffinées

# Puis dans Claude Code :
# "Parcours ces issues GitHub et améliore leurs descriptions."
```

**Option B — Directement dans Claude Code :**
```
"Parcours les issues ouvertes de dokor/ai-delivery-engine
 et améliore leurs descriptions en appliquant le workflow 1 de CLAUDE.md."
```

### Ce que Claude Code fait

1. `gh issue list` — récupère les issues ouvertes
2. Filtre les issues sans label `backlog-refined`, `ready-for-dev`, `in-progress`
3. Pour chaque issue :
   - Génère une description améliorée (objectif, critères d'acceptation, contexte)
   - Détermine le bon profil spécialiste ADE (`templates/`)
   - Si l'issue est trop large (> 3 jours), découpe en sous-issues
   - `gh issue edit` — met à jour la description
   - `gh issue edit --add-label "backlog-refined"` — marque comme traitée
4. Résume les changements

### Labels utilisés

| Label | Appliqué quand |
|---|---|
| `backlog-refined` | Issue enrichie par ADE |
| `ready-for-dev` | Issue estimée et prête à développer (ajouté manuellement par toi) |

---

## Boucle 2 — Développement d'une issue

**Objectif :** Depuis une issue `ready-for-dev`, produire le code, les reviews
spécialistes, et une PR prête pour review humaine.

### Utilisation

**Option A — Script de préparation :**
```bash
# Préparer l'environnement (branche, prompts)
pnpm issue:dev 42
# → Crée feat/issue-42-... , génère les prompts spécialistes

# Puis dans Claude Code :
# "Développe l'issue #42 en appliquant le workflow 2 de CLAUDE.md."
```

**Option B — Directement dans Claude Code :**
```
"Prends l'issue #42 du repo dokor/ai-delivery-engine
 et développe-la en appliquant le workflow 2 de CLAUDE.md."
```

### Ce que Claude Code fait

1. `gh issue view <N>` — lit l'issue complète
2. `gh issue edit --add-label "in-progress"` — marque en cours
3. `git checkout -b feat/issue-<N>-<slug>` — crée la branche
4. Planification Tech Lead (lit `templates/tech-lead.md`)
5. Implémentation du code
6. `pnpm typecheck && pnpm test` — validation
7. Génère les reviews : Security, QA, Tech Lead (templates ADE)
8. Applique les corrections suggérées par les reviews
9. `pnpm typecheck && pnpm test` — validation finale
10. `gh pr create` — crée la PR avec reviews incluses dans le body
11. `gh issue comment` — commente l'issue avec le lien PR + @alelouet
12. Labels : retire `in-progress`, ajoute `pr-ready`

### Structure de la PR générée

```markdown
Closes #42

## Résumé
<changements en 2-3 lignes>

## Fichiers modifiés
- src/xxx.ts : ...

---

## Security Review
<findings + corrections apportées>

## QA Review
<cas couverts + risques résiduels>

## Tech Lead Review
<séquençage + dette technique>

---

*Généré par AI Delivery Engine — review humaine requise avant merge.*
```

---

## Boucle 3 — Review et merge final (manuel)

**Objectif :** @alelouet valide la PR et merge.

### Notification reçue

- Commentaire sur l'issue GitHub avec lien vers la PR
- Label `pr-ready` sur l'issue
- @mention dans le commentaire

### Checklist de review humaine

- [ ] Le code est correct et cohérent avec l'issue
- [ ] `pnpm typecheck && pnpm test` passent en local
- [ ] Les reviews spécialistes dans le body de la PR sont pertinentes
- [ ] Les corrections suite aux reviews ont été appliquées
- [ ] Pas de régression sur les fonctionnalités existantes

### Merge

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

---

## Architecture des fichiers

```
ai-delivery-engine/
├── CLAUDE.md                    # Instructions pour Claude Code (orchestrateur)
├── scripts/
│   ├── issues-enrich.sh         # Liste les issues à enrichir
│   └── issue-dev.sh             # Prépare le développement d'une issue
├── src/github/
│   ├── github.types.ts          # Types TypeScript GitHub
│   ├── fetchIssues.ts           # Récupération des issues via gh CLI
│   ├── enrichIssue.ts           # Génération des prompts d'enrichissement
│   ├── createPR.ts              # Création de PR avec reviews
│   ├── postComment.ts           # Commentaires et labels GitHub
│   └── index.ts                 # Re-exports
└── templates/                   # Templates des 10 rôles spécialistes ADE
```

---

## Limites actuelles (V1)

- Les reviews spécialistes sont **simulées par Claude Code** (pas d'appel API externe).
  En V2, chaque rôle pourrait appeler un LLM indépendant en parallèle.
- Le merge est toujours manuel — aucun merge automatique n'est prévu.
- Les issues enrichies nécessitent une **validation humaine** avant d'être marquées
  `ready-for-dev` (Claude Code applique `backlog-refined`, pas `ready-for-dev`).
- Ce workflow est conçu pour Claude Code CLI. Il ne fonctionne pas en mode Cowork
  (qui n'a pas d'accès GitHub direct pour l'instant).

---

## Roadmap V2

- Appels LLM parallèles pour chaque rôle spécialiste (vrai fan-out)
- GitHub Actions : déclencher une review ADE automatique à chaque ouverture de PR
- Webhook : détecter les nouvelles issues et enrichissement automatique
- Mode `--dry-run` : simuler sans écrire sur GitHub
