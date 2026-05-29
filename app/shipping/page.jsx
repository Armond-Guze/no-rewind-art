import { generatePolicyMetadata, PolicyRoute } from '../../src/next/policy-route.jsx';

export async function generateMetadata() {
  return generatePolicyMetadata('shipping');
}

export default function ShippingPage() {
  return <PolicyRoute pageKey="shipping" />;
}
