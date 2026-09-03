import '../src/styles.css';

import { Poppins } from 'next/font/google';
import localFont from 'next/font/local';
import { GoogleCustomerReviewsBadge } from '../src/next/storefront/GoogleCustomerReviewsBadge';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-poppins',
});

const announcementFont = localFont({
  src: [
    { path: '../public/fonts/inter-regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/inter-medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/inter-bold.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-announcement',
});

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
      <body className={`${poppins.variable} ${announcementFont.variable}`}>
        {children}
        <GoogleCustomerReviewsBadge />
      </body>
    </html>
  );
}
