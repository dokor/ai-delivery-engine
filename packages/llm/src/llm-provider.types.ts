export type LlmGenerateTextInput = {
  systemPrompt: string;
  userPrompt: string;
};

export type LlmGenerateTextResult = {
  text: string;
  metadata?: Record<string, unknown>;
};

export type LlmProvider = {
  name: string;
  generateText(input: LlmGenerateTextInput): Promise<LlmGenerateTextResult>;
};
