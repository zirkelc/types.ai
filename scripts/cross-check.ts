/**
 * Compares models.dev with the runtime model catalogs of the SDK packages, for the fields that a
 * mapping lists under `crossCheck`. Differences are warnings only: both sources can be wrong.
 * They show where models.dev or the SDK needs a fix upstream.
 *
 * Usage: pnpm cross-check
 */
import { loadAllMappings, readData, writeSummary } from './lib/io';
import { getPath } from './lib/paths';

type Difference = {
  pkg: string;
  model: string;
  field: string;
  sdk: Array<string>;
  modelsDev: Array<string>;
};

function toList({
  value,
  compare,
}: {
  value: unknown;
  compare: 'list' | 'trueKeys';
}): Array<string> {
  if (compare === 'trueKeys') {
    if (value === null || typeof value !== 'object') return [];
    return Object.entries(value)
      .filter(([, item]) => item === true)
      .map(([name]) => name)
      .sort();
  }
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string').sort() : [];
}

async function main(): Promise<void> {
  const data = await readData();
  const differences: Array<Difference> = [];
  const warnings: Array<string> = [];

  for (const { mapping } of await loadAllMappings()) {
    const crossCheck = mapping.crossCheck;
    if (!crossCheck) continue;

    let catalog: Record<string, unknown>;
    try {
      const module = (await import(crossCheck.module)) as Record<string, unknown>;
      catalog = module[crossCheck.export] as Record<string, unknown>;
      if (!catalog || typeof catalog !== 'object') throw new Error('not an object');
    } catch (error) {
      warnings.push(`${crossCheck.module}#${crossCheck.export} is not available: ${String(error)}`);
      continue;
    }

    for (const providerId of mapping.source.providers) {
      for (const model of Object.values(data.providers[providerId]?.models ?? {})) {
        const entry = catalog[model.id];
        if (!entry) continue;
        for (const [catalogPath, field] of Object.entries(crossCheck.fields)) {
          const sdk = toList({ value: getPath(entry, catalogPath), compare: field.compare });
          const modelsDev = toList({
            value: getPath(model.capabilities, field.from),
            compare: 'list',
          });
          if (sdk.join() === modelsDev.join()) continue;
          differences.push({
            pkg: mapping.package,
            model: model.id,
            field: field.from,
            sdk,
            modelsDev,
          });
        }
      }
    }
  }

  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  if (differences.length === 0) {
    console.log('The SDK catalogs and models.dev agree.');
    return;
  }

  const format = (values: Array<string>) => (values.length === 0 ? '-' : values.join(', '));
  const rows = differences.map(
    (row) =>
      `| \`${row.pkg}\` | \`${row.model}\` | \`${row.field}\` | ${format(row.sdk)} | ${format(row.modelsDev)} |`,
  );
  const table = [
    '| Package | Model | Field | SDK catalog | models.dev |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
  console.log(
    `${differences.length} differences between the SDK catalogs and models.dev:\n${table}`,
  );
  await writeSummary(
    [
      '### Differences between the SDK catalogs and models.dev',
      '',
      'Warnings only. The generated types use models.dev.',
      '',
      table,
    ].join('\n'),
  );
}

await main();
