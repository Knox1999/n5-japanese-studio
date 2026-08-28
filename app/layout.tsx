import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import '@/styles/premium.scss';
import '@/styles/v44-editorial.scss';
import '@/styles/v46-futuristic.scss';
import '@/styles/v49-full-system.scss';

export const metadata: Metadata = {
  title: 'The Nihongo Vibes — N5 Japanese Learning Studio',
  description: 'The Nihongo Vibes — a futuristic JLPT N5 Japanese learning studio with natural voice, vocabulary, SRS, listening, reading, grammar, Kanji KLC and mock tests.',
  applicationName: 'The Nihongo Vibes',
  manifest: './manifest.webmanifest',
  icons: { icon: './assets/nihongo-vibes-logo-192.png', apple: './assets/nihongo-vibes-logo-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#071311',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const ga = process.env.NEXT_PUBLIC_GA_ID || 'G-FG3JCWGSPR';
  return (
    <html lang="bn">
      <body>
        {children}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}',{send_page_view:true});`}</Script>
      </body>
    </html>
  );
}
