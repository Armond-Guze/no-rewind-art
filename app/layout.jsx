import '../src/styles.css';

export const metadata = {
  metadataBase: new URL('https://armoze.com'),
  applicationName: 'Armoze',
  icons: {
    icon: '/armoze-logo.png',
    apple: '/armoze-logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
