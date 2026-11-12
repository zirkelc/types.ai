/**
 * The string literals of an SDK model ID type. SDKs add `string & {}` to their model ID unions,
 * so that other strings are also accepted. This type removes it.
 */
export type KnownModelIds<T> = T extends string ? (string extends T ? never : T) : never;

/**
 * The options type for a model ID that the SDK knows only for another model type, for example an
 * image model in the language model options. It has a required property that no options object
 * has, so `satisfies` fails. TypeScript shows the name of this type in the error message, so the
 * name says what is wrong.
 */
export type NotALanguageModel<MODEL extends string, TYPE extends string> = {
  readonly '~error': `${MODEL} is a model of type ${TYPE}, not a language model`;
};

type ModelTypeOf<MODEL extends string, OTHERS extends Record<string, string>> = {
  [TYPE in keyof OTHERS & string]: MODEL extends OTHERS[TYPE] ? TYPE : never;
}[keyof OTHERS & string];

/**
 * The model IDs of other model types (`OTHERS`: model type to IDs) that are not in `ACCEPTED`,
 * each to its error type.
 */
export type WrongModels<ACCEPTED extends string, OTHERS extends Record<string, string>> = {
  [MODEL in Exclude<OTHERS[keyof OTHERS], ACCEPTED>]: NotALanguageModel<
    MODEL,
    ModelTypeOf<MODEL, OTHERS>
  >;
};
