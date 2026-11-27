/**
 * Generates the TypeScript sources from data/models.json and the mapping files.
 *
 * Output:
 * - src/generated/models/<provider>.ts and src/models/<provider>.ts (SDK-agnostic data)
 * - src/generated/models/<provider>/<model>.ts and src/models/<provider>/<model>.ts (the data of
 *   one model, for the subpath export `types.ai/models/<provider>/<model>`)
 * - per SDK: src/generated/<sdk>/<provider>.ts, <provider>.check.ts and src/<sdk>/<provider>.ts
 * - the registries in src/generated/models/registry.ts and src/generated/<sdk>/registry.ts
 *
 * Usage: pnpm generate
 */
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { emitModels, emitModelsRegistry, emitProvider, emitSdkRegistry } from './lib/emit';
import { SDKS } from '../mappings/define';
import { loadAllMappings, readData, ROOT, SRC_DIR, writeText } from './lib/io';
import { findStale, removeStale } from './lib/stale';

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
    for (const file of sources.modelFiles) {
      await write(join(SRC_DIR, 'generated/models', providerId, `${file.id}.ts`), file.types);
      await write(join(SRC_DIR, 'models', providerId, `${file.id}.ts`), file.entry);
    }
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

  // A model that models.dev removes also loses its subpath. The sync removes such files: a
  // removal in the data already gets a review on the sync pull request.
  const removed = await removeStale({
    dirs: providerIds.flatMap((id) => [
      join(SRC_DIR, 'generated/models', id),
      join(SRC_DIR, 'models', id),
    ]),
    written,
  });
  for (const path of removed) console.log(`Removed ${relative(ROOT, path)}.`);

  // A generated file that was not written now belongs to a provider that is gone. The script
  // does not delete these files: it stops, so that a person removes them on purpose.
  const providerDirs = ['generated/models', 'models'].map((dir) => join(SRC_DIR, dir));
  const goneProviderDirs = (
    await Promise.all(
      providerDirs.map(async (dir) =>
        (await readdir(dir, { withFileTypes: true }).catch(() => []))
          .filter((entry) => entry.isDirectory() && !providerIds.includes(entry.name))
          .map((entry) => join(dir, entry.name)),
      ),
    )
  ).flat();
  const stale = await findStale({
    dirs: [
      ...providerDirs,
      ...goneProviderDirs,
      ...SDKS.flatMap((sdk) => [`generated/${sdk}`, sdk]).map((dir) => join(SRC_DIR, dir)),
    ],
    written,
  });
  if (stale.length > 0) {
    throw new Error(`Generated files without a source. Delete them:\n${stale.join('\n')}`);
  }
}

await main();
