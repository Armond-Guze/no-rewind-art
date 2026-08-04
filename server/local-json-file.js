import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const retryableRenameErrors = new Set(['EACCES', 'EBUSY', 'EPERM']);

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function renameWithRetry(sourcePath, destinationPath) {
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await rename(sourcePath, destinationPath);
      return;
    } catch (error) {
      if (!retryableRenameErrors.has(error.code) || attempt === maxAttempts - 1) {
        throw error;
      }

      await wait(10 * (2 ** attempt));
    }
  }
}

export async function readJsonFile(filePath, createDefault) {
  try {
    const raw = await readFile(filePath, 'utf8');

    if (!raw.trim()) {
      return createDefault();
    }

    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return createDefault();
    }

    throw error;
  }
}

export async function writeJsonFileAtomic(filePath, value) {
  const directory = path.dirname(filePath);
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;

  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await renameWithRetry(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}
