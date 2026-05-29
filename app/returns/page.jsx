import { generatePolicyMetadata, PolicyRoute } from '../../src/next/policy-route.jsx';

export async function generateMetadata() {
  return generatePolicyMetadata('returns');
}

export default function ReturnsPage() {
  return <PolicyRoute pageKey="returns" />;
}
