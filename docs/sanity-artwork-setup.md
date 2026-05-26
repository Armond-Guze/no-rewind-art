# Sanity Artwork Setup

Use Sanity for artwork records and images, while the site keeps the current JSON catalog as a fallback.

## 1. Create or open the Studio

From Sanity's project page, use the CLI command shown in the dashboard. For this project it should look like:

```sh
npm create sanity@latest -- --project os8xckqo --dataset production --typescript --template clean
```

The Studio in this repo is at `armoze/`. Its schema files are:

```text
armoze/schemaTypes/artworkProductType.ts
armoze/schemaTypes/index.ts
```

Make sure `armoze/sanity.config.ts` imports the schema types:

```ts
import { schemaTypes } from './schemaTypes';

export default defineConfig({
  // existing config...
  schema: {
    types: schemaTypes,
  },
});
```

Run the Studio:

```sh
cd armoze
npm run dev
```

## 2. Add artwork products

Create `Artwork Product` documents in Sanity.

Use the same stable IDs from `src/data/catalog.json`, for example:

```text
life-has-no-rewind-canvas
```

The important fields are:

- `productId`
- `slug`
- `previousSlugs`
- `title`
- `description`
- `longDescription`
- `mainImage`
- `imageAlt`
- `artworkShape`
- `tone`
- `collectionSlugs`
- `sizePreset`
- `details`

For normal products, set `sizePreset` and leave `Use Custom Size Options` off. That makes the product use the shared pricing from `Catalog Settings`, so a single price edit can update every artwork using that preset.

Only turn `Use Custom Size Options` on when one product truly needs different sizes or prices from the rest of the store.

Leave `Use Custom Frame Options` off for normal products. The storefront automatically gives every size Canvas, Black Frame, and White Frame options. Turn it on only when one product needs different frame pricing.

If you rename artwork and want the URL to change, update the `slug` field too. Add the old slug to `previousSlugs` so older product links redirect to the new product URL.

## 3. Set shared size pricing

Create one `Catalog Settings` document in Sanity and fill out `Global Size Pricing`.

This is the best place to edit size prices because each preset is shared:

- `Portrait 2:3`: 12 x 18, 16 x 24, 24 x 36, etc.
- `Landscape Wide 2:1`: 20 x 10, 30 x 15, 60 x 30, etc.
- `Landscape 3:2`: 18 x 12, 24 x 16, 36 x 24, etc.
- `Landscape 4:3`: 16 x 12, 24 x 18, 32 x 24, etc.
- `Square Standard`: 12 x 12, 16 x 16, 24 x 24, etc.

Prices are stored in cents, so `$75.00` is `7500`.

## Google Merchant feed

After deployment, Google Merchant Center can use this scheduled feed URL:

```text
https://armoze.com/merchant-feed.xml
```

The feed is generated from the same Sanity-backed catalog as the storefront. Each size is sent as its own variant with the product as the shared item group.

## 4. Turn on Sanity in the site

Add these to `.env` locally and to Vercel environment variables:

```sh
SANITY_CATALOG_ENABLED=true
SANITY_PROJECT_ID=os8xckqo
SANITY_DATASET=production
SANITY_API_VERSION=2025-05-21
SANITY_READ_TOKEN=your_read_token
```

The site reads Sanity through `/api/products`. If Sanity is not configured, has no products, or is temporarily unavailable, it falls back to the existing local catalog.

If your dataset is private, create a read token in Sanity Manage under API settings and use it for `SANITY_READ_TOKEN`. Do not prefix this variable with `VITE_`; it should stay server-only.

## 5. Migration rhythm

Start with one artwork, verify it appears on the storefront, then migrate the rest.

This repo also includes a one-time importer. Run it from the Studio folder:

```sh
cd armoze
npx sanity exec scripts/import-catalog-to-sanity.mjs --with-user-token
```

After every artwork is in Sanity, remove large production image files from `public/artwork` and keep only tiny local placeholders or source files you truly want versioned.
