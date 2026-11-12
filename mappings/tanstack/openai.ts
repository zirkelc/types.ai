import type * as Sdk from '@tanstack/ai-openai';
import { defineMapping, target, type TargetFields } from '../define';

// TanStack AI keeps the OpenAI request field names (snake_case) and has the sampling options in
// `modelOptions`. Reasoning is the top-level `reasoning` option of `chat()`, which TanStack AI
// already types per model, thus it is not in this mapping.
const fields = {
  service_tier: {
    kind: 'enum',
    from: 'service_tier',
    // TanStack AI does not accept `ultrafast` (and has no `fast` alias).
    exclude: ['ultrafast'],
    extra: ['auto', 'default'],
  },
  store: { kind: 'flag', from: 'store' },
  prompt_cache_key: { kind: 'flag', from: 'prompt_cache_key' },
  temperature: { kind: 'flag', from: 'temperature' },
  top_p: { kind: 'flag', from: 'top_p' },
} as const satisfies TargetFields<Sdk.OpenAITextProviderOptions>;

export default defineMapping({
  sdk: 'tanstack',
  package: '@tanstack/ai-openai',
  provider: 'openai',
  source: { providers: ['openai'], types: ['chat'] },
  targets: [
    target<Sdk.OpenAITextProviderOptions, Sdk.OpenAIChatModelProviderOptionsByName>({
      id: 'responses',
      default: true,
      baseType: 'OpenAITextProviderOptions',
      api: 'responses',
      modelIds: 'Sdk.OpenAIChatModel',
      subTypes: 'OpenAIChatModelProviderOptionsByName',
      fields,
    }),
    target<Sdk.OpenAIChatCompletionsProviderOptions, Sdk.OpenAIChatModelProviderOptionsByName>({
      id: 'chat',
      baseType: 'OpenAIChatCompletionsProviderOptions',
      api: 'chat-completions',
      modelIds: 'Sdk.OpenAIChatModel',
      subTypes: 'OpenAIChatModelProviderOptionsByName',
      fields,
    }),
  ],
  otherModelIds: {
    image: 'Sdk.OpenAIImageModel',
    embedding: 'Sdk.OpenAIEmbeddingModel',
    speech: 'Sdk.OpenAITTSModel',
    transcription: 'Sdk.OpenAITranscriptionModel',
    video: 'Sdk.OpenAIVideoModel',
  },
});
