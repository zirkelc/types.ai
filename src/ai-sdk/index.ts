import type {
  RegistryDefaultTarget,
  RegistryModelId,
  RegistryModelOptions,
  RegistryTarget,
} from '../core/options';
import type { Registry } from '../generated/ai-sdk/registry';

/** The providers with AI SDK types in this package. */
export type AISDKProviderId = keyof Registry;

/** The targets of a provider: one per SDK options type, for example `responses` and `chat`. */
export type AISDKTarget<PROVIDER extends AISDKProviderId> = RegistryTarget<Registry, PROVIDER>;

/** The known model IDs of a provider and target. Other strings are also accepted. */
export type AISDKModelId<
  PROVIDER extends AISDKProviderId,
  TARGET extends AISDKTarget<PROVIDER> = RegistryDefaultTarget<Registry, PROVIDER>,
> = RegistryModelId<Registry, PROVIDER, TARGET>;

/**
 * The provider options of an AI SDK provider, narrowed to one model.
 * Use it for the value under `providerOptions.<provider>`, with `satisfies`.
 * An unknown model ID gives the original SDK options type.
 *
 * @example
 * providerOptions: {
 *   openai: { reasoningEffort: 'low' } satisfies ModelOptions<'openai', 'gpt-6-luna'>,
 * }
 */
export type ModelOptions<
  PROVIDER extends AISDKProviderId,
  MODEL extends AISDKModelId<PROVIDER, TARGET> | (string & {}),
  TARGET extends AISDKTarget<PROVIDER> = RegistryDefaultTarget<Registry, PROVIDER>,
> = RegistryModelOptions<Registry, PROVIDER, MODEL, TARGET>;

/**
 * The `providerOptions` object for one provider and model, with the provider key.
 *
 * @example
 * providerOptions: {
 *   openai: { reasoningEffort: 'low' },
 * } satisfies ProviderOptions<'openai', 'gpt-6-luna'>,
 */
export type ProviderOptions<
  PROVIDER extends AISDKProviderId,
  MODEL extends AISDKModelId<PROVIDER, TARGET> | (string & {}),
  TARGET extends AISDKTarget<PROVIDER> = RegistryDefaultTarget<Registry, PROVIDER>,
> = { [KEY in Registry[PROVIDER]['optionsKey']]: ModelOptions<PROVIDER, MODEL, TARGET> };
