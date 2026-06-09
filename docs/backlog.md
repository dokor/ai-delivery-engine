# Backlog

Le backlog est la source de vérité fonctionnelle du moteur.

Il doit pouvoir être généré par l'IA, relu par un humain, puis synchronisé avec GitHub.

## Types d'items

### Epic

Regroupe un ensemble cohérent de stories.

Exemple :

```txt
Présenter les prestations freelance
```

### Story

Décrit un besoin utilisateur ou métier.

Exemple :

```txt
En tant que visiteur, je veux comprendre les prestations proposées afin de savoir si le freelance répond à mon besoin.
```

### Task

Décrit une action technique ou opérationnelle.

Exemple :

```txt
Créer le composant HeroSection de la page d'accueil.
```

### Bug

Décrit une anomalie à corriger.

## Modèle cible

```ts
type BacklogItem = {
  id: string;
  projectId: string;
  parentId?: string;
  type: 'epic' | 'story' | 'task' | 'bug';
  title: string;
  description: string;
  acceptanceCriteria?: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'ready' | 'in_progress' | 'review' | 'done';
  agentOwner?: 'po' | 'ux' | 'frontend' | 'backend' | 'qa';
  githubIssueUrl?: string;
  createdAt: string;
  updatedAt: string;
};
```

## Règles de qualité

Un backlog item est considéré comme exploitable s'il contient :

- un titre clair ;
- une description compréhensible ;
- une priorité ;
- un owner agent ou humain ;
- des critères d'acceptation pour les stories ;
- un découpage suffisamment petit pour être traité.

## Exemple de sortie PO Agent

```json
{
  "epics": [
    {
      "title": "Présenter l'offre freelance",
      "description": "Permettre aux visiteurs de comprendre les prestations proposées.",
      "priority": "high",
      "stories": [
        {
          "title": "Afficher une page d'accueil claire",
          "description": "En tant que visiteur, je veux comprendre rapidement la proposition de valeur.",
          "acceptanceCriteria": [
            "Le hero présente clairement l'offre.",
            "Un CTA de contact est visible au-dessus de la ligne de flottaison.",
            "Les principales expertises sont visibles."
          ],
          "tasks": [
            {
              "title": "Créer la section Hero",
              "agentOwner": "frontend"
            }
          ]
        }
      ]
    }
  ]
}
```

## Synchronisation GitHub

Chaque story ou task peut devenir une issue GitHub.

À terme, les labels GitHub pourront être générés à partir de :

- type ;
- priorité ;
- agent owner ;
- statut ;
- périmètre fonctionnel.
