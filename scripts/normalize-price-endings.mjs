import 'dotenv/config';
import { createClient } from '@sanity/client';

const shouldApply = new Set(process.argv.slice(2)).has('--apply');

function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function normalizePrice(cents) {
  const value = Number(cents);

  if (!Number.isFinite(value) || value <= 0 || value % 100 !== 0) {
    return cents;
  }

  return value + 99;
}

function normalizeSizeOptions(sizeOptions = []) {
  const options = Array.isArray(sizeOptions) ? sizeOptions : [];

  return options.map((option) => ({
    ...option,
    priceInCents: normalizePrice(option.priceInCents),
  }));
}

function optionsChanged(previousOptions = [], nextOptions = []) {
  const options = Array.isArray(previousOptions) ? previousOptions : [];

  return options.some(
    (option, index) => option.priceInCents !== nextOptions[index]?.priceInCents,
  );
}

function getSanityClient() {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET || 'production';
  const apiVersion = process.env.SANITY_API_VERSION || '2025-05-21';
  const token = process.env.SANITY_WRITE_TOKEN;

  if (!projectId || !dataset || !token) {
    throw new Error(
      'Set SANITY_PROJECT_ID, SANITY_DATASET, and SANITY_WRITE_TOKEN before normalizing prices.',
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token,
  });
}

function collectProductChange(product) {
  const nextBasePrice = normalizePrice(product.priceInCents);
  const nextSizeOptions = normalizeSizeOptions(product.sizeOptions);
  const baseChanged = nextBasePrice !== product.priceInCents;
  const sizeOptionsChanged = optionsChanged(product.sizeOptions, nextSizeOptions);

  if (!baseChanged && !sizeOptionsChanged) {
    return null;
  }

  return {
    id: product._id,
    title: product.title || product._id,
    previousBasePrice: product.priceInCents,
    nextBasePrice,
    previousSizeOptions: product.sizeOptions || [],
    nextSizeOptions,
    patch: {
      ...(baseChanged ? { priceInCents: nextBasePrice } : {}),
      ...(sizeOptionsChanged ? { sizeOptions: nextSizeOptions } : {}),
    },
  };
}

function collectSettingsChange(settings) {
  if (!settings?._id || !settings.sizePresets) {
    return null;
  }

  const nextSizePresets = Object.fromEntries(
    Object.entries(settings.sizePresets).map(([presetName, sizeOptions]) => [
      presetName,
      normalizeSizeOptions(sizeOptions),
    ]),
  );
  const changed = Object.entries(settings.sizePresets).some(([presetName, sizeOptions]) =>
    optionsChanged(sizeOptions, nextSizePresets[presetName]),
  );

  return changed
    ? {
        id: settings._id,
        previousSizePresets: settings.sizePresets,
        nextSizePresets,
      }
    : null;
}

function printProductChange(change) {
  console.log(`\n${change.title}`);

  if (change.previousBasePrice !== change.nextBasePrice) {
    console.log(
      `  Base price: ${formatMoney(change.previousBasePrice)} -> ${formatMoney(change.nextBasePrice)}`,
    );
  }

  change.previousSizeOptions.forEach((option, index) => {
    const nextOption = change.nextSizeOptions[index];

    if (option.priceInCents !== nextOption?.priceInCents) {
      console.log(
        `  ${String(option.label || option.id).padEnd(12)} ${formatMoney(option.priceInCents)} -> ${formatMoney(nextOption.priceInCents)}`,
      );
    }
  });
}

async function main() {
  const client = getSanityClient();
  const [products, settings] = await Promise.all([
    client.fetch(`*[
      _type == "artworkProduct"
      && !(_id in path("drafts.**"))
    ]{_id, title, priceInCents, sizeOptions}`),
    client.fetch(`*[
      _type == "catalogSettings"
      && _id == "catalogSettings.default"
    ][0]{_id, sizePresets}`),
  ]);
  const productChanges = products.map(collectProductChange).filter(Boolean);
  const settingsChange = collectSettingsChange(settings);

  productChanges.forEach(printProductChange);

  if (settingsChange) {
    console.log('\nCatalog size presets');
    Object.entries(settingsChange.previousSizePresets).forEach(([presetName, sizeOptions]) => {
      sizeOptions.forEach((option, index) => {
        const nextOption = settingsChange.nextSizePresets[presetName][index];

        if (option.priceInCents !== nextOption?.priceInCents) {
          console.log(
            `  ${presetName}/${option.label || option.id}: ${formatMoney(option.priceInCents)} -> ${formatMoney(nextOption.priceInCents)}`,
          );
        }
      });
    });
  }

  const changeCount = productChanges.length + (settingsChange ? 1 : 0);

  if (!changeCount) {
    console.log('All catalog prices are already normalized.');
    return;
  }

  console.log(`\n${productChanges.length} products${settingsChange ? ' and catalog presets' : ''} need updates.`);

  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to update Sanity.');
    return;
  }

  let transaction = client.transaction();

  productChanges.forEach((change) => {
    transaction = transaction.patch(change.id, { set: change.patch });
  });

  if (settingsChange) {
    transaction = transaction.patch(settingsChange.id, {
      set: { sizePresets: settingsChange.nextSizePresets },
    });
  }

  const result = await transaction.commit({ visibility: 'sync' });
  console.log(`Updated ${changeCount} catalog documents in transaction ${result.transactionId}.`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
