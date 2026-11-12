/** Flattens an intersection, so that editors show one object type. */
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/**
 * The patch fields that are valid for a base type. Each field type must be assignable to the
 * non-nullable field type of the base. Thus a patch can only narrow a field, never widen it.
 */
export type PatchFields<BASE> = { [K in keyof BASE]?: NonNullable<BASE[K]> };

/**
 * Replaces the fields of `BASE` that `PATCH` names with the narrower patch types.
 * All fields stay optional, and a field keeps `null` and `undefined` if the base field allows
 * them. The result is always assignable to `BASE`.
 */
export type Patch<BASE, PATCH extends PatchFields<BASE>> = PatchLoose<BASE, PATCH>;

/**
 * `Patch` without the constraint. Fields of the patch that the base does not have are ignored.
 * For per-model SDK types, where a field can be missing for some models. The generated checks
 * test that each result is assignable to the SDK type of its model.
 */
export type PatchLoose<BASE, PATCH> = Simplify<
  Omit<BASE, keyof PATCH> & {
    [K in keyof PATCH & keyof BASE]?: PATCH[K] | Extract<BASE[K], null | undefined>;
  }
>;

/** Patches the object at a key of the base, or gives `never` when the base has no such key. */
export type PatchAt<BASE, KEY extends PropertyKey, PATCH> = KEY extends keyof BASE
  ? PatchLoose<NonNullable<BASE[KEY]>, PATCH>
  : never;

/** The non-nullable type at a key, or `never` when the type has no such key. */
export type At<T, KEY extends PropertyKey> = KEY extends keyof T ? NonNullable<T[KEY]> : never;
