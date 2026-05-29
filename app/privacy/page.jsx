import { generatePolicyMetadata, PolicyRoute } from '../../src/next/policy-route.jsx';

export async function generateMetadata() {
  return generatePolicyMetadata('privacy');
}

export default function PrivacyPage() {
  return <PolicyRoute pageKey="privacy" />;
}
