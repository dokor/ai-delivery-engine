# Workflows

Les workflows décrivent les enchaînements entre événements, agents, API et outils externes.

n8n est utilisé comme orchestrateur, mais la logique métier doit rester dans le code du projet.

## Workflow MVP : génération de backlog

```txt
Webhook new-project-brief
↓
API /projects
↓
PO Agent
↓
Validation JSON
↓
Stockage backlog
↓
Réponse utilisateur
```

## Workflow cible : création d'issues GitHub

```txt
Backlog validé
↓
API /github/issues
↓
Création epics / stories / tasks
↓
Ajout labels
↓
Lien GitHub stocké dans le backlog
```

## Workflow cible : préparation Codex

```txt
Story prête
↓
Frontend Agent ou Backend Agent
↓
Prompt Codex structuré
↓
Issue GitHub enrichie
↓
Exécution manuelle ou automatisée via Codex
```

## Workflow cible : QA

```txt
Pull Request ouverte
↓
QA Agent
↓
Checklist de validation
↓
Tests recommandés
↓
Commentaire GitHub sur la PR
```

## Convention d'export n8n

Les workflows exportés depuis n8n doivent être placés dans :

```txt
workflows/n8n/
```

Nom recommandé :

```txt
YYYY-MM-DD-workflow-name.json
```

Exemple :

```txt
2026-06-09-generate-backlog-from-brief.json
```

## Principes

- Un workflow doit avoir une responsabilité unique.
- Un workflow doit appeler l'API du moteur quand une décision métier est nécessaire.
- Les secrets ne doivent jamais être commités.
- Les workflows doivent être documentés dans ce dossier.
- Les exports doivent permettre de reconstruire l'environnement rapidement.
