import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const defaultMinimumItemCount = 100;
const defaultMaximumItemDropRatio = 0.2;
const defaultMinimumOfferOverlapRatio = 0.8;
const memorySnapshotKey = Symbol.for('armoze.merchant-feed.last-known-good');
const databasePoolKey = Symbol.for('armoze.merchant-feed.snapshot-pool');
const databaseReadyKey = Symbol.for('armoze.merchant-feed.snapshot-database-ready');

function parseRatio(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : fallback;
}

function parsePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function getSnapshotFile() {
  const snapshotDirectory =
    process.env.LOCAL_PRODUCT_STORE_DIR ||
    (process.env.VERCEL
      ? path.join(os.tmpdir(), 'armoze-products')
      : path.join(os.homedir(), '.armoze', 'products'));

  return path.join(snapshotDirectory, 'last-known-good-sanity-merchant-feed.xml');
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '';
}

function normalizeDatabaseUrl(databaseUrl) {
  try {
    const parsedUrl = new URL(databaseUrl);
    parsedUrl.searchParams.delete('sslcert');
    parsedUrl.searchParams.delete('sslkey');
    parsedUrl.searchParams.delete('sslmode');
    parsedUrl.searchParams.delete('sslrootcert');
    return parsedUrl.toString();
  } catch {
    return databaseUrl;
  }
}

function getDatabasePool() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return null;
  }

  if (!globalThis[databasePoolKey]) {
    globalThis[databasePoolKey] = new Pool({
      connectionString: normalizeDatabaseUrl(databaseUrl),
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000,
      max: 2,
    });
  }

  return globalThis[databasePoolKey];
}

async function ensureSnapshotTable(pool) {
  globalThis[databaseReadyKey] ??= pool
    .query(`
      create table if not exists merchant_feed_snapshots (
        snapshot_key text primary key,
        feed_xml text not null,
        item_count integer not null,
        updated_at timestamptz not null default now()
      );
    `)
    .catch((error) => {
      globalThis[databaseReadyKey] = null;
      throw error;
    });

  await globalThis[databaseReadyKey];
}

function getSafetyOptions() {
  return {
    minimumItemCount: parsePositiveInteger(
      process.env.MERCHANT_FEED_MIN_ITEM_COUNT,
      defaultMinimumItemCount,
    ),
    maximumItemDropRatio: parseRatio(
      process.env.MERCHANT_FEED_MAX_ITEM_DROP_RATIO,
      defaultMaximumItemDropRatio,
    ),
    minimumOfferOverlapRatio: parseRatio(
      process.env.MERCHANT_FEED_MIN_OFFER_OVERLAP_RATIO,
      defaultMinimumOfferOverlapRatio,
    ),
    allowCatalogReset: process.env.MERCHANT_FEED_ALLOW_CATALOG_RESET === 'true',
  };
}

export function getMerchantOfferIds(xml) {
  const ids = new Set();
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;

  while ((itemMatch = itemPattern.exec(String(xml || ''))) !== null) {
    const idMatch = itemMatch[1].match(/<g:id>([\s\S]*?)<\/g:id>/);
    const id = idMatch?.[1]?.trim();

    if (id) {
      ids.add(id);
    }
  }

  return ids;
}

function getMalformedMerchantItemCount(xml) {
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  let malformedItemCount = 0;
  let itemMatch;

  while ((itemMatch = itemPattern.exec(String(xml || ''))) !== null) {
    const itemXml = itemMatch[1];
    const priceMatch = itemXml.match(/<g:price>\s*(\d+(?:\.\d{1,2})?)\s+USD\s*<\/g:price>/);
    const hasRequiredTextTags = [
      'g:id',
      'g:link',
      'g:image_link',
      'g:availability',
    ].every((tag) => new RegExp(`<${tag}>\\s*[^<]+\\s*</${tag}>`).test(itemXml));
    const hasPositivePrice = Number(priceMatch?.[1]) > 0;

    if (!hasRequiredTextTags || !hasPositivePrice) {
      malformedItemCount += 1;
    }
  }

  return malformedItemCount;
}

export function assessMerchantFeedCandidate(candidateXml, previousXml = '', options = {}) {
  const {
    minimumItemCount = defaultMinimumItemCount,
    maximumItemDropRatio = defaultMaximumItemDropRatio,
    minimumOfferOverlapRatio = defaultMinimumOfferOverlapRatio,
    allowCatalogReset = false,
  } = options;
  const candidateText = String(candidateXml || '');
  const candidateOfferIds = getMerchantOfferIds(candidateText);
  const previousOfferIds = getMerchantOfferIds(previousXml);
  const candidateItemCount = (candidateText.match(/<item>/g) || []).length;
  const malformedItemCount = getMalformedMerchantItemCount(candidateText);

  if (
    !candidateText.includes('<rss') ||
    !candidateText.includes('<channel>') ||
    !candidateText.includes('</channel>') ||
    !candidateText.includes('</rss>')
  ) {
    return {
      safe: false,
      reason: 'The generated Merchant feed is not a complete RSS document.',
      candidateItemCount: candidateOfferIds.size,
      previousItemCount: previousOfferIds.size,
    };
  }

  if (candidateItemCount !== candidateOfferIds.size) {
    return {
      safe: false,
      reason: 'The generated Merchant feed contains missing or duplicate offer IDs.',
      candidateItemCount,
      previousItemCount: previousOfferIds.size,
    };
  }

  if (malformedItemCount) {
    return {
      safe: false,
      reason: `The generated Merchant feed contains ${malformedItemCount} items without a valid ID, link, image, availability, or positive USD price.`,
      candidateItemCount,
      previousItemCount: previousOfferIds.size,
    };
  }

  if (candidateOfferIds.size < minimumItemCount) {
    return {
      safe: false,
      reason: `The generated Merchant feed has ${candidateOfferIds.size} items; at least ${minimumItemCount} are required.`,
      candidateItemCount: candidateOfferIds.size,
      previousItemCount: previousOfferIds.size,
    };
  }

  if (!previousOfferIds.size || allowCatalogReset) {
    return {
      safe: true,
      candidateItemCount: candidateOfferIds.size,
      previousItemCount: previousOfferIds.size,
      overlapRatio: previousOfferIds.size ? 0 : 1,
    };
  }

  const minimumAllowedCount = Math.ceil(previousOfferIds.size * (1 - maximumItemDropRatio));

  if (candidateOfferIds.size < minimumAllowedCount) {
    return {
      safe: false,
      reason: `The generated Merchant feed dropped from ${previousOfferIds.size} to ${candidateOfferIds.size} items, exceeding the configured safety limit.`,
      candidateItemCount: candidateOfferIds.size,
      previousItemCount: previousOfferIds.size,
    };
  }

  const overlappingOfferCount = [...previousOfferIds].filter((id) => candidateOfferIds.has(id)).length;
  const overlapRatio = overlappingOfferCount / previousOfferIds.size;

  if (overlapRatio < minimumOfferOverlapRatio) {
    return {
      safe: false,
      reason: `Only ${(overlapRatio * 100).toFixed(1)}% of the previous offer IDs remain in the generated Merchant feed.`,
      candidateItemCount: candidateOfferIds.size,
      previousItemCount: previousOfferIds.size,
      overlapRatio,
    };
  }

  return {
    safe: true,
    candidateItemCount: candidateOfferIds.size,
    previousItemCount: previousOfferIds.size,
    overlapRatio,
  };
}

function getMemorySnapshot() {
  return globalThis[memorySnapshotKey] || '';
}

function setMemorySnapshot(xml) {
  globalThis[memorySnapshotKey] = xml;
}

async function readDatabaseSnapshot() {
  const pool = getDatabasePool();

  if (!pool) {
    return '';
  }

  try {
    await ensureSnapshotTable(pool);
    const result = await pool.query(
      'select feed_xml from merchant_feed_snapshots where snapshot_key = $1 limit 1',
      ['google-sanity-primary'],
    );
    return result.rows[0]?.feed_xml || '';
  } catch (error) {
    console.warn('Unable to read the persisted Merchant feed snapshot.', error?.message || error);
    return '';
  }
}

async function writeDatabaseSnapshot(xml) {
  const pool = getDatabasePool();

  if (!pool) {
    return;
  }

  try {
    await ensureSnapshotTable(pool);
    await pool.query(
      `
        insert into merchant_feed_snapshots (snapshot_key, feed_xml, item_count, updated_at)
        values ($1, $2, $3, now())
        on conflict (snapshot_key)
        do update set feed_xml = excluded.feed_xml,
                      item_count = excluded.item_count,
                      updated_at = excluded.updated_at
      `,
      ['google-sanity-primary', xml, getMerchantOfferIds(xml).size],
    );
  } catch (error) {
    console.warn('Unable to persist the Merchant feed snapshot in Postgres.', error?.message || error);
  }
}

async function readLastKnownGoodFeed() {
  const memorySnapshot = getMemorySnapshot();

  if (memorySnapshot) {
    return memorySnapshot;
  }

  const databaseSnapshot = await readDatabaseSnapshot();

  if (databaseSnapshot) {
    const assessment = assessMerchantFeedCandidate(databaseSnapshot, '', {
      ...getSafetyOptions(),
      allowCatalogReset: true,
    });

    if (assessment.safe) {
      setMemorySnapshot(databaseSnapshot);
      return databaseSnapshot;
    }

    console.warn('Ignoring an invalid persisted Merchant feed snapshot.', assessment.reason);
  }

  try {
    const snapshot = await readFile(getSnapshotFile(), 'utf8');
    const assessment = assessMerchantFeedCandidate(snapshot, '', {
      ...getSafetyOptions(),
      allowCatalogReset: true,
    });

    if (!assessment.safe) {
      console.warn('Ignoring an invalid Merchant feed snapshot.', assessment.reason);
      return '';
    }

    setMemorySnapshot(snapshot);
    return snapshot;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('Unable to read the Merchant feed snapshot.', error?.message || error);
    }

    return '';
  }
}

async function writeLastKnownGoodFeed(xml) {
  setMemorySnapshot(xml);
  await writeDatabaseSnapshot(xml);

  try {
    const snapshotFile = getSnapshotFile();
    await mkdir(path.dirname(snapshotFile), { recursive: true });
    await writeFile(snapshotFile, xml, 'utf8');
  } catch (error) {
    // Memory still provides protection for subsequent requests in this process.
    console.warn('Unable to persist the Merchant feed snapshot.', error?.message || error);
  }
}

function merchantFeedUnavailable(cause) {
  const error = new Error(
    'Merchant feed is temporarily unavailable because a safe current catalog could not be generated.',
    { cause },
  );
  error.status = 503;
  error.retryAfterSeconds = 900;
  error.code = 'MERCHANT_FEED_UNAVAILABLE';
  return error;
}

export async function withMerchantFeedResilience(buildCandidate) {
  const previousXml = await readLastKnownGoodFeed();

  try {
    const candidateXml = await buildCandidate();
    const assessment = assessMerchantFeedCandidate(
      candidateXml,
      previousXml,
      getSafetyOptions(),
    );

    if (!assessment.safe) {
      throw new Error(assessment.reason);
    }

    await writeLastKnownGoodFeed(candidateXml);
    return candidateXml;
  } catch (error) {
    if (previousXml) {
      console.warn(
        'Merchant feed generation failed its safety check; serving the last-known-good feed.',
        error?.message || error,
      );
      return previousXml;
    }

    throw merchantFeedUnavailable(error);
  }
}
