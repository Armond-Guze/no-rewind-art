import Link from 'next/link';

export function CheckoutPolicyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`checkout-policy-notice${compact ? ' compact' : ''}`}>
      By continuing to secure checkout, you agree to the <Link href="/terms">Terms of Service</Link>{' '}
      and acknowledge the <Link href="/privacy">Privacy</Link>,{' '}
      <Link href="/shipping">Shipping</Link>, and <Link href="/returns">Returns</Link> policies.
    </p>
  );
}
