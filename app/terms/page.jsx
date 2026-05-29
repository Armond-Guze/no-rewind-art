import { generatePolicyMetadata, PolicyRoute } from '../../src/next/policy-route.jsx';

export async function generateMetadata() {
  return generatePolicyMetadata('terms');
}

export default function TermsPage() {
  return <PolicyRoute pageKey="terms" />;
}
