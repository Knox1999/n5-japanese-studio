import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import '@/styles/premium.scss';
import '@/styles/v44-editorial.scss';
import '@/styles/v46-futuristic.scss';

export const metadata: Metadata = {
  title: 'N5 Natural Japanese Studio',
  description: 'Futuristic JLPT N5 Japanese learning studio with vocabulary, SRS, listening, reading, grammar, Kanji KLC and mock tests.',
  applicationName: 'N5 Natural Japanese Studio',
  manifest: './manifest.webmanifest',
  icons: { icon: './assets/app-icon.svg', apple: './assets/app-icon.svg' },
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
