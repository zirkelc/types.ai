import type * as Sdk from '@ai-sdk/openai';
import { describe, expectTypeOf, test } from 'vitest';
import type { AISDKModelId, ModelOptions, ProviderOptions } from '../../src/ai-sdk';
import type { NotALanguageModel } from '../../src/core/model-type';
import type {
  OpenAILanguageModelChatOptions,
  OpenAILanguageModelResponsesOptions,
  OpenAIResponsesProviderOptions,
} from '../../src/ai-sdk/openai';

describe('ModelOptions<openai>', () => {
  test('should narrow reasoningEffort to the efforts of the model', () => {
    // Arrange
    type Gpt5 = ModelOptions<'openai', 'gpt-5'>;
    type Luna = ModelOptions<'openai', 'gpt-6-luna'>;

    // Assert
    expectTypeOf<Gpt5['reasoningEffort']>().toEqualTypeOf<
      'minimal' | 'low' | 'medium' | 'high' | null | undefined
    >();
    expectTypeOf<Luna['reasoningEffort']>().toEqualTypeOf<
      'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' | null | undefined
    >();
  });

  test('should reject an effort that the model does not support', () => {
    // Arrange
    const valid = { reasoningEffort: 'none' } satisfies ModelOptions<'openai', 'gpt-6-luna'>;
    // @ts-expect-error gpt-6-luna has no 'minimal' effort
    const invalid = { reasoningEffort: 'minimal' } satisfies ModelOptions<'openai', 'gpt-6-luna'>;

    // Assert
    expectTypeOf(valid).toExtend<Sdk.OpenAILanguageModelResponsesOptions>();
    expectTypeOf(invalid).not.toBeNever();
  });

  test('should allow reasoningEffortUpdate only for models with effort updates', () => {
    // Arrange
    const luna = { reasoningEffortUpdate: 'low' } satisfies ModelOptions<'openai', 'gpt-6-luna'>;
    // @ts-expect-error gpt-5 has no effort updates
    const gpt5 = { reasoningEffortUpdate: 'low' } satisfies ModelOptions<'openai', 'gpt-5'>;

    // Assert
    expectTypeOf(luna.reasoningEffortUpdate).toEqualTypeOf<'low'>();
    expectTypeOf(gpt5).not.toBeNever();
  });

  test('should make reasoningEffort never for a model without reasoning', () => {
    // Arrange
    type Gpt41 = ModelOptions<'openai', 'gpt-4.1'>;

    // Assert
    expectTypeOf<Gpt41['reasoningEffort']>().toEqualTypeOf<null | undefined>();
  });

  test('should keep fields that the mapping does not change', () => {
    // Arrange
    type Luna = ModelOptions<'openai', 'gpt-6-luna'>;

    // Assert
    expectTypeOf<Luna['textVerbosity']>().toEqualTypeOf<
      Sdk.OpenAILanguageModelResponsesOptions['textVerbosity']
    >();
  });

  test('should give the original SDK type for an unknown model ID', () => {
    // Arrange
    type Unknown = ModelOptions<'openai', 'gpt-4o-2024-08-06-unknown'>;

    // Assert
    expectTypeOf<Unknown>().toEqualTypeOf<Sdk.OpenAILanguageModelResponsesOptions>();
  });

  test('should use the chat options for the chat target', () => {
    // Arrange
    type Chat = ModelOptions<'openai', 'gpt-5', 'chat'>;

    // Assert
    expectTypeOf<Chat>().toExtend<Sdk.OpenAILanguageModelChatOptions>();
    expectTypeOf<Chat['reasoningEffort']>().toEqualTypeOf<
      'minimal' | 'low' | 'medium' | 'high' | undefined
    >();
  });

  test('should extend the original SDK types for each model', () => {
    // Arrange
    type AllResponses = ModelOptions<
      'openai',
      'gpt-5' | 'gpt-5.1' | 'gpt-6-luna' | 'o3' | 'gpt-4.1'
    >;
    type AllChat = ModelOptions<'openai', 'gpt-5' | 'gpt-6-luna' | 'o3', 'chat'>;

    // Assert
    expectTypeOf<AllResponses>().toExtend<Sdk.OpenAILanguageModelResponsesOptions>();
    expectTypeOf<AllChat>().toExtend<Sdk.OpenAILanguageModelChatOptions>();
  });
});

describe('ProviderOptions<openai>', () => {
  test('should put the options under the provider key', () => {
    // Arrange
    const options = {
      openai: { reasoningEffort: 'high', serviceTier: 'flex' },
    } satisfies ProviderOptions<'openai', 'gpt-6-luna'>;

    // Assert
    expectTypeOf(options.openai.reasoningEffort).toEqualTypeOf<'high'>();
  });
});

describe('override import ai-types/ai-sdk/openai', () => {
  test('should equal the original type without a model', () => {
    // Assert
    expectTypeOf<OpenAILanguageModelResponsesOptions>().toEqualTypeOf<Sdk.OpenAILanguageModelResponsesOptions>();
    expectTypeOf<OpenAILanguageModelChatOptions>().toEqualTypeOf<Sdk.OpenAILanguageModelChatOptions>();
  });

  test('should narrow with a model', () => {
    // Arrange
    type Luna = OpenAILanguageModelResponsesOptions<'gpt-6-luna'>;
    type Alias = OpenAIResponsesProviderOptions<'gpt-6-luna'>;

    // Assert
    expectTypeOf<Luna>().toEqualTypeOf<ModelOptions<'openai', 'gpt-6-luna'>>();
    expectTypeOf<Alias>().toEqualTypeOf<Luna>();
  });

  test('should re-export the other SDK types', () => {
    // Arrange
    type Metadata = import('../../src/ai-sdk/openai').OpenAIResponsesSystemMessageOptions;

    // Assert
    expectTypeOf<Metadata>().toEqualTypeOf<Sdk.OpenAIResponsesSystemMessageOptions>();
  });
});

describe('two providers', () => {
  test('should check each provider against its own model with an intersection', () => {
    // Arrange
    type Options = ProviderOptions<'openai', 'gpt-6-luna'> &
      ProviderOptions<'anthropic', 'claude-opus-5'>;

    // Act
    const valid = {
      openai: { reasoningEffort: 'none' },
      anthropic: { effort: 'max' },
    } satisfies Options;
    const invalid = {
      // @ts-expect-error gpt-6-luna has no 'minimal' effort
      openai: { reasoningEffort: 'minimal' },
      // @ts-expect-error claude-opus-5 has no 'none' effort
      anthropic: { effort: 'none' },
    } satisfies Options;

    // Assert
    expectTypeOf(valid.anthropic.effort).toEqualTypeOf<'max'>();
    expectTypeOf(invalid).not.toBeNever();
  });

  test('should check each provider with satisfies on each key', () => {
    // Act
    const options = {
      openai: { reasoningEffort: 'none' } satisfies ModelOptions<'openai', 'gpt-6-luna'>,
      anthropic: { effort: 'max' } satisfies ModelOptions<'anthropic', 'claude-opus-5'>,
    };

    // Assert
    expectTypeOf(options.openai.reasoningEffort).toEqualTypeOf<'none'>();
  });
});

describe('model IDs of other model types', () => {
  test('should give an error type for an image model', () => {
    // Arrange
    type Override = OpenAILanguageModelResponsesOptions<'gpt-image-2'>;
    type Generic = ModelOptions<'openai', 'gpt-image-2'>;
    // @ts-expect-error gpt-image-2 is an image model
    const override = { reasoningEffort: 'low' } satisfies Override;
    // @ts-expect-error gpt-image-2 is an image model
    const generic = { reasoningEffort: 'low' } satisfies Generic;

    // Assert
    expectTypeOf<Override>().toEqualTypeOf<NotALanguageModel<'gpt-image-2', 'image'>>();
    expectTypeOf(override).not.toBeNever();
    expectTypeOf(generic).not.toBeNever();
  });

  test('should accept a model ID that only the SDK knows', () => {
    // Assert
    expectTypeOf<'gpt-5.1-2025-11-13'>().toExtend<AISDKModelId<'openai'>>();
    expectTypeOf<
      OpenAILanguageModelResponsesOptions<'gpt-5.1-2025-11-13'>
    >().toEqualTypeOf<Sdk.OpenAILanguageModelResponsesOptions>();
  });

  test('should still give the original type for an unknown model ID', () => {
    // Assert
    expectTypeOf<
      OpenAILanguageModelResponsesOptions<'gpt-99-unknown'>
    >().toEqualTypeOf<Sdk.OpenAILanguageModelResponsesOptions>();
  });
});
