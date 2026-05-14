# Armoze

React/Vite website and relaunch kit for Armoze, a motivational wall art brand focused on ambition, discipline, money mindset, and future-focused spaces.

## Files

- `src/App.tsx` - main React website
- `src/data/products.ts` - artwork/product list
- `src/styles.css` - site styling
- `index.html` - Vite app shell
- `public/artwork/` - put real artwork image files here
- `art-brand-relaunch-kit.md` - Etsy and brand relaunch plan
- `website-desktop-preview.png` - desktop screenshot preview
- `website-mobile-preview.png` - mobile screenshot preview

## Development

Install dependencies:

```bash
npm install
```

Start the local dev server and checkout backend:

```bash
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

Backend health check:

```text
http://127.0.0.1:4242/api/health
```

Build for production:

```bash
npm run build
```

## Next Steps

1. Replace sample product art with real artwork photos or mockups.
2. Replace Etsy placeholder links with final public listing links.
3. Connect a print-on-demand provider such as Printful or Printify.
4. Publish the site with GitHub Pages, Netlify, Vercel, or another static host.

## Adding Artwork

1. Create one folder per product inside `public/artwork/`.
2. Open `src/data/catalog.json`.
3. Add or update the product entry.

Use this folder naming convention:

```text
public/artwork/
  product-slug/
    01-main.png
    02-side.png
    03-detail.png
    04-room.png
    05-scale.png
```

For each product, set:

```ts
imageFolder: 'product-slug',
image: imagePath('product-slug', '01-main.png'),
gallery: buildGallery('product-slug', ['02-side.png', '03-detail.png', '04-room.png']),
```

The product page automatically shows `image` as the first gallery image. Put
extra mockups in `gallery`, not a duplicate copy of the main image. If you only
have `01-main.png`, the site will still work. Add the other gallery images later
using the standard names.

Images can be `.jpg`, `.png`, `.webp`, or `.avif`, but keep each product's
gallery filenames consistent with the extensions used in `catalog.json`.

## Editing Sizes, Prices, and Frames

Product size and frame data now lives in `src/data/catalog.json`, and both the
storefront and Stripe checkout read from that same file.

To change a product from a 2:1 shape to a 2:3 shape, edit that product's
`sizePreset`:

```json
"sizePreset": "portraitTwoThree",
"defaultSizeId": "24x36"
```

Common presets:

```text
landscapeWide      2:1 sizes such as 24 x 12, 36 x 18
portraitTwoThree   2:3 sizes such as 12 x 18, 24 x 36
landscapeThreeTwo  3:2 sizes such as 18 x 12, 36 x 24
squareStandard     square sizes such as 12 x 12, 24 x 24
```

To change prices, edit `priceInCents` inside `sizePresets` or add a custom
`sizeOptions` array directly to one product. To price frames, edit the product's
`frameOptions`. Black and white frames can use size-tiered deltas:

```json
{
  "id": "black-frame",
  "label": "Black Frame",
  "priceDeltaInCents": 0,
  "priceDeltaBySizeIndexInCents": [2000, 3000, 4000, 5000, 6000]
}
```

Stripe checkout uses the selected size plus the selected frame price delta. The
array matches the size list order, so the first size gets `+2000` cents, the
second gets `+3000`, and so on. If a product only has four sizes, the fifth
value is simply unused.

## Side Mockups

Use side mockups as transparent product cutouts, not full room scenes:

```text
public/artwork/
  bookshelf/
    01-main.png
    02-side.png
    03-detail.png
    04-room.png
    05-scale.png
```

`01-main.png` should be the clean front-facing canvas used for the first product
image and collection cards. `02-side.png` should be a 3/4 side-angle canvas
cutout with no wall, no floor, no background, and preferably no baked shadow.
The site adds its own shadow so every product feels consistent.

To keep `01-main.png` and `02-side.png` the same visual size, export them from
the same Photoshop artboard/template:

```text
Landscape mockup artboard: 4000 x 2400 px
Portrait mockup artboard: 3000 x 4200 px
Square mockup artboard: 3200 x 3200 px
```

Rules:

- Use the same artboard size for every mockup in that product folder.
- Keep the canvas/product centered on the same vertical center guide.
- Put the bottom of the canvas on the same baseline guide for `01-main` and
  `02-side`.
- Make the visible product fill roughly 82-88% of the artboard width.
- Export PNG/WebP with transparency.
- Do not use "trim transparent pixels" when exporting, because different
  transparent bounds make the browser scale each file differently.
- Do not bake in a drop shadow. The site adds the shadow.

A good file has the same transparent canvas size as the main mockup, a small
consistent margin, and only the canvas/product visible.

The product page automatically gives `01-main.*` and `02-side.*` the same clean
mockup sizing and shadow treatment. Room scenes and detail shots can use
`03-detail.png`, `04-room.png`, and `05-scale.png`; those are allowed to look
different.

AI prompt example:

```text
Create a transparent PNG product cutout of this canvas print from a 3/4 side
angle. Show the stretched canvas depth and side edge. No wall, no floor, no
room, no background, no frame, no drop shadow. Keep the product centered with a
small transparent margin. Premium canvas texture, matte ink, crisp detail.
Landscape 2:1 artwork, high resolution.
```

## Artwork Shadows

For the clean product-grid look, export each main product image as a transparent
PNG or WebP cutout with only the print/canvas visible. Do not bake in a room
background or shadow for the main listing image.

The site automatically adds the product shadow with CSS `drop-shadow()`, so one
style applies to every product image. This works best when the image has real
transparent pixels around the artwork. If an image has a solid background baked
in, the shadow will follow that full rectangle.

## Generating Canvas Cutouts

Use this kind of prompt when generating the main product image:

```text
Create a transparent PNG product cutout of this wall art as a real canvas print.
No background, no wall, no room, no frame, no shadow.
Show only the canvas/print itself, centered, with a small transparent margin.
Make the canvas look physical and premium: subtle woven canvas texture, matte
ink, slight fabric grain, crisp printed detail, clean stretched-canvas edges,
and natural depth without adding a drop shadow.
Aspect ratio 2:3, high resolution.
```

Change the aspect ratio depending on the product:

```text
Portrait: 2:3 or 3:4
Landscape: 3:2 or 4:3
Square: 1:1
```

For print-production files, keep a separate clean artwork master without fake
canvas edges, product shadows, room mockups, or transparent padding. The
canvas-cutout image is for the website listing presentation.

## Product Pages

Each product has its own listing page:

```text
/products/life-has-no-rewind
/products/money-is-energy
/products/keep-going
```

Product page data lives in `src/data/catalog.json`. Update each product's
`slug`, `gallery`, `sizePreset` or `sizeOptions`, `frameOptions`, and `details`
there.

Set `artworkShape` to control how the product image is displayed:

```ts
artworkShape: 'portrait' | 'landscape' | 'square'
```

## Collection Pages

Shop/category pages live at:

```text
/collections/best-sellers
/collections/money-ambition
/collections/discipline-focus
/collections/study-creative
/collections/new-arrivals
```

Collection definitions live in `src/data/products.ts` under `collections`.
Products are assigned with `collectionSlugs`, `productIds`, or `tones`.

## Stripe Checkout

This project uses Stripe Checkout Sessions. The React app owns the shop/cart
experience, and the backend creates secure Stripe checkout sessions.

Create a local `.env` file:

```bash
cp .env.example .env
```

Then add your Stripe test secret key:

```text
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_WEBHOOK_ALLOW_UNSIGNED=false
STRIPE_AUTOMATIC_TAX=false
STRIPE_ALLOW_INSECURE_LOCAL_TLS=false
CLIENT_URL=http://127.0.0.1:5173
PORT=4242
ADMIN_API_TOKEN=replace_with_a_long_private_admin_token
DATABASE_URL=
RESEND_API_KEY=
ORDER_NOTIFICATION_EMAIL=
```

Do not commit `.env` or paste your secret key into chat. Use Stripe test keys
first, then switch to live keys only when the products, shipping, tax, and
fulfillment process are ready.

`STRIPE_AUTOMATIC_TAX` defaults to off for local testing. Turn it on only after
your Stripe tax settings and head office address are configured in the Stripe
Dashboard.

If local checkout fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, your local Node
certificate chain is not trusting Stripe's certificate. For local Stripe test
mode only, set:

```text
STRIPE_ALLOW_INSECURE_LOCAL_TLS=true
```

Do not use that setting in production.

## Orders, Notifications, and Admin

The backend stores Checkout orders after sessions are created and completes
them from Stripe webhook events. Local development uses
`~/.armoze/orders/orders.json` by default. Production should set
`DATABASE_URL` to a Postgres/Supabase connection string so orders persist
outside the server filesystem.

Admin dashboard:

```text
http://127.0.0.1:5173/admin
```

Use the `ADMIN_API_TOKEN` from `.env` to sign in locally. The dashboard shows
paid orders, fulfillment status, notification history, revenue totals, and
average order value.

Stripe webhook endpoint:

```text
http://127.0.0.1:4242/api/webhooks/stripe
```

Production webhook endpoint:

```text
https://www.armoze.com/api/webhooks/stripe
```

For owner email alerts, set `RESEND_API_KEY`, `ORDER_NOTIFICATION_EMAIL`, and
optionally `ORDER_NOTIFICATION_FROM`. Without those values, orders still save
and the dashboard still works; email notifications are recorded as skipped.

## Vercel Production Checkout

The storefront deploys to Vercel and includes serverless API functions in
`api/`. Set these variables in Vercel Project Settings -> Environment Variables
for Production before deploying checkout live:

```text
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_from_the_armoze_com_webhook_endpoint
STRIPE_AUTOMATIC_TAX=false
STRIPE_ALLOW_INSECURE_LOCAL_TLS=false
STRIPE_WEBHOOK_ALLOW_UNSIGNED=false
CLIENT_URL=https://www.armoze.com
DATABASE_URL=postgresql://...
DATABASE_SSL=true
ADMIN_API_TOKEN=long_private_admin_token
RESEND_API_KEY=re_...
ORDER_NOTIFICATION_EMAIL=owner@example.com
ORDER_NOTIFICATION_FROM=Armoze Orders <orders@resend.dev>
```

Production should use `DATABASE_URL` or the Supabase/Vercel integration's
`POSTGRES_URL`; Vercel serverless functions should not depend on local JSON
files for order persistence.
