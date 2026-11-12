import { describe, expect, test } from 'vitest';
import { emitProvider } from './emit';
import type { Mapping } from '../../mappings/define';
import type { ModelsDevModel } from './models-dev-schema';
import type { DataFile } from './select';

function model(id: string, capabilities: Partial<ModelsDevModel['capabilities']>): ModelsDevModel {
  return {
    id,
    name: id.toUpperCase(),
    type: 'chat',
    release_date: '2026-01-01',
    modalities: { input: ['text'], output: ['text'] },
    capabilities: { tools: { supported: true }, reasoning: { supported: false }, ...capabilities },
    api: { responses: { sdk: { aisdk: '@ai-sdk/openai' } } },
  };
}

const data: DataFile = {
  source: 'fixture',
  providers: {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      models: {
        'model-a': model('model-a', { reasoning: { supported: true, effort: ['low', 'high'] } }),
        'model-b': model('model-b', { reasoning: { supported: true, effort: ['low', 'high'] } }),
        'model-c': model('model-c', {}),
        'model-d': { ...model('model-d', {}), api: { other: {} } },
      },
    },
  },
};

const mapping: Mapping = {
  sdk: 'ai-sdk',
  package: '@ai-sdk/openai',
  provider: 'openai',
  optionsKey: 'openai',
  source: { providers: ['openai'], types: ['chat'] },
  targets: [
    {
      id: 'responses',
      baseType: 'OpenAILanguageModelResponsesOptions',
      api: 'responses',
      modelIds: "Parameters<Sdk.OpenAIProvider['responses']>[0]",
      fields: { reasoningEffort: { kind: 'enum', from: 'reasoning.effort' } },
    },
  ],
  otherModelIds: { image: "Parameters<Sdk.OpenAIProvider['image']>[0]" },
};

describe('emitProvider', () => {
  test('should share one shape between models with the same patch', () => {
    // Act
    const { types } = emitProvider({ data, mapping });

    // Assert
    const shapes = types.match(/^type Responses_[0-9a-f]{8} =/gm) ?? [];
    expect(shapes.length).toBe(1);
    expect(types).toContain("reasoningEffort: 'low' | 'high';");
  });

  test('should use the base type for a model without changes', () => {
    // Act
    const { types } = emitProvider({ data, mapping });

    // Assert
    expect(types).toContain("'model-c': ResponsesBase;");
  });

  test('should only select models with the target API of the SDK package', () => {
    // Act
    const { types } = emitProvider({ data, mapping });

    // Assert
    expect(types).not.toContain('model-d');
  });

  test('should emit a check for each mapped field and for the shapes', () => {
    // Act
    const { check } = emitProvider({ data, mapping });

    // Assert
    expect(check).toContain(
      "export type Check_responses_reasoningEffort_exists = Assert<HasKey<Sdk.OpenAILanguageModelResponsesOptions, 'reasoningEffort'>>;",
    );
    expect(check).toContain(
      "Assert<Extends<'low' | 'high', NonNullable<Sdk.OpenAILanguageModelResponsesOptions['reasoningEffort']>>>",
    );
    expect(check).toContain('export type Check_responses_shapes =');
  });
});

describe('emitProvider model IDs', () => {
  test('should read the model IDs of the target and of other model types from the SDK', () => {
    // Act
    const { types } = emitProvider({ data, mapping });

    // Assert
    expect(types).toContain(
      "export type ResponsesModelIds = KnownModelIds<Parameters<Sdk.OpenAIProvider['responses']>[0]>;",
    );
    expect(types).toContain("image: KnownModelIds<Parameters<Sdk.OpenAIProvider['image']>[0]>;");
    expect(types).toContain(
      'type ResponsesWrongModels = WrongModels<ResponsesModelIds, OtherModelIds>;',
    );
    expect(types).toContain(
      'MODEL extends keyof ResponsesWrongModels ? ResponsesWrongModels[MODEL]',
    );
  });

  test('should check that each list of model IDs has literals', () => {
    // Act
    const { check } = emitProvider({ data, mapping });

    // Assert
    expect(check).toContain('export type Check_responses_model_ids =');
    expect(check).toContain('export type Check_other_model_ids_image =');
  });

  test('should have no other model IDs without a list in the mapping', () => {
    // Act
    const { types } = emitProvider({ data, mapping: { ...mapping, otherModelIds: undefined } });

    // Assert
    expect(types).toContain('export type OtherModelIds = Record<never, never>;');
  });
});
