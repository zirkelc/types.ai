import type * as Sdk from '@ai-sdk/google';
import { describe, expectTypeOf, test } from 'vitest';
import type { AISDKModelId, ModelOptions } from '../../src/ai-sdk';
import type { NotALanguageModel } from '../../src/core/model-type';
import type { GoogleLanguageModelOptions } from '../../src/ai-sdk/google';

type ThinkingConfig<MODEL extends string> =
  ModelOptions<'google', MODEL> extends { thinkingConfig?: infer CONFIG }
    ? NonNullable<CONFIG>
    : never;

describe('ModelOptions<google>', () => {
  test('should allow thinkingLevel only for models with effort control', () => {
    // Assert
    expectTypeOf<ThinkingConfig<'gemini-3.5-flash'>['thinkingLevel']>().toEqualTypeOf<
      'minimal' | 'low' | 'medium' | 'high' | undefined
    >();
    expectTypeOf<ThinkingConfig<'gemini-2.5-pro'>['thinkingLevel']>().toEqualTypeOf<undefined>();
  });

  test('should allow thinkingBudget only for models with a budget', () => {
    // Assert
    expectTypeOf<ThinkingConfig<'gemini-2.5-pro'>['thinkingBudget']>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<ThinkingConfig<'gemini-3.5-flash'>['thinkingBudget']>().toEqualTypeOf<undefined>();
  });

  test('should extend the original SDK type', () => {
    // Assert
    expectTypeOf<
      ModelOptions<'google', 'gemini-2.5-pro' | 'gemini-3.5-flash'>
    >().toExtend<Sdk.GoogleLanguageModelOptions>();
  });
});

describe('model IDs of other model types for google', () => {
  test('should keep the options of an image model that is also a language model', () => {
    // Arrange
    const options = {
      responseModalities: ['TEXT', 'IMAGE'],
    } satisfies GoogleLanguageModelOptions<'gemini-2.5-flash-image'>;

    // Assert
    expectTypeOf<
      GoogleLanguageModelOptions<'gemini-2.5-flash-image'>
    >().toEqualTypeOf<Sdk.GoogleLanguageModelOptions>();
    expectTypeOf(options).not.toBeNever();
  });

  test('should give an error type for an embedding model', () => {
    // Arrange
    type Options = ModelOptions<'google', 'gemini-embedding-001'>;
    // @ts-expect-error gemini-embedding-001 is an embedding model
    const options = { responseModalities: ['TEXT'] } satisfies Options;

    // Assert
    expectTypeOf<Options>().toEqualTypeOf<NotALanguageModel<'gemini-embedding-001', 'embedding'>>();
    expectTypeOf(options).not.toBeNever();
  });

  test('should accept the language model IDs of the SDK', () => {
    // Assert
    expectTypeOf<'gemini-2.5-flash-image'>().toExtend<AISDKModelId<'google'>>();
  });
});
