#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const productConfigPath = path.resolve(projectRoot, 'mockups/config/products.json');
const sceneConfigPath = path.resolve(projectRoot, 'mockups/config/scenes.json');
const generatorSourcePath = path.resolve(projectRoot, 'scripts/mockups/generate.mjs');

function resolveProjectPath(relativePath) {
  return path.resolve(projectRoot, relativePath);
}

function parseArgs(argv) {
  const index = argv.indexOf('--only');
  const only = index >= 0 ? argv[index + 1] : '';
  if (!only) throw new Error('Choose a product with --only <slug>.');
  return { only };
}

async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function verifyImage(filePath, expectedSize, expectedHash, label) {
  await access(filePath);
  const metadata = await sharp(filePath).metadata();
  if (metadata.width !== expectedSize || metadata.height !== expectedSize) {
    throw new Error(`${label}: expected ${expectedSize}x${expectedSize}, got ${metadata.width}x${metadata.height}.`);
  }
  if (metadata.space !== 'srgb') {
    throw new Error(`${label}: expected sRGB, got ${metadata.space || 'unknown'}.`);
  }
  const hash = await sha256File(filePath);
  if (hash !== expectedHash) throw new Error(`${label}: file hash does not match manifest.`);
}

async function main() {
  const { only } = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(projectRoot, 'dist/mockups', only, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const [productsConfig, scenesConfig] = await Promise.all([
    readFile(productConfigPath, 'utf8').then(JSON.parse),
    readFile(sceneConfigPath, 'utf8').then(JSON.parse),
  ]);
  const product = productsConfig.products.find((candidate) => candidate.slug === only);
  if (!product) throw new Error(`No configured product matched "${only}".`);
  const sceneMap = new Map(scenesConfig.scenes.map((scene) => [scene.id, scene]));
  const scenes = product.scenes.map((id) => {
    const scene = sceneMap.get(id);
    if (!scene) throw new Error(`${only}: unknown scene ${id}.`);
    return scene;
  });

  const sourceHash = await sha256File(resolveProjectPath(product.source));
  const rendererSourceHash = await sha256File(generatorSourcePath);
  const sceneHashes = Object.fromEntries(
    await Promise.all(
      scenes.map(async (scene) => [
        scene.id,
        await sha256File(resolveProjectPath(scene.background)),
      ]),
    ),
  );
  const currentFingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        rendererVersion: scenesConfig.rendererVersion,
        rendererSourceHash,
        product,
        output: scenesConfig.output,
        scenes,
        sourceHash,
        sceneHashes,
      }),
    )
    .digest('hex');

  if (manifest.product !== only) throw new Error(`Manifest is for ${manifest.product}, not ${only}.`);
  if (manifest.fingerprint !== currentFingerprint) {
    throw new Error('Inputs, configuration, or renderer changed; regenerate the mockups.');
  }
  if (!Array.isArray(manifest.outputs) || manifest.outputs.length !== 3) {
    throw new Error('Manifest must contain exactly three outputs.');
  }
  if (new Set(manifest.outputs.map((output) => output.sceneId)).size !== 3) {
    throw new Error('The three outputs must use distinct scenes.');
  }

  const declaredRatio = manifest.frontCrop.width / manifest.frontCrop.height;
  if (Math.abs(declaredRatio - manifest.croppedRatio) > 0.000001) {
    throw new Error('Recorded crop ratio is inconsistent.');
  }

  for (const output of manifest.outputs) {
    const geometryRatio = output.geometry.width / output.geometry.height;
    if (Math.abs(geometryRatio - manifest.croppedRatio) / manifest.croppedRatio > 0.001) {
      throw new Error(`${output.sceneId}: canvas geometry stretched the artwork.`);
    }
    await verifyImage(
      resolveProjectPath(output.masterPath),
      manifest.outputDimensions.master,
      output.masterHash,
      `${output.sceneId} master`,
    );
    await verifyImage(
      resolveProjectPath(output.webPath),
      manifest.outputDimensions.web,
      output.webHash,
      `${output.sceneId} web`,
    );
  }

  const contactSheetPath = resolveProjectPath(manifest.contactSheetPath);
  await access(contactSheetPath);
  if ((await sha256File(contactSheetPath)) !== manifest.contactSheetHash) {
    throw new Error('Contact-sheet hash does not match manifest.');
  }
  console.log(`Verified ${manifest.product}: 3 square masters, 3 web images, exact ${manifest.aspectRatio} artwork ratio.`);
  console.log(`Contact sheet: ${contactSheetPath}`);
}

main().catch((error) => {
  console.error(`Mockup verification failed: ${error.message}`);
  process.exitCode = 1;
});
