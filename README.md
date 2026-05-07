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

1. Add image files to `public/artwork/`.
2. Open `src/data/products.ts`.
3. Add an `image` value using this format:

```ts
image: '/artwork/your-file-name.jpg',
```

Images can be `.jpg`, `.png`, `.webp`, or `.avif`.

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
CLIENT_URL=http://127.0.0.1:5173
PORT=4242
```

Do not commit `.env` or paste your secret key into chat. Use Stripe test keys
first, then switch to live keys only when the products, shipping, tax, and
fulfillment process are ready.
