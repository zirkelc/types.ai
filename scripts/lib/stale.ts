import { readdir, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { HEADER } from './emit';

/**
 * Finds the generated files in the folders that the generator did not write in this run. A file
 * is generated when it starts with the header of the generator. Other files are never stale.
 */
export async function findStale({
  dirs,
  written,
}: {
  dirs: Array<string>;
  written: Set<string>;
}): Promise<Array<string>> {
  const stale: Array<string> = [];
  for (const dir of dirs) {
    for (const file of await readdir(dir).catch(() => [])) {
      const path = join(dir, file);
      if (written.has(path) || !file.endsWith('.ts')) continue;
      if ((await readFile(path, 'utf8')).startsWith(HEADER)) stale.push(path);
    }
  }
  return stale;
}

/** Deletes the stale generated files of the folders and returns their paths. */
export async function removeStale({
  dirs,
  written,
}: {
  dirs: Array<string>;
  written: Set<string>;
}): Promise<Array<string>> {
  const stale = await findStale({ dirs, written });
  for (const path of stale) await unlink(path);
  return stale;
}
