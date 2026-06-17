import '../src/styles.css';

import { GoogleCustomerReviewsBadge } from '../src/next/storefront/GoogleCustomerReviewsBadge';

export const metadata = {
  metadataBase: new URL('https://armoze.com'),
  applicationName: 'Armoze',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/favicon.png',
        type: 'image/png',
        sizes: '512x512',
      },
    ],
    shortcut: '/favicon.ico',
    apple: [
      {
        url: '/apple-touch-icon.png',
        type: 'image/png',
        sizes: '512x512',
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}
        <GoogleCustomerReviewsBadge />
      </body>
    </html>
  );
}
