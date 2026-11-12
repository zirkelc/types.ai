import type * as Sdk from '@ai-sdk/anthropic';
import { defineMapping, target } from '../define';

export default defineMapping({
  sdk: 'ai-sdk',
  package: '@ai-sdk/anthropic',
  provider: 'anthropic',
  optionsKey: 'anthropic',
  source: { providers: ['anthropic'], types: ['chat'], aisdk: '@ai-sdk/anthropic' },
  targets: [
    target<Sdk.AnthropicLanguageModelOptions>({
      id: 'messages',
      default: true,
      baseType: 'AnthropicLanguageModelOptions',
      aliases: ['AnthropicProviderOptions'],
      api: 'messages',
      modelIds: "Parameters<Sdk.AnthropicProvider['messages']>[0]",
      fields: {
        effort: { kind: 'enum', from: 'reasoning.effort', missing: 'never' },
        // Only `adaptive` is conditional: models without effort control have no adaptive
        // thinking. models.dev and the SDK catalog disagree on which models can disable thinking
        // or take a budget, thus `enabled` and `disabled` stay valid for each model.
        thinking: {
          kind: 'variants',
          discriminator: 'type',
          variants: { adaptive: { when: 'reasoning.effort' } },
        },
        // The `fast` service tier of models.dev is the `speed` option of the SDK.
        speed: {
          kind: 'enum',
          from: 'service_tier',
          exclude: ['flex', 'priority', 'ultrafast', 'standby'],
          extra: ['standard'],
        },
        'cacheControl.ttl': { kind: 'enum', from: 'cache.explicit.ttl' },
      },
    }),
  ],
  crossCheck: {
    module: '@ai-sdk/anthropic/internal',
    export: 'anthropicModelCatalog',
    fields: {
      'capabilities.language.reasoning.efforts': { from: 'reasoning.effort', compare: 'list' },
    },
  },
});
