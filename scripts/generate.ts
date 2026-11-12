/**
 * Generates the TypeScript sources from data/models.json and the mapping files.
 *
 * Output:
 * - src/generated/models/<provider>.ts and src/models/<provider>.ts (SDK-agnostic data)
 * - per SDK: src/generated/<sdk>/<provider>.ts, <provider>.check.ts and src/<sdk>/<provider>.ts
 * - the registries in src/generated/models/registry.ts and src/generated/<sdk>/registry.ts
 *
 * Usage: pnpm generate
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { emitModels, emitModelsRegistry, emitProvider, emitSdkRegistry, HEADER } from './lib/emit';
import { SDKS } from '../mappings/define';
import { loadAllMappings, readData, SRC_DIR, writeText } from './lib/io';

async function main(): Promise<void> {
  const data = await readData();
  const loaded = await loadAllMappings();
  const written = new Set<string>();
  const write = async (path: string, content: string) => {
    written.add(path);
    await writeText(path, content);
  };

  const providerIds = Object.keys(data.providers).sort();
  for (const providerId of providerIds) {
    const sources = emitModels({ providerId, provider: data.providers[providerId]! });
    await write(join(SRC_DIR, 'generated/models', `${providerId}.ts`), sources.types);
    await write(join(SRC_DIR, 'models', `${providerId}.ts`), sources.entry);
  }
  await write(join(SRC_DIR, 'generated/models/registry.ts'), emitModelsRegistry(providerIds));

  for (const sdk of SDKS) {
    const sdkMappings = loaded.filter(({ mapping }) => mapping.sdk === sdk);
    if (sdkMappings.length === 0) continue;
    for (const { file, mapping } of sdkMappings) {
      const sources = emitProvider({ data, mapping, mappingFile: file });
      await write(join(SRC_DIR, 'generated', sdk, `${mapping.provider}.ts`), sources.types);
      await write(join(SRC_DIR, 'generated', sdk, `${mapping.provider}.check.ts`), sources.check);
      await write(join(SRC_DIR, sdk, `${mapping.provider}.ts`), sources.entry);
    }
    await write(
      join(SRC_DIR, 'generated', sdk, 'registry.ts'),
      emitSdkRegistry(sdkMappings.map(({ mapping }) => mapping)),
    );
  }

  console.log(`Generated ${written.size} files.`);

  // A generated file that was not written now belongs to a provider that is gone. The script
  // does not delete files: it stops, so that a person removes them on purpose.
  const stale = await findStale({
    dirs: ['generated/models', 'models', ...SDKS.flatMap((sdk) => [`generated/${sdk}`, sdk])].map(
      (dir) => join(SRC_DIR, dir),
    ),
    written,
  });
  if (stale.length > 0) {
    throw new Error(`Generated files without a source. Delete them:\n${stale.join('\n')}`);
  }
}

async function findStale({
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

await main();
