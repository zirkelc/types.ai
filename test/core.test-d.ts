import { describe, expectTypeOf, test } from 'vitest';
import type {
  ApiCapabilities,
  ModelId,
  ProviderId,
  ReasoningEffort,
  ServiceTier,
} from '../src/models';
import { models } from '../src/models/openai';

describe('core types', () => {
  test('should list the providers', () => {
    // Assert
    expectTypeOf<ProviderId>().toEqualTypeOf<'anthropic' | 'google' | 'openai'>();
  });

  test('should give the reasoning efforts of a model', () => {
    // Assert
    expectTypeOf<ReasoningEffort<'openai', 'gpt-5'>>().toEqualTypeOf<
      'minimal' | 'low' | 'medium' | 'high'
    >();
    expectTypeOf<ReasoningEffort<'openai', 'gpt-4.1'>>().toBeNever();
  });

  test('should give the service tiers of a model', () => {
    // Assert
    expectTypeOf<ServiceTier<'openai', 'gpt-6-luna'>>().toEqualTypeOf<'flex' | 'priority'>();
  });

  test('should replace top-level capabilities with API capabilities', () => {
    // Arrange
    type Responses = ApiCapabilities<'openai', 'gpt-6-luna', 'responses'>;

    // Assert
    expectTypeOf<Responses['effort_updates']>().toEqualTypeOf<true>();
  });

  test('should type the runtime data as literals', () => {
    // Arrange
    const effort = models['gpt-6-luna'].capabilities.reasoning.effort;

    // Assert
    expectTypeOf(effort).toEqualTypeOf<
      readonly ['none', 'low', 'medium', 'high', 'xhigh', 'max']
    >();
    expectTypeOf<'gpt-6-luna'>().toExtend<ModelId<'openai'>>();
  });
});
