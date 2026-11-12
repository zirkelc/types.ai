import type * as Sdk from '@ai-sdk/anthropic';
import { describe, expectTypeOf, test } from 'vitest';
import type { ModelOptions } from '../../src/ai-sdk';
import type { AnthropicLanguageModelOptions } from '../../src/ai-sdk/anthropic';

describe('ModelOptions<anthropic>', () => {
  test('should narrow effort to the efforts of the model', () => {
    // Arrange
    type Opus46 = ModelOptions<'anthropic', 'claude-opus-4-6'>;

    // Assert
    expectTypeOf<Opus46['effort']>().toEqualTypeOf<'low' | 'medium' | 'high' | 'max' | undefined>();
  });

  test('should remove adaptive thinking for a model without effort control', () => {
    // Arrange
    type Sonnet45 = NonNullable<ModelOptions<'anthropic', 'claude-sonnet-4-5'>['thinking']>;
    // @ts-expect-error claude-sonnet-4-5 has no adaptive thinking
    const adaptive = { thinking: { type: 'adaptive' } } satisfies ModelOptions<
      'anthropic',
      'claude-sonnet-4-5'
    >;

    // Assert
    expectTypeOf<Extract<Sonnet45, { type: 'adaptive' }>>().toBeNever();
    expectTypeOf<Extract<Sonnet45, { type: 'enabled' }>>().not.toBeNever();
    expectTypeOf(adaptive).not.toBeNever();
  });

  test('should allow speed fast only for models with the fast tier', () => {
    // Arrange
    type Opus5 = ModelOptions<'anthropic', 'claude-opus-5'>;
    type Sonnet55 = ModelOptions<'anthropic', 'claude-sonnet-5-5'>;

    // Assert
    expectTypeOf<Opus5['speed']>().toEqualTypeOf<'fast' | 'standard' | undefined>();
    expectTypeOf<Sonnet55['speed']>().toEqualTypeOf<Sdk.AnthropicLanguageModelOptions['speed']>();
  });

  test('should equal the original type without a model', () => {
    // Assert
    expectTypeOf<AnthropicLanguageModelOptions>().toEqualTypeOf<Sdk.AnthropicLanguageModelOptions>();
    expectTypeOf<
      ModelOptions<'anthropic', 'claude-opus-5'>
    >().toExtend<Sdk.AnthropicLanguageModelOptions>();
  });
});
