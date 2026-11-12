import type * as Sdk from '@tanstack/ai-gemini';
import { defineMapping, target } from '../define';

// The provider ID is the models.dev ID `google`. The TanStack AI package is `@tanstack/ai-gemini`.
export default defineMapping({
  sdk: 'tanstack',
  package: '@tanstack/ai-gemini',
  provider: 'google',
  source: { providers: ['google'], types: ['chat'] },
  targets: [
    target<Sdk.GeminiTextProviderOptions, Sdk.GeminiChatModelProviderOptionsByName>({
      id: 'generate-content',
      default: true,
      baseType: 'GeminiTextProviderOptions',
      api: 'generate-content',
      modelIds: 'Sdk.GeminiTextModel',
      subTypes: 'GeminiChatModelProviderOptionsByName',
      fields: {
        temperature: { kind: 'flag', from: 'temperature' },
        topP: { kind: 'flag', from: 'top_p' },
        topK: { kind: 'flag', from: 'top_k' },
      },
    }),
  ],
  otherModelIds: {
    image: 'Sdk.GeminiImageModel',
    embedding: 'Sdk.GeminiEmbeddingModel',
    video: 'Sdk.GeminiVideoModel',
  },
});
