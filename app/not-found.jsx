import Link from 'next/link';

export const metadata = {
  title: 'Page Not Found | Armoze',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <main className="product-not-found">
      <Link className="not-found-brand" href="/" aria-label="Armoze home">
        Armoze
      </Link>
      <p className="eyebrow">Page missing</p>
      <h1>Page not found.</h1>
      <p className="not-found-copy">
        This page moved or never existed. The art is still here, though.
      </p>
      <div className="not-found-actions">
        <Link className="button button-primary" href="/collections/best-sellers">
          View Best Sellers
        </Link>
        <Link className="button button-secondary" href="/">
          Go Home
        </Link>
      </div>
    </main>
  );
}
