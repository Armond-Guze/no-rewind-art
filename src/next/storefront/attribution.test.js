import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('./attribution.ts', import.meta.url), 'utf8');
const compiledSource = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiledSource).toString('base64')}`;
const { captureStorefrontAttribution, getSafeStorefrontPagePath } = await import(moduleUrl);

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

function installBrowser({ pathname = '/', search = '', referrer = '' } = {}) {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const location = {
    host: 'armoze.com',
    pathname,
    search,
  };

  globalThis.window = { localStorage, sessionStorage, location };
  globalThis.document = { referrer };

  return { localStorage, sessionStorage, location };
}

test('captures OpenAI oppref as a paid click and preserves the identifier', () => {
  installBrowser({
    pathname: '/products/life-has-no-rewind',
    search:
      '?campaign_id=campaign_123&ad_group_id=group_123&ad_id=ad_123&ad_account_id=account_123&oppref=oai_click_123',
  });

  const attribution = captureStorefrontAttribution();

  assert.equal(attribution.lastTouch.source, 'openai');
  assert.equal(attribution.lastTouch.medium, 'cpc');
  assert.equal(attribution.lastTouch.oppref, 'oai_click_123');
  assert.equal(attribution.lastTouch.campaignId, 'campaign_123');
  assert.equal(attribution.lastTouch.adGroupId, 'group_123');
  assert.equal(attribution.lastTouch.adId, 'ad_123');
  assert.equal(attribution.lastTouch.adAccountId, 'account_123');
  assert.match(attribution.lastTouch.landingPage, /oppref=oai_click_123/);
});

test('does not overwrite a paid last touch when a later session is direct', () => {
  const { sessionStorage, location } = installBrowser({
    pathname: '/collections/best-sellers',
    search: '?gclid=google_click_123',
  });

  const paidAttribution = captureStorefrontAttribution();
  assert.equal(paidAttribution.lastTouch.gclid, 'google_click_123');

  sessionStorage.clear();
  location.pathname = '/';
  location.search = '';

  const returningAttribution = captureStorefrontAttribution();

  assert.equal(returningAttribution.lastTouch.source, 'google');
  assert.equal(returningAttribution.lastTouch.medium, 'cpc');
  assert.equal(returningAttribution.lastTouch.gclid, 'google_click_123');
});

test('strips checkout secrets while retaining supported ad attribution parameters', () => {
  installBrowser({
    pathname: '/cart',
    search: '?checkout=success&session_id=cs_secret&gclid=google_click_456',
  });

  const pagePath = getSafeStorefrontPagePath();

  assert.equal(pagePath, '/cart?gclid=google_click_456');
  assert.doesNotMatch(pagePath, /cs_secret|session_id|checkout/);
});
