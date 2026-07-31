import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFeedItem } from './google-merchant-feed.js';

test('uses a baked-shadow merchant image as the primary Shopping image', () => {
  const product = {
    id: 'bookshelf-canvas',
    slug: 'bookshelf',
    title: 'Bookshelf Mindset',
    description: 'A motivational canvas print.',
    image: 'https://cdn.sanity.io/images/project/production/bookshelf-6000x3000.png',
    gallery: ['https://cdn.sanity.io/images/project/production/bookshelf-room-1600x1600.jpg'],
    videos: [],
    tone: 'minimal',
    collectionSlugs: ['study-creative'],
  };
  const sizeOption = { id: '48x24', label: '48 x 24', priceInCents: 14999 };
  const xml = buildFeedItem(product, sizeOption, 'https://armoze.com');

  assert.match(
    xml,
    /<g:image_link>https:\/\/armoze\.com\/merchant-images\/bookshelf-canvas\/image\.webp\?v=[a-f0-9]{12}<\/g:image_link>/,
  );
  assert.match(xml, /<g:additional_image_link>https:\/\/cdn\.sanity\.io\/images\/project\/production\/bookshelf-room-1600x1600\.jpg<\/g:additional_image_link>/);
  assert.doesNotMatch(xml, /<g:image_link>https:\/\/cdn\.sanity\.io/);
});
