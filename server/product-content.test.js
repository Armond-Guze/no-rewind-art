import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDefaultArtworkHighlights,
  buildDefaultSeoAliases,
  isGeneratedSeoAliases,
  resolveArtworkHighlights,
  resolveProductSeoAliases,
} from '../shared/product-content.js';
import { getProductAspectRatio, products } from './catalog.js';

test('buildDefaultSeoAliases returns a focused, stable set for each artwork theme', () => {
  const moneyAliases = buildDefaultSeoAliases('money');
  const cassetteAliases = buildDefaultSeoAliases('cassette');

  assert.equal(moneyAliases.length, 8);
  assert.ok(moneyAliases.includes('money wall art'));
  assert.ok(cassetteAliases.includes('music room wall art'));
  assert.notDeepEqual(moneyAliases, cassetteAliases);
});

test('resolveProductSeoAliases fills empty values without overwriting manual phrases', () => {
  assert.deepEqual(
    resolveProductSeoAliases([], 'focus', 'Dialed In'),
    buildDefaultSeoAliases('focus', 'Dialed In'),
  );
  assert.deepEqual(
    buildDefaultSeoAliases('focus', 'Dialed In').slice(0, 2),
    ['Dialed In wall art', 'Dialed In canvas print'],
  );
  assert.equal(isGeneratedSeoAliases(buildDefaultSeoAliases('minimal'), 'Dialed In'), true);
  assert.equal(
    isGeneratedSeoAliases(buildDefaultSeoAliases('focus', 'Old Product Name'), 'New Product Name'),
    true,
  );
  assert.deepEqual(
    resolveProductSeoAliases(buildDefaultSeoAliases('minimal'), 'focus', 'Dialed In'),
    buildDefaultSeoAliases('focus', 'Dialed In'),
  );
  assert.deepEqual(
    resolveProductSeoAliases([' Office Wall Art ', 'office wall art', 'Custom Phrase'], 'money'),
    ['Office Wall Art', 'Custom Phrase'],
  );
});

test('unknown or prototype-like artwork themes safely use the focus defaults', () => {
  assert.deepEqual(buildDefaultSeoAliases('constructor'), buildDefaultSeoAliases('focus'));
  assert.deepEqual(buildDefaultArtworkHighlights('toString'), buildDefaultArtworkHighlights('focus'));
});

test('generated search phrases always fit the Studio field limit', () => {
  const aliases = buildDefaultSeoAliases('focus', 'A'.repeat(80));
  assert.equal(aliases.length, 8);
  assert.ok(aliases.every((alias) => alias.length <= 60));
});

test('resolveArtworkHighlights replaces importer boilerplate and preserves custom highlights', () => {
  const legacyDetails = [
    'Built for bedrooms, offices, studios, gyms, and personal spaces.',
    'Ships securely packed to protect corners and surface quality.',
  ];
  const mixedDetails = [
    'Crisp print detail with rich contrast and money-inspired texture.',
    'Ships securely packed to protect corners and surface quality.',
  ];
  const customDetails = ['Numbered limited-edition artwork.', 'Signed by the artist.'];

  assert.deepEqual(
    resolveArtworkHighlights(legacyDetails, 'space'),
    buildDefaultArtworkHighlights('space'),
  );
  assert.equal(
    resolveArtworkHighlights(mixedDetails, 'money')[0],
    'Crisp print detail with rich contrast and money-inspired texture.',
  );
  assert.equal(resolveArtworkHighlights(mixedDetails, 'money').length, 2);
  assert.deepEqual(
    resolveArtworkHighlights(['Numbered limited-edition artwork.'], 'space'),
    [
      'Numbered limited-edition artwork.',
      'A natural fit for bedrooms, studios, gaming rooms, and creative spaces.',
    ],
  );
  assert.equal(
    resolveArtworkHighlights(
      [
        buildDefaultArtworkHighlights('minimal')[1],
        'Printed on demand using premium wall-art materials.',
      ],
      'minimal',
    ).length,
    2,
  );
  assert.deepEqual(resolveArtworkHighlights(customDetails, 'space'), customDetails);
});

test('normalized fallback products never expose internal editorial notes as highlights', () => {
  const internalCopy = /dummy|checkout testing|final (?:artwork|listing|product)|can be (?:adjusted|consolidated|refined|renamed|replaced|rewritten)|useful for testing/i;
  const leakedDetails = products.flatMap((product) =>
    product.details.filter((detail) => internalCopy.test(detail)),
  );

  assert.deepEqual(leakedDetails, []);
});

test('size preset remains authoritative when a legacy aspect ratio disagrees', () => {
  assert.equal(
    getProductAspectRatio({
      sizePreset: 'landscapeThreeTwo',
      aspectRatio: '2 / 3',
      artworkShape: 'portrait',
    }),
    '3 / 2',
  );
});
