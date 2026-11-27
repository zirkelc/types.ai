import { describe, expect, test } from 'vitest';
import { emitModels, emitProvider } from './emit';
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

describe('emitProvider nested fields', () => {
  const cacheData: DataFile = {
    source: 'fixture',
    providers: {
      openai: {
        id: 'openai',
        name: 'OpenAI',
        models: {
          explicit: model('explicit', { cache: { explicit: { ttl: ['30m'] } } }),
          implicit: model('implicit', { cache: { implicit: { min_tokens: 1_024 } } }),
        },
      },
    },
  };
  const cacheMapping: Mapping = {
    ...mapping,
    targets: [
      {
        ...mapping.targets[0]!,
        fields: {
          promptCacheOptions: { kind: 'flag', from: 'cache.explicit', missing: 'never' },
          'promptCacheOptions.ttl': { kind: 'enum', from: 'cache.explicit.ttl', missing: 'never' },
        },
      },
    ],
  };

  test('should narrow the nested fields when the parent field keeps its type', () => {
    // Act
    const { types } = emitProvider({ data: cacheData, mapping: cacheMapping });

    // Assert
    expect(types).toContain(
      "promptCacheOptions: Patch<NonNullable<ResponsesBase['promptCacheOptions']>, { ttl: '30m'; }>;",
    );
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

describe('emitModels', () => {
  const provider = data.providers.openai!;

  test('should emit one module per model with the data of only that model', () => {
    // Act
    const { modelFiles } = emitModels({ providerId: 'openai', provider });

    // Assert
    expect(modelFiles.map((file) => file.id)).toEqual(['model-a', 'model-b', 'model-c', 'model-d']);
    const modelC = modelFiles.find((file) => file.id === 'model-c')!;
    expect(modelC.types).toContain(' */\nexport const model = {');
    expect(modelC.types).toContain('"id":"model-c"');
    expect(modelC.types).not.toContain('model-a');
    expect(modelC.entry).toContain(
      "export { model, type Model } from '../../generated/models/openai/model-c';",
    );
  });

  test('should document a model with one tag for each value that models.dev has', () => {
    // Arrange
    const documented = {
      ...provider,
      models: {
        'model-x': {
          ...model('model-x', {
            reasoning: {
              supported: true,
              effort: ['low', 'high'],
              budget: { min: 1_024 },
              default: { type: 'effort', value: 'high' },
            },
          }),
          name: 'Model X',
          family: 'model',
          status: 'deprecated',
          deprecation_date: '2026-06-01',
          knowledge: '2025-12',
          last_updated: '2026-02-01',
          open_weights: true,
          modalities: { input: ['text', 'image/png'], output: ['text'] },
          limit: { context: 400_000, input: 272_000, output: 0 },
        } satisfies ModelsDevModel,
      },
    };

    // Act
    const { modelFiles } = emitModels({ providerId: 'openai', provider: documented });

    // Assert
    expect(modelFiles[0]!.types).toContain(
      [
        '/**',
        ' * @name Model X',
        ' * @provider OpenAI',
        ' * @family model',
        ' * @status deprecated',
        ' * @released 2026-01-01',
        ' * @updated 2026-02-01',
        ' * @knowledge 2025-12',
        ' * @context 400,000 tokens',
        ' * @maxInput 272,000 tokens',
        ' * @modalities text, image/png -> text',
        ' * @reasoning effort `low`, `high`, budget 1,024+ tokens (default effort `high`)',
        ' * @openWeights',
        ' * @deprecated The model is deprecated on 2026-06-01 (models.dev).',
        ' */',
        'export const model',
      ].join('\n'),
    );
  });

  test('should build the provider models from the model modules', () => {
    // Act
    const { types } = emitModels({ providerId: 'openai', provider });

    // Assert
    expect(types).toContain("import { model as model_a } from './openai/model-a';");
    expect(types).toContain("'model-a': model_a,");
    expect(types).not.toContain('"id":"model-a"');
  });

  test('should give each model module a unique variable name', () => {
    // Arrange
    const dotted = {
      ...provider,
      models: { 'gpt-6.1': model('gpt-6.1', {}), 'gpt-6-1': model('gpt-6-1', {}) },
    };

    // Act
    const { types } = emitModels({ providerId: 'openai', provider: dotted });

    // Assert
    expect(types).toContain("import { model as gpt_6_1 } from './openai/gpt-6-1';");
    expect(types).toContain("import { model as gpt_6_1_2 } from './openai/gpt-6.1';");
  });

  test.each(['con', 'nul.json', 'a/b', 'a\\b', '.hidden', 'model.', 'model.d', 'mo:del', ''])(
    'should reject the model ID %j, which is not a safe file name',
    (id) => {
      // Arrange
      const invalid = { ...provider, models: { [id]: model(id, {}) } };

      // Act
      const result = () => emitModels({ providerId: 'openai', provider: invalid });

      // Assert
      expect(result).toThrow();
    },
  );

  test('should reject two model IDs that differ only in case', () => {
    // Arrange
    const invalid = {
      ...provider,
      models: { 'Model-A': model('Model-A', {}), 'model-a': model('model-a', {}) },
    };

    // Act
    const result = () => emitModels({ providerId: 'openai', provider: invalid });

    // Assert
    expect(result).toThrow();
  });
});
