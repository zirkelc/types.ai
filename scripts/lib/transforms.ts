import type { FieldMapping } from '../../mappings/define';
import { evaluateWhen, getPath } from './paths';

/**
 * The result of one field mapping for one model:
 * - `keep`: the SDK field type stays as it is.
 * - `never`: the field is not valid for the model.
 * - `union`: the field is a union of string literals.
 * - `excludeVariants`: the members of the SDK union with these discriminator values are removed.
 */
export type FieldResult =
  | { kind: 'keep' }
  | { kind: 'never' }
  | { kind: 'union'; values: Array<string> }
  | { kind: 'excludeVariants'; discriminator: string; values: Array<string> };

export function resolveField({
  field,
  capabilities,
}: {
  field: FieldMapping;
  capabilities: unknown;
}): FieldResult {
  if (!evaluateWhen({ capabilities, when: field.when })) return { kind: 'never' };

  switch (field.kind) {
    case 'enum':
      return resolveEnum({ field, capabilities });
    case 'flag':
      return resolveFlag({ field, capabilities });
    case 'variants':
      return resolveVariants({ field, capabilities });
  }
}

function resolveEnum({
  field,
  capabilities,
}: {
  field: Extract<FieldMapping, { kind: 'enum' }>;
  capabilities: unknown;
}): FieldResult {
  const value = getPath(capabilities, field.from);
  let source: Array<string>;
  if (Array.isArray(value)) {
    source = value.filter((item): item is string => typeof item === 'string');
  } else {
    const missing = field.missing ?? 'keep';
    if (missing === 'keep') return { kind: 'keep' };
    if (missing === 'never') return { kind: 'never' };
    source = [];
  }

  const values = new Set<string>();
  for (const item of source) {
    if (field.exclude?.includes(item)) continue;
    const mapped = field.map?.[item] ?? item;
    for (const sdkValue of typeof mapped === 'string' ? [mapped] : mapped) values.add(sdkValue);
  }
  for (const item of field.extra ?? []) values.add(item);

  if (values.size === 0) return { kind: 'never' };
  return { kind: 'union', values: [...values] };
}

function resolveFlag({
  field,
  capabilities,
}: {
  field: Extract<FieldMapping, { kind: 'flag' }>;
  capabilities: unknown;
}): FieldResult {
  const value = getPath(capabilities, field.from);
  if (value === undefined || value === null) {
    return (field.missing ?? 'keep') === 'never' ? { kind: 'never' } : { kind: 'keep' };
  }
  return value === false ? { kind: 'never' } : { kind: 'keep' };
}

function resolveVariants({
  field,
  capabilities,
}: {
  field: Extract<FieldMapping, { kind: 'variants' }>;
  capabilities: unknown;
}): FieldResult {
  const excluded = Object.entries(field.variants)
    .filter(([, variant]) => !evaluateWhen({ capabilities, when: variant.when }))
    .map(([value]) => value);
  if (excluded.length === 0) return { kind: 'keep' };
  return { kind: 'excludeVariants', discriminator: field.discriminator, values: excluded };
}
