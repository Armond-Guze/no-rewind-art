#!/usr/bin/env node
/**
 * Uploads the new baked-mockup images to Sanity and points every product at
 * them: replaces mainImage's asset (canvas version) and sets the
 * mockupFramedBlack / mockupFramedWhite fields (framed versions).
 *
 * Files are expected as <slug>_canvas.png, <slug>_framed-black.png and
 * <slug>_framed-white.png inside the mockups folder.
 *
 * Usage:
 *   SANITY_WRITE_TOKEN=xxx node scripts/upload-new-mockups.mjs [--dry-run] \
 *     [--dir ~/Downloads/armoze-new-mockups] [--only slug-a,slug-b]
 *
 * Create the token in sanity.io/manage -> API -> Tokens with Editor
 * permissions. It is only read from the environment; never commit it.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const dryRun = args.includes('--dry-run');
const mockupsDir = path.resolve(
  getArg('--dir', path.join(os.homedir(), 'Downloads', 'armoze-new-mockups')).replace(/^~(?=$|\/)/, os.homedir()),
);
const onlySlugs = (getArg('--only', '') || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const token = process.env.SANITY_WRITE_TOKEN;

if (!token && !dryRun) {
  console.error('Missing SANITY_WRITE_TOKEN (Editor permissions). Aborting.');
  process.exit(1);
}

if (!existsSync(mockupsDir)) {
  console.error(`Mockups folder not found: ${mockupsDir}`);
  process.exit(1);
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'os8xckqo',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2025-05-21',
  token,
  useCdn: false,
});

const FILE_KINDS = [
  { suffix: 'canvas', field: 'mainImage' },
  { suffix: 'framed-black', field: 'mockupFramedBlack' },
  { suffix: 'framed-white', field: 'mockupFramedWhite' },
];

const products = await client.fetch(
  `*[_type == "artworkProduct" && !(_id in path("drafts.**"))]{ _id, title, "slug": slug.current }`,
);
const drafts = await client.fetch(`*[_type == "artworkProduct" && _id in path("drafts.**")]{ "slug": slug.current }`);

console.log(`Found ${products.length} published products.`);
if (drafts.length) {
  console.warn(
    `Warning: ${drafts.length} product(s) have unpublished drafts (${drafts
      .map((d) => d.slug)
      .join(', ')}). Publishing those drafts later will overwrite these image changes for that product.`,
  );
}

let updated = 0;
let skipped = 0;

for (const product of products) {
  if (!product.slug || (onlySlugs.length && !onlySlugs.includes(product.slug))) {
    continue;
  }

  const files = FILE_KINDS.map((kind) => ({
    ...kind,
    filePath: path.join(mockupsDir, `${product.slug}_${kind.suffix}.png`),
  }));
  const missing = files.filter((file) => !existsSync(file.filePath));

  if (missing.length) {
    console.warn(`- ${product.slug}: SKIPPED, missing ${missing.map((file) => path.basename(file.filePath)).join(', ')}`);
    skipped += 1;
    continue;
  }

  if (dryRun) {
    console.log(`- ${product.slug}: would upload 3 images and patch ${product._id}`);
    updated += 1;
    continue;
  }

  const patch = {};

  for (const file of files) {
    const buffer = await readFile(file.filePath);
    const asset = await client.assets.upload('image', buffer, {
      filename: path.basename(file.filePath),
    });

    if (file.field === 'mainImage') {
      // Only swap the asset so the existing alt text and hotspot are kept.
      patch['mainImage.asset'] = { _type: 'reference', _ref: asset._id };
    } else {
      patch[file.field] = {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
      };
    }
  }

  await client.patch(product._id).set(patch).commit();
  updated += 1;
  console.log(`- ${product.slug}: uploaded 3 images, patched ${product._id}`);
}

console.log(`\nDone. ${updated} product(s) ${dryRun ? 'would be ' : ''}updated, ${skipped} skipped.`);
