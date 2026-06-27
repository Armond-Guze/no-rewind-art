import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@sanity/client';

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const targetCatalog = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'src/data/catalog.json'), 'utf8'),
);

function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function syncSizeOptionsToTarget(presetName, sizeOptions = []) {
  const targetOptions = targetCatalog.sizePresets?.[presetName] || [];

  return sizeOptions.map((option, index) => ({
    ...option,
    priceInCents:
      targetOptions.find((targetOption) => targetOption.id === option.id || targetOption.label === option.label)
        ?.priceInCents ??
      targetOptions[index]?.priceInCents ??
      option.priceInCents,
  }));
}

function printChanges(title, previousOptions = [], nextOptions = []) {
  console.log(`\n${title}`);
  previousOptions.forEach((option, index) => {
    const nextOption = nextOptions[index];

    if (!nextOption) {
      return;
    }

    console.log(
      `${option.label.padEnd(8)} ${formatMoney(option.priceInCents).padStart(8)} -> ${formatMoney(nextOption.priceInCents).padStart(8)}`,
    );
  });
}

function getSanityClient() {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || 'production';
  const apiVersion = process.env.SANITY_API_VERSION || '2025-05-21';
  const token =
    process.env.SANITY_WRITE_TOKEN_PRICE ||
    process.env.SANITY_WRITE_TOKEN ||
    process.env.SANITY_API_WRITE_TOKEN ||
    process.env.SANITY_READ_TOKEN ||
    process.env.SANITY_API_READ_TOKEN;

  if (!projectId || !dataset || !token) {
    throw new Error('Set SANITY_PROJECT_ID, SANITY_DATASET, and a Sanity token before syncing prices.');
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token,
  });
}

async function main() {
  const client = getSanityClient();
  const settings = await client.fetch(`*[
    _type == "catalogSettings"
    && !(_id in path("drafts.**"))
  ][0]{_id, sizePresets}`);

  if (!settings?._id || !settings.sizePresets) {
    throw new Error('No Sanity catalogSettings document with sizePresets was found.');
  }

  const nextSizePresets = Object.fromEntries(
    Object.entries(settings.sizePresets).map(([presetName, sizeOptions]) => [
      presetName,
      syncSizeOptionsToTarget(presetName, sizeOptions),
    ]),
  );

  Object.entries(settings.sizePresets).forEach(([presetName, sizeOptions]) => {
    printChanges(`Preset: ${presetName}`, sizeOptions, nextSizePresets[presetName]);
  });

  const customProducts = await client.fetch(`*[
    _type == "artworkProduct"
    && useCustomSizeOptions == true
    && defined(sizeOptions)
    && !(_id in path("drafts.**"))
  ]{_id, title}`);

  if (customProducts.length) {
    console.log(
      `\nFound ${customProducts.length} custom-size Sanity products. Review those manually because preset target prices do not control custom sizeOptions.`,
    );
    customProducts.forEach((product) => console.log(`- ${product.title} (${product._id})`));
  }

  if (!shouldApply) {
    console.log('\nDry run only. Re-run with --apply to update Sanity.');
    return;
  }

  const result = await client.transaction().patch(settings._id, {
    set: {
      sizePresets: nextSizePresets,
    },
  }).commit({
    visibility: 'sync',
  });

  console.log(`\nUpdated Sanity prices in transaction ${result.transactionId}.`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
