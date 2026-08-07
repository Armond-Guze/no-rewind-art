#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const generatorSourcePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(generatorSourcePath), '../..');
const productConfigPath = path.resolve(projectRoot, 'mockups/config/products.json');
const sceneConfigPath = path.resolve(projectRoot, 'mockups/config/scenes.json');

function parseArgs(argv) {
  const args = { all: false, force: false, dryRun: false, only: '' };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--all') args.all = true;
    else if (value === '--force') args.force = true;
    else if (value === '--dry-run') args.dryRun = true;
    else if (value === '--only') args.only = argv[index + 1] || '';
  }

  if (!args.all && !args.only) {
    throw new Error('Choose a product with --only <slug>, or intentionally use --all.');
  }

  if (args.all && args.only) {
    throw new Error('Use either --all or --only, not both.');
  }

  return args;
}

function parseRatio(value) {
  const match = String(value).match(/^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/);
  if (!match) throw new Error(`Invalid aspect ratio: ${value}`);
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!(width > 0 && height > 0)) throw new Error(`Invalid aspect ratio: ${value}`);
  return width / height;
}

function resolveProjectPath(relativePath) {
  return path.resolve(projectRoot, relativePath);
}

function toManifestPath(absolutePath) {
  return path.relative(projectRoot, absolutePath).split(path.sep).join('/');
}

function normalizedPixels(value, size, minimum = 0) {
  return Math.max(minimum, Math.round(Number(value) * size));
}

function scaledPixels(value, size) {
  return Math.round(Number(value) * size);
}

function calculateCanvasGeometry(scene, ratio, outputSize) {
  const maxWidth = normalizedPixels(scene.canvas.maxWidth, outputSize, 1);
  const maxHeight = normalizedPixels(scene.canvas.maxHeight, outputSize, 1);

  let width = maxWidth;
  let height = Math.round(width / ratio);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * ratio);
  }

  const centerX = normalizedPixels(scene.canvas.centerX, outputSize);
  const centerY = normalizedPixels(scene.canvas.centerY, outputSize);
  const left = Math.round(centerX - width / 2);
  const top = Math.round(centerY - height / 2);

  if (left < 0 || top < 0 || left + width > outputSize || top + height > outputSize) {
    throw new Error(`${scene.id}: calculated canvas falls outside the ${outputSize}px square.`);
  }

  return { left, top, width, height };
}

async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function outputSetMatchesManifest(manifest) {
  const expectedFiles = (manifest.outputs || []).flatMap((output) => [
    { filePath: output.masterPath, hash: output.masterHash },
    { filePath: output.webPath, hash: output.webHash },
  ]);
  expectedFiles.push({ filePath: manifest.contactSheetPath, hash: manifest.contactSheetHash });

  if (expectedFiles.some(({ filePath, hash }) => !filePath || !hash)) return false;
  for (const expected of expectedFiles) {
    const absolutePath = resolveProjectPath(expected.filePath);
    if (!(await exists(absolutePath))) return false;
    if ((await sha256File(absolutePath)) !== expected.hash) return false;
  }
  return true;
}

async function makeShadow(width, height, blur, opacity) {
  const pad = Math.max(6, Math.ceil(blur * 3));
  return {
    buffer: await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: opacity },
      },
    })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .blur(blur)
      .png()
      .toBuffer(),
    pad,
  };
}

function canvasTextureSvg(width, height, opacity) {
  const normalizedOpacity = Math.max(0, Math.min(0.08, Number(opacity) || 0));
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="weave" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 1.5H7 M1.5 0V7" stroke="#ffffff" stroke-width="0.55" stroke-opacity="0.6"/>
          <path d="M0 5.5H7 M5.5 0V7" stroke="#000000" stroke-width="0.45" stroke-opacity="0.38"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#weave)" opacity="${normalizedOpacity}"/>
    </svg>
  `);
}

function lightingSvg(width, height, lighting) {
  const fromLeft = lighting.direction !== 'right';
  const x1 = fromLeft ? '0%' : '100%';
  const x2 = fromLeft ? '100%' : '0%';
  const highlight = Math.max(0, Math.min(0.12, Number(lighting.highlightOpacity) || 0));
  const shade = Math.max(0, Math.min(0.08, Number(lighting.shadeOpacity) || 0));

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="light" x1="${x1}" y1="0%" x2="${x2}" y2="100%">
          <stop offset="0%" stop-color="#fff4df" stop-opacity="${highlight}"/>
          <stop offset="48%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="${shade}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#light)"/>
    </svg>
  `);
}

async function prepareArtwork(product, outputGeometry, sourcePath) {
  const crop = product.frontCrop;
  const base = sharp(sourcePath, { limitInputPixels: false }).extract(crop);
  const resized = await base
    .resize(outputGeometry.width, outputGeometry.height, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .removeAlpha()
    .toColourspace('srgb')
    .png()
    .toBuffer();

  return sharp(resized)
    .composite([
      { input: canvasTextureSvg(outputGeometry.width, outputGeometry.height, product.textureOpacity), blend: 'soft-light' },
      { input: lightingSvg(outputGeometry.width, outputGeometry.height, product.activeSceneLighting), blend: 'soft-light' },
    ])
    .png()
    .toBuffer();
}

async function renderScene({ product, scene, sourcePath, outputSize }) {
  const ratio = parseRatio(product.aspectRatio);
  const geometry = calculateCanvasGeometry(scene, ratio, outputSize);
  const backgroundPath = resolveProjectPath(scene.background);
  const background = await sharp(backgroundPath)
    .resize(outputSize, outputSize, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .removeAlpha()
    .toColourspace('srgb')
    .png()
    .toBuffer();

  const activeProduct = { ...product, activeSceneLighting: scene.lighting };
  const artwork = await prepareArtwork(activeProduct, geometry, sourcePath);
  const depthX = normalizedPixels(scene.depth.x, outputSize, 2);
  const depthY = normalizedPixels(scene.depth.y, outputSize, 2);
  const edge = await sharp(artwork)
    .modulate({ brightness: scene.depth.brightness, saturation: 0.86 })
    .blur(0.35)
    .png()
    .toBuffer();

  const castBlur = normalizedPixels(scene.castShadow.blur, outputSize, 2);
  const contactBlur = normalizedPixels(scene.contactShadow.blur, outputSize, 2);
  const castShadow = await makeShadow(geometry.width, geometry.height, castBlur, scene.castShadow.opacity);
  const contactShadow = await makeShadow(
    geometry.width,
    geometry.height,
    contactBlur,
    scene.contactShadow.opacity,
  );

  const castLeft =
    geometry.left + scaledPixels(scene.castShadow.offsetX, outputSize) - castShadow.pad;
  const castTop =
    geometry.top + scaledPixels(scene.castShadow.offsetY, outputSize) - castShadow.pad;
  const contactLeft =
    geometry.left + scaledPixels(scene.contactShadow.offsetX, outputSize) - contactShadow.pad;
  const contactTop =
    geometry.top + scaledPixels(scene.contactShadow.offsetY, outputSize) - contactShadow.pad;

  const image = await sharp(background)
    .composite([
      { input: castShadow.buffer, left: castLeft, top: castTop },
      { input: contactShadow.buffer, left: contactLeft, top: contactTop },
      { input: edge, left: geometry.left + depthX, top: geometry.top + depthY },
      { input: artwork, left: geometry.left, top: geometry.top },
    ])
    .png()
    .toBuffer();

  return {
    image,
    geometry: {
      ...geometry,
      ratio: Number((geometry.width / geometry.height).toFixed(6)),
      depthX,
      depthY,
    },
  };
}

function contactSheetLabel(width, height, label) {
  const safe = label.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111111"/>
      <text x="${width / 2}" y="${Math.round(height * 0.66)}" text-anchor="middle"
        fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="600">${safe}</text>
    </svg>
  `);
}

async function createContactSheet(items, outputPath) {
  const tileSize = 1000;
  const labelHeight = 78;
  const gap = 18;
  const tiles = [];

  for (const item of items) {
    const image = await sharp(item.masterPath)
      .resize(tileSize, tileSize, { fit: 'cover' })
      .extend({ bottom: labelHeight, background: '#111111' })
      .composite([
        {
          input: contactSheetLabel(tileSize, labelHeight, item.label),
          left: 0,
          top: tileSize,
        },
      ])
      .png()
      .toBuffer();
    tiles.push(image);
  }

  const width = tiles.length * tileSize + (tiles.length + 1) * gap;
  const height = tileSize + labelHeight + gap * 2;
  await sharp({ create: { width, height, channels: 3, background: '#ece9e3' } })
    .composite(
      tiles.map((input, index) => ({
        input,
        left: gap + index * (tileSize + gap),
        top: gap,
      })),
    )
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
    .toFile(outputPath);
}

async function loadConfiguration() {
  const [productsConfig, scenesConfig] = await Promise.all([
    readFile(productConfigPath, 'utf8').then(JSON.parse),
    readFile(sceneConfigPath, 'utf8').then(JSON.parse),
  ]);
  return { productsConfig, scenesConfig };
}

async function validateProductSource(product, sourcePath) {
  const metadata = await sharp(sourcePath, { limitInputPixels: false }).metadata();
  const crop = product.frontCrop;
  if (
    crop.left < 0 ||
    crop.top < 0 ||
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.left + crop.width > metadata.width ||
    crop.top + crop.height > metadata.height
  ) {
    throw new Error(`${product.slug}: frontCrop is outside ${metadata.width}x${metadata.height}.`);
  }

  const declaredRatio = parseRatio(product.aspectRatio);
  const croppedRatio = crop.width / crop.height;
  if (Math.abs(declaredRatio - croppedRatio) / declaredRatio > 0.001) {
    throw new Error(
      `${product.slug}: crop ratio ${croppedRatio.toFixed(5)} does not match ${product.aspectRatio}.`,
    );
  }

  return { metadata, croppedRatio };
}

async function generateProduct(product, scenesConfig, args) {
  const sourcePath = resolveProjectPath(product.source);
  const outputRoot = resolveProjectPath(scenesConfig.output.root);
  const productOutput = path.join(outputRoot, product.slug);
  const manifestPath = path.join(productOutput, 'manifest.json');
  const sceneMap = new Map(scenesConfig.scenes.map((scene) => [scene.id, scene]));
  const scenes = product.scenes.map((id) => {
    const scene = sceneMap.get(id);
    if (!scene) throw new Error(`${product.slug}: unknown scene ${id}.`);
    return scene;
  });

  if (new Set(product.scenes).size !== product.scenes.length || scenes.length !== 3) {
    throw new Error(`${product.slug}: configure exactly three distinct scenes.`);
  }

  const { metadata, croppedRatio } = await validateProductSource(product, sourcePath);
  for (const scene of scenes) {
    const geometry = calculateCanvasGeometry(
      scene,
      croppedRatio,
      scenesConfig.output.masterSize,
    );
    if (product.frontCrop.width < geometry.width || product.frontCrop.height < geometry.height) {
      throw new Error(
        `${product.slug}: source crop is too small for the ${scene.id} master placement.`,
      );
    }
  }
  const sourceHash = await sha256File(sourcePath);
  const rendererSourceHash = await sha256File(generatorSourcePath);
  const sceneHashes = Object.fromEntries(
    await Promise.all(
      scenes.map(async (scene) => [scene.id, await sha256File(resolveProjectPath(scene.background))]),
    ),
  );
  const fingerprint = createHash('sha256')
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

  if (!args.force && (await exists(manifestPath))) {
    const existing = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (existing.fingerprint === fingerprint && (await outputSetMatchesManifest(existing))) {
      console.log(`- ${product.slug}: unchanged; skipped (use --force to rebuild).`);
      return;
    }
  }

  console.log(`- ${product.slug}: ${metadata.width}x${metadata.height}, front ${product.aspectRatio}.`);
  if (args.dryRun) {
    console.log(`  would render ${scenes.length} square mockups to ${productOutput}`);
    return;
  }

  await mkdir(productOutput, { recursive: true });
  const outputs = [];
  const contactItems = [];

  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const order = String(index + 1).padStart(2, '0');
    const baseName = `${product.slug}__${order}-${scene.id}`;
    const masterPath = path.join(productOutput, `${baseName}__square-master.png`);
    const webPath = path.join(productOutput, `${baseName}__square-web.jpg`);
    const rendered = await renderScene({
      product,
      scene,
      sourcePath,
      outputSize: scenesConfig.output.masterSize,
    });

    await sharp(rendered.image)
      .png({ compressionLevel: scenesConfig.output.pngCompressionLevel })
      .toFile(masterPath);
    await sharp(rendered.image)
      .resize(scenesConfig.output.webSize, scenesConfig.output.webSize, {
        fit: 'cover',
        kernel: sharp.kernel.lanczos3,
      })
      .jpeg({ quality: scenesConfig.output.jpegQuality, chromaSubsampling: '4:4:4' })
      .toFile(webPath);

    const [masterHash, webHash] = await Promise.all([sha256File(masterPath), sha256File(webPath)]);
    outputs.push({
      sceneId: scene.id,
      label: scene.label,
      masterPath: toManifestPath(masterPath),
      webPath: toManifestPath(webPath),
      masterHash,
      webHash,
      geometry: rendered.geometry,
    });
    contactItems.push({ masterPath, label: scene.label });
    console.log(`  rendered ${path.basename(masterPath)}`);
  }

  const contactSheetPath = path.join(productOutput, `${product.slug}__contact-sheet.jpg`);
  await createContactSheet(contactItems, contactSheetPath);
  const contactSheetHash = await sha256File(contactSheetPath);

  const manifest = {
    schemaVersion: 1,
    rendererVersion: scenesConfig.rendererVersion,
    rendererSourceHash,
    fingerprint,
    generatedAt: new Date().toISOString(),
    product: product.slug,
    source: product.source,
    sourceHash,
    sourceDimensions: { width: metadata.width, height: metadata.height },
    frontCrop: product.frontCrop,
    aspectRatio: product.aspectRatio,
    croppedRatio,
    outputDimensions: {
      master: scenesConfig.output.masterSize,
      web: scenesConfig.output.webSize,
    },
    sceneHashes,
    contactSheetPath: toManifestPath(contactSheetPath),
    contactSheetHash,
    outputs,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`  wrote ${path.basename(contactSheetPath)} and manifest.json`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { productsConfig, scenesConfig } = await loadConfiguration();
  const selected = args.all
    ? productsConfig.products
    : productsConfig.products.filter((product) => product.slug === args.only);

  if (!selected.length) throw new Error(`No configured product matched "${args.only}".`);
  for (const product of selected) await generateProduct(product, scenesConfig, args);
}

main().catch((error) => {
  console.error(`Mockup generation failed: ${error.message}`);
  process.exitCode = 1;
});
