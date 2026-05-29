import { notFound } from 'next/navigation';
import PolicyPageClient from './storefront/PolicyPageClient.tsx';
import { policyPages } from './storefront/policy-content.ts';
import { getRouteSeo } from './seo.js';

export async function generatePolicyMetadata(pageKey) {
  const routeSeo = await getRouteSeo([pageKey]);

  if (!routeSeo.exists) {
    return {};
  }

  return routeSeo.metadata;
}

export function PolicyRoute({ pageKey }) {
  const page = policyPages[pageKey];

  if (!page) {
    notFound();
  }

  return <PolicyPageClient page={page} />;
}
