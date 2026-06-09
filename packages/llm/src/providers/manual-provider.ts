import type { LlmProvider } from '../llm-provider.types';

export type ManualProviderOptions = {
  separator?: string;
};

export function createManualProvider(options: ManualProviderOptions = {}): LlmProvider {
  const separator = options.separator ?? '\n---\n';

  return {
    name: 'manual',
    async generateText(input) {
      const promptToCopy = [
        'SYSTEM PROMPT:',
        input.systemPrompt,
        separator,
        'USER PROMPT:',
        input.userPrompt,
        separator,
        'INSTRUCTIONS:',
        'Return JSON only. Do not include Markdown.'
      ].join('\n');

      return {
        text: promptToCopy,
        metadata: {
          provider: 'manual',
          usage: 'copy-paste'
        }
      };
    }
  };
}
