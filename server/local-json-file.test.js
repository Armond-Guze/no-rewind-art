import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readJsonFile, writeJsonFileAtomic } from './local-json-file.js';

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'armoze-json-test-'));

  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('returns a fresh default for missing, empty, and whitespace-only files', async () => {
  await withTemporaryDirectory(async (directory) => {
    const filePath = path.join(directory, 'store.json');
    let defaultsCreated = 0;
    const createDefault = () => {
      defaultsCreated += 1;
      return { rows: [] };
    };

    const missing = await readJsonFile(filePath, createDefault);
    missing.rows.push('changed');

    await writeFile(filePath, '');
    const empty = await readJsonFile(filePath, createDefault);

    await writeFile(filePath, ' \r\n\t');
    const whitespace = await readJsonFile(filePath, createDefault);

    assert.equal(defaultsCreated, 3);
    assert.deepEqual(empty, { rows: [] });
    assert.deepEqual(whitespace, { rows: [] });
  });
});

test('keeps malformed nonblank JSON visible to callers', async () => {
  await withTemporaryDirectory(async (directory) => {
    const filePath = path.join(directory, 'store.json');
    await writeFile(filePath, '{"rows":');

    await assert.rejects(readJsonFile(filePath, () => ({ rows: [] })), SyntaxError);
  });
});

test('atomically creates and replaces valid JSON without leaving temporary files', async () => {
  await withTemporaryDirectory(async (directory) => {
    const filePath = path.join(directory, 'nested', 'store.json');
    const firstValue = { rows: [{ id: 'row-1' }] };
    const replacementValue = { rows: [{ id: 'row-2' }] };

    await writeJsonFileAtomic(filePath, firstValue);
    await writeJsonFileAtomic(filePath, replacementValue);

    assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')), replacementValue);
    assert.deepEqual(await readdir(path.dirname(filePath)), ['store.json']);
  });
});

test('keeps concurrent replacement writes complete', async () => {
  await withTemporaryDirectory(async (directory) => {
    const filePath = path.join(directory, 'store.json');
    await writeJsonFileAtomic(filePath, { writer: -1 });

    await Promise.all(
      Array.from({ length: 12 }, (_, writer) => writeJsonFileAtomic(filePath, { writer })),
    );

    const result = JSON.parse(await readFile(filePath, 'utf8'));
    assert.equal(Number.isInteger(result.writer), true);
    assert.equal(result.writer >= 0 && result.writer < 12, true);
    assert.deepEqual(await readdir(directory), ['store.json']);
  });
});
