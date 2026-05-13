import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const artworkOutputDir = path.resolve('dist', 'artwork');
const sourceExtensions = new Set(['.ai', '.psb', '.psd']);
const sourceDirectoryName = /^MOCKUP DIMENSIONS/i;

let removedCount = 0;

async function cleanDirectory(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }

    throw error;
  }

  await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (sourceDirectoryName.test(entry.name)) {
        await rm(entryPath, { recursive: true, force: true });
        removedCount += 1;
        return;
      }

      await cleanDirectory(entryPath);
      return;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
      await rm(entryPath, { force: true });
      removedCount += 1;
    }
  }));
}

await cleanDirectory(artworkOutputDir);

if (removedCount > 0) {
  console.log(`Removed ${removedCount} source artwork item${removedCount === 1 ? '' : 's'} from dist.`);
}
