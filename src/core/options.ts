/**
 * Generic helpers over a generated SDK registry. Each SDK entry point (AI SDK, TanStack AI)
 * applies them to its own registry.
 */
export type RegistryShape = {
  [provider: string]: {
    optionsKey: string;
    defaultTarget: string;
    targets: {
      [target: string]: {
        base: unknown;
        byModel: unknown;
        /** The model IDs that the SDK accepts for the target. */
        modelIds: string;
        /** The model IDs of other model types, to their error type. */
        wrongModels: object;
      };
    };
  };
};

export type RegistryTarget<
  REGISTRY extends RegistryShape,
  PROVIDER extends keyof REGISTRY,
> = keyof REGISTRY[PROVIDER]['targets'] & string;

export type RegistryDefaultTarget<
  REGISTRY extends RegistryShape,
  PROVIDER extends keyof REGISTRY,
> = Extract<REGISTRY[PROVIDER]['defaultTarget'], RegistryTarget<REGISTRY, PROVIDER>>;

type TargetEntry<
  REGISTRY extends RegistryShape,
  PROVIDER extends keyof REGISTRY,
  TARGET extends RegistryTarget<REGISTRY, PROVIDER>,
> = REGISTRY[PROVIDER]['targets'][TARGET];

export type RegistryModelId<
  REGISTRY extends RegistryShape,
  PROVIDER extends keyof REGISTRY,
  TARGET extends RegistryTarget<REGISTRY, PROVIDER>,
> = Extract<
  | keyof TargetEntry<REGISTRY, PROVIDER, TARGET>['byModel']
  | TargetEntry<REGISTRY, PROVIDER, TARGET>['modelIds'],
  string
>;

export type RegistryModelOptions<
  REGISTRY extends RegistryShape,
  PROVIDER extends keyof REGISTRY,
  MODEL extends string,
  TARGET extends RegistryTarget<REGISTRY, PROVIDER>,
> = MODEL extends keyof TargetEntry<REGISTRY, PROVIDER, TARGET>['byModel']
  ? TargetEntry<REGISTRY, PROVIDER, TARGET>['byModel'][MODEL]
  : MODEL extends keyof TargetEntry<REGISTRY, PROVIDER, TARGET>['wrongModels']
    ? TargetEntry<REGISTRY, PROVIDER, TARGET>['wrongModels'][MODEL]
    : TargetEntry<REGISTRY, PROVIDER, TARGET>['base'];
