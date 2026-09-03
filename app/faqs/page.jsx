import FaqPageClient from '../../src/next/storefront/FaqPageClient';

const title = 'FAQs | Armoze';
const description = 'Find answers about Armoze canvas prints, free shipping, order tracking, returns, and refunds. Still need help? Get in touch with our team.';

export const metadata = {
  title,
  description,
  alternates: { canonical: 'https://armoze.com/faqs' },
  openGraph: { title, description, url: 'https://armoze.com/faqs', siteName: 'Armoze' },
};

export default function FaqPage() {
  return <FaqPageClient />;
}
