export type Bump = 'major' | 'minor' | 'patch';

const RELEASE_TYPES = { fix: 'patch', perf: 'patch', feat: 'minor' } as const;
const BUMP_ORDER: Array<Bump> = ['patch', 'minor', 'major'];
const HEADER = /^(?<type>[a-z]+)(?:\([^)]*\))?(?<breaking>!)?:/;

/**
 * The bump that a list of conventional commit messages gives, or `undefined` when no commit
 * changes the published package:
 * - `fix` and `perf` give a patch, `feat` gives a minor version.
 * - `!` after the type or a `BREAKING CHANGE:` footer gives a major version.
 * - Other types (`chore`, `docs`, `test`, `ci`, `refactor`) give no release.
 */
export function bumpFromCommits(messages: ReadonlyArray<string>): Bump | undefined {
  let bump: Bump | undefined;
  for (const message of messages) {
    const match = HEADER.exec(message.trim());
    if (!match?.groups) continue;
    const breaking = match.groups.breaking === '!' || /^BREAKING[ -]CHANGE:/m.test(message);
    const type = match.groups.type as string;
    const next: Bump | undefined = breaking
      ? 'major'
      : RELEASE_TYPES[type as keyof typeof RELEASE_TYPES];
    if (next && (!bump || BUMP_ORDER.indexOf(next) > BUMP_ORDER.indexOf(bump))) bump = next;
  }
  return bump;
}

/**
 * The next version. Before 1.0.0, a breaking change gives a minor version, as semver allows for
 * 0.x versions. Version 1.0.0 is a manual release.
 */
export function nextVersion({ current, bump }: { current: string; bump: Bump }): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) throw new Error(`Version "${current}" is not a plain semver version.`);
  const [major, minor, patch] = match.slice(1).map(Number) as [number, number, number];
  const effective = bump === 'major' && major === 0 ? 'minor' : bump;
  switch (effective) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}
