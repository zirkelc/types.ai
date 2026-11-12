/**
 * Helpers for the generated compile-time checks against SDK types.
 * A failed check gives a compile error on the named type alias.
 */
export type Assert<T extends true> = T;

export type Extends<A, B> = [A] extends [B] ? true : false;

/** Strict type equality (also for `any` and optional properties). */
export type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export type IsNever<T> = [T] extends [never] ? true : false;

export type HasKey<T, K extends PropertyKey> = K extends keyof NonNullable<T> ? true : false;

/** The discriminator values of the union members that have the key as a required property. */
export type DiscriminatorValues<T, K extends PropertyKey> =
  NonNullable<T> extends infer U ? (U extends { [P in K]: infer D } ? D : never) : never;
