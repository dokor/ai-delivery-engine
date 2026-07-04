import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

/** A throwaway project directory with helpers to write files and clean up. */
export interface TempProject {
  dir: string;
  write(relativePath: string, content: string): Promise<void>;
  writeJson(relativePath: string, value: unknown): Promise<void>;
  cleanup(): Promise<void>;
}

/** Creates an isolated temp directory for a test project. */
export async function createTempProject(): Promise<TempProject> {
  const dir = await mkdtemp(join(tmpdir(), 'ade-test-'));

  const write = async (relativePath: string, content: string): Promise<void> => {
    const target = join(dir, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  };

  return {
    dir,
    write,
    writeJson: (relativePath, value) => write(relativePath, `${JSON.stringify(value, null, 2)}\n`),
    cleanup: () => rm(dir, { recursive: true, force: true })
  };
}
