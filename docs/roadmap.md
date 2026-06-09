# Roadmap

## Phase 0 — Initialisation

Objectif : poser les bases du projet.

- Créer le dépôt GitHub.
- Ajouter README et documentation initiale.
- Définir la vision produit.
- Définir les premiers agents.
- Définir le modèle de backlog.

## Phase 1 — MVP Backlog Generator

Objectif : transformer un brief en backlog structuré.

Livrables :

- endpoint de soumission de brief ;
- PO Agent ;
- prompt système du PO Agent ;
- schéma JSON de sortie ;
- stockage simple des projets et backlog items ;
- affichage du backlog dans le dashboard.

Critère de succès :

```txt
Un brief projet permet de générer 10 à 20 backlog items exploitables.
```

## Phase 2 — GitHub Issue Sync

Objectif : synchroniser le backlog avec GitHub.

Livrables :

- création automatique d'issues ;
- labels GitHub ;
- lien entre backlog item et issue ;
- statut de synchronisation ;
- relance possible en cas d'erreur.

Critère de succès :

```txt
Un backlog validé peut être transformé en issues GitHub correctement labellisées.
```

## Phase 3 — Dev Agent & Codex Prompts

Objectif : préparer l'exécution technique.

Livrables :

- Frontend Agent ;
- Backend Agent ;
- génération de prompts Codex ;
- enrichissement des issues GitHub ;
- découpage technique plus fin.

Critère de succès :

```txt
Une story prête contient un prompt Codex suffisamment précis pour être implémentée.
```

## Phase 4 — QA Agent

Objectif : sécuriser les livraisons.

Livrables :

- génération de cas de test ;
- checklist QA ;
- commentaires automatiques sur PR ;
- recommandations de tests automatisés.

Critère de succès :

```txt
Chaque PR peut recevoir une checklist QA contextualisée.
```

## Phase 5 — Cockpit projet

Objectif : rendre le moteur utilisable au quotidien.

Livrables :

- dashboard projet ;
- suivi des agents ;
- historique des exécutions ;
- validation humaine ;
- relance d'un agent ;
- gestion multi-projets.

## Phase 6 — Industrialisation

Objectif : rendre le système réutilisable pour des projets clients.

Livrables :

- templates projet ;
- contextes réutilisables ;
- configuration par client ;
- exports n8n ;
- documentation d'installation ;
- monitoring ;
- backups.
