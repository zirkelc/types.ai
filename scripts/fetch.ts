/**
 * Downloads the models.dev v2 API, validates the fields that the generator reads and writes a
 * filtered snapshot to data/models.json. Only the providers and model types that a mapping uses
 * are kept.
 *
 * Usage: pnpm fetch-models [--file <path to a local api.json>]
 */
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { DATA_FILE, loadAllMappings, sortKeys, writeSummary, writeText } from './lib/io';
import { ApiResponseSchema, ModelSchema, type ModelsDevModel } from './lib/models-dev-schema';
import type { DataFile } from './lib/select';

const SOURCE_URL = process.env.MODELS_DEV_URL ?? 'https://models.dev/experimental/v2.0/api.json';

async function download(file: string | undefined): Promise<unknown> {
  if (file) return JSON.parse(await readFile(file, 'utf8'));
  const response = await fetch(SOURCE_URL, { headers: { 'user-agent': 'types.ai-sync' } });
  if (!response.ok) throw new Error(`GET ${SOURCE_URL} failed: ${response.status}`);
  return response.json();
}

/** Keeps only the model fields that this project publishes. */
function pickModel(model: ModelsDevModel): ModelsDevModel {
  return {
    id: model.id,
    name: model.name,
    type: model.type,
    family: model.family,
    status: model.status,
    knowledge: model.knowledge,
    release_date: model.release_date,
    last_updated: model.last_updated,
    deprecation_date: model.deprecation_date,
    open_weights: model.open_weights,
    modalities: { input: model.modalities.input, output: model.modalities.output },
    limit: model.limit && {
      context: model.limit.context,
      input: model.limit.input,
      output: model.limit.output,
    },
    capabilities: model.capabilities,
    api: Object.fromEntries(
      Object.entries(model.api).map(([protocol, entry]) => [
        protocol,
        {
          sdk: entry.sdk?.aisdk ? { aisdk: entry.sdk.aisdk } : undefined,
          capabilities: entry.capabilities,
        },
      ]),
    ),
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { file: { type: 'string' } } });
  const response = ApiResponseSchema.parse(await download(values.file));
  const mappings = (await loadAllMappings()).map(({ mapping }) => mapping);

  // Model types to keep per models.dev provider, from all mappings.
  const scope = new Map<string, Set<string>>();
  for (const mapping of mappings) {
    for (const providerId of mapping.source.providers) {
      const types = scope.get(providerId) ?? new Set();
      for (const type of mapping.source.types) types.add(type);
      scope.set(providerId, types);
    }
  }

  const errors: Array<string> = [];
  const data: DataFile = { source: SOURCE_URL, providers: {} };
  for (const [providerId, types] of [...scope].sort(([a], [b]) => a.localeCompare(b))) {
    const provider = response[providerId];
    if (!provider) {
      errors.push(`Provider "${providerId}" is not in the models.dev response.`);
      continue;
    }
    const models: Record<string, ModelsDevModel> = {};
    for (const [modelId, raw] of Object.entries(provider.models)) {
      const type = (raw as { type?: unknown }).type;
      if (typeof type !== 'string' || !types.has(type)) continue;
      const result = ModelSchema.safeParse(raw);
      if (!result.success) {
        errors.push(`${providerId}/${modelId}: ${result.error.message}`);
        continue;
      }
      models[modelId] = pickModel(result.data);
    }
    data.providers[providerId] = {
      id: provider.id,
      name: provider.name,
      doc: provider.doc,
      models,
    };
  }

  if (errors.length > 0) {
    throw new Error(
      `The models.dev data does not match the expected schema:\n${errors.join('\n')}`,
    );
  }

  // JSON.stringify drops undefined values, sortKeys gives stable diffs.
  await writeText(DATA_FILE, `${JSON.stringify(sortKeys(data), null, 2)}\n`);
  const count = Object.values(data.providers).reduce(
    (sum, provider) => sum + Object.keys(provider.models).length,
    0,
  );
  console.log(`Wrote ${count} models of ${Object.keys(data.providers).length} providers.`);

  await reportUnmapped({
    response,
    mapped: new Set(
      mappings.flatMap((mapping) => (mapping.source.aisdk ? [mapping.source.aisdk] : [])),
    ),
  });
}

/** Lists the AI SDK packages in the models.dev data that have no mapping yet. */
async function reportUnmapped({
  response,
  mapped,
}: {
  response: ReturnType<typeof ApiResponseSchema.parse>;
  mapped: Set<string>;
}): Promise<void> {
  const counts = new Map<string, number>();
  for (const provider of Object.values(response)) {
    for (const raw of Object.values(provider.models)) {
      const api = (raw as { api?: Record<string, { sdk?: { aisdk?: unknown } }> }).api ?? {};
      for (const entry of Object.values(api)) {
        const aisdk = entry?.sdk?.aisdk;
        if (typeof aisdk !== 'string' || !aisdk.startsWith('@ai-sdk/') || mapped.has(aisdk))
          continue;
        counts.set(aisdk, (counts.get(aisdk) ?? 0) + 1);
      }
    }
  }
  const rows = [...counts].sort(([, a], [, b]) => b - a);
  if (rows.length === 0) return;
  console.log(
    `AI SDK packages without a mapping: ${rows.map(([name, n]) => `${name} (${n})`).join(', ')}`,
  );
  await writeSummary(
    [
      '### AI SDK packages without a mapping',
      '',
      '| Package | Model APIs |',
      '| --- | --- |',
      ...rows.map(([name, n]) => `| \`${name}\` | ${n} |`),
    ].join('\n'),
  );
}

await main();
