/** Reads a value at a dot-notation path. Returns `undefined` when a segment is missing. */
export function getPath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** A value is true when it is `true`, a non-empty array or an object. */
export function isTrue(value: unknown): boolean {
  if (value === true) return true;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && typeof value === 'object';
}

/** Evaluates a condition: one path, or a list of paths of which one must be true. */
export function evaluateWhen({
  capabilities,
  when,
}: {
  capabilities: unknown;
  when: string | ReadonlyArray<string> | undefined;
}): boolean {
  if (when === undefined) return true;
  const paths = typeof when === 'string' ? [when] : when;
  return paths.some((path) => isTrue(getPath(capabilities, path)));
}
