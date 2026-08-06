# Armoze

Next.js storefront for Armoze, a motivational wall art brand focused on ambition, discipline, money mindset, and future-focused spaces.

## Files

- `app/` - Next.js routes, metadata, sitemap, robots, and API route handlers
- `src/next/storefront/` - storefront page components
- `src/next/admin/` - private admin dashboard client
- `src/data/products.ts` - artwork/product list
- `src/data/catalog.json` - product, collection, size, and pricing data
- `src/styles.css` - site styling
- `public/artwork/` - put real artwork image files here
- `art-brand-relaunch-kit.md` - Etsy and brand relaunch plan
- `website-desktop-preview.png` - desktop screenshot preview
- `website-mobile-preview.png` - mobile screenshot preview

## Development

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Local site:

```text
http://127.0.0.1:3000
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

Google Shopping cannot see the storefront CSS. The Merchant feed therefore uses
`/merchant-images/<product-id>/image.webp`, which renders the same two-layer
shadow into a 1600 x 1600 white-background image. The clean `mainImage` remains
unchanged, and its original URL still powers the storefront. Merchant image URLs
include a version derived from the source asset so Google receives a new URL when
the Sanity main image changes.

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
/collections/music
/collections/study-creative
/collections/new-arrivals
```

Collection definitions live in `src/data/catalog.json` under `collections`.
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
CLIENT_URL=http://127.0.0.1:3000
PORT=4242
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
ADMIN_EMAILS=owner@example.com
ADMIN_API_TOKEN=replace_with_a_long_private_emergency_admin_token
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

If local checkout fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, fix or update the
local Node certificate trust chain. The application never disables TLS
verification globally.

## Orders, Notifications, and Admin

The backend stores Checkout orders after sessions are created and completes
them from Stripe webhook events. Local development uses
`~/.armoze/orders/orders.json` by default. Production should set
`DATABASE_URL` to a Postgres/Supabase connection string so orders persist
outside the server filesystem.

Production database schema and permissions are managed explicitly rather than
from serverless cold starts. For a new database, run `server/schema.sql` as the
database owner. For an existing database, apply
`server/migrations/20260806_lock_down_public_tables.sql` through the exact
Postgres role used by Vercel. The migration enables non-forced RLS, revokes
`PUBLIC`, `anon`, and `authenticated`, installs restrictive deny policies, and
hardens future-object defaults. Runtime startup only verifies this state.

With database credentials available locally, verification commands are:

```bash
npm run db:security:check
npm run db:security:verify-data-api
```

The second command uses only the Supabase publishable key and sends `limit=0`
requests; it never downloads table rows.

Admin dashboard:

```text
http://127.0.0.1:3000/admin
```

Sign in through the existing Supabase account flow with an email listed in the
comma-separated `ADMIN_EMAILS` variable. If `ADMIN_EMAILS` is completely unset,
the server temporarily treats `ORDER_NOTIFICATION_EMAIL` as the allowlisted
address for a backwards-compatible migration. Setting `ADMIN_EMAILS` to an
empty value intentionally disables that fallback.

`ADMIN_API_TOKEN` remains available only as emergency/legacy access. It is a
separate app credential, not a Sanity token or Stripe webhook secret. The
variable must stay server-only: never prefix it with `NEXT_PUBLIC_` or `VITE_`,
embed it in client code, or put it in a URL. The browser keeps an entered
emergency token in tab-scoped `sessionStorage`, so use Supabase sign-in for
normal access across devices. The dashboard shows paid orders, fulfillment
status, notification history, revenue totals, and average order value.

Customer accounts:

```text
http://127.0.0.1:5173/sign-in
```

The storefront uses Supabase Auth through `@supabase/supabase-js`. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` locally and in Vercel so
customers can create accounts, sign in, sign out, and request password reset
emails. These are public browser keys; do not use the Supabase service-role key
in any `VITE_` variable. `VITE_SUPABASE_ANON_KEY` is also supported if your
Supabase project still labels the browser key as an anon key.

In Supabase Dashboard -> Authentication -> URL Configuration, set the production
site URL to `https://armoze.com` and allow these redirects:

```text
https://armoze.com/sign-in
http://127.0.0.1:5173/sign-in
```

The admin dashboard also includes a product editor. It can update product
titles, SEO titles, descriptions, image alt text, gallery paths, product
details, size prices, frame add-on prices, and publish status. Existing
production product data is stored in Postgres/Supabase; new databases are
created and seeded through a controlled migration/import instead of request
startup. Local development stores edited products in
`~/.armoze/products/products.json`.

Catalog APIs:

```text
GET /api/products
GET /api/admin/products
PATCH /api/admin/products/:productId
GET /api/admin/assets
```

The storefront and Stripe checkout both read from the same product catalog
service. This keeps visible prices, cart totals, and checkout totals aligned.

Stripe webhook endpoint:

```text
http://127.0.0.1:4242/api/webhooks/stripe
```

Production webhook endpoint:

```text
https://armoze.com/api/webhooks/stripe
```

For owner email alerts, set `RESEND_API_KEY`, `ORDER_NOTIFICATION_EMAIL`, and
optionally `ORDER_NOTIFICATION_FROM`. Without those values, orders still save
and the dashboard still works; email notifications are recorded as skipped.

## Customer Emails

Customer transactional emails are paused by default, even when `RESEND_API_KEY`
is set. They send from `CUSTOMER_EMAIL_FROM` (falls back to
`NEWSLETTER_DISCOUNT_FROM`, then `ORDER_NOTIFICATION_FROM`) only after an
authenticated admin explicitly requests one. Owner order alerts remain
automatic and separate. Set `CUSTOMER_EMAILS_AUTOMATIC=true` only when all three
automatic customer flows should be enabled:

1. Order confirmation: sent once when an order first becomes paid.
2. Shipping notification: sent once when the admin dashboard marks an order as
   shipped. It includes the carrier, tracking number, and tracking link, so set
   those fields before changing the status to shipped.
3. Abandoned cart recovery: sent once when a Stripe Checkout session expires
   with a known customer email. It includes `NEWSLETTER_DISCOUNT_CODE`
   (default `FIRST15`), so make sure that promotion code actually exists in
   Stripe (test and live mode) or the code will fail at checkout.

Manual confirmation and shipping sends use:

```text
POST /api/admin/orders/:orderId/email
Authorization: Bearer <admin session token>
Content-Type: application/json

{"emailType":"confirmation"}
{"emailType":"shipping"}
```

Shipping email requests require the order to be paid, marked shipped, and have
a tracking number or tracking URL. Successful sends are recorded in the admin
notification log and guarded against duplicates. A deliberate repeat requires
`{"emailType":"confirmation","resend":true}` (or `shipping`).

When automatic delivery is enabled, Stripe checkout sessions expire after 24
hours and can trigger abandoned-cart recovery for customers whose email is
known. The recovery email uses `NEWSLETTER_DISCOUNT_CODE` (default `FIRST15`),
so the matching Stripe promotion code must exist in both test and live mode.

## Newsletter Signup

The footer newsletter form posts to:

```text
POST /api/newsletter
```

Local development stores subscribers in:

```text
~/.armoze/newsletter/subscribers.json
```

Production uses the same `DATABASE_URL`/Supabase Postgres connection as orders.
To set it up properly:

1. Make sure Vercel has `DATABASE_URL` and `DATABASE_SSL=true`.
2. Run `server/schema.sql` or the current controlled migration as the database
   owner; runtime startup deliberately does not create tables.
3. Redeploy, submit your own email in the footer, and confirm the row appears in Supabase.
4. In Resend, create a segment named `Newsletter Subscribers`, then add its ID
   to Vercel as `RESEND_SEGMENT_ID`. Also set
   `NEWSLETTER_CAMPAIGN_FROM=Armoze <hello@armoze.com>` and
   `NEWSLETTER_REPLY_TO=hello@armoze.com`.
5. Redeploy again. New signups now sync into the Resend segment automatically.
6. Open `/admin`, choose **Newsletter**, and use **Sync subscribers** once to
   copy older active signups into Resend.
7. Compose a campaign in the same screen and choose **Create Resend draft**.
   The site deliberately creates a draft instead of sending immediately. Review
   it, send yourself a test, and schedule or send it from the Resend dashboard.

Resend Broadcasts supplies delivery/engagement reporting and handles the
unsubscribe link included in the Armoze campaign template. The storefront
signup copy also states that subscribers are opting into occasional marketing
emails.

## Vercel Production Checkout

The storefront deploys to Vercel and includes serverless API functions in
`api/`. Set these variables in Vercel Project Settings -> Environment Variables
for Production before deploying checkout live:

```text
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_from_the_armoze_com_webhook_endpoint
STRIPE_AUTOMATIC_TAX=false
STRIPE_WEBHOOK_ALLOW_UNSIGNED=false
CLIENT_URL=https://armoze.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
DATABASE_URL=postgresql://...
DATABASE_SSL=true
ADMIN_EMAILS=owner@example.com
ADMIN_API_TOKEN=long_private_emergency_admin_token
RESEND_API_KEY=re_...
ORDER_NOTIFICATION_EMAIL=owner@example.com
ORDER_NOTIFICATION_FROM=Armoze Orders <orders@resend.dev>
CUSTOMER_EMAILS_AUTOMATIC=false
```

Production should use `DATABASE_URL` or the Supabase/Vercel integration's
`POSTGRES_URL`; Vercel serverless functions should not depend on local JSON
files for order persistence.

## Price Tier Drops, Tax, and Feeds

The storefront uses one product catalog for product pages, cart pricing, Stripe
Checkout line items, analytics item values, and the Google Merchant feed. When
`SANITY_CATALOG_ENABLED=true`, Sanity `catalogSettings.sizePresets` is the live
price source. The committed `src/data/catalog.json` is the fallback/source
target.

Current July 9, 2026 unframed size pricing lowers shared size options by tier:
$5, $5, $15, $50, and $65 for five-size presets. Square presets use $5, $5,
$50, and $65 because they have four shared sizes.

Preview the live Sanity sync:

```bash
npm run prices:drop-tiers
```

Apply the target prices from `src/data/catalog.json` to Sanity:

```bash
npm run prices:drop-tiers -- --apply
```

After applying live prices:

1. Set `STRIPE_AUTOMATIC_TAX=true` in Vercel Production after Stripe Tax is
   configured with the business address, registrations/nexus, and default tax
   settings. Set `STRIPE_PRODUCT_TAX_CODE=txcd_99999999` for general tangible
   goods unless Stripe recommends a more specific code for the catalog.
2. Redeploy Vercel so Checkout uses the updated tax setting.
3. If testing with a Stripe test key, configure Stripe Tax in test mode too.
   Test and live mode have separate tax settings; Checkout will not calculate
   tax in test mode until test mode has a valid head office address and tax
   registration.
4. Confirm `/merchant-feed.xml` or `/api/google-merchant-feed.xml` shows the
   same prices as the public product pages.
5. In Google Merchant Center, fetch the feed again and confirm products are not
   disapproved for price mismatch.
6. In Google Ads, leave purchase conversion tracking as-is unless the conversion
   label/account changed; Shopping and Performance Max pricing comes from the
   Merchant Center feed.
