import { describe, expect, test } from 'vitest';
import { diffVersions, renderUpdates } from './sdk-updates';

describe('diffVersions', () => {
  test('should list only the packages with another version', () => {
    // Arrange
    const before = { ai: '7.0.169', '@ai-sdk/openai': '4.0.115', '@ai-sdk/google': '4.0.118' };
    const after = { ai: '7.0.170', '@ai-sdk/openai': '4.0.115', '@ai-sdk/google': '4.0.119' };

    // Act
    const updates = diffVersions({ before, after });

    // Assert
    expect(updates).toEqual([
      { name: '@ai-sdk/google', from: '4.0.118', to: '4.0.119' },
      { name: 'ai', from: '7.0.169', to: '7.0.170' },
    ]);
  });

  test('should ignore a package that was not installed before', () => {
    // Act
    const updates = diffVersions({ before: {}, after: { ai: '7.0.170' } });

    // Assert
    expect(updates.length).toBe(0);
  });
});

describe('renderUpdates', () => {
  test('should render a table of the updates', () => {
    // Act
    const markdown = renderUpdates([{ name: 'ai', from: '7.0.169', to: '7.0.170' }]);

    // Assert
    expect(markdown).toBe(
      [
        '### SDK packages',
        '',
        '| Package | From | To |',
        '| --- | --- | --- |',
        '| `ai` | 7.0.169 | 7.0.170 |',
      ].join('\n'),
    );
  });

  test('should render nothing without updates', () => {
    // Act
    const markdown = renderUpdates([]);

    // Assert
    expect(markdown).toBe('');
  });
});
