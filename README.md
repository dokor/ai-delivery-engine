# AI Delivery Engine

AI Delivery Engine est un projet visant à orchestrer une équipe d'agents IA capables de transformer une idée produit en backlog, puis en tâches de développement exploitables par GitHub, Codex et n8n.

L'objectif n'est pas de créer un simple workflow no-code, mais un véritable moteur de livraison logiciel réutilisable d'un projet à l'autre.

## Vision

Créer un cockpit permettant de piloter une équipe IA composée au minimum de :

- un Product Owner / Product Manager ;
- un UX/UI Designer ;
- un développeur frontend ;
- un développeur backend ;
- un QA Engineer.

Chaque agent a un rôle clair, des entrées normalisées, des sorties structurées et peut contribuer au backlog projet.

## Objectif du MVP

Le premier MVP doit transformer un brief projet en backlog actionnable.

```txt
Brief projet
↓
PO Agent
↓
Epics / User stories / Tasks
↓
GitHub Issues
```

Le premier cas d'usage cible est le site vitrine freelance web / IA.

## Principes clés

- La logique métier doit rester dans le code, pas uniquement dans n8n.
- n8n sert d'orchestrateur, pas de source de vérité.
- Les prompts doivent être versionnés.
- Les sorties des agents doivent être structurées en JSON.
- Chaque workflow doit être réutilisable pour plusieurs projets.
- GitHub doit servir de point d'ancrage pour le code, les issues et les pull requests.

## Structure cible du dépôt

```txt
ai-delivery-engine/
├── apps/
│   ├── dashboard/
│   └── api/
├── packages/
│   ├── agents/
│   ├── prompts/
│   ├── backlog/
│   ├── github/
│   └── shared/
├── workflows/
│   └── n8n/
├── docs/
│   ├── vision.md
│   ├── architecture.md
│   ├── agents.md
│   ├── backlog.md
│   ├── workflows.md
│   └── roadmap.md
└── infra/
```

## Documentation

- [Vision produit](docs/vision.md)
- [Architecture cible](docs/architecture.md)
- [Agents IA](docs/agents.md)
- [Modèle de backlog](docs/backlog.md)
- [Workflows](docs/workflows.md)
- [Roadmap](docs/roadmap.md)

## Première boucle à construire

1. Recevoir un brief projet.
2. Appeler le PO Agent.
3. Générer un backlog structuré.
4. Valider le format JSON.
5. Créer automatiquement des issues GitHub.
6. Préparer les prompts d'exécution pour Codex.

## Statut

Projet en phase d'initialisation.
