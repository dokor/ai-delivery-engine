import type { LlmProvider } from '../llm-provider.types';

const MOCK_PO_AGENT_RESPONSE = {
  projectSummary: 'Site vitrine freelance web et IA destiné à présenter les prestations, rassurer les prospects et générer des demandes de contact qualifiées.',
  assumptions: [
    'Le site vise principalement des PME, startups et équipes produit ayant besoin de renfort technique.',
    'Le premier MVP doit rester simple et privilégier la conversion plutôt que des fonctionnalités complexes.',
    'Le site sera développé avec une stack web moderne, probablement Next.js.'
  ],
  questions: [
    'Quelles prestations doivent être mises en avant en priorité ?',
    'Souhaites-tu un formulaire de contact simple ou une prise de rendez-vous directe ?',
    'Faut-il prévoir une version anglaise dès le MVP ?'
  ],
  epics: [
    {
      title: 'Présenter la proposition de valeur',
      description: 'Permettre au visiteur de comprendre rapidement l’offre freelance web et IA.',
      priority: 'high',
      stories: [
        {
          title: 'Afficher une page d’accueil claire',
          userStory: 'En tant que visiteur, je veux comprendre rapidement les prestations proposées afin de savoir si le freelance peut répondre à mon besoin.',
          description: 'Créer une page d’accueil orientée conversion avec un message clair, des expertises visibles et un appel à l’action.',
          acceptanceCriteria: [
            'Le message principal est visible au-dessus de la ligne de flottaison.',
            'Les expertises principales sont affichées clairement.',
            'Un appel à l’action permet de contacter le freelance.'
          ],
          priority: 'high',
          tasks: [
            {
              title: 'Définir la structure UX de la homepage',
              description: 'Proposer les sections principales de la page d’accueil.',
              agentOwner: 'ux'
            },
            {
              title: 'Créer le composant HeroSection',
              description: 'Implémenter la section principale de la homepage.',
              agentOwner: 'frontend'
            },
            {
              title: 'Préparer les critères de validation homepage',
              description: 'Lister les vérifications fonctionnelles et responsive.',
              agentOwner: 'qa'
            }
          ]
        }
      ]
    }
  ]
} as const;

export const mockProvider: LlmProvider = {
  name: 'mock',
  async generateText() {
    return {
      text: JSON.stringify(MOCK_PO_AGENT_RESPONSE, null, 2),
      metadata: {
        provider: 'mock',
        deterministic: true
      }
    };
  }
};
