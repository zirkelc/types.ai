import type { Model as ModelShape } from '../core/types';
import type { ModelsRegistry } from '../generated/models/registry';

export type * from '../core/types';

/** All providers in this package (models.dev provider IDs). */
export type ProviderId = keyof ModelsRegistry;

/** All known model IDs of a provider (models.dev model IDs). */
export type ModelId<PROVIDER extends ProviderId> = keyof ModelsRegistry[PROVIDER] & string;

/** The model data of one model, as literal types. */
export type Model<
  PROVIDER extends ProviderId,
  MODEL extends ModelId<PROVIDER>,
> = ModelsRegistry[PROVIDER][MODEL] extends infer MODEL_DATA extends ModelShape
  ? MODEL_DATA
  : never;

/** The top-level capabilities of a model. They apply to each API of the model. */
export type ModelCapabilities<PROVIDER extends ProviderId, MODEL extends ModelId<PROVIDER>> = Model<
  PROVIDER,
  MODEL
>['capabilities'];

/** The API protocols of a model, for example `responses` or `chat-completions`. */
export type ModelApi<PROVIDER extends ProviderId, MODEL extends ModelId<PROVIDER>> = keyof Model<
  PROVIDER,
  MODEL
>['api'] &
  string;

/** The capabilities of a model on one API: the top-level values, replaced by the API values. */
export type ApiCapabilities<
  PROVIDER extends ProviderId,
  MODEL extends ModelId<PROVIDER>,
  API extends ModelApi<PROVIDER, MODEL>,
> = Model<PROVIDER, MODEL>['api'][API] extends { readonly capabilities: infer OVERRIDES }
  ? Omit<ModelCapabilities<PROVIDER, MODEL>, keyof OVERRIDES> & OVERRIDES
  : ModelCapabilities<PROVIDER, MODEL>;

/** The reasoning effort values of a model, or `never` if the model has no effort control. */
export type ReasoningEffort<PROVIDER extends ProviderId, MODEL extends ModelId<PROVIDER>> =
  ModelCapabilities<PROVIDER, MODEL> extends { readonly reasoning: infer REASONING }
    ? REASONING extends {
        readonly effort: ReadonlyArray<infer EFFORT>;
      }
      ? EFFORT
      : never
    : never;

/** The service tiers of a model, or `never` if models.dev lists none. */
export type ServiceTier<PROVIDER extends ProviderId, MODEL extends ModelId<PROVIDER>> =
  ModelCapabilities<PROVIDER, MODEL> extends { readonly service_tier: ReadonlyArray<infer TIER> }
    ? TIER
    : never;
