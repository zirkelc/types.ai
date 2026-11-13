/** The SDK packages that the sync updates within their ranges in package.json. */
export const SDK_PACKAGES: ReadonlyArray<string> = [
  'ai',
  '@ai-sdk/*',
  '@tanstack/ai',
  '@tanstack/ai-*',
];

export type Versions = Record<string, string>;

export type SdkUpdate = { name: string; from: string; to: string };

/** The packages with another version after the update, sorted by name. */
export function diffVersions({
  before,
  after,
}: {
  before: Versions;
  after: Versions;
}): Array<SdkUpdate> {
  return Object.keys(after)
    .filter((name) => before[name] !== undefined && before[name] !== after[name])
    .sort()
    .map((name) => ({ name, from: before[name]!, to: after[name]! }));
}

/** Renders the updates as Markdown for the PR body. Without updates, it returns an empty string. */
export function renderUpdates(updates: Array<SdkUpdate>): string {
  if (updates.length === 0) return '';
  return [
    '### SDK packages',
    '',
    '| Package | From | To |',
    '| --- | --- | --- |',
    ...updates.map(({ name, from, to }) => `| \`${name}\` | ${from} | ${to} |`),
  ].join('\n');
}
