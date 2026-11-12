import { describe, expect, test } from 'vitest';
import { resolveField } from './transforms';

const capabilities = {
  reasoning: { supported: true, effort: ['minimal', 'low', 'high'] },
  service_tier: ['flex', 'priority'],
  store: false,
  effort_updates: false,
};

describe('resolveField', () => {
  test('should turn an array into a union', () => {
    // Act
    const result = resolveField({
      field: { kind: 'enum', from: 'reasoning.effort' },
      capabilities,
    });

    // Assert
    expect(result).toEqual({ kind: 'union', values: ['minimal', 'low', 'high'] });
  });

  test('should apply map, exclude and extra', () => {
    // Act
    const result = resolveField({
      field: {
        kind: 'enum',
        from: 'service_tier',
        map: { priority: ['priority', 'fast'] },
        exclude: ['flex'],
        extra: ['auto'],
      },
      capabilities,
    });

    // Assert
    expect(result).toEqual({ kind: 'union', values: ['priority', 'fast', 'auto'] });
  });

  test('should follow the missing option when the source value is not there', () => {
    // Act
    const keep = resolveField({
      field: { kind: 'enum', from: 'cache.explicit.ttl' },
      capabilities,
    });
    const never = resolveField({
      field: { kind: 'enum', from: 'cache.explicit.ttl', missing: 'never' },
      capabilities,
    });
    const empty = resolveField({
      field: { kind: 'enum', from: 'cache.explicit.ttl', missing: 'empty', extra: ['5m'] },
      capabilities,
    });

    // Assert
    expect(keep).toEqual({ kind: 'keep' });
    expect(never).toEqual({ kind: 'never' });
    expect(empty).toEqual({ kind: 'union', values: ['5m'] });
  });

  test('should make a field never when the condition is false', () => {
    // Act
    const result = resolveField({
      field: { kind: 'enum', from: 'reasoning.effort', when: 'effort_updates' },
      capabilities,
    });

    // Assert
    expect(result).toEqual({ kind: 'never' });
  });

  test('should make a false flag never and keep a true or missing flag', () => {
    // Act
    const store = resolveField({ field: { kind: 'flag', from: 'store' }, capabilities });
    const missing = resolveField({
      field: { kind: 'flag', from: 'prompt_cache_key' },
      capabilities,
    });
    const budget = resolveField({
      field: { kind: 'flag', from: 'reasoning.budget', missing: 'never' },
      capabilities,
    });

    // Assert
    expect(store).toEqual({ kind: 'never' });
    expect(missing).toEqual({ kind: 'keep' });
    expect(budget).toEqual({ kind: 'never' });
  });

  test('should exclude the variants whose condition is false', () => {
    // Act
    const result = resolveField({
      field: {
        kind: 'variants',
        discriminator: 'type',
        variants: { adaptive: { when: 'reasoning.effort' }, enabled: { when: 'reasoning.budget' } },
      },
      capabilities,
    });

    // Assert
    expect(result).toEqual({ kind: 'excludeVariants', discriminator: 'type', values: ['enabled'] });
  });
});
