import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SDKS, type Mapping } from '../../mappings/define';
import type { DataFile } from './select';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_FILE = join(ROOT, 'data/models.json');
export const MAPPINGS_DIR = join(ROOT, 'mappings');
export const SRC_DIR = join(ROOT, 'src');

export type LoadedMapping = { file: string; mapping: Mapping };

/**
 * Loads all mapping files of one SDK folder (for example mappings/ai-sdk). Each file has a
 * mapping as its default export. The type check of the repo checks the mapping files.
 */
export async function loadMappings(sdk: string): Promise<Array<LoadedMapping>> {
  const dir = join(MAPPINGS_DIR, sdk);
  const files = (await readdir(dir)).filter((file) => file.endsWith('.ts')).sort();
  const loaded: Array<LoadedMapping> = [];
  for (const file of files) {
    const path = join(dir, file);
    const module = (await import(pathToFileURL(path).href)) as { default?: Mapping };
    if (!module.default) throw new Error(`Mapping ${relative(ROOT, path)} has no default export.`);
    loaded.push({ file: relative(ROOT, path), mapping: module.default });
  }
  return loaded;
}

/** Loads the mappings of all SDKs. An SDK without a mapping folder has no mappings. */
export async function loadAllMappings(): Promise<Array<LoadedMapping>> {
  const loaded: Array<LoadedMapping> = [];
  for (const sdk of SDKS) {
    const mappings = await loadMappings(sdk).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const entry of mappings) {
      if (entry.mapping.sdk !== sdk) {
        throw new Error(`Mapping ${entry.file} has sdk "${entry.mapping.sdk}", expected "${sdk}".`);
      }
    }
    loaded.push(...mappings);
  }
  return loaded;
}

export async function readData(): Promise<DataFile> {
  return JSON.parse(await readFile(DATA_FILE, 'utf8')) as DataFile;
}

export async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

/** Writes Markdown to the GitHub job summary when the script runs in GitHub Actions. */
export async function writeSummary(markdown: string): Promise<void> {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) await appendFile(file, `${markdown}\n`);
}

/** Sorts object keys recursively, for stable diffs. Arrays keep their order. */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
  );
}
