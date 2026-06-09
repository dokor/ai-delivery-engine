# Architecture

L'architecture cible sépare clairement :

- l'interface utilisateur ;
- l'API métier ;
- les agents ;
- les prompts ;
- l'orchestration ;
- les intégrations externes.

## Vue globale

```txt
Dashboard Next.js
↓
API AI Delivery Engine
↓
Agents métier
↓
Backlog / GitHub / Codex
↓
n8n pour orchestration et automatisations
```

## Rôle des composants

### Dashboard

Interface de pilotage du moteur.

Fonctionnalités attendues :

- créer un projet ;
- saisir un brief ;
- visualiser le backlog ;
- lancer un agent ;
- suivre les exécutions ;
- valider ou rejeter les sorties IA.

### API

L'API contient la logique métier.

Elle doit exposer des endpoints pour :

- créer un projet ;
- lancer une génération de backlog ;
- valider une sortie agent ;
- créer des issues GitHub ;
- historiser les exécutions d'agents.

### Packages agents

Contient la définition des agents :

- rôle ;
- responsabilités ;
- format d'entrée ;
- format de sortie ;
- règles métier ;
- prompt système associé.

### Packages prompts

Contient les prompts versionnés.

Les prompts doivent être considérés comme du code :

- versionnés ;
- relus ;
- testés ;
- améliorés progressivement.

### n8n

n8n est utilisé comme orchestrateur.

Il peut :

- recevoir des webhooks ;
- déclencher l'API ;
- connecter GitHub, Notion, Airtable ou Slack ;
- planifier des traitements ;
- automatiser les notifications.

n8n ne doit pas contenir toute la logique métier du projet.

## Structure cible

```txt
apps/dashboard   Interface web
apps/api         API métier
packages/agents  Définition et exécution des agents
packages/prompts Prompts versionnés
packages/backlog Modèle et règles backlog
packages/github  Intégration GitHub
packages/shared  Types partagés
workflows/n8n    Exports des workflows n8n
infra            Docker, déploiement, reverse proxy
```

## Principe de réutilisabilité

Chaque projet doit être configurable par :

- son nom ;
- son contexte ;
- son repository GitHub ;
- ses contraintes techniques ;
- ses règles métier ;
- ses objectifs business.

Les workflows et agents doivent rester identiques autant que possible.
