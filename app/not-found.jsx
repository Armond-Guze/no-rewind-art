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
      <p className="eyebrow">Page missing</p>
      <h1>Page not found.</h1>
      <Link className="button button-primary" href="/collections/best-sellers">
        View Best Sellers
      </Link>
    </main>
  );
}
