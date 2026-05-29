import AccountPageClient from '../../src/next/storefront/AccountPageClient.tsx';
import { getRouteSeo } from '../../src/next/seo.js';

export async function generateMetadata() {
  const routeSeo = await getRouteSeo(['account']);

  return routeSeo.metadata;
}

export default function AccountPage() {
  return <AccountPageClient />;
}
