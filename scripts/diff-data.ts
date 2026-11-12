/**
 * Compares data/models.json with the version in a git ref (default: HEAD) and writes the result
 * for the sync PR: a Markdown body, the job summary, and `safe=true|false` for the workflow.
 *
 * Usage: pnpm diff-data [--base <git ref>] [--out <file for the PR body>]
 */
import { execFileSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { parseArgs } from 'node:util';
import { diffData, renderDiff } from './lib/data-diff';
import { DATA_FILE, readData, ROOT, writeSummary, writeText } from './lib/io';
import type { DataFile } from './lib/select';

const { values } = parseArgs({
  options: { base: { type: 'string', default: 'HEAD' }, out: { type: 'string' } },
});

const path = relative(ROOT, DATA_FILE);
let before: DataFile;
try {
  const content = execFileSync('git', ['show', `${values.base}:${path}`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1_024 * 1_024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  before = JSON.parse(content) as DataFile;
} catch {
  // A first sync has no earlier data file. Then everything is new.
  before = { source: '', providers: {} };
}

const diff = diffData({ before, after: await readData() });
const body = renderDiff(diff);
console.log(body);

if (values.out) await writeText(values.out, `${body}\n`);
await writeSummary(body);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `safe=${diff.safe}\n`);
