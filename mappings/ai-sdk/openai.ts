import type * as Sdk from '@ai-sdk/openai';
import { defineMapping, target } from '../define';

// `fast` is the newer OpenAI name of the `priority` tier. The SDK accepts both.
const serviceTier = {
  kind: 'enum',
  from: 'service_tier',
  map: { priority: ['priority', 'fast'] },
  // `auto` and `default` are valid for each model.
  extra: ['auto', 'default'],
} as const;

export default defineMapping({
  sdk: 'ai-sdk',
  package: '@ai-sdk/openai',
  provider: 'openai',
  optionsKey: 'openai',
  source: { providers: ['openai'], types: ['chat'], aisdk: '@ai-sdk/openai' },
  targets: [
    target<Sdk.OpenAILanguageModelResponsesOptions>({
      id: 'responses',
      default: true,
      baseType: 'OpenAILanguageModelResponsesOptions',
      aliases: ['OpenAIResponsesProviderOptions'],
      api: 'responses',
      modelIds: "Parameters<Sdk.OpenAIProvider['responses']>[0]",
      fields: {
        // A model without an effort list has no effort control (for example gpt-4.1).
        reasoningEffort: { kind: 'enum', from: 'reasoning.effort', missing: 'never' },
        // Changes the effort from this response on, but keeps the request-level effort, so the
        // prompt cache stays valid. Only models with effort updates (GPT-5.6 and later) have it.
        // The SDK accepts only `none` to `max`.
        reasoningEffortUpdate: {
          kind: 'enum',
          from: 'reasoning.effort',
          when: 'effort_updates',
          exclude: ['minimal', 'default'],
          missing: 'never',
        },
        serviceTier,
        store: { kind: 'flag', from: 'store' },
        promptCacheKey: { kind: 'flag', from: 'prompt_cache_key' },
        // Explicit cache TTLs exist only on models with explicit caching (GPT-5.6 and later).
        'promptCacheOptions.ttl': { kind: 'enum', from: 'cache.explicit.ttl', missing: 'never' },
      },
    }),
    target<Sdk.OpenAILanguageModelChatOptions>({
      id: 'chat',
      baseType: 'OpenAILanguageModelChatOptions',
      aliases: ['OpenAIChatLanguageModelOptions'],
      api: 'chat-completions',
      modelIds: "Parameters<Sdk.OpenAIProvider['chat']>[0]",
      fields: {
        reasoningEffort: { kind: 'enum', from: 'reasoning.effort', missing: 'never' },
        serviceTier,
        store: { kind: 'flag', from: 'store' },
        promptCacheKey: { kind: 'flag', from: 'prompt_cache_key' },
        // No `promptCacheOptions.ttl`: the chat options accept only `30m`, but models.dev lists
        // the TTLs of the Responses API (`30m` and `12h`).
      },
    }),
  ],
  otherModelIds: {
    image: "Parameters<Sdk.OpenAIProvider['image']>[0]",
    embedding: "Parameters<Sdk.OpenAIProvider['embedding']>[0]",
    speech: "Parameters<Sdk.OpenAIProvider['speech']>[0]",
    transcription: "Parameters<Sdk.OpenAIProvider['transcription']>[0]",
  },
  crossCheck: {
    module: '@ai-sdk/openai/internal',
    export: 'openaiModelCatalog',
    fields: {
      'capabilities.language.reasoning.efforts': { from: 'reasoning.effort', compare: 'list' },
      'capabilities.language.serviceTiers': { from: 'service_tier', compare: 'trueKeys' },
    },
  },
});
