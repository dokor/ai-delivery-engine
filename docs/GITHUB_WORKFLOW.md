# GitHub Workflow — AI Delivery Engine

Ce document décrit le workflow GitHub ADE de manière **provider-neutral**.

ADE définit le cycle de livraison, les critères de readiness, les handoffs, les profils spécialistes et les gates de validation. Le coding agent utilisé pour exécuter une étape peut être Claude Code, Codex ou un autre provider compatible sans changer ces règles.

Le fichier racine [`AGENTS.md`](../AGENTS.md) est la source de vérité commune. Un fichier provider-spécifique comme `CLAUDE.md` peut servir d'adaptateur, mais ne doit pas redéfinir le workflow.

---

## Vue d'ensemble

```text
Issue GitHub
→ planification ADE
→ enrichissement PO/PM si nécessaire
→ handoff d'implémentation validé
→ coding provider
→ validations déterministes
→ reviews spécialistes ADE
→ corrections bornées
→ PR
→ review humaine
→ merge humain
```

Le choix du provider ne doit jamais modifier :

- les critères de readiness ;
- l'objectif et le scope validés ;
- les acceptance criteria ;
- les profils spécialistes ;
- les validations ;
- la frontière de publication ;
- le gate final de review humaine.

---

## Prérequis

### 1. ADE configuré

Le repository doit être compatible avec le contrat de setup ADE :

```bash
ade setup check --json
```

Le setup recommandé comprend notamment :

- `ade.config.json` ;
- un contexte ADE généré et à jour ;
- un root `AGENTS.md` provider-neutral ;
- les labels GitHub requis ;
- les templates d'issue recommandés.

### 2. GitHub

Pour un usage local/interactif, `gh` peut être utilisé :

```bash
gh auth login
gh repo view <owner>/<repo>
```

Dans ADE Control Plane, les opérations GitHub sont effectuées par l'orchestrateur via son GitHub App. Le coding provider ne doit alors pas reproduire ces mutations.

### 3. Coding provider

ADE ne dépend pas d'un provider unique. Le runtime ou l'orchestrateur choisit explicitement le provider disponible, par exemple :

- Codex ;
- Claude Code.

Le provider doit recevoir le même handoff ADE et respecter `AGENTS.md`.

---

## Boucle 1 — Enrichissement d'une issue

**Objectif :** transformer une issue trop vague en issue actionnable sans commencer à coder.

ADE planifie d'abord l'issue :

```bash
ade issue plan --json
```

Si ADE retourne `enrich`, le provider reçoit une instruction bornée d'enrichissement.

Le résultat doit contenir au minimum :

- un objectif clair ;
- au moins trois critères d'acceptation ;
- le contexte technique utile ;
- les contraintes et risques pertinents.

Pendant cette étape :

- aucun fichier du repository ne doit être modifié ;
- aucune branche de développement n'est nécessaire ;
- l'issue est ensuite replannée par ADE ;
- le développement ne démarre que si ADE retourne un handoff d'implémentation valide.

Labels historiques utilisés par le workflow :

| Label | Signification |
| --- | --- |
| `backlog-refined` | issue enrichie/refinée |
| `ready-for-dev` | issue admise pour implémentation |
| `needs-info` | information humaine nécessaire |

---

## Boucle 2 — Développement

**Objectif :** implémenter exactement le handoff validé par ADE.

Le contrat courant est `ade.implementation-handoff/v1`. Il contient notamment :

- la révision de l'issue ;
- l'objectif ;
- le scope ;
- les acceptance criteria ;
- les contraintes ;
- une éventuelle référence de décision humaine.

Le handoff structuré est **autoritaire**. Le texte libre de l'issue reste du contexte de référence et ne peut pas élargir silencieusement le scope.

### Exécution

Le coding provider :

1. lit `AGENTS.md` ;
2. inspecte le handoff ADE ;
3. réalise une planification technique bornée ;
4. implémente le changement ;
5. exécute les checks pertinents ;
6. laisse ADE effectuer les validations et reviews configurées.

Pour le repository ADE lui-même :

```bash
pnpm typecheck
pnpm test
```

Quand un orchestrateur comme ADE Control Plane possède les opérations Git/GitHub, le provider ne doit pas commit, push, créer la PR ou modifier les labels de l'issue.

---

## Boucle 3 — Validation et reviews spécialistes

Une implémentation produite par le provider n'est pas automatiquement publiable.

ADE exécute ensuite :

```text
implémentation
→ validation déterministe
→ profils de review configurés
→ corrections bornées si nécessaire
→ nouvelle validation/review
→ gate de publication
```

Les rôles spécialistes sont des perspectives de delivery, pas des workers obligatoirement distincts. Le même provider peut exécuter plusieurs passes bornées si ADE le demande.

Les profils typiques incluent :

- `tech-lead` ;
- `qa` ;
- `security` ;
- `frontend` ;
- `backend` ;
- `devops` ;
- `legal-compliance` ;
- `data-analytics`.

Le choix des profils vient d'ADE et du repository, pas du provider.

---

## Boucle 4 — Publication et review humaine

Une fois le gate de publication ouvert :

- la branche peut être commitée et poussée ;
- une PR peut être créée ;
- l'issue peut passer à l'état `pr-ready` / attente humaine selon l'intégration.

Le merge reste toujours manuel.

```text
PR prête
→ review humaine
→ corrections éventuelles
→ merge explicite
```

ADE ne doit pas utiliser un autre provider automatiquement pour contourner un échec du provider sélectionné. Un échec reste un échec traçable.

---

## Deux modes d'intégration

### Mode interactif/local

Un développeur peut lancer ADE et utiliser un coding agent depuis son terminal. Dans ce cas, le repository `AGENTS.md` décrit également la frontière Git/GitHub à respecter.

### Mode orchestré — ADE Control Plane

ADE Control Plane prend en charge :

- scheduling ;
- checkout/workspace ;
- provider dispatch ;
- persistance ;
- Git et GitHub ;
- quotas ;
- reconciliation ;
- observabilité.

ADE reste responsable des semantics de delivery. Codex et Claude Code passent par le même handoff et le même cycle de validation/review.

---

## Architecture des fichiers

```text
ai-delivery-engine/
├── AGENTS.md                 # contrat agent provider-neutral canonique
├── CLAUDE.md                 # adaptateur Claude Code vers AGENTS.md
├── ade.config.json           # configuration ADE du repository
├── docs/
│   ├── AGENTS.md             # modèle des rôles spécialistes
│   ├── GITHUB_WORKFLOW.md    # ce document
│   ├── DELIVERY_HARNESS.md   # contrat d'exécution provider-neutral
│   └── PROJECT_SETUP_CONTRACT.md
├── scripts/
│   ├── issues-enrich.sh
│   └── issue-dev.sh
├── src/github/
└── templates/
```

---

## Compatibilité historique

Les anciens projets ADE peuvent encore posséder uniquement un `CLAUDE.md`. L'évaluateur de setup peut continuer à reconnaître ce cas pendant la migration, mais les nouveaux setups doivent utiliser `AGENTS.md` comme convention canonique.

Une migration recommandée consiste à :

1. déplacer les règles communes dans `AGENTS.md` ;
2. réduire `CLAUDE.md` à un adaptateur qui renvoie vers `AGENTS.md` ;
3. vérifier `ade setup check --json` ;
4. valider une issue de test avec le provider choisi.

---

## Références

- [`AGENTS.md`](../AGENTS.md) — contrat commun de coding agent
- [`docs/AGENTS.md`](AGENTS.md) — rôles et perspectives ADE
- [`docs/DELIVERY_HARNESS.md`](DELIVERY_HARNESS.md) — contrat provider-neutral d'exécution
- [`docs/PROJECT_SETUP_CONTRACT.md`](PROJECT_SETUP_CONTRACT.md) — requirements d'un projet ADE
- [`docs/V1_ROLE_HANDOFFS.md`](V1_ROLE_HANDOFFS.md) — handoffs entre rôles
