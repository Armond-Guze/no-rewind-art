# Armoze Google search setup

Armoze is an online-only store. Use Merchant Center and Google's merchant/brand
profile features. A local Google Business Profile with a map and local reviews
requires an eligible business that meets customers in person.

## Account checked September 21, 2026

- Merchant Center: Armoze, account 5793512839.
- `armoze.com` is verified and claimed.
- The Search Console URL-prefix property `https://armoze.com/` is verified for
  `hello@armoze.com` with the owner's explicit approval. Its public
  `google-site-verification` tag lives in `app/layout.jsx`; retain this tag so
  verification persists.
- Resubmitted `/sitemap.xml` on September 21; Search Console confirmed
  "Sitemap submitted successfully". Its previous discovery count may remain
  visible until Google reads the new sitemap.
- Search Console confirmed "Indexing requested" and priority crawl queue
  acceptance for the homepage, `/products/invest-in-yourself`, and
  `/products/you-cant-turn-back-the-clock` after the release.
- Customer support points to `https://armoze.com/support` and
  `hello@armoze.com`.
- PRODUCTS SOURCE 2 imported 250 product variants in its September 21 update.
  The import reports all attributes recognized and no product-file issues.
  This is feed ingestion status, not a claim that every offer is approved.
- No Brand entry appears in the account's navigation. Searching for the exact
  brand name and `my business` while signed in did not expose a brand editor.
  Availability is controlled by Google; a profile cannot be forced with markup.
- Google Customer Reviews reports that no opt-in notification has been displayed
  in more than 30 days. Follow-up investigation is recorded below.

## Website setup

- Product structured data, `primaryImageOfPage`, Open Graph/Twitter previews,
  and product image sitemap entries point to the same versioned
  `/merchant-images/<product-id>/image.webp?v=...` URL used by the Merchant feed.
- These existing 1600 × 1600 images embed the shadow against an opaque white
  background. Google thumbnails do not inherit the site's CSS shadow effects.
  Existing transparent assets can also contain baked lighting, but organic
  Search had still been directed to the raw transparent source instead of the
  consistent merchant rendering.
- The source asset hash determines the version. Replacing a main image produces
  a new URL without repeatedly changing URLs for unchanged images.
- Home/about/support identity markup uses `OnlineStore`, the existing Armoze
  logo, legal name, support email, return policy, and the same Instagram,
  TikTok, and YouTube URLs displayed in the footer.
- The storefront's product layout and original art are unchanged.

## After release

Released to `https://armoze.com/` on September 21, 2026. Production build and
TypeScript validation passed; all five existing image/feed tests passed.
Live checks found 50 product image sitemap entries, all matching the feed.
Three product pages plus one size-specific URL returned matching product,
page-primary, and Open Graph image references; sampled images returned
`200 image/webp`.

1. Confirm a product page's `og:image`, `Product.image[0]`, and
   `primaryImageOfPage.contentUrl` all match the feed's primary image URL.
2. Confirm `/sitemap.xml` contains an `image:loc` for each product with a main
   image and that those URLs return `200 image/webp`.
3. Use Search Console URL Inspection on the homepage, Invest In Yourself, and
   You Cant Turn Back The Clock. Test the live URL, then request indexing.
   Submit or resubmit `https://armoze.com/sitemap.xml`.
4. Use Google's Rich Results Test on the homepage and a product page. Watch the
   Merchant listings report after Google recrawls.
5. When Google exposes **Brand** in Merchant Center, review the logo, description,
   social links, shipping and return information, and brand imagery there.
   Keep the business name and logo consistent across the website and profiles.

Search result images and profile layouts remain Google's choice. A site release
does not instantly refresh cached thumbnails or guarantee a panel. The Etsy
thumbnail in the reference comes from Etsy and must be managed on that listing.
For stronger physical depth in future product photos, use accurate side-angle
canvas views and real room photographs as additional images.

## Merchant profile and reviews follow-up (September 21–22, 2026)

### Account readiness

- Business Manager confirms `hello@armoze.com` is already a **Super admin** for
  Armoze. Missing edit access is not explained by an insufficient user role.
- The Merchant Center navigation still has no **Brand** editor. Google's
  documentation describes this editor as a beta limited to invited merchants.
  The merchant profile can be assembled automatically from Google’s sources;
  neither a Merchant Center account nor structured data guarantees display.
- Store quality is **Great** in the United States. The scorecard recognizes
  free shipping, a 30-day return window, digital wallets, 100% high-resolution
  images, and 8.4 images per offer. **Store rating is incomplete.** The scorecard
  labels return cost as free, but the authoritative verified return policy says
  **customer responsibility**, matching the website for non-defective returns.
  These are Google's reported account metrics, not independently measured
  fulfillment performance.
- The support contact and claimed website are correct. Existing account
  payment methods include Amazon Pay, Apple Pay, and Klarna. No extra merchant
  account or local Maps listing is needed for the requested online-store panel.

### Review warning investigation and correction

- The authenticated order desk shows **six paid live orders from September 3–19**,
  all inside the warning's last-30-day period. Other displayed paid orders are
  older. There were recent purchases; lack of sales does not explain the warning.
- The checkout return route retrieves the paid Stripe session before producing
  the review payload, with merchant ID **5793512839**, order ID, buyer email,
  country, and estimated delivery date. The configured estimate is eight
  business days from order creation; it should continue to match fulfillment.
- Reproduced a script-order defect: React 19 hoists the separate asynchronous
  Google platform script into `<head>`, ahead of the inline callback in the
  body. A fast load can run before that callback exists. The page also disabled
  its client fallback whenever the server supplied an opt-in script.
- The corrected inline bootstrap registers the callback before loading Google,
  waits for the document when it is still streaming, and prevents duplicate
  dialogs. The client fallback now checks for the actual survey renderer before
  marking an order as rendered and shares the order-ID duplicate guard.
- Eight focused tests pass, including instant platform loading, streaming,
  duplicate callbacks, a missing survey API, script reuse, complete fields, and
  safe inline escaping. The production build and TypeScript checks pass.
- Published to `https://armoze.com/` on September 22 via Vercel deployment
  `armoze-i7in0cwhz-armond-guzes-projects.vercel.app`. Live checks confirm the
  normal cart returns HTML5 without loading surveys for unpaid visitors, the
  review endpoint rejects missing session IDs, and product structured data
  still uses the shadow-rendered merchant image. Google’s warning remains
  visible immediately after release, as expected before new checkout activity.
- The bug is a credible cause of missed displays, but historical browser logs
  are not available to prove it caused every missed opt-in. No old customer
  sessions were replayed into Google's survey script and no review emails were
  sent as part of this investigation.
- Confirm the next genuine paid checkout displays the voluntary Google opt-in.
  Google's graphs can lag by up to one week. This release cannot retroactively
  create customer consent or immediately clear the account warning.

### Prepared brand details for the editor when available

- Name: **Armoze**
- Website: `https://armoze.com/`
- Suggested description: **Armoze creates made-to-order motivational canvas
  prints for offices, bedrooms, studios, and workspaces. Explore artwork about
  ambition, discipline, music, and everyday inspiration.**
- Support: `https://armoze.com/support`, `hello@armoze.com`
- Social links: the existing official links in `shared/brand.js`.
- Imagery: use 3–5 accurate lifestyle photographs showing Armoze artwork in
  rooms. Product thumbnails with baked shadows remain the primary product
  images; Google's Brand editor accepts lifestyle imagery for its brand gallery.
- If requesting access from Google support, identify Merchant Center account
  **5793512839**, the verified/claimed domain, and the existing super-admin
  account, and ask whether the business is eligible for the Brand editor beta.
  No support message has been sent.

## Final readiness checks (September 22, 2026)

- Merchant Center's Needs attention page showed no current product issues in
  its default view. The account-wide setup/policy page explicitly reported
  **No issues for you to fix**. The catalog contains 250 variants; sampled
  product rows are approved.
- Google's live Rich Results Test successfully crawled the product page and
  found valid Product and Merchant listing data. The primary product image is
  the baked-shadow merchant image. The only product snippet warnings are the
  optional `aggregateRating` and `review` fields; leave these absent until
  genuine product-specific reviews are available.
  [Product test](https://search.google.com/test/rich-results/result?id=EdSigJr5RQIQFrNbm5MY_A)
- The homepage live test passed with valid Organization, Return policy, and
  ItemList/carousel data, without reported warnings.
  [Homepage test](https://search.google.com/test/rich-results/result?id=dZFFjeZmkPiarbQdA52mXA)
- The standard U.S. return policy is verified for all 250 variants: 30 days,
  return shipping at the customer's expense. No policy change was needed.
- Corrected the delivery estimate from 4–8 to **5–8 business days** in Merchant
  Center to match the existing website and Stripe checkout estimate. Google
  confirmed the saved policy with free shipping. The calculation uses handling
  of 2–3 business days plus transit of 3–5 business days.
- Applied the same timing to Product/Offer structured data and every Shopping
  feed entry so product-level data cannot override the corrected account setting.
  The existing feed test was updated for the new minimum and passes.
- Released the complete timing correction at
  `armoze-2u1rh9ijy-armond-guzes-projects.vercel.app`, aliased to `armoze.com`.
  Production build and TypeScript validation passed. Live checks confirmed
  **all 250 feed variants** and the sampled product's structured data use 5–8
  days, with the baked-shadow primary image retained.
- Triggered a fresh Merchant Center import from the configured live feed URL.
  Its September 22 **12:10:08 AM** update-history record confirms **250 products
  updated**, zero new products, all attributes recognized, and no file issues.

## Official references

- [Google image SEO](https://developers.google.com/search/docs/appearance/google-images)
- [OnlineStore / organization markup](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Brand profiles](https://support.google.com/brandprofile/answer/15985835?hl=en)
- [Brand management in Merchant Center](https://support.google.com/merchants/answer/15575415)
- [Automatic merchant profiles](https://support.google.com/merchants/answer/14998338?hl=en)
- [Google Customer Reviews integration](https://support.google.com/merchants/answer/14629205?hl=en)
- [Google Customer Reviews troubleshooting and reporting delay](https://support.google.com/merchants/answer/14633731)
- [React script hoisting](https://react.dev/reference/react-dom/components/script)
- [Business Profile eligibility](https://support.google.com/business/answer/13763036?hl=en)
