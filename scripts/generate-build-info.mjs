import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function run(cmd, fallback = 'unknown') {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const branch = run('git rev-parse --abbrev-ref HEAD', 'unknown-branch');
const commit = run('git rev-parse --short HEAD', 'unknown');
const lastEditedIso = run('git log -1 --format=%cI', new Date().toISOString());
const lastEditedEpoch = run('git log -1 --format=%ct', `${Math.floor(Date.now() / 1000)}`);

const outputDir = path.join(process.cwd(), 'lib');
mkdirSync(outputDir, { recursive: true });

const content = `export const BUILD_INFO = {
  branch: ${JSON.stringify(branch)},
  commit: ${JSON.stringify(commit)},
  lastEditedIso: ${JSON.stringify(lastEditedIso)},
  lastEditedEpoch: ${Number(lastEditedEpoch)},
  display: ${JSON.stringify(`${branch}-${commit}`)},
} as const;
`;

writeFileSync(path.join(outputDir, 'build-info.ts'), content);
console.log(`Generated build info: ${branch}-${commit}`);
