import type { ModelsDevModel } from './models-dev-schema';
import type { Mapping, TargetMapping } from '../../mappings/define';

/** The data file: the filtered models.dev snapshot. */
export type DataFile = {
  source: string;
  providers: Record<
    string,
    {
      id: string;
      name: string;
      doc?: string;
      models: Record<string, ModelsDevModel>;
    }
  >;
};

export type SelectedModel = { providerId: string; model: ModelsDevModel };

/**
 * Selects the models of a target: models of the source providers with a source type that have
 * the target API (served by `source.aisdk`, if the mapping sets it). Sorted by model ID.
 */
export function selectModels({
  data,
  mapping,
  target,
}: {
  data: DataFile;
  mapping: Mapping;
  target: TargetMapping;
}): Array<SelectedModel> {
  const selected = new Map<string, SelectedModel>();
  for (const providerId of mapping.source.providers) {
    const provider = data.providers[providerId];
    if (!provider) throw new Error(`Provider "${providerId}" is not in the data file.`);
    for (const model of Object.values(provider.models)) {
      if (!mapping.source.types.includes(model.type)) continue;
      const api = model.api[target.api];
      if (!api) continue;
      if (mapping.source.aisdk && api.sdk?.aisdk !== mapping.source.aisdk) continue;
      // The first provider in the list wins for a model ID that more providers have.
      if (!selected.has(model.id)) selected.set(model.id, { providerId, model });
    }
  }
  return [...selected.values()].sort((a, b) => a.model.id.localeCompare(b.model.id));
}

/**
 * The capabilities of a model on one API: the top-level capabilities, with the values of the
 * API table on top.
 */
export function apiCapabilities({
  model,
  api,
}: {
  model: ModelsDevModel;
  api: string;
}): Record<string, unknown> {
  return { ...model.capabilities, ...model.api[api]?.capabilities };
}
