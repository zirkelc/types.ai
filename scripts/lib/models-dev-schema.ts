import { z } from 'zod';

/**
 * The fields of the models.dev v2 API that this project reads.
 * All objects are loose: models.dev adds keys and values over time, and a new key must not
 * stop the pipeline. A missing or changed field that we read stops it.
 */
const ReasoningSchema = z.union([
  z.looseObject({ supported: z.literal(false) }),
  z.looseObject({
    supported: z.literal(true),
    default: z
      .union([
        z.looseObject({ type: z.literal('toggle'), value: z.boolean() }),
        z.looseObject({ type: z.literal('effort'), value: z.string() }),
        z.looseObject({ type: z.literal('budget'), value: z.number() }),
      ])
      .optional(),
    toggle: z.boolean().optional(),
    effort: z.array(z.string()).optional(),
    budget: z.looseObject({ min: z.number().optional(), max: z.number().optional() }).optional(),
  }),
]);

const CacheSchema = z.union([
  z.literal(false),
  z.looseObject({
    implicit: z
      .union([
        z.literal(true),
        z.looseObject({ ttl: z.array(z.string()).optional(), min_tokens: z.number().optional() }),
      ])
      .optional(),
    explicit: z
      .union([
        z.literal(true),
        z.looseObject({
          ttl: z.array(z.string()).optional(),
          max_breakpoints: z.number().optional(),
          targets: z.array(z.string()).optional(),
          min_tokens: z.number().optional(),
        }),
      ])
      .optional(),
  }),
]);

export const CapabilitiesSchema = z.looseObject({
  tools: z.looseObject({ supported: z.boolean() }),
  reasoning: ReasoningSchema,
  cache: CacheSchema.optional(),
  structured_output: z.boolean().optional(),
  temperature: z.boolean().optional(),
  top_p: z.boolean().optional(),
  top_k: z.boolean().optional(),
  system_updates: z.boolean().optional(),
  effort_updates: z.boolean().optional(),
  store: z.boolean().optional(),
  stream_usage: z.boolean().optional(),
  prompt_cache_key: z.boolean().optional(),
  service_tier: z.array(z.string()).optional(),
});

export const ApiEntrySchema = z.looseObject({
  sdk: z.looseObject({ aisdk: z.string().optional() }).optional(),
  capabilities: z.record(z.string(), z.unknown()).optional(),
});

export const ModelSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  family: z.string().optional(),
  status: z.enum(['alpha', 'beta', 'deprecated']).optional(),
  knowledge: z.string().optional(),
  release_date: z.string(),
  last_updated: z.string().optional(),
  deprecation_date: z.string().optional(),
  open_weights: z.boolean().optional(),
  modalities: z.looseObject({ input: z.array(z.string()), output: z.array(z.string()) }),
  limit: z
    .looseObject({
      context: z.number().optional(),
      input: z.number().optional(),
      output: z.number().optional(),
    })
    .optional(),
  capabilities: CapabilitiesSchema,
  api: z.record(z.string(), ApiEntrySchema),
});

export const ProviderSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  doc: z.string().optional(),
  models: z.record(z.string(), z.unknown()),
});

/**
 * The full API response. Models are validated one by one in the fetch script, and only for the
 * providers that a mapping uses, so that a broken model of an unrelated provider does not stop
 * the pipeline.
 */
export const ApiResponseSchema = z.record(z.string(), ProviderSchema);

export type ModelsDevModel = z.infer<typeof ModelSchema>;
export type ModelsDevProvider = z.infer<typeof ProviderSchema>;
