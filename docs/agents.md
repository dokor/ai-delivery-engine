# Agents IA

Les agents sont les membres spécialisés de l'équipe de delivery.

Chaque agent doit avoir :

- un rôle clair ;
- un périmètre de responsabilité ;
- un format d'entrée ;
- un format de sortie ;
- des limites explicites ;
- un prompt système versionné.

## Agents cible

### PO Agent

Responsabilités :

- analyser un brief ;
- identifier les zones floues ;
- découper le besoin en epics, stories et tâches ;
- formuler les critères d'acceptation ;
- challenger la valeur métier.

Sortie attendue : backlog structuré.

### UX Agent

Responsabilités :

- proposer une structure de pages ;
- identifier les parcours utilisateurs ;
- définir les sections nécessaires ;
- suggérer les composants UI ;
- clarifier les besoins de contenu.

Sortie attendue : recommandations UX/UI et tâches associées.

### Frontend Agent

Responsabilités :

- transformer les stories en tâches frontend ;
- proposer les composants nécessaires ;
- préparer des prompts Codex orientés Next.js / React ;
- anticiper les impacts responsive, accessibilité et i18n.

Sortie attendue : tâches frontend et prompts d'implémentation.

### Backend Agent

Responsabilités :

- identifier les besoins API ;
- proposer les modèles de données ;
- préparer les tâches d'intégration ;
- cadrer les aspects sécurité, validation et persistance.

Sortie attendue : tâches backend et contrats API.

### QA Agent

Responsabilités :

- générer les cas de test ;
- écrire les critères de validation ;
- identifier les risques de régression ;
- préparer les tests manuels et automatisés.

Sortie attendue : plan de test et checklist QA.

## Format générique d'exécution

```ts
type AgentRun = {
  id: string;
  projectId: string;
  agent: 'po' | 'ux' | 'frontend' | 'backend' | 'qa';
  input: string;
  output: unknown;
  status: 'success' | 'error';
  createdAt: string;
};
```

## Règles communes

- Un agent ne doit pas produire de sortie libre non structurée pour les étapes automatisées.
- Les sorties doivent être validables par schéma.
- Un agent peut proposer des questions, mais le système doit pouvoir avancer en mode best effort.
- Les décisions importantes doivent être historisées.
- Les prompts doivent être versionnés avec le code.
