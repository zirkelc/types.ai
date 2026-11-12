import type * as Sdk from '@tanstack/ai-anthropic';
import { describe, expectTypeOf, test } from 'vitest';
import type { ModelOptions } from '../../src/tanstack';

describe('ModelOptions<anthropic> for TanStack AI', () => {
  test('should remove sampling options for models without them', () => {
    // Arrange
    // @ts-expect-error claude-opus-4-7 does not accept temperature
    const opus47 = { temperature: 0.5 } satisfies ModelOptions<'anthropic', 'claude-opus-4-7'>;
    const haiku45 = { temperature: 0.5 } satisfies ModelOptions<'anthropic', 'claude-haiku-4-5'>;

    // Assert
    expectTypeOf(opus47).not.toBeNever();
    expectTypeOf(haiku45.temperature).toEqualTypeOf<number>();
  });

  test('should narrow the cache TTL', () => {
    // Arrange
    type CacheControl = NonNullable<ModelOptions<'anthropic', 'claude-haiku-4-5'>['cache_control']>;

    // Assert
    expectTypeOf<CacheControl['ttl']>().toEqualTypeOf<'5m' | '1h' | undefined>();
  });

  test('should extend the TanStack type of each model', () => {
    // Assert
    expectTypeOf<ModelOptions<'anthropic', 'claude-opus-5'>>().toExtend<
      Sdk.AnthropicChatModelProviderOptionsByName['claude-opus-5']
    >();
  });
});
