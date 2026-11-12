import type { DataFile } from './select';

/**
 * The changes between two data files, classified for the sync PR.
 *
 * A change is a removal when it can make the published types narrower, so that user code that
 * compiled before stops to compile: a removed model or provider, a removed list value (for
 * example a reasoning effort), a flag that changes from `true` to `false`, or a removed field.
 * Removals need a review. All other changes (new models, new values, `false` to `true`, changed
 * names, dates and numbers) are safe.
 */
export type DataDiff = {
  addedModels: Array<string>;
  removedModels: Array<string>;
  /** Model ID to its changes. */
  changedModels: Map<string, Array<Change>>;
  /** True when no change is a removal. */
  safe: boolean;
};

export type Change = { path: string; kind: 'added' | 'removed' | 'changed'; detail: string };

type Leaves = { values: Map<string, unknown>; lists: Map<string, Set<string>> };

function collectLeaves({
  value,
  path,
  leaves,
}: {
  value: unknown;
  path: string;
  leaves: Leaves;
}): void {
  if (Array.isArray(value)) {
    leaves.lists.set(path, new Set(value.map((item) => JSON.stringify(item))));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectLeaves({ value: child, path: path ? `${path}.${key}` : key, leaves });
    }
    return;
  }
  leaves.values.set(path, value);
}

function leavesOf(value: unknown): Leaves {
  const leaves: Leaves = { values: new Map(), lists: new Map() };
  collectLeaves({ value, path: '', leaves });
  return leaves;
}

/** The changes of one model. Returns the changes and whether one of them is a removal. */
export function diffModel({ before, after }: { before: unknown; after: unknown }): {
  changes: Array<Change>;
  removal: boolean;
} {
  const old = leavesOf(before);
  const next = leavesOf(after);
  const changes: Array<Change> = [];
  let removal = false;

  for (const [path, value] of old.values) {
    if (!next.values.has(path) && !next.lists.has(path)) {
      changes.push({ path, kind: 'removed', detail: `${JSON.stringify(value)} removed` });
      removal = true;
      continue;
    }
    const nextValue = next.values.get(path);
    if (!next.values.has(path) || nextValue === value) continue;
    const narrowing = value === true && nextValue === false;
    if (narrowing) removal = true;
    changes.push({
      path,
      kind: narrowing ? 'removed' : 'changed',
      detail: `${JSON.stringify(value)} → ${JSON.stringify(nextValue)}`,
    });
  }
  for (const [path, value] of next.values) {
    if (old.values.has(path) || old.lists.has(path)) continue;
    changes.push({ path, kind: 'added', detail: `${JSON.stringify(value)} added` });
  }

  for (const [path, items] of old.lists) {
    const nextItems = next.lists.get(path);
    if (!nextItems) {
      if (next.values.has(path)) continue;
      changes.push({ path, kind: 'removed', detail: 'list removed' });
      removal = true;
      continue;
    }
    const removed = [...items].filter((item) => !nextItems.has(item));
    const added = [...nextItems].filter((item) => !items.has(item));
    if (removed.length > 0) {
      changes.push({ path, kind: 'removed', detail: `${removed.join(', ')} removed` });
      removal = true;
    }
    if (added.length > 0)
      changes.push({ path, kind: 'added', detail: `${added.join(', ')} added` });
  }
  for (const path of next.lists.keys()) {
    if (old.lists.has(path) || old.values.has(path)) continue;
    changes.push({ path, kind: 'added', detail: 'list added' });
  }

  return { changes: changes.sort((a, b) => a.path.localeCompare(b.path)), removal };
}

export function diffData({ before, after }: { before: DataFile; after: DataFile }): DataDiff {
  const diff: DataDiff = {
    addedModels: [],
    removedModels: [],
    changedModels: new Map(),
    safe: true,
  };
  const providers = new Set([...Object.keys(before.providers), ...Object.keys(after.providers)]);

  for (const providerId of [...providers].sort()) {
    const oldModels = before.providers[providerId]?.models ?? {};
    const newModels = after.providers[providerId]?.models ?? {};
    const ids = new Set([...Object.keys(oldModels), ...Object.keys(newModels)]);
    for (const modelId of [...ids].sort()) {
      const id = `${providerId}/${modelId}`;
      const old = oldModels[modelId];
      const next = newModels[modelId];
      if (!old) {
        diff.addedModels.push(id);
        continue;
      }
      if (!next) {
        diff.removedModels.push(id);
        diff.safe = false;
        continue;
      }
      const { changes, removal } = diffModel({ before: old, after: next });
      if (removal) diff.safe = false;
      if (changes.length > 0) diff.changedModels.set(id, changes);
    }
  }
  return diff;
}

/** Renders the diff as Markdown for the PR body and the job summary. */
export function renderDiff(diff: DataDiff): string {
  const lines: Array<string> = [];
  lines.push(
    diff.safe
      ? '**Safe:** the sync only adds or changes data. It merges automatically when CI passes.'
      : '**Review required:** the sync removes data. The published types can become narrower, so user code can stop to compile.',
  );
  if (diff.removedModels.length > 0) {
    lines.push('', '### Removed models', '', ...diff.removedModels.map((id) => `- \`${id}\``));
  }
  if (diff.addedModels.length > 0) {
    lines.push('', '### New models', '', ...diff.addedModels.map((id) => `- \`${id}\``));
  }
  if (diff.changedModels.size > 0) {
    lines.push('', '### Changed models', '', '| Model | Field | Change |', '| --- | --- | --- |');
    for (const [id, changes] of diff.changedModels) {
      for (const change of changes) {
        const mark = change.kind === 'removed' ? '**removed:** ' : '';
        lines.push(`| \`${id}\` | \`${change.path}\` | ${mark}${change.detail} |`);
      }
    }
  }
  return lines.join('\n');
}
