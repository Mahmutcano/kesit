import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

  export const metadata: Metadata = {
    metadataBase: new URL('https://kesit.app'),
    title: {
      default: 'Kesit — Uzun videolardan yapay zeka ile viral dikey klipler',
      template: '%s | Kesit',
    },
    description: 'Kesit, uzun videoları saniyeler içinde altyazılı, paylaşıma hazır dikey kısa videolara (Shorts, Reels, TikTok) dönüştürür. 19 dilde otomatik altyazı, akıllı an yakalama ve efektler.',
    keywords: [
      'video klip oluşturma',
      'yapay zeka video kırpma',
      'otomatik altyazı',
      'shorts oluşturucu',
      'reels yapma',
      'tiktok video kırpma',
      'uzun videodan klip çıkarma',
      'podcast klip kesici',
      'ai video editor',
      'video kesit alma',
    ],
    authors: [{ name: 'Kesit' }],
    creator: 'Kesit',
    publisher: 'Kesit',
    applicationName: 'Kesit',
    alternates: {
      canonical: '/',
    },
    manifest: '/site.webmanifest',
    icons: {
      icon: [
        { url: '/brand/favicon.svg', type: 'image/svg+xml' },
        { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      ],
      shortcut: '/favicon.ico',
      apple: '/icons/apple-touch-icon.png',
    },
    openGraph: {
      title: 'Kesit — Uzun videolardan yapay zeka ile viral dikey klipler',
      description: 'Kesit, uzun videoları saniyeler içinde altyazılı, paylaşıma hazır dikey kısa videolara dönüştürür.',
      url: 'https://kesit.app',
      siteName: 'Kesit',
      images: [
        {
          url: '/brand/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Kesit — Video Klip Stüdyosu',
        },
      ],
      locale: 'tr_TR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Kesit — Uzun videolardan yapay zeka ile viral dikey klipler',
      description: 'Kesit, uzun videoları saniyeler içinde altyazılı, paylaşıma hazır dikey kısa videolara dönüştürür.',
      images: ['/brand/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  export const viewport: Viewport = {
    themeColor: '#141413',
    width: 'device-width',
    initialScale: 1,
  };

  export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="tr">
          <body>{children}</body>
        </html>
        );
}
