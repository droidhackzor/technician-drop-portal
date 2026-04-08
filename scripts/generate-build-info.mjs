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
const lastEditedEpoch = Number(
  run('git log -1 --format=%ct', `${Math.floor(Date.now() / 1000)}`)
);

mkdirSync(path.join(process.cwd(), 'lib'), { recursive: true });

writeFileSync(
  path.join(process.cwd(), 'lib', 'build-info.ts'),
  `export const BUILD_INFO = {
  branch: ${JSON.stringify(branch)},
  commit: ${JSON.stringify(commit)},
  lastEditedIso: ${JSON.stringify(lastEditedIso)},
  lastEditedEpoch: ${lastEditedEpoch},
  display: ${JSON.stringify(`${branch}-${commit}`)},
} as const;
`
);

console.log(`Generated build info: ${branch}-${commit}`);
