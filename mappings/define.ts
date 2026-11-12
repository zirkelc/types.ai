/**
 * The authoring API for mapping files. A mapping connects the models.dev capabilities to the
 * option fields of one SDK package. The types check the SDK field paths, the capability paths
 * and the values of `extra` and `map` while you write the mapping.
 *
 * The values that come from models.dev are only known at generation time. The generated check
 * files test them against the SDK types.
 */
import type { Capabilities } from '../src/core/types';

type Depth = [never, 0, 1, 2, 3];
type IsAny<T> = 0 extends 1 & T ? true : false;
type KeysOfUnion<T> = T extends unknown ? keyof T : never;
type ValueOfUnion<T, K extends PropertyKey> = T extends unknown
  ? K extends keyof T
    ? T[K]
    : never
  : never;

/** The dot-notation paths of an object type. Union members and nested objects are included. */
export type Paths<T, DEPTH extends number = 3> = [DEPTH] extends [never]
  ? never
  : true extends IsAny<T>
    ? never
    : T extends ReadonlyArray<unknown>
      ? never
      : T extends object
        ? {
            [K in KeysOfUnion<T> & string]:
              | K
              | `${K}.${Paths<NonNullable<ValueOfUnion<T, K>>, Depth[DEPTH]>}`;
          }[KeysOfUnion<T> & string]
        : never;

/** The type at a dot-notation path. */
export type PathValue<T, PATH extends string> = PATH extends `${infer K}.${infer REST}`
  ? PathValue<NonNullable<ValueOfUnion<T, K>>, REST>
  : ValueOfUnion<T, PATH>;

/** A path in the merged capabilities of a model on one API. */
export type CapabilityPath = Paths<Capabilities>;

/**
 * A capability path that must be true. With a list, one true path is sufficient.
 * A path is true when its value is `true`, a non-empty array or an object.
 */
export type When = CapabilityPath | ReadonlyArray<CapabilityPath>;

/**
 * What to do when the source value is not in the model data:
 * - `keep`: keep the SDK field type (default, no narrowing without data).
 * - `never`: the field is not valid for the model.
 * - `empty`: use an empty list, so that only the `extra` values stay valid.
 */
export type Missing = 'keep' | 'never' | 'empty';

/** A string array in the model data becomes a union of string literals. */
export type EnumField<VALUE extends string = string> = {
  kind: 'enum';
  /** Capability path of a string array, for example `reasoning.effort`. */
  from: CapabilityPath;
  /** Values that are valid for each model. */
  extra?: ReadonlyArray<VALUE>;
  /** Renames source values. A list adds more than one SDK value for a source value. */
  map?: { readonly [source: string]: VALUE | ReadonlyArray<VALUE> };
  /** Source values to drop. */
  exclude?: ReadonlyArray<string>;
  when?: When;
  missing?: Missing;
};

/** A false value makes the field `never`. A true value keeps the SDK field type. */
export type FlagField = {
  kind: 'flag';
  /** Capability path of a boolean or an object. */
  from: CapabilityPath;
  when?: When;
  missing?: Exclude<Missing, 'empty'>;
};

/**
 * Removes the members of a discriminated SDK union whose condition is false.
 * Variants that are not listed stay valid.
 */
export type VariantsField<UNION = unknown> = {
  [DISCRIMINATOR in KeysOfUnion<UNION> & string]: {
    kind: 'variants';
    discriminator: DISCRIMINATOR;
    variants: Partial<Record<Extract<ValueOfUnion<UNION, DISCRIMINATOR>, string>, { when: When }>>;
    when?: When;
  };
}[KeysOfUnion<UNION> & string];

type FieldFor<VALUE> =
  | EnumField<Extract<NonNullable<VALUE>, string>>
  | FlagField
  | VariantsField<NonNullable<VALUE>>;

/** The field mappings of a target. The keys are the dot-notation paths of the SDK options type. */
export type TargetFields<BASE> = {
  [PATH in Paths<BASE>]?: FieldFor<PathValue<BASE, PATH>>;
};

export type TargetDefinition<BASE, SUB_TYPES> = {
  /** Target ID, for example `responses` or `chat`. */
  id: string;
  /** The target that is used when no target is given. */
  default?: boolean;
  /**
   * The name of the exported SDK options type, for example `OpenAITextProviderOptions`. It is
   * the type for model IDs that the SDK has no per-model type for, and the name of the override
   * type. It must name the `BASE` type argument, which the generated checks test.
   */
  baseType: string;
  /** Other exported names of the same SDK type (deprecated aliases). */
  aliases?: ReadonlyArray<string>;
  /** The models.dev API protocol, for example `responses`. */
  api: string;
  /**
   * The model IDs that the SDK accepts for this target, as a type expression over the SDK
   * namespace `Sdk`, for example `Parameters<Sdk.OpenAIProvider['responses']>[0]`. The IDs add
   * to the autocomplete of the model, and an ID in this list never gives an error type.
   */
  modelIds: string;
  fields: TargetFields<BASE>;
} & ([SUB_TYPES] extends [never]
  ? { subTypes?: never }
  : {
      /**
       * The name of the exported SDK type that maps model IDs to per-model options, for example
       * `OpenAIChatModelProviderOptionsByName` of TanStack AI. The patch then applies to the
       * per-model type of the SDK, so that the SDK's own narrowing stays. It must name the
       * `SUB_TYPES` type argument, which the generated checks test.
       */
      subTypes: string;
    });

/**
 * A target with its SDK types. `BASE` is the SDK options type: it types the field paths and
 * values. `SUB_TYPES` is the SDK map of model IDs to per-model options, if the SDK has one; each
 * value must be a subtype of `BASE`. Both stay on the result as phantom types, so that the
 * generated checks can compare them with the type names in `baseType` and `subTypes`.
 */
export function target<BASE, SUB_TYPES extends { readonly [model: string]: BASE } = never>(
  definition: TargetDefinition<BASE, SUB_TYPES>,
): TargetMapping<BASE, SUB_TYPES> {
  return definition as TargetMapping<BASE, SUB_TYPES>;
}

/** The field mapping as the generator reads it. */
export type FieldMapping =
  | EnumField
  | FlagField
  | {
      kind: 'variants';
      discriminator: string;
      variants: { readonly [value: string]: { when: When } };
      when?: When;
    };

/** The target as the generator reads it. */
export type TargetMapping<BASE = unknown, SUB_TYPES = unknown> = {
  id: string;
  default?: boolean;
  baseType: string;
  aliases?: ReadonlyArray<string>;
  api: string;
  modelIds: string;
  subTypes?: string;
  fields: { readonly [path: string]: FieldMapping };
  /** Phantom types for the generated checks. Not set at run time. */
  readonly '~types'?: { base: BASE; subTypes: SUB_TYPES };
};

/** The SDKs with mappings. Each one has a folder in mappings/ and an export path. */
export const SDKS = ['ai-sdk', 'tanstack'] as const;
export type SdkId = (typeof SDKS)[number];

export type Mapping = {
  /** The SDK that this mapping is for. It must be the folder of the mapping file. */
  sdk: SdkId;
  /** The npm package of the SDK types, for example `@ai-sdk/openai`. */
  package: string;
  /** Provider ID in this package. It is also the file name of the generated files. */
  provider: string;
  /**
   * The key in `providerOptions`, for example `openai`. Only for SDKs that put the options of
   * each provider under a key (AI SDK). TanStack AI has a flat `modelOptions` object.
   */
  optionsKey?: string;
  source: {
    /** models.dev provider IDs. */
    providers: ReadonlyArray<string>;
    /** models.dev model types, for example `chat`. */
    types: ReadonlyArray<string>;
    /**
     * Select only the models that models.dev serves with this AI SDK package on the target API.
     * Without it, each model with the target API is selected.
     */
    aisdk?: string;
  };
  targets: ReadonlyArray<TargetMapping>;
  /**
   * The model IDs that the SDK knows for other model types, as type expressions over the SDK
   * namespace `Sdk`, for example `{ image: "Parameters<Sdk.OpenAIProvider['image']>[0]" }`. The
   * options of a target give an error type for these IDs, if the target does not also accept
   * the ID. The key is the model type in the error message.
   */
  otherModelIds?: { readonly [modelType: string]: string };
  /** Compares models.dev with the runtime model catalog of the SDK. Warnings only. */
  crossCheck?: {
    /** Module that exports the catalog. */
    module: string;
    /** Name of the exported catalog (Record<modelId, entry>). */
    export: string;
    /** Catalog path to models.dev capability path. */
    fields: {
      readonly [catalogPath: string]: { from: CapabilityPath; compare: 'list' | 'trueKeys' };
    };
  };
};

/** Keeps the literal type of the mapping, so that the generated checks can read its targets. */
export function defineMapping<const MAPPING extends Mapping>(mapping: MAPPING): MAPPING {
  return mapping;
}
