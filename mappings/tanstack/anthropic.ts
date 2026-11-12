import type * as Sdk from '@tanstack/ai-anthropic';
import { defineMapping, target } from '../define';

export default defineMapping({
  sdk: 'tanstack',
  package: '@tanstack/ai-anthropic',
  provider: 'anthropic',
  source: { providers: ['anthropic'], types: ['chat'] },
  targets: [
    target<Sdk.AnthropicTextProviderOptions, Sdk.AnthropicChatModelProviderOptionsByName>({
      id: 'messages',
      default: true,
      baseType: 'AnthropicTextProviderOptions',
      api: 'messages',
      modelIds: 'Sdk.AnthropicChatModel',
      subTypes: 'AnthropicChatModelProviderOptionsByName',
      fields: {
        // Newer Claude models do not accept sampling parameters.
        temperature: { kind: 'flag', from: 'temperature' },
        top_p: { kind: 'flag', from: 'top_p' },
        top_k: { kind: 'flag', from: 'top_k' },
        'cache_control.ttl': { kind: 'enum', from: 'cache.explicit.ttl' },
      },
    }),
  ],
});
