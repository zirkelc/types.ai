import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { HEADER } from './emit';
import { removeStale } from './stale';

describe('removeStale', () => {
  test('should delete the generated files that were not written and keep the other files', async () => {
    // Arrange
    const dir = await mkdtemp(join(tmpdir(), 'types-ai-stale-'));
    await writeFile(join(dir, 'kept.ts'), `${HEADER}\n`);
    await writeFile(join(dir, 'removed.ts'), `${HEADER}\n`);
    await writeFile(join(dir, 'manual.ts'), '// written by a person\n');
    const written = new Set([join(dir, 'kept.ts')]);

    // Act
    const removed = await removeStale({ dirs: [dir], written });

    // Assert
    expect(removed).toEqual([join(dir, 'removed.ts')]);
    expect((await readdir(dir)).sort()).toEqual(['kept.ts', 'manual.ts']);
  });
});
