import type {
  RegistryDefaultTarget,
  RegistryModelId,
  RegistryModelOptions,
  RegistryTarget,
} from '../core/options';
import type { Registry } from '../generated/tanstack/registry';

/** The providers with TanStack AI types in this package (models.dev provider IDs). */
export type TanStackProviderId = keyof Registry;

/** The targets of a provider: one per adapter options type, for example `responses` and `chat`. */
export type TanStackTarget<PROVIDER extends TanStackProviderId> = RegistryTarget<
  Registry,
  PROVIDER
>;

/** The known model IDs of a provider and target. Other strings are also accepted. */
export type TanStackModelId<
  PROVIDER extends TanStackProviderId,
  TARGET extends TanStackTarget<PROVIDER> = RegistryDefaultTarget<Registry, PROVIDER>,
> = RegistryModelId<Registry, PROVIDER, TARGET>;

/**
 * The `modelOptions` of a TanStack AI text adapter, narrowed to one model. It starts from the
 * adapter's own per-model type and narrows it further with the models.dev data.
 * An unknown model ID gives the general options type of the adapter.
 *
 * @example
 * chat({
 *   adapter: openaiText('gpt-6-luna'),
 *   modelOptions: { service_tier: 'flex' } satisfies ModelOptions<'openai', 'gpt-6-luna'>,
 * });
 */
export type ModelOptions<
  PROVIDER extends TanStackProviderId,
  MODEL extends TanStackModelId<PROVIDER, TARGET> | (string & {}),
  TARGET extends TanStackTarget<PROVIDER> = RegistryDefaultTarget<Registry, PROVIDER>,
> = RegistryModelOptions<Registry, PROVIDER, MODEL, TARGET>;
