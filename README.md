# AI Delivery Engine

AI Delivery Engine est un projet visant à orchestrer une équipe d'agents IA capables de transformer une idée produit en backlog, puis en tâches de développement exploitables par GitHub, Codex et n8n.

L'objectif n'est pas de créer un simple workflow no-code, mais un véritable moteur de livraison logiciel réutilisable d'un projet à l'autre.

## Statut actuel

Phase en cours : **Phase 1 — MVP Backlog Generator**.

Le dépôt contient désormais :

- la documentation produit et technique initiale ;
- un socle monorepo TypeScript ;
- les premiers types partagés ;
- le contrat de sortie du PO Agent ;
- le prompt système versionné du PO Agent ;
- une abstraction LLM provider-agnostic ;
- un MockProvider pour développer sans API IA ;
- un ManualProvider pour générer les prompts à utiliser manuellement dans ChatGPT ou un autre outil.

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
LLM Provider
↓
Epics / User stories / Tasks
↓
GitHub Issues
```

Le premier cas d'usage cible est le site vitrine freelance web / IA.

## Stratégie LLM

L'abonnement ChatGPT Plus ne donne pas automatiquement accès à l'API OpenAI.

Le moteur est donc conçu pour ne dépendre d'aucun fournisseur unique.

Providers prévus :

- `MockProvider` : permet de développer et tester le pipeline sans API IA ;
- `ManualProvider` : génère un prompt complet à copier/coller dans ChatGPT ou un autre assistant ;
- `OpenAiProvider` : pourra être ajouté plus tard si un accès API est activé ;
- `OllamaProvider` : pourra être ajouté pour tester des modèles locaux ;
- `N8nWebhookProvider` : pourra être ajouté si n8n orchestre l'appel au modèle.

## Principes clés

- La logique métier doit rester dans le code, pas uniquement dans n8n.
- n8n sert d'orchestrateur, pas de source de vérité.
- Les prompts doivent être versionnés.
- Les sorties des agents doivent être structurées en JSON.
- Chaque workflow doit être réutilisable pour plusieurs projets.
- GitHub doit servir de point d'ancrage pour le code, les issues et les pull requests.
- Le moteur doit rester provider-agnostic côté IA.

## Structure du dépôt

```txt
ai-delivery-engine/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   ├── agents/
│   ├── llm/
│   ├── prompts/
│   └── shared/
├── workflows/
│   └── n8n/
├── docs/
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
3. Générer un prompt complet.
4. Passer par un provider LLM.
5. Produire une sortie JSON conforme au contrat `PoAgentOutput`.
6. Valider le format JSON.
7. Créer automatiquement des issues GitHub.

## Prochaine étape technique

Créer un runner local capable de prendre un brief en entrée et de produire une sortie conforme au contrat `PoAgentOutput`, d'abord via `MockProvider`, puis via `ManualProvider`.
