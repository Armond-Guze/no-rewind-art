import { Suspense } from 'react';
import AuthPageClient from '../../src/next/storefront/AuthPageClient.tsx';
import { getRouteSeo } from '../../src/next/seo.js';

export async function generateMetadata() {
  const routeSeo = await getRouteSeo(['sign-in']);

  return routeSeo.metadata;
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageClient />
    </Suspense>
  );
}
