/**
 * Releases the package when the commits since the last tag need it.
 *
 * 1. Finds the last `v*` tag and the commits after it.
 * 2. Takes the bump from the conventional commit messages, or from `--bump`.
 *    No release when no commit is `fix`, `perf`, `feat` or breaking.
 * 3. Sets the version in package.json (not committed), builds and publishes to npm. In GitHub
 *    Actions, the publish uses trusted publishing (OIDC) with provenance.
 * 4. Pushes the tag and creates a GitHub release with notes from the merged pull requests.
 *
 * The version lives only in the tags and on npm, so the release never commits to main.
 *
 * Usage: pnpm release [--bump patch|minor|major] [--dry-run]
 */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, writeSummary } from './lib/io';
import { bumpFromCommits, nextVersion, type Bump } from './lib/release-plan';

const BUMPS: ReadonlyArray<Bump> = ['patch', 'minor', 'major'];

function run(command: string, args: ReadonlyArray<string>): string {
  return execFileSync(command, args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function lastTag(): string | undefined {
  try {
    return run('git', ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*']);
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { bump: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
  });
  if (values.bump && !BUMPS.includes(values.bump as Bump)) {
    throw new Error(`--bump must be one of ${BUMPS.join(', ')}.`);
  }

  const tag = lastTag();
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const messages = run('git', ['log', range, '--format=%B%x00'])
    .split('\0')
    .map((message) => message.trim())
    .filter(Boolean);

  const bump = (values.bump as Bump | undefined) ?? bumpFromCommits(messages);
  if (!bump) {
    console.log(`No release: no commit since ${tag ?? 'the start'} changes the package.`);
    return;
  }

  const packageJson = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
  };
  const current = tag ? tag.slice(1) : packageJson.version;
  const version = nextVersion({ current, bump });
  console.log(
    `Release ${version} (${bump}, ${messages.length} commits since ${tag ?? 'the start'}).`,
  );
  if (values['dry-run']) return;

  const inActions = process.env.GITHUB_ACTIONS === 'true';
  run('npm', ['version', version, '--no-git-tag-version', '--allow-same-version']);
  run('pnpm', ['build']);
  run('npm', ['publish', '--access', 'public', ...(inActions ? ['--provenance'] : [])]);

  run('git', ['tag', `v${version}`]);
  run('git', ['push', 'origin', `v${version}`]);
  run('gh', ['release', 'create', `v${version}`, '--generate-notes', '--verify-tag']);
  // package.json keeps the version only in this checkout. The tag is the source of the version.
  run('git', ['checkout', '--', 'package.json']);

  await writeSummary(
    `### Released \`${version}\`\n\nhttps://www.npmjs.com/package/${packageJson.name}/v/${version}`,
  );
}

await main();
