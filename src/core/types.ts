/**
 * Model data as the generator writes it. This is a subset of the models.dev v2 model
 * schema: only the fields that are true for the model itself and its capabilities.
 * Cost, benchmarks and links are not included.
 */
export type ReasoningEffortValue =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max'
  | 'default'
  | (string & {});

export type ReasoningDefault =
  | { readonly type: 'toggle'; readonly value: boolean }
  | { readonly type: 'effort'; readonly value: ReasoningEffortValue }
  | { readonly type: 'budget'; readonly value: number };

export type ReasoningCapability =
  | { readonly supported: false }
  | {
      readonly supported: true;
      readonly default?: ReasoningDefault;
      readonly toggle?: boolean;
      readonly effort?: ReadonlyArray<ReasoningEffortValue>;
      readonly budget?: { readonly min?: number; readonly max?: number };
    };

export type CacheCapability =
  | false
  | {
      readonly implicit?:
        | true
        | { readonly ttl?: ReadonlyArray<string>; readonly min_tokens?: number };
      readonly explicit?:
        | true
        | {
            readonly ttl?: ReadonlyArray<string>;
            readonly max_breakpoints?: number;
            readonly targets?: ReadonlyArray<string>;
            readonly min_tokens?: number;
          };
    };

export type Capabilities = {
  readonly tools: { readonly supported: boolean };
  readonly reasoning: ReasoningCapability;
  readonly cache?: CacheCapability;
  readonly structured_output?: boolean;
  readonly temperature?: boolean;
  readonly top_p?: boolean;
  readonly top_k?: boolean;
  readonly system_updates?: boolean;
  readonly effort_updates?: boolean;
  readonly store?: boolean;
  readonly stream_usage?: boolean;
  readonly prompt_cache_key?: boolean;
  readonly service_tier?: ReadonlyArray<string>;
};

export type ApiEntry = {
  readonly sdk?: { readonly aisdk?: string };
  /** Values that replace the model's top-level capabilities on this API. */
  readonly capabilities?: { readonly [key: string]: unknown };
};

export type Model = {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly family?: string;
  readonly status?: 'alpha' | 'beta' | 'deprecated';
  readonly knowledge?: string;
  readonly release_date: string;
  readonly last_updated?: string;
  readonly deprecation_date?: string;
  readonly open_weights?: boolean;
  readonly modalities: {
    readonly input: ReadonlyArray<string>;
    readonly output: ReadonlyArray<string>;
  };
  readonly limit?: {
    readonly context?: number;
    readonly input?: number;
    readonly output?: number;
  };
  readonly capabilities: Capabilities;
  readonly api: { readonly [protocol: string]: ApiEntry };
};

export type Models = { readonly [modelId: string]: Model };
