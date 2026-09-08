import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEST_DATABASE_URL = 'file:./test.db';

/** prisma/test.db plus the journal/WAL files SQLite may leave behind. */
const artefacts = ['test.db', 'test.db-journal', 'test.db-wal', 'test.db-shm'].map((name) =>
  path.join(serverDir, 'prisma', name)
);

const removeArtefacts = () => {
  for (const file of artefacts) {
    fs.rmSync(file, { force: true });
  }
};

/**
 * Builds a throwaway SQLite database before the suite runs so tests never touch
 * dev.db (or a production database). `--force-reset` guarantees a clean schema
 * even if a previous run was interrupted.
 */
export async function setup() {
  removeArtefacts();

  execFileSync(
    'npx',
    ['prisma', 'db', 'push', '--force-reset', '--skip-generate', '--accept-data-loss'],
    {
      cwd: serverDir,
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    }
  );
}

export async function teardown() {
  removeArtefacts();
}
