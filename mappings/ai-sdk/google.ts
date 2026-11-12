import type * as Sdk from '@ai-sdk/google';
import { defineMapping, target } from '../define';

export default defineMapping({
  sdk: 'ai-sdk',
  package: '@ai-sdk/google',
  provider: 'google',
  optionsKey: 'google',
  source: { providers: ['google'], types: ['chat'], aisdk: '@ai-sdk/google' },
  targets: [
    target<Sdk.GoogleLanguageModelOptions>({
      id: 'generate-content',
      default: true,
      baseType: 'GoogleLanguageModelOptions',
      aliases: ['GoogleGenerativeAIProviderOptions'],
      api: 'generate-content',
      // Some image models (for example gemini-2.5-flash-image) are also language models.
      modelIds: "Parameters<Sdk.GoogleProvider['languageModel']>[0]",
      fields: {
        // Gemini 3 and later take a thinking level, Gemini 2.5 takes a token budget.
        'thinkingConfig.thinkingLevel': {
          kind: 'enum',
          from: 'reasoning.effort',
          missing: 'never',
        },
        'thinkingConfig.thinkingBudget': {
          kind: 'flag',
          from: 'reasoning.budget',
          missing: 'never',
        },
        serviceTier: { kind: 'enum', from: 'service_tier', extra: ['standard'] },
      },
    }),
  ],
  otherModelIds: {
    image: "Parameters<Sdk.GoogleProvider['image']>[0]",
    embedding: "Parameters<Sdk.GoogleProvider['embedding']>[0]",
    video: "Parameters<Sdk.GoogleProvider['video']>[0]",
    speech: "Parameters<Sdk.GoogleProvider['speech']>[0]",
    transcription: "Parameters<Sdk.GoogleProvider['transcription']>[0]",
  },
});
