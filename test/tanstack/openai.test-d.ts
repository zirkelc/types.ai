import { chat } from '@tanstack/ai';
import type * as Sdk from '@tanstack/ai-openai';
import { openaiText } from '@tanstack/ai-openai';
import { describe, expectTypeOf, test } from 'vitest';
import type { NotALanguageModel } from '../../src/core/model-type';
import type { ModelOptions } from '../../src/tanstack';
import type { OpenAITextProviderOptionsByModelGenerated } from '../../src/generated/tanstack/openai';
import type { OpenAITextProviderOptions } from '../../src/tanstack/openai';

describe('ModelOptions<openai> for TanStack AI', () => {
  test('should start from the TanStack type of the model', () => {
    // Arrange
    type Luna = ModelOptions<'openai', 'gpt-6-luna'>;

    // Assert
    expectTypeOf<Luna>().toExtend<Sdk.OpenAIChatModelProviderOptionsByName['gpt-6-luna']>();
    expectTypeOf<Luna['verbosity']>().toEqualTypeOf<
      Sdk.OpenAIChatModelProviderOptionsByName['gpt-6-luna']['verbosity']
    >();
  });

  test('should remove sampling options that the model does not accept', () => {
    // Arrange
    // @ts-expect-error gpt-6-luna does not accept temperature
    const luna = { temperature: 0.5 } satisfies ModelOptions<'openai', 'gpt-6-luna'>;
    const gpt41 = { temperature: 0.5 } satisfies ModelOptions<'openai', 'gpt-4.1'>;

    // Assert
    expectTypeOf(luna).not.toBeNever();
    expectTypeOf(gpt41.temperature).toEqualTypeOf<number>();
  });

  test('should narrow service_tier to the tiers of the model', () => {
    // Arrange
    type Gpt41 = ModelOptions<'openai', 'gpt-4.1'>;

    // Assert
    expectTypeOf<Gpt41['service_tier']>().toEqualTypeOf<
      'priority' | 'auto' | 'default' | undefined
    >();
  });

  test('should keep the TanStack type for a model that models.dev does not know', () => {
    // Arrange
    type Known = keyof Sdk.OpenAIChatModelProviderOptionsByName;
    type Missing = Exclude<Known, keyof OpenAITextProviderOptionsByModelGenerated>;
    type Example = Extract<Missing, 'gpt-6-luna-pro'>;

    // Assert
    expectTypeOf<Example>().toEqualTypeOf<'gpt-6-luna-pro'>();
    expectTypeOf<OpenAITextProviderOptions<Example>>().toEqualTypeOf<
      Sdk.OpenAIChatModelProviderOptionsByName[Example]
    >();
  });

  test('should equal the original type without a model', () => {
    // Assert
    expectTypeOf<OpenAITextProviderOptions>().toEqualTypeOf<Sdk.OpenAITextProviderOptions>();
  });

  test('should work as modelOptions of chat()', () => {
    // Act
    const stream = chat({
      adapter: openaiText('gpt-6-luna'),
      threadId: 'thread-1',
      messages: [{ role: 'user', content: 'Hello' }],
      modelOptions: { service_tier: 'flex', store: false } satisfies ModelOptions<
        'openai',
        'gpt-6-luna'
      >,
    });

    // Assert
    expectTypeOf(stream).not.toBeNever();
  });
});

describe('model IDs of other model types for TanStack AI', () => {
  test('should give an error type for an image model', () => {
    // Arrange
    type Options = ModelOptions<'openai', 'gpt-image-2'>;
    // @ts-expect-error gpt-image-2 is an image model
    const options = { temperature: 1 } satisfies Options;

    // Assert
    expectTypeOf<Options>().toEqualTypeOf<NotALanguageModel<'gpt-image-2', 'image'>>();
    expectTypeOf(options).not.toBeNever();
  });
});
