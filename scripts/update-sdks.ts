/**
 * Updates the SDK packages within their ranges in package.json (no new major) and writes the
 * changed versions for the sync PR. The SDK packages have no minimum release age in the pnpm
 * settings, so a new version is taken at once.
 *
 * The sync runs it before it generates, so that new model data and the SDK types that accept it
 * are tested together in one pull request.
 *
 * Usage: pnpm update-sdks [--out <Markdown file for the PR body>]
 */
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { ROOT, writeSummary, writeText } from './lib/io';
import { diffVersions, renderUpdates, SDK_PACKAGES, type Versions } from './lib/sdk-updates';

function installedVersions(): Versions {
  const output = execFileSync('pnpm', ['ls', '--depth', '0', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const [project] = JSON.parse(output) as Array<{
    devDependencies?: Record<string, { version: string }>;
  }>;
  return Object.fromEntries(
    Object.entries(project?.devDependencies ?? {}).map(([name, { version }]) => [name, version]),
  );
}

const { values } = parseArgs({ options: { out: { type: 'string' } } });

const before = installedVersions();
execFileSync('pnpm', ['update', ...SDK_PACKAGES], { cwd: ROOT, stdio: 'inherit' });
const updates = diffVersions({ before, after: installedVersions() });

const markdown = renderUpdates(updates);
console.log(markdown || 'The SDK packages are up to date.');
if (values.out) await writeText(values.out, markdown ? `${markdown}\n` : '');
if (markdown) await writeSummary(markdown);
