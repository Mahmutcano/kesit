import type { ReactNode } from 'react';

export const metadata = {
  title: 'Kesit',
  description: 'Kesit, uzun videoları saniyeler içinde altyazılı, paylaşıma hazır kısa kliplere dönüştürür.',
  applicationName: 'Kesit',
  manifest: '/site.webmanifest',
  icons: { icon: [{ url: '/brand/favicon.svg', type: 'image/svg+xml' }, { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' }], shortcut: '/favicon.ico', apple: '/icons/apple-touch-icon.png' },
  openGraph: { title: 'Kesit', siteName: 'Kesit', images: ['/brand/og-image.png'], type: 'website' },
  twitter: { card: 'summary_large_image', images: ['/brand/og-image.png'] },
};
export const viewport = { themeColor: '#141413' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
