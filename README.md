# No Rewind Art

React/Vite website and relaunch kit for No Rewind Art, a motivational wall art brand focused on ambition, discipline, money mindset, and future-focused spaces.

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
2. Open `src/data/products.ts`.
3. Add or update the product entry.

Use this folder naming convention:

```text
public/artwork/
  product-slug/
    01-main.png
    02-gallery.png
    03-gallery.png
    04-gallery.png
    05-gallery.png
```

For each product, set:

```ts
imageFolder: 'product-slug',
image: imagePath('product-slug', '01-main.png'),
gallery: buildGallery('product-slug'),
```

If you only have `01-main.png`, the site will still work. Add the other gallery
images later using the standard names.

Images can be `.jpg`, `.png`, `.webp`, or `.avif`, but keep each product's
gallery filenames consistent with the extensions used in `products.ts`.

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

Product page data lives in `src/data/products.ts`. Update each product's
`slug`, `gallery`, `sizeOptions`, `framingOptions`, and `details` there.

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
STRIPE_AUTOMATIC_TAX=false
STRIPE_ALLOW_INSECURE_LOCAL_TLS=false
CLIENT_URL=http://127.0.0.1:5173
PORT=4242
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
