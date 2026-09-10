import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Secure checkout | Armoze',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  redirect('/cart');
}
