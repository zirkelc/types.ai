import { describe, expect, test } from 'vitest';
import { diffData, diffModel } from './data-diff';
import type { DataFile } from './select';

function dataFile(models: Record<string, unknown>): DataFile {
  return {
    source: 'fixture',
    providers: { openai: { id: 'openai', name: 'OpenAI', models: models as never } },
  };
}

describe('diffModel', () => {
  test('should treat a removed list value as a removal', () => {
    // Act
    const result = diffModel({
      before: { capabilities: { reasoning: { effort: ['minimal', 'low'] } } },
      after: { capabilities: { reasoning: { effort: ['low'] } } },
    });

    // Assert
    expect(result.removal).toBe(true);
    expect(result.changes).toEqual([
      { path: 'capabilities.reasoning.effort', kind: 'removed', detail: '"minimal" removed' },
    ]);
  });

  test('should treat a flag from true to false as a removal and false to true as safe', () => {
    // Act
    const narrowing = diffModel({ before: { store: true }, after: { store: false } });
    const widening = diffModel({ before: { store: false }, after: { store: true } });

    // Assert
    expect(narrowing.removal).toBe(true);
    expect(widening.removal).toBe(false);
    expect(widening.changes).toEqual([{ path: 'store', kind: 'changed', detail: 'false → true' }]);
  });

  test('should treat new values, new fields and changed names as safe', () => {
    // Act
    const result = diffModel({
      before: { name: 'GPT', capabilities: { service_tier: ['flex'] } },
      after: { name: 'GPT-6', capabilities: { service_tier: ['flex', 'priority'], store: true } },
    });

    // Assert
    expect(result.removal).toBe(false);
    expect(result.changes.map((change) => change.kind)).toEqual(['added', 'added', 'changed']);
  });

  test('should treat a removed field as a removal', () => {
    // Act
    const result = diffModel({ before: { prompt_cache_key: true }, after: {} });

    // Assert
    expect(result.removal).toBe(true);
  });
});

describe('diffData', () => {
  test('should be safe for a new model and not safe for a removed model', () => {
    // Arrange
    const before = dataFile({ a: { id: 'a' }, b: { id: 'b' } });
    const added = dataFile({ a: { id: 'a' }, b: { id: 'b' }, c: { id: 'c' } });
    const removed = dataFile({ a: { id: 'a' } });

    // Act
    const safe = diffData({ before, after: added });
    const unsafe = diffData({ before, after: removed });

    // Assert
    expect(safe.safe).toBe(true);
    expect(safe.addedModels).toEqual(['openai/c']);
    expect(unsafe.safe).toBe(false);
    expect(unsafe.removedModels).toEqual(['openai/b']);
  });
});
