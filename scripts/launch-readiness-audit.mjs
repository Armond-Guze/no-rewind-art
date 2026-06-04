import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildGoogleMerchantFeedXml } from '../server/google-merchant-feed.js';
import { getSanitySitemapEntries } from '../server/sanity-sitemap.js';
import { createProductStore } from '../server/product-store.js';

const reportPath = path.resolve(process.cwd(), 'docs', 'launch-readiness-report.md');
const targetLaunchProducts = Number(process.env.LAUNCH_AUDIT_TARGET_PRODUCTS || 20);
const preferredTotalImages = Number(process.env.LAUNCH_AUDIT_PREFERRED_IMAGES || 6);
const minimumTotalImages = Number(process.env.LAUNCH_AUDIT_MIN_IMAGES || 4);

const allowedSizePresets = new Set([
  'landscapeWide',
  'landscapeThreeTwo',
  'landscapeFourThree',
  'portraitTwoThree',
  'portraitThreeFour',
  'squareStandard',
]);

const placeholderPatterns = [
  /dummy/i,
  /placeholder/i,
  /lorem/i,
  /checkout testing/i,
  /final product/i,
  /product name is chosen/i,
  /replace(d)? when/i,
  /coming soon/i,
  /todo/i,
];

function hasUsefulText(value, minimumLength = 1) {
  return typeof value === 'string' && value.trim().length >= minimumLength;
}

function hasPlaceholderText(...values) {
  return values
    .filter((value) => typeof value === 'string')
    .some((value) => placeholderPatterns.some((pattern) => pattern.test(value)));
}

function getTextLength(value) {
  return String(value || '').trim().length;
}

function normalizeRatio(value) {
  return String(value || '').replace(/\s/g, '');
}

function imageDimensionsFromUrl(url) {
  const match = String(url || '').match(/-(\d+)x(\d+)\.(?:png|jpe?g|webp|avif)(?:\?|$)/i);

  if (!match) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function isCleanSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || ''));
}

function line(value = '') {
  return `${value}\n`;
}

function mdEscape(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function formatIssueList(issues) {
  return issues.length ? issues.join('; ') : 'Ready';
}

function envPresent(name) {
  return Boolean(process.env[name] && !String(process.env[name]).includes('your_'));
}

function envStatus(name) {
  return envPresent(name) ? 'set' : 'missing';
}

function collectionProducts(catalog, collection) {
  const products = catalog.products.filter((product) => product.published);
  const applyCollectionRules = (items) => {
    if (collection.slug !== 'new-arrivals') {
      return items;
    }

    return items.filter((product) => !product.collectionSlugs.includes('best-sellers'));
  };

  if (Array.isArray(collection.productIds) && collection.productIds.length) {
    const taggedProducts = applyCollectionRules(
      products.filter((product) => product.collectionSlugs.includes(collection.slug)),
    );

    if (taggedProducts.length) {
      return taggedProducts;
    }

    return applyCollectionRules(
      collection.productIds
        .map((productId) => products.find((product) => product.id === productId))
        .filter(Boolean),
    );
  }

  if (Array.isArray(collection.tones) && collection.tones.length) {
    return applyCollectionRules(
      products.filter(
        (product) =>
          collection.tones.includes(product.tone) ||
          product.collectionSlugs.includes(collection.slug),
      ),
    );
  }

  return applyCollectionRules(products.filter((product) => product.collectionSlugs.includes(collection.slug)));
}

function auditProduct(product) {
  const blockers = [];
  const warnings = [];
  const allCopy = [
    product.title,
    product.description,
    product.longDescription,
    product.seoTitle,
    product.seoDescription,
    product.imageAlt,
    ...(product.details || []),
  ];
  const mainImageDimensions = imageDimensionsFromUrl(product.image);
  const totalImages = [product.image, ...(product.gallery || [])].filter(Boolean).length;
  const ratio = normalizeRatio(product.aspectRatio);

  if (!hasUsefulText(product.title, 3)) {
    blockers.push('missing title');
  }

  if (!isCleanSlug(product.slug)) {
    blockers.push('slug is missing or not URL clean');
  }

  if (!hasUsefulText(product.description, 70)) {
    warnings.push('short product description');
  }

  if (!hasUsefulText(product.longDescription, 120)) {
    warnings.push('short long description');
  }

  if (!hasUsefulText(product.seoTitle, 20)) {
    warnings.push('missing/short SEO title');
  } else if (getTextLength(product.seoTitle) > 70) {
    warnings.push('SEO title may be too long');
  }

  if (!hasUsefulText(product.seoDescription, 80)) {
    warnings.push('missing/short SEO description');
  } else if (getTextLength(product.seoDescription) > 165) {
    warnings.push('SEO description may be too long');
  }

  if (hasPlaceholderText(...allCopy)) {
    blockers.push('placeholder/testing copy still present');
  }

  if (!product.image) {
    blockers.push('missing main image');
  } else if (mainImageDimensions && Math.min(mainImageDimensions.width, mainImageDimensions.height) < 2000) {
    warnings.push(`main image is ${mainImageDimensions.width}x${mainImageDimensions.height}`);
  }

  if (!hasUsefulText(product.imageAlt, 18)) {
    warnings.push('image alt text is too thin');
  }

  if (totalImages < minimumTotalImages) {
    blockers.push(`only ${totalImages} product image(s)`);
  } else if (totalImages < preferredTotalImages) {
    warnings.push(`aim for ${preferredTotalImages} total images`);
  }

  if (!Array.isArray(product.collectionSlugs) || !product.collectionSlugs.length) {
    blockers.push('not assigned to a collection');
  }

  if (!allowedSizePresets.has(product.sizePreset)) {
    blockers.push('unknown or missing size preset');
  }

  if (!['2/1', '3/2', '4/3', '2/3', '3/4', '1/1'].includes(ratio)) {
    warnings.push(`unusual ratio ${product.aspectRatio || 'none'}`);
  }

  if (!Array.isArray(product.sizeOptions) || product.sizeOptions.length < 5) {
    blockers.push('needs 5 size options');
  }

  if ((product.sizeOptions || []).some((option) => !option.id || !option.label || !option.priceInCents)) {
    blockers.push('one or more size options need id, label, and price');
  }

  if (!Array.isArray(product.frameOptions) || product.frameOptions.length < 3) {
    warnings.push('frame options missing or incomplete');
  }

  if (!Array.isArray(product.details) || product.details.length < 3) {
    warnings.push('add at least 3 product details');
  }

  return {
    product,
    blockers,
    warnings,
    totalImages,
    mainImageDimensions,
    ready: blockers.length === 0,
  };
}

function auditFeed(feedXml, products) {
  const items = feedXml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const requiredTags = [
    'g:id',
    'g:title',
    'g:description',
    'g:link',
    'g:image_link',
    'g:availability',
    'g:price',
    'g:brand',
    'g:condition',
  ];
  const missingRequired = [];
  const localhostLinks = [];

  items.forEach((item, index) => {
    requiredTags.forEach((tag) => {
      if (!new RegExp(`<${tag}>[^<]+</${tag}>`).test(item)) {
        missingRequired.push(`item ${index + 1} missing ${tag}`);
      }
    });

    if (/localhost|127\.0\.0\.1|\.vercel\.app/.test(item)) {
      localhostLinks.push(index + 1);
    }
  });

  return {
    itemCount: items.length,
    expectedMinimumItemCount: products.reduce((total, product) => total + (product.sizeOptions?.length || 0), 0),
    missingRequired,
    localhostLinks,
    hasCheckoutTemplate: /<g:checkout_link_template>/.test(feedXml),
    hasFreeShipping: /<g:shipping>[\s\S]*?<g:price>0\.00 USD<\/g:price>[\s\S]*?<\/g:shipping>/.test(feedXml),
  };
}

function buildReport({
  catalog,
  productAudits,
  readyProducts,
  launchCandidates,
  collectionAudits,
  feedAudit,
  sitemapAudit,
}) {
  const now = new Date().toISOString();
  const publishedProducts = catalog.products.filter((product) => product.published);
  const blockers = productAudits.filter((audit) => audit.blockers.length);
  const warningProducts = productAudits.filter((audit) => audit.warnings.length);
  const envRows = [
    ['Sanity catalog', envStatus('SANITY_CATALOG_ENABLED'), process.env.SANITY_CATALOG_ENABLED === 'true' ? 'enabled' : 'not enabled locally'],
    ['Sanity read token', envStatus('SANITY_READ_TOKEN') === 'set' || envStatus('SANITY_API_READ_TOKEN') === 'set' ? 'set' : 'missing', 'needed for private dataset reads'],
    ['Stripe secret', envStatus('STRIPE_SECRET_KEY'), 'needed for real checkout'],
    ['Stripe webhook secret', envStatus('STRIPE_WEBHOOK_SECRET'), 'needed to mark paid orders'],
    ['Persistent orders DB', envStatus('DATABASE_URL') === 'set' || envStatus('POSTGRES_URL') === 'set' ? 'set' : 'missing', 'needed on Vercel so orders persist'],
    ['Owner email alerts', envStatus('RESEND_API_KEY') === 'set' && envStatus('ORDER_NOTIFICATION_EMAIL') === 'set' ? 'set' : 'missing', 'needed for order notifications'],
    ['Public client URL', envStatus('CLIENT_URL'), 'should be https://armoze.com in production'],
  ];

  let markdown = '';
  markdown += line('# Armoze Launch Readiness Report');
  markdown += line();
  markdown += line(`Generated: ${now}`);
  markdown += line();
  markdown += line('## Executive Summary');
  markdown += line();
  markdown += line(`- Published products: ${publishedProducts.length}`);
  markdown += line(`- Launch target: ${targetLaunchProducts} products`);
  markdown += line(`- Products passing hard launch checks: ${readyProducts.length}`);
  markdown += line(`- Products with blockers: ${blockers.length}`);
  markdown += line(`- Products with warnings: ${warningProducts.length}`);
  markdown += line(`- Merchant feed items: ${feedAudit.itemCount}`);
  markdown += line(`- Sitemap product URLs: ${sitemapAudit.productCount}`);
  markdown += line();

  markdown += line('## Launch Gate');
  markdown += line();
  if (publishedProducts.length < targetLaunchProducts) {
    markdown += line(`- Blocker: only ${publishedProducts.length} published products. Target is ${targetLaunchProducts}.`);
  } else {
    markdown += line(`- Product count is launchable: ${publishedProducts.length} published products.`);
  }

  if (readyProducts.length < targetLaunchProducts) {
    markdown += line(`- Content work remains: ${readyProducts.length} products pass hard checks, so choose/fix ${targetLaunchProducts - readyProducts.length} more before calling the 20-product launch complete.`);
  } else {
    markdown += line(`- Content gate is launchable: at least ${targetLaunchProducts} products pass hard checks.`);
  }

  if (feedAudit.missingRequired.length || feedAudit.localhostLinks.length) {
    markdown += line('- Merchant feed needs attention before submission.');
  } else {
    markdown += line('- Merchant feed has the core required item fields and production URLs.');
  }
  markdown += line();

  markdown += line('## 20-Product Sprint Shortlist');
  markdown += line();
  markdown += line('| Product | Slug | Images | Status | Needs |');
  markdown += line('| --- | --- | ---: | --- | --- |');
  launchCandidates.forEach((audit) => {
    markdown += line(
      `| ${mdEscape(audit.product.title)} | ${mdEscape(audit.product.slug)} | ${audit.totalImages} | ${audit.ready ? 'Ready' : 'Fix'} | ${mdEscape(formatIssueList([...audit.blockers, ...audit.warnings].slice(0, 4)))} |`,
    );
  });
  markdown += line();

  markdown += line('## Product Blockers');
  markdown += line();
  if (!blockers.length) {
    markdown += line('No hard product blockers found.');
  } else {
    markdown += line('| Product | Main Issues |');
    markdown += line('| --- | --- |');
    blockers.forEach((audit) => {
      markdown += line(`| ${mdEscape(audit.product.title)} | ${mdEscape(audit.blockers.join('; '))} |`);
    });
  }
  markdown += line();

  markdown += line('## Collection Coverage');
  markdown += line();
  markdown += line('| Collection | Products |');
  markdown += line('| --- | ---: |');
  collectionAudits.forEach((collection) => {
    markdown += line(`| ${mdEscape(collection.title)} | ${collection.count} |`);
  });
  markdown += line();

  markdown += line('## Google And SEO Outputs');
  markdown += line();
  markdown += line(`- Sitemap status: ${sitemapAudit.ok ? 'OK' : 'Needs attention'}`);
  markdown += line(`- Sitemap collections: ${sitemapAudit.collectionCount}`);
  markdown += line(`- Sitemap products: ${sitemapAudit.productCount}`);
  markdown += line(`- Merchant feed status: ${feedAudit.missingRequired.length || feedAudit.localhostLinks.length ? 'Needs attention' : 'OK'}`);
  markdown += line(`- Merchant feed expected item count: ${feedAudit.expectedMinimumItemCount}`);
  markdown += line(`- Merchant feed actual item count: ${feedAudit.itemCount}`);
  markdown += line(`- Checkout link template present: ${feedAudit.hasCheckoutTemplate ? 'yes' : 'no'}`);
  markdown += line(`- Free shipping field present: ${feedAudit.hasFreeShipping ? 'yes' : 'no'}`);
  if (feedAudit.missingRequired.length) {
    markdown += line(`- Missing feed fields: ${feedAudit.missingRequired.slice(0, 10).join('; ')}`);
  }
  if (feedAudit.localhostLinks.length) {
    markdown += line(`- Non-production feed links found in items: ${feedAudit.localhostLinks.slice(0, 20).join(', ')}`);
  }
  markdown += line();

  markdown += line('## Automation And Account Setup');
  markdown += line();
  markdown += line('| Area | Status | Why It Matters |');
  markdown += line('| --- | --- | --- |');
  envRows.forEach(([area, status, why]) => {
    markdown += line(`| ${area} | ${status} | ${why} |`);
  });
  markdown += line();
  markdown += line('Code currently supports Stripe checkout, Stripe webhook order capture, persistent order storage when a production database is configured, an admin order dashboard, and owner order emails when Resend is configured. It does not yet show an automatic print supplier order submission integration, so production/fulfillment still needs an operator step or a supplier API phase.');
  markdown += line();

  markdown += line('## Seven-Day Launch Path');
  markdown += line();
  markdown += line('1. Day 1: Pick the 20-product launch set, fix every Product Blocker above, and remove all placeholder/testing copy.');
  markdown += line('2. Day 2: Finish product images. Each launch product should have a clean main image, 4 to 6 supporting mockups, and accurate alt text.');
  markdown += line('3. Day 3: Run checkout end to end in Stripe test mode, verify webhook order capture, owner email alerts, and admin order status changes.');
  markdown += line('4. Day 4: Switch production secrets on Vercel, submit the sitemap in Search Console, and submit the Merchant feed in Google Merchant Center.');
  markdown += line('5. Day 5: Place one real small live order, verify payment, order storage, email notification, fulfillment workflow, and customer confirmation path.');
  markdown += line('6. Day 6: Publish launch offer messaging, post the best 5 products to social, and send direct warm outreach with product links.');
  markdown += line('7. Day 7: Review Search Console/Merchant warnings, fix anything rejected, and push traffic to the 3 strongest products.');

  return markdown;
}

async function main() {
  const store = createProductStore();
  await store.init();
  const catalog = await store.listCatalog({ includeUnpublished: true });
  const publishedProducts = catalog.products.filter((product) => product.published);
  const productAudits = publishedProducts.map(auditProduct);
  const readyProducts = productAudits.filter((audit) => audit.ready);
  const launchCandidates = [...productAudits]
    .sort((a, b) => {
      if (a.ready !== b.ready) {
        return a.ready ? -1 : 1;
      }

      return (
        a.blockers.length - b.blockers.length ||
        a.warnings.length - b.warnings.length ||
        b.totalImages - a.totalImages ||
        a.product.title.localeCompare(b.product.title)
      );
    })
    .slice(0, targetLaunchProducts);
  const collectionAudits = catalog.collections.map((collection) => ({
    slug: collection.slug,
    title: collection.title,
    count: collectionProducts(catalog, collection).length,
  }));

  const feedXml = await buildGoogleMerchantFeedXml();
  const feedAudit = auditFeed(feedXml, publishedProducts);

  let sitemapAudit = {
    ok: false,
    collectionCount: 0,
    productCount: 0,
  };

  try {
    const entries = await getSanitySitemapEntries();
    sitemapAudit = {
      ok: true,
      collectionCount: entries.collectionSlugs.length,
      productCount: entries.products.length,
    };
  } catch (error) {
    sitemapAudit = {
      ok: false,
      collectionCount: 0,
      productCount: 0,
      error: error?.message || 'Sitemap check failed.',
    };
  }

  const report = buildReport({
    catalog,
    productAudits,
    readyProducts,
    launchCandidates,
    collectionAudits,
    feedAudit,
    sitemapAudit,
  });

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report);

  const blockerCount = productAudits.reduce((total, audit) => total + audit.blockers.length, 0);
  const warningCount = productAudits.reduce((total, audit) => total + audit.warnings.length, 0);
  const merchantOk = !feedAudit.missingRequired.length && !feedAudit.localhostLinks.length;

  console.log(`Launch audit written to ${reportPath}`);
  console.log(`Published products: ${publishedProducts.length}`);
  console.log(`Products passing hard checks: ${readyProducts.length}/${targetLaunchProducts} target`);
  console.log(`Product blockers: ${blockerCount}`);
  console.log(`Product warnings: ${warningCount}`);
  console.log(`Merchant feed: ${merchantOk ? 'OK' : 'needs attention'} (${feedAudit.itemCount} items)`);
  console.log(`Sitemap: ${sitemapAudit.ok ? 'OK' : 'needs attention'} (${sitemapAudit.productCount} products)`);

  if (process.argv.includes('--strict')) {
    const strictFailure =
      publishedProducts.length < targetLaunchProducts ||
      readyProducts.length < targetLaunchProducts ||
      blockerCount > 0 ||
      !merchantOk ||
      !sitemapAudit.ok;

    if (strictFailure) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
