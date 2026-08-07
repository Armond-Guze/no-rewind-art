import OrderStatusPageClient from '../../src/next/storefront/OrderStatusPageClient.tsx';

export const metadata = {
  title: 'Order Status | Armoze',
  description:
    'Check the status of your Armoze order with your order reference and checkout email. No account needed.',
  robots: {
    index: false,
  },
};

export default function OrderStatusPage() {
  return <OrderStatusPageClient />;
}
