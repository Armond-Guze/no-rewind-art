import assert from 'node:assert/strict';
import test from 'node:test';
import { assessMerchantFeedCandidate, getMerchantOfferIds } from './merchant-feed-resilience.js';

function feed(ids) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>',
    ...ids.map(
      (id) =>
        `<item><g:id>${id}</g:id><g:link>https://armoze.com/products/${id}</g:link><g:image_link>https://armoze.com/${id}.jpg</g:image_link><g:availability>in_stock</g:availability><g:price>49.99 USD</g:price></item>`,
    ),
    '</channel></rss>',
  ].join('');
}

test('extracts offer IDs from individual feed items', () => {
  assert.deepEqual([...getMerchantOfferIds(feed(['one', 'two']))], ['one', 'two']);
});

test('accepts a healthy candidate that preserves the prior catalog', () => {
  const previous = feed(Array.from({ length: 205 }, (_, index) => `offer-${index}`));
  const candidate = feed([
    ...Array.from({ length: 200 }, (_, index) => `offer-${index}`),
    ...Array.from({ length: 10 }, (_, index) => `new-offer-${index}`),
  ]);
  const result = assessMerchantFeedCandidate(candidate, previous);

  assert.equal(result.safe, true);
  assert.equal(result.candidateItemCount, 210);
  assert.ok(result.overlapRatio > 0.97);
});

test('rejects the known catastrophic fallback-size drop', () => {
  const previous = feed(Array.from({ length: 205 }, (_, index) => `offer-${index}`));
  const candidate = feed(Array.from({ length: 149 }, (_, index) => `offer-${index}`));
  const result = assessMerchantFeedCandidate(candidate, previous);

  assert.equal(result.safe, false);
  assert.match(result.reason, /dropped from 205 to 149/);
});

test('rejects a similarly sized catalog with mostly different offer IDs', () => {
  const previous = feed(Array.from({ length: 205 }, (_, index) => `offer-${index}`));
  const candidate = feed([
    ...Array.from({ length: 40 }, (_, index) => `offer-${index}`),
    ...Array.from({ length: 165 }, (_, index) => `fallback-${index}`),
  ]);
  const result = assessMerchantFeedCandidate(candidate, previous);

  assert.equal(result.safe, false);
  assert.match(result.reason, /19\.5%/);
});

test('rejects an implausibly small first feed without a snapshot', () => {
  const result = assessMerchantFeedCandidate(feed(['only-offer']));

  assert.equal(result.safe, false);
  assert.match(result.reason, /at least 100/);
});

test('rejects feed items with missing required commerce data', () => {
  const ids = Array.from({ length: 100 }, (_, index) => `offer-${index}`);
  const candidate = feed(ids).replace(
    '<g:price>49.99 USD</g:price>',
    '<g:price>0.00 USD</g:price>',
  );
  const result = assessMerchantFeedCandidate(candidate);

  assert.equal(result.safe, false);
  assert.match(result.reason, /without a valid ID, link, image, availability, or positive USD price/);
});
